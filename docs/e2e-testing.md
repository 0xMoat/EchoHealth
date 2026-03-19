# E2E 测试指南

EchoHealth Web 端（`apps/web`）使用 **Playwright** 进行端到端测试，覆盖全部用户流程。

## 架构概览

```
apps/web/
├── playwright.config.ts            # Playwright 配置（双 webServer + 容器管理）
├── e2e/
│   ├── global-setup.ts             # 启动 OrbStack 容器 + Prisma migrate
│   ├── global-teardown.ts          # 可选销毁容器
│   ├── helpers/auth.ts             # 登录/种子数据/清理工具函数
│   ├── fixtures/test-report.jpg    # 测试用健康报告图片
│   ├── landing.spec.ts             # 落地页（6 tests）
│   ├── auth.spec.ts                # 认证流程（5 tests）
│   ├── dashboard.spec.ts           # 仪表盘（7 tests）
│   ├── upload.spec.ts              # 上传流程（7 tests）
│   ├── result.spec.ts              # 报告结果页（8 tests）
│   ├── pricing.spec.ts             # 定价页（5 tests）
│   ├── payment.spec.ts             # Creem 支付（7 tests）
│   ├── i18n.spec.ts                # 国际化（6 tests）
│   ├── responsive.spec.ts          # 移动端响应式（6 tests）
│   └── smoke.spec.ts               # 全流程冒烟测试（4 tests）
docker-compose.test.yml             # 测试专用 PostgreSQL + Redis 容器
```

## 快速开始

### 前置条件

- OrbStack（或 Docker Desktop）已安装并运行
- `pnpm install` 已执行
- Chromium 已安装：`npx playwright install chromium`

### 一键运行

```bash
# 运行全部测试（自动启动容器 → migrate → 测试 → 保留容器）
pnpm test:e2e

# 带可视化 UI 界面运行（调试用）
pnpm test:e2e:ui

# 有头浏览器（看到真实浏览器操作）
pnpm --filter web test:e2e:headed

# 只跑冒烟测试
pnpm --filter web test:e2e:smoke

# 跑完后销毁容器
E2E_CLEANUP=true pnpm test:e2e
```

不需要手动启动任何服务。Playwright 会自动：
1. 通过 `globalSetup` 启动 Docker 容器（PostgreSQL:5433 + Redis:6380）
2. 执行 `prisma migrate deploy`
3. 启动 Fastify server（端口 3000）和 Next.js dev server（端口 3001）
4. 运行测试
5. 通过 `globalTeardown` 决定是否销毁容器

## 容器生命周期

```mermaid
graph TD
    A[pnpm test:e2e] --> B[globalSetup]
    B --> C{容器已运行?}
    C -->|是| D[跳过启动]
    C -->|否| E["docker compose up -d --wait"]
    D --> F[等待 healthcheck]
    E --> F
    F --> G[prisma migrate deploy]
    G --> H[运行测试]
    H --> I[globalTeardown]
    I --> J{"E2E_CLEANUP=true<br/>或 CI?"}
    J -->|是| K["docker compose down -v<br/>销毁容器 + 数据"]
    J -->|否| L["保留容器<br/>下次秒启动"]
```

### 端口隔离

| 服务 | Dev 端口 | E2E 测试端口 | 说明 |
|------|----------|-------------|------|
| PostgreSQL | 5432 | **5433** | 不与本地开发冲突 |
| Redis | 6379 | **6380** | 不与本地开发冲突 |
| Fastify Server | 3000 | 3000 | `reuseExistingServer` 避免冲突 |
| Next.js Web | 3001 | 3001 | `reuseExistingServer` 避免冲突 |

### 数据隔离

- PostgreSQL 使用 `tmpfs`（内存文件系统），数据不落盘，容器销毁即清零
- 每个测试用例创建独立的 `@e2e.local` 测试用户，`afterEach` 自动清理
- 测试数据库 `echohealth_test` 与开发数据库完全隔离

### 手动管理容器

```bash
# 手动启动
docker compose -f docker-compose.test.yml up -d

# 手动销毁（含数据卷）
docker compose -f docker-compose.test.yml down -v
# 或
pnpm --filter web test:e2e:cleanup
```

## Mock 策略

### 视频生成 → Mock

视频管线（OCR → LLM → TTS → Remotion → COS）耗时 2-5 分钟、消耗 API 额度，不适合 e2e 测试。

**实现方式**：环境变量 `TEST_FAST_VIDEO=true`（在 `playwright.config.ts` 中已设置）

- Worker 检测到此变量后跳过整条管线
- 直接将 report 标记为 `COMPLETED`，写入 dummy video 记录
- 全程 < 1 秒

代码位置：`apps/server/src/queue/worker.ts` 中的 `runPipeline` 函数开头。

### Google OAuth → 测试专用端点

无法自动化 Google 同意屏幕，通过测试端点绕过：

```
POST /api/saas/auth/test-login
Body: { email, nickname, isPro }
Response: { userId, isPro, email } + Set-Cookie: token=JWT
```

