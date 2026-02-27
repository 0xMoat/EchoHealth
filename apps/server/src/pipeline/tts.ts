import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 调用 edge-tts 将文本转换为语音
 * @param text 要转换的文本
 * @param outputPath 输出 mp3 文件路径
 * @param voice 音色，默认使用温柔女声
 */
export async function generateAudio(
  text: string,
  outputPath: string,
  voice = 'zh-CN-XiaoxiaoNeural'
): Promise<void> {
  // 转义文本中可能破坏 shell 命令的字符
  const sanitized = text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .trim()

  if (!sanitized) throw new Error('Text cannot be empty')

  const cmd = `edge-tts --voice "${voice}" --text "${sanitized}" --write-media "${outputPath}"`

  try {
    await execAsync(cmd)
  } catch (err) {
    throw new Error(`edge-tts failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * 将脚本各段分别生成音频文件
 * @param segments 文本段落数组
 * @param tmpDir 临时目录路径
 * @returns 生成的音频文件路径数组（与 segments 顺序对应）
 */
export async function generateScriptAudio(
  segments: string[],
  tmpDir: string
): Promise<string[]> {
  const paths: string[] = []
  for (let i = 0; i < segments.length; i++) {
    const outputPath = `${tmpDir}/segment-${i}.mp3`
    await generateAudio(segments[i], outputPath)
    paths.push(outputPath)
  }
  return paths
}
