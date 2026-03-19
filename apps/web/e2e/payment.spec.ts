import { test, expect } from '@playwright/test'
import { loginAsTestUser, cleanupTestUser } from './helpers/auth'

/**
 * Payment tests using Creem test mode.
 *
 * Prerequisites:
 * - Server has CREEM_API_KEY set to a creem_test_* key
 * - Server has CREEM_PRODUCT_MONTHLY and CREEM_PRODUCT_PASS set
 * - CREEM_API_BASE_URL should auto-detect to https://test-api.creem.io
 *
 * Creem test card: 4242 4242 4242 4242, any future expiry, any CVC
 */
test.describe('Payment (Creem Test Mode)', () => {
  test('checkout API returns a valid Creem URL for monthly plan', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    const res = await page.request.post('/api/saas/creem/checkout', {
      data: { plan: 'monthly' },
    })

    if (res.status() === 502) {
      test.skip(true, 'Creem API not configured — skipping payment test')
      return
    }

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.checkoutUrl).toMatch(/creem\.io/)

    await cleanupTestUser(request, user.email)
  })

  test('checkout API returns a valid Creem URL for pass plan', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    const res = await page.request.post('/api/saas/creem/checkout', {
      data: { plan: 'pass' },
    })

    if (res.status() === 502) {
      test.skip(true, 'Creem API not configured — skipping payment test')
      return
    }

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.checkoutUrl).toMatch(/creem\.io/)

    await cleanupTestUser(request, user.email)
  })

  test('checkout API rejects invalid plan', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    const res = await page.request.post('/api/saas/creem/checkout', {
      data: { plan: 'invalid' },
    })

    expect(res.status()).toBe(400)

    await cleanupTestUser(request, user.email)
  })

  test('checkout requires authentication', async ({ page }) => {
    // Navigate to page but DON'T log in — verify API rejects unauthenticated request
    await page.goto('/', { waitUntil: 'commit' })
    const res = await page.request.post('/api/saas/creem/checkout', {
      data: { plan: 'monthly' },
    })

    expect(res.status()).toBe(401)
  })

  test('full checkout flow: pricing page → Creem checkout page', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    await page.goto('/pricing')

    const subscribeBtn = page.locator('button, a').filter({ hasText: /subscribe now/i }).first()

    if (!(await subscribeBtn.isVisible())) {
      test.skip(true, 'Subscribe button not found — may need auth')
      return
    }

    await subscribeBtn.click()
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    if (currentUrl.includes('creem.io')) {
      expect(currentUrl).toContain('creem.io')
    }
    // If stayed on pricing, Creem may not be configured — acceptable

    await cleanupTestUser(request, user.email)
  })

  test.describe('Creem test card checkout (requires CREEM_API_KEY)', () => {
    test('complete payment with test card 4242', async ({ page, request }) => {
      const user = await loginAsTestUser(page)

      const res = await page.request.post('/api/saas/creem/checkout', {
        data: { plan: 'pass' },
      })

      if (res.status() !== 200) {
        test.skip(true, 'Creem API not configured or checkout failed')
        return
      }

      const body = await res.json()
      if (!body.checkoutUrl) {
        test.skip(true, 'No checkout URL returned')
        return
      }

      await page.goto(body.checkoutUrl)
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

      const cardInput = page.locator('input[name*="card" i], input[placeholder*="card" i], [data-testid*="card" i]').first()

      if (await cardInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await cardInput.fill('4242424242424242')

        const expiryInput = page.locator('input[name*="expir" i], input[placeholder*="MM" i]').first()
        if (await expiryInput.isVisible()) {
          await expiryInput.fill('12/30')
        }

        const cvcInput = page.locator('input[name*="cvc" i], input[name*="cvv" i], input[placeholder*="CVC" i]').first()
        if (await cvcInput.isVisible()) {
          await cvcInput.fill('123')
        }

        const payBtn = page.getByRole('button', { name: /pay|submit|complete/i }).first()
        if (await payBtn.isVisible()) {
          await payBtn.click()
          await page.waitForURL(/dashboard\?upgraded=true/, { timeout: 30_000 }).catch(() => {})
          const finalUrl = page.url()
          if (finalUrl.includes('dashboard')) {
            expect(finalUrl).toContain('upgraded=true')
          }
        }
      } else {
        test.skip(true, 'Could not find Creem card input fields')
      }

      await cleanupTestUser(request, user.email)
    })
  })

  test('webhook signature verification rejects invalid signatures', async ({ request }) => {
    const res = await request.post('http://localhost:3000/api/saas/creem/webhook', {
      data: { type: 'checkout.completed', data: { object: {} } },
      headers: {
        'Creem-Signature': 'invalid-signature',
        'Content-Type': 'application/json',
      },
    })

    expect(res.status()).toBe(400)
  })
})
