import { Queue } from 'bullmq'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Redis = require('ioredis')

let connection: ReturnType<typeof Redis> | null = null

export function getConnection(): ReturnType<typeof Redis> {
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
