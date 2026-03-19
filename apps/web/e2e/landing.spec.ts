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

  test('renders footer with links', async ({ page }) => {
    // Use role=contentinfo to select the main footer, not testimonial card footers
    const footer = page.getByRole('contentinfo')
    await expect(footer).toBeVisible()
    await expect(footer.locator('a')).not.toHaveCount(0)
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
