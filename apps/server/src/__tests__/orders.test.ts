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
    order: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn().mockResolvedValue({ id: 'job-1' }) })),
}))

describe('POST /orders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates order and upgrades user to Pro', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      isPro: false,
      usedThisMonth: 3,
      usageResetAt: new Date(),
      proExpireAt: null,
    } as never)

    const fakeExpireAt = new Date(Date.now() + 30 * 86_400_000)
    vi.mocked(prisma.user.update).mockResolvedValue({
      isPro: true,
      proExpireAt: fakeExpireAt,
    } as never)
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: 'order-1',
      status: 'PAID',
    } as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (ops: any[]) => {
      return Promise.all(ops.map((op: any) => op))
    })

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { userId: 'u1' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.orderId).toBe('order-1')
    expect(body.proExpireAt).toBeDefined()

    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalled()
  })

  it('returns 404 when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { userId: 'ghost' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 400 when userId missing', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })
})
