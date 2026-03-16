# SaaS Phase 1: Backend Extensions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Fastify backend to support SaaS web users alongside the existing WeChat miniprogram, with Google OAuth, JWT auth, LLM Vision OCR, and multi-language pipeline.

**Architecture:** Same server process serves both `/api/wx/*` (existing WeChat routes, unchanged) and `/api/saas/*` (new SaaS routes). A unified auth hook injects `request.user` regardless of auth method. The worker pipeline branches on `report.source` to choose OCR strategy (Tencent for miniprogram, Gemini Vision for web).

**Tech Stack:** Fastify 5, Prisma 7 (PostgreSQL), BullMQ, `google-auth-library`, `@google/genai`, `jsonwebtoken`, `sharp`, `@fastify/rate-limit`

**Spec:** `docs/superpowers/specs/2026-03-16-saas-version-design.md`

---

## File Structure

### New Files
- `apps/server/src/lib/jwt.ts` — JWT sign/verify utilities
- `apps/server/src/lib/vision.ts` — LLM Vision extraction (Gemini/Claude/OpenAI)
- `apps/server/src/lib/image.ts` — Image preprocessing (resize with sharp)
- `apps/server/src/hooks/auth.ts` — Unified auth hook (openid or JWT → request.user)
- `apps/server/src/routes/saas/auth.ts` — Google OAuth + JWT routes
- `apps/server/src/routes/saas/upload.ts` — SaaS upload (image + PDF)
- `apps/server/src/routes/saas/reports.ts` — SaaS reports CRUD
- `apps/server/src/__tests__/jwt.test.ts` — JWT utility tests
- `apps/server/src/__tests__/vision.test.ts` — LLM Vision tests
- `apps/server/src/__tests__/saas-auth.test.ts` — Google OAuth route tests
- `apps/server/src/__tests__/saas-upload.test.ts` — SaaS upload route tests
- `apps/server/src/__tests__/saas-reports.test.ts` — SaaS reports route tests
- `apps/server/src/__tests__/auth-hook.test.ts` — Auth hook tests

### Modified Files
- `apps/server/prisma/schema.prisma` — Add enums, modify User/Report, add Subscription
- `apps/server/src/app.ts` — Register SaaS routes, auth hook, rate limiting
- `apps/server/src/middleware/quota.ts` — Use `request.user.id` instead of `request.body.userId`
- `apps/server/src/queue/worker.ts` — Branch on `report.source`, support multi-language
- `apps/server/src/pipeline/llm.ts` — Add language parameter to `buildVideoScript()`
- `apps/server/src/pipeline/tts.ts` — Add English voice support
- `apps/server/src/routes/reports.ts` — Adapt to use `request.user`
- `apps/server/src/routes/upload.ts` — Adapt to use `request.user`
- `apps/server/package.json` — Add new dependencies
- `apps/server/.env.example` — Add new env vars

---

## Chunk 1: Database & Auth Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/server/package.json`

- [ ] **Step 1: Install new packages**

```bash
cd apps/server
pnpm add google-auth-library jsonwebtoken sharp @google/genai @fastify/rate-limit pdfjs-dist
pnpm add -D @types/jsonwebtoken @types/sharp
```

- [ ] **Step 2: Verify install succeeds**

Run: `cd /Users/young/Downloads/repos/EchoHealth && pnpm install`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/package.json pnpm-lock.yaml
git commit -m "chore(server): add google-auth, jwt, sharp, gemini, rate-limit deps"
```

---

### Task 2: Database Schema Migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Update schema with new enums and model changes**

Add these enums after existing enums:

```prisma
enum AuthProvider {
  WECHAT
  GOOGLE
}

enum VideoLanguage {
  AUTO
  EN
  ZH
}

enum InputType {
  IMAGE
  PDF
}

enum ReportSource {
  MINIPROGRAM
  WEB
}

