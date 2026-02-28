# Pro 升级链路 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 Pro 月订阅升级链路（模拟支付），包含后端订单 API、配额到期降级、前端升级页和两个触达入口。

**Architecture:** 后端新增 `POST /orders`（模拟支付，直接升级 Pro 30 天）和 `GET /user/:id`（供前端查询配额状态）；配额中间件补充 Pro 到期自动降级；前端新增 upgrade 页 + 首页横幅 + 上传页弹窗跳转。

**Tech Stack:** Fastify + Prisma + Vitest（后端）；Taro 4 + React（小程序）

---

## Task 1: 配额中间件补充 Pro 到期降级

**Files:**
- Modify: `apps/server/src/middleware/quota.ts`
- Modify: `apps/server/src/__tests__/quota.test.ts`

### Step 1: 写失败测试

在 `quota.test.ts` 的 `describe('quotaMiddleware')` 末尾追加：

```typescript
it('resets isPro when proExpireAt has passed', async () => {
  const yesterday = new Date(Date.now() - 86_400_000)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'u-expired',
    isPro: true,
    proExpireAt: yesterday,
    usedThisMonth: 0,
    usageResetAt: new Date(),
  } as never)
  vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

  const reply = makeReply()
  await quotaMiddleware(makeRequest('u-expired'), reply)

  // Should have reset isPro via update
  expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ isPro: false }) }),
  )
  // Should then proceed with free-tier limit, not block (usedThisMonth=0)
  expect(reply.status).not.toHaveBeenCalledWith(429)
})
```

### Step 2: 运行确认失败

```bash
cd apps/server && pnpm test -- --reporter=verbose src/__tests__/quota.test.ts
```

期望：新 case FAIL，其余通过。

### Step 3: 实现到期降级

在 `quota.ts` 的 `const now = new Date()` 之后、`findUnique` 之后插入：

```typescript
// Auto-downgrade Pro when subscription has expired
if (user.isPro && user.proExpireAt && user.proExpireAt < now) {
  await prisma.user.update({
    where: { id: userId },
    data: { isPro: false },
  })
  user.isPro = false
}
```

### Step 4: 运行确认通过

```bash
pnpm test -- src/__tests__/quota.test.ts
```

期望：全部 PASS。

### Step 5: Commit

```bash
git add apps/server/src/middleware/quota.ts apps/server/src/__tests__/quota.test.ts
git commit -m "feat(quota): auto-downgrade Pro when subscription expires"
```

---

## Task 2: 新增 GET /user/:id 路由

**Files:**
- Create: `apps/server/src/routes/user.ts`
- Create: `apps/server/src/__tests__/user.test.ts`
- Modify: `apps/server/src/app.ts`

### Step 1: 写失败测试

新建 `apps/server/src/__tests__/user.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../db.js'

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    report: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn().mockResolvedValue({ id: 'job-1' }) })),
}))

describe('GET /user/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns user quota info', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      isPro: false,
      usedThisMonth: 2,
      proExpireAt: null,
    } as never)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/user/u1' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.isPro).toBe(false)
    expect(body.usedThisMonth).toBe(2)
    expect(body.proExpireAt).toBeNull()
  })

  it('returns 404 for unknown user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/user/ghost' })

    expect(res.statusCode).toBe(404)
  })
})
```

### Step 2: 运行确认失败

```bash
pnpm test -- src/__tests__/user.test.ts
```

期望：FAIL，`404 expected but got 404`（路由不存在，Fastify 默认返回 404）— 实际上会因为路由不匹配而返回 404，但 `isPro` 字段不在响应里，所以第一个 case 会 FAIL。

### Step 3: 实现路由

新建 `apps/server/src/routes/user.ts`：

```typescript
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

export async function userRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/user/:id', {
    async handler(request, reply) {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
        select: { id: true, isPro: true, usedThisMonth: true, proExpireAt: true },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })
      return user
    },
  })
}
```

在 `app.ts` 中注册（在 `authRoutes` 下方）：

