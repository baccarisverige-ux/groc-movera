import { expect, test } from '@playwright/test'

/* A wheel over the map must zoom the map and do nothing else.

   It used to do both: zoom, and scroll the page underneath. MapContainer asked
   for exactly the right thing -- event.preventDefault() before zooming -- but
   asked through React's onWheel, and React attaches wheel at the root as a
   passive listener. preventDefault inside a passive listener is ignored, and
   the browser says so plainly: the event arrives with cancelable already
   false. The call had never done anything.

   The zoom worked, which is what made it easy to miss. Only the "and nothing
   else" half was broken.

   This spec pins the half that was broken, so a future refactor back to
   onWheel fails here instead of silently reintroducing page scroll. It asserts
   the event was actually cancelled rather than asserting the page did not move
   -- once the Map fits its viewport there is nothing to scroll, so a
   scroll-position check would pass whether or not preventDefault works. */

test('a wheel over the map is cancelled, and still zooms', async ({ page, isMobile, browserName }) => {
  /* Mobile WebKit has no mouse wheel at all -- Playwright refuses the input
     with "Mouse wheel is not supported in mobile WebKit" -- so there is no
     event here to cancel. This is a missing platform capability, not a product
     exclusion, and it costs no engine coverage: desktop WebKit runs this spec
     and exercises exactly the same listener. */
  test.skip(isMobile && browserName === 'webkit', 'mobile WebKit has no mouse wheel')

  await page.goto('/map')
  await expect(page.getByTestId('page-map')).toBeVisible()

  const engine = page.getByTestId('map-engine')
  const surface = page.getByTestId('map-surface')
  await expect(surface).toBeVisible()

  /* Google installs its own non-passive wheel handling and owns the camera, so
     the fallback renderer is the only place this contract applies. */
  test.skip(await engine.getAttribute('data-native-gestures') === 'true', 'Google owns wheel handling')

  await page.evaluate(() => {
    window.__wheelCancelled = null
    window.addEventListener('wheel', (event) => {
      // Bubble phase: the map's own listener has already run by now.
      window.__wheelCancelled = { defaultPrevented: event.defaultPrevented, cancelable: event.cancelable }
    }, { passive: false })
  })

  const zoomBefore = Number(await surface.getAttribute('data-zoom'))
  const box = await surface.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -240)

  await expect.poll(async () => Number(await surface.getAttribute('data-zoom'))).toBeGreaterThan(zoomBefore)

  const wheel = await page.evaluate(() => window.__wheelCancelled)
  expect(wheel, 'the wheel event must reach the document').not.toBeNull()
  expect(wheel.cancelable, 'a non-passive listener must keep the wheel cancelable').toBe(true)
  expect(wheel.defaultPrevented, 'the map must cancel the wheel so the page cannot scroll too').toBe(true)
})
