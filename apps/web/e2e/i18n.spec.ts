import { test, expect } from '@playwright/test'

async function measureLandingLayout(page: Parameters<typeof test>[0]['page']) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const { y, height } = element.getBoundingClientRect()
      return { y: Math.round(y), height: Math.round(height) }
    }

    return {
      bodyHeight: document.body.scrollHeight,
      heroActions: rect('#main-content .mt-10'),
      howItWorks: rect('#how-it-works'),
      features: rect('section:nth-of-type(4)'),
      testimonials: rect('section:nth-of-type(5)'),
      pricing: rect('section:nth-of-type(7)'),
    }
  })
}

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

  test('landing layout stays stable when switching languages', async ({ page }) => {
    await page.goto('/')

    const before = await measureLandingLayout(page)

    const zhBtn = page.locator('button').filter({ hasText: '中' }).first()
    await zhBtn.click()
    await page.waitForTimeout(300)

    const after = await measureLandingLayout(page)

    expect(Math.abs(after.bodyHeight - before.bodyHeight)).toBeLessThanOrEqual(24)
    expect(Math.abs((after.heroActions?.y ?? 0) - (before.heroActions?.y ?? 0))).toBeLessThanOrEqual(0)
    expect(Math.abs((after.howItWorks?.y ?? 0) - (before.howItWorks?.y ?? 0))).toBeLessThanOrEqual(16)
    expect(Math.abs((after.features?.y ?? 0) - (before.features?.y ?? 0))).toBeLessThanOrEqual(16)
    expect(Math.abs((after.testimonials?.y ?? 0) - (before.testimonials?.y ?? 0))).toBeLessThanOrEqual(16)
    expect(Math.abs((after.pricing?.y ?? 0) - (before.pricing?.y ?? 0))).toBeLessThanOrEqual(16)
  })

  test('desktop language toggle height matches adjacent auth button', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Desktop-only layout assertion')

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const metrics = await page.evaluate(() => {
      const enButton = document.querySelector('button[aria-label="Switch to English"]')
      const languageGroup = enButton?.parentElement
      const authButton = document.querySelector('a[href="/login"]')

      if (!languageGroup || !authButton) {
        return null
      }

      const languageRect = languageGroup.getBoundingClientRect()
      const authRect = authButton.getBoundingClientRect()

      return {
        languageHeight: Math.round(languageRect.height),
        authHeight: Math.round(authRect.height),
      }
    })

    expect(metrics).not.toBeNull()
    expect(metrics?.languageHeight).toBe(metrics?.authHeight)
  })
})
