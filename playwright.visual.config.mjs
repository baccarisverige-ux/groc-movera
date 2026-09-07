import { defineConfig, devices } from '@playwright/test'

/* Visual regression runs on its own config because golden PNGs need things the
   functional suites do not care about:

   - deviceScaleFactor pinned to 1, so a baseline is the CSS pixel size it
     claims to be instead of a 3x iPhone bitmap nobody can review in a diff
   - retries off, because a screenshot comparison that passes on retry is not
     a passing comparison, it is a flaky baseline that needs fixing
   - one worker, so no two pages compete for the preview server mid-paint

   The widths are Movera's approved responsive targets — 320, 375, 390, 430,
   768 and 1024 — with the exact heights tests/e2e/critical-regressions.spec.js
   already uses for its overflow sweep, so "approved responsive target" means
   one thing across the suites rather than two. 1280 is added on top as the
   desktop case the E2E projects cover, so the golden set is a superset of the
   approved list, never a narrowing of it. */

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
    [320, 568],
    [375, 812],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1280, 800],
  ].map(([width, height]) => ({
    name: `w${width}`,
    use: { ...devices['Desktop Chrome'], viewport: { width, height }, deviceScaleFactor: 1, isMobile: false },
  })),
  webServer: {
    command: 'MOVERA_TEST_BASE=root VITE_GOOGLE_PLACES_API_KEY=e2e-places-key npm run build && MOVERA_TEST_BASE=root npm run preview -- --host 127.0.0.1',
    url: `${baseURL}/`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
})
