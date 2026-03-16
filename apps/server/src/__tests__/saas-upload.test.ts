// apps/server/src/__tests__/saas-upload.test.ts
import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'

vi.stubEnv('JWT_SECRET', 'test-secret')

vi.mock('../db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', isPro: false }) },
  },
}))

vi.mock('../pipeline/upload.js', () => ({
  uploadImageBuffer: vi.fn().mockResolvedValue('https://cos.example.com/img.jpg'),
}))

describe('SaaS Upload Route', () => {
  it('rejects unauthenticated requests', async () => {
    const { default: saasUploadRoutes } = await import('../routes/saas/upload.js')
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.register(multipart, { limits: { fileSize: 20_000_000 } })
    app.addHook('preHandler', authHook)
    app.register(saasUploadRoutes, { prefix: '/api/saas' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/upload',
    })
    expect(res.statusCode).toBe(401)
  })
})
