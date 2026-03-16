import sharp from 'sharp'

const MAX_DIMENSION = 1568

export async function resizeImageForVision(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
}

export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const count = doc.numPages
  doc.destroy()
  return count
}
