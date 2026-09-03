import { expect, test } from '@playwright/test'

const AUTH_SESSION_KEY = 'movera:auth-session:v1'
const PROFILE_KEY = 'movera:host-profiles:v1'
const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const ROOM_DRAFT_KEY = 'movera:host-room-type-drafts:v1'

test('hotel highlights expose meal plans as a real multi-select page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()

  const userId = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '{}').userId || '', AUTH_SESSION_KEY)
  expect(userId).toBeTruthy()

  await page.evaluate(({ userId, profileKey, draftKey, roomDraftKey }) => {
    window.localStorage.removeItem(profileKey)
    window.localStorage.setItem(draftKey, JSON.stringify({
      [userId]: {
        propertyType: 'Hotel',
        guestAccess: 'private',
        screenIndex: 10,
        title: 'Hotel test',
        highlights: [],
      },
    }))
    window.localStorage.setItem(roomDraftKey, JSON.stringify({
      [userId]: {
        mode: 'categories',
        totalRooms: 2,
        roomTypes: [
          { id: 'room-category-1', name: 'Catégorie 1', guests: 2, beds: 1, bathrooms: 1, basePrice: 180, totalUnits: 1, photos: [] },
          { id: 'room-category-2', name: 'Catégorie 2', guests: 2, beds: 1, bathrooms: 1, basePrice: 220, totalUnits: 1, photos: [] },
        ],
      },
    }))
  }, { userId, profileKey: PROFILE_KEY, draftKey: DRAFT_KEY, roomDraftKey: ROOM_DRAFT_KEY })

  await page.goto('/groc-movera/host')
  const onboarding = page.getByTestId('host-onboarding')
  await expect(onboarding).toHaveAttribute('data-screen', 'highlights')
  await expect(page.getByRole('heading', { name: 'Les points forts de votre hôtel' })).toBeVisible()

  const halfBoard = page.getByRole('button', { name: /Demi-pension/ })
  const fullBoard = page.getByRole('button', { name: /Pension complète/ })
  const allInclusive = page.getByRole('button', { name: /All inclusive/ })
  await expect(halfBoard).toBeVisible()
  await expect(fullBoard).toBeVisible()
  await expect(allInclusive).toBeVisible()

  await halfBoard.click()
  await fullBoard.click()
  await allInclusive.click()
  await expect(page.getByText('3 sélectionnés', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeEnabled()

  const stored = await page.evaluate(({ key, userId }) => JSON.parse(window.localStorage.getItem(key) || '{}')?.[userId] || {}, { key: DRAFT_KEY, userId })
  expect(stored.propertyType).toBe('Hôtel')
  expect(stored.highlights).toEqual(expect.arrayContaining(['half-board', 'full-board', 'all-inclusive']))
  await expect(page.locator('.host-onboarding__chips')).toHaveCount(0)
})
