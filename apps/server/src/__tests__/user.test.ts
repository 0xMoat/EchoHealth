import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../db.js'

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    report: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn().mockResolvedValue({ id: 'job-1' }) })),
}))

describe('GET /user/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns user quota info', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      isPro: false,
      usedThisMonth: 2,
      proExpireAt: null,
    } as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/user/u1' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.isPro).toBe(false)
    expect(body.usedThisMonth).toBe(2)
    expect(body.proExpireAt).toBeNull()
  })

  it('returns 404 for unknown user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/user/ghost' })

    expect(res.statusCode).toBe(404)
  })
})
