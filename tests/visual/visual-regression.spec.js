import { expect, test } from '@playwright/test'

/* Real visual regression, as opposed to what tests/visual used to do.

   The old capture spec called page.screenshot() and wrote PNGs into the test
   output directory. Nothing ever read them back, so the job could not fail on
   a visual change — it only failed if the app crashed. That made "Mobile
   Chromium visual references" a screenshot archive, not a gate, and it meant
   the approved Search/Map design had no automated protection at all.

   These comparisons are the gate. Every state below is committed as a golden
   PNG and diffed pixel by pixel on each run.

   Determinism is bought in three ways:

   1. Everything outside the preview server is blocked. Unsplash photos, OSM
      tiles and Google's runtime all vary between runs, and the proxy in front
      of CI can stall or reset them. Blocked, the app renders its bundled
      fallbacks — the same code path tests/e2e/critical-regressions.spec.js
      already pins — so the pixels depend only on Movera's own CSS and assets.
   2. Animations are frozen by Playwright and the screenshot is taken at CSS
      scale, so device pixel ratio cannot leak into the baseline.
   3. Fonts and browser build are pinned by running this suite inside the
      official Playwright container in CI. Baselines are generated in that same
      container, which is why they must not be regenerated on a developer
      machine — see .github/workflows/visual-baseline.yml. */

/* Local Movera data only. Any other origin is non-deterministic here. */
async function isolateFromNetwork(page) {
  await page.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url())
    return hostname === '127.0.0.1' || hostname === 'localhost'
      ? route.continue()
      : route.abort()
  })
}

/* A screenshot taken mid font swap is a coin flip, so wait for that much
   explicitly. Deliberately nothing else: toHaveScreenshot already re-captures
   until two consecutive frames are identical, which is what settles images.
   An explicit wait on every <img> instead hangs forever here, because blocking
   the network leaves lazy images below the fold permanently incomplete. */
async function settle(page) {
  await page.evaluate(() => document.fonts.ready)
}

async function openSearch(page) {
  await page.getByTestId('home-search').click()
  await expect.poll(async () => page.getByTestId('search-transition').getAttribute('data-ready')).toBe('true')
  await settle(page)
}

test.beforeEach(async ({ page }) => {
  await isolateFromNetwork(page)
})

test('Home', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('home.png', { fullPage: true, animations: 'disabled', scale: 'css' })
})

test('Search · destination step', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await openSearch(page)
  await expect(page.getByTestId('search-step-destination')).toBeVisible()
  await expect(page).toHaveScreenshot('search-destination.png', { animations: 'disabled', scale: 'css' })
})

test('Search · dates step', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await openSearch(page)
  await page.getByTestId('search-step-destination').getByRole('button').first().click()
  await expect(page.getByTestId('search-step-dates')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('search-dates.png', { animations: 'disabled', scale: 'css' })
})

test('Collection · Plage', async ({ page }) => {
  await page.goto('/plage')
  await expect(page.getByTestId('page-beach')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('collection-plage.png', { fullPage: true, animations: 'disabled', scale: 'css' })
})

test('Map · offer sheet', async ({ page }) => {
  await page.goto('/map')
  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.getByTestId('map-surface')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('map-offer-sheet.png', { animations: 'disabled', scale: 'css' })
})

test('Profile', async ({ page }) => {
  await page.goto('/profile')
  await expect(page.getByTestId('page-profile')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('profile.png', { fullPage: true, animations: 'disabled', scale: 'css' })
})
