# EchoHealth MVP 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建「爸妈看懂」微信小程序 MVP，实现体检报告照片上传 → AI 解读 → 短视频生成 → 微信分享的完整链路。

**Architecture:** Monorepo（pnpm workspace），apps/server（Fastify 后端）+ apps/miniprogram（Taro 小程序）+ packages/video（Remotion 视频模板）。视频生成采用异步队列（BullMQ），流水线为 OCR → LLM → TTS → Remotion 渲染 → ffmpeg 合成 → COS 存储。

**Tech Stack:** Node.js 20, Fastify 5, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, 腾讯云 OCR, Claude Sonnet 4.6 API, edge-tts, Remotion 4, ffmpeg, 腾讯云 COS, Taro 4, React, 微信支付

---

## Task 1: Monorepo 初始化

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `apps/server/` (空目录占位)
- Create: `apps/miniprogram/` (空目录占位)
- Create: `packages/video/` (空目录占位)

**Step 1: 创建 pnpm workspace 配置**

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Step 2: 创建根 package.json**

```json
{
  "name": "echohealth",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter server dev",
    "dev:mp": "pnpm --filter miniprogram dev:weapp",
    "test": "pnpm --filter server test"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**Step 3: 创建共享 TypeScript 基础配置**

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

**Step 4: 创建目录结构**

```bash
mkdir -p apps/server apps/miniprogram packages/video
```

**Step 5: Commit**

```bash
git add pnpm-workspace.yaml package.json tsconfig.base.json
git commit -m "chore: init monorepo structure"
```

---

## Task 2: 后端项目初始化（Fastify + TypeScript）

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/app.ts`
- Test: `apps/server/src/__tests__/app.test.ts`

**Step 1: 创建后端 package.json**

```json
// apps/server/package.json
{
  "name": "server",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.0",
    "@fastify/multipart": "^8.0.0",
    "fastify": "^5.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

**Step 2: 安装依赖**

```bash
cd apps/server && pnpm install
```

**Step 3: 写失败测试**

```typescript
// apps/server/src/__tests__/app.test.ts
import { describe, it, expect } from 'vitest'
import { buildApp } from '../app.js'

