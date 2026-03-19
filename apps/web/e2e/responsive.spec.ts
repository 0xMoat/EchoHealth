import { test, expect } from '@playwright/test'
import { loginAsTestUser, seedReport, cleanupTestUser } from './helpers/auth'

// This spec runs only in the 'mobile' project (iPhone 14 viewport)
test.describe('Mobile Responsive', () => {
  test('landing page renders properly on mobile', async ({ page }) => {
    await page.goto('/')
    // Hero should be visible
    await expect(page.locator('h1').first()).toBeVisible()
    // No horizontal overflow
    const body = page.locator('body')
    const bodyWidth = await body.evaluate((el) => el.scrollWidth)
    const viewportWidth = page.viewportSize()?.width || 390
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5)
  })

  test('hamburger menu opens and shows navigation', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    await page.goto('/dashboard')

    const menuBtn = page.locator('button[aria-label*="menu" i], button[aria-expanded]').first()
    await expect(menuBtn).toBeVisible()

    await menuBtn.click()

    await expect(
      page.getByText(/dashboard|upload|sign out/i).first(),
    ).toBeVisible()

    await cleanupTestUser(request, user.email)
  })

  test('upload page is usable on mobile', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    await page.goto('/upload')

    await expect(page.locator('input[type="file"]')).toBeAttached()

    const submitBtn = page.getByRole('button', { name: /generate video/i })
    await expect(submitBtn).toBeVisible()

    await expect(page.getByText('Auto-detect', { exact: true })).toBeVisible()

    await cleanupTestUser(request, user.email)
  })

  test('pricing page renders cards properly on mobile', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.getByText('$0')).toBeVisible()
    await expect(page.getByText('$4.99')).toBeVisible()
    await expect(page.getByText('$7.99')).toBeVisible()
  })

  test('dashboard report cards are tappable on mobile', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    const report = await seedReport(page, { status: 'COMPLETED', withVideo: true })

    await page.goto('/dashboard')
    const card = page.locator(`a[href="/result/${report.id}"]`).first()
    await expect(card).toBeVisible({ timeout: 10_000 })

    await card.tap()
    await expect(page).toHaveURL(new RegExp(`/result/${report.id}`))

    await cleanupTestUser(request, user.email)
  })

  test('result page video player fits mobile viewport', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    const report = await seedReport(page, { status: 'COMPLETED', withVideo: true })

    await page.goto(`/result/${report.id}`)
    const video = page.locator('video').first()
    await expect(video).toBeVisible({ timeout: 15_000 })

    const videoWidth = await video.evaluate((el) => el.getBoundingClientRect().width)
    const viewportWidth = page.viewportSize()?.width || 390
    expect(videoWidth).toBeLessThanOrEqual(viewportWidth)

    await cleanupTestUser(request, user.email)
  })
})
