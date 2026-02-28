import 'dotenv/config'
import { startWorker } from './worker.js'

const worker = startWorker()
console.log('[Worker] Started, waiting for jobs...')

process.on('SIGTERM', async () => {
  await worker.close()
  process.exit(0)
})
