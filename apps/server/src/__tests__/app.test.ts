import { afterAll, describe, it, expect, vi } from 'vitest'
import { buildApp } from '../app.js'
import type { FastifyInstance } from 'fastify'

// db.ts is now transitively imported via routes/reports; mock it to avoid
// requiring a real DATABASE_URL in the test environment.
vi.mock('../db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    report: { create: vi.fn(), findUnique: vi.fn() },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn() })),
}))

describe('App', () => {
  let app: FastifyInstance

  afterAll(async () => {
    await app?.close()
  })

  it('health check returns ok', async () => {
    app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})
