import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders hero section with CTA', async ({ page }) => {
    // Hero headline should be visible
    await expect(page.locator('h1').first()).toBeVisible()
    // CTA button should link to upload or login
    const cta = page.locator('a[href="/upload"], a[href="/login"]').first()
    await expect(cta).toBeVisible()
  })

  test('renders benefits section', async ({ page }) => {
    // "How it works" or benefits section
    const section = page.getByText(/how it works|benefits/i).first()
    await expect(section).toBeVisible()
  })

  test('renders pricing preview with 3 tiers', async ({ page }) => {
    // Should show Free, Pro, and Pass tiers
    await expect(page.getByText('Free', { exact: true })).toBeVisible()
    await expect(page.getByText('Pro', { exact: true })).toBeVisible()
    await expect(page.getByText('$4.99')).toBeVisible()
    await expect(page.getByText('$7.99')).toBeVisible()
  })

  test('renders faq section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /frequently asked questions|常见问题/i })).toBeVisible()
    await expect(page.locator('details')).toHaveCount(4)
  })

  test('renders footer with links', async ({ page }) => {
    // Use role=contentinfo to select the main footer, not testimonial card footers
    const footer = page.getByRole('contentinfo')
    await expect(footer).toBeVisible()
    await expect(footer.locator('a')).not.toHaveCount(0)
    await expect(footer.getByRole('link', { name: /privacy policy|隐私政策/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /terms of service|服务条款/i })).toBeVisible()
  })

  test('renders testimonials carousel', async ({ page }) => {
    const region = page.getByRole('region', { name: /loved by families|用户好评/i })
    await expect(region).toBeVisible()

    await expect(region.locator('[data-testid="testimonial-card"]')).toHaveCount(8)
    await expect(region.locator('[data-testid="testimonial-avatar"]')).toHaveCount(8)
    await expect(region.locator('[data-testid="testimonial-track"]')).toHaveCount(2)
  })

  test('renders trust metrics section', async ({ page }) => {
    const trustSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: /built to feel clear, calm, and dependable|先看几个大家最在意的点/i }),
    }).first()

    await expect(trustSection.getByRole('heading', { name: /built to feel clear, calm, and dependable|先看几个大家最在意的点/i })).toBeVisible()
    await expect(trustSection.getByText(/^(2 min|2 分钟)$/)).toBeVisible()
    await expect(trustSection.getByText('92%')).toBeVisible()
    await expect(trustSection.getByText('24/7')).toBeVisible()
  })

  test('navbar is visible with logo', async ({ page }) => {
    const nav = page.locator('nav, header').first()
    await expect(nav).toBeVisible()
  })

  test('CTA navigates to upload page', async ({ page }) => {
    const cta = page.locator('a[href="/upload"]').first()
    if (await cta.isVisible()) {
      await cta.click()
      await expect(page).toHaveURL(/\/(upload|login)/)
    }
  })
})
