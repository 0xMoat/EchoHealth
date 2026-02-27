import { Worker } from 'bullmq'
import { getConnection } from './index.js'

export interface VideoJobData {
  reportId: string
}

export function startWorker() {
  const worker = new Worker<VideoJobData>(
    'video-generation',
    async (job) => {
      const { reportId } = job.data
      console.log(`[Worker] Processing report: ${reportId}`)
      // 流水线在 Task 10 中填充
    },
    { connection: getConnection(), concurrency: 2 }
  )

  worker.on('completed', (job) => console.log(`[Worker] Done: ${job.id}`))
  worker.on('failed', (job, err) =>
    console.error(`[Worker] Failed: job=${job?.id} reportId=${job?.data?.reportId}`, err)
  )

  return worker
}
