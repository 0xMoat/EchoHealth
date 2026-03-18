'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import GoogleLoginButton from '@/components/GoogleLoginButton'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

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
          <p className="text-sm text-slate-500">Loading&hellip;</p>
        </div>
      </main>
    )
  }

  if (user) return null

  return (
    <main id="main-content" className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      {/* Background texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            {/* Logo mark */}
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
            </div>

            <h1 className="font-display text-xl font-bold tracking-tight text-slate-800">
              Sign in to EchoHealth
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Get AI-powered video explanations of your health reports.
            </p>
          </div>

          <div className="flex justify-center">
            <GoogleLoginButton />
          </div>
        </div>

        {/* Subtle bottom text */}
        <p className="mt-6 text-center text-xs text-slate-400">
          By signing in, you agree to our terms of service.
        </p>
      </div>
    </main>
  )
}
