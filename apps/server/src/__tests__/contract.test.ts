/**
 * API contract snapshot tests.
 *
 * These tests lock the exact response shape for each API endpoint.
 * If a field is renamed, removed, or retyped, the snapshot will fail —
 * forcing a deliberate review before merging.
 *
 * To update snapshots after an intentional API change:
 *   pnpm test -- --update-snapshots
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../db.js'
import { getQueue } from '../queue/index.js'

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    report: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn().mockResolvedValue({ id: 'job-1' }) })),
}))

// Fixed timestamps for deterministic snapshots
const FIXED_DATE = new Date('2026-01-15T08:00:00.000Z')

describe('API contract — POST /reports', () => {
  beforeEach(() => vi.clearAllMocks())

  it('201 response shape is stable', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      isPro: false,
      usedThisMonth: 0,
      usageResetAt: FIXED_DATE,
    } as never)
    vi.mocked(prisma.report.create).mockResolvedValue({
      id: 'report-abc123',
      status: 'PENDING',
    } as never)
    vi.mocked(getQueue).mockReturnValue({ add: vi.fn().mockResolvedValue({ id: 'job-1' }) } as never)

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/reports',
      payload: {
        userId: 'user-1',
        reportType: '综合体检',
        photoUrls: ['https://cos.example.com/photo.jpg'],
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchSnapshot()
  })
})

describe('API contract — GET /reports/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PENDING report response shape is stable', async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({
      id: 'report-1',
      type: 'BLOOD_ROUTINE',
      status: 'PENDING',
      errorMsg: null,
      video: null,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    } as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports/report-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchSnapshot()
  })

  it('PROCESSING report response shape is stable', async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({
      id: 'report-1',
      type: 'BLOOD_ROUTINE',
      status: 'PROCESSING',
      errorMsg: null,
      video: null,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    } as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports/report-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchSnapshot()
  })

  it('COMPLETED report response shape is stable', async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({
      id: 'report-2',
      type: 'PHYSICAL_EXAM',
      status: 'COMPLETED',
      errorMsg: null,
      video: {
        cosUrl: 'https://echohealth-1234.cos.ap-guangzhou.myqcloud.com/videos/report-2/output.mp4',
        duration: 26,
        createdAt: FIXED_DATE,
      },
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    } as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports/report-2' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchSnapshot()
  })

  it('FAILED report response shape is stable', async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({
      id: 'report-3',
      type: 'BIOCHEMISTRY',
      status: 'FAILED',
      errorMsg: 'edge-tts: command not found',
      video: null,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    } as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports/report-3' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchSnapshot()
  })
})

describe('API contract — GET /reports', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list response shape is stable', async () => {
    vi.mocked(prisma.report.findMany).mockResolvedValue([
      {
        id: 'r1',
        type: 'BLOOD_ROUTINE',
        status: 'COMPLETED',
        createdAt: FIXED_DATE,
        video: { cosUrl: 'https://echohealth-1234.cos.ap-guangzhou.myqcloud.com/videos/r1/output.mp4' },
      },
      {
        id: 'r2',
        type: 'PHYSICAL_EXAM',
        status: 'PENDING',
        createdAt: FIXED_DATE,
        video: null,
      },
    ] as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/reports?userId=user-1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchSnapshot()
  })
})
