import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks (accessible before module imports) ──────────────────────────
const { MockOpenAI, mockChatCreate } = vi.hoisted(() => {
  const mockChatCreate = vi.fn()
  const MockOpenAI = vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockChatCreate } },
  }))
  return { MockOpenAI, mockChatCreate }
})

vi.mock('openai', () => ({ default: MockOpenAI }))

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: '整体来看您的血常规结果比较正常，有1项指标需要稍微注意一下。',
              details: [
                {
                  indicatorName: '白细胞计数',
                  status: 'normal',
                  explanation: '白细胞是身体的卫士，您的数值在正常范围内，说明免疫功能良好。',
                },
                {
                  indicatorName: '葡萄糖',
                  status: 'high',
                  explanation: '血糖偏高，说明最近饮食中糖分摄入较多。',
                  advice: '建议减少甜食和精白米面，增加蔬菜摄入，饭后适当散步。',
                },
              ],
              suggestions: '多喝水，每天保证7-8小时睡眠。\n适量运动，每天步行30分钟。',
              outro: '小明特别为您解读了这份报告，希望您身体健康。本解读仅供参考，如有疑虑请咨询医生',
            }),
          },
        ],
      }),
    },
  })),
}))

// ── Shared fixtures ───────────────────────────────────────────────────────────
const MINIMAL_SCRIPT = {
  summary: '体检结果良好',
  details: [],
  suggestions: '保持健康生活',
  outro: '感谢使用',
}

const TWO_INDICATORS = [
  { name: '白细胞计数', code: 'WBC', value: '6.5', unit: '×10^9/L', referenceRange: '3.5-9.5', status: 'normal' as const },
  { name: '葡萄糖', code: 'GLU', value: '7.2', unit: 'mmol/L', referenceRange: '3.9-6.1', status: 'high' as const },
]

// ── Anthropic path tests ──────────────────────────────────────────────────────
describe('buildVideoScript via Anthropic', () => {
  beforeEach(() => {
    delete process.env.GROQ_API_KEY
    delete process.env.OPENROUTER_API_KEY
    process.env.CLAUDE_API_KEY = 'sk-ant-fake-key'
  })

  it('returns a script with all required sections', async () => {
    const { buildVideoScript } = await import('../pipeline/llm.js')
    const script = await buildVideoScript({
      indicators: TWO_INDICATORS,
      reportType: 'BLOOD_ROUTINE',
      senderName: '小明',
    })
    expect(script.summary).toBeTruthy()
    expect(script.details).toBeInstanceOf(Array)
    expect(script.details).toHaveLength(2)
    expect(script.suggestions).toBeTruthy()
    expect(script.outro).toContain('小明')
  })

  it('includes advice only for abnormal indicators', async () => {
    const { buildVideoScript } = await import('../pipeline/llm.js')
    const script = await buildVideoScript({ indicators: TWO_INDICATORS, reportType: 'BLOOD_ROUTINE', senderName: '小明' })
    const normalDetail = script.details.find(d => d.indicatorName === '白细胞计数')
    const highDetail = script.details.find(d => d.indicatorName === '葡萄糖')
    expect(normalDetail?.advice).toBeUndefined()
    expect(highDetail?.advice).toBeTruthy()
  })

  it('throws Missing CLAUDE_API_KEY when all provider keys absent', async () => {
    delete process.env.CLAUDE_API_KEY
    vi.resetModules()
    const { buildVideoScript } = await import('../pipeline/llm.js')
    await expect(
      buildVideoScript({ indicators: [], reportType: 'BLOOD_ROUTINE', senderName: '小明' })
    ).rejects.toThrow('Missing CLAUDE_API_KEY')
  })
})

// ── Provider priority chain ───────────────────────────────────────────────────
describe('provider priority chain', () => {
  beforeEach(() => {
    vi.resetModules()
    MockOpenAI.mockClear()
    mockChatCreate.mockClear()
    delete process.env.GROQ_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.CLAUDE_API_KEY
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(MINIMAL_SCRIPT) } }],
    })
  })

  it('calls Groq when GROQ_API_KEY is set', async () => {
    process.env.GROQ_API_KEY = 'gsk_fake_key'
    const { buildVideoScript } = await import('../pipeline/llm.js')
    await buildVideoScript({ indicators: [], reportType: 'BLOOD_ROUTINE', senderName: 'test' })
    expect(MockOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://api.groq.com/openai/v1' })
    )
  })

  it('calls OpenRouter when only OPENROUTER_API_KEY is set', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-fake'
    const { buildVideoScript } = await import('../pipeline/llm.js')
    await buildVideoScript({ indicators: [], reportType: 'BLOOD_ROUTINE', senderName: 'test' })
    expect(MockOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://openrouter.ai/api/v1' })
    )
  })

  it('Groq takes priority over OpenRouter when both keys present', async () => {
    process.env.GROQ_API_KEY = 'gsk_fake'
    process.env.OPENROUTER_API_KEY = 'sk-or-fake'
    const { buildVideoScript } = await import('../pipeline/llm.js')
    await buildVideoScript({ indicators: [], reportType: 'BLOOD_ROUTINE', senderName: 'test' })
    expect(MockOpenAI).toHaveBeenCalledOnce()
    expect(MockOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://api.groq.com/openai/v1' })
    )
  })

  it('does not call OpenAI when falling back to Anthropic', async () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-fake'
    const { buildVideoScript } = await import('../pipeline/llm.js')
    await buildVideoScript({ indicators: TWO_INDICATORS, reportType: 'BLOOD_ROUTINE', senderName: '小明' })
    expect(MockOpenAI).not.toHaveBeenCalled()
  })
})
