import { expect, test } from '@playwright/test'

const TARGET_VIEWPORTS = Object.freeze([
  { width: 320, height: 700 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
])

const MAP_URL = '/groc-movera/map?destination=la-marsa&search=1&place=La%20Marsa&checkin=2026-09-10&checkout=2026-09-12&adults=2&lat=36.8782&lng=10.3247&zoom=14'
const FOCUS_UPDATE_BUDGET = 48
const LONG_CYCLE_COUNT = 3

async function numberAttribute(locator, name) {
  const value = Number(await locator.getAttribute(name))
  expect(Number.isFinite(value)).toBe(true)
  return value
}

async function waitForStableNumberAttribute(locator, name) {
  let previous = null
  let stableSamples = 0
  let latest = 0

  await expect.poll(async () => {
    latest = await numberAttribute(locator, name)
    if (latest === previous) stableSamples += 1
    else stableSamples = 0
    previous = latest
    return stableSamples
  }, {
    timeout: 10_000,
    intervals: [50, 75, 100, 125, 150, 200],
  }).toBeGreaterThanOrEqual(2)

  return latest
}

async function expectCleanMapGeometry(page, viewport) {
  const geometry = await page.evaluate(() => {
    const pageMap = document.querySelector('[data-testid="page-map"]')
    const top = document.querySelector('.b225-map-top')
    const surface = document.querySelector('[data-testid="map-surface"]')
    const sheet = document.querySelector('[data-testid="map-offer-sheet"]')
    const rect = (element) => {
      const value = element?.getBoundingClientRect()
      return value ? { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height } : null
    }

    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      pageMap: rect(pageMap),
      top: rect(top),
      surface: rect(surface),
      sheet: rect(sheet),
    }
  })

  expect(geometry.innerWidth).toBe(viewport.width)
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1)

  for (const key of ['pageMap', 'top', 'surface', 'sheet']) {
    expect(geometry[key], `${key} must exist at ${viewport.width}px`).not.toBeNull()
    expect(geometry[key].left, `${key} left edge at ${viewport.width}px`).toBeGreaterThanOrEqual(-2)
    expect(geometry[key].right, `${key} right edge at ${viewport.width}px`).toBeLessThanOrEqual(viewport.width + 2)
    expect(geometry[key].width, `${key} width at ${viewport.width}px`).toBeGreaterThan(0)
  }

  expect(geometry.surface.height).toBeGreaterThan(240)
  expect(geometry.top.top).toBeGreaterThanOrEqual(-2)
}

