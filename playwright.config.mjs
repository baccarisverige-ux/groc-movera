import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'desktop-webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-webkit',
      use: {
        ...devices['iPhone 14'],
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
      },
    },
    /* A real Android profile, not a relabelled iPhone.

       mobile-chromium above is the iPhone 14 descriptor driven by Chromium, so
       it still advertises an iPhone/Safari user agent. That matters here
       because MapSheetRuntimeSurface picks its gesture adapter by user agent:
       iOS-like gets createIOSGestureAdapter, everything else gets
       createPointerGestureAdapter. Both mobile projects looked like iPhones, so
       on a touch device only the iOS adapter was ever exercised — the pointer
       adapter ran only on the desktop projects, which have no touch. An Android
       phone is the one combination nothing covered: pointer adapter, touch
       input, mobile viewport.

       Pixel 7 sends a genuine Android/Chrome user agent, so this project
       exercises that path. It is added alongside the iPhone/WebKit projects,
       never in place of them. */
    {
      name: 'android-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'MOVERA_TEST_BASE=root VITE_GOOGLE_PLACES_API_KEY=e2e-places-key npm run build && MOVERA_TEST_BASE=root npm run preview -- --host 127.0.0.1',
    url: `${baseURL}/`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
})
