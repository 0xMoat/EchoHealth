import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../db.js'
import { getQueue } from '../queue/index.js'

// vi.mock factories MUST NOT reference outer variables (hoisting).
// Use vi.fn() inline; access via vi.mocked() in tests.

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    report: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn().mockResolvedValue({ id: 'job-1' }) })),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /reports', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 201 and reportId on valid input', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      isPro: false,
      usedThisMonth: 0,
      usageResetAt: new Date(),
    } as never)
    vi.mocked(prisma.report.create).mockResolvedValue({ id: 'report-1', status: 'PENDING' } as never)
    const mockAdd = vi.fn().mockResolvedValue({ id: 'job-1' })
    vi.mocked(getQueue).mockReturnValue({ add: mockAdd } as never)

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/reports',
      payload: {
        userId: 'user-1',
        reportType: '血常规',
        photoUrls: ['https://cos.example.com/photo.jpg'],
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().reportId).toBe('report-1')
    expect(res.json().status).toBe('PENDING')
    expect(mockAdd).toHaveBeenCalledWith(
      'generate',
      { reportId: 'report-1' },
      expect.objectContaining({ attempts: 3 }),
    )
  })

  it('returns 404 when user does not exist', async () => {
    // quota middleware finds null → returns 404 before route handler runs
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/reports',
      payload: { userId: 'ghost', reportType: '血常规', photoUrls: ['https://x.com/a.jpg'] },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().error).toMatch(/User not found/)
  })

  it('returns 400 on invalid body (missing photoUrls)', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/reports',
      payload: { userId: 'user-1', reportType: '血常规' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /reports/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns report status for a PROCESSING report', async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({
      id: 'report-1',
      type: 'BLOOD_ROUTINE',
      status: 'PROCESSING',
      errorMsg: null,
      video: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    } as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports/report-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('PROCESSING')
    expect(res.json().video).toBeUndefined()
  })

  it('returns video URL for a COMPLETED report', async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({
      id: 'report-2',
      type: 'BLOOD_ROUTINE',
      status: 'COMPLETED',
      errorMsg: null,
      video: {
        cosUrl: 'https://cos.example.com/videos/report-2/123.mp4',
        duration: 26,
        createdAt: new Date('2025-01-01'),
      },
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    } as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports/report-2' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('COMPLETED')
    expect(body.video.url).toContain('report-2')
    expect(body.video.durationSec).toBe(26)
  })

  it('returns 404 for unknown report', async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue(null)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports/unknown' })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /reports', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns list of reports for a user', async () => {
    vi.mocked(prisma.report.findMany).mockResolvedValue([
      {
        id: 'r1',
        type: 'BLOOD_ROUTINE',
        status: 'COMPLETED',
        createdAt: new Date('2025-01-01'),
        video: { cosUrl: 'https://cos.example.com/v.mp4' },
      },
      {
        id: 'r2',
        type: 'PHYSICAL_EXAM',
        status: 'PENDING',
        createdAt: new Date('2025-01-02'),
        video: null,
      },
    ] as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports?userId=user-1' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(2)
    expect(body[0].id).toBe('r1')
    expect(body[0].videoUrl).toContain('v.mp4')
    expect(body[1].videoUrl).toBeUndefined()
  })
})
