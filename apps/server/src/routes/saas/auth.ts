// apps/server/src/routes/saas/auth.ts
import { FastifyInstance } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import rateLimit from '@fastify/rate-limit'
import { prisma } from '../../db.js'
import { signToken } from '../../lib/jwt.js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''

export default async function saasAuthRoutes(app: FastifyInstance) {
  // Skip rate limiting in test mode to avoid 429 errors during e2e tests
  if (process.env.NODE_ENV !== 'test' && process.env.TEST_FAST_VIDEO !== 'true') {
    // Stricter rate limit for all auth routes (10 req/min/IP per spec §9)
    await app.register(rateLimit, { max: 10, timeWindow: '1 minute' })
  }
  app.post('/auth/google', async (request, reply) => {
    const { idToken } = request.body as { idToken?: string }
    if (!idToken) {
      return reply.status(400).send({ error: 'idToken is required' })
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload || !payload.sub || !payload.email) {
      return reply.status(401).send({ error: 'Invalid Google token' })
    }

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      create: {
        googleId: payload.sub,
        email: payload.email,
        authProvider: 'GOOGLE',
        nickname: payload.name || null,
        avatarUrl: payload.picture || null,
      },
      update: {
        nickname: payload.name || undefined,
        avatarUrl: payload.picture || undefined,
      },
    })

    const token = signToken({ userId: user.id, email: user.email ?? undefined })
    const isProduction = process.env.NODE_ENV === 'production'

    reply
      .header('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax${isProduction ? '; Secure' : ''}`)
      .send({ userId: user.id, isPro: user.isPro })
  })

  app.get('/auth/me', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Not authenticated' })
    }
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, nickname: true, avatarUrl: true, isPro: true, usedThisMonth: true, proExpireAt: true, usageResetAt: true },
    })
    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }
    return user
  })

  app.post('/auth/logout', async (_request, reply) => {
    reply
      .header('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
      .send({ ok: true })
  })
}
