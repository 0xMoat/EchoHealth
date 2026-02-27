import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'

interface WxCode2SessionResponse {
  openid?: string
  session_key?: string
  errcode?: number
  errmsg?: string
}

async function wxCode2Session(code: string): Promise<string> {
  const appid = process.env.WX_APPID
  const secret = process.env.WX_SECRET
  if (!appid || !secret) {
    throw new Error('Missing WX_APPID or WX_SECRET environment variables')
  }

  const url =
    `https://api.weixin.qq.com/sns/jscode2session` +
    `?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`WeChat API HTTP error: ${res.status}`)

  const data = (await res.json()) as WxCode2SessionResponse
  if (data.errcode) {
    throw new Error(`WeChat login failed: ${data.errcode} ${data.errmsg}`)
  }
  if (!data.openid) throw new Error('WeChat API returned no openid')
  return data.openid
}

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /auth/login
   * Body: { code, nickname?, avatarUrl? }
   * Exchanges a WeChat login code for openid, upserts User, returns userId.
   */
  app.post<{
    Body: { code: string; nickname?: string; avatarUrl?: string }
  }>('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', minLength: 1 },
          nickname: { type: 'string' },
          avatarUrl: { type: 'string' },
        },
      },
    },
    async handler(request, reply) {
      const { code, nickname, avatarUrl } = request.body

      const openid = await wxCode2Session(code)

      const user = await prisma.user.upsert({
        where: { openid },
        create: { openid, nickname, avatarUrl },
        update: {
          ...(nickname ? { nickname } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      })

      return { userId: user.id, isPro: user.isPro }
    },
  })
}
