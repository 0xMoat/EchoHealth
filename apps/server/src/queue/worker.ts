import { Worker, Job } from 'bullmq'
import { mkdir, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { prisma } from '../db.js'
import { ocrReportImage, parseOcrText } from '../pipeline/ocr.js'
import { buildVideoScript } from '../pipeline/llm.js'
import { generateAudio } from '../pipeline/tts.js'
import { renderVideo } from '../pipeline/render.js'
import { uploadVideo, uploadAudio } from '../pipeline/upload.js'
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
function buildNarrationText(script: VideoScript): string {
  const parts: string[] = [
    script.summary,
    ...script.details.flatMap((d) => {
      const lines = [`${d.indicatorName}。${d.explanation}`]
      if (d.advice) lines.push(`建议：${d.advice}`)
      return lines
    }),
    script.suggestions,
    script.outro,
  ]
  return parts.join('。')
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

async function runPipeline(job: Job<VideoJobData>): Promise<void> {
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
    // ── 3. OCR ────────────────────────────────────────────────────────────────
    let indicators = report.indicators as Indicator[] | null
    if (!indicators) {
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
    await job.updateProgress(20)

    // ── 4. LLM script ─────────────────────────────────────────────────────────
    const script = await buildVideoScript({
      indicators,
      reportType: report.type as ReportType,
      senderName: report.user.nickname ?? '家人',
    })
    await prisma.report.update({
      where: { id: reportId },
      data: { script: script as unknown as Prisma.InputJsonValue },
    })
    await job.updateProgress(40)

    // ── 5. TTS → upload audio ─────────────────────────────────────────────────
    const narration = buildNarrationText(script)
    const audioLocal = path.join(tmpDir, 'narration.mp3')
    await generateAudio(narration, audioLocal)
    const audioSrc = await uploadAudio(audioLocal, reportId)
    await job.updateProgress(60)

    // ── 6. Render video ───────────────────────────────────────────────────────
    const videoLocal = path.join(tmpDir, 'output.mp4')
    await renderVideo(
      {
        script,
        reportType: report.type as 'BLOOD_ROUTINE' | 'BIOCHEMISTRY' | 'PHYSICAL_EXAM',
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
