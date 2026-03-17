import OpenAI from 'openai'
import type { VideoScript } from '../pipeline/llm.js'
import { getLangfuse } from './observability.js'

export interface WebScriptResult {
  script: VideoScript
  detectedLanguage: string
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  BLOOD_ROUTINE: '血常规 (Blood Routine)',
  BIOCHEMISTRY: '生化检查 (Biochemistry)',
  PHYSICAL_EXAM: '体检报告 (Physical Exam)',
  GENERAL: '健康报告 (Health Report)',
}

function buildPrompt(reportType: string, senderName: string, language: string): string {
  const typeLabel = REPORT_TYPE_LABELS[reportType] ?? reportType

  let langInstruction: string
  let outroTemplate: string

  if (language === 'AUTO') {
    langInstruction = `LANGUAGE RULE (CRITICAL):
- Examine the report content for Chinese characters (汉字).
- If the report contains Chinese characters → you MUST write ALL output fields in 简体中文. Set "language": "zh".
- If the report contains only English → write ALL output fields in English. Set "language": "en".
- Medical abbreviations (e.g. ALT, AST, WBC) may appear in parentheses after the Chinese name, like: 谷丙转氨酶（ALT）.
- DO NOT mix languages. Every sentence must be in the detected language only.`
    outroTemplate = `(If zh) "${senderName}为您解读了这份报告，仅供参考，如有疑虑请咨询医生。" (If en) "${senderName} has interpreted this report for you. For reference only — consult a doctor if you have concerns."`
  } else if (language === 'ZH') {
    langInstruction = `LANGUAGE RULE (CRITICAL):
- You MUST write ALL output fields entirely in 简体中文. No English sentences.
- Medical abbreviations (e.g. ALT, AST, WBC) may appear in parentheses after the Chinese name, like: 谷丙转氨酶（ALT）.
- Set "language": "zh".`
    outroTemplate = `"${senderName}为您解读了这份报告，仅供参考，如有疑虑请咨询医生。"`
  } else {
    langInstruction = `LANGUAGE RULE (CRITICAL):
- You MUST write ALL output fields entirely in English. No Chinese sentences.
- Set "language": "en".`
    outroTemplate = `"${senderName} has interpreted this report for you. For reference only — consult a doctor if you have concerns."`
  }

  return `You are a warm, professional health advisor analyzing a ${typeLabel} health report.

${langInstruction}

Return ONLY valid JSON with this exact structure:
{
  "language": "zh" or "en",
  "summary": "1-2 sentence overall health conclusion",
  "details": [
    {
      "indicatorName": "indicator name",
      "status": "normal|high|low",
      "explanation": "plain-language explanation of what this indicator means and what the result indicates",
      "advice": "for high/low only: specific actionable lifestyle advice"
    }
  ],
  "suggestions": "2-3 overall health suggestions (newline separated)",
  "outro": ${outroTemplate}
}

Rules:
- Include ALL indicators visible in the report
- Omit the "advice" field entirely for normal indicators
- Use simple, caring language suitable for elderly patients
- The outro must mention "${senderName}"`
}

const VALID_STATUSES = new Set(['normal', 'high', 'low'])

function normalizeStatus(s: unknown): 'normal' | 'high' | 'low' {
  const str = String(s ?? '').toLowerCase().trim()
  if (str === 'high' || str === 'elevated' || str === 'above' || str === '高') return 'high'
  if (str === 'low' || str === 'below' || str === '低') return 'low'
  return 'normal'
}

function parseResponse(raw: string): WebScriptResult {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Vision API returned no valid JSON')
  const parsed = JSON.parse(cleaned.slice(start, end + 1))
  const { language, ...rest } = parsed
  // Normalize status values to prevent Remotion render crash on unexpected values
  if (Array.isArray(rest.details)) {
    rest.details = rest.details.map((d: any) => ({
      ...d,
      status: VALID_STATUSES.has(d.status) ? d.status : normalizeStatus(d.status),
    }))
  }
  return {
    script: rest as VideoScript,
    detectedLanguage: (language as string) || 'zh',
  }
}

function groqClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')
  return new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey })
}

/** Image path: send images to Groq vision model, get VideoScript in one call. */
export async function generateScriptFromImages(
  imageBuffers: Buffer[],
  language: string,
  reportType: string,
  senderName: string,
  traceId?: string,
): Promise<WebScriptResult> {
  const model = process.env.GROQ_VISION_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct'
  const prompt = buildPrompt(reportType, senderName, language)

  const imageParts = imageBuffers.map(buf => ({
    type: 'image_url' as const,
    image_url: { url: `data:image/jpeg;base64,${buf.toString('base64')}` },
  }))

  const messages = [{
    role: 'user' as const,
    content: [
      ...imageParts,
      { type: 'text' as const, text: prompt },
    ],
  }]

  const lf = getLangfuse()
  const generation = lf?.generation({
    traceId,
    name: 'groq-vision-image',
    model,
    input: [{ role: 'user', content: `[${imageBuffers.length} image(s)]\n\n${prompt}` }],
    metadata: { imageCount: imageBuffers.length, language, reportType },
  })

  const startTime = Date.now()
  try {
    const completion = await groqClient().chat.completions.create({ model, max_tokens: 3000, messages })
    const content = completion.choices[0]?.message?.content ?? ''
    const result = parseResponse(content)

    generation?.end({
      output: content,
      usage: {
        input: completion.usage?.prompt_tokens,
        output: completion.usage?.completion_tokens,
        total: completion.usage?.total_tokens,
      },
      metadata: {
        detectedLanguage: result.detectedLanguage,
        indicatorCount: result.script.details.length,
        latencyMs: Date.now() - startTime,
      },
    })
    await lf?.flushAsync()
    return result
  } catch (err) {
    generation?.end({ level: 'ERROR', statusMessage: err instanceof Error ? err.message : String(err) })
    await lf?.flushAsync()
    throw err
  }
}

/** PDF path: extract text with pdfjs-dist, send to Groq text model. */
export async function generateScriptFromPdf(
  pdfBuffer: Buffer,
  language: string,
  reportType: string,
  senderName: string,
  traceId?: string,
): Promise<WebScriptResult> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise
  const pageTexts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pageTexts.push(
      content.items.map((item: any) => ('str' in item ? item.str : '')).join(' '),
    )
  }
  doc.destroy()

  const pdfText = pageTexts.join('\n').trim()
  if (!pdfText) throw new Error('PDF has no extractable text (possibly a scanned image PDF)')

  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
  const prompt = buildPrompt(reportType, senderName, language)
  const userContent = `${prompt}\n\nHealth report content:\n${pdfText}`

  const lf = getLangfuse()
  const generation = lf?.generation({
    traceId,
    name: 'groq-text-pdf',
    model,
    input: [{ role: 'user', content: userContent }],
    metadata: { pdfPages: pageTexts.length, pdfTextLength: pdfText.length, language, reportType },
  })

  const startTime = Date.now()
  try {
    const completion = await groqClient().chat.completions.create({
      model,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: userContent }],
    })
    const content = completion.choices[0]?.message?.content ?? ''
    const result = parseResponse(content)

    generation?.end({
      output: content,
      usage: {
        input: completion.usage?.prompt_tokens,
        output: completion.usage?.completion_tokens,
        total: completion.usage?.total_tokens,
      },
      metadata: {
        detectedLanguage: result.detectedLanguage,
        indicatorCount: result.script.details.length,
        latencyMs: Date.now() - startTime,
      },
    })
    await lf?.flushAsync()
    return result
  } catch (err) {
    generation?.end({ level: 'ERROR', statusMessage: err instanceof Error ? err.message : String(err) })
    await lf?.flushAsync()
    throw err
  }
}
