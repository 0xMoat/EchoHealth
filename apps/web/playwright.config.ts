import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const SERVER_PORT = 3000
const WEB_PORT = 3001

// E2E 测试用隔离数据库（docker-compose.test.yml via OrbStack）
const TEST_DB_URL = 'postgresql://postgres:test@localhost:5433/echohealth_test'
const TEST_REDIS_URL = 'redis://localhost:6380'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,  // Disable parallel tests to avoid auth cookie conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,  // Temporarily disable parallel tests due to auth cookie sharing issues
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60_000,

  // 容器生命周期管理
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
      testMatch: /responsive\.spec\.ts/,
    },
  ],

  webServer: [
    {
      command: 'pnpm dev',
      cwd: path.resolve(__dirname, '../server'),
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        // 覆盖 .env 中的数据库连接，指向隔离的测试容器
        DATABASE_URL: TEST_DB_URL,
        REDIS_URL: TEST_REDIS_URL,
        JWT_SECRET: 'e2e-test-secret-not-for-production',
        TEST_FAST_VIDEO: 'true',
        NODE_ENV: 'development',
      },
      timeout: 60_000,
    },
    {
      // Next.js 默认用 3000，需指定 -p 3001 避免与 Fastify 冲突
      command: `next dev -p ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        // 强制 API 代理指向本地 Fastify（覆盖 .env.local 中的远程地址）
        NEXT_PUBLIC_API_URL: `http://localhost:${SERVER_PORT}`,
      },
      timeout: 60_000,
    },
  ],
})
