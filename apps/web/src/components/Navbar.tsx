'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function Navbar() {
  const { user, loading, logout } = useAuth()

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900">
          EchoHealth
        </Link>

        <div className="flex items-center gap-4">
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
        </div>
      </div>
    </nav>
  )
}
