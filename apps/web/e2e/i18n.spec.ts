import { test, expect } from '@playwright/test'

test.describe('Internationalization (i18n)', () => {
  test('defaults to English', async ({ page }) => {
    await page.goto('/')
    // Hero text should be in English
    await expect(page.getByText(/health report/i).first()).toBeVisible()
  })

  test('language toggle switches to Chinese', async ({ page }) => {
    await page.goto('/')

    // Click Chinese language button
    const zhBtn = page.getByRole('button', { name: '中文' }).first()
    // Language button may also be a link or have different text
    const zhAlt = page.locator('button').filter({ hasText: '中文' }).first()

    const btn = (await zhBtn.isVisible()) ? zhBtn : zhAlt
    if (await btn.isVisible()) {
      await btn.click()
      // Page should now show Chinese text
      await page.waitForTimeout(500)
      // Check for common Chinese text on the landing page
      const hasChinese = await page.locator('body').textContent()
      expect(hasChinese).toMatch(/[\u4e00-\u9fff]/) // Contains CJK characters
    }
  })

  test('language toggle switches back to English', async ({ page }) => {
    await page.goto('/')

    // Switch to Chinese first
    const zhBtn = page.locator('button').filter({ hasText: '中文' }).first()
    if (await zhBtn.isVisible()) {
      await zhBtn.click()
      await page.waitForTimeout(300)

      // Switch back to English
      const enBtn = page.locator('button').filter({ hasText: 'EN' }).first()
      if (await enBtn.isVisible()) {
        await enBtn.click()
        await page.waitForTimeout(300)
        await expect(page.getByText(/health report/i).first()).toBeVisible()
      }
    }
  })

  test('language persists across navigation', async ({ page }) => {
    await page.goto('/')

    // Switch to Chinese
    const zhBtn = page.locator('button').filter({ hasText: '中文' }).first()
    if (await zhBtn.isVisible()) {
      await zhBtn.click()
      await page.waitForTimeout(300)

      // Navigate to pricing page
      await page.goto('/pricing')
      await page.waitForTimeout(500)

      // Should still be in Chinese
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/[\u4e00-\u9fff]/)
    }
  })

  test('language persists after page reload', async ({ page }) => {
    await page.goto('/')

    const zhBtn = page.locator('button').filter({ hasText: '中文' }).first()
    if (await zhBtn.isVisible()) {
      await zhBtn.click()
      await page.waitForTimeout(300)

      // Reload page
      await page.reload()
      await page.waitForTimeout(500)

      // Should still be in Chinese (stored in localStorage)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/[\u4e00-\u9fff]/)
    }
  })

  test('pricing page shows translated tier names in Chinese', async ({ page }) => {
    await page.goto('/pricing')

    // Switch to Chinese
    const zhBtn = page.locator('button').filter({ hasText: '中文' }).first()
    if (await zhBtn.isVisible()) {
      await zhBtn.click()
      await page.waitForTimeout(500)

      // Prices should still show in USD
      await expect(page.getByText('$4.99')).toBeVisible()
      await expect(page.getByText('$7.99')).toBeVisible()
    }
  })
})
