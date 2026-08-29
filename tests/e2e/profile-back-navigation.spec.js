import { expect, test } from '@playwright/test'

test('standard email and phone auth always exposes a clear return arrow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/Movera-host1/profile')

  await page.getByRole('button', { name: 'Continuer avec une adresse e-mail' }).click()

  const back = page.getByRole('button', { name: 'Retour aux options de connexion' })
  await expect(back).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Se connecter' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Créer un compte' })).toBeVisible()

  await page.getByRole('tab', { name: 'Téléphone' }).click()
  await expect(back).toBeVisible()
  await expect(page.getByLabel('Numéro de téléphone')).toBeVisible()

  await back.click()
  await expect(page.getByTestId('page-profile')).toHaveAttribute('data-auth-flow', 'entry')
  await expect(page.getByRole('button', { name: 'Continuer avec Apple' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer avec Google' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer avec une adresse e-mail' })).toBeVisible()
})