**安全保障**：仅在 `NODE_ENV !== 'production'` 时注册此路由。

辅助端点（均需认证）：

| 端点 | 用途 |
|------|------|
| `POST /api/saas/auth/test-seed-report` | 种子报告数据（支持指定 status、withVideo） |
| `POST /api/saas/auth/test-update-report` | 更新报告状态（测试 polling 过渡） |
| `POST /api/saas/auth/test-cleanup` | 清理 `@e2e.local` 用户及关联数据 |

代码位置：`apps/server/src/routes/saas/test-auth.ts`

### Creem 支付 → 真实测试模式

Creem 提供独立的测试环境，可用真实 API 测试：

- 测试 API：`https://test-api.creem.io`（使用 `creem_test_*` 开头的 API Key 自动选择）
- 测试银行卡：`4242 4242 4242 4242`，任意未来日期，任意 CVC
- Webhook 签名验证正常工作

如未配置 `CREEM_API_KEY`，支付相关测试会自动 `test.skip`。

### 数据库 → 真实（隔离容器）

使用 `docker-compose.test.yml` 提供的 PostgreSQL + Redis 容器，与开发环境完全隔离。

## 测试用例总览

### landing.spec.ts（落地页）
- Hero 区域渲染及 CTA
- Benefits 区块可见
- 定价预览显示三档（Free / $4.99 / $7.99）
- Footer 及导航链接
- CTA 导航到上传页

### auth.spec.ts（认证）
- 登录页渲染 Google 按钮
- 保护路由（/upload、/dashboard）未登录时重定向到 /login
- 测试登录后可访问保护路由
- 登出后会话清除
- 认证状态跨页面导航保持

### dashboard.spec.ts（仪表盘）
- 欢迎信息与用户名
- 配额条显示使用量
- 无报告时显示空状态
- 有报告时显示列表
- 报告卡片链接到结果页
- "New Report" 按钮导航
- Pro 用户显示 30 配额上限

### upload.spec.ts（上传）
- 文件选择器上传
- 语言选择按钮交互
- 无文件时提交按钮禁用
- 完整流程：选择文件 → 提交 → 重定向到 /result
- 剩余配额显示
- 文件移除

### result.spec.ts（结果页）
- COMPLETED 状态：视频播放器、下载按钮、"再传一份"链接
- PENDING 状态：等待 UI
- PROCESSING 状态：进度 UI
- FAILED 状态：错误信息
- 不存在的报告 ID 显示 404
- **Polling 过渡测试**：PENDING → COMPLETED 自动更新 UI

### pricing.spec.ts（定价页）
- 三档价格渲染
- 功能列表正确
- 结账按钮触发 Creem checkout
- Pro 用户显示 "Current Plan"
- 免登录可访问

### payment.spec.ts（支付）
- Creem checkout API 返回有效 URL（monthly / pass）
- 拒绝无效 plan
- 未认证返回 401
- 完整结账流程：定价页 → Creem 支付页
- 测试银行卡 4242 完成支付（需配置 CREEM_API_KEY）
- Webhook 签名验证拒绝无效签名

### i18n.spec.ts（国际化）
- 默认英文
- 切换到中文
- 切回英文
- 语言跨页面导航保持
- 语言刷新后保持（localStorage）
- 定价页中文翻译

### responsive.spec.ts（移动端，iPhone 14 视口）
- 落地页无水平溢出
- 汉堡菜单打开显示导航
- 上传页可用性
- 定价页卡片排列
- 报告卡片可点击
- 视频播放器适配视口宽度

### smoke.spec.ts（全流程冒烟）
- **核心流程**：login → upload → view result（含 TEST_FAST_VIDEO 自动完成）
- Dashboard 创建后显示报告
- 导航流：landing → pricing → login → dashboard
- Pro 用户上传页显示更高限额

## CI 集成

在 GitHub Actions 中使用：

```yaml
- name: Run E2E tests
  env:
    CI: true
    E2E_CLEANUP: true
  run: pnpm test:e2e
```

CI 模式下的行为差异：
- `forbidOnly: true` — 禁止 `.only` 遗留
- `retries: 2` — 失败重试 2 次
- `workers: 1` — 串行执行（稳定性优先）
- `reuseExistingServer: false` — 总是启动新 server
- 测试结束后自动销毁容器

## 故障排查

### 容器启动失败
```bash
# 检查 OrbStack 是否运行
orb status

# 检查端口是否被占用
lsof -i :5433
lsof -i :6380
```

### Prisma migrate 失败
```bash
# 手动重建测试数据库
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d --wait
DATABASE_URL=postgresql://postgres:test@localhost:5433/echohealth_test npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma
```

### Server 启动失败
```bash
# 检查 3000 端口是否被占用
lsof -i :3000

# 如果已有 dev server 在运行，Playwright 会复用它（reuseExistingServer）
# 但要确保它连接的是测试数据库而非生产数据库
```
