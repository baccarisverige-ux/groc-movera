import { expect, test } from '@playwright/test'

test('map search opens directly without a synthetic home proxy or second click', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa&search=1&place=Rue%20de%20la%20Marsa&checkin=2026-09-10&checkout=2026-09-12&adults=2&children=1&lat=36.8782&lng=10.3247&zoom=14')

  const trigger = page.getByRole('button', { name: 'Modifier la recherche' })
  await expect(trigger).toBeVisible()
  await expect(page.locator('[data-map-search-proxy]')).toHaveCount(0)

  await trigger.click()

  const transition = page.getByTestId('search-transition')
  await expect(transition).toBeVisible()
  await expect(transition).toHaveAttribute('data-map-origin', 'true')
  await expect(page.locator('.movera-st__persistent-search input')).toHaveValue('Rue de la Marsa')
  await expect(page.locator('[data-map-search-proxy]')).toHaveCount(0)
})
