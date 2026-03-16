import { LIMITS } from '@/lib/constants'

interface QuotaBarProps {
  used: number
  isPro: boolean
}

export default function QuotaBar({ used, isPro }: QuotaBarProps) {
  const max = isPro ? LIMITS.pro.monthly : LIMITS.free.monthly
  const pct = Math.min((used / max) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-neutral-600">
        <span>Monthly usage</span>
        <span>{used} / {max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
