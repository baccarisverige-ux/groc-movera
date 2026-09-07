import { defineConfig, devices } from '@playwright/test'

/* Visual regression runs on its own config because golden PNGs need things the
   functional suites do not care about:

   - deviceScaleFactor pinned to 1, so a baseline is the CSS pixel size it
     claims to be instead of a 3x iPhone bitmap nobody can review in a diff
   - retries off, because a screenshot comparison that passes on retry is not
     a passing comparison, it is a flaky baseline that needs fixing
   - one worker, so no two pages compete for the preview server mid-paint

   The widths are the ones Movera's layout actually branches on: 320 is the
   narrow floor the responsive baseline suite defends, 390 is the primary
   mobile target, 1280 is desktop. */

const baseURL = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests/visual',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    /* Strict on purpose. A tolerance here would quietly absorb exactly the
       kind of small geometry shift Phase 8's CSS cleanup could introduce. */
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.2 },
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', video: 'off' },
  projects: [
    {
      name: 'narrow-320',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 }, deviceScaleFactor: 1, isMobile: false },
    },
    {
      name: 'mobile-390',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: false },
    },
    {
      name: 'desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false },
    },
  ],
  webServer: {
    command: 'MOVERA_TEST_BASE=root VITE_GOOGLE_PLACES_API_KEY=e2e-places-key npm run build && MOVERA_TEST_BASE=root npm run preview -- --host 127.0.0.1',
    url: `${baseURL}/`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
})
