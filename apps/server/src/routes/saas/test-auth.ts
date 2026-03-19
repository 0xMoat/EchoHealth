// apps/server/src/routes/saas/test-auth.ts
// Test-only auth endpoint — creates a user and sets JWT cookie without Google OAuth.
// Only available when NODE_ENV !== 'production'.
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db.js'
import { signToken } from '../../lib/jwt.js'
import '../../hooks/auth.js' // Import for FastifyRequest.user type augmentation

export default async function testAuthRoutes(app: FastifyInstance) {
  app.post('/auth/test-login', async (request, reply) => {
    const { email, nickname, isPro } = request.body as {
      email?: string
      nickname?: string
      isPro?: boolean
    }

    const testEmail = email || `test-${Date.now()}@e2e.local`
    const testGoogleId = `test-google-${testEmail}`

    const user = await prisma.user.upsert({
      where: { googleId: testGoogleId },
      create: {
        googleId: testGoogleId,
        email: testEmail,
        authProvider: 'GOOGLE',
        nickname: nickname || 'E2E Test User',
        avatarUrl: null,
        isPro: isPro ?? false,
        ...(isPro ? { proExpireAt: new Date(Date.now() + 365 * 24 * 3600 * 1000) } : {}),
      },
      update: {
        nickname: nickname || 'E2E Test User',
        isPro: isPro ?? false,
        ...(isPro ? { proExpireAt: new Date(Date.now() + 365 * 24 * 3600 * 1000) } : {}),
      },
    })

    const token = signToken({ userId: user.id, email: user.email ?? undefined })

    reply
      .header('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`)
      .send({ userId: user.id, isPro: user.isPro, email: user.email })
  })

  // Seed a report for testing — allows e2e tests to view completed/pending/failed reports
  app.post('/auth/test-seed-report', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Not authenticated' })

    const { status, withVideo } = request.body as {
      status?: string
      withVideo?: boolean
    }

    const reportStatus = (status as any) || 'COMPLETED'

    const report = await prisma.report.create({
      data: {
        userId: request.user.id,
        photoUrls: ['https://example.com/test-report.jpg'],
        type: 'GENERAL',
        language: 'EN',
        inputType: 'IMAGE',
        source: 'WEB',
        status: reportStatus,
        ...(reportStatus === 'FAILED' ? { errorMsg: 'Test error for e2e' } : {}),
      },
    })

    if (withVideo && reportStatus === 'COMPLETED') {
      await prisma.video.create({
        data: {
          reportId: report.id,
          cosUrl: 'https://echohealth-test.cos.ap-guangzhou.myqcloud.com/test/sample.mp4',
          duration: 42,
        },
      })
    }

    const full = await prisma.report.findUnique({
      where: { id: report.id },
      include: { video: true },
    })

    return { report: full }
  })

  // Update report status — for testing polling transitions
  app.post('/auth/test-update-report', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Not authenticated' })

    const { reportId, status, withVideo } = request.body as {
      reportId: string
      status: string
      withVideo?: boolean
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: status as any },
    })

    if (withVideo && status === 'COMPLETED') {
      await prisma.video.upsert({
        where: { reportId },
        create: {
          reportId,
          cosUrl: 'https://echohealth-test.cos.ap-guangzhou.myqcloud.com/test/sample.mp4',
          duration: 42,
        },
        update: {},
      })
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { video: true },
    })
    return { report }
  })

  // Cleanup test data
  app.post('/auth/test-cleanup', async (request, reply) => {
    const { email } = request.body as { email?: string }
    if (!email?.endsWith('@e2e.local')) {
      return reply.status(400).send({ error: 'Can only clean up e2e test users' })
    }

    const testGoogleId = `test-google-${email}`
    const user = await prisma.user.findUnique({ where: { googleId: testGoogleId } })
    if (user) {
      // Delete related data first
      await prisma.video.deleteMany({ where: { report: { userId: user.id } } })
      await prisma.report.deleteMany({ where: { userId: user.id } })
      await prisma.order.deleteMany({ where: { userId: user.id } })
      await prisma.subscription.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }

    return { ok: true }
  })
}
