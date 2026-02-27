import { describe, it, expect, vi, beforeEach } from 'vitest'
import { statSync } from 'fs'

// Mock the COS SDK
const mockPutObject = vi.fn()
vi.mock('cos-nodejs-sdk-v5', () => ({
  default: vi.fn().mockImplementation(() => ({ putObject: mockPutObject })),
}))

// Mock fs to avoid needing real files
vi.mock('fs', async (importOriginal) => {
  const real = await importOriginal<typeof import('fs')>()
  return {
    ...real,
    createReadStream: vi.fn().mockReturnValue('mock-stream'),
    statSync: vi.fn().mockReturnValue({ size: 1024 * 1024 }),
  }
})

describe('uploadVideo', () => {
  beforeEach(() => {
    mockPutObject.mockReset()
    process.env.COS_SECRET_ID = 'test-id'
    process.env.COS_SECRET_KEY = 'test-key'
    process.env.COS_BUCKET = 'test-bucket-1234567890'
    process.env.COS_REGION = 'ap-guangzhou'
  })

  it('calls putObject with correct bucket/region/key and returns public URL', async () => {
    mockPutObject.mockImplementation((_params: unknown, cb: (err: null) => void) => cb(null))

    const { uploadVideo } = await import('../pipeline/upload.js')
    const url = await uploadVideo('/tmp/output.mp4', 'report-abc')

    expect(mockPutObject).toHaveBeenCalledOnce()
    const [params] = mockPutObject.mock.calls[0] as [Record<string, unknown>, unknown]
    expect(params.Bucket).toBe('test-bucket-1234567890')
    expect(params.Region).toBe('ap-guangzhou')
    expect(params.Key).toMatch(/^videos\/report-abc\/\d+\.mp4$/)

    expect(url).toMatch(/^https:\/\/test-bucket-1234567890\.cos\.ap-guangzhou\.myqcloud\.com\/videos\/report-abc\/\d+\.mp4$/)
  })

  it('throws when COS credentials are missing', async () => {
    delete process.env.COS_SECRET_ID

    const { uploadVideo } = await import('../pipeline/upload.js')
    await expect(uploadVideo('/tmp/output.mp4', 'report-xyz')).rejects.toThrow(
      'Missing COS_SECRET_ID or COS_SECRET_KEY',
    )
  })

  it('propagates COS upload errors', async () => {
    mockPutObject.mockImplementation((_params: unknown, cb: (err: { message: string }) => void) =>
      cb({ message: 'network error' }),
    )

    const { uploadVideo } = await import('../pipeline/upload.js')
    await expect(uploadVideo('/tmp/output.mp4', 'report-xyz')).rejects.toThrow('COS upload failed')
  })
})
