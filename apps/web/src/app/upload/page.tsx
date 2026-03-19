'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch, apiUpload, ApiError } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { useT } from '@/hooks/useT'
import type { VideoLanguage } from '@/types'
import FileUploader from '@/components/FileUploader'

export default function UploadPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const t = useT()
  const [files, setFiles] = useState<File[]>([])
  const [language, setLanguage] = useState<VideoLanguage>('AUTO')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    )
  }

  const limits = user.isPro ? LIMITS.pro : LIMITS.free
  const quotaRemaining = limits.monthly - user.usedThisMonth
  const languageOptions: Array<{ value: VideoLanguage; label: string }> = [
    { value: 'AUTO', label: t.autoDetect },
    { value: 'EN', label: t.english },
    { value: 'ZH', label: t.chinese },
  ]

  const handleSubmit = async () => {
    if (files.length === 0) return
    if (quotaRemaining <= 0) {
      setError(t.quotaExhausted)
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Step 1: Upload files
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      const uploadResult = await apiUpload<{ urls: string[]; inputType: string }>(
        '/api/saas/upload',
        formData,
      )

      // Step 2: Create report
      const report = await apiFetch<{ reportId: string }>('/api/saas/reports', {
        method: 'POST',
        body: JSON.stringify({
          photoUrls: uploadResult.urls,
          language,
          inputType: uploadResult.inputType,
        }),
      })

      router.push(`/result/${report.reportId}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t.uploadFailed)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-800 text-balance">{t.uploadTitle}</h1>
      <p className="mt-2 text-slate-600">
        {t.uploadDesc}
        {quotaRemaining > 0
          ? ` ${(quotaRemaining === 1 ? t.reportsRemainingOne : t.reportsRemaining).replace('{n}', String(quotaRemaining))}`
          : ''}
      </p>

      {quotaRemaining <= 0 ? (
        /* ── Quota exhausted blocker ── */
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 px-8 py-12 text-center">
          <svg className="h-12 w-12 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <h2 className="mt-4 text-lg font-bold text-slate-800">{t.allFreeUsed}</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-500">{t.upgradeToKeep}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/pricing"
              className="rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {t.subscribeMonthly}
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              {t.buyPass}
            </Link>
          </div>
          {user.usageResetAt && (
            <p className="mt-4 text-xs text-slate-500">
              {t.resetsOn} {new Date(user.usageResetAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {' · '}
              <Link href="/pricing" className="text-blue-500 underline">{t.seePricing}</Link>
            </p>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* File upload */}
          <FileUploader
            files={files}
            onChange={setFiles}
            maxFiles={limits.images}
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />

          {/* Language selection */}
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">{t.videoLanguage}</legend>
            <div className="mt-3 flex gap-3">
              {languageOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
                    language === opt.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 text-slate-700 hover:bg-neutral-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Error */}
          <div aria-live="polite">
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={files.length === 0 || uploading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cyan-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
          >
            {uploading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.uploading}
              </>
            ) : t.generateVideo}
          </button>
        </div>
      )}
    </main>
  )
}