enum PaymentProvider {
  WECHAT_PAY
  CREEM
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  EXPIRED
}
```

Modify `ReportType` enum — add `GENERAL`:

```prisma
enum ReportType {
  BLOOD_ROUTINE
  BIOCHEMISTRY
  PHYSICAL_EXAM
  GENERAL
}
```

Modify `User` model:

```prisma
model User {
  id            String        @id @default(cuid())
  openid        String?       @unique  // Changed: now optional
  authProvider  AuthProvider  @default(WECHAT)  // NEW
  email         String?       @unique  // NEW
  googleId      String?       @unique  // NEW
  nickname      String?
  avatarUrl     String?
  isPro         Boolean       @default(false)
  proExpireAt   DateTime?
  usedThisMonth Int           @default(0)
  usageResetAt  DateTime      @default(now())
  reports       Report[]
  orders        Order[]
  subscriptions Subscription[]  // NEW
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

Modify `Report` model — add 3 fields:

```prisma
model Report {
  // ... existing fields ...
  language      VideoLanguage @default(AUTO)    // NEW
  inputType     InputType     @default(IMAGE)   // NEW
  source        ReportSource  @default(MINIPROGRAM)  // NEW
  // ... existing relations and indexes ...
}
```

Add `Subscription` model:

```prisma
model Subscription {
  id                    String             @id @default(cuid())
  userId                String
  user                  User               @relation(fields: [userId], references: [id])
  provider              PaymentProvider
  creemSubscriptionId   String?            @unique
  status                SubscriptionStatus
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelledAt           DateTime?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@index([userId])
}
```

- [ ] **Step 2: Generate migration**

Run: `cd apps/server && pnpm db:migrate` (enter name: `add-saas-fields`)
Expected: Migration created successfully

> **Important:** Inspect the generated SQL migration file to confirm:
> (1) `openid` column is altered to DROP NOT NULL (not dropped/recreated)
> (2) New columns (`authProvider`, `email`, `googleId`, etc.) have proper DEFAULT values
> (3) No data loss for existing WeChat users (per spec's two-step migration requirement)

- [ ] **Step 3: Verify Prisma client generates**

Run: `cd apps/server && pnpm db:generate`
Expected: Prisma Client generated

- [ ] **Step 4: Verify build still passes**

Run: `cd apps/server && pnpm build`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat(db): add SaaS schema fields - auth provider, language, subscription model"
```

---

### Task 3: JWT Utilities

**Files:**
- Create: `apps/server/src/lib/jwt.ts`
- Create: `apps/server/src/__tests__/jwt.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/__tests__/jwt.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('JWT_SECRET', 'test-secret-key-for-unit-tests')

describe('JWT utilities', () => {
  it('signs and verifies a token', async () => {
    const { signToken, verifyToken } = await import('../lib/jwt.js')
    const token = signToken({ userId: 'user_123', email: 'test@example.com' })
    const payload = verifyToken(token)
    expect(payload.userId).toBe('user_123')
    expect(payload.email).toBe('test@example.com')
  })

  it('rejects expired tokens', async () => {
    const { signToken, verifyToken } = await import('../lib/jwt.js')
    const token = signToken({ userId: 'user_123' }, '0s')
    // Wait for expiry
    await new Promise(r => setTimeout(r, 100))
    expect(() => verifyToken(token)).toThrow()
  })

  it('rejects tampered tokens', async () => {
    const { verifyToken } = await import('../lib/jwt.js')
    expect(() => verifyToken('invalid.token.here')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && pnpm test -- src/__tests__/jwt.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement JWT utilities**

```typescript
// apps/server/src/lib/jwt.ts
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || ''

interface TokenPayload {
  userId: string
  email?: string
}

export function signToken(payload: TokenPayload, expiresIn: string = '7d'): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not set')
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function verifyToken(token: string): TokenPayload {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not set')
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & TokenPayload
  return { userId: decoded.userId, email: decoded.email }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && pnpm test -- src/__tests__/jwt.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/lib/jwt.ts apps/server/src/__tests__/jwt.test.ts
git commit -m "feat(server): add JWT sign/verify utilities"
```

---

### Task 4: Unified Auth Hook

**Files:**
- Create: `apps/server/src/hooks/auth.ts`
- Create: `apps/server/src/__tests__/auth-hook.test.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/__tests__/auth-hook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.stubEnv('JWT_SECRET', 'test-secret-key')

describe('Auth Hook', () => {
  it('extracts userId from x-user-id header (WeChat flow)', async () => {
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.get('/test', (req, reply) => {
      reply.send({ user: (req as any).user })
    })

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-user-id': 'user_wx_123' },
    })
    expect(res.json().user).toEqual({ id: 'user_wx_123' })
  })

  it('extracts userId from JWT cookie (SaaS flow)', async () => {
    const { signToken } = await import('../lib/jwt.js')
    const { authHook } = await import('../hooks/auth.js')
    const token = signToken({ userId: 'user_google_456', email: 'a@b.com' })

    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.get('/test', (req, reply) => {
      reply.send({ user: (req as any).user })
    })

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { cookie: `token=${token}` },
    })
    expect(res.json().user).toEqual({ id: 'user_google_456' })
  })

  it('extracts userId from request body (legacy WeChat flow)', async () => {
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.post('/test', (req, reply) => {
      reply.send({ user: (req as any).user })
    })

    const res = await app.inject({
      method: 'POST',
      url: '/test',
      payload: { userId: 'user_body_789' },
    })
    expect(res.json().user).toEqual({ id: 'user_body_789' })
  })

  it('extracts userId from query string (legacy WeChat GET flow)', async () => {
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.get('/test', (req, reply) => {
      reply.send({ user: (req as any).user })
    })

    const res = await app.inject({
      method: 'GET',
      url: '/test?userId=user_query_101',
    })
    expect(res.json().user).toEqual({ id: 'user_query_101' })
  })

  it('sets user to null when no auth provided', async () => {
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.get('/test', (req, reply) => {
      reply.send({ user: (req as any).user })
    })

    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.json().user).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && pnpm test -- src/__tests__/auth-hook.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement auth hook**

```typescript
// apps/server/src/hooks/auth.ts
import { FastifyRequest } from 'fastify'
import { verifyToken } from '../lib/jwt.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string } | null
  }
}

export async function authHook(request: FastifyRequest) {
  // Try x-user-id header first (WeChat miniprogram flow)
  const headerUserId = request.headers['x-user-id']
  if (typeof headerUserId === 'string' && headerUserId) {
    request.user = { id: headerUserId }
    return
  }

  // Try JWT from cookie (SaaS web flow)
  const cookieHeader = request.headers.cookie
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
    if (match) {
      try {
        const payload = verifyToken(match[1])
        request.user = { id: payload.userId }
        return
      } catch {
        // Invalid/expired token — treat as unauthenticated
      }
    }
  }

  // Try userId in request body (legacy WeChat flow)
  const body = request.body as Record<string, unknown> | undefined
  if (body?.userId && typeof body.userId === 'string') {
    request.user = { id: body.userId }
    return
  }

  // Try userId in query string (legacy WeChat GET flow)
  const query = request.query as Record<string, unknown> | undefined
  if (query?.userId && typeof query.userId === 'string') {
    request.user = { id: query.userId }
    return
  }

  request.user = null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && pnpm test -- src/__tests__/auth-hook.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Register auth hook in app.ts**

In `apps/server/src/app.ts`, add after CORS registration:

```typescript
import { authHook } from './hooks/auth.js'

// Inside buildApp(), after app.register(cors, ...):
app.addHook('preHandler', authHook)
```

- [ ] **Step 6: Update quota middleware to use request.user**

In `apps/server/src/middleware/quota.ts`, change the userId extraction (around line 20):

```typescript
// OLD:
const { userId } = request.body as { userId: string }

// NEW:
const userId = request.user?.id
if (!userId) {
  return reply.status(401).send({ error: 'Authentication required' })
}
```

- [ ] **Step 7: Adapt existing routes to use `request.user`**

In `apps/server/src/routes/reports.ts`, replace all `request.body.userId` / `request.query.userId` with `request.user?.id`:

```typescript
// Replace userId extraction in POST /reports and GET /reports handlers:
const userId = request.user?.id
if (!userId) {
  return reply.status(401).send({ error: 'Authentication required' })
}
```

Similarly in `apps/server/src/routes/upload.ts`, ensure it uses `request.user?.id`.

- [ ] **Step 8: Verify existing tests still pass**

Run: `cd apps/server && pnpm test`
Expected: All tests PASS (may need to update some test mocks that set `request.body.userId`)

- [ ] **Step 9: Commit**

```bash
git add apps/server/src/hooks/auth.ts apps/server/src/__tests__/auth-hook.test.ts \
  apps/server/src/app.ts apps/server/src/middleware/quota.ts \
  apps/server/src/routes/reports.ts apps/server/src/routes/upload.ts
git commit -m "feat(server): add unified auth hook, update quota and routes to use request.user"
```

---

### Task 5: Google OAuth Route

**Files:**
- Create: `apps/server/src/routes/saas/auth.ts`
- Create: `apps/server/src/__tests__/saas-auth.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/__tests__/saas-auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.stubEnv('JWT_SECRET', 'test-secret')
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-client-id')

// Mock google-auth-library
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({
        sub: 'google_user_123',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      }),
    }),
  })),
}))

// Mock db
vi.mock('../db.js', () => ({
  prisma: {
    user: {
      upsert: vi.fn().mockResolvedValue({
        id: 'cuid_user_1',
        googleId: 'google_user_123',
        email: 'test@gmail.com',
        isPro: false,
      }),
    },
  },
}))

describe('SaaS Auth Routes', () => {
  it('POST /api/saas/auth/google creates user and returns JWT cookie', async () => {
    const { default: saasAuthRoutes } = await import('../routes/saas/auth.js')
    const app = Fastify()
    app.register(saasAuthRoutes, { prefix: '/api/saas' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/auth/google',
      payload: { idToken: 'mock-google-id-token' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().userId).toBe('cuid_user_1')
    expect(res.headers['set-cookie']).toContain('token=')
    expect(res.headers['set-cookie']).toContain('HttpOnly')
    expect(res.headers['set-cookie']).toContain('SameSite=Lax')
  })

  it('POST /api/saas/auth/google returns 400 without idToken', async () => {
    const { default: saasAuthRoutes } = await import('../routes/saas/auth.js')
    const app = Fastify()
    app.register(saasAuthRoutes, { prefix: '/api/saas' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/auth/google',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('GET /api/saas/auth/me returns 401 without auth', async () => {
    const { default: saasAuthRoutes } = await import('../routes/saas/auth.js')
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.register(saasAuthRoutes, { prefix: '/api/saas' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/saas/auth/me',
    })

    expect(res.statusCode).toBe(401)
  })

  it('POST /api/saas/auth/logout clears cookie', async () => {
    const { default: saasAuthRoutes } = await import('../routes/saas/auth.js')
    const app = Fastify()
    app.register(saasAuthRoutes, { prefix: '/api/saas' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/auth/logout',
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['set-cookie']).toContain('Max-Age=0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && pnpm test -- src/__tests__/saas-auth.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Google OAuth route**

```typescript
// apps/server/src/routes/saas/auth.ts
import { FastifyInstance } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../../db.js'
import { signToken, verifyToken } from '../../lib/jwt.js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''

export default async function saasAuthRoutes(app: FastifyInstance) {
  app.post('/auth/google', async (request, reply) => {
    const { idToken } = request.body as { idToken?: string }
    if (!idToken) {
      return reply.status(400).send({ error: 'idToken is required' })
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.sub || !payload.email) {
      return reply.status(401).send({ error: 'Invalid Google token' })
    }

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      create: {
        googleId: payload.sub,
        email: payload.email,
        authProvider: 'GOOGLE',
        nickname: payload.name || null,
        avatarUrl: payload.picture || null,
      },
      update: {
        nickname: payload.name || undefined,
        avatarUrl: payload.picture || undefined,
      },
    })

    const token = signToken({ userId: user.id, email: user.email ?? undefined })
    const isProduction = process.env.NODE_ENV === 'production'

    reply
      .header(
        'Set-Cookie',
        `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax${isProduction ? '; Secure' : ''}`
      )
      .send({ userId: user.id, isPro: user.isPro })
  })

  app.get('/auth/me', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Not authenticated' })
    }
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, nickname: true, avatarUrl: true, isPro: true, usedThisMonth: true, proExpireAt: true },
    })
    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }
    return user
  })

  app.post('/auth/logout', async (_request, reply) => {
    reply
      .header('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
      .send({ ok: true })
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && pnpm test -- src/__tests__/saas-auth.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Register SaaS auth routes in app.ts**

In `apps/server/src/app.ts`:

```typescript
import saasAuthRoutes from './routes/saas/auth.js'

// Inside buildApp(), after existing route registrations:
app.register(saasAuthRoutes, { prefix: '/api/saas' })
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/routes/saas/auth.ts apps/server/src/__tests__/saas-auth.test.ts \
  apps/server/src/app.ts
git commit -m "feat(server): add Google OAuth login and JWT auth for SaaS"
```

---

## Chunk 2: LLM Vision & Multi-Language Pipeline

### Task 6: Image Preprocessing & PDF Utilities

**Files:**
- Create: `apps/server/src/lib/image.ts`
- Create: `apps/server/src/__tests__/image.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/__tests__/image.test.ts
import { describe, it, expect } from 'vitest'
import sharp from 'sharp'

describe('Image preprocessing', () => {
  it('returns JPEG for small images without resize', async () => {
    const { resizeImageForVision } = await import('../lib/image.js')
    // Create a 100x100 PNG
    const smallPng = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'red' } })
      .png().toBuffer()
    const result = await resizeImageForVision(smallPng)
    const meta = await sharp(result).metadata()
    expect(meta.format).toBe('jpeg')  // Always normalized to JPEG
    expect(meta.width).toBe(100)
  })

  it('resizes large images to fit within 1568px', async () => {
    const { resizeImageForVision } = await import('../lib/image.js')
    // Create a 3000x2000 image
    const largePng = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: 'blue' } })
      .png().toBuffer()
    const result = await resizeImageForVision(largePng)
    const meta = await sharp(result).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBeLessThanOrEqual(1568)
    expect(meta.height).toBeLessThanOrEqual(1568)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && pnpm test -- src/__tests__/image.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement image resizer and PDF page count**

```typescript
// apps/server/src/lib/image.ts
import sharp from 'sharp'

const MAX_DIMENSION = 1568

/**
 * Resize image buffer so neither dimension exceeds MAX_DIMENSION.
 * Always returns JPEG for consistent mimeType downstream.
 */
export async function resizeImageForVision(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
}

/**
 * Get page count from a PDF buffer using pdfjs-dist.
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const count = doc.numPages
  doc.destroy()
  return count
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && pnpm test -- src/__tests__/image.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/lib/image.ts apps/server/src/__tests__/image.test.ts
git commit -m "feat(server): add image resize and PDF page count utilities"
```

---

### Task 7: LLM Vision Module

**Files:**
- Create: `apps/server/src/lib/vision.ts`
- Create: `apps/server/src/__tests__/vision.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/__tests__/vision.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('GEMINI_API_KEY', 'test-key')
vi.stubEnv('LLM_VISION_PROVIDER', 'gemini')

// Mock @google/genai
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          language: 'en',
          indicators: [
            {
              name: 'Hemoglobin',
              value: '18.5',
              unit: 'g/dL',
              referenceRange: '13.5-17.5',
              status: 'high',
            },
          ],
        }),
      }),
    },
  })),
}))

describe('LLM Vision', () => {
  it('extracts indicators from images via Gemini', async () => {
    const { extractIndicatorsFromImages } = await import('../lib/vision.js')
    const fakeImage = Buffer.from('fake-image-data')
    const result = await extractIndicatorsFromImages([fakeImage], 'AUTO')

    expect(result.language).toBe('en')
    expect(result.indicators).toHaveLength(1)
    expect(result.indicators[0].name).toBe('Hemoglobin')
    expect(result.indicators[0].status).toBe('high')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && pnpm test -- src/__tests__/vision.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement LLM Vision module**

```typescript
// apps/server/src/lib/vision.ts
import { GoogleGenAI } from '@google/genai'

export interface VisionIndicator {
  name: string
  value: string
  unit: string
  referenceRange: string
  status: 'normal' | 'high' | 'low' | 'unknown'
}

export interface VisionResult {
  language: 'en' | 'zh'
  indicators: VisionIndicator[]
}

const VISION_PROMPT = `You are a medical report analyzer. Extract ALL health indicators from the report image(s).

Return ONLY valid JSON in this exact format:
{
  "language": "en" or "zh" (detected language of the report),
  "indicators": [
    {
      "name": "indicator name",
      "value": "measured value",
      "unit": "unit of measurement",
      "referenceRange": "normal range",
      "status": "normal" | "high" | "low" | "unknown"
    }
  ]
}

Rules:
- Extract every indicator visible, not just abnormal ones
- Determine status by comparing value to reference range
- If reference range is not visible, set status to "unknown"
- Detect report language from the text in the image`

async function callGemini(imageBuffers: Buffer[], language: string): Promise<VisionResult> {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  const imageParts = imageBuffers.map(buf => ({
    inlineData: {
      mimeType: 'image/jpeg' as const,
      data: buf.toString('base64'),
    },
  }))

  const languageHint = language === 'AUTO'
    ? 'Detect the language from the report.'
    : `The report is in ${language === 'ZH' ? 'Chinese' : 'English'}.`

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          ...imageParts,
          { text: `${VISION_PROMPT}\n\n${languageHint}` },
        ],
      },
    ],
  })

  const text = response.text ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse LLM Vision response')

  return JSON.parse(jsonMatch[0]) as VisionResult
}

/**
 * Extract indicators from image buffers.
 */
export async function extractIndicatorsFromImages(
  imageBuffers: Buffer[],
  language: string,
): Promise<VisionResult> {
  const provider = process.env.LLM_VISION_PROVIDER || 'gemini'

  switch (provider) {
    case 'gemini':
      return callGemini(imageBuffers, language)
    default:
      throw new Error(`Unsupported vision provider: ${provider}`)
  }
}

/**
 * Extract indicators from a PDF buffer (sent natively to Gemini).
 */
export async function extractIndicatorsFromPdf(
  pdfBuffer: Buffer,
  language: string,
): Promise<VisionResult> {
  const provider = process.env.LLM_VISION_PROVIDER || 'gemini'

  if (provider !== 'gemini') {
    throw new Error(`PDF extraction only supports gemini provider, got: ${provider}`)
  }

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  const languageHint = language === 'AUTO'
    ? 'Detect the language from the report.'
    : `The report is in ${language === 'ZH' ? 'Chinese' : 'English'}.`

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } },
          { text: `${VISION_PROMPT}\n\n${languageHint}` },
        ],
      },
    ],
  })

  const text = response.text ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse LLM Vision response for PDF')

  return JSON.parse(jsonMatch[0]) as VisionResult
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && pnpm test -- src/__tests__/vision.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/lib/vision.ts apps/server/src/__tests__/vision.test.ts
git commit -m "feat(server): add LLM Vision module with Gemini support"
```

---

### Task 8: Multi-Language TTS

**Files:**
- Modify: `apps/server/src/pipeline/tts.ts`

- [ ] **Step 1: Update TTS to support English voice**

In `apps/server/src/pipeline/tts.ts`, update the `generateAudio` function signature and default:

```typescript
// Change default voice parameter to accept language-based selection
const VOICE_MAP: Record<string, string> = {
  zh: 'zh-CN-XiaoxiaoNeural',
  en: 'en-US-JennyNeural',
}

