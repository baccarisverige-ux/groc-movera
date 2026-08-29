import { expect, test } from '@playwright/test'

const AUTH_SESSION_KEY = 'movera:auth-session:v1'

test('demo login creates a real local auth session for rapid host testing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/Movera-host1/profile')

  const testLogin = page.getByRole('button', { name: 'Connexion test' })
  await expect(testLogin).toBeVisible()
  await testLogin.click()

  await expect(page.getByText('Session Movera active')).toBeVisible()

  const session = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), AUTH_SESSION_KEY)
  expect(session.authenticated).toBe(true)
  expect(session.provider).toBe('demo')
  expect(session.userId).toBe('movera-demo-user')
  expect(session.email).toBe('demo@movera.test')
})

test('demo login preserves protected returnTo navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/Movera-host1/profile?returnTo=%2Fmessages')

  await page.getByRole('button', { name: 'Connexion test' }).click()
  await expect(page).toHaveURL(/\/Movera-host1\/messages$/)
  await expect(page.getByTestId('page-messages')).toBeVisible()
})
