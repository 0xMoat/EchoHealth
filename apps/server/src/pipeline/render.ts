import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { fileURLToPath } from 'url'
import path from 'path'
import type { VideoScript } from './llm.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Path to packages/video entry point (4 levels up from apps/server/src/pipeline)
const VIDEO_ENTRY = path.resolve(
  __dirname,
  '../../../../packages/video/src/Root.tsx',
)

const COMPOSITION_ID = 'HealthReport'

// Reuse the same bundle across jobs for the lifetime of the process
let bundleCache: string | null = null

async function getServeUrl(): Promise<string> {
  if (bundleCache) return bundleCache
  console.log('[Render] Bundling Remotion composition...')
  bundleCache = await bundle({ entryPoint: VIDEO_ENTRY })
  console.log('[Render] Bundle ready:', bundleCache)
  return bundleCache
}

export interface RenderInput {
  script: VideoScript
  reportType: 'BLOOD_ROUTINE' | 'BIOCHEMISTRY' | 'PHYSICAL_EXAM'
  senderName: string
  audioSrc?: string
}

export async function renderVideo(
  input: RenderInput,
  outputPath: string,
): Promise<void> {
  const serveUrl = await getServeUrl()

  const props = input as unknown as Record<string, unknown>

  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps: props,
  })

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props,
    logLevel: 'warn',
    onProgress: ({ progress }) =>
      console.log(`[Render] ${(progress * 100).toFixed(0)}%`),
    ...(process.env.CHROME_PATH
      ? { browserExecutable: process.env.CHROME_PATH }
      : {}),
  })
}

/** Invalidate the bundle cache (e.g. for testing or hot-reload). */
export function clearBundleCache(): void {
  bundleCache = null
}
