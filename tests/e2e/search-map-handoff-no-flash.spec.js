import { expect, test } from '@playwright/test'

/* The Search overlay must not be released before the Map exists.

   Phase 1 made the handoff deterministic: SearchTransitionHost holds the
   overlay up until the Map signals ready, then flips its state synchronously.
   That ordering is what stops Home being painted for a frame between Search
   letting go and the Map arriving — the flash.

   Nothing asserted it. search-map-handoff-regressions.spec.js checks the end
   state — the transition gone inside 1800ms, moveraMapHandoff and
   moveraSearchLock cleared, the Map visible — all of which stay true if the
   overlay were released early and Home flashed on the way. This spec covers
   the ordering itself.

   It is deliberately not a screenshot. A mid-transition frame is timing
   sensitive and would make the visual gate flaky for no gain. The page instead
   records mounts and removals as they happen through a MutationObserver, and
   the test compares their order — no sampling, no window to miss, no wait.

   The assertion is deliberately on the Map's arrival rather than on the
   MAP_READY event. Releasing the overlay is normally driven by MAP_READY, but
   there is a fallback timer for the case where the signal never comes, and a
   sandbox with no tile access takes exactly that path. Requiring the event
   would make this test pass or fail on network conditions rather than on the
   property that matters. What matters is that the Map is already mounted when
   Search lets go, whichever mechanism released it — that is precisely the
   condition under which no Home frame can appear. */

const SEARCH = '[data-testid="search-transition"]'
const MAP = '[data-testid="page-map"]'

async function traceHandoff(page) {
  await page.addInitScript(([searchSelector, mapSelector]) => {
    const trace = []
    window.__moveraHandoffTrace = trace

    /* Supplementary, asserted only when it fires. Capture phase, so the DOM is
       observed before any application listener acts on the same event. */
    window.addEventListener('movera:map-ready', () => {
      trace.push({ type: 'map-ready', searchMounted: Boolean(document.querySelector(searchSelector)) })
    }, true)

    const state = { search: false, map: false }
    const sync = () => {
      for (const [key, selector, mounted, removed] of [
        ['search', searchSelector, 'search-mounted', 'search-removed'],
        ['map', mapSelector, 'map-mounted', 'map-removed'],
      ]) {
        const now = Boolean(document.querySelector(selector))
        if (now === state[key]) continue
        state[key] = now
        trace.push({ type: now ? mounted : removed })
      }
    }
    /* Observe `document`, not `document.documentElement`: an init script runs
       against a document with no root element yet, so observing the root throws
       and every mount and removal is silently lost. */
    new MutationObserver(sync).observe(document, { childList: true, subtree: true })
    sync()
  }, [SEARCH, MAP])
}

async function pickTwoDates(page) {
  const days = page.locator('.movera-st__calendar-grid button.movera-st__day:not(:disabled)')
  await expect.poll(async () => days.count()).toBeGreaterThanOrEqual(2)
  const count = await days.count()
  const first = await days.nth(0).getAttribute('aria-label')
  const second = await days.nth(Math.min(3, count - 1)).getAttribute('aria-label')
  await page.getByRole('button', { name: first, exact: true }).click()
  await page.getByRole('button', { name: second, exact: true }).click()
}

test('Search holds the screen until the Map exists, and only then releases', async ({ page }) => {
  test.setTimeout(60_000)
  await traceHandoff(page)

  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  await page.getByTestId('home-search').click()
  const transition = page.getByTestId('search-transition')
  await expect.poll(async () => transition.getAttribute('data-ready')).toBe('true')

  await page.locator('[data-destination="la-marsa"]').click()
  await expect(transition).toHaveAttribute('data-step', 'dates')
  await pickTwoDates(page)
  await page.getByRole('button', { name: /Continuer vers les voyageurs/i }).click()
  await expect(transition).toHaveAttribute('data-step', 'guests')

  await page.getByRole('button', { name: /Rechercher sur la carte/i }).click()
  await expect(page.getByTestId('page-map')).toBeVisible({ timeout: 10_000 })
  await expect(transition).toHaveCount(0)

  const trace = await page.evaluate(() => window.__moveraHandoffTrace)
  const first = (type) => trace.findIndex((entry) => entry.type === type)

  const searchRemoved = first('search-removed')
  const mapMounted = first('map-mounted')

  expect(searchRemoved, 'the Search overlay must be removed once the handoff completes').toBeGreaterThanOrEqual(0)
  expect(mapMounted, 'the Map must mount during the handoff').toBeGreaterThanOrEqual(0)

  /* The invariant. Released before the Map existed, Home would have been the
     visible page for at least one frame. */
  expect(mapMounted, 'the Map must already be mounted when Search releases').toBeLessThan(searchRemoved)

  /* When the Map does signal ready — the normal path, and the one CI takes —
     the overlay must still be up at that moment. */
  const ready = trace.find((entry) => entry.type === 'map-ready')
  if (ready) expect(ready.searchMounted, 'Search must still be mounted when MAP_READY fires').toBe(true)
})
