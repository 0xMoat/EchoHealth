import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Top-level mocks (hoisted) ────────────────────────────────────────────────

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setupFastifyErrorHandler: vi.fn(),
  fastifyIntegration: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}))

const mockFindUniqueOrThrow = vi.fn()
const mockUpdateReport = vi.fn()

vi.mock('../db.js', () => ({
  prisma: {
    report: {
      findUniqueOrThrow: mockFindUniqueOrThrow,
      update: mockUpdateReport,
    },
    video: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn() })),
  getConnection: vi.fn(),
}))

vi.mock('../pipeline/ocr.js', () => ({
  ocrReportImage: vi.fn().mockRejectedValue(new Error('OCR failed')),
  parseOcrText: vi.fn(),
}))

vi.mock('../pipeline/llm.js', () => ({ buildVideoScript: vi.fn() }))
vi.mock('../pipeline/tts.js', () => ({ generateAudio: vi.fn() }))
vi.mock('../pipeline/render.js', () => ({ renderVideo: vi.fn() }))
vi.mock('../pipeline/upload.js', () => ({
  uploadAudio: vi.fn(),
  uploadVideo: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}))

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
} as unknown as Response)

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Sentry in worker pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'report-1',
      type: 'BLOOD_ROUTINE',
      photoUrls: ['https://example.com/img.jpg'],
      indicators: null,
      user: { nickname: '测试' },
    })
    mockUpdateReport.mockResolvedValue({})
  })

  it('captureException is called with reportId tag on pipeline failure', async () => {
    const Sentry = await import('@sentry/node')
    const { runPipeline } = await import('../queue/worker.js')

    const job = {
      data: { reportId: 'report-1' },
      updateProgress: vi.fn().mockResolvedValue(undefined),
    } as any

    await expect(runPipeline(job)).rejects.toThrow('OCR failed')

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { reportId: 'report-1' },
      }),
    )
  })
})
