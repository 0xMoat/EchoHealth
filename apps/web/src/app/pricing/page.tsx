'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/hooks/useT'
import { apiFetch } from '@/lib/api'
import { PRO_MONTHLY_PRICE, PASS_PRICE, PASS_DAYS } from '@/lib/constants'

export default function PricingPage() {
  const { user } = useAuth()
  const t = useT()
  const [loading, setLoading] = useState<'monthly' | 'pass' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (plan: 'monthly' | 'pass') => {
    if (!user) {
      window.location.href = '/login'
      return
    }
    setLoading(plan)
    setError(null)
    try {
      const { checkoutUrl } = await apiFetch<{ checkoutUrl: string }>('/api/saas/creem/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      })
      window.location.href = checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout. Please try again.')
      setLoading(null)
    }
  }

  const isProUser = user?.isPro

  return (
    <main
      id="main-content"
      className="min-h-screen px-6 py-16"
    >
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[3px] text-rose-500">
            {t.pricingTagline}
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-800">
            {t.pricingTitle}
          </h1>
          <p className="mt-3 text-slate-500">{t.pricingSubtitle}</p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Free */}
          <div className="flex animate-fadeInUp" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-1 flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.freePlan}</p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-slate-800">$0</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t.forever}</p>

            <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CheckIcon />{t.free3Reports}</li>
              <li className="flex items-center gap-2"><CheckIcon />{t.freeImagesAndPdf}</li>
              <li className="flex items-center gap-2"><CheckIcon />{t.freeAutoLang}</li>
              <li className="flex items-center gap-2 opacity-40"><XIcon />{t.freeVideoHistory}</li>
              <li className="flex items-center gap-2 opacity-40"><XIcon />{t.freeQueue}</li>
            </ul>

            <div className="mt-6 rounded-lg bg-neutral-100 py-2.5 text-center text-sm font-semibold text-slate-500">
              {isProUser ? t.freePlan : t.currentPlan}
            </div>
          </div>
          </div>

          {/* Pro Monthly */}
          <div className="flex animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div
            className="relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-red-400 to-orange-600 p-6 shadow-lg"
          >
            {/* POPULAR badge */}
            <span className="absolute right-4 top-4 rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-bold text-white">
              {t.popular}
            </span>

            <p className="text-xs font-bold uppercase tracking-widest text-white/80">{t.proPlan}</p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">${PRO_MONTHLY_PRICE}</span>
              <span className="text-sm text-white/70">/mo</span>
            </div>
            <p className="mt-1 text-xs text-white/70">{t.cancelAnytime}</p>

            <ul className="mt-6 flex-1 space-y-2 text-sm text-white/90">
              <li className="flex items-center gap-2"><CheckIconWhite />{t.pro30Reports}</li>
              <li className="flex items-center gap-2"><CheckIconWhite />{t.pro10Images}</li>
              <li className="flex items-center gap-2"><CheckIconWhite />{t.proPdf20}</li>
              <li className="flex items-center gap-2"><CheckIconWhite />{t.proVideoHistory}</li>
              <li className="flex items-center gap-2"><CheckIconWhite /><strong>{t.proPriority}</strong></li>
            </ul>

            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={!!loading || isProUser}
              className="mt-6 w-full rounded-xl bg-white/25 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === 'monthly' ? '…' : isProUser ? t.currentPlan : t.subscribeNow}
            </button>
          </div>
          </div>

          {/* 30-Day Pass */}
          <div className="flex animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          <div className="flex flex-1 flex-col rounded-2xl border-2 border-amber-300 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">{t.passTitle}</p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-slate-800">${PASS_PRICE}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t.oneTime}</p>

            <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CheckIcon />{t.passAllPro}</li>
              <li className="flex items-center gap-2"><CheckIcon />{t.pass30Reports}</li>
              <li className="flex items-center gap-2"><CheckIcon />{t.passExamSeason}</li>
              <li className="flex items-center gap-2"><CheckIcon />{t.passNoSub}</li>
              <li className="flex items-center gap-2"><CheckIcon />{t.passInstant}</li>
            </ul>

            <button
              onClick={() => handleUpgrade('pass')}
              disabled={!!loading || isProUser}
              className="mt-6 w-full rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === 'pass' ? '…' : isProUser ? t.currentPlan : t.buyPassBtn}
            </button>
          </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-6 text-center text-sm text-red-600">{error}</p>
        )}

        {/* Trust footer */}
        <p className="mt-10 text-center text-xs text-slate-500">{t.secureCheckout}</p>
      </div>
    </main>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function CheckIconWhite() {
  return (
    <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
