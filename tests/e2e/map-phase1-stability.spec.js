import { expect, test } from '@playwright/test'

async function numericAttribute(locator, name) {
  return Number(await locator.getAttribute(name))
}

test('partial viewport URL falls back to the destination instead of zero coordinates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa&zoom=13')

  const pageMap = page.getByTestId('page-map')
  const surface = page.getByTestId('map-surface')
  await expect(pageMap).toHaveAttribute('data-handoff-viewport', 'false')
  await expect.poll(() => numericAttribute(surface, 'data-lat')).toBeCloseTo(36.8782, 3)
  await expect.poll(() => numericAttribute(surface, 'data-lng')).toBeCloseTo(10.3247, 3)
})

test('same destination with a new address viewport remounts the camera context', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa&place=Point%20A&lat=36.8782&lng=10.3247&zoom=14')

  const surface = page.getByTestId('map-surface')
  await expect.poll(() => numericAttribute(surface, 'data-lat')).toBeCloseTo(36.8782, 4)
  await expect.poll(() => numericAttribute(surface, 'data-lng')).toBeCloseTo(10.3247, 4)
  await expect.poll(() => numericAttribute(surface, 'data-zoom')).toBeCloseTo(14, 3)

  await page.evaluate(() => {
    window.history.pushState({}, '', '/groc-movera/map?destination=la-marsa&place=Point%20B&lat=36.9012&lng=10.3001&zoom=15')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })

  await expect(page.getByRole('button', { name: 'Modifier la recherche' })).toContainText('Point B')
  await expect.poll(() => numericAttribute(surface, 'data-lat')).toBeCloseTo(36.9012, 4)
  await expect.poll(() => numericAttribute(surface, 'data-lng')).toBeCloseTo(10.3001, 4)
  await expect.poll(() => numericAttribute(surface, 'data-zoom')).toBeCloseTo(15, 3)
})
