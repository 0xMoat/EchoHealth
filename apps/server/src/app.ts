import Fastify from 'fastify'
import cors from '@fastify/cors'
import { reportRoutes } from './routes/reports.js'
import { authRoutes } from './routes/auth.js'
import { uploadRoutes } from './routes/upload.js'
import { quotaMiddleware } from './middleware/quota.js'
import { userRoutes } from './routes/user.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })

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

  return app
}
