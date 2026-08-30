import { expect, test } from '@playwright/test'

test('map popup stays closed on initial /map load', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map')

  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.getByTestId('page-map')).toHaveAttribute('data-offer-popup', 'closed')
  await expect(page.getByTestId('map-offer-popup')).toHaveCount(0)
  await expect(page.getByTestId('map-offer-sheet')).toHaveAttribute('data-snap-state', 'collapsed')
})

test('pin select shows popup; peek changes selected listing; close hides it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const pageMap = page.getByTestId('page-map')
  const popup = page.getByTestId('map-offer-popup')
  const engine = page.getByTestId('map-engine')

  await expect(pageMap).toHaveAttribute('data-city-offer-count', '4')
  await expect(popup).toHaveCount(0)

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

  await page.getByTestId('map-offer-popup-peek').click({ position: { x: 12, y: 90 }, force: true })
  await expect(popup).not.toHaveAttribute('data-listing-id', 'maison-jasmin')
  const nextId = await popup.getAttribute('data-listing-id')
  expect(nextId).toBeTruthy()
  await expect(engine).toHaveAttribute('data-selected-listing-id', nextId)
  await expect(page.getByTestId(`map-marker-${nextId}`)).toHaveAttribute('data-marker-state', 'selected')

  await page.getByTestId('map-offer-popup-close').click()
  await expect(popup).toHaveCount(0)
  await expect(pageMap).toHaveAttribute('data-offer-popup', 'closed')
  await expect(engine).toHaveAttribute('data-selected-listing-id', '')
})
