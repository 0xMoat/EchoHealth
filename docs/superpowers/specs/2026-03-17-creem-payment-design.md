# Creem 支付集成 + 会员 UI 设计规范

**日期**: 2026-03-17
**状态**: 已确认
**市场**: 欧美（USD 定价）
**支付平台**: Creem

---

## 1. 背景与目标

EchoHealth Web 端面向海外华人市场（欧美为主），需要集成 Creem 支付，提供 Pro 会员升级路径。目标是让用户在自然使用过程中遇到付费卡点时顺畅升级，不做强制打扰。

### 核心用户场景
- **孝顺子女**（65% 用户）：帮父母解读体检报告，每年 2–4 次，免费额度足够，但家庭多份报告时触发升级
- **慢性病管理**（25% 用户）：每月复查，持续需求，适合月订阅
- **偶发高峰**（10% 用户）：体检季集中上传，适合一次性买断

---

## 2. 定价方案

| 方案 | 价格 | 说明 |
|------|------|------|
| **Free** | $0 | 永久免费，3 份报告/月 |
| **Pro 月订阅** | $4.99/月 | 随时取消，自动续费 |
| **30 天通行证** | $7.99 | 一次性，不自动续费，30 天内 Pro 权益 |

### Free vs Pro 权益对比

| 功能 | Free | Pro |
|------|------|-----|
| 月报告数量 | 3 份 | 30 份 |
| 每份图片数 | 3 张 | 10 张 |
| PDF 页数/大小 | 3 页 / 5 MB | 20 页 / 20 MB |
| 视频保留时长 | 30 天 | 1 年 |
| 处理队列 | 普通 | 优先 |

---

## 3. UI 入口（D 方案：全覆盖）

### 3.1 `/pricing` 独立定价页
- 暖色情感风格，背景渐变 `#fff7ed → #fdf4ff → #fff0f3`
- 三列卡片：Free / Pro / 30-Day Pass
- Pro 卡片：红橙渐变，`POPULAR` 标签，最突出
- 一次性卡片：金色描边，强调"no auto-renew"
- 底部信任背书：`🔒 Secure checkout via Creem · Instant activation · Cancel anytime`
- 语言切换按钮（见 3.4）

### 3.2 Navbar 常驻升级入口
- 已登录且非 Pro 时显示：`✨ Upgrade Pro` 红橙渐变按钮
- 点击跳转 `/pricing`
- Pro 用户隐藏此按钮，改为显示 `✨ Pro` 徽章

### 3.3 QuotaBar 升级 CTA
- 当 `usedThisMonth >= monthlyLimit` 时，进度条下方展示升级提示卡
- 文案（EN）：`Free limit reached ❤️ — Upgrade to keep helping your family`
- 点击跳转 `/pricing`
- Pro 用户不显示

### 3.4 上传页拦截卡片
- 当额度耗尽时，替换拖拽上传区域为拦截卡片
- 展示：`🔒 You've used all 3 free reports`
- 两个 CTA：`Subscribe $4.99/mo`（主） + `$7.99 Pass`（次）
- 底部显示下次重置时间（来自 `/auth/me` 返回的 `usageResetAt` 字段）

### 3.5 Dashboard 升级成功提示
- 支付完成跳转 `/dashboard?upgraded=true`
- 前端轮询 `/api/saas/auth/me`，最多 5 次（每次间隔 2s）
- **Toast 仅在轮询确认 `isPro=true` 后显示**（防止直接访问 URL 伪造成功状态）
- Toast 内容：`🎉 Welcome to Pro! You now have 30 reports/month.`
- 轮询超时（10s）后回退显示：`Payment received — your Pro access will activate shortly.`

---

## 4. 国际化（i18n）

### 范围
- 仅覆盖**新增 UI**（定价页、upgrade CTAs、QuotaBar、上传拦截、Navbar 升级按钮）
- 现有页面（上传、结果、仪表板内容区）保持中文不变，i18n 为后续独立任务

