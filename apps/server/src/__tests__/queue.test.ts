import { describe, it, expect, afterAll } from 'vitest'
import { getQueue } from '../queue/index.js'

describe('Queue', () => {
  afterAll(async () => {
    const queue = getQueue()
    await queue.close()
  })

  it('can add a video generation job', async () => {
    const queue = getQueue()
    const job = await queue.add('generate-video', { reportId: 'test-123' })
    expect(job.id).toBeDefined()
  })
})
