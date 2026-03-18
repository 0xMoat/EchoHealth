'use client'

import Link from 'next/link'
import { LIMITS } from '@/lib/constants'
import { useT } from '@/hooks/useT'

interface QuotaBarProps {
  used: number
  isPro: boolean
}

export default function QuotaBar({ used, isPro }: QuotaBarProps) {
  const t = useT()
  const max = isPro ? LIMITS.pro.monthly : LIMITS.free.monthly
  const pct = Math.min((used / max) * 100, 100)
  const isAtLimit = !isPro && used >= max

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm text-slate-600">
        <span>Monthly usage</span>
        <span className={`tabular-nums ${isAtLimit ? 'font-semibold text-red-500' : ''}`}>
          {used}&nbsp;/&nbsp;{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${isAtLimit ? 'bg-red-500' : 'bg-cyan-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isAtLimit && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-200 bg-gradient-to-r from-orange-50 to-rose-50 px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-slate-800">{t.freeLimit}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t.upgradeToHelp}</p>
          </div>
          <Link
            href="/pricing"
            className="ml-3 shrink-0 rounded-lg bg-gradient-to-r from-orange-400 to-rose-500 px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            {t.upgrade}
          </Link>
        </div>
      )}
    </div>
  )
}
