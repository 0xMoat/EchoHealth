/**
 * Integration tests for quota middleware against a real PostgreSQL database.
 *
 * Run with:
 *   pnpm test:integration
 *
 * Requires Docker (OrbStack) to be running.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ROOT = path.resolve(__dirname, '../../..')

let container: StartedPostgreSqlContainer
let prisma: import('@prisma/client').PrismaClient

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()
  const dbUrl = container.getConnectionUri()

  // Run migrations against the test container
  execSync('pnpm prisma migrate deploy', {
    cwd: SERVER_ROOT,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  })

  // Set up Prisma with the test DB
  process.env.DATABASE_URL = dbUrl

  // Dynamically import after setting env so the adapter picks up the new URL
  const { PrismaClient } = await import('@prisma/client')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const adapter = new PrismaPg({ connectionString: dbUrl })
  prisma = new PrismaClient({ adapter })
})

afterAll(async () => {
  await prisma.$disconnect()
  await container.stop()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createUser(overrides?: Partial<Parameters<typeof prisma.user.create>[0]['data']>) {
  return prisma.user.create({
    data: {
      openid: `test-openid-${Math.random()}`,
      isPro: false,
      usedThisMonth: 0,
      usageResetAt: new Date(),
      ...overrides,
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('quota (real DB)', () => {
  it('increments usedThisMonth on allowed request', async () => {
    const { quotaMiddleware } = await import('../../middleware/quota.js')
    const user = await createUser()

    const reply = { status: () => reply, send: () => {} } as never
    await quotaMiddleware({ body: { userId: user.id } } as never, reply)

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updated.usedThisMonth).toBe(1)
  })

  it('blocks and does not increment when free limit reached', async () => {
    const { quotaMiddleware } = await import('../../middleware/quota.js')
    const { FREE_MONTHLY_LIMIT } = await import('../../middleware/quota.js')
    const user = await createUser({ usedThisMonth: FREE_MONTHLY_LIMIT })

    let sentStatus = 0
    const reply = {
      status: (s: number) => { sentStatus = s; return reply },
      send: () => {},
    } as never

    await quotaMiddleware({ body: { userId: user.id } } as never, reply)

    expect(sentStatus).toBe(429)
    // Count should remain unchanged
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(unchanged.usedThisMonth).toBe(FREE_MONTHLY_LIMIT)
  })

  it('resets counter and allows request when month has changed', async () => {
    const { quotaMiddleware } = await import('../../middleware/quota.js')
    const { FREE_MONTHLY_LIMIT } = await import('../../middleware/quota.js')

    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    // User appears full but counter is from last month
    const user = await createUser({ usedThisMonth: FREE_MONTHLY_LIMIT, usageResetAt: lastMonth })

    let sentStatus = 0
    const reply = {
      status: (s: number) => { sentStatus = s; return reply },
      send: () => {},
    } as never

    await quotaMiddleware({ body: { userId: user.id } } as never, reply)

    expect(sentStatus).not.toBe(429)
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    // Reset to 0 then incremented to 1
    expect(updated.usedThisMonth).toBe(1)
  })

  it('pro user is allowed past the free limit', async () => {
    const { quotaMiddleware } = await import('../../middleware/quota.js')
    const { FREE_MONTHLY_LIMIT } = await import('../../middleware/quota.js')
    const user = await createUser({ isPro: true, usedThisMonth: FREE_MONTHLY_LIMIT })

    let sentStatus = 0
    const reply = {
      status: (s: number) => { sentStatus = s; return reply },
      send: () => {},
    } as never

    await quotaMiddleware({ body: { userId: user.id } } as never, reply)

    expect(sentStatus).not.toBe(429)
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updated.usedThisMonth).toBe(FREE_MONTHLY_LIMIT + 1)
  })
})

describe('quota concurrency (real DB)', () => {
  it('atomic increment: N concurrent allowed requests are each counted', async () => {
    // Tests that Prisma's { increment: 1 } is atomic — no lost updates under concurrency.
    // All FREE_LIMIT requests start from usedThisMonth=0, so all pass the check.
    // The final count must equal exactly FREE_LIMIT (no lost increments).
    const { quotaMiddleware, FREE_MONTHLY_LIMIT } = await import('../../middleware/quota.js')
    const user = await createUser({ usedThisMonth: 0 })

    const makeReply = () => {
      let _status = 200
      return {
        getStatus: () => _status,
        status(s: number) { _status = s; return this },
        send() {},
      }
    }

    const replies = await Promise.all(
      Array.from({ length: FREE_MONTHLY_LIMIT }, () => {
        const reply = makeReply()
        return quotaMiddleware({ body: { userId: user.id } } as never, reply as never)
          .then(() => reply.getStatus())
      }),
    )

    // All requests were within the limit, so all should have passed
    expect(replies.every(s => s === 200)).toBe(true)

    // DB atomic increment — no lost updates
    const final = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(final.usedThisMonth).toBe(FREE_MONTHLY_LIMIT)
  })

  it('over-limit concurrent requests: exactly 1 passes, rest blocked (atomic fix)', async () => {
    // User has 1 slot left. We fire FREE_LIMIT concurrent requests.
    // With the atomic updateMany WHERE usedThisMonth < limit fix, the DB row lock
    // ensures only 1 request can satisfy the WHERE clause and commit the increment.
    // All others get count=0 → 429.
    const { quotaMiddleware, FREE_MONTHLY_LIMIT } = await import('../../middleware/quota.js')
    const user = await createUser({ usedThisMonth: FREE_MONTHLY_LIMIT - 1 })

    const makeReply = () => {
      let _status = 200
      return {
        getStatus: () => _status,
        status(s: number) { _status = s; return this },
        send() {},
      }
    }

    const statuses = await Promise.all(
      Array.from({ length: FREE_MONTHLY_LIMIT }, () => {
        const reply = makeReply()
        return quotaMiddleware({ body: { userId: user.id } } as never, reply as never)
          .then(() => reply.getStatus())
      }),
    )

    const passed = statuses.filter(s => s === 200).length
    const blocked = statuses.filter(s => s === 429).length

    // Exactly 1 slot was left → exactly 1 passes
    expect(passed).toBe(1)
    expect(blocked).toBe(FREE_MONTHLY_LIMIT - 1)

    // DB count is exactly at the limit (no over-increment)
    const final = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(final.usedThisMonth).toBe(FREE_MONTHLY_LIMIT)
  })
})

describe('Report CRUD (real DB)', () => {
  it('persists a report and updates its status', async () => {
    const user = await createUser()

    const report = await prisma.report.create({
      data: {
        userId: user.id,
        type: 'BLOOD_ROUTINE',
        photoUrls: ['https://example.com/img.jpg'],
        status: 'PENDING',
      },
    })

    expect(report.status).toBe('PENDING')

    await prisma.report.update({
      where: { id: report.id },
      data: { status: 'PROCESSING' },
    })

    const processing = await prisma.report.findUniqueOrThrow({ where: { id: report.id } })
    expect(processing.status).toBe('PROCESSING')

    await prisma.$transaction([
      prisma.video.create({ data: { reportId: report.id, cosUrl: 'https://cos.example.com/v.mp4', duration: 30 } }),
      prisma.report.update({ where: { id: report.id }, data: { status: 'COMPLETED' } }),
    ])

    const completed = await prisma.report.findUniqueOrThrow({
      where: { id: report.id },
      include: { video: true },
    })
    expect(completed.status).toBe('COMPLETED')
    expect(completed.video?.cosUrl).toContain('cos.example.com')
  })

  it('stores errorMsg when marking FAILED', async () => {
    const user = await createUser()
    const report = await prisma.report.create({
      data: { userId: user.id, type: 'PHYSICAL_EXAM', photoUrls: [], status: 'PROCESSING' },
    })

    await prisma.report.update({
      where: { id: report.id },
      data: { status: 'FAILED', errorMsg: 'render failed' },
    })

    const failed = await prisma.report.findUniqueOrThrow({ where: { id: report.id } })
    expect(failed.status).toBe('FAILED')
    expect(failed.errorMsg).toBe('render failed')
  })
})
