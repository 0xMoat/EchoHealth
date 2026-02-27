import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseOcrText } from '../pipeline/ocr.js'

// Mock 腾讯云 SDK（动态 import）
// vitest 会自动 hoist vi.mock 到模块顶部，确保动态 import 时拿到 mock 版本
vi.mock(
  'tencentcloud-sdk-nodejs-ocr/tencentcloud/services/ocr/v20181119/ocr_client.js',
  () => ({
    OcrClient: vi.fn().mockImplementation(() => ({
      GeneralAccurateOCR: vi.fn().mockResolvedValue({
        TextDetections: [
          { DetectedText: '白细胞计数 WBC 6.5 ×10^9/L 参考范围 3.5-9.5', Confidence: 99 },
          { DetectedText: '葡萄糖 GLU 7.2 mmol/L 参考范围 3.9-6.1 ↑', Confidence: 99 },
        ],
      }),
    })),
  })
)

describe('parseOcrText', () => {
  it('extracts indicators from raw OCR text', () => {
    const rawText = `
      白细胞计数 WBC 6.5 ×10^9/L 参考范围 3.5-9.5
      血红蛋白 HGB 132 g/L 参考范围 115-150
      血小板计数 PLT 280 ×10^9/L 参考范围 100-300
    `
    const result = parseOcrText(rawText)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      name: expect.stringContaining('白细胞'),
      value: '6.5',
      status: 'normal',
    })
  })

  it('marks high values correctly', () => {
    const rawText = `葡萄糖 GLU 7.2 mmol/L 参考范围 3.9-6.1 ↑`
    const result = parseOcrText(rawText)
    expect(result[0].status).toBe('high')
  })

  it('marks low values correctly', () => {
    const rawText = `血红蛋白 HGB 90 g/L 参考范围 115-150 ↓`
    const result = parseOcrText(rawText)
    expect(result[0].status).toBe('low')
  })

  it('infers status from reference range when no arrow symbol', () => {
    const rawText = `尿酸 UA 480 μmol/L 参考范围 150-420`
    const result = parseOcrText(rawText)
    expect(result[0].status).toBe('high')
  })

  it('returns empty array for unrecognizable text', () => {
    const result = parseOcrText('这段文字没有任何指标')
    expect(result).toHaveLength(0)
  })
})

describe('ocrReportImage', () => {
  beforeEach(() => {
    process.env.TENCENT_SECRET_ID = 'fake-id'
    process.env.TENCENT_SECRET_KEY = 'fake-key'
    vi.resetModules()
  })

  it('calls OCR API and returns joined text', async () => {
    const { ocrReportImage } = await import('../pipeline/ocr.js')
    const result = await ocrReportImage('base64encodedimage')
    expect(result).toContain('白细胞计数')
    expect(result).toContain('葡萄糖')
  })

  it('throws when credentials are missing', async () => {
    delete process.env.TENCENT_SECRET_ID
    const { ocrReportImage } = await import('../pipeline/ocr.js')
    await expect(ocrReportImage('base64')).rejects.toThrow('Missing TENCENT_SECRET_ID')
  })
})
