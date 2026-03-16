import type { ReportStatus } from '@/types'

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  PROCESSING: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800' },
}

export default function StatusBadge({ status }: { status: ReportStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
