import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

let queue: Queue | null = null

export function getQueue() {
  if (!queue) {
    queue = new Queue('video-generation', { connection })
  }
  return queue
}

export { connection }