```typescript
import { userRoutes } from './routes/user.js'
// ...
await app.register(userRoutes)
```

### Step 4: 运行确认通过

```bash
pnpm test -- src/__tests__/user.test.ts
```

期望：全部 PASS。

### Step 5: Commit

```bash
git add apps/server/src/routes/user.ts apps/server/src/__tests__/user.test.ts apps/server/src/app.ts
git commit -m "feat: add GET /user/:id quota info endpoint"
```

---

## Task 3: 新增 POST /orders 路由（模拟支付）

**Files:**
- Create: `apps/server/src/routes/orders.ts`
- Create: `apps/server/src/__tests__/orders.test.ts`
- Modify: `apps/server/src/app.ts`

### Step 1: 写失败测试

新建 `apps/server/src/__tests__/orders.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import { prisma } from '../db.js'

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    report: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    order: {
      create: vi.fn(),
    },
  },
}))

vi.mock('../queue/index.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn().mockResolvedValue({ id: 'job-1' }) })),
}))

describe('POST /orders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates order and upgrades user to Pro', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      isPro: false,
      usedThisMonth: 3,
      usageResetAt: new Date(),
      proExpireAt: null,
    } as never)

    const fakeExpireAt = new Date(Date.now() + 30 * 86_400_000)
    vi.mocked(prisma.user.update).mockResolvedValue({
      isPro: true,
      proExpireAt: fakeExpireAt,
    } as never)
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: 'order-1',
      status: 'PAID',
    } as never)

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { userId: 'u1' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.orderId).toBe('order-1')
    expect(body.proExpireAt).toBeDefined()

    expect(vi.mocked(prisma.order.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 1800, status: 'PAID' }),
      }),
    )
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPro: true }),
      }),
    )
  })

  it('returns 404 when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { userId: 'ghost' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 400 when userId missing', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })
})
```

### Step 2: 运行确认失败

```bash
pnpm test -- src/__tests__/orders.test.ts
```

期望：全部 FAIL（路由不存在）。

### Step 3: 实现路由

新建 `apps/server/src/routes/orders.ts`：

```typescript
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

export async function orderRoutes(app: FastifyInstance) {
  app.post<{ Body: { userId: string } }>('/orders', {
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string', minLength: 1 } },
      },
    },
    async handler(request, reply) {
      const { userId } = request.body

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return reply.status(404).send({ error: 'User not found' })

      const proExpireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const [order] = await prisma.$transaction([
        prisma.order.create({
          data: { userId, amount: 1800, status: 'PAID', paidAt: new Date() },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isPro: true, proExpireAt },
        }),
      ])

      return reply.status(201).send({ orderId: order.id, proExpireAt })
    },
  })
}
```

在 `app.ts` 中追加注册：

```typescript
import { orderRoutes } from './routes/orders.js'
// ...
await app.register(orderRoutes)
```

**注意**：`prisma.$transaction` 返回数组，`order` 是第一个元素（`order.create` 的结果）。

### Step 4: 运行确认通过

```bash
pnpm test -- src/__tests__/orders.test.ts
```

期望：全部 PASS。

### Step 5: 运行完整单元测试

```bash
pnpm test
```

期望：全部 PASS。

### Step 6: Commit

```bash
git add apps/server/src/routes/orders.ts apps/server/src/__tests__/orders.test.ts apps/server/src/app.ts
git commit -m "feat: add POST /orders mock payment endpoint, upgrades user to Pro 30d"
```

---

## Task 4: Orders 集成测试（真实 PG）

**Files:**
- Create: `apps/server/src/__tests__/integration/orders.integration.test.ts`

### Step 1: 写集成测试

新建 `apps/server/src/__tests__/integration/orders.integration.test.ts`：

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ROOT = path.resolve(__dirname, '../../..')

let container: StartedPostgreSqlContainer
let prisma: import('@prisma/client').PrismaClient

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()
  const dbUrl = container.getConnectionUri()

  execSync('pnpm prisma migrate deploy', {
    cwd: SERVER_ROOT,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  })

  process.env.DATABASE_URL = dbUrl
  const { PrismaClient } = await import('@prisma/client')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) })
})