describe('App', () => {
  it('health check returns ok', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})
```

**Step 4: 运行测试，确认失败**

```bash
pnpm test
# Expected: FAIL - Cannot find module '../app.js'
```

**Step 5: 实现 app.ts**

```typescript
// apps/server/src/app.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

**Step 6: 实现 index.ts（入口）**

```typescript
// apps/server/src/index.ts
import 'dotenv/config'
import { buildApp } from './app.js'

const app = await buildApp()
await app.listen({ port: 3000, host: '0.0.0.0' })
console.log('Server running on http://localhost:3000')
```

**Step 7: 创建 tsconfig.json**

```json
// apps/server/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 8: 运行测试，确认通过**

```bash
pnpm test
# Expected: PASS
```

**Step 9: 创建 .env.example**

```bash
# apps/server/.env.example
DATABASE_URL=postgresql://user:password@localhost:5432/echohealth
REDIS_URL=redis://localhost:6379
TENCENT_SECRET_ID=
TENCENT_SECRET_KEY=
CLAUDE_API_KEY=
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=ap-guangzhou
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_PAY_MCH_ID=
WECHAT_PAY_KEY=
```

**Step 10: Commit**

```bash
git add apps/server/
git commit -m "feat(server): init Fastify app with health check"
```

---

## Task 3: 数据库 Schema（Prisma + PostgreSQL）

**Files:**
- Create: `apps/server/prisma/schema.prisma`
- Modify: `apps/server/package.json`（添加 prisma 依赖）

**Step 1: 安装 Prisma**

```bash
cd apps/server
pnpm add @prisma/client
pnpm add -D prisma
npx prisma init --datasource-provider postgresql
```

**Step 2: 定义 Schema**

```prisma
// apps/server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String    @id @default(cuid())
  openid      String    @unique           // 微信 openid
  nickname    String?
  avatarUrl   String?
  isPro       Boolean   @default(false)   // 是否家庭年卡用户
  proExpireAt DateTime?                   // 年卡到期时间
  usedThisMonth Int     @default(0)       // 本月免费使用次数
  usageResetAt  DateTime @default(now())  // 配额重置时间
  reports     Report[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Report {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  type        ReportType
  photoUrls   String[]    // 上传的照片 COS URL
  ocrText     String?     // OCR 识别原始文本
  indicators  Json?       // 结构化指标数据
  script      Json?       // LLM 生成的解读脚本
  video       Video?
  status      ReportStatus @default(PENDING)
  errorMsg    String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Video {
  id        String   @id @default(cuid())
  reportId  String   @unique
  report    Report   @relation(fields: [reportId], references: [id])
  cosUrl    String               // MP4 文件 COS URL
  duration  Int                  // 视频时长（秒）
  createdAt DateTime @default(now())
}

model Order {
  id            String      @id @default(cuid())
  userId        String
  amount        Int                          // 单位：分
  status        OrderStatus @default(PENDING)
  wxPayOrderId  String?     @unique
  paidAt        DateTime?
  createdAt     DateTime    @default(now())
}

enum ReportType {
  BLOOD_ROUTINE    // 血常规
  BIOCHEMISTRY     // 生化检查
  PHYSICAL_EXAM    // 体检总报告
}

enum ReportStatus {
  PENDING          // 等待处理
  PROCESSING       // 处理中
  COMPLETED        // 完成
  FAILED           // 失败
}

enum OrderStatus {
  PENDING
  PAID
  REFUNDED
}
```

**Step 3: 本地启动 PostgreSQL（Docker）**

```bash
docker run -d \
  --name echohealth-pg \
  -e POSTGRES_DB=echohealth \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16
```

**Step 4: 执行迁移**

```bash
cd apps/server
cp .env.example .env
# 填写 DATABASE_URL=postgresql://user:password@localhost:5432/echohealth
npx prisma migrate dev --name init
npx prisma generate
```

**Step 5: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat(server): add database schema with User/Report/Video/Order"
```

---

## Task 4: Redis + BullMQ 任务队列

**Files:**
- Create: `apps/server/src/queue/index.ts`
- Create: `apps/server/src/queue/worker.ts`
- Test: `apps/server/src/__tests__/queue.test.ts`

**Step 1: 安装依赖**

```bash
cd apps/server
pnpm add bullmq ioredis
```

**Step 2: 本地启动 Redis**

```bash
docker run -d --name echohealth-redis -p 6379:6379 redis:7
```

**Step 3: 写失败测试**

```typescript
// apps/server/src/__tests__/queue.test.ts
import { describe, it, expect } from 'vitest'
import { getQueue } from '../queue/index.js'

describe('Queue', () => {
  it('can add a video generation job', async () => {
    const queue = getQueue()
    const job = await queue.add('generate-video', { reportId: 'test-123' })
    expect(job.id).toBeDefined()
    await queue.close()
  })
})
```

**Step 4: 运行，确认失败**

```bash
pnpm test
# Expected: FAIL - Cannot find module '../queue/index.js'
```

**Step 5: 实现队列模块**

```typescript
// apps/server/src/queue/index.ts
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

let queue: Queue | null = null

export function getQueue() {
  if (!queue) {
    queue = new Queue('video-generation', { connection })
  }
  return queue
}

export { connection }
```

**Step 6: 运行测试，确认通过**

```bash
pnpm test
# Expected: PASS
```

**Step 7: 创建 Worker 骨架（稍后填充实际逻辑）**

```typescript
// apps/server/src/queue/worker.ts
import { Worker } from 'bullmq'
import { connection } from './index.js'

export function startWorker() {
  const worker = new Worker(
    'video-generation',
    async (job) => {
      const { reportId } = job.data
      console.log(`[Worker] Processing report: ${reportId}`)
      // 流水线在后续 Task 中填充
    },
    { connection, concurrency: 2 }
  )

  worker.on('completed', (job) => console.log(`[Worker] Done: ${job.id}`))
  worker.on('failed', (job, err) => console.error(`[Worker] Failed: ${job?.id}`, err))

  return worker
}
```

**Step 8: Commit**

```bash
git add apps/server/src/queue/
git commit -m "feat(server): add BullMQ queue and worker skeleton"
```

---

## Task 5: OCR 模块（腾讯云）

**Files:**
- Create: `apps/server/src/pipeline/ocr.ts`
- Test: `apps/server/src/__tests__/ocr.test.ts`

**Step 1: 安装腾讯云 SDK**

```bash
cd apps/server
pnpm add tencentcloud-sdk-nodejs-ocr
```

**Step 2: 写失败测试（用 mock）**

```typescript
// apps/server/src/__tests__/ocr.test.ts
import { describe, it, expect, vi } from 'vitest'
import { parseOcrText } from '../pipeline/ocr.js'

describe('parseOcrText', () => {
  it('extracts indicators from raw OCR text', () => {
    const rawText = `
      白细胞计数 WBC 6.5 ×10^9/L 参考范围 3.5-9.5
      血红蛋白 HGB 132 g/L 参考范围 115-150
      血小板计数 PLT 280 ×10^9/L 参考范围 100-300
    `
    const result = parseOcrText(rawText)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      name: expect.stringContaining('白细胞'),
      value: '6.5',
      unit: expect.any(String),
      status: 'normal',
    })
  })

  it('marks abnormal values correctly', () => {
    const rawText = `葡萄糖 GLU 7.2 mmol/L 参考范围 3.9-6.1 ↑`
    const result = parseOcrText(rawText)
    expect(result[0].status).toBe('high')
  })
})
```

**Step 3: 运行，确认失败**

```bash
pnpm test
```

**Step 4: 实现 ocr.ts**

```typescript
// apps/server/src/pipeline/ocr.ts
import OcrClient from 'tencentcloud-sdk-nodejs-ocr/tencentcloud/services/ocr/v20181119/ocr_client.js'
import { Models } from 'tencentcloud-sdk-nodejs-ocr/tencentcloud/services/ocr/v20181119/ocr_models.js'

export interface Indicator {
  name: string
  code: string
  value: string
  unit: string
  referenceRange: string
  status: 'normal' | 'high' | 'low' | 'unknown'
}

// 从 base64 图片调用腾讯云 OCR
export async function ocrReportImage(base64Image: string): Promise<string> {
  const client = new OcrClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID!,
      secretKey: process.env.TENCENT_SECRET_KEY!,
    },
    region: 'ap-guangzhou',
  })

  const req = new Models.GeneralAccurateOCRRequest()
  req.ImageBase64 = base64Image

  const res = await client.GeneralAccurateOCR(req)
  return res.TextDetections?.map((t) => t.DetectedText).join('\n') ?? ''
}

// 从 OCR 文本解析结构化指标
export function parseOcrText(text: string): Indicator[] {
  const indicators: Indicator[] = []
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    // 匹配：指标名 代码 数值 单位 参考范围 [↑↓]
    const match = line.match(
      /(.+?)\s+([A-Z]+)\s+([\d.]+)\s+(\S+)\s+参考范围\s+([\d.\-~]+)\s*(↑|↓)?/
    )
    if (!match) continue

    const [, name, code, value, unit, referenceRange, arrow] = match
    let status: Indicator['status'] = 'normal'
    if (arrow === '↑') status = 'high'
    else if (arrow === '↓') status = 'low'
    else {
      // 尝试根据参考范围判断
      const [min, max] = referenceRange.split(/[-~]/).map(Number)
      const num = parseFloat(value)
      if (!isNaN(min) && !isNaN(max)) {
        if (num > max) status = 'high'
        else if (num < min) status = 'low'
      }
    }

    indicators.push({ name: name.trim(), code, value, unit, referenceRange, status })
  }

  return indicators
}
```

**Step 5: 运行测试，确认通过**

```bash
pnpm test
# Expected: PASS
```

**Step 6: Commit**

```bash
git add apps/server/src/pipeline/ocr.ts apps/server/src/__tests__/ocr.test.ts
git commit -m "feat(pipeline): add OCR module with indicator parsing"
```

---

## Task 6: LLM 解读脚本生成（Claude API）

**Files:**
- Create: `apps/server/src/pipeline/llm.ts`
- Test: `apps/server/src/__tests__/llm.test.ts`

**Step 1: 安装 SDK**

```bash
cd apps/server
pnpm add @anthropic-ai/sdk
```

**Step 2: 写失败测试**

```typescript
// apps/server/src/__tests__/llm.test.ts
import { describe, it, expect } from 'vitest'
import { buildVideoScript } from '../pipeline/llm.js'
import type { Indicator } from '../pipeline/ocr.js'

describe('buildVideoScript', () => {
  it('returns a script with required sections', async () => {
    const indicators: Indicator[] = [
      { name: '白细胞计数', code: 'WBC', value: '6.5', unit: '×10^9/L', referenceRange: '3.5-9.5', status: 'normal' },
      { name: '葡萄糖', code: 'GLU', value: '7.2', unit: 'mmol/L', referenceRange: '3.9-6.1', status: 'high' },
    ]

    const script = await buildVideoScript({
      indicators,
      reportType: 'BLOOD_ROUTINE',
      senderName: '小明',
    })

    expect(script.summary).toBeTruthy()
    expect(script.details).toBeInstanceOf(Array)
    expect(script.details.length).toBeGreaterThan(0)
    expect(script.suggestions).toBeTruthy()
    expect(script.outro).toContain('小明')
  }, 30000) // LLM 调用可能耗时
})
```

**Step 3: 实现 llm.ts**

```typescript
// apps/server/src/pipeline/llm.ts
import Anthropic from '@anthropic-ai/sdk'
import type { Indicator } from './ocr.js'
import type { ReportType } from '@prisma/client'

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

export interface VideoScript {
  summary: string          // 总体结论（1-2句）
  details: ScriptDetail[]  // 逐项解读
  suggestions: string      // 健康建议（2-3条）
  outro: string            // 片尾文案
}

export interface ScriptDetail {
  indicatorName: string
  status: 'normal' | 'high' | 'low'
  explanation: string      // 生活化解释（1句话）
  advice?: string          // 针对异常的具体建议
}

const REPORT_TYPE_MAP: Record<ReportType, string> = {
  BLOOD_ROUTINE: '血常规',
  BIOCHEMISTRY: '生化检查',
  PHYSICAL_EXAM: '体检总报告',
}

export async function buildVideoScript(params: {
  indicators: Indicator[]
  reportType: ReportType
  senderName: string
}): Promise<VideoScript> {
  const { indicators, reportType, senderName } = params
  const abnormal = indicators.filter((i) => i.status !== 'normal')

  const prompt = `你是一位温和专业的健康顾问，需要为一位中老年人解读他们的${REPORT_TYPE_MAP[reportType]}报告。
请用简单易懂的语言，避免使用专业术语，像对父母说话一样亲切。

报告指标如下：
${indicators.map((i) => `- ${i.name}（${i.code}）: ${i.value} ${i.unit}，参考范围 ${i.referenceRange}，状态：${i.status === 'normal' ? '正常' : i.status === 'high' ? '偏高' : '偏低'}`).join('\n')}

请严格按照以下 JSON 格式返回，不要有任何其他内容：
{
  "summary": "一两句话总体结论，例如：整体来看您的血常规结果比较正常，有1项指标需要稍微注意一下",
  "details": [
    {
      "indicatorName": "指标名称",
      "status": "normal|high|low",
      "explanation": "用生活化语言解释这个指标是什么、代表什么",
      "advice": "仅在异常时填写，给出具体可行的生活建议"
    }
  ],
  "suggestions": "2-3条整体健康建议，换行分隔",
  "outro": "${senderName}特别为您解读了这份报告，希望您身体健康"
}

注意：
1. 只对异常指标（偏高/偏低）给出 advice
2. 解释要像跟父母聊天，不用医学术语
3. 末尾务必加：本解读仅供参考，如有疑虑请咨询医生`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text) as VideoScript
}
```

**Step 4: 运行测试（需要真实 API Key）**

```bash
CLAUDE_API_KEY=sk-xxx pnpm test
# Expected: PASS
```

**Step 5: Commit**

```bash
git add apps/server/src/pipeline/llm.ts apps/server/src/__tests__/llm.test.ts
git commit -m "feat(pipeline): add LLM script generation with Claude API"
```

---

## Task 7: TTS 音频生成（edge-tts）

**Files:**
- Create: `apps/server/src/pipeline/tts.ts`
- Test: `apps/server/src/__tests__/tts.test.ts`

**Step 1: 确认 edge-tts 已安装（系统级工具）**

```bash
pip install edge-tts
# 或
uvx edge-tts --version
```

**Step 2: 写失败测试**

```typescript
// apps/server/src/__tests__/tts.test.ts
import { describe, it, expect } from 'vitest'
import { generateAudio } from '../pipeline/tts.js'
import { existsSync } from 'fs'
import { rm } from 'fs/promises'

describe('generateAudio', () => {
  it('generates an mp3 file from text', async () => {
    const outputPath = '/tmp/test-tts.mp3'
    await generateAudio('您好，这是一段测试语音。', outputPath)
    expect(existsSync(outputPath)).toBe(true)
    await rm(outputPath)
  }, 15000)
})
```

**Step 3: 实现 tts.ts**

```typescript
// apps/server/src/pipeline/tts.ts
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 使用 edge-tts 生成音频
// 音色：zh-CN-XiaoxiaoNeural（温柔女声）
export async function generateAudio(
  text: string,
  outputPath: string,
  voice = 'zh-CN-XiaoxiaoNeural'
): Promise<void> {
  // 转义文本中的特殊字符
  const escaped = text.replace(/"/g, '\\"').replace(/\n/g, ' ')
  const cmd = `edge-tts --voice "${voice}" --text "${escaped}" --write-media "${outputPath}"`
  await execAsync(cmd)
}

// 将脚本各段生成多个音频文件，返回路径数组
export async function generateScriptAudio(
  segments: string[],
  tmpDir: string
): Promise<string[]> {
  const paths: string[] = []
  for (let i = 0; i < segments.length; i++) {
    const path = `${tmpDir}/segment-${i}.mp3`
    await generateAudio(segments[i], path)
    paths.push(path)
  }
  return paths
}
```

**Step 4: 运行测试**

```bash
pnpm test
# Expected: PASS（需要 edge-tts 已安装）
```

**Step 5: Commit**

```bash
git add apps/server/src/pipeline/tts.ts apps/server/src/__tests__/tts.test.ts
git commit -m "feat(pipeline): add TTS audio generation with edge-tts"
```

---

## Task 8: Remotion 视频模板

**Files:**
- Create: `packages/video/package.json`
- Create: `packages/video/src/VideoTemplate.tsx`
- Create: `packages/video/src/components/IntroSlide.tsx`
- Create: `packages/video/src/components/SummarySlide.tsx`
- Create: `packages/video/src/components/IndicatorSlide.tsx`
- Create: `packages/video/src/components/SuggestionsSlide.tsx`
- Create: `packages/video/src/components/OutroSlide.tsx`
- Create: `packages/video/src/Root.tsx`

**Step 1: 初始化 Remotion 包**

```bash
cd packages/video
pnpm create video@latest . --template blank
# 选择 TypeScript
```

**Step 2: 调整 package.json**

```json
// packages/video/package.json
{
  "name": "@echohealth/video",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "studio": "remotion studio",
    "render": "remotion render"
  }
}
```

**Step 3: 实现视频模板根组件**

```typescript
// packages/video/src/Root.tsx
import { Composition } from 'remotion'
import { VideoTemplate } from './VideoTemplate.js'

export const RemotionRoot = () => {
  return (
    <Composition
      id="ReportVideo"
      component={VideoTemplate}
      durationInFrames={3600}  // 2分钟 @30fps
      fps={30}
      width={1080}
      height={1920}  // 竖屏（适合手机观看）
      defaultProps={{
        recipientName: '爸爸',
        senderName: '小明',
        summary: '整体来看您的报告比较正常，有1项需要注意。',
        details: [],
        suggestions: '多喝水，适量运动，保持良好作息。',
        outro: '小明特别为您解读，希望您身体健康',
        audioUrl: '',
      }}
    />
  )
}
```

**Step 4: 实现主模板组件**

```typescript
// packages/video/src/VideoTemplate.tsx
import { AbsoluteFill, Sequence, useVideoConfig, Audio } from 'remotion'
import { IntroSlide } from './components/IntroSlide.js'
import { SummarySlide } from './components/SummarySlide.js'
import { IndicatorSlide } from './components/IndicatorSlide.js'
import { SuggestionsSlide } from './components/SuggestionsSlide.js'
import { OutroSlide } from './components/OutroSlide.js'

export interface TemplateProps {
  recipientName: string
  senderName: string
  summary: string
  details: Array<{
    indicatorName: string
    status: 'normal' | 'high' | 'low'
    explanation: string
    advice?: string
  }>
  suggestions: string
  outro: string
  audioUrl: string
}

export const VideoTemplate = (props: TemplateProps) => {
  const { fps } = useVideoConfig()
  const { recipientName, senderName, summary, details, suggestions, outro, audioUrl } = props

  const INTRO_DUR = fps * 8          // 8秒
  const SUMMARY_DUR = fps * 12       // 12秒
  const DETAIL_DUR = fps * 15        // 每项指标15秒
  const SUGGEST_DUR = fps * 20       // 20秒
  const OUTRO_DUR = fps * 10         // 10秒

  return (
    <AbsoluteFill style={{ backgroundColor: '#F8FAFC' }}>
      {audioUrl && <Audio src={audioUrl} />}

      <Sequence durationInFrames={INTRO_DUR}>
        <IntroSlide recipientName={recipientName} />
      </Sequence>

      <Sequence from={INTRO_DUR} durationInFrames={SUMMARY_DUR}>
        <SummarySlide summary={summary} />
      </Sequence>

      {details.map((detail, i) => (
        <Sequence
          key={i}
          from={INTRO_DUR + SUMMARY_DUR + i * DETAIL_DUR}
          durationInFrames={DETAIL_DUR}
        >
          <IndicatorSlide {...detail} />
        </Sequence>
      ))}

      <Sequence
        from={INTRO_DUR + SUMMARY_DUR + details.length * DETAIL_DUR}
        durationInFrames={SUGGEST_DUR}
      >
        <SuggestionsSlide suggestions={suggestions} />
      </Sequence>

      <Sequence
        from={INTRO_DUR + SUMMARY_DUR + details.length * DETAIL_DUR + SUGGEST_DUR}
        durationInFrames={OUTRO_DUR}
      >
        <OutroSlide senderName={senderName} outro={outro} />
      </Sequence>
    </AbsoluteFill>
  )
}
```

**Step 5: 实现各子组件（IntroSlide 示例，其余类似）**

```typescript
// packages/video/src/components/IntroSlide.tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'

export const IntroSlide = ({ recipientName }: { recipientName: string }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20 })

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        opacity,
      }}
    >
      <div style={{ fontSize: 48, color: 'white', fontWeight: 'bold', marginBottom: 16 }}>
        {recipientName}的体检报告
      </div>
      <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.85)' }}>
        专属解读视频
      </div>
      <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', marginTop: 40 }}>
        由 爸妈看懂 · EchoHealth 生成
      </div>
    </AbsoluteFill>
  )
}
```

```typescript
// packages/video/src/components/IndicatorSlide.tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'

const STATUS_COLOR = { normal: '#10B981', high: '#F59E0B', low: '#3B82F6' }
const STATUS_LABEL = { normal: '正常', high: '偏高', low: '偏低' }

export const IndicatorSlide = ({
  indicatorName, status, explanation, advice,
}: {
  indicatorName: string
  status: 'normal' | 'high' | 'low'
  explanation: string
  advice?: string
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const scale = spring({ frame, fps, from: 0.8, to: 1, durationInFrames: 15 })
  const color = STATUS_COLOR[status]

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 48 }}>
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: 48,
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        transform: `scale(${scale})`,
        borderLeft: `8px solid ${color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 36, fontWeight: 'bold', color: '#1F2937' }}>
            {indicatorName}
          </span>
          <span style={{
            marginLeft: 16, padding: '4px 16px',
            background: color, color: 'white',
            borderRadius: 999, fontSize: 24,
          }}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <p style={{ fontSize: 28, color: '#4B5563', lineHeight: 1.6 }}>{explanation}</p>
        {advice && (
          <div style={{
            marginTop: 24, padding: 24,
            background: '#FEF3C7', borderRadius: 12,
          }}>
            <p style={{ fontSize: 26, color: '#92400E' }}>💡 {advice}</p>
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
```

**Step 6: 在 Remotion Studio 验证视觉效果**

```bash
cd packages/video
pnpm studio
# 打开 http://localhost:3001 查看视频预览
```

**Step 7: Commit**

```bash
git add packages/video/
git commit -m "feat(video): add Remotion video template with all slide components"
```

---

## Task 9: ffmpeg 视频合成 + COS 上传

**Files:**
- Create: `apps/server/src/pipeline/render.ts`
- Create: `apps/server/src/pipeline/storage.ts`

**Step 1: 安装依赖**

```bash
cd apps/server
pnpm add cos-nodejs-sdk-v5 @remotion/renderer
pnpm add -D @types/fluent-ffmpeg
# 确保系统已安装 ffmpeg
brew install ffmpeg  # macOS
```

**Step 2: 实现 render.ts（Remotion 无头渲染）**

```typescript
// apps/server/src/pipeline/render.ts
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import type { TemplateProps } from '@echohealth/video'

const VIDEO_PACKAGE_PATH = path.resolve('../../packages/video/src/index.ts')

export async function renderVideo(
  props: TemplateProps,
  outputPath: string
): Promise<void> {
  const bundleLocation = await bundle({
    entryPoint: VIDEO_PACKAGE_PATH,
    webpackOverride: (config) => config,
  })

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ReportVideo',
    inputProps: props,
  })

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props,
  })
}
```

**Step 3: 实现 storage.ts（COS 上传）**

```typescript
// apps/server/src/pipeline/storage.ts
import COS from 'cos-nodejs-sdk-v5'
import { createReadStream } from 'fs'
import path from 'path'

