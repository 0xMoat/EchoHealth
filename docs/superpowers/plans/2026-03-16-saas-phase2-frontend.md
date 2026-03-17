# EchoHealth SaaS Phase 2 — Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js web frontend (`apps/web`) that consumes the existing SaaS backend APIs, enabling users to sign in with Google, upload health reports, and view generated video results.

**Architecture:** Next.js App Router with server components by default, client components only where interactivity is needed (auth, upload, polling). API calls go to the Fastify backend (`/api/saas/*`) via a shared fetch wrapper that handles JWT cookies automatically. Auth state managed via React Context hydrated from `/api/saas/auth/me`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, `@react-oauth/google`, Vercel deployment

**Design skills:** Use `@web-design-guidelines` and `@frontend-design` skills when implementing UI components.

---

## File Structure

```
apps/web/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.local.example
├── public/
│   └── (static assets)
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout: fonts, providers, nav
│   │   ├── page.tsx                # Landing page (/)
│   │   ├── login/
│   │   │   └── page.tsx            # Google OAuth login (/login)
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Report list + quota (/dashboard)
│   │   ├── upload/
│   │   │   └── page.tsx            # File upload + language select (/upload)
│   │   └── result/
│   │       └── [id]/
│   │           └── page.tsx        # Poll status + video player (/result/[id])
│   ├── components/
│   │   ├── Navbar.tsx              # Top navigation bar
│   │   ├── Footer.tsx              # Site footer
│   │   ├── GoogleLoginButton.tsx   # Google OAuth button (client)
│   │   ├── FileUploader.tsx        # Drag-drop file uploader (client)
│   │   ├── ReportCard.tsx          # Report list item
│   │   ├── VideoPlayer.tsx         # Video playback component
│   │   ├── StatusBadge.tsx         # Report status indicator
│   │   └── QuotaBar.tsx            # Usage quota display
│   ├── lib/
│   │   ├── api.ts                  # Fetch wrapper (credentials: include)
│   │   └── constants.ts            # API base URL, limits, etc.
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth provider + useAuth hook
│   └── types/
│       └── index.ts                # Shared TypeScript types
```

---

## Chunk 1: Project Scaffolding & Infrastructure

### Task 1: Initialize Next.js project

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/.env.local.example`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/young/Downloads/repos/EchoHealth
pnpm create next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-pnpm
```

Accept defaults. This creates the base Next.js 15 project with App Router, TypeScript, Tailwind CSS, and ESLint.

- [ ] **Step 2: Clean up generated files**

Remove default boilerplate content from `src/app/page.tsx` and `src/app/layout.tsx`. Strip the default Next.js demo content, keep minimal shell.

Clean `src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main>
      <h1>EchoHealth</h1>
      <p>Health report video interpretation</p>
    </main>
  )
}
```

Clean `src/app/globals.css` — keep only Tailwind directives:
```css
@import "tailwindcss";
```

- [ ] **Step 3: Create `.env.local.example`**

```env
# Backend API URL
# Local dev: omit or set to http://localhost:3000 (next.config.ts rewrites proxy to this)
# Production (Vercel): set to the full backend URL, e.g. https://api.echohealth.example.com
NEXT_PUBLIC_API_URL=http://localhost:3000

# Google OAuth Client ID (same as backend GOOGLE_CLIENT_ID)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

- [ ] **Step 4: Update `next.config.ts` for API proxy (dev)**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/saas/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/saas/:path*`,
      },
    ]
  },
}

