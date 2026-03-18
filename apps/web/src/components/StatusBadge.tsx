'use client'

import type { ReportStatus } from '@/types'
import { useT } from '@/hooks/useT'

const STATUS_CLASSES: Record<ReportStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

const STATUS_KEYS: Record<ReportStatus, 'statusPending' | 'statusProcessing' | 'statusCompleted' | 'statusFailed'> = {
  PENDING: 'statusPending',
  PROCESSING: 'statusProcessing',
  COMPLETED: 'statusCompleted',
  FAILED: 'statusFailed',
}

export default function StatusBadge({ status }: { status: ReportStatus }) {
  const t = useT()

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {t[STATUS_KEYS[status]]}
    </span>
  )
}
