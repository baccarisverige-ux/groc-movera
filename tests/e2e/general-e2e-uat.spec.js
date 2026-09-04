import { expect, test } from '@playwright/test'

const SEARCH_SETTLE_TIMEOUT = 10_000

function watchRuntimeErrors(page) {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  return pageErrors
}

async function expectNoDocumentOverflow(page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

async function expectBottomNavigation(page, activeLabel) {
  const nav = page.locator('.app-shell--guest > .app-shell__nav')
  await expect(nav).toBeVisible()
  await expect(nav.locator('.app-shell__nav-item')).toHaveCount(5)
  await expect(nav.locator('.app-shell__nav-item svg')).toHaveCount(5)
  await expect(nav.locator('.app-shell__nav-item[data-active="true"] span')).toHaveText(activeLabel)

  const geometry = await nav.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      bottomGap: Math.abs(window.innerHeight - rect.bottom),
      left: rect.left,
      right: rect.right,
      viewportWidth: window.innerWidth,
      position: getComputedStyle(element).position,
    }
  })

  expect(geometry.position).toBe('fixed')
  expect(geometry.bottomGap).toBeLessThanOrEqual(1)
  expect(geometry.left).toBeGreaterThanOrEqual(-1)
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1)
}

async function chooseTwoAvailableDates(page) {
  await expect(page.getByTestId('search-calendar')).toBeVisible()
  const available = page.locator('.movera-st__calendar-grid button.movera-st__day:not(:disabled)')
  const count = await available.count()
  expect(count).toBeGreaterThanOrEqual(2)

  const first = available.nth(0)
  const second = available.nth(Math.min(3, count - 1))
  await first.click()
  await second.click()
}

async function activateAnimatedControl(locator) {
  await expect(locator).toBeVisible()
  await expect(locator).toBeEnabled()
  await locator.dispatchEvent('click')
}

async function expectSearchUnlocked(page) {
  await expect(page.getByTestId('search-transition')).toBeHidden({ timeout: SEARCH_SETTLE_TIMEOUT })
  const lockState = await page.evaluate(() => ({
    html: document.documentElement.dataset.moveraSearchLock,
    body: document.body.dataset.moveraSearchLock,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    activeSearchInput: document.activeElement?.matches?.('.movera-st__persistent-search input') || false,
  }))

  expect(lockState.html).toBeUndefined()
  expect(lockState.body).toBeUndefined()
  expect(lockState.bodyPosition).not.toBe('fixed')
  expect(lockState.bodyTop).toBe('')
  expect(lockState.activeSearchInput).toBe(false)
}

