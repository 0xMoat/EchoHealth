'use client'

import Link from 'next/link'
import { useT } from '@/hooks/useT'

export default function Footer() {
  const t = useT()

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Top row */}
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-600" />
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                EchoHealth
              </span>
            </div>
            <p className="mt-2 min-h-[3.75rem] max-w-xs text-sm text-slate-500">
              {t.footerTagline}
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.footerProduct}</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/upload" className="text-sm text-slate-600 transition-colors hover:text-slate-800">
                    {t.uploadReport}
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-slate-600 transition-colors hover:text-slate-800">
                    {t.pricing}
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-sm text-slate-600 transition-colors hover:text-slate-800">
                    {t.dashboard}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.footerLegal}</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-slate-600 transition-colors hover:text-slate-800">
                    {t.privacyPolicy}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-slate-600 transition-colors hover:text-slate-800">
                    {t.termsOfService}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Trust + Copyright row */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              {t.secureCheckoutBadge}
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              {t.dataPrivacy}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} EchoHealth. {t.allRightsReserved}
          </p>
        </div>
      </div>
    </footer>
  )
}
