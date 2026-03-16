import { Worker, Job } from 'bullmq'
import * as Sentry from '@sentry/node'
import { mkdir, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { prisma } from '../db.js'
import { ocrReportImage, parseOcrText } from '../pipeline/ocr.js'
import { buildVideoScript } from '../pipeline/llm.js'
import { generateAudio } from '../pipeline/tts.js'
import { renderVideo } from '../pipeline/render.js'
import { uploadVideo, uploadAudio } from '../pipeline/upload.js'
import { extractIndicatorsFromImages, extractIndicatorsFromPdf } from '../lib/vision.js'
import { resizeImageForVision } from '../lib/image.js'
import { getConnection } from './index.js'
import type { VideoScript } from '../pipeline/llm.js'
import type { Indicator } from '../pipeline/ocr.js'
import type { Prisma, ReportType } from '@prisma/client'

// Slide timing constants (must stay in sync with packages/video/src/constants.ts)
const FPS = 30
const TRANSITION_FRAMES = 15
const INTRO_DURATION = 3 * FPS
const SUMMARY_DURATION = 4 * FPS
const INDICATOR_DURATION = 5 * FPS
const SUGGESTIONS_DURATION = 4 * FPS
const OUTRO_DURATION = 3 * FPS

export interface VideoJobData {
  reportId: string
}

/** Build a single TTS narration from all script sections. */
function buildNarrationText(script: VideoScript, language = 'zh'): string {
  const isEn = language === 'en'
  const sep = isEn ? '. ' : '。'
  const advicePrefix = isEn ? 'Suggestion: ' : '建议：'

  const parts: string[] = [
    script.summary,
    ...script.details.flatMap((d) => {
      const lines = [`${d.indicatorName}${sep}${d.explanation}`]
      if (d.advice) lines.push(`${advicePrefix}${d.advice}`)
      return lines
    }),
    script.suggestions,
    script.outro,
  ]
  return parts.join(sep)
}

/** Compute video duration in seconds based on the number of indicator slides. */
function computeDurationSeconds(detailCount: number): number {
  const totalSlides = 4 + detailCount // intro + summary + N + suggestions + outro
  const transitions = totalSlides - 1
  const frames =
    INTRO_DURATION +
    SUMMARY_DURATION +
    INDICATOR_DURATION * detailCount +
    SUGGESTIONS_DURATION +
    OUTRO_DURATION -
    transitions * TRANSITION_FRAMES
  return Math.ceil(frames / FPS)
}

/** Download a remote image and return its base64 encoding. */
async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${url} (${res.status})`)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf).toString('base64')
}

/** Download a remote file and return it as a Buffer. */
async function fetchAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch file: ${url} (${res.status})`)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf)
}

