import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ROOT = path.resolve(__dirname, '../../..')

let container: StartedPostgreSqlContainer
let prisma: import('@prisma/client').PrismaClient

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()
  const dbUrl = container.getConnectionUri()

  execSync('pnpm prisma migrate deploy', {
    cwd: SERVER_ROOT,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  })

  process.env.DATABASE_URL = dbUrl
  const { PrismaClient } = await import('@prisma/client')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) })
})

afterAll(async () => {
  await prisma.$disconnect()
  await container.stop()
})

describe('POST /orders integration', () => {
  it('creates Order(PAID) and sets User.isPro=true with proExpireAt ~30d', async () => {
    const { buildApp } = await import('../../app.js')

    const user = await prisma.user.create({
      data: { openid: `order-test-${Math.random()}`, usedThisMonth: 3, usageResetAt: new Date() },
    })

    const app = await buildApp()
    const before = new Date()
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { userId: user.id },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.orderId).toBeDefined()

    // Verify DB state
    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updatedUser.isPro).toBe(true)
    expect(updatedUser.proExpireAt).not.toBeNull()

    const expectedExpiry = new Date(before.getTime() + 30 * 86_400_000)
    const diff = Math.abs(updatedUser.proExpireAt!.getTime() - expectedExpiry.getTime())
    expect(diff).toBeLessThan(5000) // within 5 seconds

    // Verify Order record
    const order = await prisma.order.findUniqueOrThrow({ where: { id: body.orderId } })
    expect(order.status).toBe('PAID')
    expect(order.amount).toBe(1800)
    expect(order.paidAt).not.toBeNull()
  })
})
