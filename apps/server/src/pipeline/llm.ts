import Anthropic from '@anthropic-ai/sdk'
import type { Indicator } from './ocr.js'
import type { ReportType } from '@prisma/client'

const REPORT_TYPE_MAP: Record<ReportType, string> = {
  BLOOD_ROUTINE: '血常规',
  BIOCHEMISTRY: '生化检查',
  PHYSICAL_EXAM: '体检总报告',
}

export interface ScriptDetail {
  indicatorName: string
  status: 'normal' | 'high' | 'low'
  explanation: string
  advice?: string
}

export interface VideoScript {
  summary: string
  details: ScriptDetail[]
  suggestions: string
  outro: string
}

export async function buildVideoScript(params: {
  indicators: Indicator[]
  reportType: ReportType
  senderName: string
}): Promise<VideoScript> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) throw new Error('Missing CLAUDE_API_KEY environment variable')

  const { indicators, reportType, senderName } = params
  const client = new Anthropic({ apiKey })

  const prompt = `你是一位温和专业的健康顾问，需要为一位中老年人解读他们的${REPORT_TYPE_MAP[reportType]}报告。
请用简单易懂的语言，避免使用专业术语，像对父母说话一样亲切。

报告指标如下：
${indicators.map((i) => `- ${i.name}（${i.code}）: ${i.value} ${i.unit}，参考范围 ${i.referenceRange}，状态：${i.status === 'normal' ? '正常' : i.status === 'high' ? '偏高' : '偏低'}`).join('\n')}

请严格按照以下 JSON 格式返回，不要有任何其他内容：
{
  "summary": "一两句话总体结论",
  "details": [
    {
      "indicatorName": "指标名称",
      "status": "normal|high|low",
      "explanation": "用生活化语言解释这个指标是什么",
      "advice": "仅在异常时填写，给出具体可行的生活建议"
    }
  ],
  "suggestions": "2-3条整体健康建议，换行分隔",
  "outro": "${senderName}特别为您解读了这份报告，希望您身体健康。本解读仅供参考，如有疑虑请咨询医生"
}

注意：只对异常指标（偏高/偏低）给出 advice，正常指标的 advice 字段省略。`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // 提取 JSON（防止模型在 JSON 前后输出额外文本）
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('LLM response did not contain valid JSON')

  return JSON.parse(jsonMatch[0]) as VideoScript
}
