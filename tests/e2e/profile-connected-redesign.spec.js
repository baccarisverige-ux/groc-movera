import { expect, test } from '@playwright/test'

const AUTH_SESSION_KEY = 'movera:auth-session:v1'

async function seedDemoSession(page) {
  await page.addInitScript(({ key }) => {
    window.localStorage.setItem(key, JSON.stringify({
      authenticated: true,
      userId: 'profile-redesign-demo',
      displayName: 'Compte test Movera',
      provider: 'demo',
      email: 'demo@movera.test',
    }))
  }, { key: AUTH_SESSION_KEY })
}

test('connected profile uses the new Movera hierarchy without duplicating the reference layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedDemoSession(page)
  await page.goto('/Movera-host1/profile')

  const profile = page.getByTestId('page-profile')
  await expect(profile).toHaveAttribute('data-auth-flow', 'connected')
  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()
  await expect(page.getByText('Compte test Movera', { exact: true })).toBeVisible()
  await expect(page.getByText('Voyageur Movera', { exact: true })).toBeVisible()
  await expect(page.getByText('demo@movera.test', { exact: true })).toBeVisible()
  await expect(page.getByText('Session Movera active', { exact: true })).toBeVisible()

  await expect(page.getByRole('button', { name: /Favoris/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Messages/ })).toBeVisible()
  await expect(page.getByTestId('switch-to-hosting')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Paramètres du compte' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aide et assistance' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confidentialité' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Informations légales' })).toBeVisible()

  const identityBox = await page.locator('.connected-profile__identity').boundingBox()
  const hostBox = await page.locator('.connected-profile__host-card').boundingBox()
  expect(identityBox).not.toBeNull()
  expect(hostBox).not.toBeNull()
  expect(identityBox.width).toBeGreaterThan(340)
  expect(hostBox.width).toBeGreaterThan(340)

  await page.getByTestId('switch-to-hosting').click()
  await expect(page.getByRole('status')).toContainText('Transition Voyageur → Hôte prête à lancer')
})

test('connected profile shortcuts and logout keep existing app behavior', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedDemoSession(page)
  await page.goto('/Movera-host1/profile')

  await page.getByRole('button', { name: /Favoris/ }).click()
  await expect(page).toHaveURL(/\/favorites$/)

  await page.goto('/Movera-host1/profile')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.getByTestId('page-profile')).toHaveAttribute('data-auth-flow', 'entry')
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), AUTH_SESSION_KEY)
  expect(stored).toBeNull()
})