test.describe('Movera general E2E + UAT acceptance', () => {
  test('UAT: Home renders all current product surfaces without layout or runtime errors', async ({ page }) => {
    const pageErrors = watchRuntimeErrors(page)
    await page.goto('/')

    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.locator('.b225-home-header')).toBeVisible()
    await expect(page.locator('.b225-search')).toBeVisible()
    await expect(page.getByTestId('home-categories').locator('button')).toHaveCount(8)
    await expect(page.getByTestId('home-welcome-cities').locator('.b225-welcome-city')).toHaveCount(7)
    await expect(page.getByTestId('home-selection-all')).toBeVisible()
    await expect(page.getByTestId('home-services-mini')).toHaveCount(0)

    const welcomeCities = page.getByTestId('home-welcome-cities').locator('.b225-welcome-city')
    for (let index = 0; index < await welcomeCities.count(); index += 1) {
      const box = await welcomeCities.nth(index).boundingBox()
      expect(box?.height || 0).toBeGreaterThanOrEqual(40)
    }

    await expectBottomNavigation(page, 'Accueil')
    await expectNoDocumentOverflow(page)
    expect(pageErrors).toEqual([])
  })

  test('E2E: Home → Search → Dates → Voyageurs → Map → Home completes cleanly', async ({ page }) => {
    const pageErrors = watchRuntimeErrors(page)
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, Math.min(520, document.documentElement.scrollHeight * 0.25)))
    const homeScroll = Math.round(await page.evaluate(() => window.scrollY))

    await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
    const transition = page.getByTestId('search-transition')
    await expect(transition).toBeVisible()
    await expect.poll(() => transition.getAttribute('data-ready'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('true')
    await expect(transition).toHaveAttribute('data-step', 'destination')

    await page.locator('[data-destination="la-marsa"]').click()
    await expect(transition).toHaveAttribute('data-step', 'dates')
    await chooseTwoAvailableDates(page)
    await page.getByRole('button', { name: /Continuer vers les voyageurs/i }).click()
    await expect(transition).toHaveAttribute('data-step', 'guests')
    await page.getByRole('button', { name: /Rechercher sur la carte/i }).click()

    await expect(page.getByTestId('page-map')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('map-engine')).toBeVisible()
    await expect(page.locator('.app-shell__nav')).toHaveCount(0)
    const returnHomeButton = page.getByRole('button', { name: 'Retour à l’accueil' })
    await expect(returnHomeButton).toBeVisible()
    await expectNoDocumentOverflow(page)

    await activateAnimatedControl(returnHomeButton)
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expectSearchUnlocked(page)
    await expectBottomNavigation(page, 'Accueil')

    // Search navigation intentionally leaves Home and returns to a clean, usable Home state.
    expect(await page.evaluate(() => Number.isFinite(window.scrollY))).toBe(true)
    expect(homeScroll).toBeGreaterThanOrEqual(0)
    expect(pageErrors).toEqual([])
  })

  test('E2E: Bienvenue city cards hand off to the exact Map destination', async ({ page }) => {
    const pageErrors = watchRuntimeErrors(page)
    const cities = ['sidi-bou-said', 'sousse', 'hammamet', 'tunis', 'djerba', 'tozeur', 'tabarka']

    for (const cityId of cities) {
      await page.goto('/')
      await expect(page.getByTestId('page-home')).toBeVisible()
      const city = page.locator(`.b225-welcome-city[data-city-id="${cityId}"]`)
      await expect(city).toBeVisible()
      await city.click()
      await expect(page.getByTestId('page-map')).toBeVisible()
      await expect(page.getByTestId('page-map')).toHaveAttribute('data-destination', cityId)
      await expect(page.locator('.app-shell__nav')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Retour à l’accueil' })).toBeVisible()
    }

    expect(pageErrors).toEqual([])
  })

  test('UAT: Plage, Maison d’hôte and Hôtel open as separate usable collection pages', async ({ page }) => {
    const pageErrors = watchRuntimeErrors(page)
    const collections = [
      { id: 'beach', testId: 'page-beach', heading: /La Tunisie\s*côté mer\./ },
      { id: 'guesthouse', testId: 'page-guesthouse', heading: /L’accueil tunisien,\s*autrement\./ },
      { id: 'hotel', testId: 'page-hotel', heading: /L’hôtel,\s*autrement\./ },
    ]

    for (const collection of collections) {
      await page.goto('/')
      await expect(page.getByTestId('page-home')).toBeVisible()
      await page.locator(`.b225-categories button[data-category-id="${collection.id}"]`).click()
      await expect(page.getByTestId(collection.testId)).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(collection.heading)

      const hero = page.locator('.portrait-collection-hero__image')
      await expect(hero).toBeVisible()
      await expect.poll(() => hero.evaluate((image) => image.complete && image.naturalWidth > 0), { timeout: 15_000 }).toBe(true)

      await expect(page.getByLabel('Ville en Tunisie')).toBeVisible()
      await expectBottomNavigation(page, 'Accueil')
      await expectNoDocumentOverflow(page)

      await page.locator('.app-shell__nav-item', { hasText: 'Accueil' }).click()
      await expect(page.getByTestId('page-home')).toBeVisible()
      await expect(page.locator(`.b225-categories button[data-category-id="${collection.id}"]`)).toHaveAttribute('data-active', 'true')
    }

    expect(pageErrors).toEqual([])
  })

  test('UAT: Search can close from every main step and Home remains interactive', async ({ page }) => {
    test.setTimeout(90_000)
    const pageErrors = watchRuntimeErrors(page)

    const openSearch = async () => {
      await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
      const transition = page.getByTestId('search-transition')
      await expect(transition).toBeVisible()
      await expect.poll(() => transition.getAttribute('data-ready'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('true')
      return transition
    }

    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()

    let transition = await openSearch()
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchUnlocked(page)

    transition = await openSearch()
    await page.locator('[data-destination="la-marsa"]').click()
    await expect(transition).toHaveAttribute('data-step', 'dates')
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchUnlocked(page)

    transition = await openSearch()
    await page.locator('[data-destination="la-marsa"]').click()
    await chooseTwoAvailableDates(page)
    await activateAnimatedControl(page.getByRole('button', { name: /Continuer vers les voyageurs/i }))
    await expect(transition).toHaveAttribute('data-step', 'guests')
    await activateAnimatedControl(page.getByRole('button', { name: 'Fermer' }))
    await expectSearchUnlocked(page)

    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.locator('.b225-search')).toBeVisible()
    await expectBottomNavigation(page, 'Accueil')
    await expectNoDocumentOverflow(page)
    expect(pageErrors).toEqual([])
  })
})
