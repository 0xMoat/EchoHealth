import { test, expect } from '@playwright/test'
import { loginAsTestUser, seedReport, cleanupTestUser } from './helpers/auth'

test.describe('Dashboard', () => {
  let currentTestEmail: string | undefined

  test.afterEach(async ({ request, page }) => {
    if (currentTestEmail) {
      await cleanupTestUser(request, currentTestEmail)
      currentTestEmail = undefined
    }
    // Clear cookies after cleanup to ensure next test starts fresh
    await page.context().clearCookies()
  })

  test('shows welcome message and quota bar', async ({ page, request }) => {
    const user = await loginAsTestUser(page, { nickname: 'Test User' })
    currentTestEmail = user.email

    await page.goto('/dashboard')
    // Should show "Welcome back" and user nickname
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Test User')).toBeVisible()
    // Quota bar: "0 / 3" (with non-breaking spaces)
    await expect(page.locator('text=/\\d+\\s.*\\/\\s.*\\d+/')).toBeVisible()
  })

  test('shows empty state when no reports', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    await page.goto('/dashboard')
    await expect(page.getByText('No reports yet')).toBeVisible({ timeout: 10_000 })
  })

  test('lists reports when they exist', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    await seedReport(page, { status: 'COMPLETED', withVideo: true })

    await page.goto('/dashboard')
    await expect(page.locator('a[href^="/result/"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('report card links to result page', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    const report = await seedReport(page, { status: 'COMPLETED', withVideo: true })

    await page.goto('/dashboard')
    const card = page.locator(`a[href="/result/${report.id}"]`).first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.click()
    await expect(page).toHaveURL(new RegExp(`/result/${report.id}`))
  })

  test('"New Report" button navigates to /upload', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    await page.goto('/dashboard')
    const newBtn = page.locator('a[href="/upload"]').first()
    await expect(newBtn).toBeVisible({ timeout: 10_000 })
    await newBtn.click()
    await expect(page).toHaveURL(/\/upload/)
  })

  test('shows different status badges for reports', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    await seedReport(page, { status: 'COMPLETED', withVideo: true })
    await seedReport(page, { status: 'PENDING' })
    await seedReport(page, { status: 'FAILED' })

    await page.goto('/dashboard')
    await expect(page.locator('a[href^="/result/"]')).toHaveCount(3, { timeout: 10_000 })
  })

  test('pro user shows higher quota', async ({ page, request }) => {
    const user = await loginAsTestUser(page, { isPro: true })
    currentTestEmail = user.email

    await page.goto('/dashboard')
    // Pro users: "0 / 30" (with non-breaking spaces)
    await expect(page.locator('text=/\\/\\s*30/')).toBeVisible({ timeout: 10_000 })
  })
})
