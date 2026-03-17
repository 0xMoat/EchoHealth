# Creem Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Creem payment (monthly $4.99 + one-time $7.99/30d) and add bilingual Pro upgrade UI across the EchoHealth web app.

**Architecture:** Backend adds `POST /api/saas/creem/checkout` (creates Creem checkout session) and `POST /api/saas/creem/webhook` (processes payment events, updates `User.isPro`). Frontend adds `/pricing` page, Navbar upgrade button, QuotaBar CTA, upload-page blocker, and a lightweight i18n context (EN/ZH). Creem's hosted checkout page handles all payment UI.

**Tech Stack:** Fastify 5, Prisma 7, `@fastify/rawbody` (new), Next.js 16, React 19, Tailwind CSS 4, Creem REST API (direct fetch, no SDK).

---

## File Map

### Backend (`apps/server/`)
| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/creem.ts` | Create | Creem API wrapper: createCheckout, verifyWebhookSignature, constants |
| `src/routes/saas/creem.ts` | Create | POST /checkout, POST /webhook routes |
| `src/app.ts` | Modify | Register @fastify/rawbody + creem routes |
| `src/routes/saas/auth.ts` | Modify | Add `usageResetAt` to /auth/me select |
| `prisma/schema.prisma` | Modify | Add `creemOrderId String? @unique` to Order |

### Frontend (`apps/web/`)
| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | Add `usageResetAt` to User type |
| `src/lib/constants.ts` | Modify | Update pro limits, add price constants |
| `src/contexts/LanguageContext.tsx` | Create | Browser language detection + localStorage, EN/ZH switcher |
| `src/lib/translations/en.ts` | Create | English strings for payment UI |
| `src/lib/translations/zh.ts` | Create | Chinese strings for payment UI |
| `src/hooks/useT.ts` | Create | Translation hook |
| `src/components/Navbar.tsx` | Modify | Upgrade button + language switcher |
| `src/components/QuotaBar.tsx` | Modify | Upgrade CTA when quota exhausted |
| `src/app/pricing/page.tsx` | Create | Full pricing page (warm emotional style) |
| `src/app/upload/page.tsx` | Modify | Replace upload area with blocker when quota=0 |
| `src/app/dashboard/page.tsx` | Modify | Poll isPro on ?upgraded=true, show toast |

---

## Task 0: Creem Account Setup (Browser)

**Prerequisite for all tasks** — configure Creem dashboard, get env vars.

- [ ] **Step 1: Navigate to Creem dashboard and create two products**

  Open `https://www.creem.io` in browser, log in, then:
  - Create product 1: Name = "EchoHealth Pro Monthly", Price = $4.99/month (recurring)
  - Create product 2: Name = "EchoHealth 30-Day Pass", Price = $7.99 (one-time)
  - Copy both Product IDs

- [ ] **Step 2: Get API key and create webhook endpoint**

  In Creem dashboard:
  - API Keys → copy `sk_live_xxx` (or `sk_test_xxx` for testing)
  - Webhooks → Add endpoint: `https://<your-domain>/api/saas/creem/webhook`
  - Subscribe to events: `checkout.completed`, `subscription.active`, `subscription.renewed`, `subscription.cancelled`
  - Copy webhook signing secret `whsec_xxx`

- [ ] **Step 3: Add env vars to server**

  Add to `/home/ubuntu/echohealth/apps/server/.env` on Oracle Cloud:
  ```
  CREEM_API_KEY=sk_live_xxx
  CREEM_WEBHOOK_SECRET=whsec_xxx
  CREEM_PRODUCT_MONTHLY=prod_xxx
  CREEM_PRODUCT_PASS=prod_xxx
  WEB_BASE_URL=https://echohealth.example.com
  ```
  Also add to local `.env` for development.

---

## Task 1: Database Migration

**Files:** `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add creemOrderId to Order model**

  In `prisma/schema.prisma`, update the Order model:
  ```prisma
  model Order {
    id            String      @id @default(cuid())
    userId        String
    user          User        @relation(fields: [userId], references: [id])
    amount        Int
    status        OrderStatus @default(PENDING)
    wxPayOrderId  String?     @unique
    creemOrderId  String?     @unique
    paidAt        DateTime?
    createdAt     DateTime    @default(now())
    updatedAt     DateTime    @updatedAt

    @@index([userId])
  }
  ```

- [ ] **Step 2: Run migration locally**

  ```bash
  cd apps/server
  pnpm prisma migrate dev --name add_creem_order_id
  ```
  Expected: Migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/server/prisma/
  git commit -m "feat(db): add creemOrderId to Order for idempotent webhook handling"
  ```

