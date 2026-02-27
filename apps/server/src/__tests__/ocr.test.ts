import { describe, it, expect } from 'vitest'
import { parseOcrText } from '../pipeline/ocr.js'

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
