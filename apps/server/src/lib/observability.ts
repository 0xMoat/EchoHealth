import { Langfuse } from 'langfuse'

let _lf: Langfuse | null = null

/** Returns a Langfuse client, or null if keys are not configured. */
export function getLangfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return null
  if (!_lf) {
    _lf = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
    })
    _lf.on('error', (e) => console.warn('[Langfuse] error:', e))
  }
  return _lf
}
