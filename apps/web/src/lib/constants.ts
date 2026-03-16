export const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export const LIMITS = {
  free: { images: 3, pdfPages: 3, fileSize: 5, pdfSize: 10, monthly: 3 },
  pro: { images: 5, pdfPages: 5, fileSize: 10, pdfSize: 20, monthly: 30 },
} as const

export const LANGUAGE_OPTIONS = [
  { value: 'AUTO', label: 'Auto-detect' },
  { value: 'EN', label: 'English' },
  { value: 'ZH', label: '中文' },
] as const
