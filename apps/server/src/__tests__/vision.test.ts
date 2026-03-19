import { describe, it, expect, vi } from 'vitest'

const { MockOpenAI, mockChatCreate } = vi.hoisted(() => {
  const mockChatCreate = vi.fn()
  const MockOpenAI = vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockChatCreate } },
  }))
  return { MockOpenAI, mockChatCreate }
})

vi.mock('openai', () => ({ default: MockOpenAI }))

describe('LLM Vision', () => {
  it('generates a script from images via Groq vision', async () => {
    process.env.GROQ_API_KEY = 'gsk_test'
    mockChatCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            language: 'en',
            summary: 'Overall health is stable.',
            details: [
              {
                indicatorName: 'Hemoglobin',
                status: 'high',
                explanation: 'The value is slightly above the reference range.',
                advice: 'Stay hydrated and recheck if symptoms continue.',
              },
            ],
            suggestions: 'Maintain a balanced diet.',
            outro: 'EchoHealth has interpreted this report for you.',
          }),
        },
      }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    })

    const { generateScriptFromImages } = await import('../lib/vision.js')
    const fakeImage = Buffer.from('fake-image-data')
    const result = await generateScriptFromImages([fakeImage], 'AUTO', 'GENERAL', 'EchoHealth')

    expect(MockOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://api.groq.com/openai/v1' }),
    )
    expect(result.detectedLanguage).toBe('en')
    expect(result.script.details).toHaveLength(1)
    expect(result.script.details[0].indicatorName).toBe('Hemoglobin')
    expect(result.script.details[0].status).toBe('high')
  })
})
