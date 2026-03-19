// Always use relative paths so requests go through Next.js rewrite proxy (same-origin, no CORS)
export const API_BASE = ''

export const LIMITS = {
  free: { images: 3, pdfPages: 3, fileSize: 5, pdfSize: 10, monthly: 3 },
  pro: { images: 10, pdfPages: 20, fileSize: 20, pdfSize: 20, monthly: 30 },
} as const

export const PRO_MONTHLY_PRICE = 4.99   // USD
export const PASS_PRICE        = 7.99   // USD
export const PASS_DAYS         = 30
