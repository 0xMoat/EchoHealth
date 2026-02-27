import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db.js'

export const FREE_MONTHLY_LIMIT = 3
export const PRO_MONTHLY_LIMIT = 30

/**
 * Quota middleware for Fastify.
 * Expects request.body to contain `userId`.
 * Checks if the user has remaining quota for the current calendar month.
 * On success, increments `usedThisMonth` atomically.
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

  // Reset counter if we're in a new calendar month
  if (user.usageResetAt < startOfMonth) {
    await prisma.user.update({
      where: { id: userId },
      data: { usedThisMonth: 0, usageResetAt: now },
    })
    user.usedThisMonth = 0
  }

  const limit = user.isPro ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT
  if (user.usedThisMonth >= limit) {
    reply.status(429).send({
      error: 'Monthly quota exceeded',
      used: user.usedThisMonth,
      limit,
    })
    return
  }

  // Increment atomically before the job is queued
  await prisma.user.update({
    where: { id: userId },
    data: { usedThisMonth: { increment: 1 } },
  })
}