export async function generateAudio(
  text: string,
  outputPath: string,
  voice?: string,
  language?: string,
): Promise<void> {
  const selectedVoice = voice || VOICE_MAP[language || 'zh'] || VOICE_MAP.zh
  // ... rest of existing implementation, use selectedVoice ...
}
```

- [ ] **Step 2: Verify existing tests pass**

Run: `cd apps/server && pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/pipeline/tts.ts
git commit -m "feat(server): add multi-language TTS voice support"
```

---

### Task 9: Multi-Language Script Generation

**Files:**
- Modify: `apps/server/src/pipeline/llm.ts`

- [ ] **Step 1: Add language parameter to buildPrompt and buildVideoScript**

In `apps/server/src/pipeline/llm.ts`:

```typescript
// Update buildPrompt to accept language parameter
export function buildPrompt(params: {
  indicators: Indicator[]
  reportType: string
  senderName?: string
  language?: string  // NEW
}): string {
  const lang = params.language || 'zh'
  const isEnglish = lang === 'en'

  // Switch prompt language based on parameter
  const promptIntro = isEnglish
    ? `You are a friendly health advisor creating a video script explaining health check results.`
    : `你是一位友善的健康顾问，正在创建一个解说体检报告的视频脚本。`

  // ... adapt rest of prompt for language ...
}

