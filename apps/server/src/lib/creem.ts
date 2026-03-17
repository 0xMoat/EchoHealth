import crypto from 'crypto'

export const CREEM_PLANS = {
  monthly: process.env.CREEM_PRODUCT_MONTHLY!,
  pass: process.env.CREEM_PRODUCT_PASS!,
} as const

export type CreemPlan = keyof typeof CREEM_PLANS

interface CreateCheckoutOptions {
  plan: CreemPlan
  userId: string
  userEmail: string
}

export async function createCheckout({ plan, userId, userEmail }: CreateCheckoutOptions): Promise<string> {
  const apiKey = process.env.CREEM_API_KEY
  const webBaseUrl = process.env.WEB_BASE_URL || 'http://localhost:3001'
  const productId = CREEM_PLANS[plan]

  const res = await fetch('https://api.creem.io/v1/checkouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey!,
    },
    body: JSON.stringify({
      product_id: productId,
      customer: { email: userEmail },
      metadata: { userId },
      success_url: `${webBaseUrl}/dashboard?upgraded=true`,
      cancel_url: `${webBaseUrl}/pricing`,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Creem checkout failed: ${res.status} ${err}`)
  }

  const data = await res.json() as { checkout_url: string }
  return data.checkout_url
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.CREEM_WEBHOOK_SECRET!
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody)
  const expected = hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