const cos = new COS({
  SecretId: process.env.COS_SECRET_ID!,
  SecretKey: process.env.COS_SECRET_KEY!,
})

export async function uploadVideo(localPath: string, reportId: string): Promise<string> {
  const key = `videos/${reportId}/${path.basename(localPath)}`

  await new Promise<void>((resolve, reject) => {
    cos.uploadFile(
      {
        Bucket: process.env.COS_BUCKET!,
        Region: process.env.COS_REGION!,
        Key: key,
        FilePath: localPath,
      },
      (err) => (err ? reject(err) : resolve())
    )
  })

  return `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com/${key}`
}
```

**Step 4: Commit**

```bash
git add apps/server/src/pipeline/render.ts apps/server/src/pipeline/storage.ts
git commit -m "feat(pipeline): add Remotion renderer and COS upload"
```

---

## Task 10: 串联视频生成 Worker

**Files:**
- Modify: `apps/server/src/queue/worker.ts`
- Create: `apps/server/src/pipeline/index.ts`

**Step 1: 实现完整流水线**

```typescript
// apps/server/src/pipeline/index.ts
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { ocrReportImage, parseOcrText } from './ocr.js'
import { buildVideoScript } from './llm.js'
import { generateAudio } from './tts.js'
import { renderVideo } from './render.js'
import { uploadVideo } from './storage.js'
import { prisma } from '../db.js'
import type { ReportType } from '@prisma/client'

