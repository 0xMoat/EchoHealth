'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/hooks/useT'
import GoogleLoginButton from '@/components/GoogleLoginButton'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const t = useT()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
          <p className="text-sm text-slate-500">{t.loading}</p>
        </div>
      </main>
    )
  }

  if (user) return null

  return (
    <main id="main-content" className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-800">
              {t.signInTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {t.signInSubtitle}
            </p>
          </div>

          <div className="flex justify-center">
            <GoogleLoginButton />
          </div>
        </div>

        {/* Subtle bottom text */}
        <p className="mt-6 text-center text-xs text-slate-500">
          {t.signInTerms}
        </p>
      </div>
    </main>
  )
}
