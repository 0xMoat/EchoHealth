import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
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

/**
 * Build the prompt for LLM script generation.
 */
function buildPrompt(params: {
  indicators: Indicator[]
  reportType: ReportType
  senderName: string
}): string {
  const { indicators, reportType, senderName } = params
  return `你是一位温和专业的健康顾问，需要为一位中老年人解读他们的${REPORT_TYPE_MAP[reportType]}报告。
请用简单易懂的语言，避免使用专业术语，像对父母说话一样亲切。

报告指标如下：
${indicators.map((i) => {
    const statusLabel = i.status === 'normal' ? '正常'
      : i.status === 'high' ? '偏高'
      : i.status === 'low' ? '偏低'
      : '待确认'
    return `- ${i.name}（${i.code}）: ${i.value} ${i.unit}，参考范围 ${i.referenceRange}，状态：${statusLabel}`
  }).join('\n')}

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
}

/**
 * Extract and validate JSON from LLM response text.
 */
function parseJsonResponse(text: string): VideoScript {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('LLM response did not contain valid JSON')
  }
  return validateVideoScript(JSON.parse(text.slice(start, end + 1)))
}

/**
 * Call LLM via OpenRouter (OpenAI-compatible API).
 * Uses the free model with the longest context window: qwen/qwen3-coder:free (1M ctx).
 */
async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY environment variable')

  const model = process.env.OPENROUTER_MODEL ?? 'qwen/qwen3-coder:free'

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/0xMoat/EchoHealth',
      'X-Title': 'EchoHealth',
    },
  })

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  return completion.choices[0]?.message?.content ?? ''
}

/**
 * Call LLM via Anthropic Claude API.
 */
async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) throw new Error('Missing CLAUDE_API_KEY environment variable')

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}

/**
 * Generate a video script from health report indicators.
 * Provider selection: OPENROUTER_API_KEY takes priority over CLAUDE_API_KEY.
 */
export async function buildVideoScript(params: {
  indicators: Indicator[]
  reportType: ReportType
  senderName: string
}): Promise<VideoScript> {
  const prompt = buildPrompt(params)

  const text = process.env.OPENROUTER_API_KEY
    ? await callOpenRouter(prompt)
    : await callAnthropic(prompt)

  return parseJsonResponse(text)
}

function validateVideoScript(obj: unknown): VideoScript {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('LLM response is not a JSON object')
  }
  const script = obj as Record<string, unknown>
  if (typeof script.summary !== 'string') throw new Error('LLM response missing summary')
  if (!Array.isArray(script.details)) throw new Error('LLM response missing details array')
  if (typeof script.suggestions !== 'string') throw new Error('LLM response missing suggestions')
  if (typeof script.outro !== 'string') throw new Error('LLM response missing outro')
  return script as unknown as VideoScript
}
