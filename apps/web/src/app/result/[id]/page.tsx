'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { useT } from '@/hooks/useT'
import type { Report } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import VideoPlayer from '@/components/VideoPlayer'
import Link from 'next/link'

const POLL_INTERVAL = 5000

export default function ResultPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const t = useT()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  const fetchReport = useCallback(async () => {
    try {
      const data = await apiFetch<Report>(`/api/saas/reports/${id}`)
      setReport(data)
      setLoading(false)

      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch {
      setError(t.failedToLoad)
      setLoading(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [id, t.failedToLoad])

  useEffect(() => {
    if (!user) return
    fetchReport()
    timerRef.current = setInterval(fetchReport, POLL_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [user, fetchReport])

  if (authLoading || loading) {
    return (
      <main id="main-content" className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
          <p className="text-sm text-slate-500">{t.loading}</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  if (error || !report) {
    return (
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-slate-800">{error || t.reportNotFound}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t.reportLoadError}
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-[background-color] hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
          >
            {t.backToDashboard}
          </Link>
        </div>
      </main>
    )
  }

  // PENDING or PROCESSING -- animated waiting state
  if (report.status === 'PENDING' || report.status === 'PROCESSING') {
    const isPending = report.status === 'PENDING'

    return (
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-2xl px-6 py-16">
        <div className="flex flex-col items-center text-center">
          {/* Status indicator */}
          <div className="mb-8">
            {isPending ? (
              <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : (
              <svg className="h-10 w-10 animate-spin text-cyan-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>

          <StatusBadge status={report.status} />

          <h1 className="font-display mt-6 text-2xl font-bold tracking-tight text-slate-800">
            {isPending ? t.waitingInQueue : t.generatingVideo}
          </h1>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
            {isPending ? t.pendingDesc : t.processingDesc}
          </p>

          <p className="mt-6 text-xs text-slate-500">
            {t.usuallyTakes}
          </p>

          {/* Progress dots animation */}
          <div className="mt-8 flex items-center gap-2" role="status" aria-label="Processing">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-neutral-300"
                style={{
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        </div>
      </main>
    )
  }

  // FAILED state
  if (report.status === 'FAILED') {
    return (
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">

          <StatusBadge status={report.status} />

          <h1 className="font-display mt-4 text-xl font-bold text-slate-800">{t.videoGenFailed}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {report.errorMsg || t.videoGenError}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-[background-color] hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              {t.tryAgain}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-[border-color,background-color] hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              {t.backToDashboard}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // COMPLETED state
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-6 py-12">
      <div>
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <StatusBadge status={report.status} />
              <span className="text-xs text-slate-500">
                {new Intl.DateTimeFormat(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(report.createdAt))}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-800">
              {t.yourVideoReport}
            </h1>
          </div>
        </div>

        {/* Video */}
        {report.video?.cosUrl && (
          <VideoPlayer src={report.video.cosUrl} className="mb-8 aspect-video" />
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {report.video?.cosUrl && (
            <a
              href={report.video.cosUrl}
              download
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-[background-color] hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t.downloadVideo}
            </a>
          )}
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-[border-color,background-color] hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t.uploadAnother}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            {t.backToDashboard}
          </Link>
        </div>
      </div>
    </main>
  )
}
