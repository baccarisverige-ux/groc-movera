import { expect, test } from '@playwright/test'

test('GitHub Pages base path survives native navigation and direct routes', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByTestId('page-home')).toBeVisible()

  const mapLink = page.getByRole('link', { name: /Carte/ })
  await expect(mapLink).toHaveAttribute('href', '/groc-movera/map')

  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    mapLink.click({ modifiers: ['Control'] }),
  ])
  await newPage.waitForLoadState('domcontentloaded')
  await expect(newPage).toHaveURL(/\/groc-movera\/map$/)
  await expect(newPage.getByTestId('page-map')).toBeVisible()
  await newPage.close()

  await page.goto('map')
  await expect(page).toHaveURL(/\/groc-movera\/map$/)
  await expect(page.getByTestId('page-map')).toBeVisible()
})

test('error recovery returns to the Pages app root instead of the domain root', async ({ page }) => {
  await page.goto('./?__testError=1')
  await expect(page.getByTestId('global-error-boundary')).toBeVisible()
  await page.getByRole('button', { name: 'Retour à l’accueil' }).click()
  await expect(page).toHaveURL(/\/groc-movera\/$/)
  await expect(page.getByTestId('page-home')).toBeVisible()
})