// Update buildVideoScript to accept and pass language
export async function buildVideoScript(params: {
  indicators: Indicator[]
  reportType: string
  senderName?: string
  language?: string  // NEW
}): Promise<VideoScript> {
  const prompt = buildPrompt(params)
  // ... existing provider selection logic ...
}
```

- [ ] **Step 2: Update buildNarrationText in worker.ts**

In `apps/server/src/queue/worker.ts`, update `buildNarrationText`:

```typescript
function buildNarrationText(script: VideoScript, language: string = 'zh'): string {
  const sep = language === 'en' ? '. ' : '。'
  const suggestLabel = language === 'en' ? 'Suggestions: ' : '建议：'

  const parts: string[] = [script.summary]
  for (const d of script.details) {
    parts.push(d.explanation)
    if (d.advice) parts.push(d.advice)
  }
  parts.push(suggestLabel + script.suggestions)
  parts.push(script.outro)
  return parts.join(sep)
}
```

- [ ] **Step 3: Verify existing tests pass**

Run: `cd apps/server && pnpm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/pipeline/llm.ts apps/server/src/queue/worker.ts
git commit -m "feat(server): add multi-language support to script generation and narration"
```

---

### Task 10: Worker Pipeline — Source-Based Routing

**Files:**
- Modify: `apps/server/src/queue/worker.ts`

- [ ] **Step 1: Update worker to branch on report.source**

In `apps/server/src/queue/worker.ts`, inside `runPipeline()`, replace the OCR step (around lines 87-105):

```typescript
// After loading report from DB, determine extraction strategy
let indicators: Indicator[]
let detectedLanguage: string = 'zh'

