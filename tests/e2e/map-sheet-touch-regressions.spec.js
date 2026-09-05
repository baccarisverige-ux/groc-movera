import { expect, test } from '@playwright/test'

function numberAttribute(locator, name) {
  return locator.getAttribute(name).then((value) => Number(value))
}

async function dragGesture(locator, { x = 180, fromY, toY, duration = 360 }) {
  await locator.evaluate(async (node, args) => {
    const iosLike = /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const pointerId = 7

    const fireTouch = (type, clientX, clientY) => {
      const touch = { identifier: pointerId, clientX, clientY }
      const event = new Event(type, { bubbles: true, cancelable: type === 'touchmove' })
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: type === 'touchend' || type === 'touchcancel' ? [] : [touch],
      })
      Object.defineProperty(event, 'changedTouches', {
        configurable: true,
        value: [touch],
      })
      node.dispatchEvent(event)
    }

    const firePointer = (type, clientX, clientY) => {
      node.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: type === 'pointermove',
        pointerId,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
        clientX,
        clientY,
      }))
    }

    const fire = iosLike ? fireTouch : firePointer
    const startType = iosLike ? 'touchstart' : 'pointerdown'
    const moveType = iosLike ? 'touchmove' : 'pointermove'
    const endType = iosLike ? 'touchend' : 'pointerup'
    const steps = 6

    fire(startType, args.x, args.fromY)
    for (let index = 1; index <= steps; index += 1) {
      await sleep(args.duration / steps)
      const ratio = index / steps
      fire(moveType, args.x, args.fromY + (args.toY - args.fromY) * ratio)
    }
    fire(endType, args.x, args.toY)
  }, { x, fromY, toY, duration })
}

async function reversingGesture(locator, { x = 180, startY, downY, upY }) {
  await locator.evaluate(async (node, args) => {
    const iosLike = /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const pointerId = 9

    const fireTouch = (type, clientX, clientY) => {
      const touch = { identifier: pointerId, clientX, clientY }
      const event = new Event(type, { bubbles: true, cancelable: type === 'touchmove' })
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: type === 'touchend' || type === 'touchcancel' ? [] : [touch],
      })
      Object.defineProperty(event, 'changedTouches', {
        configurable: true,
        value: [touch],
      })
      node.dispatchEvent(event)
    }

    const firePointer = (type, clientX, clientY) => {
      node.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: type === 'pointermove',
        pointerId,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
        clientX,
        clientY,
      }))
    }

    const fire = iosLike ? fireTouch : firePointer
    const startType = iosLike ? 'touchstart' : 'pointerdown'
    const moveType = iosLike ? 'touchmove' : 'pointermove'
    const endType = iosLike ? 'touchend' : 'pointerup'

    fire(startType, args.x, args.startY)
    await sleep(90)
    fire(moveType, args.x, args.downY)
    await sleep(90)
    fire(moveType, args.x, args.upY)
    await sleep(50)
    fire(endType, args.x, args.upY)
  }, { x, startY, downY, upY })
}

async function tinyGesture(locator, { x = 180, fromY, toY }) {
  await dragGesture(locator, { x, fromY, toY, duration: 72 })
}

test('manual drag releases into one of the three semantic snap positions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const panel = sheet.locator('.map-offer-sheet__panel')
  const dock = page.getByTestId('map-sheet-property-filters')
  const list = sheet.locator('.map-offer-sheet__list')

  await expect(sheet).toHaveAttribute('data-map-sheet-runtime', 'v2')
  await expect(panel).toHaveAttribute('data-gesture-router', 'v2')
  await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'false')
  await expect(list).toHaveCSS('touch-action', 'none')

  await dragGesture(dock, { fromY: 785, toY: 560, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
  await expect(sheet).toHaveAttribute('data-snap-state', 'middle')
})

test('offer content itself drags a middle sheet and can expand it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const dock = page.getByTestId('map-sheet-property-filters')
  const firstCard = sheet.locator('.map-offer-sheet__card').first()
  await expect(firstCard).toHaveAttribute('data-listing-id', 'sea-breeze-marsa')
  const firstImage = firstCard.locator('.map-offer-sheet__media')

  await dragGesture(dock, { fromY: 785, toY: 560, duration: 520 })
  await expect(sheet).toHaveAttribute('data-snap-state', 'middle')

  await dragGesture(firstImage, { fromY: 590, toY: 300, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.985)
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
})

test('expanded first offer hands the list back to the sheet and snaps down cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const firstCard = sheet.locator('.map-offer-sheet__card').first()
  await expect(firstCard).toHaveAttribute('data-listing-id', 'sea-breeze-marsa')
  const firstImage = firstCard.locator('.map-offer-sheet__media')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'true')
  await expect(list).toHaveCSS('touch-action', 'pan-y')
  await list.evaluate((node) => { node.scrollTop = 0 })

  await dragGesture(firstImage, { fromY: 270, toY: 490, duration: 520 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
  await expect(sheet).toHaveAttribute('data-snap-state', 'middle')
})

test('a claimed first-offer sheet pull keeps ownership when the finger reverses direction', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const firstImage = sheet.locator('.map-offer-sheet__card').first().locator('.map-offer-sheet__media')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await list.evaluate((node) => { node.scrollTop = 0 })

  await reversingGesture(firstImage, { startY: 270, downY: 430, upY: 220 })

  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.985)
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'true')
})

test('expanded non-first offer keeps native list ownership and cannot pull the whole sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const secondImage = sheet.locator('.map-offer-sheet__card').nth(1).locator('.map-offer-sheet__media')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await list.evaluate((node) => { node.scrollTop = 0 })

  await dragGesture(secondImage, { fromY: 520, toY: 690, duration: 520 })
  await page.waitForTimeout(180)
  expect(await numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.985)
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
})

test('small finger jitter on Voir sur la carte remains a tap and exact focus moves to middle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const focusButton = page.getByTestId('map-focus-maison-jasmin')
  const engine = page.getByTestId('map-engine')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')

  await tinyGesture(focusButton, { fromY: 610, toY: 616 })
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')

  await focusButton.click()
  await expect(engine).toHaveAttribute('data-selected-listing-id', 'maison-jasmin')
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
  await expect(sheet).toHaveAttribute('data-snap-state', 'middle')
})

test('fresh map-focus tap after a real sheet drag is never swallowed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const firstCard = sheet.locator('.map-offer-sheet__card').first()
  await expect(firstCard).toHaveAttribute('data-listing-id', 'sea-breeze-marsa')
  const firstImage = firstCard.locator('.map-offer-sheet__media')
  const focusButton = page.getByTestId('map-focus-sea-breeze-marsa')
  const engine = page.getByTestId('map-engine')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await list.evaluate((node) => { node.scrollTop = 0 })

  await dragGesture(firstImage, { fromY: 270, toY: 490, duration: 520 })
  await expect(sheet).toHaveAttribute('data-snap-state', 'middle')

  await focusButton.click()
  await expect(engine).toHaveAttribute('data-selected-listing-id', 'sea-breeze-marsa')
  await expect(sheet).toHaveAttribute('data-snap-state', 'middle')
})
