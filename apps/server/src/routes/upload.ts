import type { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import { uploadImageBuffer } from '../pipeline/upload.js'

export async function uploadRoutes(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10 MB

  /**
   * POST /upload/image
   * Accepts multipart form with a "file" field.
   * Uploads to COS and returns the public URL.
   */
  app.post('/upload/image', {
    async handler(request, reply) {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      const userId = request.headers['x-user-id'] as string | undefined
      if (!userId) {
        return reply.status(401).send({ error: 'Missing x-user-id header' })
      }

      const buf = await data.toBuffer()
      const ext = data.filename?.split('.').pop()?.toLowerCase() || 'jpg'
      const url = await uploadImageBuffer(buf, userId, ext)

      return reply.send({ url })
    },
  })
}