export async function processReport(reportId: string): Promise<void> {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { user: true },
  })

  const tmpDir = await mkdtemp(path.join(tmpdir(), 'echohealth-'))

  try {
    // 1. 更新状态
    await prisma.report.update({ where: { id: reportId }, data: { status: 'PROCESSING' } })

    // 2. OCR（取第一张照片）
    const photoBase64 = await fetchPhotoAsBase64(report.photoUrls[0])
    const ocrText = await ocrReportImage(photoBase64)

    // 3. 解析指标
    const indicators = parseOcrText(ocrText)
    await prisma.report.update({ where: { id: reportId }, data: { ocrText, indicators } })

    // 4. LLM 生成脚本
    const script = await buildVideoScript({
      indicators,
      reportType: report.type as ReportType,
      senderName: report.user.nickname ?? '您的家人',
    })
    await prisma.report.update({ where: { id: reportId }, data: { script } })

    // 5. TTS 生成全段音频（拼接所有文本）
    const fullText = [
      script.summary,
      ...script.details.map((d) => `${d.indicatorName}：${d.explanation}${d.advice ? '。' + d.advice : ''}`),
      script.suggestions,
      script.outro,
    ].join('。')
    const audioPath = path.join(tmpDir, 'audio.mp3')
    await generateAudio(fullText, audioPath)

    // 6. 渲染视频
    const videoPath = path.join(tmpDir, 'output.mp4')
    await renderVideo(
      {
        recipientName: '您',
        senderName: report.user.nickname ?? '您的家人',
        ...script,
        audioUrl: audioPath,
      },
      videoPath
    )

    // 7. 上传 COS
    const cosUrl = await uploadVideo(videoPath, reportId)

    // 8. 保存结果
    await prisma.$transaction([
      prisma.video.create({ data: { reportId, cosUrl, duration: 120 } }),
      prisma.report.update({ where: { id: reportId }, data: { status: 'COMPLETED' } }),
    ])
  } catch (err) {
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'FAILED', errorMsg: String(err) },
    })
    throw err
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

