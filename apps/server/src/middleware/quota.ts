import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db.js'

export const FREE_MONTHLY_LIMIT = 3
export const PRO_MONTHLY_LIMIT = 30

/**
 * Quota middleware for Fastify.
 * Expects request.body to contain `userId`.
 * Checks if the user has remaining quota for the current calendar month.
 *
 * The increment is fully atomic: uses a single UPDATE WHERE usedThisMonth < limit
 * so concurrent requests cannot both sneak through the last available slot.
 */
export async function quotaMiddleware(
  request: FastifyRequest<{ Body: { userId?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.body?.userId
  if (!userId) {
    reply.status(400).send({ error: 'userId is required' })
    return
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    reply.status(404).send({ error: 'User not found' })
    return
  }

  // Reset counter when we enter a new calendar month
  if (user.usageResetAt < startOfMonth) {
    await prisma.user.update({
      where: { id: userId },
      data: { usedThisMonth: 0, usageResetAt: now },
    })
    user.usedThisMonth = 0
  }

  const limit = user.isPro ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT

  // Atomic check-and-increment: the WHERE clause prevents concurrent over-limit bypass.
  // If two requests race here, the DB row lock ensures only one can satisfy
  // `usedThisMonth < limit` and actually commit the increment.
  const result = await prisma.user.updateMany({
    where: { id: userId, usedThisMonth: { lt: limit } },
    data: { usedThisMonth: { increment: 1 } },
  })

  if (result.count === 0) {
    const current = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    reply.status(429).send({
      error: 'Monthly quota exceeded',
      used: current.usedThisMonth,
      limit,
    })
  }
}
