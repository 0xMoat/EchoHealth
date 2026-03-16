// apps/server/src/routes/saas/upload.ts
import { FastifyInstance } from 'fastify'
import { prisma } from '../../db.js'
import { uploadImageBuffer } from '../../pipeline/upload.js'
import { getPdfPageCount } from '../../lib/image.js'

const FREE_IMAGE_LIMIT = 3
const PRO_IMAGE_LIMIT = 5
const FREE_PDF_PAGES = 3
const PRO_PDF_PAGES = 5
const FREE_FILE_SIZE = 5 * 1024 * 1024   // 5MB
const PRO_FILE_SIZE = 10 * 1024 * 1024    // 10MB
const FREE_PDF_SIZE = 10 * 1024 * 1024    // 10MB
const PRO_PDF_SIZE = 20 * 1024 * 1024     // 20MB

export default async function saasUploadRoutes(app: FastifyInstance) {
  app.post('/upload', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' })
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const isPro = user.isPro
    const parts = request.parts()
    const urls: string[] = []
    let inputType: 'IMAGE' | 'PDF' = 'IMAGE'
    let fileCount = 0

    for await (const part of parts) {
      if (part.type !== 'file') continue
      fileCount++

      const maxFiles = isPro ? PRO_IMAGE_LIMIT : FREE_IMAGE_LIMIT
      if (fileCount > maxFiles) {
        return reply.status(400).send({
          error: `Maximum ${maxFiles} files allowed${isPro ? '' : ' (upgrade to Pro for more)'}`,
        })
      }

      const buffer = await part.toBuffer()
      const isPdf = part.mimetype === 'application/pdf'

      if (isPdf) {
        inputType = 'PDF'
        const maxSize = isPro ? PRO_PDF_SIZE : FREE_PDF_SIZE
        if (buffer.length > maxSize) {
          return reply.status(413).send({ error: `PDF too large. Max ${maxSize / 1024 / 1024}MB` })
        }
        const pages = await getPdfPageCount(buffer)
        const maxPages = isPro ? PRO_PDF_PAGES : FREE_PDF_PAGES
        if (pages > maxPages) {
          return reply.status(400).send({ error: `PDF has ${pages} pages. Max ${maxPages} pages allowed` })
        }
      } else {
        const maxSize = isPro ? PRO_FILE_SIZE : FREE_FILE_SIZE
        if (buffer.length > maxSize) {
          return reply.status(413).send({ error: `Image too large. Max ${maxSize / 1024 / 1024}MB` })
        }
      }

      const ext = isPdf ? 'pdf' : (part.filename?.split('.').pop() || 'jpg')
      const url = await uploadImageBuffer(buffer, user.id, ext)
      urls.push(url)
    }

    if (urls.length === 0) {
      return reply.status(400).send({ error: 'No files uploaded' })
    }

    return { urls, inputType }
  })
}
