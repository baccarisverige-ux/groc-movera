import { defineConfig, devices } from '@playwright/test'

const configuredBase = String(process.env.MOVERA_LIVE_BASE_URL || '').trim()
if (!configuredBase) throw new Error('MOVERA_LIVE_BASE_URL is required for live smoke tests')
const baseURL = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 20_000 },
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-live', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'live-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
})
