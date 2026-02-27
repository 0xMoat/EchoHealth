import { afterAll, describe, it, expect } from 'vitest'
import { buildApp } from '../app.js'
import type { FastifyInstance } from 'fastify'

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
