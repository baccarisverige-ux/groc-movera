import { expect, test } from '@playwright/test'

/* The Map is a fixed full-screen page. The document must not scroll.

   It did. Every width — 320 through 1280 — put the page exactly 84px taller
   than the viewport, so the whole app could be scrolled up: the map header
   left the screen entirely and a blank strip of bare .app-shell__content was
   exposed underneath.

   The cause was one declaration. app-premium-surface.css reserves 84px for the
   fixed bottom nav on every guest shell, with !important. The Map renders no
   nav at all, and three separate places already zero that padding — the inline
   mapContentStyle in GuestLayout, the map-b225.css rule, and the shell's own
   overflow:hidden. All three lost to the !important.

   Nothing caught it because every overflow assertion in this suite measures
   scrollWidth. Horizontal only. The Map's visual golden is a viewport
   screenshot, so 84px below the fold is invisible to it too. This spec is the
   missing vertical half, and it is deliberately exact rather than tolerant: a
   page designed not to scroll either scrolls or it does not. */

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
]

for (const viewport of viewports) {
  test.describe(`${viewport.width}px Map viewport fit`, () => {
    test.use({ viewport })

    test('the Map page fits its viewport and cannot be scrolled', async ({ page }) => {
      await page.goto('/map')
      await expect(page.getByTestId('page-map')).toBeVisible()
      await expect(page.getByTestId('map-surface')).toBeVisible()

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return doc.scrollHeight - doc.clientHeight
      })
      expect(overflow, 'the Map must not be taller than its viewport').toBe(0)

      // And the guarantee a user actually feels: scrolling moves nothing.
      const scrolled = await page.evaluate(() => {
        window.scrollTo(0, 4000)
        const reached = window.scrollY
        window.scrollTo(0, 0)
        return reached
      })
      expect(scrolled, 'the Map page must not scroll').toBe(0)
    })

    test('the Map header stays put when the page is scrolled', async ({ page }) => {
      await page.goto('/map')
      await expect(page.getByTestId('page-map')).toBeVisible()

      const header = page.locator('.b225-map-top')
      const before = await header.boundingBox()
      await page.evaluate(() => window.scrollTo(0, 4000))
      const after = await header.boundingBox()

      /* The header used to travel to y=-84 here, taking the search filters off
         screen on a page that has no business scrolling at all. */
      expect(Math.abs(after.y - before.y), 'the Map header must not move').toBeLessThanOrEqual(1)
    })
  })
}
