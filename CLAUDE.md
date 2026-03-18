# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

EchoHealth — AI 健康报告视频解读。包含 Fastify 后端 (`apps/server`)、Next.js SaaS 前端 (`apps/web`)、微信小程序 (`apps/miniprogram`)。

## Package Manager

Use `pnpm` (not npm or yarn).

## Deployment

Prefer Vercel for static web deployments.

## Creem 支付集成注意事项

- **Test vs Production API**：test key（`creem_test_*`）必须使用 `https://test-api.creem.io`，production key 使用 `https://api.creem.io`。用错会返回 403 Forbidden，错误信息不会提示 base URL 问题。
- **不支持 `cancel_url`**：Creem checkout API 的 request body 不接受 `cancel_url` 字段，传了会返回 400。
- **URL 必须是域名或 localhost**：`success_url` 不接受 IP 地址（如 `http://137.131.22.123:3001`），会返回 400 "URL must be valid"。必须用 `http://localhost:*` 或正式域名。
- **环境变量**：`CREEM_API_BASE_URL` 控制 API 地址，`WEB_BASE_URL` 控制 checkout 回跳地址。

## 部署原则

遇到任何服务器部署操作（上传文件、构建、重启进程、查看日志、验证服务），**必须先查阅 `docs/deploy.md`**，参照其中的标准流程自主完成，不要将步骤抛给用户手动执行。

- SSH 连接：使用 `ssh n8n` 别名，需要 `dangerouslyDisableSandbox: true`，首次使用前修复 oracle-ssh-keys 目录权限
- 服务器代码路径：`/home/ubuntu/echohealth/`（全小写）
- 进程管理：PM2，`export PATH=/home/ubuntu/.npm-global/bin:$PATH` 前置
- 详细操作参考：`docs/deploy.md` → "Claude Code 自主部署" 章节
