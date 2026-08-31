import { expect, test } from '@playwright/test'

const HOST_PROFILES_KEY = 'movera:host-profiles:v1'
const HOST_CALENDAR_KEY = 'movera:host-calendar:v1'
const HOST_DRAFT_KEY = 'movera:host-onboarding-drafts:v1'

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

async function mockTunisiaGeocoding(page) {
  await page.route('https://nominatim.openstreetmap.org/**', async (route) => {
    const url = new URL(route.request().url())
    const payload = url.pathname.endsWith('/reverse') ? REVERSE_RESULT : [SEARCH_RESULT]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

async function clearHostState(page) {
  await page.evaluate(([profilesKey, calendarKey, draftKey]) => {
    window.localStorage.removeItem(profilesKey)
    window.localStorage.removeItem(calendarKey)
    window.localStorage.removeItem(draftKey)
  }, [HOST_PROFILES_KEY, HOST_CALENDAR_KEY, HOST_DRAFT_KEY])
}

async function reachPinStep(page, { mode = '' } = {}) {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockTunisiaGeocoding(page)
  const query = mode ? `?hostMap=${encodeURIComponent(mode)}` : ''
  await page.goto(`/groc-movera/profile${query}`)
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
  await page.getByLabel('Adresse du logement').fill('12 Rue Movera')
  await page.getByLabel('Ville du logement').fill('La Marsa')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(onboarding).toHaveAttribute('data-screen', 'pin')
  return onboarding
}

test('normal host onboarding mounts the React map path and keeps Leaflet hidden underneath', async ({ page }) => {
  await reachPinStep(page)

  const card = page.locator('.host-onboarding__map-card')
  const reactRoot = page.getByTestId('host-pin-react-map')
  await expect(card).toHaveAttribute('data-react-map-engine', 'true')
  await expect(reactRoot).toBeVisible()
  await expect(reactRoot.getByTestId('map-engine')).toBeVisible()

  const directLegacySurface = card.locator(':scope > .host-step5-real-map')
  if (await directLegacySurface.count()) await expect(directLegacySurface).toBeHidden()
})

test('explicit legacy rollback keeps the proven Leaflet path available', async ({ page }) => {
  await reachPinStep(page, { mode: 'legacy' })
  await expect(page.getByTestId('host-pin-react-map')).toHaveCount(0)
  await expect(page.locator('.host-onboarding__map-card')).not.toHaveAttribute('data-react-map-engine', 'true')
})

test('default React host pin synchronizes detected location to the draft', async ({ page }) => {
  await reachPinStep(page)

  const reactRoot = page.getByTestId('host-pin-react-map')
  const searchInput = reactRoot.getByLabel('Rechercher ou modifier l’adresse')
  await searchInput.fill('12 Rue Movera, La Marsa')
  await reactRoot.getByRole('button', { name: 'Rechercher cette adresse' }).click()

  await expect(searchInput).toHaveValue('12 Rue Movera')
  const mapSurface = reactRoot.getByTestId('map-surface')
  await expect(mapSurface).toHaveAttribute('data-lat', '36.878200')
  await expect(mapSurface).toHaveAttribute('data-lng', '10.324700')
  await expect(mapSurface).toHaveAttribute('data-zoom', '17')
  await expect(mapSurface.locator('xpath=..')).toHaveAttribute('data-map-provider', /^(google|fallback|google-loading)$/)

  await expect.poll(async () => page.evaluate((draftKey) => {
    const drafts = JSON.parse(window.localStorage.getItem(draftKey) || '{}')
    return drafts['movera-demo-user'] || null
  }, HOST_DRAFT_KEY)).toMatchObject({
    address: '12 Rue Movera',
    city: 'La Marsa',
    latitude: 36.8782,
    longitude: 10.3247,
    pinConfirmed: false,
  })

  await page.getByRole('button', { name: 'Confirmer cet emplacement' }).click()
  await expect.poll(async () => page.evaluate((draftKey) => {
    const drafts = JSON.parse(window.localStorage.getItem(draftKey) || '{}')
    return Boolean(drafts['movera-demo-user']?.pinConfirmed)
  }, HOST_DRAFT_KEY)).toBe(true)
})
