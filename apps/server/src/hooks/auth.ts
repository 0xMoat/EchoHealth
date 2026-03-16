import { FastifyRequest } from 'fastify'
import { verifyToken } from '../lib/jwt.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string } | null
  }
}

export async function authHook(request: FastifyRequest) {
  const headerUserId = request.headers['x-user-id']
  if (typeof headerUserId === 'string' && headerUserId) {
    request.user = { id: headerUserId }
    return
  }

  const cookieHeader = request.headers.cookie
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
    if (match) {
      try {
        const payload = verifyToken(match[1])
        request.user = { id: payload.userId }
        return
      } catch { /* invalid token */ }
    }
  }

  const body = request.body as Record<string, unknown> | undefined
  if (body?.userId && typeof body.userId === 'string') {
    request.user = { id: body.userId }
    return
  }

  const query = request.query as Record<string, unknown> | undefined
  if (query?.userId && typeof query.userId === 'string') {
    request.user = { id: query.userId }
    return
  }

  request.user = null
}
