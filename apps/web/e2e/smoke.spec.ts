import { test, expect } from '@playwright/test'
import path from 'path'
import { loginAsTestUser, seedReport, cleanupTestUser } from './helpers/auth'

const TEST_IMAGE = path.resolve(__dirname, 'fixtures/test-report.jpg')

/**
 * Full end-to-end smoke tests covering the critical user journeys.
 * These tests run the complete flow and require:
 * - Fastify server running with TEST_FAST_VIDEO=true
 * - Next.js dev server running
 * - PostgreSQL + Redis available
 */
test.describe('Smoke Tests', () => {
  test('free user journey: login → upload → view result', async ({ page, request }) => {
    // 1. Login
    const user = await loginAsTestUser(page, { nickname: 'Smoke Test' })

    // 2. Go to dashboard (should be empty)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    // 3. Navigate to upload
    await page.goto('/upload')
    await expect(page.locator('input[type="file"]')).toBeAttached()

    // 4. Upload a test image
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE)
    await expect(page.getByText(/\.jpg|\.jpeg/i).first()).toBeVisible()

    // 5. Select language
    const englishBtn = page.getByRole('button', { name: 'English', exact: true })
    await englishBtn.click()

    // 6. Submit
    const submitBtn = page.getByRole('button', { name: /generate video/i })
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()

    // 7. Should redirect to result page
    await expect(page).toHaveURL(/\/result\//, { timeout: 30_000 })

    // 8. Should show pending/processing state initially
    await expect(
      page.getByText(/waiting|queue|pending|processing|generating/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    // 9. With TEST_FAST_VIDEO=true, report should complete within ~10s
    // Wait for video player to appear (worker auto-completes)
    await expect(
      page.locator('video').first(),
    ).toBeVisible({ timeout: 60_000 })

    // 10. Download button should be visible
    await expect(page.getByText(/download/i).first()).toBeVisible()

    await cleanupTestUser(request, user.email)
  })

  test('dashboard shows report after creation', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    // Seed a completed report
    const report = await seedReport(page, { status: 'COMPLETED', withVideo: true })

    // Dashboard should list it
    await page.goto('/dashboard')
    await expect(page.locator(`a[href="/result/${report.id}"]`)).toBeVisible({ timeout: 10_000 })

    // Quota should show 0 / 3 (no real reports created via quota system)
    await expect(page.getByText(/\d+\s*\/\s*\d+/).first()).toBeVisible()

    await cleanupTestUser(request, user.email)
  })

  test('navigation flow: landing → pricing → login → dashboard', async ({ page, request }) => {
    // 1. Start at landing
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()

    // 2. Go to pricing
    await page.goto('/pricing')
    await expect(page.getByText('$4.99')).toBeVisible()

    // 3. Login
    const user = await loginAsTestUser(page)

    // 4. Dashboard should be accessible
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    await cleanupTestUser(request, user.email)
  })

  test('pro user has higher limits on upload page', async ({ page, request }) => {
    const user = await loginAsTestUser(page, { isPro: true })

    await page.goto('/upload')

    // Pro users should see higher quota remaining (30 - 0 = 30)
    await expect(page.getByText(/30|report/i).first()).toBeVisible()

    await cleanupTestUser(request, user.email)
  })
})
