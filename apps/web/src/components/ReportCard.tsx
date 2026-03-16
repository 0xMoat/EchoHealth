import Link from 'next/link'
import type { Report } from '@/types'
import StatusBadge from './StatusBadge'

export default function ReportCard({ report }: { report: Report }) {
  const date = new Date(report.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/result/${report.id}`}
      className="group block rounded-xl border border-neutral-200 p-5 transition-all hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-medium text-neutral-900 group-hover:text-neutral-700">
            {report.type === 'GENERAL' ? 'Health Report' : report.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </p>
          <p className="text-sm text-neutral-500">{date}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>
      {report.status === 'COMPLETED' && report.video && (
        <p className="mt-3 text-sm text-neutral-500">
          Video ready · {Math.round(report.video.duration)}s
        </p>
      )}
      {report.status === 'FAILED' && report.errorMsg && (
        <p className="mt-3 text-sm text-red-600 line-clamp-1">{report.errorMsg}</p>
      )}
    </Link>
  )
}
