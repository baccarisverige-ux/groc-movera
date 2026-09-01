import { expect, test } from '@playwright/test'

function numberAttribute(locator, name) {
  return locator.getAttribute(name).then((value) => Number(value))
}

test('map popup stays closed on initial /map load', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map')

  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.getByTestId('page-map')).toHaveAttribute('data-offer-popup', 'closed')
  await expect(page.getByTestId('map-offer-popup')).toHaveCount(0)
  await expect(page.getByTestId('map-offer-sheet')).toHaveAttribute('data-snap-state', 'collapsed')
})

test('pin select shows popup; next rail changes selected listing; close hides it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const pageMap = page.getByTestId('page-map')
  const popup = page.getByTestId('map-offer-popup')
  const engine = page.getByTestId('map-engine')
  const surface = page.getByTestId('map-surface')
  const searchPill = page.locator('.map-search-filter-stack__search-pill')
  const amenityFilters = page.getByTestId('map-amenity-filters')
  const filterStack = page.getByTestId('map-search-filter-stack')

  await expect(pageMap).toHaveAttribute('data-city-offer-count', '4')
  await expect(popup).toHaveCount(0)
  await expect(searchPill).toBeVisible()
  await expect(searchPill).toContainText('Logements à La Marsa')
  await expect(amenityFilters).toBeVisible()

  const zoomBefore = await numberAttribute(surface, 'data-zoom')
  const marker = page.getByTestId('map-marker-maison-jasmin')
  await expect(marker).toBeVisible()
  await marker.click()

  await expect(popup).toBeVisible()
  await expect(pageMap).toHaveAttribute('data-offer-popup', 'open')
  await expect(popup).toHaveAttribute('data-listing-id', 'maison-jasmin')
  await expect(engine).toHaveAttribute('data-selected-listing-id', 'maison-jasmin')
  await expect(popup.getByTestId('map-offer-popup-card')).toContainText('Maison Jasmin')
  await expect(popup.getByTestId('map-offer-popup-card').locator('.map-offer-popup__price')).toContainText('TND')
  await expect(popup).not.toContainText('Guest favourite')
  await expect(popup).not.toContainText('€')
  expect(await numberAttribute(surface, 'data-zoom')).toBeCloseTo(zoomBefore, 4)

  await expect(filterStack).toHaveAttribute('data-compact', 'true')
  await expect(searchPill).not.toBeVisible()
  await expect(amenityFilters).toBeVisible()
  await expect(amenityFilters.locator('[data-filter-id="wifi"]')).toBeVisible()
  await expect(amenityFilters.locator('[data-filter-id="pool"]')).toBeVisible()

  await expect.poll(async () => {
    const markerBox = await page.getByTestId('map-marker-maison-jasmin').boundingBox()
    const popupBox = await popup.boundingBox()
    if (!markerBox || !popupBox) return false
    return markerBox.y + markerBox.height < popupBox.y
  }).toBe(true)
  expect(await numberAttribute(surface, 'data-zoom')).toBeCloseTo(zoomBefore, 4)

  const nextOffer = page.getByTestId('map-offer-popup-next')
  await expect(nextOffer).toBeVisible()
  await nextOffer.click()
  await expect(popup).not.toHaveAttribute('data-listing-id', 'maison-jasmin')
  const nextId = await popup.getAttribute('data-listing-id')
  expect(nextId).toBeTruthy()
  await expect(engine).toHaveAttribute('data-selected-listing-id', nextId)
  await expect(page.getByTestId(`map-marker-${nextId}`)).toHaveAttribute('data-marker-state', 'selected')
  expect(await numberAttribute(surface, 'data-zoom')).toBeCloseTo(zoomBefore, 4)

  await expect.poll(async () => {
    const markerBox = await page.getByTestId(`map-marker-${nextId}`).boundingBox()
    const popupBox = await popup.boundingBox()
    if (!markerBox || !popupBox) return false
    return markerBox.y + markerBox.height < popupBox.y
  }).toBe(true)

  await page.getByTestId('map-offer-popup-close').click()
  await expect(popup).toHaveCount(0)
  await expect(pageMap).toHaveAttribute('data-offer-popup', 'closed')
  await expect(engine).toHaveAttribute('data-selected-listing-id', '')
  await expect(filterStack).toHaveAttribute('data-compact', 'false')
  await expect(searchPill).toBeVisible()
  await expect(searchPill).toContainText('Logements à La Marsa')
  await expect(amenityFilters).toBeVisible()
})
