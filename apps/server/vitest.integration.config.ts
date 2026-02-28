import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/__tests__/integration/**/*.test.ts'],
    testTimeout: 120_000,    // containers take time to start
    hookTimeout: 120_000,
    pool: 'forks',           // each file gets its own process for container isolation
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})