export async function runPipeline(job: Job<VideoJobData>): Promise<void> {
  const { reportId } = job.data

  // ── 1. Load report ──────────────────────────────────────────────────────────
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { user: true },
  })

  // ── 2. Mark as PROCESSING ───────────────────────────────────────────────────
  await prisma.report.update({
    where: { id: reportId },
    data: { status: 'PROCESSING' },
  })
  await job.updateProgress(5)

  const tmpDir = path.join(tmpdir(), 'echohealth', reportId)
  await mkdir(tmpDir, { recursive: true })

  try {
    // Resolve language: lowercase for downstream consumers
    let language: string = (report.language as string || 'zh').toLowerCase()
    if (language === 'auto') language = 'zh' // default; may be overwritten by vision detection

    // ── 3. OCR / Vision ───────────────────────────────────────────────────────
    let indicators = report.indicators as Indicator[] | null
    if (!indicators) {
      if (report.source === 'WEB') {
        // ── Web path: LLM Vision via Gemini ──
        const reportLang = (report.language as string) || 'AUTO'

        if (report.inputType === 'PDF') {
          const pdfBuffer = await fetchAsBuffer(report.photoUrls[0])
          const visionResult = await extractIndicatorsFromPdf(pdfBuffer, reportLang)
          indicators = visionResult.indicators.map((vi) => ({
            name: vi.name,
            code: vi.name.toUpperCase().replace(/\s+/g, '_'),
            value: vi.value,
            unit: vi.unit,
            referenceRange: vi.referenceRange,
            status: vi.status,
          }))
          if (reportLang === 'AUTO') language = visionResult.language
        } else {
          // IMAGE input
          const rawBuffers = await Promise.all(report.photoUrls.map(fetchAsBuffer))
          const resizedBuffers = await Promise.all(rawBuffers.map(resizeImageForVision))
          const visionResult = await extractIndicatorsFromImages(resizedBuffers, reportLang)
          indicators = visionResult.indicators.map((vi) => ({
            name: vi.name,
            code: vi.name.toUpperCase().replace(/\s+/g, '_'),
            value: vi.value,
            unit: vi.unit,
            referenceRange: vi.referenceRange,
            status: vi.status,
          }))
          if (reportLang === 'AUTO') language = visionResult.language
        }

        // Persist detected language if it was AUTO
        const updateData: Record<string, unknown> = {
          indicators: indicators as unknown as Prisma.InputJsonValue,
        }
        if ((report.language as string) === 'AUTO') {
          updateData.language = language.toUpperCase()
        }
        await prisma.report.update({
          where: { id: reportId },
          data: updateData,
        })
      } else {
        // ── Miniprogram path: Tencent OCR (unchanged) ──
        const texts: string[] = []
        for (const photoUrl of report.photoUrls) {
          const base64 = await fetchImageAsBase64(photoUrl)
          texts.push(await ocrReportImage(base64))
        }
        const rawText = texts.join('\n')
        indicators = parseOcrText(rawText)
        await prisma.report.update({
          where: { id: reportId },
          data: {
            ocrText: rawText,
            indicators: indicators as unknown as Prisma.InputJsonValue,
          },
        })
      }
    }
    await job.updateProgress(20)

    // ── 4. LLM script ─────────────────────────────────────────────────────────
    const script = await buildVideoScript({
      indicators,
      reportType: report.type as ReportType,
      senderName: report.user.nickname ?? '家人',
      language,
    })
    await prisma.report.update({
      where: { id: reportId },
      data: { script: script as unknown as Prisma.InputJsonValue },
    })
    await job.updateProgress(40)

    // ── 5. TTS → upload audio ─────────────────────────────────────────────────
    const narration = buildNarrationText(script, language)
    const audioLocal = path.join(tmpDir, 'narration.mp3')
    await generateAudio(narration, audioLocal, undefined, language)
    const audioSrc = await uploadAudio(audioLocal, reportId)
    await job.updateProgress(60)

    // ── 6. Render video ───────────────────────────────────────────────────────
    const videoLocal = path.join(tmpDir, 'output.mp4')
    const renderReportType = report.type === 'GENERAL' ? 'PHYSICAL_EXAM' : report.type
    await renderVideo(
      {
        script,
        reportType: renderReportType as 'BLOOD_ROUTINE' | 'BIOCHEMISTRY' | 'PHYSICAL_EXAM',
        senderName: report.user.nickname ?? '家人',
        audioSrc,
      },
      videoLocal,
    )
    await job.updateProgress(85)

    // ── 7. Upload video ───────────────────────────────────────────────────────
    const cosUrl = await uploadVideo(videoLocal, reportId)
    await job.updateProgress(95)

    // ── 8. Persist result ─────────────────────────────────────────────────────
    const duration = computeDurationSeconds(script.details.length)
    await prisma.$transaction([
      prisma.video.create({ data: { reportId, cosUrl, duration } }),
      prisma.report.update({
        where: { id: reportId },
        data: { status: 'COMPLETED' },
      }),
    ])
    await job.updateProgress(100)
  } catch (err) {
    Sentry.captureException(err, { tags: { reportId } })
    // Mark report as FAILED and preserve the error message
    await prisma.report
      .update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          errorMsg: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => {}) // don't shadow the original error
    throw err
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

export function startWorker() {
  const worker = new Worker<VideoJobData>('video-generation', runPipeline, {
    connection: getConnection(),
    concurrency: 2,
  })

  worker.on('completed', (job) =>
    console.log(`[Worker] Done: job=${job.id} reportId=${job.data.reportId}`),
  )
  worker.on('failed', (job, err) =>
    console.error(`[Worker] Failed: job=${job?.id} reportId=${job?.data?.reportId}`, err),
  )

  return worker
}