async function fetchPhotoAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf).toString('base64')
}
```

**Step 2: 更新 Worker，接入流水线**

```typescript
// apps/server/src/queue/worker.ts（更新）
import { Worker } from 'bullmq'
import { connection } from './index.js'
import { processReport } from '../pipeline/index.js'

export function startWorker() {
  const worker = new Worker(
    'video-generation',
    async (job) => {
      const { reportId } = job.data
      await processReport(reportId)
    },
    { connection, concurrency: 2 }
  )

  worker.on('completed', (job) => console.log(`[Worker] Done: ${job.id}`))
  worker.on('failed', (job, err) => console.error(`[Worker] Failed: ${job?.id}`, err))

  return worker
}
```

**Step 3: 创建 prisma 客户端单例**

```typescript
// apps/server/src/db.ts
import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()
```

**Step 4: Commit**

```bash
git add apps/server/src/pipeline/index.ts apps/server/src/queue/worker.ts apps/server/src/db.ts
git commit -m "feat(pipeline): wire up full video generation pipeline in worker"
```

---

## Task 11: REST API 接口

**Files:**
- Create: `apps/server/src/routes/reports.ts`
- Create: `apps/server/src/routes/payments.ts`
- Modify: `apps/server/src/app.ts`

**Step 1: 写接口测试**

```typescript
// apps/server/src/__tests__/reports.test.ts
import { describe, it, expect } from 'vitest'
import { buildApp } from '../app.js'

