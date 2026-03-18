import Link from 'next/link'

export default function Footer() {
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
            <p className="mt-2 max-w-xs text-sm text-slate-500">
              AI-powered health report interpretation. Upload your checkup results and get a video explanation in minutes.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/upload" className="text-sm text-slate-600 transition-colors hover:text-slate-800">
                    Upload Report
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-slate-600 transition-colors hover:text-slate-800">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-sm text-slate-600 transition-colors hover:text-slate-800">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Trust + Copyright row */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Secure checkout
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Your data stays yours
            </span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} EchoHealth. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
