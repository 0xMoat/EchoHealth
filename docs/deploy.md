# EchoHealth 部署指南

**最后更新：** 2026-03-14

---

## 目录

- [架构概览](#架构概览)
- [本地开发环境](#本地开发环境)
- [环境变量参考](#环境变量参考)
- [测试](#测试)
- [生产部署（Docker）](#生产部署docker)
- [生产部署（PM2 裸机）](#生产部署pm2-裸机)
- [当前测试环境](#当前测试环境)
- [Sentry 错误追踪](#sentry-错误追踪)
- [小程序发布](#小程序发布)
- [常见问题](#常见问题)

---

## 架构概览

```mermaid
graph TB
    subgraph 本地 / 服务器
        API[Fastify API<br/>Port 3000]
        Worker[BullMQ Worker<br/>独立进程]
        PG[(PostgreSQL 16)]
        Redis[(Redis 7)]
    end

    subgraph 腾讯云
        OCR[OCR 服务]
        COS[对象存储 COS]
    end

    subgraph 第三方
        WX[微信 API]
        LLM[OpenRouter / Claude]
        TTS[edge-tts<br/>本地命令]
    end

    API --> PG
    API --> Redis
    Worker --> Redis
    Worker --> PG
    Worker --> OCR
    Worker --> LLM
    Worker --> TTS
    Worker --> COS
    API --> WX
```

---

## 本地开发环境

### 1. 前置依赖

| 工具 | 版本要求 | 安装方式 |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| Docker | 任意最新版 | [docker.com](https://docker.com) |
| edge-tts | 任意 | `pip install edge-tts` |

### 2. 启动基础服务

```bash
# PostgreSQL（首次创建后可复用）
docker run -d \
  --name echohealth-pg \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=echohealth \
  -p 5432:5432 \
  postgres:16

# Redis
docker run -d \
  --name echohealth-redis \
  -p 6379:6379 \
  redis:7
```

> 停止后重启：`docker start echohealth-pg echohealth-redis`

### 3. 安装依赖

```bash
# 在仓库根目录执行
pnpm install
```

### 4. 配置环境变量

```bash
cd apps/server
cp .env.example .env
# 编辑 .env，填入真实值（见下方环境变量参考）
```

最少需要填写以下变量才能完成一次完整流水线：

| 变量 | 用途 | 获取方式 |
|------|------|---------|
| `DATABASE_URL` | 数据库连接 | 默认值可用（Docker 启动后） |
| `REDIS_URL` | 队列连接 | 默认值可用（Docker 启动后） |
| `OPENROUTER_API_KEY` | LLM 脚本生成 | [openrouter.ai](https://openrouter.ai) 免费注册 |
| `TENCENT_SECRET_ID/KEY` | OCR 识别 | 腾讯云控制台 |
| `COS_*` | 图片/视频存储 | 腾讯云控制台 |
| `WX_APPID / WX_SECRET` | 微信登录 | 微信公众平台 |

### 5. 初始化数据库

```bash
cd apps/server
pnpm db:migrate    # 执行所有迁移
pnpm db:generate   # 生成 Prisma Client
```

### 6. 启动服务

需要开启两个终端（API 和 Worker 是独立进程）：

```bash
# 终端 1：API 服务
cd apps/server
pnpm dev           # 监听 http://localhost:3000

# 终端 2：BullMQ Worker
cd apps/server
npx tsx watch src/worker.ts
```

### 7. 验证启动

```bash
curl http://localhost:3000/health
# 期望返回: {"status":"ok"}
```

### 8. 调试 UI（可选）

打开 `apps/debug-ui/index.html`，配置 API URL 为 `http://localhost:3000`，可直接串联调用所有接口。

---

## 环境变量参考

完整变量列表及说明（对应 `apps/server/.env.example`）：

### 服务配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | API 监听端口 |

### 数据库

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgresql://postgres:pass@localhost:5432/echohealth` | PostgreSQL 连接字符串 |

### Redis

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接字符串 |

### LLM（二选一）

| 变量 | 说明 |
|------|------|
| `OPENROUTER_API_KEY` | **优先使用**，测试阶段推荐（免费模型） |
| `OPENROUTER_MODEL` | 可选，默认 `qwen/qwen3-coder:free`（1M context） |
| `CLAUDE_API_KEY` | 生产阶段推荐，Anthropic Claude API |
| `CLAUDE_MODEL` | 可选，默认 `claude-sonnet-4-6` |

> 两个 Key 同时存在时，`OPENROUTER_API_KEY` 优先。

### 腾讯云 OCR

| 变量 | 说明 |
|------|------|
| `TENCENT_SECRET_ID` | 腾讯云 API 密钥 ID |
| `TENCENT_SECRET_KEY` | 腾讯云 API 密钥 Key |
| `TENCENT_OCR_REGION` | OCR 服务地域，默认 `ap-guangzhou` |

### 腾讯云 COS

| 变量 | 说明 |
|------|------|
| `COS_SECRET_ID` | COS 密钥 ID（建议使用子账号最小权限） |
| `COS_SECRET_KEY` | COS 密钥 Key |
| `COS_BUCKET` | 存储桶名称，格式 `bucketname-appid` |
| `COS_REGION` | 存储桶地域，默认 `ap-guangzhou` |

### 微信小程序

| 变量 | 说明 |
|------|------|
| `WX_APPID` | 微信小程序 AppID |
| `WX_SECRET` | 微信小程序 AppSecret |

### Sentry 错误追踪

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SENTRY_DSN` | （空，Sentry 自动禁用） | Sentry 项目 DSN，必须设为**系统环境变量**（不能只写在 `.env` 中） |

> **为什么不能写在 `.env`？** Sentry 通过 `--import ./dist/instrument.js` 在 Node.js 启动时最先加载，此时 `dotenv` 尚未执行，因此 `.env` 中的变量不可用。必须通过 Docker `-e`、`docker-compose.yml` 的 `environment`、或系统 `export` 设置。

---

## 测试

### 单元测试

```bash
cd apps/server
pnpm test                  # 运行所有单元测试
pnpm test:watch            # 监听模式
```

### 集成测试（需要 Docker）

集成测试使用 testcontainers 自动启动 PostgreSQL 和 Redis 容器：

```bash
cd apps/server
pnpm test:integration      # 运行集成测试
```

> 前置条件：本地 Docker 守护进程必须运行（OrbStack 或 Docker Desktop）

### 测试覆盖范围

| 测试文件 | 覆盖内容 |
|----------|---------|
| `app.test.ts` | Fastify 路由注册、health check |
| `sentry.test.ts` | Sentry captureException 在 pipeline 失败时被调用，带 reportId tag |
| `worker.test.ts` | Worker pipeline 流程 |
| `llm.test.ts` | LLM 脚本生成 |
| `upload.test.ts` | 文件上传到 COS |
| `orders.test.ts` | 订单相关路由 |
| `quota.test.ts` | 配额中间件 |
| `ocr.test.ts` | OCR 文本解析 |
| `tts.test.ts` | TTS 音频生成 |

### 验证 Sentry 集成

```bash
# 运行 Sentry 专项测试
cd apps/server && npx vitest run src/__tests__/sentry.test.ts

# 期望：captureException 被调用，参数包含 { tags: { reportId: 'report-1' } }
```

---

## 生产部署（Docker）

### Dockerfile

项目根目录的 `Dockerfile` 基于 `node:20-slim`，已包含：
- Chromium（Remotion 视频渲染）
- edge-tts（Python TTS）
- fonts-noto-cjk（中文字体）

### 构建镜像

```bash
docker build -t echohealth .
```

### 启动容器

```bash
# API 进程
docker run -d \
  --name echohealth-api \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/echohealth" \
  -e REDIS_URL="redis://host:6379" \
  -e SENTRY_DSN="https://xxx@xxx.ingest.us.sentry.io/xxx" \
  -e OPENROUTER_API_KEY="sk-..." \
  -e TENCENT_SECRET_ID="..." \
  -e TENCENT_SECRET_KEY="..." \
  -e COS_SECRET_ID="..." \
  -e COS_SECRET_KEY="..." \
  -e COS_BUCKET="..." \
  -e COS_REGION="ap-guangzhou" \
  -e WX_APPID="..." \
  -e WX_SECRET="..." \
  echohealth \
  sh -c "npx prisma migrate deploy && node --import ./dist/instrument.js dist/index.js"

# Worker 进程
docker run -d \
  --name echohealth-worker \
  --restart unless-stopped \
  -e DATABASE_URL="postgresql://user:pass@host:5432/echohealth" \
  -e REDIS_URL="redis://host:6379" \
  -e SENTRY_DSN="https://xxx@xxx.ingest.us.sentry.io/xxx" \
  -e OPENROUTER_API_KEY="sk-..." \
  -e TENCENT_SECRET_ID="..." \
  -e TENCENT_SECRET_KEY="..." \
  -e COS_SECRET_ID="..." \
  -e COS_SECRET_KEY="..." \
  -e COS_BUCKET="..." \
  -e COS_REGION="ap-guangzhou" \
  echohealth \
  node --import ./dist/instrument.js dist/queue/start-worker.js
```

### 更新部署

```bash
# 拉取最新代码并重新构建
git pull
docker build -t echohealth .

# 重启容器
docker stop echohealth-api echohealth-worker
docker rm echohealth-api echohealth-worker
# 重新执行上面的 docker run 命令
```

---

## 生产部署（PM2 裸机）

> 适用于不使用 Docker 的场景，直接在服务器上运行 Node.js。

### 架构：单台云服务器 + 托管数据库

```mermaid
graph LR
    Internet --> LB[Nginx 反向代理]
    LB --> API[Node.js API<br/>PM2 守护]
    LB --> Worker[BullMQ Worker<br/>PM2 守护]
    API --> PG[(腾讯云 TDSQL<br/>PostgreSQL)]
    API --> Redis[(腾讯云 Redis)]
    Worker --> PG
    Worker --> Redis
```

### 步骤

**1. 服务器环境准备**

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 pnpm
npm i -g pnpm

# 安装 PM2
npm i -g pm2

# 安装 edge-tts（TTS 依赖）
pip install edge-tts
```

**2. 拉取代码**

```bash
git clone https://github.com/0xMoat/EchoHealth.git
cd EchoHealth
pnpm install
```

**3. 配置环境变量**

```bash
cd apps/server
cp .env.example .env
# 编辑 .env，填入生产环境配置
# DATABASE_URL 指向托管 PostgreSQL
# REDIS_URL 指向托管 Redis
# CLAUDE_API_KEY 替代 OPENROUTER_API_KEY（生产推荐）
```

**4. 构建和迁移**

```bash
cd apps/server
pnpm build            # 编译 TypeScript → dist/
pnpm db:migrate       # 应用数据库迁移（需要生产 DATABASE_URL）
```

**5. 用 PM2 启动**

```bash
# 创建 ecosystem.config.cjs（项目根目录）
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'echohealth-api',
      script: 'dist/index.js',
      cwd: '/path/to/EchoHealth/apps/server',
      node_args: '--import ./dist/instrument.js',
      env_file: '.env',
      env: {
        SENTRY_DSN: 'https://xxx@xxx.ingest.us.sentry.io/xxx',
      },
      instances: 1,
      autorestart: true,
    },
    {
      name: 'echohealth-worker',
      script: 'dist/queue/start-worker.js',
      cwd: '/path/to/EchoHealth/apps/server',
      node_args: '--import ./dist/instrument.js',
      env_file: '.env',
      env: {
        SENTRY_DSN: 'https://xxx@xxx.ingest.us.sentry.io/xxx',
      },
      instances: 1,
      autorestart: true,
    },
  ],
}
EOF

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # 配置开机自启
```

> **注意：** `SENTRY_DSN` 必须写在 PM2 的 `env` 中（不能只依赖 `.env` 文件），因为 `--import` 在 `dotenv` 之前执行。

**6. Nginx 反向代理**

```nginx
server {
    listen 80;
    server_name api.echohealth.app;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 20m;  # 图片上传限制
    }
}
```

> 配置 HTTPS 推荐使用 Certbot：`certbot --nginx -d api.echohealth.app`

---

## 当前测试环境

| 项目 | 值 |
|------|-----|
| 服务器 | Oracle Cloud `137.131.22.123` |
| 操作系统 | Ubuntu（用户 `ubuntu`） |
| SSH | `ssh n8n`（~/.ssh/config 已配置） |
| SSH Key | `~/.ssh/oracle-ssh-keys/ssh-key-2025-07-12.key` |
| API 地址 | `http://137.131.22.123:3000` |
| 小程序 dev 配置 | `apps/miniprogram/config/dev.ts` → `API_BASE_URL: "http://137.131.22.123:3000"` |

### 部署验证

```bash
# 1. API 健康检查
curl http://137.131.22.123:3000/health
# 期望: {"status":"ok"}

# 2. SSH 登录查看服务状态
ssh n8n
docker ps                        # 查看运行中的容器
docker logs echohealth-api       # 查看 API 日志
docker logs echohealth-worker    # 查看 Worker 日志
```

---

## Sentry 错误追踪

### 架构

```mermaid
graph LR
    API[Fastify API] -->|captureException| Sentry
    Worker[BullMQ Worker] -->|captureException + reportId tag| Sentry
    Sentry -->|Alert Rule| TG[Telegram Bot]
```

### 工作方式

1. **`instrument.ts`** — Sentry SDK 初始化入口，通过 `node --import ./dist/instrument.js` 在所有模块加载前执行
2. **API 进程** — `Sentry.setupFastifyErrorHandler(app)` 自动捕获路由异常；`beforeSend` 过滤 4xx 只上报 5xx
3. **Worker 进程** — pipeline catch 块中 `Sentry.captureException(err, { tags: { reportId } })` 手动上报
4. **优雅退出** — API 启动失败和 Worker SIGTERM 时调用 `Sentry.flush(2000)` 确保事件发送完毕

### 配置步骤

1. 在服务器上设置 `SENTRY_DSN` 环境变量（Docker `-e` 或 PM2 `env`）
2. （可选）Sentry 控制台 → Settings → Integrations → Telegram → 绑定 Bot + 群组
3. （可选）Sentry 控制台 → Alerts → Create Alert Rule → 选择触发条件 → 通知到 Telegram

### 本地开发

本地不设置 `SENTRY_DSN` 即可，Sentry 自动禁用（`enabled: !!process.env.SENTRY_DSN`）。

---

## 小程序发布

### 1. 修改 API 地址

编辑 `apps/miniprogram/src/utils/request.ts`（或全局配置），将 `BASE_URL` 改为生产 API 地址：

```typescript
const BASE_URL = 'https://api.echohealth.app'
```

### 2. 微信公众平台配置

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. **开发 → 开发管理 → 服务器域名**，添加：
   - request 合法域名：`https://api.echohealth.app`
   - uploadFile 合法域名：`https://api.echohealth.app`

### 3. 构建并上传

```bash
cd apps/miniprogram
pnpm build:weapp    # 编译小程序

# 然后在微信开发者工具中：
# 1. 打开 dist/weapp 目录
# 2. 点击「上传」
# 3. 在微信公众平台提交审核
```

---

## 常见问题

### Worker 没有处理任务

检查 Redis 连接和 Worker 进程是否正常：

```bash
# 查看队列状态（本地开发）
cd apps/server && npx tsx -e "
import { Queue } from 'bullmq';
const q = new Queue('generate', { connection: { host: 'localhost', port: 6379 } });
console.log(await q.getJobCounts());
"
```

### 数据库迁移失败

确认 PostgreSQL 已启动且 `DATABASE_URL` 正确，然后重置并重新迁移：

```bash
pnpm db:migrate    # 如果提示 schema drift，按提示 reset
```

### Remotion 渲染失败（找不到 Chrome）

```bash
# 指定 Chrome 路径
echo 'CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' >> .env
```

### TTS 命令找不到

```bash
pip install edge-tts
# 验证
edge-tts --version
```

### OCR 识别结果为空

确认腾讯云账号已开通 **通用印刷体识别（高精度版）** 服务，且 `TENCENT_SECRET_ID/KEY` 有对应权限。

---

## 健康检查

部署后验证各组件：

```bash
# 1. API 存活
curl https://api.echohealth.app/health

# 2. 完整流水线（需要真实微信 code）
# 参考 apps/debug-ui/index.html 进行端到端测试
```