describe('POST /api/reports', () => {
  it('returns 401 without auth', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: { type: 'BLOOD_ROUTINE', photoUrls: [] },
    })
    expect(res.statusCode).toBe(401)
  })
})
```

**Step 2: 实现 reports 路由**

```typescript
// apps/server/src/routes/reports.ts
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { getQueue } from '../queue/index.js'
import { checkQuota } from '../middleware/quota.js'

export async function reportsRoutes(app: FastifyInstance) {
  // 上传报告，创建任务
  app.post<{
    Body: { type: 'BLOOD_ROUTINE' | 'BIOCHEMISTRY' | 'PHYSICAL_EXAM'; photoUrls: string[] }
  }>('/api/reports', { preHandler: [app.authenticate, checkQuota] }, async (req, reply) => {
    const { type, photoUrls } = req.body
    const userId = req.user.id

    const report = await prisma.report.create({
      data: { userId, type, photoUrls, status: 'PENDING' },
    })

    await getQueue().add('generate-video', { reportId: report.id })

    return reply.code(201).send({ reportId: report.id })
  })

  // 查询处理状态
  app.get<{ Params: { id: string } }>(
    '/api/reports/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const report = await prisma.report.findFirst({
        where: { id: req.params.id, userId: req.user.id },
        include: { video: true },
      })
      if (!report) return reply.code(404).send({ error: 'Not found' })
      return { status: report.status, videoUrl: report.video?.cosUrl ?? null }
    }
  )
}
```

**Step 3: 实现 payments 路由**

```typescript
// apps/server/src/routes/payments.ts
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

export async function paymentsRoutes(app: FastifyInstance) {
  // 创建支付订单
  app.post('/api/payments/order', { preHandler: [app.authenticate] }, async (req, reply) => {
    const order = await prisma.order.create({
      data: { userId: req.user.id, amount: 9900 }, // 99元 = 9900分
    })
    // TODO: 调用微信支付 unified order API
    return { orderId: order.id, payParams: {} }
  })

  // 微信支付回调
  app.post('/api/payments/webhook', async (req, reply) => {
    // TODO: 验签 + 更新 Order.status = PAID + 更新 User.isPro = true
    return reply.code(200).send('SUCCESS')
  })
}
```

**Step 4: 注册路由到 app.ts**

```typescript
// 在 app.ts 中添加
import { reportsRoutes } from './routes/reports.js'
import { paymentsRoutes } from './routes/payments.js'
import { startWorker } from './queue/worker.js'

// 在 buildApp 内：
await app.register(reportsRoutes)
await app.register(paymentsRoutes)
startWorker()
```

**Step 5: 运行测试**

```bash
pnpm test
```

**Step 6: Commit**

```bash
git add apps/server/src/routes/
git commit -m "feat(server): add reports and payments API routes"
```

---

## Task 12: 配额中间件 + 微信登录

**Files:**
- Create: `apps/server/src/middleware/quota.ts`
- Create: `apps/server/src/routes/auth.ts`

**Step 1: 实现配额检查中间件**

```typescript
// apps/server/src/middleware/quota.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db.js'

