# 真机联调设计文档

> 创建日期：2026-03-01

## 目标

在真实手机上跑通 EchoHealth 完整链路：上传体检报告 → OCR 识别 → LLM 解读 → TTS 配音 → Remotion 渲染 → COS 存储 → 小程序播放视频。

## 已有 / 待申请凭证

| 凭证 | 状态 |
|------|------|
| 腾讯云 SecretId / SecretKey（OCR + COS） | ✅ 已有 |
| OpenRouter API Key（LLM） | ✅ 即可申请 |
| 微信小程序 AppID + AppSecret | ❌ 待注册 |

## 方案：分层验证（两阶段）

### Phase 1 — 后端 Pipeline 验证（今天可做）

不依赖微信注册，直接用 HTTP 客户端验证核心链路。

**需填写的 `.env` 字段（共 7 个）**

```
TENCENT_SECRET_ID=
TENCENT_SECRET_KEY=
COS_SECRET_ID=       # 可与上方复用
COS_SECRET_KEY=      # 可与上方复用
COS_BUCKET=          # 格式：bucketname-appid，如 echohealth-1234567890
COS_REGION=ap-guangzhou
OPENROUTER_API_KEY=
```

**验证步骤**

1. OrbStack 启动 PostgreSQL + Redis
2. `pnpm db:migrate` 初始化数据库 schema
3. `pnpm dev` 启动后端（`apps/server`）
4. 手动创建测试用户（`POST /auth/login` 传任意 code，或直接用 Prisma Studio 插入）
5. 用 Bruno / curl 发 `POST /reports`（含真实图片 URL 或上传本地图片到 COS）
6. 轮询 `GET /reports/:id` 直到 `status=COMPLETED`
7. 验证 COS 上存在可访问的视频文件

**成功标准**：COS 上出现真实讲解视频，`GET /reports/:id` 返回 `videoUrl`。

---

### Phase 2 — 小程序真机联调（微信注册完成后）

**前置条件**：在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 完成小程序注册，获取 AppID + AppSecret。

**配置变更（共 3 处）**

| 文件 | 字段 | 改为 |
|------|------|------|
| `apps/server/.env` | `WX_APPID` / `WX_SECRET` | 真实值 |
| `apps/miniprogram/project.config.json` | `appid` | 真实 AppID |
| `apps/miniprogram/config/index.ts` | dev `API_BASE_URL` | `http://192.168.x.x:3000` |

**联调步骤**

1. `pnpm build:weapp` 编译小程序到 `dist/`
2. 微信开发者工具打开 `apps/miniprogram`，勾选 **"不校验合法域名"**（本地调试专用）
3. 点击 **"真机调试"** → 手机扫码 → 小程序在真机运行，请求打到 Mac 局域网 IP
4. 走完整流程：登录 → 上传报告 → 等待处理 → 结果页查看视频

**成功标准**：手机上能播放 AI 生成的体检讲解视频。

## 网络拓扑

```
iPhone（同 Wi-Fi）
  └─ 微信 App
       └─ 小程序 dist/
            └─ API_BASE_URL = http://192.168.x.x:3000
                  ↓
            Mac 本机 :3000
              ├─ 腾讯云 OCR API
              ├─ OpenRouter LLM API
              ├─ edge-tts（本地）
              ├─ Remotion 渲染（本地）
              └─ 腾讯云 COS（视频存储）
```

## 不在本次范围内

- HTTPS 域名 / SSL 证书（生产部署阶段处理）
- 微信支付真实支付（已用模拟支付实现）
- 生产服务器部署