afterAll(async () => {
  await prisma.$disconnect()
  await container.stop()
})

describe('POST /orders integration', () => {
  it('creates Order(PAID) and sets User.isPro=true with proExpireAt ~30d', async () => {
    const { buildApp } = await import('../../app.js')

    const user = await prisma.user.create({
      data: { openid: `order-test-${Math.random()}`, usedThisMonth: 3, usageResetAt: new Date() },
    })

    const app = await buildApp()
    const before = new Date()
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { userId: user.id },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.orderId).toBeDefined()

    // Verify DB state
    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updatedUser.isPro).toBe(true)
    expect(updatedUser.proExpireAt).not.toBeNull()

    const expectedExpiry = new Date(before.getTime() + 30 * 86_400_000)
    const diff = Math.abs(updatedUser.proExpireAt!.getTime() - expectedExpiry.getTime())
    expect(diff).toBeLessThan(5000) // within 5 seconds

    // Verify Order record
    const order = await prisma.order.findUniqueOrThrow({ where: { id: body.orderId } })
    expect(order.status).toBe('PAID')
    expect(order.amount).toBe(1800)
    expect(order.paidAt).not.toBeNull()
  })
})
```

### Step 2: 运行集成测试

```bash
pnpm test:integration -- --reporter=verbose
```

期望：PASS（需要 OrbStack 运行）。

### Step 3: Commit

```bash
git add apps/server/src/__tests__/integration/orders.integration.test.ts
git commit -m "test: add orders integration test (real PG)"
```

---

## Task 5: 小程序 — 注册 upgrade 页面

**Files:**
- Modify: `apps/miniprogram/src/app.config.ts`
- Create: `apps/miniprogram/src/pages/upgrade/index.tsx`
- Create: `apps/miniprogram/src/pages/upgrade/index.css`

### Step 1: 注册页面路径

在 `app.config.ts` 的 `pages` 数组末尾添加：

```typescript
'pages/upgrade/index',
```

### Step 2: 创建升级页面

新建 `apps/miniprogram/src/pages/upgrade/index.tsx`：

```tsx
import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import './index.css'

interface State {
  loading: boolean
}

class UpgradePage extends Component<{}, State> {
  state: State = { loading: false }

  async handleSubscribe() {
    const userId = Taro.getStorageSync('userId')
    if (!userId) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setState({ loading: true })
    try {
      const res = await Taro.request({
        url: `${process.env.API_BASE_URL}/orders`,
        method: 'POST',
        data: { userId },
        header: { 'Content-Type': 'application/json' },
      })

      if (res.statusCode === 201) {
        Taro.setStorageSync('isPro', true)
        Taro.showToast({ title: '升级成功！', icon: 'success' })
        setTimeout(() => Taro.navigateBack(), 1500)
      } else {
        Taro.showToast({ title: res.data?.error || '升级失败', icon: 'none' })
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '网络错误', icon: 'none' })
    } finally {
      this.setState({ loading: false })
    }
  }

  render() {
    const { loading } = this.state

    return (
      <View className='page'>
        <Text className='page-title'>升级 Pro 会员</Text>
        <Text className='page-subtitle'>解锁更多次数，助力健康管理</Text>

        {/* Comparison table */}
        <View className='table'>
          <View className='table-header'>
            <View className='col-label' />
            <View className='col-free'><Text className='col-title'>免费版</Text></View>
            <View className='col-pro'>
              <Text className='col-badge'>推荐</Text>
              <Text className='col-title'>Pro 版</Text>
            </View>
          </View>

          {[
            { label: '每月次数', free: '3 次', pro: '30 次' },
            { label: 'OCR 识别', free: '✓', pro: '✓' },
            { label: 'AI 解读', free: '✓', pro: '✓' },
            { label: '优先处理队列', free: '✗', pro: '✓' },
          ].map((row) => (
            <View key={row.label} className='table-row'>
              <View className='col-label'><Text className='row-label'>{row.label}</Text></View>
              <View className='col-free'><Text className='row-val'>{row.free}</Text></View>
              <View className='col-pro'><Text className='row-val pro-val'>{row.pro}</Text></View>
            </View>
          ))}
        </View>

        {/* Price */}
        <View className='price-wrap'>
          <Text className='price'>¥18</Text>
          <Text className='price-unit'>/月</Text>
        </View>

        <Button
          className={`subscribe-btn ${loading ? 'subscribe-btn-disabled' : ''}`}
          onClick={this.handleSubscribe.bind(this)}
          disabled={loading}
        >
          {loading ? '处理中...' : '立即订阅'}
        </Button>

        <Text className='hint'>模拟支付 · 点击即升级 · 30天有效期</Text>
      </View>
    )
  }
}

