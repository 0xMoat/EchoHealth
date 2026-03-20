'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import FileUploader from '@/components/FileUploader'
import { apiFetch, apiUpload, ApiError } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { useT } from '@/hooks/useT'
import type { VideoLanguage } from '@/types'

export default function HeroUploader() {
  const { user } = useAuth()
  const router = useRouter()
  const t = useT()
  const [files, setFiles] = useState<File[]>([])
  const [language, setLanguage] = useState<VideoLanguage>('AUTO')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limits = user?.isPro ? LIMITS.pro : LIMITS.free
  const quotaRemaining = user ? limits.monthly - user.usedThisMonth : 1 
  const languageOptions: Array<{ value: VideoLanguage; label: string }> = [
    { value: 'AUTO', label: t.autoDetect },
    { value: 'EN', label: t.english },
    { value: 'ZH', label: t.chinese },
  ]

  const handleSubmit = async () => {
    if (files.length === 0) return
    if (!user) {
      router.push('/login')
      return
    }
    if (quotaRemaining <= 0) {
      setError(t.quotaExhausted || 'Monthly quota exhausted')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      const uploadResult = await apiUpload<{ urls: string[]; inputType: string }>(
        '/api/saas/upload',
        formData,
      )

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
        setError(t.uploadFailed || 'Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-4 w-full text-left">
      {user && quotaRemaining <= 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 px-6 py-10 text-center">
          <svg className="h-12 w-12 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <h3 className="mt-4 text-lg font-bold text-slate-800">{t.allFreeUsed}</h3>
          <p className="mt-2 text-sm text-slate-500 whitespace-pre-line">{t.upgradeToKeep}</p>
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
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl bg-white/60 p-2 sm:p-4 backdrop-blur-sm border border-white max-w-[100vw]">
          <FileUploader
            files={files}
            onChange={setFiles}
            maxFiles={limits.images}
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
            <fieldset>
              <legend className="text-sm font-medium text-slate-800 mb-2">{t.videoLanguage}</legend>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLanguage(opt.value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                      language === opt.value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 bg-white text-slate-700 hover:bg-neutral-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={files.length === 0 || uploading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t.loading || 'Uploading...'}
                </>
              ) : (
                <>
                  {t.generateVideo}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          <div aria-live="polite" className="px-1">
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