export async function checkQuota(req: FastifyRequest, reply: FastifyReply) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } })

  if (user.isPro) return // 付费用户无限制

  // 重置月度计数
  const now = new Date()
  const resetAt = new Date(user.usageResetAt)
  if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { usedThisMonth: 0, usageResetAt: now },
    })
    return
  }

  if (user.usedThisMonth >= 1) {
    return reply.code(403).send({ error: 'QUOTA_EXCEEDED', message: '本月免费次数已用完，升级家庭年卡享无限次解读' })
  }

  // 消耗一次额度
  await prisma.user.update({
    where: { id: user.id },
    data: { usedThisMonth: { increment: 1 } },
  })
}
```

**Step 2: 实现微信登录**

```typescript
// apps/server/src/routes/auth.ts
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { code: string; nickname?: string; avatarUrl?: string } }>(
    '/api/auth/wechat',
    async (req, reply) => {
      const { code, nickname, avatarUrl } = req.body

      // 换取 openid
      const wxRes = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WECHAT_APP_ID}&secret=${process.env.WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`
      )
      const { openid, errcode } = await wxRes.json() as { openid?: string; errcode?: number }
      if (!openid) return reply.code(400).send({ error: 'Invalid wechat code' })

      const user = await prisma.user.upsert({
        where: { openid },
        create: { openid, nickname, avatarUrl },
        update: { nickname, avatarUrl },
      })

      const token = app.jwt.sign({ id: user.id, openid })
      return { token, user: { id: user.id, isPro: user.isPro } }
    }
  )
}
```

**Step 3: Commit**

```bash
git add apps/server/src/middleware/ apps/server/src/routes/auth.ts
git commit -m "feat(server): add quota middleware and wechat login"
```

---

## Task 13: Taro 小程序初始化

**Files:**
- Create: `apps/miniprogram/`（整个 Taro 项目）

**Step 1: 创建 Taro 项目**

```bash
cd apps
pnpm create taro miniprogram
# 选择：React / TypeScript / CSS / WeChat
```

**Step 2: 配置 API 地址**

```typescript
// apps/miniprogram/src/utils/api.ts
const BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://api.echohealth.cn'  // 生产地址

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${path}`,
      method: (options.method ?? 'GET') as any,
      data: options.body,
      header: options.token ? { Authorization: `Bearer ${options.token}` } : {},
      success: (res) => resolve(res.data as T),
      fail: reject,
    })
  })
}
```

**Step 3: 配置页面路由**

```typescript
// apps/miniprogram/src/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/upload/index',
    'pages/processing/index',
    'pages/player/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#667eea',
    navigationBarTitleText: '爸妈看懂',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    list: [
      { pagePath: 'pages/index/index', text: '首页' },
      { pagePath: 'pages/profile/index', text: '我的' },
    ],
  },
})
```

**Step 4: Commit**

```bash
git add apps/miniprogram/
git commit -m "feat(mp): init Taro miniprogram with page structure"
```

---

## Task 14: 小程序页面 - 上传 & 进度 & 播放

**Files:**
- Modify: `apps/miniprogram/src/pages/index/index.tsx`
- Create: `apps/miniprogram/src/pages/upload/index.tsx`
- Create: `apps/miniprogram/src/pages/processing/index.tsx`
- Create: `apps/miniprogram/src/pages/player/index.tsx`

**Step 1: 首页（引导上传）**

```tsx
// apps/miniprogram/src/pages/index/index.tsx
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'

export default function Index() {
  return (
    <View className="min-h-screen bg-gradient-to-b from-purple-500 to-purple-700 flex flex-col items-center justify-center p-8">
      <Text className="text-white text-4xl font-bold mb-4">爸妈看懂</Text>
      <Text className="text-purple-200 text-lg text-center mb-12">
        上传体检报告，AI 生成解读视频{'\n'}一键分享给爸妈
      </Text>
      <Button
        className="w-full bg-white text-purple-600 text-xl font-bold py-4 rounded-2xl"
        onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}
      >
        开始解读报告
      </Button>
    </View>
  )
}
```

**Step 2: 上传页面**

```tsx
// apps/miniprogram/src/pages/upload/index.tsx
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/api'
import { useStore } from '../../store'

const REPORT_TYPES = [
  { value: 'BLOOD_ROUTINE', label: '血常规' },
  { value: 'BIOCHEMISTRY', label: '生化检查' },
  { value: 'PHYSICAL_EXAM', label: '体检总报告' },
]

