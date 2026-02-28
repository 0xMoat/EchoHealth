import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

export async function userRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/user/:id', {
    async handler(request, reply) {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
        select: { id: true, isPro: true, usedThisMonth: true, proExpireAt: true },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })
      return user
    },
  })
}
