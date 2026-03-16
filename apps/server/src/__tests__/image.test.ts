// apps/server/src/__tests__/image.test.ts
import { describe, it, expect } from 'vitest'
import sharp from 'sharp'

describe('Image preprocessing', () => {
  it('returns JPEG for small images without resize', async () => {
    const { resizeImageForVision } = await import('../lib/image.js')
    const smallPng = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'red' } })
      .png().toBuffer()
    const result = await resizeImageForVision(smallPng)
    const meta = await sharp(result).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBe(100)
  })

  it('resizes large images to fit within 1568px', async () => {
    const { resizeImageForVision } = await import('../lib/image.js')
    const largePng = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: 'blue' } })
      .png().toBuffer()
    const result = await resizeImageForVision(largePng)
    const meta = await sharp(result).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBeLessThanOrEqual(1568)
    expect(meta.height).toBeLessThanOrEqual(1568)
  })
})
