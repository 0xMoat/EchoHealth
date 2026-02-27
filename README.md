# EchoHealth · 爸妈看懂

> 上传体检报告照片，AI 自动生成通俗易懂的解读短视频，子女一键分享给父母。

---

## 产品简介

中老年人拿到体检报告往往看不懂指标含义，EchoHealth 让子女能在 30 秒内发起解读，父母收到一段 2 分钟的视频，用生活化语言了解自己的健康状况。

**核心链路：** 拍照上传 → AI 解读 → 生成短视频 → 微信分享给父母

## 技术栈

| 层 | 技术 |
|---|---|
| 小程序前端 | Taro 4 + React + TypeScript |
| 后端 | Node.js + Fastify + TypeScript |
| 数据库 | PostgreSQL + Prisma |
| 任务队列 | BullMQ + Redis |
| OCR | 腾讯云智能文字识别 |
| LLM | Claude Sonnet 4.6 |
| TTS | Microsoft Edge TTS |
| 视频渲染 | Remotion |
| 视频合成 | ffmpeg |
| 对象存储 | 腾讯云 COS |

## 项目结构

```
EchoHealth/
├── apps/
│   ├── miniprogram/     # Taro 微信小程序
│   └── server/          # Fastify 后端服务
├── packages/
│   └── video/           # Remotion 视频模板
├── docs/
│   └── plans/           # 设计文档
└── README.md
```

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动后端
pnpm --filter server dev

# 启动小程序开发
pnpm --filter miniprogram dev:weapp
```

## 设计文档

详见 [`docs/plans/2026-02-27-echohealth-design.md`](docs/plans/2026-02-27-echohealth-design.md)
