import { expect, test } from '@playwright/test'

const appPath = (path = '/') => `/groc-movera${path === '/' ? '/' : path}`

function watchRuntime(page) {
  const pageErrors = []
  const failedLocalRequests = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || ''
    if (!request.url().startsWith('http://127.0.0.1:4173')) return
    if (/ERR_ABORTED/i.test(failure)) return
    failedLocalRequests.push(`${request.method()} ${request.url()} ${failure}`)
  })
  return { pageErrors, failedLocalRequests }
}

async function expectHealthyPage(page, runtime) {
  await expect.poll(async () => page.evaluate(() => document.readyState)).toBe('complete')
  const geometry = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }))
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1)
  expect(runtime.pageErrors).toEqual([])
  expect(runtime.failedLocalRequests).toEqual([])
}

async function chooseTwoAvailableDates(page) {
  const available = page.locator('.movera-st__calendar-grid button.movera-st__day:not(:disabled)')
  await expect.poll(() => available.count()).toBeGreaterThanOrEqual(2)
  const count = await available.count()
  await available.nth(0).click()
  await available.nth(Math.min(3, count - 1)).click()
}

async function mapSnapshot(surface) {
  return {
    lat: await surface.getAttribute('data-lat'),
    lng: await surface.getAttribute('data-lng'),
    zoom: await surface.getAttribute('data-zoom'),
  }
}

async function expectImageLoaded(locator) {
  await expect(locator).toBeVisible()
  await expect.poll(() => locator.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true)
}

async function waitForCollectionMotion() {
  await new Promise((resolve) => setTimeout(resolve, 450))
}

