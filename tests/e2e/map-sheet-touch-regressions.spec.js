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
    const steps = 5
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

async function tinyTouchMove(locator, { x = 180, fromY, toY }) {
  await locator.evaluate((node, args) => {
    const fireTouch = (type, clientX, clientY, cancelable = true) => {
      const event = new Event(type, { bubbles: true, cancelable })
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: type === 'touchend' ? [] : [{ clientX, clientY }],
      })
      node.dispatchEvent(event)
    }
    fireTouch('touchstart', args.x, args.fromY, false)
    fireTouch('touchmove', args.x, args.toY)
    fireTouch('touchend', args.x, args.toY, false)
  }, { x, fromY, toY })
}

test('one panel gesture router owns header categories and offer list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const panel = sheet.locator('.map-offer-sheet__panel')
  const dock = page.getByTestId('map-sheet-property-filters')
  const list = sheet.locator('.map-offer-sheet__list')

  await expect(panel).toHaveAttribute('data-gesture-router', 'panel')
  await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'false')
  await expect(list).toHaveCSS('touch-action', 'none')

  await touchDrag(dock, { fromY: 785, toY: 535, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
})

test('offer card can move a mid sheet to another exact snap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const dock = page.getByTestId('map-sheet-property-filters')
  const firstImage = sheet.locator('[data-listing-id="maison-jasmin"] .map-offer-sheet__media')

  await touchDrag(dock, { fromY: 785, toY: 535, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)

  await touchDrag(firstImage, { fromY: 590, toY: 315, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.985)
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
})

test('expanded first offer pulls whole sheet down and settles exactly in the middle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const firstImage = sheet.locator('[data-listing-id="maison-jasmin"] .map-offer-sheet__media')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'true')
  await expect(list).toHaveCSS('touch-action', 'pan-y')
  await list.evaluate((node) => { node.scrollTop = 0 })

  await touchDrag(firstImage, { fromY: 260, toY: 500, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
})

test('small finger jitter on Voir sur la carte remains a tap and exact focus still works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const focusButton = page.getByTestId('map-focus-maison-jasmin')
  const engine = page.getByTestId('map-engine')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')

  // Six pixels is normal finger jitter and must stay below drag activation.
  await tinyTouchMove(focusButton, { fromY: 610, toY: 616 })
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')

  await focusButton.click()
  await expect(engine).toHaveAttribute('data-selected-listing-id', 'maison-jasmin')
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
})

test('fresh map-focus tap after a real sheet drag is never swallowed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const firstImage = sheet.locator('[data-listing-id="maison-jasmin"] .map-offer-sheet__media')
  const focusButton = page.getByTestId('map-focus-maison-jasmin')
  const engine = page.getByTestId('map-engine')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await list.evaluate((node) => { node.scrollTop = 0 })

  await touchDrag(firstImage, { fromY: 260, toY: 500, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)

  // This is a real Playwright click, not node.click(), so it exercises the
  // browser event path and the panel click guard.
  await focusButton.click()
  await expect(engine).toHaveAttribute('data-selected-listing-id', 'maison-jasmin')
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
})
