import { expect, test } from '@playwright/test'

const AUTH_SESSION_KEY = 'movera:auth-session:v1'

test('messages stays locked for guests including direct route access', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const nav = page.locator('.app-shell--guest > .app-shell__nav')
  const messagesNav = nav.locator('.app-shell__nav-item', { hasText: 'Messages' })
  await expect(messagesNav).toHaveAttribute('aria-disabled', 'true')

  const beforeClick = page.url()
  await messagesNav.click()
  await expect(page).toHaveURL(beforeClick)

  await page.goto('/Movera-host1/messages')
  await expect(page.getByTestId('page-auth-required')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion requise' })).toBeVisible()
  await expect(page.getByTestId('page-messages')).toHaveCount(0)
})

test('authenticated session unlocks premium inbox and conversation flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(({ key }) => {
    window.localStorage.setItem(key, JSON.stringify({ authenticated: true, userId: 'e2e-user', displayName: 'Movera Guest' }))
  }, { key: AUTH_SESSION_KEY })
  await page.goto('/')

  const nav = page.locator('.app-shell--guest > .app-shell__nav')
  const messagesNav = nav.locator('.app-shell__nav-item', { hasText: 'Messages' })
  await expect(messagesNav).not.toHaveAttribute('aria-disabled', 'true')
  await messagesNav.click()

  await expect(page.getByTestId('page-messages')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible()
  await expect(page.locator('[data-motion-list="messages"]')).toBeVisible()
  await expect(page.locator('.message-thread-card')).toHaveCount(3)
  await expect(nav.locator('.app-shell__nav-item[data-active="true"] span')).toHaveText('Messages')

  await page.locator('.message-thread-card[data-thread-id="imen-marsa"]').click()
  await expect(page.getByTestId('page-message-thread')).toBeVisible()
  await expect(page.getByTestId('page-message-thread')).toHaveAttribute('data-thread-id', 'imen-marsa')
  await expect(nav.locator('.app-shell__nav-item[data-active="true"] span')).toHaveText('Messages')

  const composer = page.getByLabel('Écrire un message')
  await composer.fill('Merci, à bientôt.')
  await page.getByRole('button', { name: 'Envoyer le message' }).click()
  await expect(page.locator('.message-bubble-row--guest').last()).toContainText('Merci, à bientôt.')

  await page.getByRole('button', { name: 'Retour aux messages' }).click()
  await expect(page.getByTestId('page-messages')).toBeVisible()
  await expect(page.locator('[data-motion-list="messages"]')).toBeVisible()
})
