'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import QuotaBar from '@/components/QuotaBar'
import ReportCard from '@/components/ReportCard'
import type { Report } from '@/types'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function fetchReports() {
      try {
        const data = await apiFetch<Report[]>('/api/saas/reports?limit=20')
        if (!cancelled) setReports(data)
      } catch {
        if (!cancelled) setReports([])
      } finally {
        if (!cancelled) setReportsLoading(false)
      }
    }

    fetchReports()
    return () => { cancelled = true }
  }, [user])

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
          <p className="text-sm text-neutral-500">Loading&hellip;</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            {user.nickname || 'Your Dashboard'}
          </h1>
        </div>
        <Link
          href="/upload"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-[background-color] hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Report
        </Link>
      </div>

      {/* Quota */}
      <div className="mb-10 rounded-xl border border-neutral-200 bg-white p-5">
        <QuotaBar used={user.usedThisMonth} isPro={user.isPro} />
      </div>

      {/* Reports Section */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Your Reports</h2>
          {!reportsLoading && reports.length > 0 && (
            <span className="text-sm text-neutral-500">
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {reportsLoading ? (
          /* Loading skeletons */
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-neutral-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-32 rounded bg-neutral-200" />
                    <div className="h-4 w-20 rounded bg-neutral-100" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
              <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <p className="font-medium text-neutral-700">No reports yet</p>
            <p className="mt-1 text-sm text-neutral-500">
              Upload your first health report to get started.
            </p>
            <Link
              href="/upload"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-[background-color] hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              Upload Report
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        ) : (
          /* Report list */
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
