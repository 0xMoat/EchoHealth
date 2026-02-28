# Pro 升级链路设计

**日期**：2026-02-28
**状态**：已批准，待实现

---

## 产品决策

| 项目 | 决策 |
|------|------|
| 定价 | ¥18/月，按月订阅 |
| 支付方式 | 模拟支付（点击即升级，后续接真实微信支付） |
| 升级触达 | 首页横幅（额度耗尽时）+ 上传页拦截弹窗（429 时） |
| 升级页面 | 免费 vs Pro 权益对比卡片 |

---

## 架构

```
用户触达升级
  ├── 首页横幅（usedThisMonth >= 3）
  └── 上传页 429 拦截弹窗
        ↓
  /pages/upgrade/index.tsx（对比卡片 + 订阅按钮）
        ↓
  POST /orders { userId }
        ↓
  后端：创建 Order(PAID) + User.isPro=true + proExpireAt=now+30d
        ↓
  返回 { orderId, proExpireAt } → 前端提示成功
```

---

## 后端

### 新增 API

#### `POST /orders`
```
Body:   { userId: string }
Return: { orderId: string, proExpireAt: string }

逻辑：
1. 查找用户（404 if not found）
2. 创建 Order { amount: 1800, status: PAID, paidAt: now }
3. 更新 User { isPro: true, proExpireAt: now+30天 }
4. 返回 orderId + proExpireAt
```

#### `GET /user/:id`（新增）
```
Return: { id, isPro, usedThisMonth, proExpireAt }
用途：小程序启动时获取配额状态，决定是否显示升级横幅
```

### 修改：配额中间件

在现有逻辑前插入 Pro 到期检查：
```typescript
if (user.isPro && user.proExpireAt && user.proExpireAt < now) {
  await prisma.user.update({ where: { id: userId }, data: { isPro: false } })
  user.isPro = false
}
```

### 无需 Schema 变更
`Order`、`User.isPro`、`User.proExpireAt` 已预留。

---

## 前端

### 新增页面：`/pages/upgrade/index.tsx`

```
┌─────────────────────────────┐
│      升级 Pro 会员           │
│                             │
│  ┌──────────┬──────────┐    │
│  │  免费版  │  Pro 版  │    │
│  │          │  ✦推荐✦  │    │
│  ├──────────┼──────────┤    │
│  │ 3次/月   │ 30次/月  │    │
│  │ ✓ OCR   │ ✓ OCR   │    │
│  │ ✓ AI解读 │ ✓ AI解读 │    │
│  │ ✗ 优先队列│✓ 优先队列│    │
│  └──────────┴──────────┘    │
│                             │
│   [ 立即订阅  ¥18/月 ]       │
│   模拟支付，点击即升级        │
└─────────────────────────────┘
```

### 修改：首页 `/pages/index/index.tsx`

- 启动时调用 `GET /user/:id` 获取配额状态
- `usedThisMonth >= 3 && !isPro` 时在上传按钮上方显示：
  ```
  ⚡ 本月免费次数已用完 · 升级 Pro 继续使用 →
  ```
  点击跳转 `/pages/upgrade/index`

### 修改：上传页 `/pages/upload/index.tsx`

- POST /reports 收到 429 时，弹出底部弹窗：
  ```
  本月 3 次免费额度已用完
  升级 Pro 会员，享 30 次/月
  [ 立即升级 ]  [ 下月再来 ]
  ```
  点击「立即升级」跳转 `/pages/upgrade/index`

---

## 测试

### 单元测试（新增）

- `orders.test.ts`
  - POST /orders：创建订单 + 升级 Pro（验证 isPro=true、proExpireAt ~30天后）
  - 重复购买：proExpireAt 从当前时间重新计算（不叠加）
  - 404：用户不存在

- `quota.test.ts`（补充）
  - Pro 到期自动降级：proExpireAt < now → isPro 重置为 false，走免费限额逻辑

### 集成测试（新增）

- `orders.integration.test.ts`：真实 PG
  - 验证 Order 落库（status=PAID, amount=1800）
  - 验证 User.isPro=true、proExpireAt 在 30 天后 ±5s 内

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `apps/server/src/routes/orders.ts` | 新增 |
| `apps/server/src/routes/user.ts` | 新增 |
| `apps/server/src/app.ts` | 注册两个新路由 |
| `apps/server/src/middleware/quota.ts` | 加 Pro 到期检查 |
| `apps/server/src/__tests__/orders.test.ts` | 新增 |
| `apps/server/src/__tests__/quota.test.ts` | 补充 case |
| `apps/server/src/__tests__/integration/orders.integration.test.ts` | 新增 |
| `apps/miniprogram/src/pages/upgrade/index.tsx` | 新增 |
| `apps/miniprogram/src/pages/upgrade/index.css` | 新增 |
| `apps/miniprogram/src/pages/index/index.tsx` | 加横幅 |
| `apps/miniprogram/src/pages/upload/index.tsx` | 加拦截弹窗 |
| `apps/miniprogram/src/app.config.ts` | 注册 upgrade 页面 |
