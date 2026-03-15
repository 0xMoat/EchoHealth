import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { startWorker } from './worker.js'

const worker = startWorker()
console.log('[Worker] Started, waiting for jobs...')

process.on('SIGTERM', async () => {
  await Sentry.flush(2000)
  await worker.close()
  process.exit(0)
})
