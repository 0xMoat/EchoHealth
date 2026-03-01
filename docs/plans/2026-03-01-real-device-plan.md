# 真机联调 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 分两阶段完成真机联调：Phase 1 用 curl/Bruno 验证完整后端 pipeline，Phase 2 小程序真机跑通全流程。

**Architecture:** Phase 1 不依赖微信注册，通过 dev seed 脚本创建测试用户，直接 HTTP 调用验证 OCR→LLM→TTS→Render→COS 链路；Phase 2 填入真实 AppID，局域网 IP 联调小程序。

**Tech Stack:** Fastify + Prisma + tsx（seed 脚本）；Taro 4 小程序；Bruno（HTTP 客户端）

---

## Phase 1 — 后端 Pipeline 验证

### Task 1: 配置环境变量并启动基础设施

**Files:**
- Copy: `apps/server/.env.example` → `apps/server/.env`

**Step 1: 复制 .env 并填入凭证**

```bash
cp apps/server/.env.example apps/server/.env
```

然后编辑 `apps/server/.env`，填写以下 7 个字段（其余保持默认）：

```env
TENCENT_SECRET_ID=<腾讯云 CAM 控制台 → 访问密钥>
TENCENT_SECRET_KEY=<同上>
COS_SECRET_ID=<同 TENCENT_SECRET_ID，可复用>
COS_SECRET_KEY=<同 TENCENT_SECRET_KEY，可复用>
COS_BUCKET=<COS 桶名，格式：echohealth-1234567890>
COS_REGION=ap-guangzhou
OPENROUTER_API_KEY=<openrouter.ai 注册后复制>
```

> COS_BUCKET 格式说明：`<桶名>-<AppID>`，AppID 是腾讯云账号的数字 ID，在 COS 控制台桶列表可见。

**Step 2: 启动 OrbStack 容器**

确保 OrbStack 已运行，然后：

```bash
docker run -d --name pg-echohealth \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=echohealth \
  -p 5432:5432 postgres:16-alpine

docker run -d --name redis-echohealth \
  -p 6379:6379 redis:7-alpine
```

验证：`docker ps` 看到两个容器均为 Up 状态。

**Step 3: 初始化数据库 schema**

```bash
cd apps/server
pnpm db:migrate
```

期望：提示 `All migrations have been applied`（或 `No pending migrations`）。

**Step 4: 启动后端**

```bash
pnpm dev
```

期望：输出 `Server listening at http://0.0.0.0:3000`，无 `Missing ... environment variables` 错误。

---

### Task 2: 添加开发用 seed 脚本

**Files:**
- Create: `apps/server/src/scripts/seed-dev-user.ts`

> 目的：Phase 1 没有真实微信 AppID，无法通过 `POST /auth/login` 创建用户。此脚本直接用 Prisma 插入测试用户，输出 userId 供后续 API 调用使用。

**Step 1: 创建 seed 脚本**

