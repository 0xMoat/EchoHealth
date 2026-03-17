'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Navbar() {
  const { user, loading, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900">
          EchoHealth
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-neutral-200" />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                New Report
              </Link>
              {/* Upgrade button for non-Pro users; Pro badge for Pro users */}
              {user.isPro ? (
                <span className="rounded-full bg-gradient-to-r from-orange-400 to-rose-500 px-3 py-1 text-xs font-semibold text-white">
                  {t.proBadge}
                </span>
              ) : (
                <Link
                  href="/pricing"
                  className="rounded-full bg-gradient-to-r from-orange-400 to-rose-500 px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {t.upgradeProBtn}
                </Link>
              )}
              <button
                onClick={() => logout()}
                className="rounded-md px-2 py-1 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          )}
          {/* Language switcher — always visible */}
          <div className="flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-0.5 text-xs">
            <button
              onClick={() => setLang('en')}
              className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                lang === 'en' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t.langEN}
            </button>
            <button
              onClick={() => setLang('zh')}
              className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                lang === 'zh' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t.langZH}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
