import { Worker } from 'bullmq'
import { connection } from './index.js'

export function startWorker() {
  const worker = new Worker(
    'video-generation',
    async (job) => {
      const { reportId } = job.data
      console.log(`[Worker] Processing report: ${reportId}`)
      // 流水线在 Task 10 中填充
    },
    { connection, concurrency: 2 }
  )

  worker.on('completed', (job) => console.log(`[Worker] Done: ${job.id}`))
  worker.on('failed', (job, err) => console.error(`[Worker] Failed: ${job?.id}`, err))

  return worker
}
