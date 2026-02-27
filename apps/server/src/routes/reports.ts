import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { getQueue } from '../queue/index.js'
import type { ReportType } from '@prisma/client'

const VALID_REPORT_TYPES = new Set<string>(['BLOOD_ROUTINE', 'BIOCHEMISTRY', 'PHYSICAL_EXAM'])

export async function reportRoutes(app: FastifyInstance) {
  /**
   * GET /reports
   * Query: { userId, limit? }
   * Returns recent reports for a user (for mini-program home page).
   */
  app.get<{ Querystring: { userId: string; limit?: string } }>('/reports', {
    schema: {
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', minLength: 1 },
          limit: { type: 'string' },
        },
      },
    },
    async handler(request, reply) {
      const { userId, limit } = request.query
      const take = Math.min(parseInt(limit || '5', 10) || 5, 20)

      const reports = await prisma.report.findMany({
        where: { userId },
        include: { video: true },
        orderBy: { createdAt: 'desc' },
        take,
      })

      return reports.map((r) => ({
        id: r.id,
        reportType: r.type,
        status: r.status,
        createdAt: r.createdAt,
        videoUrl: r.video?.cosUrl ?? undefined,
      }))
    },
  })

  /**
   * POST /reports
   * Body: { userId, reportType, photoUrls }
   * Creates a Report record and enqueues a video-generation job.
   */
  app.post<{
    Body: { userId: string; reportType: string; photoUrls: string[] }
  }>('/reports', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'reportType', 'photoUrls'],
        properties: {
          userId: { type: 'string', minLength: 1 },
          reportType: { type: 'string', minLength: 1 },
          photoUrls: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
      },
    },
    async handler(request, reply) {
      const { userId, reportType, photoUrls } = request.body

      // Map free-form reportType to enum; default to PHYSICAL_EXAM
      const typeMap: Record<string, string> = {
        '血常规': 'BLOOD_ROUTINE',
        '血脂': 'BIOCHEMISTRY',
        '肝功能': 'BIOCHEMISTRY',
        '肾功能': 'BIOCHEMISTRY',
        '血糖': 'BIOCHEMISTRY',
        '尿常规': 'BLOOD_ROUTINE',
        '综合体检': 'PHYSICAL_EXAM',
        '心电图': 'PHYSICAL_EXAM',
        '胸片/CT': 'PHYSICAL_EXAM',
        '其他': 'PHYSICAL_EXAM',
      }
      const type = (typeMap[reportType] || 'PHYSICAL_EXAM') as ReportType

      if (!VALID_REPORT_TYPES.has(type)) {
        return reply.status(400).send({ error: 'Invalid report type' })
      }

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return reply.status(404).send({ error: 'User not found' })
      }

      const report = await prisma.report.create({
        data: {
          userId,
          type,
          photoUrls,
          status: 'PENDING',
        },
      })

      await getQueue().add('generate', { reportId: report.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
      })

      return reply.status(201).send({
        reportId: report.id,
        status: report.status,
      })
    },
  })

  /**
   * GET /reports/:id
   * Returns report status + video URL when completed.
   */
  app.get<{ Params: { id: string } }>('/reports/:id', {
    async handler(request, reply) {
      const report = await prisma.report.findUnique({
        where: { id: request.params.id },
        include: { video: true },
      })

      if (!report) {
        return reply.status(404).send({ error: 'Report not found' })
      }

      return {
        id: report.id,
        reportType: report.type,
        status: report.status,
        errorMsg: report.errorMsg ?? undefined,
        video: report.video
          ? {
              url: report.video.cosUrl,
              durationSec: report.video.duration,
              createdAt: report.video.createdAt,
            }
          : undefined,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      }
    },
  })
}
