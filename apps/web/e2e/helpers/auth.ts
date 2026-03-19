import { type Page, type APIRequestContext } from '@playwright/test'

const DIRECT_API = 'http://localhost:3000'

interface TestUser {
  userId: string
  email: string
  isPro: boolean
}

/** Create a test user and set the JWT cookie in the browser via page.evaluate. */
export async function loginAsTestUser(
  page: Page,
  options: { email?: string; nickname?: string; isPro?: boolean } = {},
): Promise<TestUser> {
  const email = options.email || `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@e2e.local`

  // Navigate to the app first so we have a page context to run evaluate in
  if (page.url() === 'about:blank') {
    await page.goto('/', { waitUntil: 'commit' })
  }

  // Use page.evaluate to make fetch from the BROWSER itself.
  // This ensures Set-Cookie from the API response is properly stored in the browser.
  const result = await page.evaluate(
    async ({ email, nickname, isPro }) => {
      const res = await fetch('/api/saas/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, nickname, isPro }),
      })
      return res.json()
    },
    {
      email,
      nickname: options.nickname || 'E2E Test User',
      isPro: options.isPro ?? false,
    },
  )

  return { userId: result.userId, email, isPro: result.isPro }
}

/** Seed a report for the currently logged-in user. */
export async function seedReport(
  page: Page,
  options: { status?: string; withVideo?: boolean } = {},
) {
  const result = await page.evaluate(
    async ({ status, withVideo }) => {
      const res = await fetch('/api/saas/auth/test-seed-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, withVideo }),
      })
      const data = await res.json()
      // Include status for debugging
      return { status: res.status, ...data }
    },
    {
      status: options.status || 'COMPLETED',
      withVideo: options.withVideo ?? true,
    },
  )
  if (!result.report) {
    console.error('[seedReport] API returned no report:', result)
    throw new Error(`seedReport failed: ${JSON.stringify(result)}`)
  }
  return result.report
}

/** Update an existing report's status (for testing polling transitions). */
export async function updateReport(
  page: Page,
  reportId: string,
  options: { status: string; withVideo?: boolean },
) {
  const result = await page.evaluate(
    async ({ reportId, status, withVideo }) => {
      const res = await fetch('/api/saas/auth/test-update-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reportId, status, withVideo }),
      })
      return res.json()
    },
    { reportId, status: options.status, withVideo: options.withVideo },
  )
  return result.report
}

/** Clean up a test user and all related data. */
export async function cleanupTestUser(request: APIRequestContext, email: string) {
  await request.post(`${DIRECT_API}/api/saas/auth/test-cleanup`, {
    data: { email },
  })
}
