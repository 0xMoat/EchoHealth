import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

export async function orderRoutes(app: FastifyInstance) {
  app.post<{ Body: { userId: string } }>('/orders', {
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string', minLength: 1 } },
      },
    },
    async handler(request, reply) {
      const { userId } = request.body

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      const proExpireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const [order] = await prisma.$transaction([
        prisma.order.create({
          data: { userId, amount: 1800, status: 'PAID', paidAt: new Date() },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isPro: true, proExpireAt },
        }),
      ])

      return reply.status(201).send({ orderId: order.id, proExpireAt })
    },
  })
}
