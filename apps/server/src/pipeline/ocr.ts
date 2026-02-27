export interface Indicator {
  name: string
  code: string
  value: string
  unit: string
  referenceRange: string
  status: 'normal' | 'high' | 'low' | 'unknown'
}

/**
 * 调用腾讯云 OCR 识别报告图片，返回原始文本
 * 需要 TENCENT_SECRET_ID / TENCENT_SECRET_KEY 环境变量
 */
export async function ocrReportImage(base64Image: string): Promise<string> {
  // 动态导入，避免在没有凭证的环境中加载失败
  const { OcrClient } = await import(
    'tencentcloud-sdk-nodejs-ocr/tencentcloud/services/ocr/v20181119/ocr_client.js'
  )

  const client = new OcrClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID!,
      secretKey: process.env.TENCENT_SECRET_KEY!,
    },
    region: 'ap-guangzhou',
  })

  const res = await client.GeneralAccurateOCR({ ImageBase64: base64Image })
  return res.TextDetections?.map((t: any) => t.DetectedText).join('\n') ?? ''
}

/**
 * 从 OCR 原始文本中解析结构化指标
 * 纯函数，不依赖外部 API
 *
 * 支持格式：
 *   名称 CODE 数值 单位 参考范围 最小值-最大值 [↑↓]
 * 例：
 *   白细胞计数 WBC 6.5 ×10^9/L 参考范围 3.5-9.5
 *   葡萄糖 GLU 7.2 mmol/L 参考范围 3.9-6.1 ↑
 *   尿酸 UA 480 μmol/L 参考范围 150-420
 */
export function parseOcrText(text: string): Indicator[] {
  const indicators: Indicator[] = []
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    // 匹配模式：中文名称 英文代码(2-6位大写) 数值 单位 参考范围 数值范围 [↑↓]
    // 单位使用 \S+ 以匹配 ×10^9/L、μmol/L 等含特殊字符的单位
    // 参考范围分隔符支持 - 或 ~
    const match = line.match(
      /^(.+?)\s+([A-Z]{2,6})\s+([\d.]+)\s+(\S+)\s+参考范围\s+([\d.]+[-~][\d.]+)\s*(↑|↓)?/,
    )
    if (!match) continue

    const [, name, code, value, unit, referenceRange, arrow] = match

    let status: Indicator['status'] = 'normal'

    if (arrow === '↑') {
      status = 'high'
    } else if (arrow === '↓') {
      status = 'low'
    } else {
      // 根据参考范围推断：解析 min-max 或 min~max
      const rangeParts = referenceRange.split(/[-~]/)
      if (rangeParts.length === 2) {
        const min = parseFloat(rangeParts[0])
        const max = parseFloat(rangeParts[1])
        const num = parseFloat(value)
        if (!isNaN(min) && !isNaN(max) && !isNaN(num)) {
          if (num > max) status = 'high'
          else if (num < min) status = 'low'
        }
      }
    }

    indicators.push({
      name: name.trim(),
      code,
      value,
      unit,
      referenceRange,
      status,
    })
  }

  return indicators
}
