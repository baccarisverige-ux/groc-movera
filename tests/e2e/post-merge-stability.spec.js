import { expect, test } from '@playwright/test'

const REPEAT_COUNT = 10
const SETTLE_TIMEOUT = 12_000

function isTargetMobileProject(testInfo) {
  return testInfo.project.name === 'mobile-chromium' || testInfo.project.name === 'mobile-webkit'
}

async function gestureEvent(locator, type, { x = 180, y, pointerId = 71 } = {}) {
  await locator.evaluate((node, args) => {
    const iosLike = /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    if (iosLike) {
      const touchType = args.type === 'start'
        ? 'touchstart'
        : args.type === 'move'
          ? 'touchmove'
          : args.type === 'cancel'
            ? 'touchcancel'
            : 'touchend'
      const touch = { identifier: args.pointerId, clientX: args.x, clientY: args.y }
      const event = new Event(touchType, { bubbles: true, cancelable: touchType === 'touchmove' })
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: touchType === 'touchend' || touchType === 'touchcancel' ? [] : [touch],
      })
      Object.defineProperty(event, 'changedTouches', { configurable: true, value: [touch] })
      node.dispatchEvent(event)
      return
    }

    const pointerType = args.type === 'start'
      ? 'pointerdown'
      : args.type === 'move'
        ? 'pointermove'
        : args.type === 'cancel'
          ? 'pointercancel'
          : 'pointerup'
    node.dispatchEvent(new PointerEvent(pointerType, {
      bubbles: true,
      cancelable: pointerType === 'pointermove',
      pointerId: args.pointerId,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: pointerType === 'pointerup' || pointerType === 'pointercancel' ? 0 : 1,
      clientX: args.x,
      clientY: args.y,
    }))
  }, { type, x, y, pointerId })
}

async function readHomeBarLayout(page) {
  return page.evaluate(() => {
    const header = document.querySelector('.b225-home-header')
    const categoriesShell = document.querySelector('.b225-categories-shell')
    const welcome = document.querySelector('.b225-welcome')
    const layoutDocumentTop = (element) => {
      let top = 0
      let node = element
      while (node instanceof HTMLElement) {
        top += node.offsetTop
        node = node.offsetParent
      }
      return top
    }

    const scrollY = window.scrollY || 0
    const headerHeight = header?.offsetHeight || 0
    const shellHeight = categoriesShell?.offsetHeight || 0
    const welcomeBottom = welcome ? layoutDocumentTop(welcome) + welcome.offsetHeight - scrollY : 0
    const expectedTravel = Math.min(shellHeight, Math.max(0, headerHeight + shellHeight - welcomeBottom))
    const travel = categoriesShell
      ? Number.parseFloat(getComputedStyle(categoriesShell).getPropertyValue('--movera-category-upward-travel')) || 0
      : 0

    return { scrollY: Math.round(scrollY), travel, expectedTravel }
  })
}

async function waitForHomeBarAlignment(page) {
  let stableSamples = 0
  let previous = null
  await expect.poll(async () => {
    const current = await readHomeBarLayout(page)
    const aligned = Math.abs(current.travel - current.expectedTravel) <= 2
    const stable = previous
      && Math.abs(current.travel - previous.travel) <= 0.15
      && Math.abs(current.scrollY - previous.scrollY) <= 0.5
    stableSamples = aligned && stable ? stableSamples + 1 : 0
    previous = current
    return stableSamples
  }, {
    timeout: SETTLE_TIMEOUT,
    intervals: [50, 75, 100, 125, 150, 200],
  }).toBeGreaterThanOrEqual(3)
}

test('post-merge map sheet settles flush after drag in 10 consecutive cycles', async ({ page }, testInfo) => {
  test.skip(!isTargetMobileProject(testInfo), 'Mobile Chromium/WebKit stability guard')
  test.setTimeout(180_000)

  for (let iteration = 0; iteration < REPEAT_COUNT; iteration += 1) {
    await page.goto('/groc-movera/map?destination=la-marsa')
    const pageMap = page.getByTestId('page-map')
    const sheet = page.getByTestId('map-offer-sheet')
    const panel = sheet.locator('.map-offer-sheet__panel')
    const handle = page.getByTestId('map-offer-sheet-handle')
    const header = page.locator('.b225-map-top')

    await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed')
    const mapBox = await pageMap.boundingBox()
    const panelBox = await panel.boundingBox()
    const headerBox = await header.boundingBox()
    const handleBox = await handle.boundingBox()
    expect(mapBox).not.toBeNull()
    expect(panelBox).not.toBeNull()
    expect(headerBox).not.toBeNull()
    expect(handleBox).not.toBeNull()

    const travel = panelBox.y - (headerBox.y + headerBox.height)
    const x = handleBox.x + handleBox.width / 2
    const y = handleBox.y + handleBox.height / 2
    await gestureEvent(handle, 'start', { x, y, pointerId: 71 + iteration })
    await gestureEvent(handle, 'move', { x, y: y - travel * 0.94, pointerId: 71 + iteration })
    await gestureEvent(handle, 'end', { x, y: y - travel * 0.94, pointerId: 71 + iteration })

    await expect(sheet).toHaveAttribute('data-snap-state', 'expanded', { timeout: SETTLE_TIMEOUT })
    await expect(panel).toHaveAttribute('data-attachment-state', 'attached')
    const settledPanelBox = await panel.boundingBox()
    expect(settledPanelBox).not.toBeNull()
    expect(Math.abs(settledPanelBox.y - mapBox.y)).toBeLessThanOrEqual(2)
  }
})

test('post-merge Home scroll and Search restore stay aligned in 10 consecutive cycles', async ({ page }, testInfo) => {
  test.skip(!isTargetMobileProject(testInfo), 'Mobile Chromium/WebKit stability guard')
  test.setTimeout(240_000)

  for (let iteration = 0; iteration < REPEAT_COUNT; iteration += 1) {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, Math.min(900, Math.max(500, document.documentElement.scrollHeight * 0.35))))
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: SETTLE_TIMEOUT }).toBeGreaterThan(300)
    await waitForHomeBarAlignment(page)

    const beforeOpen = await readHomeBarLayout(page)
    expect(Math.abs(beforeOpen.travel - beforeOpen.expectedTravel)).toBeLessThanOrEqual(2)

    await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
    const transition = page.getByTestId('search-transition')
    await expect(transition).toBeVisible()
    await expect.poll(() => transition.getAttribute('data-ready'), { timeout: SETTLE_TIMEOUT }).toBe('true')
    await page.getByRole('button', { name: 'Fermer' }).dispatchEvent('click')
    await expect(transition).toBeHidden({ timeout: SETTLE_TIMEOUT })
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: SETTLE_TIMEOUT }).toBe(beforeOpen.scrollY)
    await waitForHomeBarAlignment(page)

    const afterClose = await readHomeBarLayout(page)
    expect(Math.abs(afterClose.travel - afterClose.expectedTravel)).toBeLessThanOrEqual(2)
    expect(Math.abs(afterClose.travel - beforeOpen.travel)).toBeLessThanOrEqual(2)
  }
})
