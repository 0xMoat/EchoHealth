import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((cmd: string, callback: (err: null, stdout: string, stderr: string) => void) => {
    callback(null, '', '')
  }),
}))

describe('generateAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls edge-tts with correct arguments', async () => {
    const { exec } = await import('child_process')
    const { generateAudio } = await import('../pipeline/tts.js')

    await generateAudio('您好，这是测试', '/tmp/test.mp3')

    expect(exec).toHaveBeenCalledOnce()
    const callArg = vi.mocked(exec).mock.calls[0][0] as string
    expect(callArg).toContain('edge-tts')
    expect(callArg).toContain('zh-CN-XiaoxiaoNeural')
    expect(callArg).toContain('您好，这是测试')
    expect(callArg).toContain('/tmp/test.mp3')
  })

  it('throws on empty text', async () => {
    vi.resetModules()
    const { generateAudio } = await import('../pipeline/tts.js')
    await expect(generateAudio('   ', '/tmp/test.mp3')).rejects.toThrow('Text cannot be empty')
  })

  it('sanitizes newlines in text', async () => {
    vi.resetModules()
    const { exec } = await import('child_process')
    const { generateAudio } = await import('../pipeline/tts.js')

    await generateAudio('第一行\n第二行', '/tmp/test.mp3')

    const callArg = vi.mocked(exec).mock.calls[0][0] as string
    expect(callArg).not.toContain('\n')
    expect(callArg).toContain('第一行 第二行')
  })
})

describe('generateScriptAudio', () => {
  it('generates one file per segment and returns paths', async () => {
    vi.resetModules()
    const { generateScriptAudio } = await import('../pipeline/tts.js')
    const paths = await generateScriptAudio(['段落一', '段落二', '段落三'], '/tmp/echohealth')
    expect(paths).toHaveLength(3)
    expect(paths[0]).toBe('/tmp/echohealth/segment-0.mp3')
    expect(paths[1]).toBe('/tmp/echohealth/segment-1.mp3')
    expect(paths[2]).toBe('/tmp/echohealth/segment-2.mp3')
  })
})
