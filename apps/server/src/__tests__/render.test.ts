import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockBundle = vi.fn().mockResolvedValue('/tmp/remotion-bundle')
const mockSelectComposition = vi.fn().mockResolvedValue({
  id: 'HealthReport',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 900,
})
const mockRenderMedia = vi.fn().mockResolvedValue(undefined)

vi.mock('@remotion/bundler', () => ({ bundle: mockBundle }))
vi.mock('@remotion/renderer', () => ({
  selectComposition: mockSelectComposition,
  renderMedia: mockRenderMedia,
}))

const MOCK_INPUT = {
  script: {
    summary: '总体正常',
    details: [],
    suggestions: '保持良好作息',
    outro: '感谢您的信任',
  },
  reportType: 'BLOOD_ROUTINE' as const,
  senderName: 'EchoHealth',
  audioSrc: 'https://example.com/audio.mp3',
}

describe('renderVideo', () => {
  beforeEach(() => {
    mockBundle.mockClear()
    mockSelectComposition.mockClear()
    mockRenderMedia.mockClear()
  })

  it('calls bundle(), selectComposition(), and renderMedia() in sequence', async () => {
    const { renderVideo, clearBundleCache } = await import('../pipeline/render.js')
    clearBundleCache()

    await renderVideo(MOCK_INPUT, '/tmp/output.mp4')

    expect(mockBundle).toHaveBeenCalledOnce()
    expect(mockSelectComposition).toHaveBeenCalledWith(
      expect.objectContaining({
        serveUrl: '/tmp/remotion-bundle',
        id: 'HealthReport',
        inputProps: MOCK_INPUT,
      }),
    )
    expect(mockRenderMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        codec: 'h264',
        outputLocation: '/tmp/output.mp4',
        inputProps: MOCK_INPUT,
      }),
    )
  })

  it('reuses the bundle on subsequent calls (cache hit)', async () => {
    const { renderVideo, clearBundleCache } = await import('../pipeline/render.js')
    clearBundleCache()

    await renderVideo(MOCK_INPUT, '/tmp/a.mp4')
    await renderVideo(MOCK_INPUT, '/tmp/b.mp4')

    // bundle() should only be called once across two renders
    expect(mockBundle).toHaveBeenCalledOnce()
    expect(mockRenderMedia).toHaveBeenCalledTimes(2)
  })

  it('propagates errors from renderMedia()', async () => {
    const { renderVideo, clearBundleCache } = await import('../pipeline/render.js')
    clearBundleCache()
    mockRenderMedia.mockRejectedValueOnce(new Error('render failed'))

    await expect(renderVideo(MOCK_INPUT, '/tmp/output.mp4')).rejects.toThrow('render failed')
  })
})
