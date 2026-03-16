// apps/server/src/lib/vision.ts
import { GoogleGenAI } from '@google/genai'

export interface VisionIndicator {
  name: string
  value: string
  unit: string
  referenceRange: string
  status: 'normal' | 'high' | 'low' | 'unknown'
}

export interface VisionResult {
  language: 'en' | 'zh'
  indicators: VisionIndicator[]
}

const VISION_PROMPT = `You are a medical report analyzer. Extract ALL health indicators from the report image(s).

Return ONLY valid JSON in this exact format:
{
  "language": "en" or "zh" (detected language of the report),
  "indicators": [
    {
      "name": "indicator name",
      "value": "measured value",
      "unit": "unit of measurement",
      "referenceRange": "normal range",
      "status": "normal" | "high" | "low" | "unknown"
    }
  ]
}

Rules:
- Extract every indicator visible, not just abnormal ones
- Determine status by comparing value to reference range
- If reference range is not visible, set status to "unknown"
- Detect report language from the text in the image`

async function callGemini(imageBuffers: Buffer[], language: string): Promise<VisionResult> {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  const imageParts = imageBuffers.map(buf => ({
    inlineData: {
      mimeType: 'image/jpeg' as const,
      data: buf.toString('base64'),
    },
  }))

  const languageHint = language === 'AUTO'
    ? 'Detect the language from the report.'
    : `The report is in ${language === 'ZH' ? 'Chinese' : 'English'}.`

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          ...imageParts,
          { text: `${VISION_PROMPT}\n\n${languageHint}` },
        ],
      },
    ],
  })

  const text = response.text ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse LLM Vision response')

  return JSON.parse(jsonMatch[0]) as VisionResult
}

export async function extractIndicatorsFromImages(
  imageBuffers: Buffer[],
  language: string,
): Promise<VisionResult> {
  const provider = process.env.LLM_VISION_PROVIDER || 'gemini'
  switch (provider) {
    case 'gemini':
      return callGemini(imageBuffers, language)
    default:
      throw new Error(`Unsupported vision provider: ${provider}`)
  }
}

export async function extractIndicatorsFromPdf(
  pdfBuffer: Buffer,
  language: string,
): Promise<VisionResult> {
  const provider = process.env.LLM_VISION_PROVIDER || 'gemini'
  if (provider !== 'gemini') {
    throw new Error(`PDF extraction only supports gemini provider, got: ${provider}`)
  }

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const languageHint = language === 'AUTO'
    ? 'Detect the language from the report.'
    : `The report is in ${language === 'ZH' ? 'Chinese' : 'English'}.`

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } },
          { text: `${VISION_PROMPT}\n\n${languageHint}` },
        ],
      },
    ],
  })

  const text = response.text ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse LLM Vision response for PDF')

  return JSON.parse(jsonMatch[0]) as VisionResult
}
