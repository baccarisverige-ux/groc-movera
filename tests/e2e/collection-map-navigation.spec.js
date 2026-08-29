import { expect, test } from '@playwright/test'

const CASES = [
  { route: '/plage', pageTestId: 'page-beach', listingId: 'villa-perle', lat: 36.9251, lng: 10.3016 },
  { route: '/maison-d-hote', pageTestId: 'page-guesthouse', listingId: 'maison-bleue', lat: 36.8704, lng: 10.3439 },
  { route: '/appartement', pageTestId: 'page-apartment', listingId: 'res-carthage', lat: 36.8542, lng: 10.3271 },
  { route: '/villa', pageTestId: 'page-villa', listingId: 'villa-perle', lat: 36.9251, lng: 10.3016 },
]

for (const item of CASES) {
  test(`${item.route} offer opens its selected map marker`, async ({ page }) => {
    await page.goto(`/Movera-host1${item.route}`)
    await expect(page.getByTestId(item.pageTestId)).toBeVisible()

    const offer = page.locator(`.beach-offer[data-offer-id="${item.listingId}"]`)
    await expect(offer).toBeVisible()
    const mapButton = offer.locator('.beach-offer__map-button')
    await expect(mapButton).toBeVisible()
    await expect(mapButton).toContainText('Voir sur la carte')

    await mapButton.click()

    await expect(page.getByTestId('page-map')).toBeVisible()
    await expect(page.getByTestId('page-map')).toHaveAttribute('data-listing', item.listingId)
    await expect(page.getByTestId('map-engine')).toHaveAttribute('data-selected-listing-id', item.listingId)
    await expect(page).toHaveURL(new RegExp(`/map\\?listing=${item.listingId}$`))

    const surface = page.getByTestId('map-surface')
    await expect.poll(async () => Number(await surface.getAttribute('data-lat'))).toBeCloseTo(item.lat, 3)
    await expect.poll(async () => Number(await surface.getAttribute('data-lng'))).toBeCloseTo(item.lng, 3)
    await expect.poll(async () => Number(await surface.getAttribute('data-zoom'))).toBeGreaterThan(12)
  })
}
