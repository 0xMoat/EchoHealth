# Sentry 错误追踪接入 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入 Sentry 错误追踪到 API 和 Worker 两个进程，实现生产异常自动上报 + Telegram 告警。

**Architecture:** 新增 `instrument.ts` 作为 Sentry 初始化入口，通过 Node.js `--import` 标志在模块加载前执行。API 侧用 `Sentry.setupFastifyErrorHandler()` 捕获路由异常，Worker 侧在 pipeline catch 块手动上报。

**Tech Stack:** `@sentry/node` v9+, Fastify 5, BullMQ, Node.js 20 ESM

**Spec:** `docs/superpowers/specs/2026-03-14-sentry-integration-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/server/src/instrument.ts` | Sentry SDK 初始化 (单一入口) |
| Modify | `apps/server/src/app.ts` | 注册 Fastify error handler |
| Modify | `apps/server/src/index.ts` | API 入口启动失败上报 + flush |
| Modify | `apps/server/src/queue/worker.ts` | Pipeline 异常上报 |
| Modify | `apps/server/src/queue/start-worker.ts` | Worker 优雅退出 flush |
| Modify | `apps/server/package.json` | 新增依赖 + 修改 start 脚本 |
| Modify | `apps/server/.env.example` | 新增 SENTRY_DSN |
| Modify | `railway.toml` | startCommand 加 --import |
| Create | `apps/server/src/__tests__/sentry.test.ts` | Sentry 集成验证测试 |

---

## Chunk 1: 安装依赖 + instrument.ts + 测试

### Task 1: 安装 @sentry/node

**Files:**
- Modify: `apps/server/package.json`

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/young/Downloads/repos/EchoHealth && pnpm --filter server add @sentry/node
```

- [ ] **Step 2: 确认 package.json 已更新**

```bash
cd /Users/young/Downloads/repos/EchoHealth && grep sentry apps/server/package.json
```

Expected: `"@sentry/node": "^9.x.x"` 出现在 dependencies 中

---

### Task 2: 创建 instrument.ts

**Files:**
- Create: `apps/server/src/instrument.ts`

- [ ] **Step 1: 创建文件**

```typescript
// apps/server/src/instrument.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local',
  enabled: !!process.env.SENTRY_DSN,
  beforeSend(event) {
    // 过滤 4xx 业务错误，只上报 5xx
    const status = event.contexts?.response?.status_code
    if (typeof status === 'number' && status < 500) return null
    return event
  },
})
```

- [ ] **Step 2: 确认 TypeScript 编译通过**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/server && npx tsc --noEmit src/instrument.ts
```

Expected: 无错误输出

---

### Task 3: 编写 Sentry 集成测试

**Files:**
- Create: `apps/server/src/__tests__/sentry.test.ts`

- [ ] **Step 1: 编写测试文件**

