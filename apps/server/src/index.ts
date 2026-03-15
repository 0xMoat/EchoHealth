import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { buildApp } from './app.js'

try {
  const app = await buildApp()
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
} catch (err) {
  Sentry.captureException(err)
  await Sentry.flush(2000)
  console.error(err)
  process.exit(1)
}
