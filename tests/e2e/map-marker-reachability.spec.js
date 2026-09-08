import { expect, test } from '@playwright/test'

/* Every price pin on the map must be the thing you hit when you tap it.

   At the default Grand Tunis view that was not true. Sixteen pins whose boxes
   are 72x40 sat at centres 7-10px apart, drawn with no awareness of each
   other, so they buried one another: 13 of the 16 did not receive a tap at
   their own centre and several were covered completely. Tapping a listing
   selected a different listing, and a handful could not be reached at all.

   This is the assertion that was missing. It is deliberately about hit testing
   rather than appearance: a screenshot cannot tell you which element receives
   the tap, and that -- not how the pins look -- is what was broken. */

const MARKER = '[data-testid^="map-marker-"]'

async function pins(page) {
  return page.evaluate((selector) => {
    const surface = document.querySelector('[data-testid="map-surface"]').getBoundingClientRect()
    const markers = [...document.querySelectorAll(selector)]
      .filter((el) => el.getAttribute('data-testid') !== 'map-marker-layer')
    return markers.map((el) => {
      const box = el.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      /* Pins are kept until 80px outside the surface, so an edge pin's centre
         can sit beyond the map itself -- clipped by the stage's overflow, or
         out past the 430px shell into the page gutter on a wide screen. A tap
         there was never going to reach it, with or without collision handling,
         so the contract is about pins drawn inside the map. */
      const onScreen = x >= surface.left && x <= surface.right
        && y >= surface.top && y <= surface.bottom
      const hit = onScreen ? document.elementFromPoint(x, y) : null
      return {
        id: el.getAttribute('data-testid'),
        absorbed: Number(el.getAttribute('data-absorbed') || 0),
        onScreen,
        ownsItsCentre: Boolean(hit && el.contains(hit)),
        receiver: hit ? (hit.closest('button')?.getAttribute('data-testid') || hit.tagName) : 'none',
      }
    })
  }, MARKER)
}

test('every drawn pin receives its own tap at the default view', async ({ page }) => {
  await page.goto('/map')
  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.getByTestId('map-surface')).toBeVisible()
  await expect(page.locator(MARKER).first()).toBeVisible()

  const drawn = await pins(page)
  expect(drawn.length, 'the default view must draw some pins').toBeGreaterThan(0)

  const onScreen = drawn.filter((pin) => pin.onScreen)
  expect(onScreen.length, 'the default view must draw pins inside the map').toBeGreaterThan(0)

  const stolen = onScreen.filter((pin) => !pin.ownsItsCentre)
  expect(stolen, `pins whose tap goes elsewhere: ${JSON.stringify(stolen)}`).toEqual([])
})

test('pins standing in for others say so, and every listing is accounted for', async ({ page }) => {
  await page.goto('/map')
  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.locator(MARKER).first()).toBeVisible()

  const offerCount = Number(await page.getByTestId('page-map').getAttribute('data-city-offer-count'))
  const drawn = await pins(page)
  const absorbed = drawn.reduce((total, pin) => total + pin.absorbed, 0)

  /* Nothing may be silently dropped: a listing is either drawn as its own pin
     or counted on the pin that kept its place. Pins can also be culled for
     being off-screen, so this is a ceiling rather than an equality. */
  expect(drawn.length + absorbed).toBeLessThanOrEqual(offerCount)
  expect(drawn.length + absorbed).toBeGreaterThan(0)

  const groups = drawn.filter((pin) => pin.absorbed > 0)
  for (const group of groups) {
    const marker = page.locator(`[data-testid="${group.id}"]`)
    await expect(marker).toContainText(`+${group.absorbed}`)
    await expect(marker).toHaveAttribute('aria-label', /agrandir/)
  }
})

test('tapping a grouped pin zooms in and pulls the group apart', async ({ page }) => {
  await page.goto('/map')
  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.locator(MARKER).first()).toBeVisible()

  const surface = page.getByTestId('map-surface')
  const before = await pins(page)
  const group = before.find((pin) => pin.absorbed > 0)
  test.skip(!group, 'no overlapping pins at this view')

  const zoomBefore = Number(await surface.getAttribute('data-zoom'))
  await page.locator(`[data-testid="${group.id}"]`).click()

  await expect.poll(async () => Number(await surface.getAttribute('data-zoom'))).toBeGreaterThan(zoomBefore)
  await expect.poll(async () => (await pins(page)).length).toBeGreaterThan(0)

  // Still no pin buried under another after the camera settles.
  const after = await pins(page)
  expect(after.filter((pin) => pin.onScreen && !pin.ownsItsCentre)).toEqual([])
})

test('a listing focused from the sheet always has a pin on the map', async ({ page }) => {
  await page.goto('/map')
  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.locator(MARKER).first()).toBeVisible()

  /* "Voir sur la carte" is the path that used to strand people: the listing
     became selected while its pin stayed buried under a neighbour, so the map
     appeared to respond to nothing. The selected pin must always be drawn. */
  const focusButtons = page.locator('[data-testid^="map-focus-"]')
  await expect(focusButtons.first()).toBeAttached()

  const count = Math.min(await focusButtons.count(), 4)
  expect(count, 'the sheet must offer listings to focus').toBeGreaterThan(0)

  for (let index = 0; index < count; index += 1) {
    const testId = await focusButtons.nth(index).getAttribute('data-testid')
    const listingId = testId.replace('map-focus-', '')

    await focusButtons.nth(index).click()

    const engine = page.getByTestId('map-engine')
    await expect.poll(async () => engine.getAttribute('data-selected-listing-id')).toBe(listingId)

    const marker = page.locator(`[data-testid="map-marker-${listingId}"]`)
    await expect(marker, `the pin for ${listingId} must be drawn once it is selected`).toBeVisible()
    await expect(marker).toHaveAttribute('data-marker-state', 'selected')
  }
})
