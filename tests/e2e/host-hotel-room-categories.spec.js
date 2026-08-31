import { expect, test } from '@playwright/test'

const PROFILE_KEY = 'movera:host-profiles:v1'
const CALENDAR_KEY = 'movera:host-calendar:v1'
const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const ROOM_DRAFT_KEY = 'movera:host-room-type-drafts:v1'

async function resetHost(page) {
  await page.evaluate((keys) => keys.forEach((key) => window.localStorage.removeItem(key)), [PROFILE_KEY, CALENDAR_KEY, DRAFT_KEY, ROOM_DRAFT_KEY])
}

async function next(page) {
  await page.getByRole('button', { name: 'Continuer' }).click()
}

test('hotel with different room categories uses one clear category photo screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  await resetHost(page)
  await page.reload()
  await page.getByTestId('switch-to-hosting').click()

  const onboarding = page.getByTestId('host-onboarding')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(onboarding).toHaveAttribute('data-screen', 'property-type')
  await page.getByRole('radio', { name: 'Hôtel' }).click()
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'guest-access')
  await page.getByRole('radio').first().click()
  await next(page)

  await page.getByLabel('Adresse du logement').fill('10 avenue de la Mer')
  await page.getByLabel('Ville du logement').fill('La Marsa')
  await next(page)
  await page.getByRole('button', { name: 'Confirmer cet emplacement' }).click()
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'basics')
  await page.getByRole('button', { name: 'Augmenter Nombre total de chambres' }).click()
  await page.getByRole('button', { name: 'Augmenter Nombre total de chambres' }).click()
  await page.getByRole('button', { name: /Non, il existe plusieurs catégories/ }).click()

  const categoryCards = page.locator('.host-onboarding-room-types__card')
  await expect(categoryCards).toHaveCount(2)
  await expect(page.locator('.host-room-pro-allocation')).toContainText('3/3 chambres attribuées')
  await expect(categoryCards.first()).toHaveAttribute('data-pro-collapsed', 'true')
  await categoryCards.first().getByRole('button', { name: 'Modifier' }).click()
  await expect(categoryCards.first()).toHaveAttribute('data-pro-collapsed', 'false')
  await expect(categoryCards.nth(1)).toHaveAttribute('data-pro-collapsed', 'true')

  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'intro-presentation')
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'amenities')
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'photos')
  await expect(page.getByRole('heading', { name: 'Photos de vos catégories' })).toBeVisible()
  await expect(page.locator('.host-room-pro-photos__tabs button')).toHaveCount(2)
  await expect(page.locator('.host-room-pro-gallery')).toHaveCount(1)
  await expect(page.locator('.host-onboarding__photo-uploader')).toBeHidden()
  await expect(page.locator('.host-room-photo-setup')).toBeHidden()
})
