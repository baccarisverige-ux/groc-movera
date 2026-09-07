import { expect, test } from '@playwright/test'

/* Where the Search panel lands, measured in numbers rather than pixels.

   The visual suite compares the panel's own rendering but deliberately clips to
   .movera-st__panel, because the overlay's position in the viewport is not
   pixel-deterministic: two runs of the same commit in the same pinned container
   placed an identical panel 2px left and 1px up of each other. A full-viewport
   golden turned that 2px into ~70% of the frame, which is a flaky gate, not a
   design check.

   Clipping means the goldens no longer say where the panel sits. This spec says
   it instead, and says it in a form a sub-pixel wobble cannot break: the panel
   must stay inside the viewport, stay horizontally centred, and stay within its
   designed width cap, at every approved responsive width.

   PLACEMENT_TOLERANCE_PX is 3 — one more than the largest offset actually
   observed. It absorbs the measured wobble and nothing else: a panel that
   drifts off-centre, overflows the viewport or loses its width cap moves far
   more than three pixels, and this fails. */

const PLACEMENT_TOLERANCE_PX = 3

/* The approved responsive targets, same widths the visual goldens cover. */
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
]

/* The panel stops growing past this, so on a tablet or desktop it stays a
   centred card instead of stretching edge to edge. Taken from the rendered
   design, not imposed on it. */
const PANEL_MAX_WIDTH_PX = 410

async function openSearch(page) {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await page.getByTestId('home-search').click()
  await expect.poll(async () => page.getByTestId('search-transition').getAttribute('data-ready')).toBe('true')
  await expect(page.getByTestId('search-step-destination')).toBeVisible()
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}px Search panel placement`, () => {
    test.use({ viewport })

    test('the open panel stays centred, capped and fully inside the viewport', async ({ page }) => {
      await openSearch(page)

      const panel = page.locator('.movera-st__panel')
      const box = await panel.boundingBox()
      expect(box, 'the Search panel must be laid out and visible').not.toBeNull()

      // Fully inside the viewport on every edge. A panel hanging off screen is
      // unreachable, not merely ugly.
      expect(box.x).toBeGreaterThanOrEqual(-PLACEMENT_TOLERANCE_PX)
      expect(box.y).toBeGreaterThanOrEqual(-PLACEMENT_TOLERANCE_PX)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + PLACEMENT_TOLERANCE_PX)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + PLACEMENT_TOLERANCE_PX)

      // Horizontally centred: the gap either side matches.
      const centreOffset = Math.abs((box.x + box.width / 2) - viewport.width / 2)
      expect(centreOffset).toBeLessThanOrEqual(PLACEMENT_TOLERANCE_PX)

      // Never wider than the viewport, and never wider than its design cap.
      expect(box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.width).toBeLessThanOrEqual(PANEL_MAX_WIDTH_PX + PLACEMENT_TOLERANCE_PX)

      // And it is a real panel, not a collapsed box.
      expect(box.width).toBeGreaterThan(240)
      expect(box.height).toBeGreaterThan(200)
    })

    test('the panel keeps that placement after advancing to the dates step', async ({ page }) => {
      await openSearch(page)
      const panel = page.locator('.movera-st__panel')
      const opened = await panel.boundingBox()

      await page.getByTestId('search-step-destination').getByRole('button').first().click()
      await expect(page.getByTestId('search-step-dates')).toBeVisible()

      /* The panel is designed to change height between steps, so only the
         horizontal contract is asserted across the transition. Height itself
         stays covered by the per-step bounds in search-uat-cleanup.spec.js. */
      const dates = await panel.boundingBox()
      expect(Math.abs(dates.x - opened.x)).toBeLessThanOrEqual(PLACEMENT_TOLERANCE_PX)
      expect(Math.abs(dates.width - opened.width)).toBeLessThanOrEqual(PLACEMENT_TOLERANCE_PX)
      expect(dates.x + dates.width).toBeLessThanOrEqual(viewport.width + PLACEMENT_TOLERANCE_PX)
      expect(dates.y + dates.height).toBeLessThanOrEqual(viewport.height + PLACEMENT_TOLERANCE_PX)
    })
  })
}
