import { expect, test } from '@playwright/test'

const AUTH_SESSION_KEY = 'movera:auth-session:v1'
const HOST_PROFILES_KEY = 'movera:host-profiles:v1'
const LISTING_CALENDAR_KEY = 'movera:listing-calendar:v1'
const RESERVATIONS_KEY = 'movera:reservations:v1'

const HOST_USER_ID = 'host-flow-owner'
const GUEST_USER_ID = 'guest-flow-user'
const LISTING_ID = 'host-flow-listing'

async function seedHostAndGuest(page) {
  await page.goto('/groc-movera/')
  await page.evaluate(({ authKey, profilesKey, calendarKey, hostUserId, guestUserId, listingId }) => {
    window.localStorage.clear()
    window.localStorage.setItem(authKey, JSON.stringify({
      authenticated: true,
      userId: guestUserId,
      displayName: 'Voyageur Flow',
      provider: 'demo',
      email: 'guest-flow@movera.test',
      phone: '',
    }))
    window.localStorage.setItem(profilesKey, JSON.stringify({
      [hostUserId]: {
        status: 'active',
        userId: hostUserId,
        createdAt: '2026-08-01T12:00:00.000Z',
        listing: {
          id: listingId,
          name: 'Villa Flow Movera',
          city: 'La Marsa',
          type: 'Villa',
          basePrice: 240,
          currency: 'TND',
          address: '1 rue Flow',
          latitude: 36.8789,
          longitude: 10.3247,
          guestAccess: 'entire',
          guests: 4,
          bedrooms: 2,
          beds: 3,
          bathrooms: 2,
          amenities: ['wifi', 'parking'],
          highlights: [],
          description: 'Une villa créée par un hôte pour vérifier la cohérence complète des données Movera.',
          bookingMode: 'request-first',
          promotions: [],
          safety: { smokeAlarm: true, carbonMonoxideAlarm: false, exteriorCamera: false, noiseMonitor: false, weapons: false },
          stayRules: { minNights: 1, maxNights: 365, advanceNoticeDays: 0, preparationDays: 0, checkInFrom: '15:00', checkOutUntil: '11:00', petsAllowed: false, smokingAllowed: false, eventsAllowed: false },
          roomTypes: [],
          roomInventory: { mode: 'single', totalUnits: 1 },
          photos: [],
        },
      },
    }))
    window.localStorage.setItem(calendarKey, JSON.stringify({
      [listingId]: { userId: hostUserId, days: {} },
    }))
  }, {
    authKey: AUTH_SESSION_KEY,
    profilesKey: HOST_PROFILES_KEY,
    calendarKey: LISTING_CALENDAR_KEY,
    hostUserId: HOST_USER_ID,
    guestUserId: GUEST_USER_ID,
    listingId: LISTING_ID,
  })
}

test('traveler request becomes host reservation, confirmation blocks traveler availability, cancellation releases it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedHostAndGuest(page)
  await page.goto(`/groc-movera/listing/${LISTING_ID}`)

  await expect(page.getByTestId('page-listing')).toHaveAttribute('data-origin', 'host')
  await expect(page.getByTestId('page-listing')).toContainText('Villa Flow Movera')
  await expect(page.getByTestId('page-listing')).toContainText('Nouvelle annonce · aucun avis')

  await page.getByRole('button', { name: 'Réserver' }).click()
  await page.getByRole('button', { name: 'Voir les disponibilités de l’hôte' }).click()
  await page.getByRole('button', { name: /^Disponibilité/ }).click()

  const freeDays = page.locator('.listing-availability-modal__calendar .listing-availability__day[data-status="free"]:not([disabled])')
  await expect(freeDays.first()).toBeVisible()
  const checkInKey = await freeDays.nth(0).getAttribute('data-day-key')
  const checkOutKey = await freeDays.nth(1).getAttribute('data-day-key')
  expect(checkInKey).toBeTruthy()
  expect(checkOutKey).toBeTruthy()
  await freeDays.nth(0).click()
  await page.locator(`button[data-day-key="${checkOutKey}"]`).click()
  await page.getByRole('button', { name: 'Envoyer la demande à l’hôte' }).click()

  const created = page.getByTestId('reservation-created')
  await expect(created).toContainText('Demande envoyée')
  const reservationState = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '{}'), RESERVATIONS_KEY)
  const reservationId = Object.keys(reservationState)[0]
  expect(reservationId).toBeTruthy()
  expect(reservationState[reservationId].status).toBe('pending')
  expect(reservationState[reservationId].total).toBe(240)

  await page.goto('/groc-movera/trips')
  await expect(page.getByTestId('page-trips')).toContainText('En attente de l’hôte')
  await expect(page.getByTestId('page-trips')).toContainText('240 TND')

  await page.evaluate(({ key, userId }) => {
    window.localStorage.setItem(key, JSON.stringify({ authenticated: true, userId, displayName: 'Hôte Flow', provider: 'demo', email: 'host-flow@movera.test', phone: '' }))
  }, { key: AUTH_SESSION_KEY, userId: HOST_USER_ID })
  await page.goto('/groc-movera/host/reservations')
  await expect(page.getByTestId('host-reservations-canonical')).toContainText('Voyageur Flow')
  await page.getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.getByRole('status')).toContainText('Réservation confirmée')

  const confirmedState = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '{}'), RESERVATIONS_KEY)
  expect(confirmedState[reservationId].status).toBe('confirmed')
  expect(confirmedState[reservationId].total).toBe(240)

  await page.evaluate(({ key, userId }) => {
    window.localStorage.setItem(key, JSON.stringify({ authenticated: true, userId, displayName: 'Voyageur Flow', provider: 'demo', email: 'guest-flow@movera.test', phone: '' }))
  }, { key: AUTH_SESSION_KEY, userId: GUEST_USER_ID })
  await page.goto(`/groc-movera/listing/${LISTING_ID}`)
  await page.getByRole('button', { name: 'Réserver' }).click()
  await page.getByRole('button', { name: 'Voir les disponibilités de l’hôte' }).click()
  await page.getByRole('button', { name: /^Disponibilité/ }).click()
  await expect(page.locator(`button[data-day-key="${checkInKey}"]`)).toHaveAttribute('data-status', 'blocked')
  await page.getByRole('button', { name: 'Fermer le calendrier' }).click()

  await page.goto('/groc-movera/trips')
  await page.getByRole('button', { name: 'Annuler la réservation' }).click()
  await expect(page.getByRole('status')).toContainText('disponibilité a été mise à jour')

  await page.goto(`/groc-movera/listing/${LISTING_ID}`)
  await page.getByRole('button', { name: 'Réserver' }).click()
  await page.getByRole('button', { name: 'Voir les disponibilités de l’hôte' }).click()
  await page.getByRole('button', { name: /^Disponibilité/ }).click()
  await expect(page.locator(`button[data-day-key="${checkInKey}"]`)).toHaveAttribute('data-status', 'free')
})
