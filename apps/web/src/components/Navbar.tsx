'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Navbar() {
  const { user, loading, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const pathname = usePathname()

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  const LanguageSwitcher = () => (
    <div className="flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-0.5 text-xs">
      <button
        onClick={() => setLang('en')}
        aria-label="Switch to English"
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
          lang === 'en' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {t.langEN}
      </button>
      <button
        onClick={() => setLang('zh')}
        aria-label="切换到中文"
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
          lang === 'zh' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {t.langZH}
      </button>
    </div>
  )

  return (
    <nav ref={navRef} className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
          EchoHealth
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 sm:flex">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-neutral-200" />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
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
                className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          )}
          {/* Language switcher — always visible */}
          <LanguageSwitcher />
        </div>

        {/* Mobile: language + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <LanguageSwitcher />
          {!loading && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-neutral-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              {menuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="animate-slideUp border-t border-neutral-200 bg-white px-6 py-4 sm:hidden">
          {user ? (
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-neutral-50"
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-neutral-50"
              >
                New Report
              </Link>
              {user.isPro ? (
                <span className="inline-flex w-fit rounded-full bg-gradient-to-r from-orange-400 to-rose-500 px-3 py-1 text-xs font-semibold text-white">
                  {t.proBadge}
                </span>
              ) : (
                <Link
                  href="/pricing"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50"
                >
                  {t.upgradeProBtn}
                </Link>
              )}
              <button
                onClick={() => { logout(); setMenuOpen(false) }}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-neutral-50 hover:text-slate-700"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="block rounded-lg bg-cyan-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
