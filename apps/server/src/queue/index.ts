import { Queue } from 'bullmq'
import IORedis from 'ioredis'

let connection: IORedis | null = null

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
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

export { getConnection }
