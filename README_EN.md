# EchoHealth (爸妈看懂)

English | [简体中文](./README.md)

> **Make health reports "talk" and transform icy clinical data into warm health videos.**
> 
> 📸 Upload Photo → 🤖 AI Deep Analysis → 🎥 Automated Video Generation → 📱 Share to Parents via WeChat

![EchoHealth Banner](./assets/banner.png)

---

## 🌟 Introduction

**EchoHealth** is a health interaction tool designed for children who care about their parents' health.

We understand the confusion parents face with health reports: too many indicators to understand, doctors being too busy, and professional terminology being too cold. EchoHealth utilizes AI technology to transform complex medical data into **voice-over explanatory short videos** that the elderly can understand and see clearly within 90 seconds, allowing a child's care to be delivered to their parents' phones in the most intuitive way.

**Core Workflow:** Photo Upload → AI Interpretation → Video Generation → WeChat Sharing

## 🚀 Tech Stack

| Module | Tech Stack |
| :--- | :--- |
| **Frontend** | ![Taro](https://img.shields.io/badge/Taro-4.0+-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![Fastify](https://img.shields.io/badge/Fastify-4-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) |
| **Data Storage** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![Prisma](https://img.shields.io/badge/Prisma-ORM-5849BE) ![Redis](https://img.shields.io/badge/Redis-Cache-D82C20) |
| **Core Engine** | ![Claude](https://img.shields.io/badge/LLM-Claude--3.5--Sonnet-6126D3) ![Remotion](https://img.shields.io/badge/Video-Remotion-blue) ![FFmpeg](https://img.shields.io/badge/Engine-FFmpeg-007800) |
| **Cloud Services** | Tencent Cloud Medical OCR + Tencent Cloud COS + Edge TTS |

## 🏗 Architecture

```mermaid
graph TD
    %% Style Definitions
    classDef primary fill:#e8f5e9,stroke:#07c160,stroke-width:2px;
    classDef secondary fill:#f9f9f9,stroke:#333,stroke-width:1px;
    classDef neutral fill:#eceff1,stroke:#607d8b,stroke-width:1px;

    subgraph Frontend [WeChat Frontend]
        A["WeChat Miniprogram<br/>Taro 4 + React + TypeScript"]:::primary
    end

    subgraph Backend [Node.js Backend]
        direction TB
        B["Fastify + TypeScript"]:::secondary
        
        subgraph Services [Internal Services]
            S1["Upload API"]:::secondary
            S2["Status Sync"]:::secondary
            S3["Payment API"]:::secondary
        end
        
        Q[("Task Queue<br/>(BullMQ + Redis)")]:::secondary
        
        subgraph Pipeline [Video Generation Pipeline]
            direction LR
            P1["OCR"] --> P2["LLM"] --> P3["TTS"] --> P4["Render"] --> P5["Compose"]
        end
        class Pipeline primary
    end

    subgraph Data [Data & Storage]
        COS["Tencent Cloud COS"]:::neutral
        DB[("PostgreSQL")]:::neutral
    end

    %% Relations
    A -- "HTTPS API" --> B
    B --> Services
    S1 -- "Enqueue" --> Q
    Q -- "Async Worker" --> Pipeline
    
    Pipeline -- "Save Video" --> COS
    B -- "Persist Data" --> DB
```

## 📂 Project Structure

```text
EchoHealth/
├── apps/
│   ├── miniprogram/     # Taro WeChat Miniprogram
│   └── server/          # Fastify Backend Service
├── packages/
│   └── video/           # Remotion Video Templates
├── docs/
│   └── plans/           # Design Documents
└── README.md
```

## 🛠 Local Development

```bash
# Install dependencies
pnpm install

# Start backend service
pnpm --filter server dev

# Start miniprogram dev preview
pnpm --filter miniprogram dev:weapp
```

## 📊 Development Progress

> Last updated: 2026-02-27

### MVP Core Pipeline — All Complete ✅

| # | Module | Task | Status |
|---|--------|------|--------|
| 1 | Infrastructure | Monorepo init (pnpm workspace) | ✅ |
| 2 | Backend | Fastify backend project init | ✅ |
| 3 | Database | Prisma schema (User / Report / Video / Order) | ✅ |
| 4 | Queue | Redis + BullMQ task queue | ✅ |
| 5 | Pipeline | Tencent Cloud OCR image recognition | ✅ |
| 6 | Pipeline | Claude API LLM script generation | ✅ |
| 7 | Pipeline | edge-tts TTS audio generation | ✅ |
| 8 | Video | Remotion 4 video templates (5 slide types) | ✅ |
| 9 | Video | @remotion/renderer render + Tencent COS upload | ✅ |
| 10 | Backend | BullMQ Worker 8-step pipeline | ✅ |
| 11 | Backend | REST API (POST /reports, GET /reports/:id) | ✅ |
| 12 | Backend | Quota middleware + WeChat jscode2session login | ✅ |
| 13 | Miniprogram | Taro 4 miniprogram scaffold | ✅ |
| 14 | Miniprogram | 3-page implementation (Home / Upload / Result) | ✅ |

### Test Coverage

- **Server**: 11 test files, **45 test cases all passing**, `tsc` zero errors
- **Scope**: OCR parsing, LLM scripting, TTS generation, Remotion rendering, COS upload, Worker pipeline, REST API, quota middleware, WeChat login

### Upcoming (Next Phase)

- [ ] WeChat Pay Pro upgrade flow
- [ ] Device testing (requires real WeChat AppID, COS / Tencent credentials)
- [ ] Production deployment (server + PostgreSQL + Redis)
- [ ] CI/CD pipeline

## 📖 Documentation

For detailed product design and technical planning, please refer to: [`docs/plans/2026-02-27-echohealth-design.md`](docs/plans/2026-02-27-echohealth-design.md)

---

## License

MIT © [Young]
