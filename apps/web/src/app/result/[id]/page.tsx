'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import type { Report } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import VideoPlayer from '@/components/VideoPlayer'
import Link from 'next/link'

const POLL_INTERVAL = 5000

export default function ResultPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
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
      setError('Failed to load report')
      setLoading(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [id])

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
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
          <p className="text-sm text-slate-500">Loading&hellip;</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  if (error || !report) {
    return (
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="font-medium text-slate-800">{error || 'Report not found'}</p>
          <p className="mt-1 text-sm text-slate-500">
            The report could not be loaded. Please try again.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-[background-color] hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  // PENDING or PROCESSING -- animated waiting state
  if (report.status === 'PENDING' || report.status === 'PROCESSING') {
    const isPending = report.status === 'PENDING'

    return (
      <main className="relative mx-auto min-h-[calc(100vh-4rem)] max-w-2xl px-6 py-16">
        {/* Subtle dot grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative flex flex-col items-center text-center">
          {/* Animated concentric rings */}
          <div className="relative mb-10 h-36 w-36">
            <div className="absolute inset-0 animate-ping rounded-full border border-neutral-200 opacity-20" />
            <div className="absolute inset-3 animate-pulse rounded-full border border-neutral-200" />
            <div className="absolute inset-6 rounded-full border border-neutral-200/70" />
            <div className="absolute inset-9 rounded-full bg-neutral-100" />
            <div className="absolute inset-0 flex items-center justify-center">
              {isPending ? (
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              ) : (
                <svg className="h-8 w-8 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
              )}
            </div>
          </div>

          <StatusBadge status={report.status} />

          <h1 className="font-display mt-6 text-2xl font-bold tracking-tight text-slate-800">
            {isPending ? 'Waiting in Queue\u2026' : 'Generating Your Video\u2026'}
          </h1>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
            {isPending
              ? 'Your report is queued and will begin processing shortly. Sit tight.'
              : 'Our AI is analyzing your health report and creating a personalized video explanation.'}
          </p>

          <p className="mt-6 text-xs text-slate-400">
            This usually takes 1&ndash;3 minutes
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>

          <StatusBadge status={report.status} />

          <h1 className="font-display mt-4 text-xl font-bold text-slate-800">Video Generation Failed</h1>
          <p className="mt-2 text-sm text-slate-600">
            {report.errorMsg || 'Something went wrong while generating your video. Please try again.'}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-[background-color] hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              Try Again
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-[border-color,background-color] hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // COMPLETED state
  return (
    <main className="relative mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-6 py-12">
      {/* Subtle dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <StatusBadge status={report.status} />
              <span className="text-xs text-slate-400">
                {new Intl.DateTimeFormat(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(report.createdAt))}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-800">
              Your Video Report
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
              Download Video
            </a>
          )}
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-[border-color,background-color] hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload Another
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
