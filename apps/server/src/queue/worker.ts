import { Worker, Job } from 'bullmq'
import * as Sentry from '@sentry/node'
import { mkdir, rm, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { prisma } from '../db.js'
import { ocrReportImage, parseOcrText } from '../pipeline/ocr.js'
import { buildVideoScript } from '../pipeline/llm.js'
import { generateAudio } from '../pipeline/tts.js'
import { renderVideo } from '../pipeline/render.js'
import { uploadVideo } from '../pipeline/upload.js'
import { generateScriptFromImages, generateScriptFromPdf } from '../lib/vision.js'
import { resizeImageForVision } from '../lib/image.js'
import { getLangfuse } from '../lib/observability.js'
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

/**
 * Returns a step timer. Call `done(detail?)` to log elapsed time.
 * Output: [rid] ✓ step-name      1234ms · optional detail
 */
function makeTimer(rid: string) {
  return function step(name: string) {
    const t = Date.now()
    return (detail = '') => {
      const ms = Date.now() - t
      const suffix = detail ? ` · ${detail}` : ''
      console.log(`[${rid}] ✓ ${name.padEnd(18)} ${ms}ms${suffix}`)
    }
  }
}

export async function runPipeline(job: Job<VideoJobData>): Promise<void> {
  const { reportId } = job.data
  const rid = reportId.slice(-8)
  const step = makeTimer(rid)

  console.log(`[${rid}] ── pipeline start  reportId=${reportId}`)

  // Fast-video mode for e2e testing: skip entire pipeline, mark as completed immediately
  if (process.env.TEST_FAST_VIDEO === 'true') {
    console.log(`[${rid}] ── TEST_FAST_VIDEO: skipping pipeline`)
    await prisma.report.update({ where: { id: reportId }, data: { status: 'PROCESSING' } })
    await job.updateProgress(50)
    const dummyScript = {
      summary: 'Test summary',
      details: [{ indicatorName: 'Test', status: 'normal', explanation: 'Normal range' }],
      suggestions: 'Stay healthy',
      outro: 'Thank you',
    }
    await prisma.report.update({
      where: { id: reportId },
      data: { script: dummyScript as unknown as Prisma.InputJsonValue },
    })
    await prisma.$transaction([
      prisma.video.create({
        data: {
          reportId,
          cosUrl: 'https://echohealth-test.cos.ap-guangzhou.myqcloud.com/test/sample.mp4',
          duration: 15,
        },
      }),
      prisma.report.update({ where: { id: reportId }, data: { status: 'COMPLETED' } }),
    ])
    await job.updateProgress(100)
    console.log(`[${rid}] ── TEST_FAST_VIDEO: done`)
    return
  }

  // ── 1. Load report ──────────────────────────────────────────────────────────
  let done = step('load-report')
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { user: true },
  })
  done(`source=${report.source} type=${report.type} lang=${report.language}`)

  // ── 2. Mark as PROCESSING ───────────────────────────────────────────────────
  done = step('mark-processing')
  await prisma.report.update({ where: { id: reportId }, data: { status: 'PROCESSING' } })
  await job.updateProgress(5)
  done()

  // Init Langfuse trace (no-op if keys not set)
  const lf = getLangfuse()
  lf?.trace({
    id: reportId,
    name: 'video-generation-pipeline',
    metadata: {
      source: report.source,
      inputType: report.inputType,
      reportType: report.type,
      language: report.language,
      userId: report.userId,
    },
  })

  const tmpDir = path.join(tmpdir(), 'echohealth', reportId)
  await mkdir(tmpDir, { recursive: true })

  try {
    let language: string = ((report.language as string) || 'zh').toLowerCase()
    if (language === 'auto') language = 'zh'

    // ── 3+4. Vision + Script ──────────────────────────────────────────────────
    let script: VideoScript

    if (report.source === 'WEB') {
      const reportLang = (report.language as string) || 'AUTO'
      const senderName = report.user.nickname ?? '家人'

      let result
      if (report.inputType === 'PDF') {
        done = step('pdf-extract+script')
        const pdfBuffer = await fetchAsBuffer(report.photoUrls[0])
        result = await generateScriptFromPdf(pdfBuffer, reportLang, report.type as string, senderName, reportId)
        done(`lang=${result.detectedLanguage} indicators=${result.script.details.length}`)
      } else {
        done = step('vision+script')
        const rawBuffers = await Promise.all(report.photoUrls.map(fetchAsBuffer))
        const resizedBuffers = await Promise.all(rawBuffers.map(resizeImageForVision))
        result = await generateScriptFromImages(resizedBuffers, reportLang, report.type as string, senderName, reportId)
        done(`lang=${result.detectedLanguage} indicators=${result.script.details.length} images=${resizedBuffers.length}`)
      }

      script = result.script
      if (reportLang === 'AUTO') language = result.detectedLanguage

      await prisma.report.update({
        where: { id: reportId },
        data: {
          script: script as unknown as Prisma.InputJsonValue,
          ...(reportLang === 'AUTO' && { language: language.toUpperCase() as any }),
        },
      })
    } else {
      // ── Miniprogram path: Tencent OCR → Groq LLM ─────────────────────────────
      let indicators = report.indicators as Indicator[] | null
      if (!indicators) {
        done = step('ocr')
        const texts: string[] = []
        for (const photoUrl of report.photoUrls) {
          const base64 = await fetchImageAsBase64(photoUrl)
          texts.push(await ocrReportImage(base64))
        }
        const rawText = texts.join('\n')
        indicators = parseOcrText(rawText)
        done(`indicators=${indicators.length}`)
        await prisma.report.update({
          where: { id: reportId },
          data: {
            ocrText: rawText,
            indicators: indicators as unknown as Prisma.InputJsonValue,
          },
        })
      }

      done = step('llm-script')
      script = await buildVideoScript({
        indicators,
        reportType: report.type as ReportType,
        senderName: report.user.nickname ?? '家人',
        language,
      })
      done(`details=${script.details.length}`)
      await prisma.report.update({
        where: { id: reportId },
        data: { script: script as unknown as Prisma.InputJsonValue },
      })
    }
    await job.updateProgress(40)

    // ── 5. TTS (local only, no COS upload needed before render) ──────────────
    done = step('tts')
    const narration = buildNarrationText(script, language)
    const audioLocal = path.join(tmpDir, 'narration.mp3')
    await generateAudio(narration, audioLocal, undefined, language)
    const audioBase64 = (await readFile(audioLocal)).toString('base64')
    const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`
    done(`chars=${narration.length} lang=${language}`)
    await job.updateProgress(60)

    // ── 6. Render video (embed audio as data URI — avoids cross-cloud fetch) ──
    done = step('video-render')
    const videoLocal = path.join(tmpDir, 'output.mp4')
    const renderReportType = (report.type as string) === 'GENERAL' ? 'PHYSICAL_EXAM' : report.type
    await renderVideo(
      {
        script,
        reportType: renderReportType as 'BLOOD_ROUTINE' | 'BIOCHEMISTRY' | 'PHYSICAL_EXAM',
        senderName: report.user.nickname ?? '家人',
        audioSrc: audioDataUri,
      },
      videoLocal,
    )
    done()
    await job.updateProgress(85)

    // ── 7. Upload video ───────────────────────────────────────────────────────
    done = step('upload-video')
    const cosUrl = await uploadVideo(videoLocal, reportId)
    done()
    await job.updateProgress(95)

    // ── 8. Persist result ─────────────────────────────────────────────────────
    done = step('persist')
    const duration = computeDurationSeconds(script.details.length)
    await prisma.$transaction([
      prisma.video.create({ data: { reportId, cosUrl, duration } }),
      prisma.report.update({ where: { id: reportId }, data: { status: 'COMPLETED' } }),
    ])
    done(`duration=${duration}s cosUrl=${cosUrl.slice(0, 40)}...`)
    await job.updateProgress(100)

    console.log(`[${rid}] ── pipeline done`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${rid}] ✗ pipeline failed: ${msg}`)
    Sentry.captureException(err, { tags: { reportId } })
    await prisma.report
      .update({ where: { id: reportId }, data: { status: 'FAILED', errorMsg: msg } })
      .catch(() => {})
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
