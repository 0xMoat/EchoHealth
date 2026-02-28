import { describe, it, expect, vi } from 'vitest'

const mockAdd = vi.fn().mockResolvedValue({ id: 'job-123' })
const mockClose = vi.fn().mockResolvedValue(undefined)

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: mockAdd, close: mockClose })),
}))

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({ quit: vi.fn().mockResolvedValue(undefined) })),
}))

import { getQueue, closeQueue } from '../queue/index.js'

describe('Queue', () => {
  it('can add a video generation job', async () => {
    const queue = getQueue()
    const job = await queue.add('generate-video', { reportId: 'test-123' })
    expect(job.id).toBe('job-123')
    expect(mockAdd).toHaveBeenCalledWith('generate-video', { reportId: 'test-123' })
  })

  it('closeQueue disconnects without error', async () => {
    await expect(closeQueue()).resolves.toBeUndefined()
  })
})
