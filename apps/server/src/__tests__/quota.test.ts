import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { FREE_MONTHLY_LIMIT, PRO_MONTHLY_LIMIT } from '../middleware/quota.js'

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}))

import { prisma } from '../db.js'
import { quotaMiddleware } from '../middleware/quota.js'

function makeReply() {
  const reply = { status: vi.fn(), send: vi.fn() }
  reply.status.mockReturnValue(reply)
  return reply as unknown as FastifyReply
}

function makeRequest(userId: string) {
  return { body: { userId } } as FastifyRequest<{ Body: { userId?: string } }>
}

describe('quotaMiddleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows request when user is under free limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      isPro: false,
      usedThisMonth: 1,
      usageResetAt: new Date(),
    } as never)
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

    const reply = makeReply()
    await quotaMiddleware(makeRequest('u1'), reply)

    expect(vi.mocked(prisma.user.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedThisMonth: { increment: 1 } } }),
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('blocks request when free user has reached limit (updateMany returns count=0)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      isPro: false,
      usedThisMonth: FREE_MONTHLY_LIMIT,
      usageResetAt: new Date(),
    } as never)
    // Simulate the WHERE clause rejecting the update (quota already full)
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'u1',
      usedThisMonth: FREE_MONTHLY_LIMIT,
    } as never)

    const reply = makeReply()
    await quotaMiddleware(makeRequest('u1'), reply)

    expect(reply.status).toHaveBeenCalledWith(429)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Monthly quota exceeded', limit: FREE_MONTHLY_LIMIT }),
    )
  })

  it('allows pro user with higher limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u2',
      isPro: true,
      usedThisMonth: FREE_MONTHLY_LIMIT, // would be blocked for free users
      usageResetAt: new Date(),
    } as never)
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

    const reply = makeReply()
    await quotaMiddleware(makeRequest('u2'), reply)

    expect(reply.status).not.toHaveBeenCalled()
    // updateMany WHERE limit = PRO_MONTHLY_LIMIT
    expect(vi.mocked(prisma.user.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedThisMonth: { increment: 1 } } }),
    )
  })

  it('resets counter for a new month then allows the request', async () => {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u3',
      isPro: false,
      usedThisMonth: FREE_MONTHLY_LIMIT, // looks full but last month's count
      usageResetAt: lastMonth,
    } as never)
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

    const reply = makeReply()
    await quotaMiddleware(makeRequest('u3'), reply)

    // Reset update first
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usedThisMonth: 0 }) }),
    )
    // Then allowed via atomic increment
    expect(reply.status).not.toHaveBeenCalledWith(429)
  })

  it('returns 400 when userId is missing', async () => {
    const req = { body: {} } as FastifyRequest<{ Body: { userId?: string } }>
    const reply = makeReply()
    await quotaMiddleware(req, reply)

    expect(reply.status).toHaveBeenCalledWith(400)
  })

  it('returns 404 when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const reply = makeReply()
    await quotaMiddleware(makeRequest('ghost'), reply)

    expect(reply.status).toHaveBeenCalledWith(404)
  })

  it('resets isPro when proExpireAt has passed', async () => {
    const yesterday = new Date(Date.now() - 86_400_000)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u-expired',
      isPro: true,
      proExpireAt: yesterday,
      usedThisMonth: 0,
      usageResetAt: new Date(),
    } as never)
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

    const reply = makeReply()
    await quotaMiddleware(makeRequest('u-expired'), reply)

    // Should have reset isPro via update
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPro: false }) }),
    )
    // Should then proceed with free-tier limit, not block (usedThisMonth=0)
    expect(reply.status).not.toHaveBeenCalledWith(429)
  })
})

describe('quota constants', () => {
  it('free limit is 3', () => expect(FREE_MONTHLY_LIMIT).toBe(3))
  it('pro limit is 30', () => expect(PRO_MONTHLY_LIMIT).toBe(30))
})
