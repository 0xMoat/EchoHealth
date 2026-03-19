import { test, expect } from '@playwright/test'
import { loginAsTestUser, cleanupTestUser } from './helpers/auth'

test.describe('Authentication', () => {
  test('login page renders with Google button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#main-content, main').first()).toBeVisible()
    // Should show login-related content
    await expect(page.getByText(/sign in|log in|google/i).first()).toBeVisible()
  })

  test('protected routes redirect to /login when unauthenticated', async ({ page }) => {
    await page.goto('/upload')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('test login creates user and can access protected routes', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    // Should see welcome message or dashboard content
    await expect(page.locator('main, #main-content').first()).toBeVisible()

    // Cleanup after test
    await cleanupTestUser(request, user.email)
  })

  test('logout clears session', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    // Click sign out
    const signOut = page.getByText(/sign out|log out|logout/i).first()
    if (await signOut.isVisible()) {
      await signOut.click()
    } else {
      // May be in hamburger menu
      const menuBtn = page.locator('button[aria-label*="menu" i], button[aria-expanded]').first()
      if (await menuBtn.isVisible()) {
        await menuBtn.click()
        await page.getByText(/sign out|log out|logout/i).first().click()
      }
    }

    // Wait for logout to complete
    await page.waitForTimeout(500)

    // After logout, trying to access protected routes should redirect
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    // Cleanup
    await cleanupTestUser(request, user.email)
  })

  test('auth state persists across navigation', async ({ page, request }) => {
    const user = await loginAsTestUser(page)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    // Navigate to upload
    await page.goto('/upload')
    await expect(page).toHaveURL(/\/upload/)
    // Should NOT redirect to login
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/upload/)

    // Cleanup
    await cleanupTestUser(request, user.email)
  })
})
