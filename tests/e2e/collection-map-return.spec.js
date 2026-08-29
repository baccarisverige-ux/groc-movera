import { expect, test } from '@playwright/test'

test('offer map provides a return path to its category list', async ({ page }) => {
  await page.goto('/Movera-host1/plage')
  await expect(page.getByTestId('page-beach')).toBeVisible()

  const offer = page.locator('.beach-offer[data-offer-id="villa-perle"]')
  await offer.locator('.beach-offer__map-button').click()

  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retour aux offres' })).toBeVisible()

  await page.getByRole('button', { name: 'Retour aux offres' }).click()

  await expect(page.getByTestId('page-beach')).toBeVisible()
  await expect(page).toHaveURL(/\/plage$/)
})
