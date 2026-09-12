import { expect, test } from '@playwright/test'

const HOST_PROFILES_KEY = 'movera:host-profiles:v1'

async function seedHost(page) {
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  await page.evaluate((key) => {
    const userId = 'movera-demo-user'
    window.localStorage.setItem(key, JSON.stringify({
      [userId]: {
        status: 'active',
        userId,
        createdAt: new Date().toISOString(),
        listing: {
          id: 'host-movera-demo-user',
          name: 'Hôtel Azur Movera',
          city: 'La Marsa',
          type: 'Hôtel',
          basePrice: 220,
          currency: 'TND',
          address: '12 rue de la Corniche',
          guests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          amenities: ['wifi', 'parking', 'ac'],
          description: 'Un établissement Movera lumineux, proche de la mer et pensé pour recevoir les voyageurs dans de bonnes conditions.',
          bookingMode: 'request-first',
          roomTypes: [
            { id: 'standard', name: 'Standard', guests: 2, beds: 1, bathrooms: 1, basePrice: 220, totalUnits: 3, photos: [] },
            { id: 'deluxe', name: 'Deluxe', guests: 2, beds: 1, bathrooms: 1, basePrice: 290, totalUnits: 2, photos: [] },
          ],
          roomInventory: { mode: 'categories', totalUnits: 5 },
          photos: [],
        },
      },
    }))
  }, HOST_PROFILES_KEY)
}

test('active host gets a complete workspace instead of being dropped directly into calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedHost(page)
  await page.goto('/groc-movera/host')

  await expect(page.getByTestId('host-workspace')).toHaveAttribute('data-view', 'dashboard')
  await expect(page.getByTestId('host-dashboard')).toContainText('Hôtel Azur Movera')
  await expect(page.getByRole('navigation', { name: 'Navigation Hôte' })).toBeVisible()

  const nav = page.getByRole('navigation', { name: 'Navigation Hôte' })

  await nav.getByRole('button', { name: 'Annonces' }).click()
  await expect(page).toHaveURL(/\/host\/listings$/)
  await expect(page.getByTestId('host-listings')).toContainText('Hôtel Azur Movera')

  /* The room inventory and the rename both moved into the editor: the
     listings screen is the Airbnb-shaped index, and editing happens one
     level down. Same two proofs, through the screens that now own them. */
  await page.getByTestId('host-listing-tile-host-movera-demo-user').click()
  await expect(page).toHaveURL(/\/host\/listings\/editor$/)
  await expect(page.getByTestId('host-editor-card-rooms')).toContainText('2 catégories')

  await page.getByTestId('host-editor-card-title').click()
  await page.locator('[data-testid="host-edit-sheet-title"] textarea').fill('Hôtel Azur Premium')
  await page.getByTestId('host-edit-save-title').click()
  await expect(page.getByTestId('host-editor-card-title')).toContainText('Hôtel Azur Premium')
  await page.getByRole('button', { name: 'Retour' }).click()
  await expect(page.getByTestId('host-listings')).toContainText('Hôtel Azur Premium')

  /* Réservations, Revenus and Réglages are one tap deeper under Menu now --
     five tabs fit a bottom bar, seven did not. */
  await nav.getByRole('button', { name: 'Menu' }).click()
  await expect(page).toHaveURL(/\/host\/menu$/)
  await page.getByTestId('host-menu-reservations').click()
  await expect(page.getByTestId('host-reservations-canonical')).toBeVisible()
  await expect(page.getByTestId('host-reservations-canonical')).toContainText('Aucune réservation')

  await nav.getByRole('button', { name: 'Menu' }).click()
  await page.getByTestId('host-menu-earnings').click()
  await expect(page.getByTestId('host-earnings')).toContainText('0 TND')
  await expect(page.getByTestId('host-earnings')).toContainText('Aucun faux versement')

  await nav.getByRole('button', { name: 'Menu' }).click()
  await page.getByTestId('host-menu-settings').click()
  await expect(page.getByTestId('host-settings')).toBeVisible()
  await page.getByLabel('Nuits minimum').fill('2')
  await page.getByRole('button', { name: 'Enregistrer les réglages' }).click()
  await expect(page.getByRole('status')).toContainText('Réglages enregistrés')

  await nav.getByRole('button', { name: 'Calendrier' }).click()
  await expect(page).toHaveURL(/\/host\/calendar$/)
  await expect(page.getByTestId('host-calendar-page')).toBeVisible()
  await expect(page.getByTestId('host-workspace-calendar')).toBeVisible()
})