### 实现方案（轻量）
不引入 `next-intl` 等重型库，使用简单 Context：

```
src/
  contexts/
    LanguageContext.tsx      # 检测 navigator.language，存 localStorage
  lib/
    translations/
      en.ts                  # 英文文案
      zh.ts                  # 中文文案
  hooks/
    useT.ts                  # 返回当前语言翻译字符串的 hook
```

### 语言检测逻辑
1. 读取 `localStorage.lang`（用户手动切换优先）
2. 否则检测 `navigator.language`（`zh`/`zh-CN`/`zh-TW` → 中文，其余 → 英文）
3. 语言切换按钮在 Navbar 右侧，`EN | 中` 胶囊样式

---

## 5. 后端设计

### 5.1 新增路由：`routes/saas/creem.ts`

```
POST /api/saas/creem/checkout
     → body: { plan: "monthly" | "pass" }
     → 需要登录（authHook）
     → 调用 Creem API 创建 checkout session
     → 返回 { checkoutUrl: string }
     注意：创建 checkout session 是状态变更操作，用 POST 不用 GET，
     防止 prefetcher/爬虫意外触发

POST /api/saas/creem/webhook
     → 不走 authHook（Creem 直接调用）
     → 必须捕获 rawBody（Buffer）用于 HMAC 验签，需注册
       @fastify/rawbody 插件，webhook 路由使用 config: { rawBody: true }
     → verifyWebhookSignature(rawBody: Buffer, signature: string) → boolean
     → 验签失败立即返回 400
     → 根据事件类型更新数据库（含幂等检查，见 5.3）
```

### 5.2 新增文件：`lib/creem.ts`

Creem SDK 封装：
- `createCheckout(plan, userId, userEmail)` → 返回 checkout URL
- `verifyWebhookSignature(payload, signature, secret)` → boolean
- `CREEM_PLANS` 常量（product IDs 来自环境变量）

### 5.3 Webhook 事件处理

**幂等性要求（必须实现）**：Creem 会在服务器未返回 2xx 时自动重试，所有写库操作必须做幂等去重：
- 一次性购买：以 `creemOrderId` 为唯一键做 `upsert`，而非 `create`
- 订阅事件：以 `creemSubscriptionId` 为唯一键做 `upsert`，而非 `create`

| 事件 | 处理逻辑 |
|------|----------|
| `checkout.completed`（一次性） | 以 `creemOrderId` upsert Order；`isPro=true`, `proExpireAt=+30天` |
| `subscription.active` | 以 `creemSubscriptionId` upsert Subscription；`isPro=true`, `proExpireAt=currentPeriodEnd` |
| `subscription.renewed` | 以 `creemSubscriptionId` 更新 `proExpireAt=newPeriodEnd`, `Subscription.currentPeriodEnd` |
| `subscription.cancelled` | `Subscription.status=CANCELLED`（`isPro` 不变，quota 中间件在 `proExpireAt` 过期时自动降级） |

**关于 `subscription.expired` 事件**：不依赖此事件。Creem 可能不可靠地触发它，且现有 `quota.ts` 中间件已在每次请求时检查 `proExpireAt < now` 并将 `isPro` 降级，这是更可靠的过期检测机制。若收到此事件，仅更新 `Subscription.status=EXPIRED` 即可，不额外处理 `isPro`。

### 5.4 数据库变更（Prisma）

Order 表新增可选字段：
```prisma
model Order {
  // ...existing fields...
  creemOrderId  String?   @unique  // Creem checkout session ID，唯一约束用于幂等去重
}
```

Subscription 表已有 `creemSubscriptionId` 和 `provider` 字段，无需变更。

**`constants.ts` 目标值**（实现时以此为准，覆盖现有 pro 限制）：
```typescript
FREE:  { images: 3,  pdfPages: 3,  fileSize: 5,  pdfSize: 10, monthly: 3  }
PRO:   { images: 10, pdfPages: 20, fileSize: 20, pdfSize: 20, monthly: 30 }
// 新增定价常量
PRO_MONTHLY_PRICE = 4.99   // USD
PASS_PRICE        = 7.99   // USD
PASS_DAYS         = 30
```

