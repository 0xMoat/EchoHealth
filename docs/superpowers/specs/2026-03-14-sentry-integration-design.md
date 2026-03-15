# Sentry 错误追踪接入设计

## 背景

EchoHealth 后端包含两个独立进程（API + Worker），生产环境中 pipeline 失败或 API 异常没有主动告警机制，只能靠查日志发现问题。接入 Sentry 实现错误自动捕获和 Telegram 实时告警。

## 决策

- **方案**: 最小接入 — 仅错误追踪，不启用 performance/tracing
- **告警渠道**: Sentry → Telegram Integration（官方原生支持）
- **依赖**: `@sentry/node` (唯一新增依赖)

## 架构

```
┌─────────────┐     ┌──────────────┐
│  API 进程    │     │  Worker 进程  │
│  (Fastify)  │     │  (BullMQ)    │
└──────┬──────┘     └──────┬───────┘
       │                    │
       │  --import flag     │  --import flag
       ▼                    ▼
┌─────────────────────────────────┐
│       instrument.ts             │
│  Sentry.init({ dsn, env })     │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│         Sentry Cloud            │
│  聚合 → Alert Rule → Telegram  │
└─────────────────────────────────┘
```

## 改动清单

### 新增文件

| 文件 | 用途 |
|------|------|
| `apps/server/src/instrument.ts` | Sentry SDK 初始化，通过 `--import` 加载 |

### 改动文件

| 文件 | 改动 |
|------|------|
| `apps/server/src/index.ts` | catch 块加 `Sentry.captureException` + `Sentry.flush()` |
| `apps/server/src/queue/start-worker.ts` | SIGTERM 中加 `Sentry.flush()` |
| `apps/server/src/queue/worker.ts` | catch 块加 `Sentry.captureException(err, { tags: { reportId } })` |
| `apps/server/src/app.ts` | 注册 `Sentry.setupFastifyErrorHandler(app)` |
| `apps/server/package.json` | 新增 `@sentry/node` 依赖；`start` 和 `start:worker` 脚本加 `--import` 标志 |
| `apps/server/.env.example` | 新增 `SENTRY_DSN=` |
| `railway.toml` | startCommand 加 `--import` 标志 |

### 不改动

- 测试文件 — `SENTRY_DSN` 未设置时 SDK 自动禁用
- Pipeline 业务逻辑 — 不改 OCR/LLM/TTS/Render 流程
- Source Map 上传 — 后续可选，当前不做
- Dockerfile — 不需要改（只修改启动命令）

## 实现细节

### 1. instrument.ts — ESM 初始化 (关键)

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local',
  enabled: !!process.env.SENTRY_DSN,
})
```

**为什么用 `--import` 而非 `import` 语句？**

ESM 模块的 import 是被 hoist 的，执行顺序由依赖图决定，不是源码顺序。Sentry 需要在所有模块加载前完成 monkey-patching，所以必须用 Node.js `--import` CLI 标志：

```bash
# package.json scripts
"start": "node --import ./dist/instrument.js dist/index.js"
"start:worker": "node --import ./dist/instrument.js dist/queue/start-worker.js"

# railway.toml
startCommand = "npx prisma migrate deploy && node --import ./dist/instrument.js dist/index.js"
```

**`release` 字段**: Railway 自动提供 `RAILWAY_GIT_COMMIT_SHA` 环境变量，用于关联错误到具体部署版本，无需额外配置。

### 2. API 错误上报 (app.ts) — 使用官方 Fastify 集成

```typescript
import * as Sentry from '@sentry/node'

// 在所有路由注册之后调用
Sentry.setupFastifyErrorHandler(app)
```

使用 `Sentry.setupFastifyErrorHandler()` 而非手动 `setErrorHandler`，原因：
- Sentry SDK v8+ 官方推荐的 Fastify 集成方式
- 自动捕获请求上下文 (URL, method, headers)
- 自动添加面包屑 (breadcrumbs)
- 正确的 scope 隔离

对于 4xx 校验错误噪音，通过 `beforeSend` 过滤：

```typescript
// instrument.ts 中
Sentry.init({
  // ...
  beforeSend(event) {
    // 过滤 4xx 业务错误，只上报 5xx
    const status = event.contexts?.response?.status_code
    if (typeof status === 'number' && status < 500) return null
    return event
  },
})
```

### 3. API 入口 flush (index.ts)

```typescript
import * as Sentry from '@sentry/node'

try {
  const app = await buildApp()
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
} catch (err) {
  Sentry.captureException(err)
  await Sentry.flush(2000)  // 等待事件发送完毕再退出
  console.error(err)
  process.exit(1)
}
```

### 4. Worker 错误上报 (worker.ts)

```typescript
import * as Sentry from '@sentry/node'

// 在现有 catch 块中，throw err 之前
catch (err) {
  Sentry.captureException(err, {
    tags: { reportId },
  })
  // 现有的 FAILED 状态更新逻辑不变
}
```

`reportId` 作为 tag，可在 Sentry 后台按报告 ID 筛选和关联。

### 5. Worker 优雅退出 flush (start-worker.ts)

```typescript
import * as Sentry from '@sentry/node'

process.on('SIGTERM', async () => {
  await Sentry.flush(2000)  // 确保 in-flight 事件不丢失
  await worker.close()
  process.exit(0)
})
```

### 6. 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `SENTRY_DSN` | 否 | 未设置时 Sentry 完全禁用，本地开发零噪音 |

**注意**: `SENTRY_DSN` 必须设为真实环境变量（Railway 控制台注入），不依赖 `.env` 文件。因为 `--import` 在 `dotenv` 加载之前执行，此时 `.env` 尚未读取。本地开发时 Sentry 禁用是预期行为。

## Telegram 告警配置（Sentry 后台操作，非代码）

1. Sentry 后台 → Settings → Integrations → 搜索 Telegram → Install
2. 绑定 Telegram Bot Token + Chat ID
3. Alert Rules → 创建规则：When a new issue is created → Send Telegram notification
4. 按 `environment: production` 过滤，避免开发环境噪音

## 后续可选扩展

- 启用 `tracesSampleRate` 做性能追踪（改一行配置）
- CI 中上传 Source Map（`sentry-cli sourcemaps upload`）
- 添加 `Sentry.setUser()` 关联用户 openid
- 添加 `beforeSend` PII 脱敏（健康数据保护）