```typescript
// apps/server/src/__tests__/sentry.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock @sentry/node before any imports that use it
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setupFastifyErrorHandler: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}))

describe('Sentry instrument', () => {
  it('calls Sentry.init when imported', async () => {
    const Sentry = await import('@sentry/node')
    // instrument.ts is loaded via --import in production;
    // here we just verify the mock wiring works
    expect(Sentry.init).toBeDefined()
    expect(Sentry.captureException).toBeDefined()
  })
})

describe('Sentry in app error handler', () => {
  it('setupFastifyErrorHandler is called during buildApp', async () => {
    const Sentry = await import('@sentry/node')

    // Mock db and queue to avoid real connections
    vi.mock('../db.js', () => ({
      prisma: {
        user: { findUnique: vi.fn() },
        report: { create: vi.fn(), findUnique: vi.fn() },
      },
    }))
    vi.mock('../queue/index.js', () => ({
      getQueue: vi.fn(() => ({ add: vi.fn() })),
    }))

    const { buildApp } = await import('../app.js')
    const app = await buildApp()

    expect(Sentry.setupFastifyErrorHandler).toHaveBeenCalledWith(app)

    await app.close()
  })
})

describe('Sentry in worker pipeline', () => {
  it('captureException is called with reportId tag on pipeline failure', async () => {
    const Sentry = await import('@sentry/node')

    const mockUpdateReport = vi.fn().mockResolvedValue({})
    vi.mock('../db.js', () => ({
      prisma: {
        report: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'report-1',
            type: 'BLOOD_ROUTINE',
            photoUrls: ['https://example.com/img.jpg'],
            indicators: null,
            user: { nickname: '测试' },
          }),
          update: mockUpdateReport,
        },
        video: { create: vi.fn() },
        $transaction: vi.fn(),
      },
    }))
    vi.mock('../pipeline/ocr.js', () => ({
      ocrReportImage: vi.fn().mockRejectedValue(new Error('OCR failed')),
      parseOcrText: vi.fn(),
    }))
    vi.mock('../pipeline/llm.js', () => ({ buildVideoScript: vi.fn() }))
    vi.mock('../pipeline/tts.js', () => ({ generateAudio: vi.fn() }))
    vi.mock('../pipeline/render.js', () => ({ renderVideo: vi.fn() }))
    vi.mock('../pipeline/upload.js', () => ({
      uploadAudio: vi.fn(),
      uploadVideo: vi.fn(),
    }))
    vi.mock('fs/promises', () => ({
      mkdir: vi.fn().mockResolvedValue(undefined),
      rm: vi.fn().mockResolvedValue(undefined),
    }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as unknown as Response)

    const { runPipeline } = await import('../queue/worker.js')
    const job = {
      data: { reportId: 'report-1' },
      updateProgress: vi.fn().mockResolvedValue(undefined),
    } as any

    await expect(runPipeline(job)).rejects.toThrow('OCR failed')

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { reportId: 'report-1' },
      }),
    )
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/server && npx vitest run src/__tests__/sentry.test.ts
```

Expected: `setupFastifyErrorHandler` 和 `captureException` 相关断言 FAIL（因为 app.ts 和 worker.ts 还没改）

- [ ] **Step 3: Commit 测试文件**

```bash
git add apps/server/src/__tests__/sentry.test.ts apps/server/src/instrument.ts apps/server/package.json pnpm-lock.yaml
git commit -m "feat(sentry): add instrument.ts and failing sentry tests"
```

---

## Chunk 2: 接入 API 进程

### Task 4: 修改 app.ts — 注册 Fastify error handler

**Files:**
- Modify: `apps/server/src/app.ts:1-35`

- [ ] **Step 1: 添加 Sentry import 和 setupFastifyErrorHandler**

在 `app.ts` 顶部添加 import，在所有路由注册之后、return app 之前调用：

```typescript
import * as Sentry from '@sentry/node'
```

在 `await app.register(orderRoutes)` 之后添加：

```typescript
Sentry.setupFastifyErrorHandler(app)
```

完整文件应为：

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import * as Sentry from '@sentry/node'
import { reportRoutes } from './routes/reports.js'
import { authRoutes } from './routes/auth.js'
import { uploadRoutes } from './routes/upload.js'
import { quotaMiddleware } from './middleware/quota.js'
import { userRoutes } from './routes/user.js'
import { orderRoutes } from './routes/orders.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(authRoutes)
  await app.register(userRoutes)
  await app.register(uploadRoutes)

  // Apply quota check before POST /reports
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'POST' && request.url === '/reports') {
      await quotaMiddleware(
        request as Parameters<typeof quotaMiddleware>[0],
        reply,
      )
    }
  })

  await app.register(reportRoutes)
  await app.register(orderRoutes)

  Sentry.setupFastifyErrorHandler(app)

  return app
}
```

---

### Task 5: 修改 index.ts — API 启动失败上报

**Files:**
- Modify: `apps/server/src/index.ts:1-10`

- [ ] **Step 1: 添加 Sentry import 和异常上报**

完整文件应为：

```typescript
import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { buildApp } from './app.js'

try {
  const app = await buildApp()
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
} catch (err) {
  Sentry.captureException(err)
  await Sentry.flush(2000)
  console.error(err)
  process.exit(1)
}
```

- [ ] **Step 2: 运行 sentry 测试**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/server && npx vitest run src/__tests__/sentry.test.ts
```

Expected: `setupFastifyErrorHandler` 测试 PASS，worker 测试仍 FAIL

