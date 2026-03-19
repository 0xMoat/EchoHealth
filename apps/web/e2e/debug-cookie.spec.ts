import { test, expect } from '@playwright/test'

test('debug: verify cookie flow', async ({ page }) => {
  await page.goto('/')

  // Step 1: Login
  const loginResult = await page.evaluate(async () => {
    const res = await fetch('/api/saas/auth/test-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'debug@e2e.local', nickname: 'Debug' }),
    })
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => { headers[k] = v })
    return { status: res.status, headers, body: await res.json() }
  })
  console.log('LOGIN:', JSON.stringify(loginResult, null, 2))

  // Step 2: Check cookies in browser context
  const cookies = await page.context().cookies()
  console.log('COOKIES:', JSON.stringify(cookies, null, 2))

  // Step 3: Call /auth/me to verify auth works
  const meResult = await page.evaluate(async () => {
    const res = await fetch('/api/saas/auth/me', { credentials: 'include' })
    return { status: res.status, body: await res.json().catch(() => null) }
  })
  console.log('ME:', JSON.stringify(meResult, null, 2))

  expect(meResult.status).toBe(200)
})
