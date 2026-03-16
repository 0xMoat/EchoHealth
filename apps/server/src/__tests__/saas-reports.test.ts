import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'

vi.stubEnv('JWT_SECRET', 'test-secret')

const mockReport = {
  id: 'report_1',
  userId: 'u1',
  type: 'GENERAL',
  status: 'PENDING',
  photoUrls: ['https://cos/img.jpg'],
  language: 'AUTO',
  inputType: 'IMAGE',
  source: 'WEB',
  createdAt: new Date(),
}

vi.mock('../db.js', () => ({
  prisma: {
    report: {
      create: vi.fn().mockResolvedValue(mockReport),
      findMany: vi.fn().mockResolvedValue([mockReport]),
      findUnique: vi.fn().mockResolvedValue(mockReport),
    },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job_1' }),
  }),
}))

describe('SaaS Reports Routes', () => {
  it('POST /api/saas/reports creates report with source=WEB', async () => {
    const { default: saasReportRoutes } = await import('../routes/saas/reports.js')
    const { authHook } = await import('../hooks/auth.js')
    const { signToken } = await import('../lib/jwt.js')

    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.register(saasReportRoutes, { prefix: '/api/saas' })

    const token = signToken({ userId: 'u1' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/reports',
      headers: { cookie: `token=${token}` },
      payload: {
        photoUrls: ['https://cos/img.jpg'],
        language: 'EN',
        inputType: 'IMAGE',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().reportId).toBe('report_1')
  })
})
