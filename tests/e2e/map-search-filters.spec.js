import { expect, test } from '@playwright/test'

function numberAttribute(locator, name) {
  return locator.getAttribute(name).then((value) => Number(value))
}

test('amenity filters update offers and markers without moving the map', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map')

  const pageMap = page.getByTestId('page-map')
  const sheet = page.getByTestId('map-offer-sheet')
  const surface = page.getByTestId('map-surface')
  const amenityFilters = page.getByTestId('map-amenity-filters')

  await expect(page.getByTestId('map-search-filter-stack')).toBeVisible()
  await expect(page.getByTestId('map-property-filters')).toHaveCount(0)
  await expect(amenityFilters.locator('[data-filter-id="wifi"]')).toContainText('Wi‑Fi')
  await expect(amenityFilters.locator('[data-filter-id="pool"]')).toContainText('Piscine')
  await expect(amenityFilters.locator('[data-filter-id="parking"]')).toContainText('Parking')
  await expect(amenityFilters.locator('[data-filter-id="ac"]')).toContainText('Clim')
  await expect(amenityFilters.locator('[data-filter-id="tv"]')).toContainText('TV')
  await expect(amenityFilters.locator('[data-filter-id="pet"]')).toContainText('Animaux')

  await expect(pageMap).toHaveAttribute('data-city-offer-count', '16')
  const zoomBefore = await numberAttribute(surface, 'data-zoom')

  await amenityFilters.locator('[data-filter-id="tv"]').click()
  await expect(amenityFilters.locator('[data-filter-id="tv"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(pageMap).toHaveAttribute('data-city-offer-count', '16')
  expect(await numberAttribute(surface, 'data-zoom')).toBeCloseTo(zoomBefore, 4)

  await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click()
  await expect(pageMap).toHaveAttribute('data-city-offer-count', '16')

  await amenityFilters.locator('[data-filter-id="pool"]').click()
  await expect(amenityFilters.locator('[data-filter-id="pool"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(pageMap).toHaveAttribute('data-city-offer-count', '0')
  await expect(sheet).toContainText('Aucune offre Movera dans cette ville')
  await expect(sheet.locator('[data-listing-id]')).toHaveCount(0)
  expect(await numberAttribute(surface, 'data-zoom')).toBeCloseTo(zoomBefore, 4)

  await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click()
  await expect(pageMap).toHaveAttribute('data-city-offer-count', '16')
  await expect(sheet.locator('[data-listing-id]')).toHaveCount(16)
})

test('amenity filters can produce an honest empty state inside a destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const pageMap = page.getByTestId('page-map')
  const sheet = page.getByTestId('map-offer-sheet')
  const amenityFilters = page.getByTestId('map-amenity-filters')

  await expect(pageMap).toHaveAttribute('data-city-offer-count', '4')
  await amenityFilters.locator('[data-filter-id="pool"]').click()
  await expect(pageMap).toHaveAttribute('data-city-offer-count', '0')
  await expect(sheet).toContainText('Aucune offre Movera dans cette ville')
  await expect(sheet.locator('[data-listing-id]')).toHaveCount(0)
})
