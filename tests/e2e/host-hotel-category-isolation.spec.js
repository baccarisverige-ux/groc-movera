import { expect, test } from '@playwright/test'

const AUTH_SESSION_KEY = 'movera:auth-session:v1'
const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const ROOM_DRAFT_KEY = 'movera:host-room-type-drafts:v1'

async function seedHotelCategories(page) {
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  const userId = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').userId || '', AUTH_SESSION_KEY)
  expect(userId).toBeTruthy()
  await page.evaluate(({ userId, draftKey, roomKey }) => {
    const safety = { exteriorCamera: false, noiseMonitor: false, weapons: false, smokeAlarm: false, carbonMonoxideAlarm: false }
    localStorage.setItem(draftKey, JSON.stringify({
      [userId]: {
        propertyType: 'Hôtel', guestAccess: 'private', screenIndex: 7,
        address: '10 avenue de la Mer', city: 'La Marsa', pinConfirmed: true,
        guests: 2, bedrooms: 2, beds: 1, bathrooms: 1,
        title: 'Chambre Standard', description: 'Une chambre standard confortable et lumineuse.',
        amenities: [], highlights: [], promotions: [], bookingMode: 'request-first', basePrice: '180', safety,
      },
    }))
    localStorage.setItem(roomKey, JSON.stringify({
      [userId]: {
        mode: 'categories', totalRooms: 2,
        roomTypes: [
          { id: 'standard', name: 'Standard', totalUnits: 1, guests: 2, beds: 1, bathrooms: 1, basePrice: 180, description: 'Une chambre standard confortable et lumineuse.', amenities: [], highlights: [], promotions: [], bookingMode: 'request-first', safety, photos: [] },
          { id: 'deluxe', name: 'Deluxe', totalUnits: 1, guests: 3, beds: 2, bathrooms: 1, basePrice: 220, description: 'Une chambre deluxe spacieuse avec une belle vue.', amenities: [], highlights: [], promotions: [], bookingMode: 'request-first', safety, photos: [] },
        ],
      },
    }))
  }, { userId, draftKey: DRAFT_KEY, roomKey: ROOM_DRAFT_KEY })
  return userId
}

async function openStep(page, userId, screenIndex, screenId) {
  await page.evaluate(({ key, userId, screenIndex }) => {
    const drafts = JSON.parse(localStorage.getItem(key) || '{}')
    drafts[userId] = { ...drafts[userId], screenIndex }
    localStorage.setItem(key, JSON.stringify(drafts))
  }, { key: DRAFT_KEY, userId, screenIndex })
  await page.goto(`/groc-movera/host?step=${screenId}`)
  await expect(page.getByTestId('host-onboarding')).toHaveAttribute('data-screen', screenId)
}

function categoryTabs(page) {
  return page.locator('.host-room-category-picker__tabs button')
}

test('hotel room categories stay visible and isolated throughout the offer flow', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const userId = await seedHotelCategories(page)

  await openStep(page, userId, 7, 'amenities')
  await expect(categoryTabs(page)).toHaveCount(2)
  const wifi = page.getByRole('button', { name: /Wi-Fi/ })
  await wifi.click()
  await categoryTabs(page).nth(1).click()
  await expect(wifi).toHaveAttribute('aria-pressed', 'false')
  await categoryTabs(page).first().click()
  await expect(wifi).toHaveAttribute('aria-pressed', 'true')

  await openStep(page, userId, 8, 'photos')
  await expect(page.locator('.host-room-pro-photos__tabs button')).toHaveCount(2)

  await openStep(page, userId, 9, 'title')
  await expect(categoryTabs(page)).toHaveCount(2)
  await expect(page.getByRole('textbox')).toHaveValue('Standard')
  await categoryTabs(page).nth(1).click()
  await expect(page.getByRole('textbox')).toHaveValue('Deluxe')

  await openStep(page, userId, 10, 'highlights')
  const halfBoard = page.getByRole('button', { name: /Demi-pension/ })
  await halfBoard.click()
  await categoryTabs(page).nth(1).click()
  await expect(halfBoard).toHaveAttribute('aria-pressed', 'false')
  await categoryTabs(page).first().click()
  await expect(halfBoard).toHaveAttribute('aria-pressed', 'true')

  await openStep(page, userId, 11, 'description')
  const description = page.getByRole('textbox')
  await description.fill('Description différente pour la catégorie Standard.')
  await categoryTabs(page).nth(1).click()
  await expect(description).toHaveValue('Une chambre deluxe spacieuse avec une belle vue.')
  await categoryTabs(page).first().click()
  await expect(description).toHaveValue('Description différente pour la catégorie Standard.')

  await openStep(page, userId, 12, 'safety')
  const smokeAlarm = page.getByRole('checkbox', { name: 'Détecteur de fumée' })
  await smokeAlarm.check()
  await categoryTabs(page).nth(1).click()
  await expect(smokeAlarm).not.toBeChecked()
  await categoryTabs(page).first().click()
  await expect(smokeAlarm).toBeChecked()

  await openStep(page, userId, 14, 'booking')
  await page.getByRole('radio', { name: /Réservation instantanée/ }).click()
  await categoryTabs(page).nth(1).click()
  await expect(page.getByRole('radio', { name: /Approuver les premières réservations/ })).toHaveAttribute('aria-checked', 'true')
  await categoryTabs(page).first().click()
  await expect(page.getByRole('radio', { name: /Réservation instantanée/ })).toHaveAttribute('aria-checked', 'true')

  await openStep(page, userId, 15, 'price')
  const price = page.getByRole('textbox', { name: /Prix par nuit/ })
  await price.fill('275')
  await categoryTabs(page).nth(1).click()
  await expect(price).toHaveValue('220')
  await categoryTabs(page).first().click()
  await expect(price).toHaveValue('275')

  await openStep(page, userId, 16, 'promotions')
  const newListingPromotion = page.getByRole('button', { name: /Promotion nouveau logement/ })
  await newListingPromotion.click()
  await categoryTabs(page).nth(1).click()
  await expect(newListingPromotion).toHaveAttribute('aria-pressed', 'false')
  await categoryTabs(page).first().click()
  await expect(newListingPromotion).toHaveAttribute('aria-pressed', 'true')

  await openStep(page, userId, 17, 'review')
  await expect(categoryTabs(page)).toHaveCount(2)
  await expect(page.getByText('275 TND', { exact: true })).toBeVisible()
  await categoryTabs(page).nth(1).click()
  await expect(page.getByText('220 TND', { exact: true })).toBeVisible()

  const stored = await page.evaluate(({ key, userId }) => JSON.parse(localStorage.getItem(key) || '{}')[userId], { key: ROOM_DRAFT_KEY, userId })
  const standard = stored.roomTypes.find((room) => room.id === 'standard')
  const deluxe = stored.roomTypes.find((room) => room.id === 'deluxe')
  expect(standard).toMatchObject({ amenities: ['wifi'], highlights: ['half-board'], bookingMode: 'instant', basePrice: 275 })
  expect(standard.safety.smokeAlarm).toBe(true)
  expect(deluxe).toMatchObject({ amenities: [], highlights: [], promotions: [], bookingMode: 'request-first', basePrice: 220 })
  expect(deluxe.safety.smokeAlarm).toBe(false)
})
