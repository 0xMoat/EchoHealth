import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../db.js'

vi.mock('../db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), upsert: vi.fn() },
    report: { create: vi.fn(), findUnique: vi.fn() },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn() })),
}))

// Mock global fetch for WeChat API
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('POST /auth/login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns userId and isPro on successful WeChat login', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ openid: 'wx-openid-123' }),
    })
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'user-1',
      isPro: false,
    } as never)

    process.env.WX_APPID = 'test-appid'
    process.env.WX_SECRET = 'test-secret'

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { code: 'wx-code-abc', nickname: '张阿姨' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().userId).toBe('user-1')
    expect(res.json().isPro).toBe(false)
  })

  it('returns 500 when WeChat API returns an error code', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ errcode: 40029, errmsg: 'invalid code' }),
    })

    process.env.WX_APPID = 'test-appid'
    process.env.WX_SECRET = 'test-secret'

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { code: 'bad-code' },
    })

    expect(res.statusCode).toBe(500)
  })

  it('returns 400 when code is missing', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })
})