export default UpgradePage
```

### Step 3: 创建样式

新建 `apps/miniprogram/src/pages/upgrade/index.css`：

```css
.page {
  padding: 40rpx 32rpx;
  background: #f8fafc;
  min-height: 100vh;
}

.page-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 12rpx;
}

.page-subtitle {
  display: block;
  font-size: 28rpx;
  color: #64748b;
  text-align: center;
  margin-bottom: 48rpx;
}

/* Table */
.table {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  margin-bottom: 40rpx;
}

.table-header, .table-row {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f1f5f9;
}

.table-header {
  background: #f8fafc;
  padding: 20rpx 0;
}

.table-row {
  padding: 24rpx 0;
}

.col-label { flex: 3; padding-left: 32rpx; }
.col-free  { flex: 2; text-align: center; }
.col-pro   { flex: 2; text-align: center; background: #eff6ff; position: relative; }

.col-title { font-size: 28rpx; font-weight: 600; color: #334155; }
.col-badge {
  display: block;
  font-size: 20rpx;
  color: #2563eb;
  font-weight: 700;
  margin-bottom: 4rpx;
}

.row-label { font-size: 28rpx; color: #475569; }
.row-val   { font-size: 28rpx; color: #64748b; }
.pro-val   { color: #0284c7; font-weight: 600; }

/* Price */
.price-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 32rpx;
}

.price {
  font-size: 80rpx;
  font-weight: 800;
  color: #0284c7;
}

.price-unit {
  font-size: 32rpx;
  color: #64748b;
  margin-left: 8rpx;
}

/* Button */
.subscribe-btn {
  background: #0284c7;
  color: #fff;
  border-radius: 100rpx;
  font-size: 36rpx;
  font-weight: 600;
  padding: 0;
  height: 96rpx;
  line-height: 96rpx;
  margin-bottom: 24rpx;
}

.subscribe-btn-disabled {
  background: #94a3b8;
}

.hint {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #94a3b8;
}
```

### Step 4: Commit

```bash
git add apps/miniprogram/src/app.config.ts apps/miniprogram/src/pages/upgrade/
git commit -m "feat(miniprogram): add upgrade page with Free vs Pro comparison"
```

---

## Task 6: 小程序首页 — 配额横幅

**Files:**
- Modify: `apps/miniprogram/src/pages/index/index.tsx`

### Step 1: 修改 State 接口，添加 `usedThisMonth` 和 `isPro`

在现有 `State` 接口中新增：

```typescript
interface State {
  reports: RecentReport[]
  loading: boolean
  usedThisMonth: number   // 新增
  isPro: boolean          // 新增
}
```

初始值：
```typescript
state: State = {
  reports: [],
  loading: false,
  usedThisMonth: 0,
  isPro: false,
}
```

### Step 2: 在 `componentDidShow` 中同时拉取用户配额

```typescript
componentDidShow() {
  this.loadRecentReports()
  this.loadUserQuota()       // 新增
}

async loadUserQuota() {
  const userId = Taro.getStorageSync('userId')
  if (!userId) return
  try {
    const res = await Taro.request({
      url: `${process.env.API_BASE_URL}/user/${userId}`,
      method: 'GET',
    })
    if (res.statusCode === 200) {
      this.setState({ usedThisMonth: res.data.usedThisMonth, isPro: res.data.isPro })
    }
  } catch (e) {
    console.error('[Index] loadUserQuota failed:', e)
  }
}
```

### Step 3: 在上传按钮上方添加横幅

在 `render()` 的 `<View className='upload-btn-wrap'>` 上方插入：

```tsx
{/* Quota banner — only shown when free limit exhausted */}
{!isPro && usedThisMonth >= 3 && (
  <View
    className='quota-banner'
    onClick={() => Taro.navigateTo({ url: '/pages/upgrade/index' })}
  >
    <Text className='quota-banner-text'>
      ⚡ 本月免费次数已用完 · 升级 Pro 继续使用 →
    </Text>
  </View>
)}
```

在 `render()` 顶部解构 state：
```typescript
const { reports, loading, usedThisMonth, isPro } = this.state
```

### Step 4: 添加横幅样式

在 `apps/miniprogram/src/pages/index/index.css` 末尾追加：

```css
.quota-banner {
  margin: 0 32rpx 24rpx;
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  border-radius: 16rpx;
  padding: 20rpx 28rpx;
}

.quota-banner-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
}
```

### Step 5: Commit

```bash
git add apps/miniprogram/src/pages/index/
git commit -m "feat(miniprogram): show upgrade banner on homepage when free quota exhausted"
```

---

## Task 7: 小程序上传页 — 429 拦截跳转

**Files:**
- Modify: `apps/miniprogram/src/pages/upload/index.tsx`

### Step 1: 修改 429 处理逻辑

找到现有的 `else if (res.statusCode === 429)` 块，替换为：

```typescript
} else if (res.statusCode === 429) {
  Taro.showModal({
    title: '本月次数已用完',
    content: '免费版每月 3 次，升级 Pro 享 30 次/月',
    confirmText: '立即升级',
    cancelText: '下月再来',
    success: (modalRes) => {
      if (modalRes.confirm) {
        Taro.navigateTo({ url: '/pages/upgrade/index' })
      }
    },
  })
```

### Step 2: Commit

```bash
git add apps/miniprogram/src/pages/upload/index.tsx
git commit -m "feat(miniprogram): navigate to upgrade page on 429 quota exceeded"
```

---

## Task 8: 全量验证

### Step 1: 运行单元测试

```bash
cd apps/server && pnpm test
```

期望：全部 PASS（应有 60+ 个测试）。

### Step 2: 运行集成测试

```bash
pnpm test:integration
```

期望：全部 PASS（需要 OrbStack 运行）。

### Step 3: 类型检查

```bash
pnpm build
```

期望：零错误。

### Step 4: Push 触发 CI

```bash
git push
```

等待 GitHub Actions 全绿。

---

## 变更汇总

| 文件 | 操作 |
|------|------|
| `apps/server/src/middleware/quota.ts` | Pro 到期降级逻辑 |
| `apps/server/src/routes/user.ts` | 新增 GET /user/:id |
| `apps/server/src/routes/orders.ts` | 新增 POST /orders |
| `apps/server/src/app.ts` | 注册 userRoutes + orderRoutes |
| `apps/server/src/__tests__/quota.test.ts` | 补充到期降级 case |
| `apps/server/src/__tests__/user.test.ts` | 新增 |
| `apps/server/src/__tests__/orders.test.ts` | 新增 |
| `apps/server/src/__tests__/integration/orders.integration.test.ts` | 新增 |
| `apps/miniprogram/src/app.config.ts` | 注册 upgrade 页面 |
| `apps/miniprogram/src/pages/upgrade/index.tsx` | 新增 |
| `apps/miniprogram/src/pages/upgrade/index.css` | 新增 |
| `apps/miniprogram/src/pages/index/index.tsx` | 配额横幅 |
| `apps/miniprogram/src/pages/upload/index.tsx` | 429 跳转升级页 |
