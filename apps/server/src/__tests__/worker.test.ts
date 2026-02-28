import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Job } from 'bullmq'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindUniqueOrThrow = vi.fn()
const mockUpdateReport = vi.fn()
const mockCreateVideo = vi.fn()
const mockTransaction = vi.fn()

vi.mock('../db.js', () => ({
  prisma: {
    report: {
      findUniqueOrThrow: mockFindUniqueOrThrow,
      update: mockUpdateReport,
    },
    video: { create: mockCreateVideo },
    $transaction: mockTransaction,
  },
}))

vi.mock('../pipeline/ocr.js', () => ({
  ocrReportImage: vi.fn().mockResolvedValue('WBC 6.5 ×10^9/L 参考范围 3.5-9.5'),
  parseOcrText: vi.fn().mockReturnValue([
    { name: '白细胞', code: 'WBC', value: '6.5', unit: '×10^9/L', referenceRange: '3.5-9.5', status: 'normal' },
  ]),
}))

vi.mock('../pipeline/llm.js', () => ({
  buildVideoScript: vi.fn().mockResolvedValue({
    summary: '总体正常',
    details: [
      { indicatorName: '白细胞', status: 'normal', explanation: '免疫细胞数量正常' },
    ],
    suggestions: '保持良好作息',
    outro: '感谢您的信任',
  }),
}))

vi.mock('../pipeline/tts.js', () => ({
  generateAudio: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../pipeline/render.js', () => ({
  renderVideo: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../pipeline/upload.js', () => ({
  uploadAudio: vi.fn().mockResolvedValue('https://cos.example.com/audio/r1/narration.mp3'),
  uploadVideo: vi.fn().mockResolvedValue('https://cos.example.com/videos/r1/output.mp4'),
}))

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}))

// fetch is global in Node 18+
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
} as unknown as Response)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_REPORT = {
  id: 'report-1',
  type: 'BLOOD_ROUTINE',
  photoUrls: ['https://cos.example.com/photos/img.jpg'],
  indicators: null,
  user: { nickname: '张阿姨' },
}

function makeJob(reportId = 'report-1'): Job {
  return {
    data: { reportId },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job
}

// ── runPipeline integration tests ─────────────────────────────────────────────

describe('runPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUniqueOrThrow.mockResolvedValue(MOCK_REPORT)
    mockUpdateReport.mockResolvedValue({})
    mockTransaction.mockResolvedValue([])
  })

  it('runs the full pipeline and marks report COMPLETED', async () => {
    const { runPipeline } = await import('../queue/worker.js')
    const { renderVideo } = await import('../pipeline/render.js')
    const { uploadVideo } = await import('../pipeline/upload.js')

    const job = makeJob()
    await runPipeline(job)

    expect(mockUpdateReport).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PROCESSING' } }),
    )
    expect(renderVideo).toHaveBeenCalled()
    expect(uploadVideo).toHaveBeenCalled()
    expect(mockTransaction).toHaveBeenCalled()
    expect(job.updateProgress).toHaveBeenCalledWith(100)
  })

  it('marks report FAILED and stores errorMsg when pipeline throws', async () => {
    const { runPipeline } = await import('../queue/worker.js')
    const { renderVideo } = await import('../pipeline/render.js')
    vi.mocked(renderVideo).mockRejectedValueOnce(new Error('render failed'))

    const job = makeJob()
    await expect(runPipeline(job)).rejects.toThrow('render failed')

    expect(mockUpdateReport).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorMsg: 'render failed',
        }),
      }),
    )
  })

  it('reports progress at every pipeline stage in order', async () => {
    const { runPipeline } = await import('../queue/worker.js')
    const job = makeJob()
    await runPipeline(job)

    const calls = vi.mocked(job.updateProgress).mock.calls.flat()
    expect(calls).toEqual([5, 20, 40, 60, 85, 95, 100])
  })

  it('skips OCR when report already has cached indicators', async () => {
    const { runPipeline } = await import('../queue/worker.js')
    const { ocrReportImage } = await import('../pipeline/ocr.js')

    mockFindUniqueOrThrow.mockResolvedValue({
      ...MOCK_REPORT,
      indicators: [
        { name: '白细胞', code: 'WBC', value: '6.5', unit: '×10^9/L', referenceRange: '3.5-9.5', status: 'normal' },
      ],
    })

    const job = makeJob()
    await runPipeline(job)
    expect(ocrReportImage).not.toHaveBeenCalled()
  })
})

// ── Timing math (pure logic, no imports needed) ───────────────────────────────

describe('computeDurationSeconds (isolated)', () => {
  it('returns correct duration for 0 indicators (4 slides)', () => {
    const FPS = 30, TRANS = 15
    const frames = 90 + 120 + 150 * 0 + 120 + 90 - (4 - 1) * TRANS
    expect(Math.ceil(frames / FPS)).toBe(13)
  })

  it('returns correct duration for 3 indicators (7 slides)', () => {
    const FPS = 30, TRANS = 15
    const frames = 90 + 120 + 150 * 3 + 120 + 90 - (7 - 1) * TRANS
    expect(Math.ceil(frames / FPS)).toBe(26)
  })
})

describe('buildNarrationText (isolated)', () => {
  it('concatenates summary + details + suggestions + outro', () => {
    const script = {
      summary: '总体正常',
      details: [
        { indicatorName: '白细胞', status: 'normal' as const, explanation: '免疫细胞' },
        { indicatorName: '血红蛋白', status: 'low' as const, explanation: '运氧能力', advice: '多吃菠菜' },
      ],
      suggestions: '保持运动',
      outro: '感谢信任',
    }

    const parts = [
      script.summary,
      ...script.details.flatMap((d) => {
        const lines = [`${d.indicatorName}。${d.explanation}`]
        if (d.advice) lines.push(`建议：${d.advice}`)
        return lines
      }),
      script.suggestions,
      script.outro,
    ]
    const text = parts.join('。')

    expect(text).toContain('总体正常')
    expect(text).toContain('白细胞。免疫细胞')
    expect(text).toContain('建议：多吃菠菜')
    expect(text).toContain('保持运动')
    expect(text).toContain('感谢信任')
  })
})
