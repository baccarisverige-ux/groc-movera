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
  /* The Today screen names the listing through b225's property bar. Without
     it a host with a quiet week reads a screen with nothing on it to say
     which listing it is reporting on. */
  await expect(page.getByTestId('host-property-bar')).toContainText('Hôtel Azur Movera')
  await expect(page.getByRole('navigation', { name: 'Navigation Hôte' })).toBeVisible()

  const nav = page.getByRole('navigation', { name: 'Navigation Hôte' })

  await nav.getByRole('button', { name: 'Annonces' }).click()
  await expect(page).toHaveURL(/\/host\/listings$/)
  await expect(page.getByTestId('host-listings')).toContainText('Hôtel Azur Movera')

  /* The room inventory and the rename both moved into the editor: the
     listings screen is b225's card index, and editing happens one level
     down. Same two proofs, through the screens that now own them. */
  await page.getByTestId('host-listing-card-host-movera-demo-user').click()
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
  await expect(page.getByTestId('host-earnings')).toContainText('Aucun versement n’est simulé')

  /* b225 edits a setting on its own page: the card shows the value, tapping
     it opens one big number, saving returns to the list with the new value
     on the card. Both halves are asserted because the pair is where a field
     read from one branch of the draft and written to another goes unnoticed. */
  await nav.getByRole('button', { name: 'Menu' }).click()
  await page.getByTestId('host-menu-settings').click()
  await expect(page.getByTestId('host-listing-settings')).toBeVisible()
  await page.getByRole('tab', { name: 'Dispo.' }).click()
  await page.getByTestId('host-settings-min-nights').click()
  await expect(page.getByTestId('host-settings-edit')).toBeVisible()
  await page.getByRole('textbox', { name: 'Nuits minimum' }).fill('4')
  await page.getByTestId('host-settings-edit-save').click()
  await expect(page.getByTestId('host-settings-min-nights')).toContainText('4')
  await page.getByTestId('host-settings-save').click()
  await expect(page.getByTestId('host-listing-settings')).toBeHidden()

  await nav.getByRole('button', { name: 'Calendrier' }).click()
  await expect(page).toHaveURL(/\/host\/calendar$/)
  await expect(page.getByTestId('host-calendar-page')).toBeVisible()
  await expect(page.getByTestId('host-workspace-calendar')).toBeVisible()
})
