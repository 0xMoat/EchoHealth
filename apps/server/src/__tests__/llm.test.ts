import { describe, it, expect, vi, beforeEach } from 'vitest'

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

describe('buildVideoScript', () => {
  beforeEach(() => {
    process.env.CLAUDE_API_KEY = 'sk-ant-fake-key'
  })

  it('returns a script with all required sections', async () => {
    const { buildVideoScript } = await import('../pipeline/llm.js')
    const indicators = [
      { name: '白细胞计数', code: 'WBC', value: '6.5', unit: '×10^9/L', referenceRange: '3.5-9.5', status: 'normal' as const },
      { name: '葡萄糖', code: 'GLU', value: '7.2', unit: 'mmol/L', referenceRange: '3.9-6.1', status: 'high' as const },
    ]

    const script = await buildVideoScript({
      indicators,
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
    const indicators = [
      { name: '白细胞计数', code: 'WBC', value: '6.5', unit: '×10^9/L', referenceRange: '3.5-9.5', status: 'normal' as const },
      { name: '葡萄糖', code: 'GLU', value: '7.2', unit: 'mmol/L', referenceRange: '3.9-6.1', status: 'high' as const },
    ]
    const script = await buildVideoScript({ indicators, reportType: 'BLOOD_ROUTINE', senderName: '小明' })

    const normalDetail = script.details.find(d => d.indicatorName === '白细胞计数')
    const highDetail = script.details.find(d => d.indicatorName === '葡萄糖')
    expect(normalDetail?.advice).toBeUndefined()
    expect(highDetail?.advice).toBeTruthy()
  })

  it('throws when CLAUDE_API_KEY is missing', async () => {
    delete process.env.CLAUDE_API_KEY
    vi.resetModules()
    const { buildVideoScript } = await import('../pipeline/llm.js')
    await expect(
      buildVideoScript({ indicators: [], reportType: 'BLOOD_ROUTINE', senderName: '小明' })
    ).rejects.toThrow('Missing CLAUDE_API_KEY')
  })
})
