import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import * as Sentry from '@sentry/node'
import { reportRoutes } from './routes/reports.js'
import { authRoutes } from './routes/auth.js'
import { uploadRoutes } from './routes/upload.js'
import { quotaMiddleware } from './middleware/quota.js'
import { userRoutes } from './routes/user.js'
import { orderRoutes } from './routes/orders.js'
import { authHook } from './hooks/auth.js'
import multipart from '@fastify/multipart'
import saasAuthRoutes from './routes/saas/auth.js'
import saasUploadRoutes from './routes/saas/upload.js'
import saasReportRoutes from './routes/saas/reports.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : true // Allow all in development

  await app.register(cors, {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Origin header validation for non-GET routes (CSRF protection)
  app.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      const origin = request.headers.origin
      if (ALLOWED_ORIGINS !== true && origin && !(ALLOWED_ORIGINS as string[]).includes(origin)) {
        return reply.status(403).send({ error: 'Forbidden origin' })
      }
    }
  })

  app.addHook('preHandler', authHook)

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(authRoutes)
  await app.register(userRoutes)
  await app.register(uploadRoutes)

  // Apply quota check before POST /reports
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'POST' && request.url === '/reports') {
      await quotaMiddleware(
        request as Parameters<typeof quotaMiddleware>[0],
        reply,
      )
    }
  })

  await app.register(reportRoutes)
  await app.register(orderRoutes)
  await app.register(saasAuthRoutes, { prefix: '/api/saas' })
  await app.register(multipart, { limits: { fileSize: 20_000_000 } })
  await app.register(saasUploadRoutes, { prefix: '/api/saas' })
  await app.register(saasReportRoutes, { prefix: '/api/saas' })

  Sentry.setupFastifyErrorHandler(app)

  return app
}
