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

test('header and property dock drag the sheet and manual release stays where the finger leaves it', async ({ page }) => {
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

  // Deliberately irregular travel: this must NOT be magnetized to 0 / 0.5 / 1.
  await touchDrag(dock, { fromY: 785, toY: 612, duration: 520 })
  await page.waitForTimeout(120)
  const released = await numberAttribute(sheet, 'data-progress')
  expect(released).toBeGreaterThan(0.08)
  expect(released).toBeLessThan(0.48)
  await expect(sheet).toHaveAttribute('data-snap-state', 'moving')

  await page.waitForTimeout(650)
  const settled = await numberAttribute(sheet, 'data-progress')
  expect(Math.abs(settled - released)).toBeLessThanOrEqual(0.02)
})

test('offer card does not drag a collapsed or mid sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const dock = page.getByTestId('map-sheet-property-filters')
  const firstImage = sheet.locator('[data-listing-id="maison-jasmin"] .map-offer-sheet__media')

  await touchDrag(dock, { fromY: 785, toY: 605, duration: 520 })
  await page.waitForTimeout(120)
  const before = await numberAttribute(sheet, 'data-progress')
  expect(before).toBeGreaterThan(0.08)
  expect(before).toBeLessThan(0.5)

  await touchDrag(firstImage, { fromY: 590, toY: 315, duration: 520 })
  await page.waitForTimeout(180)
  const after = await numberAttribute(sheet, 'data-progress')
  expect(Math.abs(after - before)).toBeLessThanOrEqual(0.02)
})

test('expanded first offer pulls the whole sheet down and free-stops at release position', async ({ page }) => {
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

  await touchDrag(firstImage, { fromY: 260, toY: 438, duration: 520 })
  await page.waitForTimeout(120)
  const released = await numberAttribute(sheet, 'data-progress')
  expect(released).toBeGreaterThan(0.55)
  expect(released).toBeLessThan(0.9)
  await expect(sheet).toHaveAttribute('data-snap-state', 'moving')

  await page.waitForTimeout(650)
  const settled = await numberAttribute(sheet, 'data-progress')
  expect(Math.abs(settled - released)).toBeLessThanOrEqual(0.02)
})

test('expanded non-first offer keeps list ownership and cannot pull the whole sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const secondImage = sheet.locator('.map-offer-sheet__card').nth(1).locator('.map-offer-sheet__media')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await list.evaluate((node) => { node.scrollTop = 0 })

  await touchDrag(secondImage, { fromY: 520, toY: 690, duration: 520 })
  await page.waitForTimeout(180)
  expect(await numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.98)
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

  await touchDrag(firstImage, { fromY: 260, toY: 438, duration: 520 })
  await page.waitForTimeout(150)
  const freePosition = await numberAttribute(sheet, 'data-progress')
  expect(freePosition).toBeGreaterThan(0.55)
  expect(freePosition).toBeLessThan(0.9)

  // This is a real Playwright click, not node.click(), so it exercises the
  // browser event path and the panel click guard. Programmatic map focus still
  // intentionally moves the sheet to its exact middle target.
  await focusButton.click()
  await expect(engine).toHaveAttribute('data-selected-listing-id', 'maison-jasmin')
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
})
