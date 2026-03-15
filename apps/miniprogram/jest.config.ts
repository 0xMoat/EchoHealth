import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],
  testTimeout: 60_000,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'e2e/tsconfig.json' }],
  },
}

export default config
