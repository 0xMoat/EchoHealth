# SaaS 域名、Google 登录与 API 代理运行手册

本文档总结 `echohealth.mintmind.io` SaaS 前端上线过程中，域名配置、Google OAuth、Vercel 代理和后端 HTTPS 的关键修复过程与当前正确配置。

适用范围：

- SaaS 前端域名：`https://echohealth.mintmind.io`
- SaaS 后端域名：`https://api.echohealth.mintmind.io`
- 前端部署平台：Vercel
- 后端服务器：Oracle 云主机 `137.131.22.123`
- 后端反向代理：Caddy

---

## 当前正确配置

### 1. Vercel DNS

`mintmind.io` 当前权威 DNS 在 Vercel，不在 Porkbun。

关键记录如下：

| Name | Type | Value | 用途 |
|------|------|-------|------|
| `echohealth` | `CNAME` | `8e83033eb2d4ad9b.vercel-dns-017.com.` | SaaS 前端 |
| `api.echohealth` | `A` | `137.131.22.123` | SaaS 后端 |

最终效果：

- `echohealth.mintmind.io` -> Vercel
- `api.echohealth.mintmind.io` -> Oracle 服务器

### 2. Vercel 前端环境变量

生产环境至少需要：

```env
NEXT_PUBLIC_API_URL=https://api.echohealth.mintmind.io
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google OAuth Client ID>
```

说明：

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 缺失时，Google 弹窗会报 `Missing required parameter: client_id`
- `NEXT_PUBLIC_API_URL` 缺失或错误时，前端的 `/api/saas/*` rewrite 会失败

### 3. 前端请求链路

`apps/web/next.config.ts` 中：

```ts
{
  source: '/api/saas/:path*',
  destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/saas/:path*`,
}
```

这意味着：

- 前端代码请求的是同源 `/api/saas/*`
- 由 Next.js rewrite 转发到 `NEXT_PUBLIC_API_URL`
- 生产环境必须把 `NEXT_PUBLIC_API_URL` 指向公网可访问的 HTTPS 后端域名

### 4. Google OAuth

Google Cloud Console 中，对当前 Web Client 必须配置：

#### Authorized JavaScript origins

至少包含：

- `https://echohealth.mintmind.io`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

如果本地会使用其他端口，也需要精确加入对应 origin。

注意：

- 这里只填 origin，不带路径
- 协议和端口必须精确匹配

#### Authorized redirect URIs

当前 SaaS 登录使用的是 `@react-oauth/google` 前端凭证流，不依赖自定义 redirect URI。

因此本项目这次修复中，问题不在 redirect URI，而在：

- `Authorized JavaScript origins`
- Vercel 缺失 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### 5. 后端服务器与 HTTPS

后端实际服务：

- Fastify：`127.0.0.1:3000`
- Caddy：监听 `:80` / `:443`
- 反代站点：`api.echohealth.mintmind.io`

Caddy 站点配置核心逻辑：

```caddy
api.echohealth.mintmind.io {
    reverse_proxy 127.0.0.1:3000
}
```

---

## 这次修复中确认过的关键事实

### 1. Porkbun 记录不是最终生效来源

虽然域名在 Porkbun 注册，但当 nameserver 已切到：

- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

时，真正生效的权威 DNS 就是 Vercel。

结论：

- 之后所有 `mintmind.io` 子域名记录，应该在 Vercel DNS 修改
- 只改 Porkbun 面板里的 DNS Records 不会生效

### 2. 本地 Google 报 `origin_mismatch` 的原因

原因是当前访问 origin 不在 Google OAuth client 的 `Authorized JavaScript origins` 中。

典型表现：

- `http://localhost:3000` 可用
- `http://localhost:3001` 不可用
- `http://127.0.0.1:3000` 与 `http://localhost:3000` 不是同一个 origin

### 3. 线上 Google 报 `Missing required parameter: client_id` 的原因

原因是：

- Vercel 生产环境没有配置 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

这不是后端问题，也不是 Google Console origin 问题，而是前端构建时没有注入 client id。

### 4. 线上 `/api/saas/auth/google` 返回 404 的原因

控制台中曾出现：

- `POST https://echohealth.mintmind.io/api/saas/auth/google 404`

根因是：

- Vercel rewrite 指向了错误或私有地址
- 曾出现 `x-vercel-error: DNS_HOSTNAME_RESOLVED_PRIVATE`

最终修复方式是：

- 给后端配置独立公网域名 `https://api.echohealth.mintmind.io`
- 把 `NEXT_PUBLIC_API_URL` 指向这个域名

### 5. `echohealth.mintmind.io` 在 Vercel 中显示 `Invalid Configuration` 的原因

原因是前端域名记录不符合 Vercel 当前要求。

错误状态：

- `echohealth` 仍指向旧的 `A 76.76.21.21`

正确状态：

- `echohealth CNAME 8e83033eb2d4ad9b.vercel-dns-017.com.`

---

## 推荐的排障顺序

### Google 弹窗直接报错

先看报错类型：

- `origin_mismatch`
  - 检查 Google Cloud Console 的 `Authorized JavaScript origins`
- `Missing required parameter: client_id`
  - 检查 Vercel 是否配置 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  - 检查是否已经重新部署 Production

### Google 弹窗成功，但页面提示登录失败

优先检查浏览器控制台 / Network：

- 如果 `POST /api/saas/auth/google` 失败
  - 检查 `NEXT_PUBLIC_API_URL`
  - 检查 Vercel rewrite 目标是否是公网地址
  - 检查 `api.echohealth.mintmind.io` 是否已正确解析到 `137.131.22.123`
  - 检查 Caddy 和 Fastify 是否在线

### Vercel 域名显示 `Invalid Configuration`

检查：

- 当前权威 DNS 是否在 Vercel
- 该子域名记录是否与 Vercel 域名页面要求完全一致
- 是否仍残留旧的 `A 76.76.21.21`

---

## 上线后建议保持的约束

1. 前端正式域名始终走 Vercel
2. 后端正式域名始终走独立子域名，不直接暴露 IP 给前端配置
3. `NEXT_PUBLIC_API_URL` 一律使用 HTTPS 域名，不使用 IP
4. 本地调试若需要 Google 登录，先确认本地 origin 已加入 Google 白名单
5. 修改 Vercel `NEXT_PUBLIC_*` 环境变量后，必须重新部署

---

## 快速核对清单

上线前确认以下项目：

- `echohealth.mintmind.io` 在 Vercel 中显示 `Valid Configuration`
- `api.echohealth.mintmind.io` 可解析到 `137.131.22.123`
- Vercel 生产环境已配置：
  - `NEXT_PUBLIC_API_URL=https://api.echohealth.mintmind.io`
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same as backend GOOGLE_CLIENT_ID>`
- Google Cloud Console 已加入：
  - `https://echohealth.mintmind.io`
  - `http://localhost:3000`
- Oracle 服务器上：
  - Caddy 正常运行
  - Fastify 正常监听 `127.0.0.1:3000`