test.describe('Voyageur global E2E + UAT', () => {
  test('Home → Search → dates → voyageurs → Map completes with no runtime/layout failure', async ({ page }) => {
    const runtime = watchRuntime(page)
    await page.goto(appPath('/'))
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.getByTestId('home-categories').locator('button')).toHaveCount(8)
    await expect(page.getByTestId('home-services-mini').getByRole('button')).toHaveCount(3)

    await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
    const search = page.getByTestId('search-transition')
    await expect(search).toBeVisible()
    await expect.poll(() => search.getAttribute('data-ready')).toBe('true')
    await page.locator('[data-destination="la-marsa"]').click()
    await expect(search).toHaveAttribute('data-step', 'dates')
    await chooseTwoAvailableDates(page)
    await page.getByRole('button', { name: /Continuer vers les voyageurs/i }).click()
    await expect(search).toHaveAttribute('data-step', 'guests')
    await page.getByRole('button', { name: /Rechercher sur la carte/i }).click()

    await expect(page.getByTestId('page-map')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('map-engine')).toBeVisible()
    await expectHealthyPage(page, runtime)
  })

  test('All five Voyageur collection pages render, filter, open listing, and hand off to Map', async ({ page }) => {
    const collections = [
      { path: '/plage', testId: 'page-beach' },
      { path: '/maison-d-hote', testId: 'page-guesthouse' },
      { path: '/hotel', testId: 'page-hotel' },
      { path: '/appartement', testId: 'page-apartment' },
      { path: '/villa', testId: 'page-villa' },
    ]

    for (const collection of collections) {
      const runtime = watchRuntime(page)
      await page.goto(appPath(collection.path))
      await expect(page.getByTestId(collection.testId)).toBeVisible()
      await expectImageLoaded(page.locator('.portrait-collection-hero__image'))
      const cityInput = page.getByLabel('Ville en Tunisie')
      await expect(cityInput).toBeVisible()
      await cityInput.fill('La Marsa')
      await cityInput.focus()
      const marsaOption = page.getByRole('option', { name: /La Marsa/i }).first()
      await expect(marsaOption).toBeVisible()
      await marsaOption.click()
      await expect(page.locator('.beach-results__head')).toContainText('La Marsa')
      await waitForCollectionMotion()

      const filteredOffers = page.locator('.beach-offer')
      const filteredCount = await filteredOffers.count()
      for (let index = 0; index < filteredCount; index += 1) {
        await expect(filteredOffers.nth(index).locator('.beach-offer__location')).toContainText('La Marsa')
      }

      await page.getByRole('button', { name: 'Effacer la ville' }).click()
      const offers = page.locator('.beach-offer')
      await expect.poll(() => offers.count()).toBeGreaterThan(0)
      await waitForCollectionMotion()

      const offerId = await offers.first().getAttribute('data-offer-id')
      expect(offerId).toBeTruthy()
      const stableOffer = page.locator(`.beach-offer[data-offer-id="${offerId}"]`)
      await expect(stableOffer).toBeVisible()
      await stableOffer.locator('.beach-offer__map-button').click()
      await expect(page.getByTestId('page-map')).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`listing=${offerId}`))

      await page.goBack()
      await expect(page.getByTestId(collection.testId)).toBeVisible()
      const returnedOffer = page.locator(`.beach-offer[data-offer-id="${offerId}"]`)
      await expect(returnedOffer).toBeVisible()
      await returnedOffer.click()
      await expect(page.getByTestId('page-listing')).toHaveAttribute('data-listing-id', offerId)
      await expectHealthyPage(page, runtime)
    }
  })

  test('Favorite selected from a collection appears in Favoris and opens the same listing', async ({ page }) => {
    const runtime = watchRuntime(page)
    await page.goto(appPath('/appartement'))
    await expect(page.getByTestId('page-apartment')).toBeVisible()
    const firstOffer = page.locator('.beach-offer').first()
    await expect(firstOffer).toBeVisible()
    const offerId = await firstOffer.getAttribute('data-offer-id')
    expect(offerId).toBeTruthy()
    const heart = firstOffer.locator('.beach-offer__heart')
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')

    await page.goto(appPath('/favorites'))
    await expect(page.getByTestId('page-favorites')).toBeVisible()
    const card = page.locator(`.favorite-card[data-favorite-id="${offerId}"]`)
    await expect(card).toBeVisible()
    await card.click()
    await expect(page.getByTestId('page-listing')).toHaveAttribute('data-listing-id', offerId)
    await expectHealthyPage(page, runtime)
  })

  test('Map → offer → listing preserves exact location and offer preview is completely static', async ({ page }) => {
    const runtime = watchRuntime(page)
    await page.goto(appPath('/map?destination=la-marsa'))
    await expect(page.getByTestId('page-map')).toBeVisible()
    const marker = page.getByTestId('map-marker-maison-jasmin')
    await expect(marker).toBeVisible()
    await marker.click()
    const popupCard = page.getByTestId('map-offer-popup-card')
    await expect(popupCard).toHaveAttribute('data-listing-id', 'maison-jasmin')
    await popupCard.click()

    const listingPage = page.getByTestId('page-listing')
    await expect(listingPage).toHaveAttribute('data-listing-id', 'maison-jasmin')
    const frame = page.locator('.listing-detail-map-frame')
    await frame.scrollIntoViewIfNeeded()
    await expect(frame).toBeVisible()
    const embeddedEngine = frame.locator('.map-engine')
    const embeddedSurface = frame.getByTestId('map-surface')
    await expect(embeddedEngine).toBeVisible()
    await expect(embeddedEngine).toHaveCSS('pointer-events', 'none')
    const before = await mapSnapshot(embeddedSurface)

    const box = await frame.boundingBox()
    expect(box).toBeTruthy()
    const x = box.x + box.width * 0.55
    const y = box.y + box.height * 0.45
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 90, y + 45, { steps: 8 })
    await page.mouse.up()
    await page.mouse.move(x, y)
    await page.mouse.wheel(0, -600)
    await page.mouse.click(x, y, { clickCount: 2, delay: 40 })
    await page.waitForTimeout(350)

    expect(await mapSnapshot(embeddedSurface)).toEqual(before)
    const cta = frame.getByRole('button', { name: 'Voir sur la carte' })
    await cta.scrollIntoViewIfNeeded()
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page.getByTestId('page-map')).toBeVisible()
    await expect(page).toHaveURL(/listing=maison-jasmin/)
    await expectHealthyPage(page, runtime)
  })

  test('Voyageur services validate and submit all supported requests', async ({ page }) => {
    const services = [
      { slug: 'chauffeur', heading: 'Chauffeur' },
      { slug: 'menage', heading: 'Ménage' },
      { slug: 'location-voiture', heading: 'Location voiture' },
    ]

    for (const service of services) {
      const runtime = watchRuntime(page)
      await page.goto(appPath(`/services/${service.slug}`))
      await expect(page.getByTestId('page-service')).toHaveAttribute('data-service', service.slug)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(service.heading)
      const date = page.locator('input[type="date"]')
      const place = page.locator('input[type="text"]')
      await date.fill('2030-01-15')
      await place.fill('Tunis Centre')
      await page.getByRole('button', { name: 'Envoyer la demande' }).click()
      await expect(page.getByRole('heading', { name: /Nous avons bien reçu votre demande/i })).toBeVisible()
      await expectHealthyPage(page, runtime)
    }
  })

  test('Protected Voyageur routes gate correctly, test login returns to Trips, and Messages becomes usable', async ({ page }) => {
    const runtime = watchRuntime(page)
    await page.goto(appPath('/trips'))
    await expect(page.getByTestId('page-auth-required')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Connexion requise' })).toBeVisible()
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByTestId('page-profile')).toBeVisible()
    await page.getByTestId('profile-test-login').click()
    await expect(page.getByTestId('page-trips')).toBeVisible()

    await page.goto(appPath('/messages'))
    await expect(page.getByTestId('page-messages')).toBeVisible()
    const search = page.getByLabel('Rechercher une conversation')
    await search.fill('zzzz-no-match')
    await expect(page.getByRole('heading', { name: 'Aucune conversation trouvée' })).toBeVisible()
    await page.getByRole('button', { name: 'Effacer la recherche' }).click()
    await expect(page.locator('.message-thread-card').first()).toBeVisible()
    await expectHealthyPage(page, runtime)
  })

  test('Direct Voyageur routes, missing service, and 404 stay recoverable', async ({ page }) => {
    const checks = [
      ['/', 'page-home'],
      ['/plage', 'page-beach'],
      ['/maison-d-hote', 'page-guesthouse'],
      ['/hotel', 'page-hotel'],
      ['/appartement', 'page-apartment'],
      ['/villa', 'page-villa'],
      ['/map', 'page-map'],
      ['/favorites', 'page-favorites'],
      ['/profile', 'page-profile'],
      ['/services/chauffeur', 'page-service'],
      ['/listing/maison-jasmin', 'page-listing'],
      ['/services/not-real', 'page-service-missing'],
      ['/definitely-not-a-route', 'page-404'],
    ]

    for (const [path, testId] of checks) {
      const runtime = watchRuntime(page)
      await page.goto(appPath(path))
      await expect(page.getByTestId(testId)).toBeVisible()
      await expectHealthyPage(page, runtime)
    }
  })
})
