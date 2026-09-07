import { expect, test } from '@playwright/test'

const SEARCH_SETTLE_TIMEOUT = 10_000

const PLACES_AUTOCOMPLETE_RESULT = {
  suggestions: [{
    placePrediction: {
      placeId: 'place-berges-lac',
      text: { text: 'Rue du Lac Turkana, Les Berges du Lac' },
      structuredFormat: {
        mainText: { text: 'Rue du Lac Turkana' },
        secondaryText: { text: 'Les Berges du Lac, Tunis' },
      },
    },
  }],
}

const PLACES_DETAILS_RESULT = {
  id: 'place-berges-lac',
  location: { latitude: 36.8421, longitude: 10.2731 },
  displayName: { text: 'Rue du Lac Turkana' },
  formattedAddress: 'Rue du Lac Turkana, Les Berges du Lac, Tunis',
  shortFormattedAddress: 'Rue du Lac Turkana, Tunis',
}

async function installAddressProviders(page) {
  const calls = { autocomplete: 0, details: 0, nominatim: 0 }

  await page.route(/places\.googleapis\.com/, async (route) => {
    const url = route.request().url()
    if (url.includes('places:autocomplete')) {
      calls.autocomplete += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PLACES_AUTOCOMPLETE_RESULT) })
      return
    }
    calls.details += 1
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PLACES_DETAILS_RESULT) })
  })

  // Any hit here is a policy regression: the public geocoder must never serve
  // the typing path again.
  await page.route(/nominatim\.openstreetmap\.org/, async (route) => {
    calls.nominatim += 1
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  return calls
}

async function openSearchAddressMode(page) {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
  const transition = page.getByTestId('search-transition')
  await expect(transition).toBeVisible()
  await expect.poll(async () => transition.getAttribute('data-ready'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('true')
  const input = page.locator('.movera-st__persistent-search input')
  await input.click()
  return { transition, input }
}

test.describe('Search address provider', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('typing suggests without geocoding, and never calls the public geocoder', async ({ page }) => {
    const calls = await installAddressProviders(page)
    const { input } = await openSearchAddressMode(page)

    await input.fill('Rue du Lac')
    await expect.poll(() => calls.autocomplete, { timeout: SEARCH_SETTLE_TIMEOUT }).toBeGreaterThan(0)

    const suggestion = page.locator('.movera-st__address-suggestion').filter({ hasText: 'Rue du Lac Turkana' }).first()
    await expect(suggestion).toBeVisible({ timeout: SEARCH_SETTLE_TIMEOUT })

    // The whole point of the migration: suggestions cost autocomplete only.
    expect(calls.details).toBe(0)
    expect(calls.nominatim).toBe(0)
  })

  test('local Movera destinations appear without any network call at all', async ({ page }) => {
    const calls = await installAddressProviders(page)
    const { input } = await openSearchAddressMode(page)

    // A local Movera address is served from bundled data, instantly.
    await input.fill('Berges')
    await expect(page.locator('.movera-st__address-suggestion').first()).toBeVisible({ timeout: SEARCH_SETTLE_TIMEOUT })
    expect(calls.details).toBe(0)
    expect(calls.nominatim).toBe(0)
  })

  test('coordinates are resolved exactly once, on selection', async ({ page }) => {
    const calls = await installAddressProviders(page)
    const { transition, input } = await openSearchAddressMode(page)

    await input.fill('Rue du Lac')
    const suggestion = page.locator('.movera-st__address-suggestion').filter({ hasText: 'Rue du Lac Turkana' }).first()
    await expect(suggestion).toBeVisible({ timeout: SEARCH_SETTLE_TIMEOUT })
    const autocompleteBeforeSelection = calls.autocomplete

    await suggestion.click()

    // One details call resolves the coordinate and closes the billing session;
    // selecting adds no further autocomplete, and nothing ever reaches Nominatim.
    await expect.poll(() => calls.details, { timeout: SEARCH_SETTLE_TIMEOUT }).toBe(1)
    expect(calls.autocomplete).toBe(autocompleteBeforeSelection)
    expect(calls.nominatim).toBe(0)

    // Advancing to dates only happens once the coordinate resolved, so this is
    // the observable proof the resolved place — not a generic fallback — won.
    await expect(page.getByTestId('search-step-dates')).toBeVisible({ timeout: SEARCH_SETTLE_TIMEOUT })
    await expect.poll(async () => transition.getAttribute('data-step')).toBe('dates')
    await expect(input).toHaveValue(/Rue du Lac Turkana/)

    // Sitting on the dates step must not trigger any further lookup.
    await page.waitForTimeout(600)
    expect(calls.details).toBe(1)
    expect(calls.nominatim).toBe(0)
  })
})
