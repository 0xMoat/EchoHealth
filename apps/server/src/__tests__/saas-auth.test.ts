// apps/server/src/__tests__/saas-auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.stubEnv('JWT_SECRET', 'test-secret')
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-client-id')

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({
        sub: 'google_user_123',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      }),
    }),
  })),
}))

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      upsert: vi.fn().mockResolvedValue({
        id: 'cuid_user_1',
        googleId: 'google_user_123',
        email: 'test@gmail.com',
        isPro: false,
      }),
      findUnique: vi.fn().mockResolvedValue({
        id: 'cuid_user_1',
        email: 'test@gmail.com',
        nickname: 'Test',
        avatarUrl: null,
        isPro: false,
        usedThisMonth: 0,
        proExpireAt: null,
      }),
    },
  },
}))

describe('SaaS Auth Routes', () => {
  it('POST /api/saas/auth/google creates user and returns JWT cookie', async () => {
    const { default: saasAuthRoutes } = await import('../routes/saas/auth.js')
    const app = Fastify()
    app.register(saasAuthRoutes, { prefix: '/api/saas' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/auth/google',
      payload: { idToken: 'mock-google-id-token' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().userId).toBe('cuid_user_1')
    expect(res.headers['set-cookie']).toContain('token=')
    expect(res.headers['set-cookie']).toContain('HttpOnly')
    expect(res.headers['set-cookie']).toContain('SameSite=Lax')
  })

  it('POST /api/saas/auth/google returns 400 without idToken', async () => {
    const { default: saasAuthRoutes } = await import('../routes/saas/auth.js')
    const app = Fastify()
    app.register(saasAuthRoutes, { prefix: '/api/saas' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/auth/google',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /api/saas/auth/me returns 401 without auth', async () => {
    const { default: saasAuthRoutes } = await import('../routes/saas/auth.js')
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.register(saasAuthRoutes, { prefix: '/api/saas' })
    const res = await app.inject({ method: 'GET', url: '/api/saas/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/saas/auth/logout clears cookie', async () => {
    const { default: saasAuthRoutes } = await import('../routes/saas/auth.js')
    const app = Fastify()
    app.register(saasAuthRoutes, { prefix: '/api/saas' })
    const res = await app.inject({ method: 'POST', url: '/api/saas/auth/logout' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['set-cookie']).toContain('Max-Age=0')
  })
})