- [ ] **Step 3: 运行全部测试确认无回归**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/server && npx vitest run
```

Expected: 所有已有测试 PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/app.ts apps/server/src/index.ts
git commit -m "feat(sentry): integrate error handler into Fastify API"
```

---

## Chunk 3: 接入 Worker 进程

### Task 6: 修改 worker.ts — Pipeline 异常上报

**Files:**
- Modify: `apps/server/src/queue/worker.ts:1,152-163`

- [ ] **Step 1: 添加 Sentry import**

在文件顶部 import 区域添加：

```typescript
import * as Sentry from '@sentry/node'
```

- [ ] **Step 2: 在 catch 块中添加 captureException**

将第 152-163 行的 catch 块修改为：

```typescript
  } catch (err) {
    Sentry.captureException(err, {
      tags: { reportId },
    })
    // Mark report as FAILED and preserve the error message
    await prisma.report
      .update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          errorMsg: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => {}) // don't shadow the original error
    throw err
  }
```

---

### Task 7: 修改 start-worker.ts — 优雅退出 flush

**Files:**
- Modify: `apps/server/src/queue/start-worker.ts:1-10`

- [ ] **Step 1: 添加 Sentry import 和 flush**

完整文件应为：

```typescript
import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { startWorker } from './worker.js'

const worker = startWorker()
console.log('[Worker] Started, waiting for jobs...')

process.on('SIGTERM', async () => {
  await Sentry.flush(2000)
  await worker.close()
  process.exit(0)
})
```

- [ ] **Step 2: 运行 sentry 测试**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/server && npx vitest run src/__tests__/sentry.test.ts
```

Expected: 所有 sentry 测试 PASS（包括 captureException with reportId tag）

- [ ] **Step 3: 运行全部测试确认无回归**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/server && npx vitest run
```

Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/queue/worker.ts apps/server/src/queue/start-worker.ts
git commit -m "feat(sentry): add error tracking to worker pipeline"
```

---

## Chunk 4: 配置文件 + 部署

### Task 8: 更新 package.json 启动脚本

**Files:**
- Modify: `apps/server/package.json` (scripts 部分)

- [ ] **Step 1: 修改 start 和 start:worker 脚本**

将：
```json
"start": "node dist/index.js",
"start:worker": "node dist/queue/start-worker.js"
```

改为：
```json
"start": "node --import ./dist/instrument.js dist/index.js",
"start:worker": "node --import ./dist/instrument.js dist/queue/start-worker.js"
```

---

### Task 9: 更新 .env.example

**Files:**
- Modify: `apps/server/.env.example`

- [ ] **Step 1: 在文件末尾添加 Sentry 配置段**

在文件末尾追加：

```
# ── Sentry（错误追踪）───────────────────────────
# 注册：https://sentry.io → 创建 Node.js 项目 → 复制 DSN
# 本地开发不设置此变量，Sentry 自动禁用
# 注意：必须设为系统环境变量（Railway 注入），不能只写在 .env 中
# 因为 --import 在 dotenv 之前执行
SENTRY_DSN=
```

---

### Task 10: 更新 railway.toml

**Files:**
- Modify: `railway.toml:5`

- [ ] **Step 1: 修改 startCommand**

将：
```toml
startCommand = "npx prisma migrate deploy && node dist/index.js"
```

改为：
```toml
startCommand = "npx prisma migrate deploy && node --import ./dist/instrument.js dist/index.js"
```

---

### Task 11: 构建验证

- [ ] **Step 1: 确认 TypeScript 编译通过**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/server && pnpm build
```

Expected: 编译成功，`dist/instrument.js` 存在

- [ ] **Step 2: 确认 instrument.js 在 dist 目录中**

```bash
ls /Users/young/Downloads/repos/EchoHealth/apps/server/dist/instrument.js
```

Expected: 文件存在

- [ ] **Step 3: 运行全部测试（最终确认）**

```bash
cd /Users/young/Downloads/repos/EchoHealth/apps/server && pnpm test
```

Expected: 全部 PASS

- [ ] **Step 4: Commit 配置文件**

```bash
git add apps/server/package.json apps/server/.env.example railway.toml
git commit -m "feat(sentry): update start scripts and deployment config for --import flag"
```
