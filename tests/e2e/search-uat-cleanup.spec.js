import { expect, test } from '@playwright/test'

const SEARCH_SETTLE_TIMEOUT = 10_000

async function activateAnimatedControl(locator) {
  await expect(locator).toBeVisible()
  await expect(locator).toBeEnabled()
  await locator.dispatchEvent('click')
}

async function openSearchOnCurrentPage(page) {
  await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
  const transition = page.getByTestId('search-transition')
  await expect(transition).toBeVisible()
  await expect.poll(async () => transition.getAttribute('data-ready'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('true')
  return transition
}

async function openSearch(page) {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  return openSearchOnCurrentPage(page)
}

async function waitForCategoryTravelToSettle(page) {
  const settled = await page.evaluate(() => new Promise((resolve) => {
    const readGeometry = () => ({
      travel: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--movera-category-upward-travel')) || 0,
      categoriesTop: document.querySelector('.b225-categories')?.getBoundingClientRect().top || 0,
      scrollY: window.scrollY || 0,
    })
    const startedAt = performance.now()
    let previous = readGeometry()
    let stableFrames = 0

    const frame = () => {
      const current = readGeometry()
      const stable = Math.abs(current.travel - previous.travel) <= 0.08
        && Math.abs(current.categoriesTop - previous.categoriesTop) <= 0.25
        && Math.abs(current.scrollY - previous.scrollY) <= 0.25
      stableFrames = stable ? stableFrames + 1 : 0
      previous = current
      if (stableFrames >= 8) {
        resolve(true)
        return
      }
      if (performance.now() - startedAt > 5_000) {
        resolve(false)
        return
      }
      requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)
  }))
  expect(settled).toBe(true)
}

async function chooseTwoAvailableDates(page) {
  const available = page.locator('.movera-st__calendar-grid button.movera-st__day:not(:disabled)')
  const count = await available.count()
  expect(count).toBeGreaterThanOrEqual(2)
  const firstLabel = await available.nth(0).getAttribute('aria-label')
  const secondLabel = await available.nth(Math.min(3, count - 1)).getAttribute('aria-label')
  await page.getByRole('button', { name: firstLabel, exact: true }).click()
  await page.getByRole('button', { name: secondLabel, exact: true }).click()
}

async function expectSearchClosedCleanly(page) {
  await expect(page.getByTestId('search-transition')).toBeHidden({ timeout: SEARCH_SETTLE_TIMEOUT })
  await expect(page.getByTestId('page-home')).toBeVisible()
  const locks = await page.evaluate(() => ({
    html: document.documentElement.dataset.moveraSearchLock,
    body: document.body.dataset.moveraSearchLock,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    activeSearchInput: document.activeElement?.matches?.('.movera-st__persistent-search input') || false,
  }))
  expect(locks.html).toBeUndefined()
  expect(locks.body).toBeUndefined()
  expect(locks.bodyPosition).not.toBe('fixed')
  expect(locks.bodyTop).toBe('')
  expect(locks.activeSearchInput).toBe(false)
}

test.describe('Search live E2E / UAT / cleanup safety', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('UAT: Destination opens with bounded height and no page scroll', async ({ page }) => {
    const startScroll = await page.evaluate(() => window.scrollY)
    const transition = await openSearch(page)
    await expect(transition).toHaveAttribute('data-step', 'destination')
    await expect(page.getByRole('dialog', { name: 'Recherche Movera' })).toBeVisible()
    await expect(page.getByText('Recherches récentes')).toBeVisible()
    await expect(page.getByText('Destinations suggérées')).toBeVisible()

    const geometry = await page.locator('.movera-st__panel').evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return { height: rect.height, top: rect.top, bottom: rect.bottom, viewport: window.innerHeight }
    })
    expect(geometry.height).toBeLessThanOrEqual(550)
    expect(geometry.top).toBeGreaterThanOrEqual(0)
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport + 1)
    expect(await page.evaluate(() => window.scrollY)).toBe(startScroll)
  })

  test('E2E: Destination → Dates → Voyageurs → Map', async ({ page }) => {
    const transition = await openSearch(page)
    await page.locator('[data-destination="la-marsa"]').click()
    await expect(transition).toHaveAttribute('data-step', 'dates')
    await expect(page.getByTestId('search-calendar')).toBeVisible()

    const datesHeight = await page.locator('.movera-st__panel').evaluate((el) => el.getBoundingClientRect().height)
    expect(datesHeight).toBeLessThanOrEqual(640)

    await chooseTwoAvailableDates(page)
    await activateAnimatedControl(page.getByRole('button', { name: /Continuer vers les voyageurs/i }))
    await expect(transition).toHaveAttribute('data-step', 'guests')
    await expect(page.getByText('Qui voyage ?')).toBeVisible()

    const guestsHeight = await page.locator('.movera-st__panel').evaluate((el) => el.getBoundingClientRect().height)
    expect(guestsHeight).toBeLessThanOrEqual(700)

    await page.getByRole('button', { name: /Rechercher sur la carte/i }).click()
    await expect(page.getByTestId('page-map')).toBeVisible({ timeout: 10_000 })
  })

  test('UAT: close returns cleanly to Home and unlocks document', async ({ page }) => {
    await openSearch(page)
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchClosedCleanly(page)
  })

  test('regression: close after Home scroll dismisses focus, restores position and keeps top bar geometry stable', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, Math.min(900, Math.max(500, document.documentElement.scrollHeight * 0.35))))
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
    await waitForCategoryTravelToSettle(page)
    const beforeOpen = await page.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      headerHeight: document.querySelector('.b225-home-header')?.getBoundingClientRect().height || 0,
      categoriesTop: document.querySelector('.b225-categories')?.getBoundingClientRect().top || 0,
      travel: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--movera-category-upward-travel')) || 0,
    }))

    await openSearchOnCurrentPage(page)
    const destinationInput = page.locator('.movera-st__persistent-search input')
    await destinationInput.focus()
    await expect.poll(async () => page.evaluate(() => document.activeElement?.matches('.movera-st__persistent-search input'))).toBe(true)

    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expect.poll(async () => page.evaluate(() => document.activeElement?.matches('.movera-st__persistent-search input') || false)).toBe(false)
    await expectSearchClosedCleanly(page)
    await expect.poll(async () => page.evaluate(() => Math.round(window.scrollY)), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe(beforeOpen.scrollY)
    await waitForCategoryTravelToSettle(page)

    const afterClose = await page.evaluate(() => ({
      headerHeight: document.querySelector('.b225-home-header')?.getBoundingClientRect().height || 0,
      categoriesTop: document.querySelector('.b225-categories')?.getBoundingClientRect().top || 0,
      travel: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--movera-category-upward-travel')) || 0,
    }))
    expect(Math.abs(afterClose.headerHeight - beforeOpen.headerHeight)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterClose.categoriesTop - beforeOpen.categoriesTop)).toBeLessThanOrEqual(2)
    expect(Math.abs(afterClose.travel - beforeOpen.travel)).toBeLessThanOrEqual(2)
  })

  test('regression: close is safe from Destination, Dates and Voyageurs then can reopen', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()

    let transition = await openSearchOnCurrentPage(page)
    const destinationInput = page.locator('.movera-st__persistent-search input')
    await destinationInput.focus()
    await destinationInput.fill('La Marsa')
    await expect(transition).toHaveAttribute('data-address-mode', 'true')
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchClosedCleanly(page)

    transition = await openSearchOnCurrentPage(page)
    await page.locator('[data-destination="la-marsa"]').click()
    await expect(transition).toHaveAttribute('data-step', 'dates')
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchClosedCleanly(page)

    transition = await openSearchOnCurrentPage(page)
    await page.locator('[data-destination="la-marsa"]').click()
    await expect(transition).toHaveAttribute('data-step', 'dates')
    await chooseTwoAvailableDates(page)
    await activateAnimatedControl(page.getByRole('button', { name: /Continuer vers les voyageurs/i }))
    await expect(transition).toHaveAttribute('data-step', 'guests')
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchClosedCleanly(page)

    transition = await openSearchOnCurrentPage(page)
    await expect(transition).toHaveAttribute('data-step', 'destination')
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchClosedCleanly(page)
  })

  test('regression: close during opening cannot leave an invisible locked popup', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
    const transition = page.getByTestId('search-transition')
    await expect(transition).toBeVisible()
    await expect(transition).toHaveClass(/movera-st--open/)
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchClosedCleanly(page)
  })

  test('mobile regression: tapping Home search opens popup without retaining focus on the Home input', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Touch-specific regression')
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await page.locator('.b225-search').tap({ position: { x: 80, y: 25 } })
    const transition = page.getByTestId('search-transition')
    await expect(transition).toBeVisible()
    await expect.poll(async () => page.evaluate(() => document.activeElement?.getAttribute('data-testid') || '')).not.toBe('home-search')
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchClosedCleanly(page)
  })

  test('cleanup safety: only the live Search transition is mounted', async ({ page }) => {
    await openSearch(page)
    expect(await page.locator('[data-testid="search-transition"]').count()).toBe(1)
    expect(await page.locator('.search-v2').count()).toBe(0)
  })
})
