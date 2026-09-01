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

  await page.getByRole('navigation', { name: 'Navigation Hôte' }).getByRole('button', { name: 'Annonce' }).click()
  await expect(page).toHaveURL(/\/host\/listings$/)
  await expect(page.getByTestId('host-listings')).toContainText('2 catégories')

  await page.getByTestId('host-listings').getByRole('button', { name: 'Modifier', exact: true }).click()
  await page.getByLabel('Titre').fill('Hôtel Azur Premium')
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(page.getByTestId('host-listings')).toContainText('Hôtel Azur Premium')

  await page.getByRole('navigation', { name: 'Navigation Hôte' }).getByRole('button', { name: 'Réservations' }).click()
  await expect(page.getByTestId('host-reservations-canonical')).toBeVisible()
  await expect(page.getByTestId('host-reservations-canonical')).toContainText('Aucune réservation')

  await page.getByRole('navigation', { name: 'Navigation Hôte' }).getByRole('button', { name: 'Revenus' }).click()
  await expect(page.getByTestId('host-earnings')).toContainText('0 TND')
  await expect(page.getByTestId('host-earnings')).toContainText('Aucun faux versement')

  await page.getByRole('navigation', { name: 'Navigation Hôte' }).getByRole('button', { name: 'Réglages' }).click()
  await expect(page.getByTestId('host-settings')).toBeVisible()
  await page.getByLabel('Nuits minimum').fill('2')
  await page.getByRole('button', { name: 'Enregistrer les réglages' }).click()
  await expect(page.getByRole('status')).toContainText('Réglages enregistrés')

  await page.getByRole('navigation', { name: 'Navigation Hôte' }).getByRole('button', { name: 'Calendrier' }).click()
  await expect(page).toHaveURL(/\/host\/calendar$/)
  await expect(page.getByTestId('host-calendar-page')).toBeVisible()
  await expect(page.getByTestId('host-workspace-calendar')).toBeVisible()
})
