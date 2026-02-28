/**
 * Worker + Redis integration tests.
 *
 * Verifies the full BullMQ queue → Worker → DB pipeline with:
 *   - Real Redis (testcontainers)
 *   - Real PostgreSQL (testcontainers)
 *   - Mocked external services (OCR, LLM, TTS, render, COS upload)
 *
 * Run with:
 *   pnpm test:integration
 *
 * Requires Docker (OrbStack) to be running.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

// ── Mock external pipeline steps ─────────────────────────────────────────────
// These never actually call OCR / LLM / TTS / Remotion / COS in tests.

vi.mock('../../pipeline/ocr.js', () => ({
  ocrReportImage: vi.fn().mockResolvedValue('WBC 6.5 ×10^9/L 参考范围 3.5-9.5'),
  parseOcrText: vi.fn().mockReturnValue([
    { name: '白细胞', code: 'WBC', value: '6.5', unit: '×10^9/L', referenceRange: '3.5-9.5', status: 'normal' },
  ]),
}))

vi.mock('../../pipeline/llm.js', () => ({
  buildVideoScript: vi.fn().mockResolvedValue({
    summary: '体检结果良好',
    details: [],
    suggestions: '保持健康生活方式',
    outro: '感谢使用 EchoHealth',
  }),
}))

vi.mock('../../pipeline/tts.js', () => ({
  generateAudio: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../pipeline/render.js', () => ({
  renderVideo: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../pipeline/upload.js', () => ({
  uploadAudio: vi.fn().mockResolvedValue('https://cos.example.com/audio/test.mp3'),
  uploadVideo: vi.fn().mockResolvedValue('https://cos.example.com/videos/test/output.mp4'),
}))

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}))

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}) as never

// ── Container setup ───────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ROOT = path.resolve(__dirname, '../../..')

let pgContainer: StartedPostgreSqlContainer
let redisContainer: StartedRedisContainer
let prisma: import('@prisma/client').PrismaClient

beforeAll(async () => {
  // Start PG and Redis in parallel
  ;[pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine').start(),
    new RedisContainer('redis:7').start(),
  ])

  const dbUrl = pgContainer.getConnectionUri()
  const redisUrl = redisContainer.getConnectionUrl()

  // Run migrations
  execSync('pnpm prisma migrate deploy', {
    cwd: SERVER_ROOT,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  })

  // Set env vars BEFORE any module imports that depend on them
  process.env.DATABASE_URL = dbUrl
  process.env.REDIS_URL = redisUrl

  // Create prisma client for test assertions (separate from the module singleton)
  const { PrismaClient } = await import('@prisma/client')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const adapter = new PrismaPg({ connectionString: dbUrl })
  prisma = new PrismaClient({ adapter })
})

afterAll(async () => {
  const { closeQueue } = await import('../../queue/index.js')
  await closeQueue()
  await prisma.$disconnect()
  await pgContainer.stop()
  await redisContainer.stop()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForStatus(
  reportId: string,
  target: 'COMPLETED' | 'FAILED',
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const report = await prisma.report.findUniqueOrThrow({ where: { id: reportId } })
    if (report.status === target || report.status === 'FAILED') return report.status
    await new Promise(r => setTimeout(r, 200))
  }
  throw new Error(`Timed out waiting for report ${reportId} to reach ${target}`)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BullMQ Worker + Redis (real infrastructure)', () => {
  it('processes a queued job and marks report COMPLETED', async () => {
    const { getQueue, getConnection } = await import('../../queue/index.js')
    const { startWorker } = await import('../../queue/worker.js')

    // Seed: user + report
    const user = await prisma.user.create({
      data: { openid: `worker-ok-${Math.random()}`, usedThisMonth: 0, usageResetAt: new Date() },
    })
    const report = await prisma.report.create({
      data: {
        userId: user.id,
        type: 'BLOOD_ROUTINE',
        photoUrls: ['https://cos.example.com/photo.jpg'],
        status: 'PENDING',
      },
    })

    // Start worker against the test Redis + PG
    const worker = startWorker()

    // Enqueue the job
    const queue = getQueue()
    await queue.add('generate', { reportId: report.id }, { attempts: 1 })

    // Wait for pipeline to complete
    const finalStatus = await waitForStatus(report.id, 'COMPLETED')

    await worker.close()

    expect(finalStatus).toBe('COMPLETED')

    // Verify video record was created
    const completed = await prisma.report.findUniqueOrThrow({
      where: { id: report.id },
      include: { video: true },
    })
    expect(completed.video?.cosUrl).toContain('cos.example.com')
    expect(completed.video?.duration).toBeGreaterThan(0)
  })

  it('marks report FAILED when pipeline step throws', async () => {
    const { renderVideo } = await import('../../pipeline/render.js')
    vi.mocked(renderVideo).mockRejectedValueOnce(new Error('render crashed'))

    const { getQueue } = await import('../../queue/index.js')
    const { startWorker } = await import('../../queue/worker.js')

    const user = await prisma.user.create({
      data: { openid: `worker-fail-${Math.random()}`, usedThisMonth: 0, usageResetAt: new Date() },
    })
    const report = await prisma.report.create({
      data: {
        userId: user.id,
        type: 'PHYSICAL_EXAM',
        photoUrls: ['https://cos.example.com/photo.jpg'],
        status: 'PENDING',
      },
    })

    const worker = startWorker()
    const queue = getQueue()
    await queue.add('generate', { reportId: report.id }, { attempts: 1 })

    const finalStatus = await waitForStatus(report.id, 'FAILED')

    await worker.close()

    expect(finalStatus).toBe('FAILED')

    const failed = await prisma.report.findUniqueOrThrow({ where: { id: report.id } })
    expect(failed.errorMsg).toBe('render crashed')
  })
})