新建 `apps/server/src/scripts/seed-dev-user.ts`：

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { openid: 'dev-test-openid' },
    create: {
      openid: 'dev-test-openid',
      nickname: 'Dev Test User',
      usedThisMonth: 0,
      usageResetAt: new Date(),
    },
    update: {},
  })

  console.log('✅ Dev user ready:')
  console.log('  userId:', user.id)
  console.log('  isPro:', user.isPro)
  console.log('')
  console.log('Use this userId in your API calls.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Step 2: 运行脚本**

```bash
cd apps/server
npx tsx src/scripts/seed-dev-user.ts
```

期望输出：
```
✅ Dev user ready:
  userId: cm...（复制这个值）
  isPro: false

Use this userId in your API calls.
```

**Step 3: Commit**

```bash
git add apps/server/src/scripts/seed-dev-user.ts
git commit -m "chore: add dev seed script for pipeline testing"
```

---

### Task 3: 创建 Bruno API Collection

**Files:**
- Create: `bruno/echohealth/bruno.json`
- Create: `bruno/echohealth/environments/local.bru`
- Create: `bruno/echohealth/upload-image.bru`
- Create: `bruno/echohealth/create-report.bru`
- Create: `bruno/echohealth/get-report.bru`

> Bruno 是轻量 API 客户端（类 Postman），文件存代码库，无需账号。安装：`brew install bruno`

**Step 1: 初始化 Bruno collection**

```bash
mkdir -p bruno/echohealth/environments
```

新建 `bruno/echohealth/bruno.json`：
```json
{
  "version": "1",
  "name": "EchoHealth",
  "type": "collection"
}
```

**Step 2: 创建 local 环境变量**

新建 `bruno/echohealth/environments/local.bru`：
```
vars {
  base_url: http://localhost:3000
  user_id: PASTE_USER_ID_FROM_SEED_SCRIPT
}
```

> 将 `PASTE_USER_ID_FROM_SEED_SCRIPT` 替换为 Task 2 输出的真实 userId。

**Step 3: 上传图片请求**

新建 `bruno/echohealth/upload-image.bru`：
```
meta {
  name: Upload Image
  type: http
  seq: 1
}

post {
  url: {{base_url}}/upload/image
  body: multipartForm
  auth: none
}

headers {
  x-user-id: {{user_id}}
}

body:multipart-form {
  file: @file(/path/to/your/medical-report.jpg)
}
```

> 将 `/path/to/your/medical-report.jpg` 改为本地真实体检报告照片的路径（任何清晰的图片均可测试 pipeline，但真实报告效果最佳）。

**Step 4: 创建报告请求**

新建 `bruno/echohealth/create-report.bru`：
```
meta {
  name: Create Report
  type: http
  seq: 2
}

post {
  url: {{base_url}}/reports
  body: json
  auth: none
}

headers {
  Content-Type: application/json
  x-user-id: {{user_id}}
}

body:json {
  {
    "userId": "{{user_id}}",
    "reportType": "血常规",
    "photoUrls": ["PASTE_IMAGE_URL_FROM_UPLOAD"]
  }
}
```

> 将 `PASTE_IMAGE_URL_FROM_UPLOAD` 替换为上一步 upload 返回的 COS URL。

**Step 5: 查询报告状态请求**

新建 `bruno/echohealth/get-report.bru`：
```
meta {
  name: Get Report Status
  type: http
  seq: 3
}

get {
  url: {{base_url}}/reports/PASTE_REPORT_ID
  body: none
  auth: none
}
```

> 将 `PASTE_REPORT_ID` 替换为 create-report 响应中的 `reportId`。

**Step 6: Commit**

```bash
git add bruno/
git commit -m "chore: add Bruno API collection for pipeline testing"
```

---

### Task 4: 执行 Pipeline 验证

> 这是一个手动验证任务，不需要写代码。目标：在 Bruno 中按序执行三个请求，确认视频生成成功。

**Step 1: 打开 Bruno，加载 collection**

安装 Bruno 桌面版或 CLI：
```bash
brew install bruno   # GUI 版
# 或 CLI 版：npm install -g @usebruno/cli
```

打开 Bruno → File → Open Collection → 选择 `bruno/echohealth/` 目录。
选择 `local` 环境。

**Step 2: 上传图片**

运行 `Upload Image` 请求（选择你的体检报告图片文件）。

期望：`200 OK`，响应体：
```json
{ "url": "https://echohealth-xxxxxxxx.cos.ap-guangzhou.myqcloud.com/images/..." }
```

将这个 URL 填入 `create-report.bru` 的 `photoUrls`。

**Step 3: 创建报告**

运行 `Create Report` 请求。

期望：`201 Created`，响应体：
```json
{ "reportId": "cm..." }
```

将 `reportId` 填入 `get-report.bru` 的 URL。

**Step 4: 轮询状态**

每隔 10-30 秒运行一次 `Get Report Status`，观察 `status` 字段变化：
`PENDING` → `PROCESSING` → `COMPLETED`

完整流程预计耗时：1-3 分钟（取决于 Remotion 渲染速度）。

期望最终响应：
```json
{
  "id": "cm...",
  "status": "COMPLETED",
  "videoUrl": "https://echohealth-xxxxxxxx.cos.ap-guangzhou.myqcloud.com/videos/.../xxx.mp4"
}
```

**Step 5: 验证视频**

在浏览器打开 `videoUrl`，应能直接播放一段体检报告讲解视频。

Phase 1 验证完成 ✅

---

## Phase 2 — 小程序真机联调（微信注册完成后）

### Task 5: 填写微信凭证 + 更新配置

**Files:**
- Modify: `apps/server/.env`
- Modify: `apps/miniprogram/project.config.json`
- Modify: `apps/miniprogram/config/index.ts`

**Step 1: 填写微信凭证**

在 `apps/server/.env` 填写：
```env
WX_APPID=wx<你的真实AppID>
WX_SECRET=<你的真实AppSecret>
```

凭证获取路径：[mp.weixin.qq.com](https://mp.weixin.qq.com) → 开发 → 开发管理 → 开发设置。

**Step 2: 更新小程序 project.config.json**

修改 `apps/miniprogram/project.config.json`：
```json
{
  "appid": "wx<你的真实AppID>",
  ...
}
```

**Step 3: 更新开发模式 API_BASE_URL**

查看本机局域网 IP：
```bash
ipconfig getifaddr en0
# 输出类似：192.168.1.42
```

修改 `apps/miniprogram/config/index.ts`，将 dev `API_BASE_URL` 改为：
```typescript
env: {
  API_BASE_URL: JSON.stringify(
    process.env.NODE_ENV === 'production'
      ? 'https://api.echohealth.example.com'
      : 'http://192.168.1.42:3000',  // ← 改为你的局域网 IP
  ),
},
```

**Step 4: 重启后端（确保绑定到 0.0.0.0）**

确认 `apps/server/src/index.ts` 的监听地址是 `0.0.0.0`（非 `127.0.0.1`），这样局域网内其他设备才能访问。

如果是 `127.0.0.1`，修改为：
```typescript
await app.listen({ port: 3000, host: '0.0.0.0' })
```

然后重启：`pnpm dev`

从手机浏览器访问 `http://192.168.1.42:3000/health`，期望返回 `{"status":"ok"}`。

**Step 5: Commit 配置变更**

```bash
# 注意：.env 不应提交，project.config.json 和 config/index.ts 可提交
git add apps/miniprogram/project.config.json apps/miniprogram/config/index.ts
git commit -m "feat(miniprogram): set local IP for real-device debug"
```

---

### Task 6: 编译小程序 + 真机调试

**Step 1: 编译小程序**

```bash
cd apps/miniprogram
pnpm build:weapp
```

期望：`dist/` 目录生成，无编译错误。

**Step 2: 在微信开发者工具中加载**

1. 打开微信开发者工具（需已安装：[developers.weixin.qq.com/miniprogram/dev/devtools/download.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)）
2. 新建项目 → 项目目录选择 `apps/miniprogram/dist/` → AppID 填入真实值
3. 勾选 **"详情" → "本地设置" → "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"**

**Step 3: 真机调试**

工具栏点击 **"真机调试"** → 用手机微信扫码 → 小程序在真机运行。

**Step 4: 走完整业务流程**

1. 首次进入 → 微信登录（`wx.login()` 获取 code → `POST /auth/login` → 存储 userId）
2. 首页 → 点击"上传体检报告"
3. 上传页 → 选择照片 → 选择报告类型 → 点击"生成讲解视频"
4. 等待 → 观察结果页 status 轮询变化
5. `COMPLETED` → 点击播放视频

**成功标准**：手机上能播放 AI 生成的体检报告讲解视频 🎉

---

## 故障排查速查

| 症状 | 原因 | 解决 |
|------|------|------|
| `Missing COS_SECRET_ID` | .env 未填凭证 | 检查 `.env` 文件 |
| OCR 返回空数据 | 图片质量差 / 非医疗格式 | 换清晰的体检报告图片 |
| Pipeline 卡在 PROCESSING | Worker 未启动 | 检查 `pnpm dev` 日志有无 `Worker started` |
| 小程序请求失败 | 手机与电脑不在同一 Wi-Fi | 检查网络连接 |
| `wx.login failed` | WX_APPID/SECRET 错误 | 核对微信公众平台凭证 |
| 视频黑屏 | COS 桶未设置公读权限 | 腾讯云 COS → 权限管理 → 公有读私有写 |
