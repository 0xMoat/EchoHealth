# 爸妈看懂 (EchoHealth)

[English](./README_EN.md) | 简体中文

> **让体检报告“说话”，把冰冷的指标转化为有温度的健康视频。**
> 
> 📸 拍照上传体检报告 → 🤖 AI 深度解读 → 🎥 自动化生成短视频 → 📱 微信分享给父母

![EchoHealth Banner](./assets/banner.png)

---

## 🌟 产品简介

**EchoHealth** 是一款专为「关心父母健康的子女」设计的健康交互工具。

我们深知父母拿到体检报告时的迷茫：指标太多看不懂、医生太忙没空讲、专业术语太冷冰。EchoHealth 通过 AI 技术将复杂的医疗数据，在 90 秒内转化为中老年人也能听得懂、看得清的**人声配音解读短视频**，让子女的一份关心，能以最直观的方式传递到父母手机里。

**核心链路：** 拍照上传 → AI 解读 → 生成短视频 → 微信分享给父母

## 🚀 技术栈

| 模块 | 技术选型 |
| :--- | :--- |
| **小程序前端** | ![Taro](https://img.shields.io/badge/Taro-4.0+-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) |
| **后端服务** | ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![Fastify](https://img.shields.io/badge/Fastify-4-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) |
| **数据存储** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![Prisma](https://img.shields.io/badge/Prisma-ORM-5849BE) ![Redis](https://img.shields.io/badge/Redis-Cache-D82C20) |
| **核心引擎** | ![Claude](https://img.shields.io/badge/LLM-Claude--3.5--Sonnet-6126D3) ![Remotion](https://img.shields.io/badge/Video-Remotion-blue) ![FFmpeg](https://img.shields.io/badge/Engine-FFmpeg-007800) |
| **云服务** | 腾讯云医疗 OCR + 腾讯云 COS + Edge TTS |

## 🏗 技术架构

```mermaid
graph TD
    %% 统一样式定义
    classDef primary fill:#e8f5e9,stroke:#07c160,stroke-width:2px;
    classDef secondary fill:#f9f9f9,stroke:#333,stroke-width:1px;
    classDef neutral fill:#eceff1,stroke:#607d8b,stroke-width:1px;

    subgraph Frontend [WeChat Frontend]
        A["微信小程序 (前端)<br/>Taro 4 + React + TypeScript"]:::primary
    end

    subgraph Backend [Node.js Backend]
        direction TB
        B["Fastify + TypeScript"]:::secondary
        
        subgraph Services [Internal Services]
            S1["上传接口"]:::secondary
            S2["状态查询"]:::secondary
            S3["支付接口"]:::secondary
        end
        
        Q[("任务队列<br/>(BullMQ + Redis)")]:::secondary
        
        subgraph Pipeline [视频生成流水线]
            direction LR
            P1["OCR"] --> P2["LLM"] --> P3["TTS"] --> P4["渲染"] --> P5["合成"]
        end
        class Pipeline primary
    end

    subgraph Data [Data & Storage]
        COS["腾讯云COS存储"]:::neutral
        DB[("PostgreSQL")]:::neutral
    end

    %% 关系链路
    A -- "HTTPS API" --> B
    B --> Services
    S1 -- "入队" --> Q
    Q -- "Worker 异步处理" --> Pipeline
    
    Pipeline -- "保存视频" --> COS
    B -- "数据持久化" --> DB
```

## 📂 项目结构

```text
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

## 🛠 本地开发

```bash
# 安装依赖
pnpm install

# 启动后端服务
pnpm --filter server dev

# 启动小程序开发预览
pnpm --filter miniprogram dev:weapp
```

## 📖 设计文档

详细的产品设计与技术规划方案请参阅：[`docs/plans/2026-02-27-echohealth-design.md`](docs/plans/2026-02-27-echohealth-design.md)

---

## License

MIT © [EchoHealth]
