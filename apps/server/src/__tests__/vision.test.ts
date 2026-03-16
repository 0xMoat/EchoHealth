// apps/server/src/__tests__/vision.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('GEMINI_API_KEY', 'test-key')
vi.stubEnv('LLM_VISION_PROVIDER', 'gemini')

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          language: 'en',
          indicators: [
            {
              name: 'Hemoglobin',
              value: '18.5',
              unit: 'g/dL',
              referenceRange: '13.5-17.5',
              status: 'high',
            },
          ],
        }),
      }),
    },
  })),
}))

describe('LLM Vision', () => {
  it('extracts indicators from images via Gemini', async () => {
    const { extractIndicatorsFromImages } = await import('../lib/vision.js')
    const fakeImage = Buffer.from('fake-image-data')
    const result = await extractIndicatorsFromImages([fakeImage], 'AUTO')
    expect(result.language).toBe('en')
    expect(result.indicators).toHaveLength(1)
    expect(result.indicators[0].name).toBe('Hemoglobin')
    expect(result.indicators[0].status).toBe('high')
  })
})
