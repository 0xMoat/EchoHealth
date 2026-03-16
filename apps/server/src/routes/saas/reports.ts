import { FastifyInstance } from 'fastify'
import { prisma } from '../../db.js'
import { getQueue } from '../../queue/index.js'

export default async function saasReportRoutes(app: FastifyInstance) {
  // Create report
  app.post('/reports', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' })

    const { photoUrls, language, inputType, reportType } = request.body as {
      photoUrls: string[]
      language?: string
      inputType?: string
      reportType?: string
    }

    if (!photoUrls?.length) {
      return reply.status(400).send({ error: 'photoUrls required' })
    }

    const report = await prisma.report.create({
      data: {
        userId: request.user.id,
        photoUrls,
        type: (reportType as any) || 'GENERAL',
        language: (language as any) || 'AUTO',
        inputType: (inputType as any) || 'IMAGE',
        source: 'WEB',
        status: 'PENDING',
      },
    })

    const queue = getQueue()
    await queue.add('generate', { reportId: report.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    })

    return { reportId: report.id, status: report.status }
  })

  // List reports
  app.get('/reports', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' })

    const { limit } = request.query as { limit?: string }
    const reports = await prisma.report.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '10'), 50),
      include: { video: true },
    })

    return reports
  })

  // Get report by ID
  app.get('/reports/:id', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' })

    const { id } = request.params as { id: string }
    const report = await prisma.report.findUnique({
      where: { id },
      include: { video: true },
    })

    if (!report || report.userId !== request.user.id) {
      return reply.status(404).send({ error: 'Report not found' })
    }

    return report
  })
}