export default function Upload() {
  const [photos, setPhotos] = useState<string[]>([])
  const [type, setType] = useState('BLOOD_ROUTINE')
  const [loading, setLoading] = useState(false)
  const { token } = useStore()

  const pickPhoto = async () => {
    const res = await Taro.chooseImage({ count: 3 - photos.length, sourceType: ['album', 'camera'] })
    setPhotos([...photos, ...res.tempFilePaths])
  }

  const submit = async () => {
    if (!photos.length) return Taro.showToast({ title: '请先上传照片', icon: 'none' })
    setLoading(true)
    try {
      // 上传照片到 COS（简化：直接传 URL）
      const { reportId } = await request<{ reportId: string }>('/api/reports', {
        method: 'POST',
        body: { type, photoUrls: photos },
        token,
      })
      Taro.navigateTo({ url: `/pages/processing/index?reportId=${reportId}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="p-6">
      <Text className="text-2xl font-bold mb-6">选择报告类型</Text>
      <View className="flex gap-3 mb-8">
        {REPORT_TYPES.map((t) => (
          <Button
            key={t.value}
            className={`flex-1 py-3 rounded-xl ${type === t.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setType(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </View>

      <Text className="text-2xl font-bold mb-4">上传报告照片</Text>
      <View className="grid grid-cols-3 gap-3 mb-8">
        {photos.map((p, i) => <Image key={i} src={p} className="w-full aspect-square rounded-xl" />)}
        {photos.length < 3 && (
          <Button className="aspect-square bg-gray-100 rounded-xl text-4xl text-gray-400" onClick={pickPhoto}>+</Button>
        )}
      </View>

      <Button
        className="w-full bg-purple-600 text-white text-xl py-4 rounded-2xl"
        loading={loading}
        onClick={submit}
      >
        生成解读视频
      </Button>
    </View>
  )
}
```

**Step 3: 进度页面（轮询状态）**

```tsx
// apps/miniprogram/src/pages/processing/index.tsx
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { request } from '../../utils/api'
import { useStore } from '../../store'

export default function Processing() {
  const { reportId } = useRouter().params
  const [dots, setDots] = useState('.')
  const { token } = useStore()

  useEffect(() => {
    const dotTimer = setInterval(() => setDots((d) => (d.length >= 3 ? '.' : d + '.')), 500)

    const poll = setInterval(async () => {
      const { status, videoUrl } = await request<{ status: string; videoUrl: string | null }>(
        `/api/reports/${reportId}`, { token }
      )
      if (status === 'COMPLETED' && videoUrl) {
        clearInterval(poll)
        clearInterval(dotTimer)
        Taro.redirectTo({ url: `/pages/player/index?videoUrl=${encodeURIComponent(videoUrl)}` })
      } else if (status === 'FAILED') {
        clearInterval(poll)
        clearInterval(dotTimer)
        Taro.showToast({ title: '生成失败，请重试', icon: 'error' })
      }
    }, 3000)

    return () => { clearInterval(poll); clearInterval(dotTimer) }
  }, [])

  return (
    <View className="min-h-screen flex flex-col items-center justify-center bg-purple-50">
      <View className="w-32 h-32 rounded-full bg-purple-100 flex items-center justify-center mb-8">
        <Text className="text-5xl">🏥</Text>
      </View>
      <Text className="text-2xl font-bold text-purple-700 mb-3">AI 正在解读中{dots}</Text>
      <Text className="text-gray-500 text-center px-8">
        正在分析指标、生成解读视频{'\n'}大约需要 60-90 秒，请稍候
      </Text>
    </View>
  )
}
```

**Step 4: 视频播放 & 分享页面**

```tsx
// apps/miniprogram/src/pages/player/index.tsx
import { View, Text, Button, Video } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

export default function Player() {
  const { videoUrl } = useRouter().params

  const share = () => {
    Taro.showShareMenu({ withShareTicket: true })
  }

  return (
    <View className="min-h-screen bg-black flex flex-col">
      <Video
        src={decodeURIComponent(videoUrl ?? '')}
        className="w-full"
        style={{ height: '70vh' }}
        autoplay
        controls
      />
      <View className="p-6 flex flex-col gap-4">
        <Button
          className="w-full bg-purple-600 text-white text-xl py-4 rounded-2xl"
          onClick={share}
        >
          发送给爸爸 / 妈妈
        </Button>
        <Button
          className="w-full bg-gray-100 text-gray-600 text-xl py-4 rounded-2xl"
          onClick={() => Taro.navigateBack()}
        >
          再解读一份
        </Button>
      </View>
    </View>
  )
}
```

**Step 5: Commit**

```bash
git add apps/miniprogram/src/pages/
git commit -m "feat(mp): add upload, processing, and player pages"
```

---

## Task 15: 端到端验证

**目标：** 完整跑通一次"上传照片 → 生成视频"的链路。

**Step 1: 启动所有本地服务**

```bash
# 终端 1：后端
pnpm dev:server

# 终端 2：微信开发者工具（Taro）
pnpm dev:mp
```

**Step 2: 手动测试清单**

```
□ 微信登录（获取 token）
□ 上传 1 张真实血常规报告照片
□ 确认 Processing 页面轮询正常
□ 90 秒内视频生成完成，跳转播放页
□ 视频音频正常，文案可读
□ 分享按钮可转发给微信联系人
□ 第二次上传时提示「配额已用完」
```

**Step 3: 记录端到端耗时**

```bash
# 目标：< 90 秒
# 如超时，逐步排查各阶段耗时：
# OCR / LLM / TTS / Remotion 渲染 / ffmpeg 合成
```

**Step 4: 找 3 位非技术用户测试视频内容**

问卷：
1. 能理解视频在说什么吗？（1-5分）
2. 解读是否准确？（1-5分）
3. 会分享给父母吗？（是/否）

**Step 5: Commit 测试结果记录**

```bash
git add docs/
git commit -m "docs: add MVP end-to-end test results"
```

---

## 附：环境变量清单

在正式开发前，需申请以下服务账号：

| 服务 | 需要申请 | 文档 |
|---|---|---|
| 微信小程序 AppID | [mp.weixin.qq.com](https://mp.weixin.qq.com) | 注册小程序账号 |
| 腾讯云 OCR | [console.cloud.tencent.com](https://console.cloud.tencent.com) | 开通智能文字识别 |
| 腾讯云 COS | 同上 | 创建存储桶 |
| Claude API Key | [console.anthropic.com](https://console.anthropic.com) | 创建 API Key |
| 微信支付商户号 | [pay.weixin.qq.com](https://pay.weixin.qq.com) | 需营业执照 |

---

*计划基于 2026-02-27 设计文档生成。执行时使用 superpowers:executing-plans 技能逐任务推进。*
