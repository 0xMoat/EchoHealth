import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.stubEnv('JWT_SECRET', 'test-secret-key')

describe('Auth Hook', () => {
  it('extracts userId from x-user-id header (WeChat flow)', async () => {
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.get('/test', (req, reply) => { reply.send({ user: (req as any).user }) })
    const res = await app.inject({ method: 'GET', url: '/test', headers: { 'x-user-id': 'user_wx_123' } })
    expect(res.json().user).toEqual({ id: 'user_wx_123' })
  })

  it('extracts userId from JWT cookie (SaaS flow)', async () => {
    const { signToken } = await import('../lib/jwt.js')
    const { authHook } = await import('../hooks/auth.js')
    const token = signToken({ userId: 'user_google_456', email: 'a@b.com' })
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.get('/test', (req, reply) => { reply.send({ user: (req as any).user }) })
    const res = await app.inject({ method: 'GET', url: '/test', headers: { cookie: `token=${token}` } })
    expect(res.json().user).toEqual({ id: 'user_google_456' })
  })

  it('extracts userId from request body (legacy WeChat flow)', async () => {
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.post('/test', (req, reply) => { reply.send({ user: (req as any).user }) })
    const res = await app.inject({ method: 'POST', url: '/test', payload: { userId: 'user_body_789' } })
    expect(res.json().user).toEqual({ id: 'user_body_789' })
  })

  it('extracts userId from query string (legacy WeChat GET flow)', async () => {
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.get('/test', (req, reply) => { reply.send({ user: (req as any).user }) })
    const res = await app.inject({ method: 'GET', url: '/test?userId=user_query_101' })
    expect(res.json().user).toEqual({ id: 'user_query_101' })
  })

  it('sets user to null when no auth provided', async () => {
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.get('/test', (req, reply) => { reply.send({ user: (req as any).user }) })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.json().user).toBeNull()
  })
})
