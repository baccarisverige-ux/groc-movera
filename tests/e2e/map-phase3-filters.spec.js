import { expect, test } from '@playwright/test'

async function expectDefaultFilters(page) {
  const pageMap = page.getByTestId('page-map')
  const stack = page.getByTestId('map-search-filter-stack')
  const amenities = page.getByTestId('map-amenity-filters')
  const propertyFilters = page.getByTestId('map-sheet-property-filters')

  await expect(pageMap).toHaveAttribute('data-amenity-filter-count', '0')
  await expect(pageMap).toHaveAttribute('data-discount-only', 'false')
  await expect(pageMap).toHaveAttribute('data-property-filter', 'all')
  await expect(stack).toHaveAttribute('data-active-filter-count', '0')
  await expect(amenities.locator('[data-filter-id="discount"]')).toHaveAttribute('aria-pressed', 'false')
  await expect(amenities.locator('[data-filter-id="wifi"]')).toHaveAttribute('aria-pressed', 'false')
  await expect(propertyFilters.locator('[data-property-filter="all"]')).toHaveAttribute('aria-pressed', 'true')
}

test.describe('Map phase 3 buttons and filter semantics', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('filter control is actionable even when no filter is active', async ({ page }) => {
    await page.goto('/groc-movera/map')
    await expectDefaultFilters(page)

    const control = page.getByTestId('map-filter-control')
    const rail = page.locator('#map-amenity-filter-rail')
    const firstFilter = rail.locator('[data-filter-id="discount"]')
    const offerCountBefore = await page.getByTestId('page-map').getAttribute('data-city-offer-count')

    await expect(control).toHaveAttribute('aria-label', 'Filtres')
    await rail.evaluate((node) => { node.scrollLeft = node.scrollWidth })
    await control.click()

    await expect(firstFilter).toBeFocused()
    await expect.poll(() => rail.evaluate((node) => Math.round(node.scrollLeft))).toBe(0)
    await expect(page.getByTestId('page-map')).toHaveAttribute('data-city-offer-count', offerCountBefore)
    await expectDefaultFilters(page)
  })

  test('property, amenity and promo filters share one count and one reset', async ({ page }) => {
    await page.goto('/groc-movera/map')

    const pageMap = page.getByTestId('page-map')
    const stack = page.getByTestId('map-search-filter-stack')
    const control = page.getByTestId('map-filter-control')
    const amenities = page.getByTestId('map-amenity-filters')
    const propertyFilters = page.getByTestId('map-sheet-property-filters')
    const markerLayer = page.getByTestId('map-marker-layer')
    const surface = page.getByTestId('map-surface')
    const initialZoom = Number(await surface.getAttribute('data-zoom'))

    await propertyFilters.locator('[data-property-filter="apartment"]').click()
    await expect(pageMap).toHaveAttribute('data-property-filter', 'apartment')
    await expect(stack).toHaveAttribute('data-active-filter-count', '1')
    await expect(control).toHaveAttribute('aria-label', 'Réinitialiser les filtres')
    await expect(control.locator('.map-search-filter-stack__filter-count')).toHaveText('1')

    await amenities.locator('[data-filter-id="wifi"]').click()
    await expect(pageMap).toHaveAttribute('data-amenity-filter-count', '1')
    await expect(stack).toHaveAttribute('data-active-filter-count', '2')
    await expect(control.locator('.map-search-filter-stack__filter-count')).toHaveText('2')

    await amenities.locator('[data-filter-id="discount"]').click()
    await expect(pageMap).toHaveAttribute('data-discount-only', 'true')
    await expect(stack).toHaveAttribute('data-active-filter-count', '3')
    await expect(control.locator('.map-search-filter-stack__filter-count')).toHaveText('3')

    await control.click()
    await expectDefaultFilters(page)
    await expect(control).toHaveAttribute('aria-label', 'Filtres')
    await expect(control.locator('.map-search-filter-stack__filter-count')).toHaveCount(0)
    await expect(pageMap).toHaveAttribute('data-city-offer-count', '16')
    await expect(markerLayer).toHaveAttribute('data-marker-count', '16')
    await expect.poll(async () => Number(await surface.getAttribute('data-zoom'))).toBeCloseTo(initialZoom, 4)
  })

  test('changing map context clears every filter dimension once', async ({ page }) => {
    await page.goto('/groc-movera/map')

    const pageMap = page.getByTestId('page-map')
    const amenities = page.getByTestId('map-amenity-filters')
    const propertyFilters = page.getByTestId('map-sheet-property-filters')

    await propertyFilters.locator('[data-property-filter="villa"]').click()
    await amenities.locator('[data-filter-id="wifi"]').click()
    await amenities.locator('[data-filter-id="discount"]').click()
    await expect(page.getByTestId('map-search-filter-stack')).toHaveAttribute('data-active-filter-count', '3')

    await page.evaluate(() => {
      const url = new URL(window.location.href)
      url.searchParams.set('destination', 'la-marsa')
      window.history.pushState({}, '', url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await expect(pageMap).toHaveAttribute('data-destination', 'la-marsa')
    await expectDefaultFilters(page)
    await expect(page.getByTestId('map-filter-control')).toHaveAttribute('aria-label', 'Filtres')
  })

  test('one click performs one filter toggle', async ({ page }) => {
    await page.goto('/groc-movera/map')

    const pageMap = page.getByTestId('page-map')
    const stack = page.getByTestId('map-search-filter-stack')
    const wifi = page.getByTestId('map-amenity-filters').locator('[data-filter-id="wifi"]')

    await wifi.click()
    await expect(wifi).toHaveAttribute('aria-pressed', 'true')
    await expect(pageMap).toHaveAttribute('data-amenity-filter-count', '1')
    await expect(stack).toHaveAttribute('data-active-filter-count', '1')

    await wifi.click()
    await expect(wifi).toHaveAttribute('aria-pressed', 'false')
    await expectDefaultFilters(page)
  })
})
