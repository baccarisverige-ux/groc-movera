import { expect, test } from '@playwright/test'

const PROFILE_KEY = 'movera:host-profiles:v1'
const CALENDAR_KEY = 'movera:host-calendar:v1'
const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const ROOM_DRAFT_KEY = 'movera:host-room-type-drafts:v1'
const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8xQAAAAASUVORK5CYII=', 'base64')

function photoFiles(prefix, count = 5) {
  return Array.from({ length: count }, (_, index) => ({
    name: `${prefix}-${index + 1}.png`,
    mimeType: 'image/png',
    buffer: TINY_PNG,
  }))
}

async function resetHost(page) {
  await page.evaluate((keys) => keys.forEach((key) => window.localStorage.removeItem(key)), [PROFILE_KEY, CALENDAR_KEY, DRAFT_KEY, ROOM_DRAFT_KEY])
}

async function next(page) {
  await page.getByRole('button', { name: 'Continuer' }).click()
}

async function reachBasicsAfterLocation(page, onboarding) {
  await page.getByLabel('Adresse du logement').fill('10 avenue de la Mer')
  await page.getByLabel('Ville du logement').fill('La Marsa')
  await page.evaluate(() => window.localStorage.setItem('movera:host-map-last-location:v1', JSON.stringify({ address: '10 avenue de la Mer', city: 'La Marsa', lat: 36.8782, lng: 10.3247, updatedAt: Date.now() })))
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'pin')
  await expect(page.getByTestId('host-pin-react-map')).toHaveAttribute('data-location-ready', 'true')
  await page.getByRole('button', { name: 'Confirmer cet emplacement' }).click()
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'basics')
}

test('hotel offers room-level reservation choices only before room categories', async ({ page }) => {
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
  await expect(page.getByRole('heading', { name: 'Que réservent vos voyageurs ?' })).toBeVisible()
  const hospitality = page.getByTestId('host-hospitality-access')
  await expect(hospitality).toContainText('Hôtel')
  await expect(hospitality).toContainText('Configuration professionnelle')
  await expect(page.getByRole('radio', { name: /Chambre entière/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: /Chambre partagée/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Tout l’établissement/ })).toHaveCount(0)
  await expect(hospitality).not.toContainText('Un seul groupe')
  await next(page)

  await reachBasicsAfterLocation(page, onboarding)
  await expect(page.getByRole('heading', { name: 'Configurez vos chambres' })).toBeVisible()
  await expect(page.getByText('Capacité d’une chambre', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Augmenter Chambres' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Augmenter Nombre total de chambres' })).toBeVisible()

  await page.getByRole('button', { name: 'Augmenter Nombre total de chambres' }).click()
  await page.getByRole('button', { name: 'Augmenter Nombre total de chambres' }).click()
  await page.getByRole('button', { name: /Non, il existe plusieurs catégories/ }).click()
  await expect(page.locator('.host-onboarding__counter-card')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Configurez vos catégories de chambres' })).toBeVisible()

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
  const photoTabs = page.locator('.host-room-pro-photos__tabs button')
  await expect(photoTabs).toHaveCount(2)
  await expect(photoTabs.first()).toContainText('0/20 photos · min. 5')
  await expect(photoTabs.nth(1)).toContainText('0/20 photos · min. 5')
  await expect(photoTabs.first()).toHaveAttribute('data-photos-valid', 'false')
  await expect(photoTabs.nth(1)).toHaveAttribute('data-photos-valid', 'false')

  const gallery = page.locator('.host-room-pro-gallery')
  await expect(gallery).toHaveCount(1)
  await expect(gallery.locator('.host-room-pro-gallery__requirement')).toContainText('Minimum 5 photos · maximum 20')
  await expect(gallery.locator('.host-room-pro-gallery__requirement')).toContainText('5 photos à ajouter · 0/20')
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled()

  const photoInput = gallery.locator('input[type="file"]')
  await expect(photoInput).toHaveAttribute('data-min-photos', '5')
  await expect(photoInput).toHaveAttribute('data-max-photos', '20')
  await photoInput.setInputFiles(photoFiles('category-1'))
  await expect(photoTabs.first()).toContainText('5/20 photos · min. 5')
  await expect(photoTabs.first()).toHaveAttribute('data-photos-valid', 'true')
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled()

  await photoTabs.nth(1).click()
  await expect(photoTabs.nth(1)).toHaveAttribute('data-active', 'true')
  await gallery.locator('input[type="file"]').setInputFiles(photoFiles('category-2'))
  await expect(photoTabs.nth(1)).toContainText('5/20 photos · min. 5')
  await expect(photoTabs.nth(1)).toHaveAttribute('data-photos-valid', 'true')
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeEnabled()

  const roomDraftRaw = await page.evaluate((key) => window.localStorage.getItem(key) || '', ROOM_DRAFT_KEY)
  expect(roomDraftRaw).not.toContain('data:image')
  expect(roomDraftRaw).toContain('host-photo:')

  await expect(page.locator('.host-onboarding__photo-uploader')).toBeHidden()
  await expect(page.locator('.host-room-photo-setup')).toHaveCount(0)
})

test('guest house whole-establishment mode keeps a normal whole-property basics page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  await resetHost(page)
  await page.reload()
  await page.getByTestId('switch-to-hosting').click()

  const onboarding = page.getByTestId('host-onboarding')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.getByRole('radio', { name: 'Maison d’hôte' }).click()
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'guest-access')
  const hospitality = page.getByTestId('host-hospitality-access')
  await expect(hospitality).toContainText('Maison d’hôte')
  await expect(page.getByRole('radio', { name: /Chambre entière/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: /Chambre partagée/ })).toBeVisible()
  const entire = page.getByRole('radio', { name: /Tout l’établissement/ })
  await expect(entire).toBeVisible()
  await entire.click()
  await expect(entire).toHaveAttribute('aria-checked', 'true')
  await next(page)

  await reachBasicsAfterLocation(page, onboarding)
  await expect(page.getByRole('heading', { name: 'Informations de base' })).toBeVisible()
  await expect(page.locator('.host-room-setup')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Augmenter Chambres' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Augmenter Nombre total de chambres' })).toHaveCount(0)
})