### 5.5 路由注册（`app.ts`）

```typescript
// 1. 先注册 @fastify/rawbody 插件（webhook 路由需要）
await app.register(import('@fastify/rawbody'))

// 2. 注册 creem 路由，webhook 子路由不走 authHook
app.register(creemRoutes, { prefix: '/api/saas/creem' })
```

---

## 6. 支付流程

```
用户点击升级按钮
  → POST /api/saas/creem/checkout { plan: "monthly" }
  → 后端创建 Creem Checkout Session（携带 userId metadata + successUrl）
  → 前端重定向到 Creem 托管结账页
  → 用户在 Creem 完成支付
  → Creem Webhook → POST /api/saas/creem/webhook → 更新数据库
  → Creem 跳转 successUrl: /dashboard?upgraded=true
  → 前端轮询 /api/saas/auth/me（最多 5 次，每次间隔 2s）直到 isPro=true
  → 确认 isPro=true 后显示 Toast：🎉 Welcome to Pro!
```

**升级成功 Toast 触发条件**：`?upgraded=true` query param 存在时开始轮询，Toast 仅在轮询确认 `isPro=true` 后显示，不在跳转后立即显示（防止伪造）。轮询超时（10 秒）后显示"支付成功，权益将在几分钟内生效"提示。

**`/api/saas/auth/me` 响应需包含 `usageResetAt`**：上传拦截卡片需要显示下次额度重置时间，`/auth/me` 的 select 字段需包含 `usageResetAt`。

---

## 7. 环境变量

```env
# Creem
CREEM_API_KEY=sk_live_xxx           # Creem 后台 → API Keys
CREEM_WEBHOOK_SECRET=whsec_xxx      # Creem 后台 → Webhooks
CREEM_PRODUCT_MONTHLY=prod_xxx      # 月订阅产品 ID
CREEM_PRODUCT_PASS=prod_xxx         # 一次性通行证产品 ID

# 跳转
WEB_BASE_URL=https://echohealth.example.com   # 支付成功/取消跳转基础 URL
```

---

## 8. 文件变更清单

### 前端（`apps/web/`）

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/app/pricing/page.tsx` | 新增 | 定价页（暖色情感风，双语） |
| `src/contexts/LanguageContext.tsx` | 新增 | 语言检测与切换 Context |
| `src/hooks/useT.ts` | 新增 | 翻译 hook |
| `src/lib/translations/en.ts` | 新增 | 英文文案 |
| `src/lib/translations/zh.ts` | 新增 | 中文文案 |
| `src/components/Navbar.tsx` | 修改 | 升级按钮 + 语言切换 |
| `src/components/QuotaBar.tsx` | 修改 | 额度耗尽时显示升级 CTA |
| `src/app/upload/page.tsx` | 修改 | 额度耗尽时替换为拦截卡片 |
| `src/app/dashboard/page.tsx` | 修改 | `?upgraded=true` 显示成功 Toast + 轮询 |
| `src/lib/constants.ts` | 修改 | 添加 `PRO_MONTHLY_PRICE`、`PASS_PRICE` 常量 |

### 后端（`apps/server/`）

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/routes/saas/creem.ts` | 新增 | checkout + webhook 路由 |
| `src/lib/creem.ts` | 新增 | Creem SDK 封装 |
| `src/app.ts` | 修改 | 注册 creem 路由 |
| `prisma/schema.prisma` | 修改 | Order 添加 `creemOrderId` 字段 |
| `prisma/migrations/` | 新增 | 对应 migration 文件 |

---

## 9. 不在本次范围内

- 现有页面（上传、结果、仪表板）的 i18n
- 订阅管理页（取消订阅入口 → 暂时让用户去 Creem 客户门户）
- 年付方案（待产品验证后加入）
- 退款流程（通过 Creem 后台手动处理）
