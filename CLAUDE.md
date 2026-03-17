# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

EchoHealth is a new project with no source code yet. The repository currently only contains Claude Code skill configurations.

## Installed Skills

The following skills are available via `skills-lock.json` (sourced from `ReScienceLab/opc-skills`):

- `archive` - Session archiving and knowledge persistence
- `banner-creator` - AI-generated banners and headers
- `domain-hunter` - Domain search and pricing
- `logo-creator` - AI-generated logos and icons
- `nanobanana` - Image generation via Google Gemini
- `producthunt` - Product Hunt data retrieval
- `reddit` - Reddit search and content retrieval
- `requesthunt` - User demand research from real feedback
- `seo-geo` - SEO and AI search engine optimization
- `twitter` - Twitter/X content retrieval

## Package Manager

Use `pnpm` (not npm or yarn).

## Deployment

Prefer Vercel for static web deployments.

## 部署原则

遇到任何服务器部署操作（上传文件、构建、重启进程、查看日志、验证服务），**必须先查阅 `docs/deploy.md`**，参照其中的标准流程自主完成，不要将步骤抛给用户手动执行。

- SSH 连接：使用 `ssh n8n` 别名，需要 `dangerouslyDisableSandbox: true`，首次使用前修复 oracle-ssh-keys 目录权限
- 服务器代码路径：`/home/ubuntu/echohealth/`（全小写）
- 进程管理：PM2，`export PATH=/home/ubuntu/.npm-global/bin:$PATH` 前置
- 详细操作参考：`docs/deploy.md` → "Claude Code 自主部署" 章节
