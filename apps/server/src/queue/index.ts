import { Queue } from 'bullmq'
import Redis from 'ioredis'

let connection: Redis | null = null

export function getConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

let queue: Queue | null = null

export function getQueue() {
  if (!queue) {
    queue = new Queue('video-generation', { connection: getConnection() })
  }
  return queue
}

export async function closeQueue() {
  if (queue) {
    await queue.close()
    queue = null
  }
  if (connection) {
    await connection.quit()
    connection = null
  }
}