export default nextConfig
```

This proxies `/api/saas/*` requests to the Fastify backend during development, avoiding CORS issues. In production, the frontend will call the backend directly (configured via `NEXT_PUBLIC_API_URL`).

- [ ] **Step 5: Add root workspace script**

Modify `/Users/young/Downloads/repos/EchoHealth/package.json` — add `dev:web` script:

```json
"dev:web": "pnpm --filter web dev"
```

- [ ] **Step 6: Verify the app starts**

```bash
cd /Users/young/Downloads/repos/EchoHealth
pnpm dev:web
```

Expected: Next.js dev server starts on port 3001 (or next available). Visit `http://localhost:3001` and see "EchoHealth" heading.

- [ ] **Step 7: Commit**

```bash
git add apps/web/ package.json
git commit -m "feat(web): scaffold Next.js project with Tailwind CSS"
```

### Task 2: Shared types, API client, and constants

**Files:**
- Create: `apps/web/src/types/index.ts`
- Create: `apps/web/src/lib/constants.ts`
- Create: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Create shared types**

`apps/web/src/types/index.ts`:
```ts
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type VideoLanguage = 'AUTO' | 'EN' | 'ZH'
export type InputType = 'IMAGE' | 'PDF'

export interface User {
  id: string
  email: string | null
  nickname: string | null
  avatarUrl: string | null
  isPro: boolean
  usedThisMonth: number
  proExpireAt: string | null
}

export interface Video {
  id: string
  reportId: string
  cosUrl: string
  duration: number
  createdAt: string
}

export interface Report {
  id: string
  userId: string
  type: string
  photoUrls: string[]
  status: ReportStatus
  language: VideoLanguage
  inputType: InputType
  source: string
  errorMsg: string | null
  video: Video | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Create constants**

`apps/web/src/lib/constants.ts`:
```ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export const LIMITS = {
  free: { images: 3, pdfPages: 3, fileSize: 5, pdfSize: 10, monthly: 3 },
  pro: { images: 5, pdfPages: 5, fileSize: 10, pdfSize: 20, monthly: 30 },
} as const

export const LANGUAGE_OPTIONS = [
  { value: 'AUTO', label: 'Auto-detect' },
  { value: 'EN', label: 'English' },
  { value: 'ZH', label: '中文' },
] as const
```

- [ ] **Step 3: Create API fetch wrapper**

`apps/web/src/lib/api.ts`:
```ts
import { API_BASE } from './constants'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  return res.json()
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // No Content-Type header — browser sets multipart boundary automatically
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  return res.json()
}

export { ApiError }
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/types/ apps/web/src/lib/
git commit -m "feat(web): add shared types, constants, and API client"
```

### Task 3: Auth context and Google login

**Files:**
- Create: `apps/web/src/contexts/AuthContext.tsx`
- Create: `apps/web/src/components/GoogleLoginButton.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Install Google OAuth package**

```bash
cd /Users/young/Downloads/repos/EchoHealth
pnpm --filter web add @react-oauth/google
```

- [ ] **Step 2: Create AuthContext**

`apps/web/src/contexts/AuthContext.tsx`:
```tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { apiFetch } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<User>('/api/saas/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = async (idToken: string) => {
    await apiFetch<{ userId: string; isPro: boolean }>('/api/saas/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
    await refresh()
  }

  const logout = async () => {
    await apiFetch('/api/saas/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Create GoogleLoginButton component**

`apps/web/src/components/GoogleLoginButton.tsx`:
```tsx
'use client'

import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function GoogleLoginButton() {
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError('No credential received')
      return
    }
    try {
      await login(response.credential)
      router.push('/dashboard')
    } catch {
      setError('Login failed. Please try again.')
    }
  }

  return (
    <div>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError('Google login failed')}
        shape="rectangular"
        size="large"
        text="signin_with"
        width="300"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Update root layout with providers**

`apps/web/src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EchoHealth — AI Health Report Video Interpreter',
  description: 'Upload your health checkup report and get a personalized video explanation powered by AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

Create `apps/web/src/app/providers.tsx`:
```tsx
'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '@/contexts/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/contexts/ apps/web/src/components/GoogleLoginButton.tsx apps/web/src/app/layout.tsx apps/web/src/app/providers.tsx
git commit -m "feat(web): add auth context, Google OAuth login, and providers"
```

---

## Chunk 2: Shared Components & Navigation

### Task 4: Navbar component

**Files:**
- Create: `apps/web/src/components/Navbar.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Create Navbar**

Use `@web-design-guidelines` and `@frontend-design` skills.

`apps/web/src/components/Navbar.tsx`:
```tsx
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
                className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
              >
                New Report
              </Link>
              <button
                onClick={() => logout()}
                className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Add Navbar to root layout**

Update `apps/web/src/app/layout.tsx` to include `<Navbar />` inside `<Providers>`, before `{children}`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Navbar.tsx apps/web/src/app/layout.tsx
git commit -m "feat(web): add responsive navbar with auth state"
```

### Task 5: StatusBadge, QuotaBar, ReportCard components

**Files:**
- Create: `apps/web/src/components/StatusBadge.tsx`
- Create: `apps/web/src/components/QuotaBar.tsx`
- Create: `apps/web/src/components/ReportCard.tsx`

- [ ] **Step 1: Create StatusBadge**

`apps/web/src/components/StatusBadge.tsx`:
```tsx
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
```

- [ ] **Step 2: Create QuotaBar**

`apps/web/src/components/QuotaBar.tsx`:
```tsx
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
```

- [ ] **Step 3: Create ReportCard**

`apps/web/src/components/ReportCard.tsx`:
```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/StatusBadge.tsx apps/web/src/components/QuotaBar.tsx apps/web/src/components/ReportCard.tsx
git commit -m "feat(web): add StatusBadge, QuotaBar, and ReportCard components"
```

---

## Chunk 3: Pages — Landing, Login, Dashboard

### Task 6: Landing page

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/components/Footer.tsx`

- [ ] **Step 1: Create Footer**

Use `@frontend-design` skill.

`apps/web/src/components/Footer.tsx`:
```tsx
export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 py-8">
      <div className="mx-auto max-w-5xl px-6 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} EchoHealth. AI-powered health report interpretation.
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Build landing page**

Use `@web-design-guidelines` and `@frontend-design` skills.

`apps/web/src/app/page.tsx` — a conversion-focused landing page with:
- Hero section: headline + CTA
- How It Works: 3-step process (Upload → AI Analysis → Video)
- Feature highlights
- Final CTA

The page should be server-rendered (no `'use client'`). Link CTA buttons to `/login` for unauthenticated users, `/upload` for authenticated users (handle via client component wrapper if needed, or simply link to `/upload` and let the upload page redirect).

Structure:
```tsx
import Link from 'next/link'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-neutral-900">
            Your Health Report,<br />Explained in Video
          </h1>
          <p className="mt-6 text-lg text-neutral-600 max-w-2xl mx-auto">
            Upload your checkup report and get a personalized video explanation
            powered by AI — in English or Chinese.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/upload"
              className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Try it free
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              How it works
            </a>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20">
          <h2 className="text-center text-3xl font-bold text-neutral-900">How It Works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: 'Upload', desc: 'Take a photo or upload a PDF of your health checkup report.' },
              { step: '2', title: 'AI Analysis', desc: 'Our AI reads every indicator, detects abnormalities, and writes a clear explanation.' },
              { step: '3', title: 'Watch Video', desc: 'Get a narrated video walkthrough of your results — easy to understand and share.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">{item.title}</h3>
                <p className="mt-2 text-neutral-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
```

Note: The implementer should use `@frontend-design` skill to produce a more polished, distinctive design beyond this skeleton. This skeleton provides the content structure — the skill should elevate the visual design.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/components/Footer.tsx
git commit -m "feat(web): add landing page with hero and how-it-works sections"
```

### Task 7: Login page

**Files:**
- Create: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Create login page**

`apps/web/src/app/login/page.tsx`:
```tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import GoogleLoginButton from '@/components/GoogleLoginButton'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    )
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Sign in to EchoHealth</h1>
          <p className="mt-2 text-neutral-600">Get AI-powered health report video explanations</p>
        </div>
        <div className="flex justify-center">
          <GoogleLoginButton />
        </div>
        <p className="text-xs text-neutral-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/login/
git commit -m "feat(web): add login page with Google OAuth"
```

### Task 8: Dashboard page

**Files:**
- Create: `apps/web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard page**

`apps/web/src/app/dashboard/page.tsx`:
```tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { Report } from '@/types'
import ReportCard from '@/components/ReportCard'
import QuotaBar from '@/components/QuotaBar'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    apiFetch<Report[]>('/api/saas/reports?limit=20')
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoadingReports(false))
  }, [user])

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-neutral-600">
            Welcome back{user.nickname ? `, ${user.nickname}` : ''}
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          New Report
        </Link>
      </div>

      <div className="mt-8">
        <QuotaBar used={user.usedThisMonth} isPro={user.isPro} />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-900">Your Reports</h2>
        {loadingReports ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-neutral-500">No reports yet</p>
            <Link
              href="/upload"
              className="mt-4 inline-block text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
            >
              Upload your first report
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {reports.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/
git commit -m "feat(web): add dashboard page with report list and quota"
```

---

## Chunk 4: Upload Page & File Uploader

### Task 9: FileUploader component

**Files:**
- Create: `apps/web/src/components/FileUploader.tsx`

- [ ] **Step 1: Create FileUploader component**

A drag-and-drop file uploader that:
- Accepts images (JPEG, PNG, WebP) and PDFs
- Shows file previews
- Allows removal of files before upload
- Respects Free/Pro limits visually

`apps/web/src/components/FileUploader.tsx`:
```tsx
'use client'

import { useCallback, useState, type DragEvent } from 'react'

interface FileUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles: number
  accept: string
}

export default function FileUploader({ files, onChange, maxFiles, accept }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles)
      const combined = [...files, ...arr].slice(0, maxFiles)
      onChange(combined)
    },
    [files, onChange, maxFiles],
  )

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          dragOver
            ? 'border-neutral-900 bg-neutral-50'
            : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <input
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <svg className="h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.4 3.178A3.38 3.38 0 0118 15.75" />
        </svg>
        <p className="mt-3 text-sm text-neutral-600">
          Drag files here or <span className="font-medium text-neutral-900">browse</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Images (JPEG, PNG, WebP) or PDF · Max {maxFiles} files
        </p>
      </label>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{file.name}</p>
                <p className="text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-4 text-neutral-400 transition-colors hover:text-red-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/FileUploader.tsx
git commit -m "feat(web): add drag-and-drop FileUploader component"
```

### Task 10: Upload page

**Files:**
- Create: `apps/web/src/app/upload/page.tsx`

- [ ] **Step 1: Create upload page**

The upload page flow:
1. User selects files (images or PDF)
2. User selects video language (AUTO/EN/ZH)
3. User clicks "Generate Video"
4. Files are uploaded via `POST /api/saas/upload` (multipart)
5. Report is created via `POST /api/saas/reports` with returned URLs
6. Redirect to `/result/[id]`

`apps/web/src/app/upload/page.tsx`:
```tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch, apiUpload, ApiError } from '@/lib/api'
import { LANGUAGE_OPTIONS, LIMITS } from '@/lib/constants'
import type { VideoLanguage } from '@/types'
import FileUploader from '@/components/FileUploader'

export default function UploadPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [language, setLanguage] = useState<VideoLanguage>('AUTO')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    )
  }

  const limits = user.isPro ? LIMITS.pro : LIMITS.free
  const quotaRemaining = limits.monthly - user.usedThisMonth

  const handleSubmit = async () => {
    if (files.length === 0) return
    if (quotaRemaining <= 0) {
      setError('Monthly quota exhausted. Upgrade to Pro for more.')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Step 1: Upload files
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      const uploadResult = await apiUpload<{ urls: string[]; inputType: string }>(
        '/api/saas/upload',
        formData,
      )

      // Step 2: Create report
      const report = await apiFetch<{ reportId: string }>('/api/saas/reports', {
        method: 'POST',
        body: JSON.stringify({
          photoUrls: uploadResult.urls,
          language,
          inputType: uploadResult.inputType,
        }),
      })

      router.push(`/result/${report.reportId}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Upload failed. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Upload Health Report</h1>
      <p className="mt-2 text-neutral-600">
        Upload images or a PDF of your health checkup report.
        {quotaRemaining > 0
          ? ` You have ${quotaRemaining} report${quotaRemaining === 1 ? '' : 's'} remaining this month.`
          : ''}
      </p>

      <div className="mt-8 space-y-8">
        {/* File upload */}
        <FileUploader
          files={files}
          onChange={setFiles}
          maxFiles={limits.images}
          accept="image/jpeg,image/png,image/webp,application/pdf"
        />

        {/* Language selection */}
        <fieldset>
          <legend className="text-sm font-medium text-neutral-900">Video Language</legend>
          <div className="mt-3 flex gap-3">
            {LANGUAGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value as VideoLanguage)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  language === opt.value
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={files.length === 0 || uploading}
          className="w-full rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Generate Video'}
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/upload/
git commit -m "feat(web): add upload page with file selection and language choice"
```

---

## Chunk 5: Result Page & Video Player

### Task 11: VideoPlayer component

**Files:**
- Create: `apps/web/src/components/VideoPlayer.tsx`

- [ ] **Step 1: Create VideoPlayer**

`apps/web/src/components/VideoPlayer.tsx`:
```tsx
interface VideoPlayerProps {
  src: string
  className?: string
}

