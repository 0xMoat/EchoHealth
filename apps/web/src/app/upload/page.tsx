'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch, apiUpload, ApiError } from '@/lib/api'
import { LANGUAGE_OPTIONS, LIMITS } from '@/lib/constants'
import type { VideoLanguage } from '@/types'
import FileUploader from '@/components/FileUploader'

export default function UploadPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
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

  const handleSubmit = async () => {
    if (files.length === 0) return
    if (quotaRemaining <= 0) {
      setError('Monthly quota exhausted. Upgrade to Pro for more.')
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
        setError('Upload failed. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 text-balance">Upload Health Report</h1>
      <p className="mt-2 text-neutral-600">
        Upload images or a PDF of your health checkup report.
        {quotaRemaining > 0
          ? ` You have ${quotaRemaining} report${quotaRemaining === 1 ? '' : 's'} remaining this month.`
          : ''}
      </p>

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
          <legend className="text-sm font-medium text-neutral-900">Video Language</legend>
          <div className="mt-3 flex gap-3">
            {LANGUAGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value as VideoLanguage)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
                  language === opt.value
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
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
          className="w-full rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          {uploading ? 'Uploading\u2026' : 'Generate Video'}
        </button>
      </div>
    </main>
  )
}
