import { test, expect } from '@playwright/test'
import { loginAsTestUser, seedReport, updateReport, cleanupTestUser } from './helpers/auth'

test.describe('Result Page', () => {
  let currentTestEmail: string | undefined

  test.afterEach(async ({ request, page }) => {
    if (currentTestEmail) {
      await cleanupTestUser(request, currentTestEmail)
      currentTestEmail = undefined
    }
    await page.context().clearCookies()
  })

  test('completed report shows video player', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    const report = await seedReport(page, { status: 'COMPLETED', withVideo: true })

    await page.goto(`/result/${report.id}`)
    // Video player should be visible
    await expect(page.locator('video').first()).toBeVisible({ timeout: 15_000 })
  })

  test('completed report shows download button', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    const report = await seedReport(page, { status: 'COMPLETED', withVideo: true })

    await page.goto(`/result/${report.id}`)
    await expect(
      page.getByText(/download/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('completed report shows "Upload Another" link', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    const report = await seedReport(page, { status: 'COMPLETED', withVideo: true })

    await page.goto(`/result/${report.id}`)
    const uploadAnother = page.locator('a[href="/upload"]').first()
    await expect(uploadAnother).toBeVisible({ timeout: 15_000 })
  })

  test('pending report shows waiting state', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    const report = await seedReport(page, { status: 'PENDING' })

    await page.goto(`/result/${report.id}`)
    // Should show waiting/queue message
    await expect(
      page.getByText(/waiting|queue|pending/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('processing report shows progress state', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    const report = await seedReport(page, { status: 'PROCESSING' })

    await page.goto(`/result/${report.id}`)
    // Should show processing/generating message
    await expect(
      page.getByText(/processing|generating|progress/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('failed report shows error state', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    const report = await seedReport(page, { status: 'FAILED' })

    await page.goto(`/result/${report.id}`)
    // Should show error/failed message
    await expect(
      page.getByText(/failed|error|something went wrong/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('nonexistent report shows 404 or error', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    await page.goto('/result/nonexistent-id-123')
    // Should show error or not found
    await expect(
      page.getByText(/not found|error|failed/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('polling transitions from pending to completed', async ({ page, request }) => {
    const user = await loginAsTestUser(page)
    currentTestEmail = user.email

    // Create a pending report
    const report = await seedReport(page, { status: 'PENDING' })

    await page.goto(`/result/${report.id}`)
    await expect(page.getByText(/waiting|queue|pending/i).first()).toBeVisible({ timeout: 15_000 })

    // Simulate worker completing the report after a delay
    await page.waitForTimeout(2000)
    await updateReport(page, report.id, { status: 'COMPLETED', withVideo: true })

    // Polling should pick up the status change and show video player
    await expect(page.locator('video').first()).toBeVisible({ timeout: 30_000 })
  })
})