export default function VideoPlayer({ src, className = '' }: VideoPlayerProps) {
  return (
    <div className={`overflow-hidden rounded-xl bg-black ${className}`}>
      <video
        src={src}
        controls
        className="h-full w-full"
        controlsList="nodownload"
        playsInline
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/VideoPlayer.tsx
git commit -m "feat(web): add VideoPlayer component"
```

### Task 12: Result page with polling

**Files:**
- Create: `apps/web/src/app/result/[id]/page.tsx`

- [ ] **Step 1: Create result page**

The result page:
1. Fetches report by ID from `/api/saas/reports/:id`
2. If status is PENDING or PROCESSING, polls every 5 seconds
3. When COMPLETED, shows video player + download link
4. When FAILED, shows error message

`apps/web/src/app/result/[id]/page.tsx`:
```tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import type { Report } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import VideoPlayer from '@/components/VideoPlayer'

const POLL_INTERVAL = 5000

export default function ResultPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  const fetchReport = useCallback(async () => {
    try {
      const data = await apiFetch<Report>(`/api/saas/reports/${id}`)
      setReport(data)
      setLoading(false)

      // Stop polling when terminal state
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch {
      setError('Failed to load report')
      setLoading(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [id])

  useEffect(() => {
    if (!user) return
    fetchReport()
    timerRef.current = setInterval(fetchReport, POLL_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [user, fetchReport])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="text-red-600">{error || 'Report not found'}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Report Result</h1>
        <StatusBadge status={report.status} />
      </div>

      <div className="mt-8">
        {(report.status === 'PENDING' || report.status === 'PROCESSING') && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-3 border-neutral-200 border-t-neutral-900" />
            <p className="mt-6 text-lg font-medium text-neutral-900">
              {report.status === 'PENDING' ? 'Waiting in queue...' : 'Generating your video...'}
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              This usually takes 1-3 minutes. You can leave this page and come back later.
            </p>
          </div>
        )}

        {report.status === 'COMPLETED' && report.video && (
          <div className="space-y-6">
            <VideoPlayer src={report.video.cosUrl} />
            <div className="flex justify-center gap-4">
              <a
                href={report.video.cosUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Download Video
              </a>
              <button
                onClick={() => router.push('/upload')}
                className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}

        {report.status === 'FAILED' && (
          <div className="rounded-xl bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">
              Video generation failed
            </p>
            {report.errorMsg && (
              <p className="mt-2 text-sm text-red-600">{report.errorMsg}</p>
            )}
            <button
              onClick={() => router.push('/upload')}
              className="mt-4 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/result/ apps/web/src/components/VideoPlayer.tsx
git commit -m "feat(web): add result page with polling and video player"
```

---

## Chunk 6: Final Polish & Verification

### Task 13: TypeScript and build verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/web
pnpm tsc --noEmit
```

Expected: No type errors. Fix any issues found.

- [ ] **Step 2: Run Next.js build**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/web
pnpm build
```

Expected: Build succeeds. Fix any build errors.

- [ ] **Step 3: Manual smoke test**

Start both servers:
```bash
# Terminal 1: Backend
cd /Users/young/Downloads/repos/EchoHealth && pnpm dev:server

# Terminal 2: Frontend
cd /Users/young/Downloads/repos/EchoHealth && pnpm dev:web
```

Verify:
- [ ] Landing page loads at `http://localhost:3001`
- [ ] Navigation links work
- [ ] Login page shows Google button
- [ ] Dashboard redirects to login when not authenticated
- [ ] Upload page redirects to login when not authenticated

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(web): fix build issues and polish"
```

### Task 14: Update root package.json and docs

- [ ] **Step 1: Verify `dev:web` script exists in root package.json**

Already added in Task 1 Step 5. Verify it works:
```bash
cd /Users/young/Downloads/repos/EchoHealth
pnpm dev:web
```

- [ ] **Step 2: Commit any remaining changes**

```bash
git add .
git commit -m "chore: finalize Phase 2 frontend MVP setup"
```
