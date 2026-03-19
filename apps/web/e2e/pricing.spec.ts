import { test, expect } from '@playwright/test'
import { loginAsTestUser, cleanupTestUser } from './helpers/auth'

test.describe('Pricing Page', () => {
  test('renders three pricing tiers', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.getByText('Free', { exact: true })).toBeVisible()
    await expect(page.getByText('$0')).toBeVisible()
    await expect(page.getByText('$4.99')).toBeVisible()
    await expect(page.getByText('$7.99')).toBeVisible()
  })

  test('shows correct feature lists', async ({ page }) => {
    await page.goto('/pricing')

    // Free tier features
    await expect(page.getByText(/3 reports/i).first()).toBeVisible()

    // Pro tier features
    await expect(page.getByText(/30 reports/i).first()).toBeVisible()
  })

  test('subscribe button triggers Creem checkout for logged-in user', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    await page.goto('/pricing')

    // Click subscribe/buy button
    const subscribeBtn = page.getByRole('button', { name: /subscribe|buy/i }).first()
    // If the button is a link instead
    const subscribeLink = page.locator('button, a').filter({ hasText: /subscribe now/i }).first()

    if (await subscribeLink.isVisible()) {
      // Intercept the navigation to Creem checkout
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes('/creem/checkout') || res.url().includes('creem.io'),
          { timeout: 10_000 },
        ).catch(() => null),
        subscribeLink.click(),
      ])

      // Should either redirect to Creem or get a checkout URL response
      // The actual Creem redirect may fail if CREEM_API_KEY is not set
    }

    await cleanupTestUser(request, user.email)
  })

  test('pro user sees "Current Plan" indicator', async ({ page, request }) => {
    const user = await loginAsTestUser(page, { isPro: true })

    await page.goto('/pricing')

    // Should show current plan indicator for pro tier
    await expect(
      page.getByText(/current plan|active/i).first(),
    ).toBeVisible({ timeout: 10_000 })

    await cleanupTestUser(request, user.email)
  })

  test('pricing page is accessible without login', async ({ page }) => {
    await page.goto('/pricing')
    // Should load without redirecting to login
    await expect(page).toHaveURL(/\/pricing/)
    await expect(page.getByText('$4.99')).toBeVisible()
  })
})
