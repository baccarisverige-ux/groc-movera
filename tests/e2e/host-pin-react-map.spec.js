import { expect, test } from '@playwright/test'

const HOST_PROFILES_KEY = 'movera:host-profiles:v1'
const HOST_CALENDAR_KEY = 'movera:host-calendar:v1'
const HOST_DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const HOST_MAP_CACHE_KEY = 'movera:host-map-last-location:v1'

const SEARCH_RESULT = {
  place_id: 6101,
  lat: '36.8782',
  lon: '10.3247',
  display_name: '12 Rue Movera, La Marsa, Tunisie',
  type: 'residential',
  address: {
    house_number: '12',
    road: 'Rue Movera',
    city: 'La Marsa',
    postcode: '2070',
    country: 'Tunisie',
    country_code: 'tn',
  },
}

const REVERSE_RESULT = {
  place_id: 6102,
  lat: '36.8782',
  lon: '10.3247',
  display_name: '12 Rue Movera, La Marsa, Tunisie',
  address: {
    house_number: '12',
    road: 'Rue Movera',
    city: 'La Marsa',
    postcode: '2070',
    country: 'Tunisie',
    country_code: 'tn',
  },
}

async function installTunisiaGeocoding(page, { failSearch = false } = {}) {
  let searchRequests = 0
  let reverseRequests = 0

  await page.route('https://nominatim.openstreetmap.org/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/reverse')) {
      reverseRequests += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(REVERSE_RESULT),
      })
      return
    }

    searchRequests += 1
    if (failSearch) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([SEARCH_RESULT]),
    })
  })

  return {
    searchRequests: () => searchRequests,
    reverseRequests: () => reverseRequests,
  }
}

async function clearHostState(page) {
  await page.evaluate(([profilesKey, calendarKey, draftKey, mapCacheKey]) => {
    window.localStorage.removeItem(profilesKey)
    window.localStorage.removeItem(calendarKey)
    window.localStorage.removeItem(draftKey)
    window.localStorage.removeItem(mapCacheKey)
    window.localStorage.removeItem('movera:host-pin-location:v1')
  }, [HOST_PROFILES_KEY, HOST_CALENDAR_KEY, HOST_DRAFT_KEY, HOST_MAP_CACHE_KEY])
}

async function reachAddressStep(page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  await clearHostState(page)
  await page.reload()
  await page.getByTestId('switch-to-hosting').click()

  const onboarding = page.getByTestId('host-onboarding')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.getByRole('radio', { name: 'Villa' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('radio', { name: /Logement entier/ }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(onboarding).toHaveAttribute('data-screen', 'address')
  return onboarding
}

function readDraft(page) {
  return page.evaluate((draftKey) => {
    const drafts = JSON.parse(window.localStorage.getItem(draftKey) || '{}')
    return drafts['movera-demo-user'] || null
  }, HOST_DRAFT_KEY)
}

test('selected address carries exact coordinates into the pin step without a second forward geocode', async ({ page }) => {
  const geocoding = await installTunisiaGeocoding(page)
  const onboarding = await reachAddressStep(page)

  await page.getByLabel('Adresse du logement').fill('12 Rue Movera')
  await page.getByLabel('Ville du logement').fill('La Marsa')
  const suggestion = page.locator('.host-address-suggestion').first()
  await expect(suggestion).toBeVisible({ timeout: 7000 })
  await suggestion.click()

  await expect.poll(() => readDraft(page)).toMatchObject({
    address: '12 Rue Movera',
    city: 'La Marsa',
    latitude: 36.8782,
    longitude: 10.3247,
    pinConfirmed: false,
  })

  // Autocomplete may legitimately issue more than one debounced search while the
  // two address fields are being filled. Capture the count only after the user has
  // selected a concrete suggestion; the pin step itself must not add another
  // forward geocode request for the same address.
  const searchRequestsAfterSelection = geocoding.searchRequests()
  expect(searchRequestsAfterSelection).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(onboarding).toHaveAttribute('data-screen', 'pin')

  const card = page.locator('.host-onboarding__map-card')
  const reactRoot = page.getByTestId('host-pin-react-map')
  await expect(card).toHaveAttribute('data-react-map-engine', 'true')
  await expect(reactRoot).toBeVisible()
  await expect(reactRoot).toHaveAttribute('data-location-ready', 'true')
  await expect(card.locator(':scope > .host-step5-real-map')).toHaveCount(0)
  await expect(page.locator('script[data-host-leaflet]')).toHaveCount(0)

  const mapSurface = reactRoot.getByTestId('map-surface')
  await expect(mapSurface).toHaveAttribute('data-lat', '36.878200')
  await expect(mapSurface).toHaveAttribute('data-lng', '10.324700')
  await expect(mapSurface).toHaveAttribute('data-zoom', '17')
  await expect(reactRoot.getByLabel('Rechercher ou modifier l’adresse')).toHaveValue('12 Rue Movera')

  // Entering the map step must reuse the already selected coordinate instead of
  // asking Nominatim to resolve the same address again.
  await page.waitForTimeout(500)
  expect(geocoding.searchRequests()).toBe(searchRequestsAfterSelection)
  expect(geocoding.reverseRequests()).toBe(0)

  const confirm = page.getByRole('button', { name: 'Confirmer cet emplacement' })
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect.poll(async () => Boolean((await readDraft(page))?.pinConfirmed)).toBe(true)
})

test('failed automatic geocoding never turns the fallback map into a confirmed property location', async ({ page }) => {
  await installTunisiaGeocoding(page, { failSearch: true })
  const onboarding = await reachAddressStep(page)

  await page.getByLabel('Adresse du logement').fill('99 Rue Introuvable')
  await page.getByLabel('Ville du logement').fill('La Marsa')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(onboarding).toHaveAttribute('data-screen', 'pin')

  const reactRoot = page.getByTestId('host-pin-react-map')
  await expect(reactRoot).toBeVisible()
  await expect(reactRoot).toHaveAttribute('data-location-ready', 'false', { timeout: 7000 })
  await expect(reactRoot.getByLabel('Rechercher ou modifier l’adresse')).toHaveValue('99 Rue Introuvable')

  // Missing coordinates must use the visual Tunis fallback, never JavaScript's
  // Number(null) => 0 conversion and never publish that fallback into the draft.
  const mapSurface = reactRoot.getByTestId('map-surface')
  await expect(mapSurface).toHaveAttribute('data-lat', '36.806500')
  await expect(mapSurface).toHaveAttribute('data-lng', '10.181500')
  await expect(mapSurface).toHaveAttribute('data-zoom', '13')

  await expect.poll(() => readDraft(page)).toMatchObject({
    address: '99 Rue Introuvable',
    city: 'La Marsa',
    latitude: null,
    longitude: null,
    pinConfirmed: false,
  })

  const confirm = page.getByRole('button', { name: 'Confirmer cet emplacement' })
  await expect(confirm).toBeDisabled()
  await expect(page.locator('.host-onboarding__map-hint')).toContainText('Adresse non localisée automatiquement')
})
