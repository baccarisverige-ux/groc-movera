import { expect, test } from '@playwright/test'

const PROFILE_KEY = 'movera:host-profiles:v1'
const CALENDAR_KEY = 'movera:host-calendar:v1'
const LISTING_CALENDAR_KEY = 'movera:listing-calendar:v1'
const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const ROOM_DRAFT_KEY = 'movera:host-room-type-drafts:v1'

async function resetHost(page) {
  await page.evaluate((keys) => keys.forEach((key) => window.localStorage.removeItem(key)), [
    PROFILE_KEY,
    CALENDAR_KEY,
    LISTING_CALENDAR_KEY,
    DRAFT_KEY,
    ROOM_DRAFT_KEY,
  ])
}

async function next(page) {
  await page.getByRole('button', { name: 'Continuer' }).click()
}

async function completeHostOnboarding(page, { type, title, city }) {
  const onboarding = page.getByTestId('host-onboarding')
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(onboarding).toHaveAttribute('data-screen', 'property-type')
  await page.getByRole('radio', { name: type }).click()
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'guest-access')
  await page.getByRole('radio').first().click()
  await next(page)

  await page.getByLabel('Adresse du logement').fill('10 avenue de la Mer')
  await page.getByLabel('Ville du logement').fill(city)
  await page.evaluate(({ address, city }) => window.localStorage.setItem('movera:host-map-last-location:v1', JSON.stringify({ address, city, lat: 36.8782, lng: 10.3247, updatedAt: Date.now() })), { address: '10 avenue de la Mer', city })
  await next(page)
  await expect(page.getByTestId('host-pin-react-map')).toHaveAttribute('data-location-ready', 'true')
  await page.getByRole('button', { name: 'Confirmer cet emplacement' }).click()
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'basics')
  await expect(page.locator('.host-room-setup')).toBeVisible()
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'intro-presentation')
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'amenities')
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'photos')
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'title')
  await page.getByLabel('Titre de l’annonce').fill(title)
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'highlights')
  await page.getByRole('button', { name: 'Calme' }).click()
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'description')
  await page.getByLabel('Description du logement').fill('Un établissement lumineux, pensé pour un séjour confortable à deux pas de la mer.')
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'safety')
  await page.getByLabel('Détecteur de fumée').check()
  await next(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'intro-publish')
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'booking')
  await page.getByRole('radio', { name: /Approuver les premières réservations/ }).click()
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'price')
  await page.getByLabel('Prix par nuit').fill('240')
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'promotions')
  await next(page)
  await expect(onboarding).toHaveAttribute('data-screen', 'review')
  await page.locator('.host-onboarding__check input').nth(0).check()
  await page.locator('.host-onboarding__check input').nth(1).check()
  await page.getByRole('button', { name: 'Publier le logement' }).click()
}

async function startHost(page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  await resetHost(page)
  await page.reload()
  await page.getByTestId('switch-to-hosting').click()
}

test('published hotel offer appears on calendar, hotel collection and map', async ({ page }) => {
  await startHost(page)
  await completeHostOnboarding(page, { type: 'Hôtel', title: 'Hôtel Palmier Marsa', city: 'La Marsa' })

  const calendar = page.getByTestId('host-calendar-page')
  await expect(calendar).toBeVisible()
  await expect(calendar).toContainText('Hôtel Palmier Marsa')
  await expect(calendar).toContainText('Hôtel')
  await expect(calendar).toContainText('La Marsa')
  await expect(page.getByTestId('host-calendar-grid')).toBeVisible()

  await page.getByRole('button', { name: 'Mode Voyageur' }).click()
  await page.goto('/groc-movera/hotel')
  await expect(page.getByTestId('page-hotel')).toBeVisible()
  await expect(page.locator('[data-offer-id]').filter({ hasText: 'Hôtel Palmier Marsa' })).toHaveCount(1)

  await page.goto('/groc-movera/map')
  await expect(page.getByTestId('page-map')).toBeVisible()
  await expect(page.getByTestId('map-offer-sheet')).toContainText('Hôtel Palmier Marsa')
})

test('published maison d’hôte offer appears on calendar and collection', async ({ page }) => {
  await startHost(page)
  await completeHostOnboarding(page, { type: "Maison d’hôte", title: 'Dar Yasminbleue', city: 'La Marsa' })

  const calendar = page.getByTestId('host-calendar-page')
  await expect(calendar).toBeVisible()
  await expect(calendar).toContainText('Dar Yasminbleue')
  await expect(calendar).toContainText("Maison d’hôte")
  await expect(page.getByTestId('host-calendar-grid')).toBeVisible()

  await page.getByRole('button', { name: 'Mode Voyageur' }).click()
  await page.goto('/groc-movera/maison-d-hote')
  await expect(page.getByTestId('page-guesthouse')).toBeVisible()
  await expect(page.locator('[data-offer-id]').filter({ hasText: 'Dar Yasminbleue' })).toHaveCount(1)
})
