import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/tests/end-to-end',
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,

  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    baseURL: 'http://localhost:8080',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  reporter: [
    ['html', { outputFolder: './test-results/html', open: process.env.CI ? 'never' : 'on-failure' }],
    ['list'],
  ],

  outputDir: './test-results',

  projects: [
    // Auth setup — runs first, saves login state for each role
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Main tests — depend on auth setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['auth-setup'],
    },
  ],

  testMatch: ['**/*.test.ts'],
  testIgnore: ['**/node_modules/**', '**/dist/**'],

  fullyParallel: false,
  workers: 1,

  webServer: {
    command: 'npm run dev',
    port: 8080,
    reuseExistingServer: true,
    timeout: 120000,
  },
})
