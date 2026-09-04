import { expect, test } from '@playwright/test'

function numberAttribute(locator, name) {
  return locator.getAttribute(name).then((value) => Number(value))
}

async function touchDrag(locator, { x = 180, fromY, toY, duration = 360 }) {
  await locator.evaluate(async (node, args) => {
    const fireTouch = (type, clientX, clientY, cancelable = true) => {
      const event = new Event(type, { bubbles: true, cancelable })
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: type === 'touchend' ? [] : [{ clientX, clientY }],
      })
      node.dispatchEvent(event)
    }
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const steps = 4
    fireTouch('touchstart', args.x, args.fromY, false)
    for (let index = 1; index <= steps; index += 1) {
      await sleep(args.duration / steps)
      const progress = index / steps
      const y = args.fromY + (args.toY - args.fromY) * progress
      fireTouch('touchmove', args.x, y)
    }
    fireTouch('touchend', args.x, args.toY, false)
  }, { x, fromY, toY, duration })
}

test('property category dock drags the sheet at any height and settles on a real snap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const dock = page.getByTestId('map-sheet-property-filters')

  await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed')
  await touchDrag(dock, { fromY: 785, toY: 535, duration: 520 })

  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.45)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.55)
})

test('offer cards own vertical sheet drag while the sheet is not fully attached', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const firstImage = sheet.locator('[data-listing-id="maison-jasmin"] .map-offer-sheet__media')

  await expect(list).toHaveAttribute('data-scroll-enabled', 'false')
  await expect(list).toHaveCSS('touch-action', 'none')

  await touchDrag(firstImage, { fromY: 790, toY: 535, duration: 520 })

  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.45)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.55)
  await expect(list).toHaveAttribute('data-scroll-enabled', 'false')
})

test('first offer can pull an expanded sheet down and a following map-focus tap is not swallowed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const firstImage = sheet.locator('[data-listing-id="maison-jasmin"] .map-offer-sheet__media')
  const focusButton = page.getByTestId('map-focus-maison-jasmin')
  const engine = page.getByTestId('map-engine')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'true')
  await expect(list).toHaveCSS('touch-action', 'pan-y')
  await list.evaluate((node) => { node.scrollTop = 0 })

  await touchDrag(firstImage, { fromY: 260, toY: 500, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.45)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.55)

  // A drag must not leave a stale "eat the next click" flag. Triggering the
  // adjacent map action immediately after the drag must still select the exact
  // listing and keep the sheet on the deterministic middle snap.
  await focusButton.evaluate((node) => node.click())
  await expect(engine).toHaveAttribute('data-selected-listing-id', 'maison-jasmin')
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.45)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.55)
})
