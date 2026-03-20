'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUploadModal } from '@/contexts/UploadModalContext'

type LanguageSwitcherProps = {
  lang: 'en' | 'zh'
  setLang: (lang: 'en' | 'zh') => void
}

function LanguageSwitcher({ lang, setLang }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  const options = [
    { value: 'en' as const, label: 'English' },
    { value: 'zh' as const, label: '简体中文' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm text-slate-500 transition-colors hover:bg-neutral-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
      >
        {/* Globe icon */}
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558" />
        </svg>
        {/* Chevron */}
        <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg shadow-neutral-900/8 animate-fadeInUp"
          style={{ animationDuration: '150ms' }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={lang === opt.value}
              onClick={() => {
                setLang(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                lang === opt.value
                  ? 'font-medium text-slate-800'
                  : 'text-slate-500 hover:bg-neutral-50 hover:text-slate-700'
              }`}
            >
              {/* Checkmark for selected */}
              <svg
                className={`h-4 w-4 shrink-0 ${lang === opt.value ? 'text-cyan-600' : 'text-transparent'}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, loading, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const { openModal } = useUploadModal()
  const [menuOpen, setMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

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

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav ref={navRef} className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Brand */}
        <Link
          href="/"
          onClick={closeMenu}
          className="font-display text-[1.45rem] leading-none tracking-[-0.02em] text-slate-900 transition-colors hover:text-slate-700"
        >
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
                onClick={closeMenu}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                {t.dashboard}
              </Link>
              <button
                onClick={() => { closeMenu(); openModal(); }}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
              >
                {t.newReport}
              </button>
              {/* Upgrade button for non-Pro users; Pro badge for Pro users */}
              {user.isPro ? (
                <span className="rounded-full bg-gradient-to-r from-orange-400 to-rose-500 px-3 py-1 text-xs font-semibold text-white">
                  {t.proBadge}
                </span>
              ) : (
                <Link
                  href="/pricing"
                  onClick={closeMenu}
                  className="rounded-full bg-gradient-to-r from-orange-400 to-rose-500 px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {t.upgradeProBtn}
                </Link>
              )}
              <button
                onClick={() => logout()}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                {t.signOut}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={closeMenu}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              {t.signIn}
            </Link>
          )}
          {/* Language switcher — always visible */}
          <LanguageSwitcher lang={lang} setLang={setLang} />
        </div>

        {/* Mobile: language + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <LanguageSwitcher lang={lang} setLang={setLang} />
          {!loading && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? t.closeMenu : t.openMenu}
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
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-neutral-50"
              >
                {t.dashboard}
              </Link>
              <button
                onClick={() => { closeMenu(); openModal(); }}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-neutral-50"
              >
                {t.newReport}
              </button>
              {user.isPro ? (
                <span className="inline-flex w-fit rounded-full bg-gradient-to-r from-orange-400 to-rose-500 px-3 py-1 text-xs font-semibold text-white">
                  {t.proBadge}
                </span>
              ) : (
                <Link
                  href="/pricing"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50"
                >
                  {t.upgradeProBtn}
                </Link>
              )}
              <button
                onClick={() => {
                  logout()
                  closeMenu()
                }}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-neutral-50 hover:text-slate-700"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={closeMenu}
              className="block rounded-lg bg-cyan-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              {t.signIn}
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