---

## Task 2: Creem API Library

**Files:** Create `apps/server/src/lib/creem.ts`

- [ ] **Step 1: Install @fastify/rawbody**

  ```bash
  cd apps/server
  pnpm add @fastify/rawbody
  ```

- [ ] **Step 2: Create lib/creem.ts**

  ```typescript
  // apps/server/src/lib/creem.ts
  import crypto from 'crypto'

  const CREEM_API_BASE = 'https://api.creem.io/v1'

  export const CREEM_PLANS = {
    monthly: process.env.CREEM_PRODUCT_MONTHLY ?? '',
    pass: process.env.CREEM_PRODUCT_PASS ?? '',
  } as const

  export type CreemPlan = keyof typeof CREEM_PLANS

  export async function createCheckout(
    plan: CreemPlan,
    userId: string,
    userEmail: string,
  ): Promise<string> {
    const apiKey = process.env.CREEM_API_KEY
    if (!apiKey) throw new Error('CREEM_API_KEY not set')

    const webBase = process.env.WEB_BASE_URL ?? 'http://localhost:3000'
    const productId = CREEM_PLANS[plan]
    if (!productId) throw new Error(`CREEM_PRODUCT_${plan.toUpperCase()} not set`)

    const res = await fetch(`${CREEM_API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: `${webBase}/dashboard?upgraded=true`,
        cancel_url: `${webBase}/pricing`,
        customer_email: userEmail,
        metadata: { userId, plan },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Creem checkout failed: ${res.status} ${text}`)
    }

    const data = (await res.json()) as { checkout_url?: string; url?: string }
    const url = data.checkout_url ?? data.url
    if (!url) throw new Error('Creem returned no checkout URL')
    return url
  }

  export function verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string,
    secret: string,
  ): boolean {
    try {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')
      // Creem sends "sha256=<hex>" or just "<hex>"
      const received = signatureHeader.startsWith('sha256=')
        ? signatureHeader.slice(7)
        : signatureHeader
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
    } catch {
      return false
    }
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add apps/server/src/lib/creem.ts apps/server/package.json apps/server/pnpm-lock.yaml
  git commit -m "feat(server): add Creem API library (checkout + webhook sig verification)"
  ```

---

## Task 3: Creem Routes

**Files:** Create `apps/server/src/routes/saas/creem.ts`

- [ ] **Step 1: Create creem routes file**

  ```typescript
  // apps/server/src/routes/saas/creem.ts
  import { FastifyInstance } from 'fastify'
  import { prisma } from '../../db.js'
  import { createCheckout, verifyWebhookSignature, type CreemPlan } from '../../lib/creem.js'

  export default async function creemRoutes(app: FastifyInstance) {
    // POST /api/saas/creem/checkout — requires auth
    app.post('/creem/checkout', async (request, reply) => {
      if (!request.user) return reply.status(401).send({ error: 'Not authenticated' })

      const { plan } = request.body as { plan?: string }
      if (plan !== 'monthly' && plan !== 'pass') {
        return reply.status(400).send({ error: 'plan must be "monthly" or "pass"' })
      }

      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { email: true },
      })
      if (!user?.email) return reply.status(400).send({ error: 'User email not found' })

      const checkoutUrl = await createCheckout(plan as CreemPlan, request.user.id, user.email)
      return { checkoutUrl }
    })

    // POST /api/saas/creem/webhook — no auth, raw body required for sig verification
    app.post('/creem/webhook', { config: { rawBody: true } }, async (request, reply) => {
      const secret = process.env.CREEM_WEBHOOK_SECRET
      if (!secret) return reply.status(500).send({ error: 'Webhook secret not configured' })

      const signature = request.headers['creem-signature'] as string | undefined
      if (!signature) return reply.status(400).send({ error: 'Missing creem-signature header' })

      const rawBody = (request as any).rawBody as Buffer
      if (!verifyWebhookSignature(rawBody, signature, secret)) {
        return reply.status(400).send({ error: 'Invalid signature' })
      }

      const event = request.body as {
        type: string
        data: Record<string, any>
      }

      try {
        await handleWebhookEvent(event.type, event.data)
      } catch (err) {
        app.log.error({ err, eventType: event.type }, 'Webhook handler error')
        return reply.status(500).send({ error: 'Webhook processing failed' })
      }

      return { received: true }
    })
  }

  async function handleWebhookEvent(type: string, data: Record<string, any>) {
    if (type === 'checkout.completed') {
      // One-time pass payment
      const userId = data.metadata?.userId as string | undefined
      const creemOrderId = (data.id ?? data.checkout_id) as string | undefined
      if (!userId || !creemOrderId) return

      const expireAt = new Date()
      expireAt.setDate(expireAt.getDate() + 30)

      await prisma.$transaction([
        prisma.order.upsert({
          where: { creemOrderId },
          create: {
            userId,
            amount: 799, // cents
            status: 'PAID',
            creemOrderId,
            paidAt: new Date(),
          },
          update: { status: 'PAID', paidAt: new Date() },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isPro: true, proExpireAt: expireAt },
        }),
      ])
      return
    }

    if (type === 'subscription.active' || type === 'subscription.renewed') {
      const userId = data.metadata?.userId as string | undefined
      const creemSubscriptionId = (data.id ?? data.subscription_id) as string | undefined
      if (!userId || !creemSubscriptionId) return

      const periodEnd = data.current_period_end
        ? new Date(data.current_period_end * 1000)
        : new Date(Date.now() + 32 * 24 * 60 * 60 * 1000) // fallback: +32 days

      const periodStart = data.current_period_start
        ? new Date(data.current_period_start * 1000)
        : new Date()

      await prisma.$transaction([
        prisma.subscription.upsert({
          where: { creemSubscriptionId },
          create: {
            userId,
            provider: 'CREEM',
            creemSubscriptionId,
            status: 'ACTIVE',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
          update: {
            status: 'ACTIVE',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isPro: true, proExpireAt: periodEnd },
        }),
      ])
      return
    }

    if (type === 'subscription.cancelled') {
      const creemSubscriptionId = (data.id ?? data.subscription_id) as string | undefined
      if (!creemSubscriptionId) return

      await prisma.subscription.updateMany({
        where: { creemSubscriptionId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
      // isPro stays true until proExpireAt — quota middleware handles downgrade
      return
    }

    if (type === 'subscription.expired') {
      const creemSubscriptionId = (data.id ?? data.subscription_id) as string | undefined
      if (creemSubscriptionId) {
        await prisma.subscription.updateMany({
          where: { creemSubscriptionId },
          data: { status: 'EXPIRED' },
        })
      }
      // Actual isPro downgrade handled by quota.ts middleware on next request
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/server/src/routes/saas/creem.ts
  git commit -m "feat(server): add Creem checkout and webhook routes"
  ```

---

## Task 4: Register Routes in app.ts

**Files:** Modify `apps/server/src/app.ts`

- [ ] **Step 1: Register @fastify/rawbody and creem routes**

  Add import at top of `app.ts`:
  ```typescript
  import rawBody from '@fastify/rawbody'
  import creemRoutes from './routes/saas/creem.js'
  ```

  Register rawbody plugin early (before other routes), and add creem routes:
  ```typescript
  // After the cors and rate-limit registrations, before other routes:
  await app.register(rawBody)

  // After saasReportRoutes registration:
  await app.register(creemRoutes, { prefix: '/api/saas' })
  ```

  **Important:** The webhook route skips the CSRF origin check because it comes from Creem servers, not a browser. **REPLACE** the existing CSRF preHandler (lines 35-42 in app.ts) with this updated version — do NOT add a second hook:
  ```typescript
  // REPLACE the existing preHandler at lines 35-42 — not an addHook
  app.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      // Skip CSRF check for Creem webhook (server-to-server, no browser origin header)
      if (request.url === '/api/saas/creem/webhook') return
      const origin = request.headers.origin
      if (ALLOWED_ORIGINS !== true && origin && !(ALLOWED_ORIGINS as string[]).includes(origin)) {
        return reply.status(403).send({ error: 'Forbidden origin' })
      }
    }
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/server/src/app.ts
  git commit -m "feat(server): register rawbody plugin and Creem routes"
  ```

---

## Task 5: Add usageResetAt to /auth/me

**Files:** Modify `apps/server/src/routes/saas/auth.ts`

- [ ] **Step 1: Update the select in GET /auth/me**

  Change line 55:
  ```typescript
  select: { id: true, email: true, nickname: true, avatarUrl: true, isPro: true, usedThisMonth: true, proExpireAt: true, usageResetAt: true },
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/server/src/routes/saas/auth.ts
  git commit -m "feat(server): expose usageResetAt in /auth/me for reset timer display"
  ```

---

## Task 6: Frontend Types + Constants

**Files:** `apps/web/src/types/index.ts`, `apps/web/src/lib/constants.ts`

- [ ] **Step 1: Add usageResetAt to User type**

  In `src/types/index.ts`, update User interface:
  ```typescript
  export interface User {
    id: string
    email: string | null
    nickname: string | null
    avatarUrl: string | null
    isPro: boolean
    usedThisMonth: number
    proExpireAt: string | null
    usageResetAt: string       // ISO date string
  }
  ```

- [ ] **Step 2: Update constants.ts**

  Replace the entire file contents:
  ```typescript
  // Always use relative paths so requests go through Next.js rewrite proxy (same-origin, no CORS)
  export const API_BASE = ''

  export const LIMITS = {
    free: { images: 3, pdfPages: 3, fileSize: 5, pdfSize: 10, monthly: 3 },
    pro:  { images: 10, pdfPages: 20, fileSize: 20, pdfSize: 20, monthly: 30 },
  } as const

  export const LANGUAGE_OPTIONS = [
    { value: 'AUTO', label: 'Auto-detect' },
    { value: 'EN',   label: 'English' },
    { value: 'ZH',   label: '中文' },
  ] as const

  export const PRICING = {
    monthlyUsd: 4.99,
    passUsd: 7.99,
    passDays: 30,
  } as const
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/types/index.ts apps/web/src/lib/constants.ts
  git commit -m "feat(web): update User type and pro limits/pricing constants"
  ```

---

## Task 7: i18n Foundation

**Files:** Create `LanguageContext.tsx`, `useT.ts`, `translations/en.ts`, `translations/zh.ts`

- [ ] **Step 1: Create English translations**

  Create `apps/web/src/lib/translations/en.ts`:
  ```typescript
  export const en = {
    nav: {
      upgradePro: '✨ Upgrade Pro',
      proBadge: '✨ Pro',
    },
    quota: {
      monthlyUsage: 'Monthly reports used',
      limitReached: 'Free limit reached ❤️',
      upgradePrompt: 'Upgrade to keep helping your family',
      upgrade: 'Upgrade →',
    },
    upload: {
      blockerTitle: "You've used all {{n}} free reports",
      blockerSub: 'Upgrade to keep interpreting health reports for you and your family',
      subscribeBtn: 'Subscribe $4.99/mo',
      passBtn: '$7.99 Pass',
      resetsOn: 'Resets on {{date}}',
    },
    pricing: {
      eyebrow: 'GIVE YOUR FAMILY THE CARE THEY DESERVE',
      headline: 'Simple, Honest Pricing',
      subheadline: 'No surprises. Cancel anytime.',
      free: {
        name: 'Free',
        period: 'forever',
        cta: 'Current Plan',
        features: ['3 reports / month', 'Images & PDF support', 'Auto language detection'],
        missing: ['Video history: 30 days', 'Standard queue'],
      },
      pro: {
        name: 'Pro',
        period: '/mo',
        badge: 'POPULAR',
        cta: 'Subscribe Now →',
        cancelNote: 'Cancel anytime',
        features: ['30 reports / month', 'Up to 10 images/report', 'PDF up to 20 pages', 'Video history: 1 year', 'Priority processing'],
      },
      pass: {
        name: '30-Day Pass',
        period: 'one-time, no auto-renew',
        cta: 'Buy Pass →',
        features: ['All Pro features', '30 reports in 30 days', 'Perfect for exam season', 'No subscription needed', 'Instant activation'],
      },
      trust: '🔒 Secure checkout via Creem · Instant activation · Cancel anytime',
    },
    dashboard: {
      upgradedTitle: 'Welcome to Pro! 🎉',
      upgradedBody: 'You now have 30 reports/month.',
      upgradedPending: 'Payment received — your Pro access will activate shortly.',
    },
  } as const

  export type Translations = typeof en
  ```

- [ ] **Step 2: Create Chinese translations**

  Create `apps/web/src/lib/translations/zh.ts`:
  ```typescript
  import type { Translations } from './en'

  export const zh: Translations = {
    nav: {
      upgradePro: '✨ 升级 Pro',
      proBadge: '✨ Pro 会员',
    },
    quota: {
      monthlyUsage: '本月已用报告数',
      limitReached: '免费额度已用完 ❤️',
      upgradePrompt: '升级后继续为家人解读健康报告',
      upgrade: '立即升级 →',
    },
    upload: {
      blockerTitle: '本月 {{n}} 份免费额度已用完',
      blockerSub: '升级 Pro，继续帮家人解读每一份健康报告',
      subscribeBtn: '订阅 $4.99/月',
      passBtn: '$7.99 通行证',
      resetsOn: '{{date}} 重置',
    },
    pricing: {
      eyebrow: '送给家人最好的关爱',
      headline: '简单透明，没有套路',
      subheadline: '随时取消，无隐藏费用',
      free: {
        name: '免费',
        period: '永久免费',
        cta: '当前方案',
        features: ['3 份报告/月', '支持图片和 PDF', '自动语言检测'],
        missing: ['视频保留 30 天', '普通处理队列'],
      },
      pro: {
        name: 'Pro',
        period: '/月',
        badge: '推荐',
        cta: '立即订阅 →',
        cancelNote: '随时取消',
        features: ['30 份报告/月', '每份最多 10 张图片', 'PDF 最多 20 页', '视频保留 1 年', '优先处理队列'],
      },
      pass: {
        name: '30 天通行证',
        period: '一次性，不自动续费',
        cta: '立即购买 →',
        features: ['Pro 全部权益', '30 天内 30 份报告', '适合体检季', '无需订阅', '即时生效'],
      },
      trust: '🔒 通过 Creem 安全结账 · 即时生效 · 随时取消',
    },
    dashboard: {
      upgradedTitle: '欢迎加入 Pro！🎉',
      upgradedBody: '您现在每月可解读 30 份报告。',
      upgradedPending: '支付已收到，Pro 权益即将生效，请稍候。',
    },
  }
  ```

- [ ] **Step 3: Create LanguageContext**

  Create `apps/web/src/contexts/LanguageContext.tsx`:
  ```typescript
  'use client'

  import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
  import { en } from '@/lib/translations/en'
  import { zh } from '@/lib/translations/zh'
  import type { Translations } from '@/lib/translations/en'

  type Lang = 'en' | 'zh'

  interface LangState {
    lang: Lang
    t: Translations
    setLang: (l: Lang) => void
  }

  const LangContext = createContext<LangState | null>(null)

  function detectLang(): Lang {
    if (typeof window === 'undefined') return 'en'
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'en' || stored === 'zh') return stored
    const nav = navigator.language.toLowerCase()
    return nav.startsWith('zh') ? 'zh' : 'en'
  }

  export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>('en')

    useEffect(() => {
      setLangState(detectLang())
    }, [])

    const setLang = (l: Lang) => {
      localStorage.setItem('lang', l)
      setLangState(l)
    }

    return (
      <LangContext.Provider value={{ lang, t: lang === 'zh' ? zh : en, setLang }}>
        {children}
      </LangContext.Provider>
    )
  }

  export function useLang() {
    const ctx = useContext(LangContext)
    if (!ctx) throw new Error('useLang must be used within LanguageProvider')
    return ctx
  }
  ```

- [ ] **Step 4: Create useT hook**

  Create `apps/web/src/hooks/useT.ts`:
  ```typescript
  export { useLang as useT } from '@/contexts/LanguageContext'
  ```

- [ ] **Step 5: Add LanguageProvider to app layout**

  In `apps/web/src/app/layout.tsx`, wrap children with `<LanguageProvider>`. Import it at the top:
  ```typescript
  import { LanguageProvider } from '@/contexts/LanguageContext'
  ```
  Then wrap inside `<AuthProvider>` (or wrap `<AuthProvider>` inside `<LanguageProvider>` — either works):
  ```tsx
  <LanguageProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </LanguageProvider>
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/src/lib/translations/ apps/web/src/contexts/LanguageContext.tsx apps/web/src/hooks/useT.ts apps/web/src/app/layout.tsx
  git commit -m "feat(web): add lightweight EN/ZH i18n foundation (LanguageContext + translations)"
  ```

---

## Task 8: Navbar — Upgrade Button + Language Switcher

**Files:** Modify `apps/web/src/components/Navbar.tsx`

- [ ] **Step 1: Update Navbar**

  Replace entire file:
  ```typescript
  'use client'

  import Link from 'next/link'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLang } from '@/contexts/LanguageContext'

  export default function Navbar() {
    const { user, loading, logout } = useAuth()
    const { lang, t, setLang } = useLang()

    return (
      <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900">
            EchoHealth
          </Link>

          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <div className="flex gap-0.5 rounded-full bg-neutral-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => setLang('en')}
                className={`rounded-full px-2.5 py-1 transition-colors ${lang === 'en' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('zh')}
                className={`rounded-full px-2.5 py-1 transition-colors ${lang === 'zh' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                中
              </button>
            </div>

            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-neutral-200" />
            ) : user ? (
              <>
                {/* Upgrade button (non-Pro only) */}
                {!user.isPro && (
                  <Link
                    href="/pricing"
                    className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  >
                    {t.nav.upgradePro}
                  </Link>
                )}
                {user.isPro && (
                  <span className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-xs font-semibold text-white">
                    {t.nav.proBadge}
                  </span>
                )}
                <Link
                  href="/dashboard"
                  className="rounded-md px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
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
                  className="rounded-md px-2 py-1 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
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

- [ ] **Step 2: Commit**

  ```bash
  git add apps/web/src/components/Navbar.tsx
  git commit -m "feat(web): add upgrade button and EN/ZH language switcher to Navbar"
  ```

---

## Task 9: QuotaBar — Upgrade CTA

**Files:** Modify `apps/web/src/components/QuotaBar.tsx`

- [ ] **Step 1: Update QuotaBar**

  Replace entire file:
  ```typescript
  import Link from 'next/link'
  import { LIMITS } from '@/lib/constants'
  import { useLang } from '@/contexts/LanguageContext'

  interface QuotaBarProps {
    used: number
    isPro: boolean
  }

  export default function QuotaBar({ used, isPro }: QuotaBarProps) {
    const { t } = useLang()
    const max = isPro ? LIMITS.pro.monthly : LIMITS.free.monthly
    const pct = Math.min((used / max) * 100, 100)
    const exhausted = !isPro && used >= max

    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>{t.quota.monthlyUsage}</span>
          <span className={`tabular-nums ${exhausted ? 'font-semibold text-red-500' : ''}`}>
            {used}&nbsp;/&nbsp;{max}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${exhausted ? 'bg-red-500' : 'bg-neutral-900'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {exhausted && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-orange-50 to-rose-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-neutral-800">{t.quota.limitReached}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{t.quota.upgradePrompt}</p>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              {t.quota.upgrade}
            </Link>
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/web/src/components/QuotaBar.tsx
  git commit -m "feat(web): add upgrade CTA to QuotaBar when free limit reached"
  ```

---

## Task 10: Pricing Page

**Files:** Create `apps/web/src/app/pricing/page.tsx`

- [ ] **Step 1: Create pricing page**

  Create `apps/web/src/app/pricing/page.tsx`:
  ```typescript
  'use client'

  import { useAuth } from '@/contexts/AuthContext'
  import { useLang } from '@/contexts/LanguageContext'
  import { PRICING } from '@/lib/constants'
  import { apiFetch } from '@/lib/api'
  import { useState } from 'react'

  export default function PricingPage() {
    const { user } = useAuth()
    const { t } = useLang()
    const [loading, setLoading] = useState<'monthly' | 'pass' | null>(null)

    const handleCheckout = async (plan: 'monthly' | 'pass') => {
      if (!user) {
        window.location.href = '/login'
        return
      }
      setLoading(plan)
      try {
        const { checkoutUrl } = await apiFetch<{ checkoutUrl: string }>(
          '/api/saas/creem/checkout',
          { method: 'POST', body: JSON.stringify({ plan }) },
        )
        window.location.href = checkoutUrl
      } catch (err) {
        console.error('Checkout error', err)
        setLoading(null)
      }
    }

    return (
      <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-orange-50 via-purple-50 to-rose-50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold tracking-widest text-rose-500">
              ❤️ {t.pricing.eyebrow}
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">
              {t.pricing.headline}
            </h1>
            <p className="mt-3 text-neutral-500">{t.pricing.subheadline}</p>
          </div>

          {/* Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Free */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                {t.pricing.free.name}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-neutral-900">$0</span>
              </div>
              <p className="mt-1 text-sm text-neutral-400">{t.pricing.free.period}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-neutral-600">
                {t.pricing.free.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
                {t.pricing.free.missing.map((f) => (
                  <li key={f} className="flex items-center gap-2 opacity-40">
                    <span>✗</span> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 rounded-xl bg-neutral-100 py-2.5 text-center text-sm font-semibold text-neutral-500">
                {t.pricing.free.cta}
              </div>
            </div>

            {/* Pro Monthly */}
            <div className="relative rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 p-8 text-white shadow-xl shadow-orange-200">
              <span className="absolute right-4 top-4 rounded-full bg-white/25 px-2.5 py-1 text-xs font-bold">
                {t.pricing.pro.badge}
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                {t.pricing.pro.name}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">${PRICING.monthlyUsd}</span>
                <span className="text-white/70">{t.pricing.pro.period}</span>
              </div>
              <p className="mt-1 text-sm text-white/60">{t.pricing.pro.cancelNote}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-white/90">
                {t.pricing.pro.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('monthly')}
                disabled={loading === 'monthly' || user?.isPro}
                className="mt-8 w-full rounded-xl bg-white/25 py-3 text-sm font-bold text-white transition-colors hover:bg-white/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === 'monthly' ? '…' : user?.isPro ? t.pricing.free.cta : t.pricing.pro.cta}
              </button>
            </div>

            {/* One-time Pass */}
            <div className="rounded-2xl border-2 border-amber-300 bg-white p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                {t.pricing.pass.name}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-neutral-900">${PRICING.passUsd}</span>
              </div>
              <p className="mt-1 text-sm text-neutral-400">{t.pricing.pass.period}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-neutral-600">
                {t.pricing.pass.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('pass')}
                disabled={loading === 'pass' || user?.isPro}
                className="mt-8 w-full rounded-xl border border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === 'pass' ? '…' : user?.isPro ? t.pricing.free.cta : t.pricing.pass.cta}
              </button>
            </div>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-center text-xs text-neutral-400">{t.pricing.trust}</p>
        </div>
      </main>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/web/src/app/pricing/
  git commit -m "feat(web): add pricing page with warm emotional design (Creem checkout)"
  ```

---

## Task 11: Upload Page — Quota Blocker

**Files:** Modify `apps/web/src/app/upload/page.tsx`

- [ ] **Step 1: Add quota blocker to upload page**

  After the loading/auth guard, add a quota blocker section. Replace the existing `quotaRemaining` error message with a full blocker when `quotaRemaining <= 0`. In the return statement, before the main form, add:

  ```typescript
  import Link from 'next/link'
  import { useLang } from '@/contexts/LanguageContext'

  // Inside component, after `const limits = ...`:
  const { t } = useLang()
  const quotaExhausted = !user.isPro && user.usedThisMonth >= limits.monthly
  const resetDate = new Date(user.usageResetAt).toLocaleDateString(
    undefined, { month: 'short', day: 'numeric' }
  )
  ```

  Then replace the `if (quotaRemaining <= 0)` early return logic — instead show the blocker inline where the FileUploader is:

  ```tsx
  {/* File upload OR quota blocker */}
  {quotaExhausted ? (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 px-8 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl">
        🔒
      </div>
      <h2 className="text-lg font-bold text-neutral-900">
        {t.upload.blockerTitle.replace('{{n}}', String(limits.monthly))}
      </h2>
      <p className="mt-2 text-sm text-neutral-500">{t.upload.blockerSub}</p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/pricing"
          className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          {t.upload.subscribeBtn}
        </Link>
        <Link
          href="/pricing"
          className="rounded-xl border border-amber-300 bg-white px-6 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50"
        >
          {t.upload.passBtn}
        </Link>
      </div>
      <p className="mt-4 text-xs text-neutral-400">
        {t.upload.resetsOn.replace('{{date}}', resetDate)}
      </p>
    </div>
  ) : (
    <FileUploader
      files={files}
      onChange={setFiles}
      maxFiles={limits.images}
      accept="image/jpeg,image/png,image/webp,application/pdf"
    />
  )}
  ```

  Also remove the old inline quota error from `handleSubmit` (the `if (quotaRemaining <= 0)` block).

- [ ] **Step 2: Commit**

  ```bash
  git add apps/web/src/app/upload/page.tsx
  git commit -m "feat(web): replace upload area with quota blocker when free limit exhausted"
  ```

---

## Task 12: Dashboard — Upgraded Toast

**Files:** Modify `apps/web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add useSearchParams import and upgrade polling**

  Add imports:
  ```typescript
  import { useSearchParams } from 'next/navigation'
  import { useLang } from '@/contexts/LanguageContext'
  ```

  Inside the component, add:
  ```typescript
  const searchParams = useSearchParams()
  const { t } = useLang()
  const { refresh } = useAuth()
  const [upgradeToast, setUpgradeToast] = useState<'polling' | 'success' | 'pending' | null>(null)

  // Poll for isPro after payment redirect
  useEffect(() => {
    if (!searchParams.get('upgraded')) return
    if (user?.isPro) {
      setUpgradeToast('success')
      return
    }
    setUpgradeToast('polling')
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      await refresh()
      if (user?.isPro) {
        clearInterval(interval)
        setUpgradeToast('success')
      } else if (attempts >= 5) {
        clearInterval(interval)
        setUpgradeToast('pending')
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [searchParams, user?.isPro, refresh])
  ```

  Add toast UI right after `<main>` opens:
  ```tsx
  {upgradeToast && upgradeToast !== 'polling' && (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-white px-6 py-4 shadow-2xl border border-neutral-100 flex items-center gap-3 max-w-sm w-full mx-6">
      <span className="text-2xl">{upgradeToast === 'success' ? '🎉' : '⏳'}</span>
      <div>
        <p className="font-semibold text-neutral-900 text-sm">
          {upgradeToast === 'success' ? t.dashboard.upgradedTitle : t.dashboard.upgradedPending}
        </p>
        {upgradeToast === 'success' && (
          <p className="text-xs text-neutral-500 mt-0.5">{t.dashboard.upgradedBody}</p>
        )}
      </div>
      <button
        onClick={() => setUpgradeToast(null)}
        className="ml-auto text-neutral-400 hover:text-neutral-600 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )}
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add apps/web/src/app/dashboard/page.tsx
  git commit -m "feat(web): poll isPro after Creem payment redirect, show upgrade success toast"
  ```

---

## Task 13: Build, Deploy, Verify

- [ ] **Step 1: Build locally to check for TS errors**

  ```bash
  cd /Users/young/Downloads/repos/EchoHealth
  pnpm --filter @echohealth/web build
  pnpm --filter @echohealth/server build
  ```
  Expected: no TypeScript errors.

- [ ] **Step 2: Run Prisma migration on server**

  ```bash
  ssh n8n "cd /home/ubuntu/echohealth/apps/server && export PATH=/home/ubuntu/.npm-global/bin:$PATH && pnpm prisma migrate deploy"
  ```

- [ ] **Step 3: Deploy to Oracle Cloud (following docs/deploy.md standard flow)**

  First fix SSH key permissions (required each new session):
  ```python
  # Run in Bash with dangerouslyDisableSandbox: true
  python3 -c "import os; os.chmod('/Users/young/.ssh/oracle-ssh-keys', 0o700)"
  ```

  Upload all modified and new server files (use `dangerouslyDisableSandbox: true`):
  ```bash
  # New server files
  scp -o ConnectTimeout=30 -o ServerAliveInterval=3 \
    apps/server/src/lib/creem.ts \
    n8n:/home/ubuntu/echohealth/apps/server/src/lib/

  scp -o ConnectTimeout=30 -o ServerAliveInterval=3 \
    apps/server/src/routes/saas/creem.ts \
    n8n:/home/ubuntu/echohealth/apps/server/src/routes/saas/

  # Modified server files
  scp -o ConnectTimeout=30 -o ServerAliveInterval=3 \
    apps/server/src/app.ts \
    n8n:/home/ubuntu/echohealth/apps/server/src/

  scp -o ConnectTimeout=30 -o ServerAliveInterval=3 \
    apps/server/src/routes/saas/auth.ts \
    n8n:/home/ubuntu/echohealth/apps/server/src/routes/saas/

  # Prisma schema + migration files
  scp -o ConnectTimeout=30 -o ServerAliveInterval=3 \
    apps/server/prisma/schema.prisma \
    n8n:/home/ubuntu/echohealth/apps/server/prisma/

  scp -rp -o ConnectTimeout=30 -o ServerAliveInterval=3 \
    apps/server/prisma/migrations/ \
    n8n:/home/ubuntu/echohealth/apps/server/prisma/
  ```

  Build and restart API on server (app.ts + routes changed → restart API process):
  ```bash
  ssh -o ConnectTimeout=30 -o ServerAliveInterval=3 n8n \
    'export PATH=/home/ubuntu/.npm-global/bin:$PATH && \
     cd /home/ubuntu/echohealth/apps/server && \
     pnpm install && \
     pnpm prisma generate && \
     pnpm build && \
     pm2 restart echohealth-api && \
     pm2 save && \
     echo "✓ Server deployed"'
  ```

  Deploy frontend to Vercel:
  ```bash
  cd apps/web && pnpm build  # verify no errors first
  # Then push to git — Vercel auto-deploys on push
  git push
  ```

- [ ] **Step 4: Configure Creem webhook URL**

  In Creem dashboard, set webhook endpoint to:
  `https://<production-domain>/api/saas/creem/webhook`

- [ ] **Step 5: End-to-end smoke test**

  1. Open the pricing page, click "Subscribe Now" → should redirect to Creem checkout
  2. Complete a test payment (use Creem test mode)
  3. Verify `/dashboard?upgraded=true` shows toast after isPro poll succeeds
  4. Verify Navbar shows Pro badge

---

## Quick Reference

### Creem API payload shape (approximate — verify against actual Creem docs)

```typescript
// checkout.completed event
{
  type: 'checkout.completed',
  data: {
    id: 'ch_xxx',          // use as creemOrderId
    metadata: { userId: '...', plan: 'pass' },
    customer_email: '...',
  }
}

// subscription.active event
{
  type: 'subscription.active',
  data: {
    id: 'sub_xxx',         // use as creemSubscriptionId
    current_period_start: 1711234567,  // unix timestamp
    current_period_end: 1713826567,
    metadata: { userId: '...' },
  }
}
```

> **Note:** Creem webhook payload shapes may differ — check actual Creem documentation and test with their webhook simulator before deploying. Adjust field names in `creem.ts` accordingly.