if (report.source === 'WEB') {
  // SaaS flow: use LLM Vision
  const { extractIndicatorsFromImages, extractIndicatorsFromPdf } = await import('../lib/vision.js')
  const { resizeImageForVision } = await import('../lib/image.js')

  let visionResult: VisionResult

  if (report.inputType === 'PDF') {
    // PDF: send natively to Gemini (no image conversion needed)
    const base64 = await fetchImageAsBase64(report.photoUrls[0])
    const pdfBuffer = Buffer.from(base64, 'base64')
    visionResult = await extractIndicatorsFromPdf(pdfBuffer, report.language)
  } else {
    // Images: resize and send
    const imageBuffers: Buffer[] = []
    for (const url of report.photoUrls) {
      const base64 = await fetchImageAsBase64(url)
      const buf = Buffer.from(base64, 'base64')
      const resized = await resizeImageForVision(buf)
      imageBuffers.push(resized)
    }
    visionResult = await extractIndicatorsFromImages(imageBuffers, report.language)
  }
  indicators = visionResult.indicators.map(vi => ({
    name: vi.name,
    code: vi.name.toUpperCase().replace(/\s+/g, '_'),
    value: vi.value,
    unit: vi.unit,
    referenceRange: vi.referenceRange,
    status: vi.status,
  }))
  detectedLanguage = visionResult.language

  await prisma.report.update({
    where: { id: report.id },
    data: {
      indicators: indicators as any,
      language: report.language === 'AUTO' ? (detectedLanguage === 'en' ? 'EN' : 'ZH') : report.language,
    },
  })
} else {
  // Miniprogram flow: use existing Tencent OCR
  // ... existing OCR code unchanged ...
}

