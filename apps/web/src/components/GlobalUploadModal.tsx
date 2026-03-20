'use client'

import { useUploadModal } from '@/contexts/UploadModalContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiFetch, apiUpload, ApiError } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { useT } from '@/hooks/useT'
import type { VideoLanguage } from '@/types'
import FileUploader from '@/components/FileUploader'
import Link from 'next/link'

export default function GlobalUploadModal() {
  const { isOpen, closeModal } = useUploadModal()
  const { user, loading } = useAuth()
  const router = useRouter()
  const t = useT()
  const [files, setFiles] = useState<File[]>([])
  const [language, setLanguage] = useState<VideoLanguage>('AUTO')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setFiles([])
      setLanguage('AUTO')
      setError(null)
      setUploading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const limits = user?.isPro ? LIMITS.pro : LIMITS.free
  const quotaRemaining = user ? limits.monthly - user.usedThisMonth : 1 // Free anon pass equivalent
  const languageOptions: Array<{ value: VideoLanguage; label: string }> = [
    { value: 'AUTO', label: t.autoDetect },
    { value: 'EN', label: t.english },
    { value: 'ZH', label: t.chinese },
  ]

  const handleSubmit = async () => {
    if (files.length === 0) return
    if (!user) {
      // Direct unauthorized users to login, keeping the modal closed
      closeModal()
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

      closeModal()
      router.push(`/result/${report.reportId}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t.uploadFailed || 'Upload failed. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !uploading) {
      closeModal()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 opacity-100"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fadeInUp" style={{ animationDuration: '200ms' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 shrink-0">
          <h2 className="font-display text-lg font-bold text-slate-800">{t.uploadReport || 'Upload Report'}</h2>
          <button 
            type="button" 
            onClick={closeModal}
            disabled={uploading}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none disabled:opacity-50 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-6 overflow-y-auto">
          {user && quotaRemaining <= 0 ? (
            /* ── Quota exhausted blocker ── */
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 px-6 py-10 text-center">
              <svg className="h-12 w-12 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <h3 className="mt-4 text-lg font-bold text-slate-800">{t.allFreeUsed}</h3>
              <p className="mt-2 text-sm text-slate-500 whitespace-pre-line">{t.upgradeToKeep}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/pricing"
                  onClick={closeModal}
                  className="rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  {t.subscribeMonthly}
                </Link>
                <Link
                  href="/pricing"
                  onClick={closeModal}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                >
                  {t.buyPass}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6 flex flex-col items-center">
              <div className="w-full">
                <FileUploader
                  files={files}
                  onChange={setFiles}
                  maxFiles={limits.images}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                />
              </div>

              <div className="w-full">
                <fieldset>
                  <legend className="text-sm font-medium text-slate-800">{t.videoLanguage || 'Language'}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
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
              </div>

              {/* Error */}
              <div aria-live="polite" className="w-full">
                {error && (
                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(!user || quotaRemaining > 0) && (
          <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 shrink-0 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {files.length > 0 ? `${files.length} file(s) selected` : ''}
            </span>
            <button
              onClick={handleSubmit}
              disabled={files.length === 0 || uploading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              {uploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.loading || 'Uploading...'}
                </>
              ) : t.generateVideo || 'Generate Video'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
