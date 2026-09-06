import { expect, test } from '@playwright/test'

test('deployed Map activates the Google provider and Search preview can load Google', async ({ page }) => {
  await page.goto('map')
  const engine = page.getByTestId('map-engine')
  await expect(engine).toBeVisible()
  await expect(engine).toHaveAttribute('data-map-provider', 'google', { timeout: 20_000 })
  await expect(page.getByTestId('map-google-layer')).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('.gm-style')).toHaveCount(1)

  await page.goto('./')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
  await expect(page.getByTestId('search-transition')).toBeVisible()
  const preview = page.getByTestId('search-map-preview')
  await expect(preview).toBeVisible()
  await expect(preview.getByTestId('map-google-layer')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 })
})