test.describe('Phase 5 · final Map UAT / anti-regression', () => {
  test('target viewport matrix keeps Map geometry and sheet ownership stable', async ({ page }) => {
    test.setTimeout(180_000)
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    for (const viewport of TARGET_VIEWPORTS) {
      await page.setViewportSize(viewport)
      await page.goto(MAP_URL)

      const mapPage = page.getByTestId('page-map')
      const sheet = page.getByTestId('map-offer-sheet')
      const list = sheet.locator('.map-offer-sheet__list')

      await expect(mapPage).toBeVisible()
      await expect(mapPage).toHaveAttribute('data-city-offer-count', '4')
      await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed')
      await expect(page.getByTestId('map-search-filter-stack')).toBeVisible()
      await expectCleanMapGeometry(page, viewport)

      await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
      await expect(sheet).toHaveAttribute('data-snap-state', 'expanded', { timeout: 15_000 })
      await expect(list).toHaveAttribute('data-scroll-enabled', 'true')
      await expect(list).toHaveCSS('touch-action', 'pan-y')
      await expectCleanMapGeometry(page, viewport)

      await page.getByRole('button', { name: 'Réduire la liste des offres' }).click()
      await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed', { timeout: 15_000 })
    }

    expect(pageErrors).toEqual([])
  })

  test('long Map → filters → list → focus → Search cycles stay deterministic', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 390, height: 844 })

    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(MAP_URL)

    const mapPage = page.getByTestId('page-map')
    const sheet = page.getByTestId('map-offer-sheet')
    const engine = page.getByTestId('map-engine')
    const surface = page.getByTestId('map-surface')
    const filterStack = page.getByTestId('map-search-filter-stack')
    const focusIds = ['maison-jasmin', 'apartment-marsa', 'partner-marsa']

    await expect(mapPage).toBeVisible()
    await expect(mapPage).toHaveAttribute('data-city-offer-count', '4')
    const initialUpdateCount = await waitForStableNumberAttribute(surface, 'data-update-count')

    for (let cycle = 0; cycle < LONG_CYCLE_COUNT; cycle += 1) {
      const tv = page.getByRole('button', { name: 'TV', exact: true })
      await tv.click()
      await expect(tv).toHaveAttribute('aria-pressed', 'true')

      const apartment = page.getByRole('button', { name: 'Appartement', exact: true })
      await apartment.click()
      await expect(apartment).toHaveAttribute('aria-pressed', 'true')
      await expect(filterStack).toHaveAttribute('data-active-filter-count', '2')

      const reset = page.getByTestId('map-filter-control')
      await expect(reset).toHaveAttribute('aria-label', 'Réinitialiser les filtres')
      await reset.click()
      await expect(filterStack).toHaveAttribute('data-active-filter-count', '0')
      await expect(mapPage).toHaveAttribute('data-property-filter', 'all')
      await expect(mapPage).toHaveAttribute('data-city-offer-count', '4')

      await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
      await expect(sheet).toHaveAttribute('data-snap-state', 'expanded', { timeout: 15_000 })
      const list = sheet.locator('.map-offer-sheet__list')
      await expect(list).toHaveAttribute('data-scroll-enabled', 'true')
      await list.evaluate((node, index) => {
        node.scrollTop = 0
        const max = Math.max(0, node.scrollHeight - node.clientHeight)
        node.scrollTo({ top: Math.min(max, 180 + index * 70), behavior: 'instant' })
      }, cycle)

      const listingId = focusIds[cycle]
      const focusButton = page.getByTestId(`map-focus-${listingId}`)
      await focusButton.scrollIntoViewIfNeeded()
      await expect(focusButton).toBeVisible()

      const beforeFocusUpdates = await waitForStableNumberAttribute(surface, 'data-update-count')
      await focusButton.click()

      await expect(engine).toHaveAttribute('data-selected-listing-id', listingId)
      await expect(sheet).toHaveAttribute('data-snap-state', 'middle', { timeout: 15_000 })
      await expect(surface).toHaveAttribute('data-viewport-source', 'command')
      const afterFocusUpdates = await waitForStableNumberAttribute(surface, 'data-update-count')
      const focusUpdateCount = afterFocusUpdates - beforeFocusUpdates
      expect(focusUpdateCount, `focus cycle ${cycle + 1} must issue camera work`).toBeGreaterThan(0)
      expect(focusUpdateCount, `focus cycle ${cycle + 1} exceeded camera update budget`).toBeLessThanOrEqual(FOCUS_UPDATE_BUDGET)
      expect(await numberAttribute(surface, 'data-zoom')).toBeGreaterThan(11)

      await page.getByRole('button', { name: 'Modifier la recherche' }).click()
      const transition = page.getByTestId('search-transition')
      await expect(transition).toBeVisible()
      await expect(transition).toHaveAttribute('data-map-origin', 'true')
      await expect(page.locator('.movera-st__persistent-search input')).toHaveValue('La Marsa')
      await page.getByRole('button', { name: 'Fermer' }).dispatchEvent('click')
      await expect(transition).toBeHidden({ timeout: 10_000 })
      await expect(mapPage).toBeVisible()
      await expect(mapPage).toHaveAttribute('data-city-offer-count', '4')
    }

    const finalUpdateCount = await waitForStableNumberAttribute(surface, 'data-update-count')
    expect(finalUpdateCount - initialUpdateCount).toBeLessThanOrEqual(FOCUS_UPDATE_BUDGET * LONG_CYCLE_COUNT + 24)
    expect(pageErrors).toEqual([])
  })
})
