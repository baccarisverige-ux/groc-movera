import { expect, test } from '@playwright/test'

const AUTH_SESSION_KEY = 'movera:auth-session:v1'
const AUTH_USERS_KEY = 'movera:auth-users:v1'

async function openEmailAuth(page) {
  await page.getByRole('button', { name: 'Continuer avec une adresse e-mail' }).click()
  await expect(page.getByRole('tab', { name: 'Se connecter' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Créer un compte' })).toBeVisible()
}

async function createEmailAccount(page, { name, email, password }) {
  await page.getByRole('tab', { name: 'Créer un compte' }).click()
  await page.getByLabel('Nom complet').fill(name)
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByLabel('Confirmer le mot de passe').fill(password)
  await page.locator('.profile-terms input').check()
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByTestId('page-profile')).toHaveAttribute('data-auth-flow', 'verify-signup')
  const code = await page.locator('.profile-demo-code strong').innerText()
  await page.getByLabel('Code de vérification').fill(code.trim())
  await page.getByRole('button', { name: 'Vérifier et continuer' }).click()
}

async function createPhoneAccount(page, { name, phone, password }) {
  await page.getByRole('tab', { name: 'Créer un compte' }).click()
  await page.getByRole('tab', { name: 'Téléphone' }).click()
  await page.getByLabel('Nom complet').fill(name)
  await page.getByLabel('Numéro de téléphone').fill(phone)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByLabel('Confirmer le mot de passe').fill(password)
  await page.locator('.profile-terms input').check()
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  const code = await page.locator('.profile-demo-code strong').innerText()
  await page.getByLabel('Code de vérification').fill(code.trim())
  await page.getByRole('button', { name: 'Vérifier et continuer' }).click()
}

test('profile starts with Apple Google and email as three equal entry options', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')

  await expect(page.getByTestId('page-profile')).toHaveAttribute('data-auth-flow', 'entry')
  await expect(page.getByRole('button', { name: 'Continuer avec Apple' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer avec Google' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer avec une adresse e-mail' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Se connecter' })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Créer un compte' })).toHaveCount(0)

  await openEmailAuth(page)
  await expect(page.getByLabel('Adresse e-mail')).toBeVisible()
})

test('guest must create and verify an account before signing in to protected messages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/messages')
  await expect(page.getByTestId('page-auth-required')).toBeVisible()
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page.getByTestId('page-profile')).toBeVisible()
  await expect(page).toHaveURL(/\/profile\?returnTo=%2Fmessages$/)
  await openEmailAuth(page)

  await page.getByLabel('Adresse e-mail').fill('voyageur@movera.tn')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Movera123')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Aucun compte trouvé')
  await expect(page.getByTestId('page-messages')).toHaveCount(0)

  await createEmailAccount(page, { name: 'Voyageur Movera', email: 'voyageur@movera.tn', password: 'Movera123' })
  await expect(page.getByTestId('page-messages')).toBeVisible()
  await expect(page).toHaveURL(/\/messages$/)

  const session = await page.evaluate((key) => window.localStorage.getItem(key), AUTH_SESSION_KEY)
  const users = await page.evaluate((key) => window.localStorage.getItem(key), AUTH_USERS_KEY)
  expect(session).toContain('voyageur@movera.tn')
  expect(session).not.toContain('Movera123')
  expect(users).toContain('passwordHash')
  expect(users).not.toContain('Movera123')

  await page.locator('.app-shell__nav-item', { hasText: 'Profil' }).click()
  await expect(page.getByText('Session Movera active')).toBeVisible()
  await page.getByRole('button', { name: 'Se déconnecter' }).click()

  const nav = page.locator('.app-shell--guest > .app-shell__nav')
  await expect(nav.locator('.app-shell__nav-item', { hasText: 'Messages' })).toHaveAttribute('aria-disabled', 'true')
  await openEmailAuth(page)

  await page.getByLabel('Adresse e-mail').fill('voyageur@movera.tn')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Movera123')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByText('Session Movera active')).toBeVisible()
  await expect(nav.locator('.app-shell__nav-item', { hasText: 'Messages' })).not.toHaveAttribute('aria-disabled', 'true')
})

test('phone account remains available inside standard account flow and supports password recovery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await openEmailAuth(page)

  await createPhoneAccount(page, { name: 'Client Movera', phone: '+216 20 123 456', password: 'Oldpass7' })
  await expect(page.getByText('Session Movera active')).toBeVisible()
  await page.getByRole('button', { name: 'Se déconnecter' }).click()

  await openEmailAuth(page)
  await page.getByRole('button', { name: 'Mot de passe oublié ?' }).click()
  await page.getByRole('tab', { name: 'Téléphone' }).click()
  await page.getByLabel('Numéro de téléphone').fill('+216 20 123 456')
  await page.getByRole('button', { name: 'Recevoir un code' }).click()
  await expect(page.getByTestId('page-profile')).toHaveAttribute('data-auth-flow', 'verify-reset')

  const code = await page.locator('.profile-demo-code strong').innerText()
  await page.getByLabel('Code de récupération').fill(code.trim())
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await expect(page.getByTestId('page-profile')).toHaveAttribute('data-auth-flow', 'new-password')

  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('Newpass8')
  await page.getByLabel('Confirmer le nouveau mot de passe').fill('Newpass8')
  await page.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }).click()
  await expect(page.getByRole('status')).toContainText('Mot de passe modifié')

  await page.getByRole('tab', { name: 'Téléphone' }).click()
  await page.getByLabel('Numéro de téléphone').fill('+216 20 123 456')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Oldpass7')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Mot de passe incorrect')

  await page.getByLabel('Mot de passe', { exact: true }).fill('Newpass8')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByText('Session Movera active')).toBeVisible()
  await expect(page.getByText('+21620123456')).toBeVisible()
})

test('Apple and Google remain explicit until OAuth endpoints are configured', async ({ page }) => {
  await page.goto('/groc-movera/profile')
  await page.getByRole('button', { name: 'Continuer avec Apple' }).click()
  await expect(page.getByRole('status')).toContainText('Apple non configurée')
  await page.getByRole('button', { name: 'Continuer avec Google' }).click()
  await expect(page.getByRole('status')).toContainText('Google non configurée')
})