await job.updateProgress(20)

// Determine final language for downstream steps
const videoLanguage = report.language === 'AUTO'
  ? detectedLanguage
  : report.language.toLowerCase()

// Pass language to script generation
const script = await buildVideoScript({
  indicators,
  reportType: report.type,
  language: videoLanguage,
})

// Pass language to narration + TTS
const narration = buildNarrationText(script, videoLanguage)
await generateAudio(narration, audioPath, undefined, videoLanguage)
```

- [ ] **Step 2: Verify build passes**

Run: `cd apps/server && pnpm build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/queue/worker.ts
git commit -m "feat(server): add source-based OCR routing in worker pipeline"
```

---

## Chunk 3: SaaS Routes & Security

### Task 11: SaaS Upload Route

**Files:**
- Create: `apps/server/src/routes/saas/upload.ts`
- Create: `apps/server/src/__tests__/saas-upload.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/__tests__/saas-upload.test.ts
import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'

vi.stubEnv('JWT_SECRET', 'test-secret')

vi.mock('../db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', isPro: false }) },
  },
}))

vi.mock('../pipeline/upload.js', () => ({
  uploadImageBuffer: vi.fn().mockResolvedValue('https://cos.example.com/img.jpg'),
}))

describe('SaaS Upload Route', () => {
  it('rejects unauthenticated requests', async () => {
    const { default: saasUploadRoutes } = await import('../routes/saas/upload.js')
    const { authHook } = await import('../hooks/auth.js')
    const app = Fastify()
    app.register(multipart, { limits: { fileSize: 20_000_000 } })  // 20MB max (Pro PDF limit)
    app.addHook('preHandler', authHook)
    app.register(saasUploadRoutes, { prefix: '/api/saas' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/upload',
    })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && pnpm test -- src/__tests__/saas-upload.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement SaaS upload route**

```typescript
// apps/server/src/routes/saas/upload.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db.js'
import { uploadImageBuffer } from '../../pipeline/upload.js'
import { getPdfPageCount } from '../../lib/image.js'

const FREE_IMAGE_LIMIT = 3
const PRO_IMAGE_LIMIT = 5
const FREE_PDF_PAGES = 3
const PRO_PDF_PAGES = 5
const FREE_FILE_SIZE = 5 * 1024 * 1024   // 5MB
const PRO_FILE_SIZE = 10 * 1024 * 1024    // 10MB
const FREE_PDF_SIZE = 10 * 1024 * 1024    // 10MB
const PRO_PDF_SIZE = 20 * 1024 * 1024     // 20MB

export default async function saasUploadRoutes(app: FastifyInstance) {
  app.post('/upload', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' })
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const isPro = user.isPro
    const parts = request.parts()
    const urls: string[] = []
    let inputType: 'IMAGE' | 'PDF' = 'IMAGE'
    let fileCount = 0

    for await (const part of parts) {
      if (part.type !== 'file') continue
      fileCount++

      const maxFiles = isPro ? PRO_IMAGE_LIMIT : FREE_IMAGE_LIMIT
      if (fileCount > maxFiles) {
        return reply.status(400).send({
          error: `Maximum ${maxFiles} files allowed${isPro ? '' : ' (upgrade to Pro for more)'}`,
        })
      }

      const buffer = await part.toBuffer()
      const isPdf = part.mimetype === 'application/pdf'

      if (isPdf) {
        inputType = 'PDF'
        const maxSize = isPro ? PRO_PDF_SIZE : FREE_PDF_SIZE
        if (buffer.length > maxSize) {
          return reply.status(413).send({ error: `PDF too large. Max ${maxSize / 1024 / 1024}MB` })
        }
        const pages = await getPdfPageCount(buffer)
        const maxPages = isPro ? PRO_PDF_PAGES : FREE_PDF_PAGES
        if (pages > maxPages) {
          return reply.status(400).send({ error: `PDF has ${pages} pages. Max ${maxPages} pages allowed` })
        }
      } else {
        const maxSize = isPro ? PRO_FILE_SIZE : FREE_FILE_SIZE
        if (buffer.length > maxSize) {
          return reply.status(413).send({ error: `Image too large. Max ${maxSize / 1024 / 1024}MB` })
        }
      }

      const ext = isPdf ? 'pdf' : (part.filename?.split('.').pop() || 'jpg')
      const url = await uploadImageBuffer(buffer, user.id, ext)
      urls.push(url)
    }

    if (urls.length === 0) {
      return reply.status(400).send({ error: 'No files uploaded' })
    }

    return { urls, inputType }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && pnpm test -- src/__tests__/saas-upload.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/saas/upload.ts apps/server/src/__tests__/saas-upload.test.ts
git commit -m "feat(server): add SaaS upload route with tier-based limits"
```

---

### Task 12: SaaS Reports Routes

**Files:**
- Create: `apps/server/src/routes/saas/reports.ts`
- Create: `apps/server/src/__tests__/saas-reports.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/__tests__/saas-reports.test.ts
import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'

vi.stubEnv('JWT_SECRET', 'test-secret')

const mockReport = {
  id: 'report_1',
  userId: 'u1',
  type: 'GENERAL',
  status: 'PENDING',
  photoUrls: ['https://cos/img.jpg'],
  language: 'AUTO',
  inputType: 'IMAGE',
  source: 'WEB',
  createdAt: new Date(),
}

vi.mock('../db.js', () => ({
  prisma: {
    report: {
      create: vi.fn().mockResolvedValue(mockReport),
      findMany: vi.fn().mockResolvedValue([mockReport]),
      findUnique: vi.fn().mockResolvedValue(mockReport),
    },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job_1' }),
  }),
}))

describe('SaaS Reports Routes', () => {
  it('POST /api/saas/reports creates report with source=WEB', async () => {
    const { default: saasReportRoutes } = await import('../routes/saas/reports.js')
    const { authHook } = await import('../hooks/auth.js')
    const { signToken } = await import('../lib/jwt.js')

    const app = Fastify()
    app.addHook('preHandler', authHook)
    app.register(saasReportRoutes, { prefix: '/api/saas' })

    const token = signToken({ userId: 'u1' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/saas/reports',
      headers: { cookie: `token=${token}` },
      payload: {
        photoUrls: ['https://cos/img.jpg'],
        language: 'EN',
        inputType: 'IMAGE',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().reportId).toBe('report_1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && pnpm test -- src/__tests__/saas-reports.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement SaaS reports routes**

```typescript
// apps/server/src/routes/saas/reports.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db.js'
import { getQueue } from '../../queue/index.js'
import { checkQuota } from '../../middleware/quota.js'

export default async function saasReportRoutes(app: FastifyInstance) {
  // Create report (with quota check)
  app.post('/reports', { preHandler: [checkQuota] }, async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' })

    const { photoUrls, language, inputType, reportType } = request.body as {
      photoUrls: string[]
      language?: string
      inputType?: string
      reportType?: string
    }

    if (!photoUrls?.length) {
      return reply.status(400).send({ error: 'photoUrls required' })
    }

    const report = await prisma.report.create({
      data: {
        userId: request.user.id,
        photoUrls,
        type: (reportType as any) || 'GENERAL',
        language: (language as any) || 'AUTO',
        inputType: (inputType as any) || 'IMAGE',
        source: 'WEB',
        status: 'PENDING',
      },
    })

    const queue = getQueue()
    await queue.add('video-generation', { reportId: report.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    })

    return { reportId: report.id, status: report.status }
  })

  // List reports
  app.get('/reports', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' })

    const { limit } = request.query as { limit?: string }
    const reports = await prisma.report.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '10'), 50),
      include: { video: true },
    })

    return reports
  })

  // Get report by ID
  app.get('/reports/:id', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' })

    const { id } = request.params as { id: string }
    const report = await prisma.report.findUnique({
      where: { id },
      include: { video: true },
    })

    if (!report || report.userId !== request.user.id) {
      return reply.status(404).send({ error: 'Report not found' })
    }

    return report
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && pnpm test -- src/__tests__/saas-reports.test.ts`
Expected: PASS

- [ ] **Step 5: Register in app.ts**

In `apps/server/src/app.ts`:

```typescript
import saasUploadRoutes from './routes/saas/upload.js'
import saasReportRoutes from './routes/saas/reports.js'

// Inside buildApp():
app.register(saasUploadRoutes, { prefix: '/api/saas' })
app.register(saasReportRoutes, { prefix: '/api/saas' })
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/routes/saas/reports.ts apps/server/src/__tests__/saas-reports.test.ts \
  apps/server/src/app.ts
git commit -m "feat(server): add SaaS reports routes (create, list, get)"
```

---

### Task 13: Rate Limiting & CORS

**Files:**
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/.env.example`

- [ ] **Step 1: Add rate limiting and CORS configuration**

In `apps/server/src/app.ts`:

```typescript
import rateLimit from '@fastify/rate-limit'

// Inside buildApp(), before route registration:
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

// After registering SaaS auth routes, add stricter limit:
// (Rate limit is applied per-route via route-level config in saas/auth.ts)
```

In `apps/server/src/routes/saas/auth.ts`, add rate limit to Google login:

```typescript
app.post('/auth/google', {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
}, async (request, reply) => {
  // ... existing handler ...
})
```

Update CORS in `apps/server/src/app.ts`:

```typescript
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : true  // Allow all in development

app.register(cors, {
  origin: ALLOWED_ORIGINS,
  credentials: true,
})

// Origin header validation for non-GET routes (CSRF protection per spec §9)
app.addHook('preHandler', async (request, reply) => {
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
    const origin = request.headers.origin
    if (ALLOWED_ORIGINS !== true && origin && !(ALLOWED_ORIGINS as string[]).includes(origin)) {
      return reply.status(403).send({ error: 'Forbidden origin' })
    }
  }
})
```

In `apps/server/src/routes/saas/auth.ts`, apply rate limit to all auth routes at the plugin level:

```typescript
export default async function saasAuthRoutes(app: FastifyInstance) {
  // Stricter rate limit for all auth routes (10 req/min/IP per spec §9)
  app.register(rateLimit, { max: 10, timeWindow: '1 minute' })
  // ... existing routes ...
}
```

- [ ] **Step 2: Update .env.example**

Add to `apps/server/.env.example`:

```
# SaaS Authentication
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=

# Creem Payment (Phase 3)
# CREEM_API_KEY=
# CREEM_WEBHOOK_SECRET=

# LLM Vision
LLM_VISION_PROVIDER=gemini
GEMINI_API_KEY=
LLM_SCRIPT_PROVIDER=claude

# CORS (comma-separated origins, leave empty for allow-all in dev)
# CORS_ORIGINS=https://echohealth.app,https://www.echohealth.app
```

- [ ] **Step 3: Verify build passes**

Run: `cd apps/server && pnpm build`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `cd apps/server && pnpm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/app.ts apps/server/src/routes/saas/auth.ts apps/server/.env.example
git commit -m "feat(server): add rate limiting, CORS config, and env var documentation"
```

---

### Task 14: Final Verification & Deploy Docs

**Files:**
- Modify: `docs/deploy.md`

- [ ] **Step 1: Run full test suite**

Run: `cd apps/server && pnpm test`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `cd apps/server && pnpm build`
Expected: Clean build, no errors

- [ ] **Step 3: Update deploy.md with new env vars**

Add the new SaaS environment variables to the deployment docs, including:
- `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `GEMINI_API_KEY`, `LLM_VISION_PROVIDER`
- `CORS_ORIGINS` configuration for production

- [ ] **Step 4: Commit all remaining changes**

```bash
git add docs/deploy.md
git commit -m "docs: update deployment guide with SaaS environment variables"
```

- [ ] **Step 5: Push to remote**

```bash
git push
```
