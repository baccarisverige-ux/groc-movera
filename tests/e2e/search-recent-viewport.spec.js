import { expect, test } from '@playwright/test'

const SEARCH_SETTLE_TIMEOUT = 10_000
const RECENT_KEY = 'movera-search-recents-v1'

/* A precise place, deliberately far enough from its nearest Movera destination
   that a fallback to the generic city framing is unmistakable. */
const PRECISE = { lat: 36.8421, lng: 10.2731, zoom: 16, label: 'Rue du Lac Turkana' }

async function seedRecent(page, entry) {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, JSON.stringify([value])), [RECENT_KEY, entry])
  await page.reload()
  await expect(page.getByTestId('page-home')).toBeVisible()
}

async function openSearch(page) {
  await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
  const transition = page.getByTestId('search-transition')
  await expect(transition).toBeVisible()
  await expect.poll(async () => transition.getAttribute('data-ready'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('true')
  return transition
}

async function submitFromRecent(page) {
  const recent = page.locator('.movera-st__recent').first()
  await expect(recent).toBeVisible({ timeout: SEARCH_SETTLE_TIMEOUT })
  await recent.click()
  await page.getByRole('button', { name: 'Rechercher sur la carte' }).click()
  await expect(page).toHaveURL(/\/map\?/, { timeout: SEARCH_SETTLE_TIMEOUT })
  return new URLSearchParams(new URL(page.url()).search)
}

test.describe('Recent searches reproduce their own viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('a recent search restores the exact camera it was saved with', async ({ page }) => {
    await seedRecent(page, {
      destinationId: 'la-marsa',
      label: PRECISE.label,
      subtitle: 'Les Berges du Lac, Tunis',
      viewport: { lat: PRECISE.lat, lng: PRECISE.lng, zoom: PRECISE.zoom },
      checkin: '2027-01-10',
      checkout: '2027-01-12',
      adults: 2,
      children: 0,
      infants: 0,
      pets: 0,
    })

    await openSearch(page)
    const recentChip = page.locator('.movera-st__recent').first()
    await expect(recentChip).toBeVisible({ timeout: SEARCH_SETTLE_TIMEOUT })
    // The chip promises this precise place, so the Map must deliver it.
    await expect(recentChip.locator('strong')).toHaveText(PRECISE.label)

    const params = await submitFromRecent(page)
    expect(params.get('lat')).toBe('36.842100')
    expect(params.get('lng')).toBe('10.273100')
    expect(params.get('zoom')).toBe('16')
    expect(params.get('place')).toBe(PRECISE.label)
  })

  test('a recent search saved before viewports were stored still falls back safely', async ({ page }) => {
    // The shape older builds wrote: no viewport at all.
    await seedRecent(page, {
      destinationId: 'la-marsa',
      label: 'La Marsa',
      checkin: '2027-01-10',
      checkout: '2027-01-12',
      adults: 2,
      children: 0,
      infants: 0,
      pets: 0,
    })

    await openSearch(page)
    const params = await submitFromRecent(page)

    // Falls back to the destination's own framing rather than breaking.
    expect(params.get('destination')).toBe('la-marsa')
    expect(params.get('lat')).toBe('36.878200')
    expect(params.get('lng')).toBe('10.324700')
    expect(params.get('zoom')).toBe('13')
  })

  test('a submitted search stores its viewport for reuse', async ({ page }) => {
    await seedRecent(page, {
      destinationId: 'la-marsa',
      label: PRECISE.label,
      subtitle: 'Les Berges du Lac, Tunis',
      viewport: { lat: PRECISE.lat, lng: PRECISE.lng, zoom: PRECISE.zoom },
      checkin: '2027-01-10',
      checkout: '2027-01-12',
      adults: 2,
      children: 0,
      infants: 0,
      pets: 0,
    })

    await openSearch(page)
    await submitFromRecent(page)

    // Re-submitting must not degrade the stored record into a generic one.
    const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '[]'), RECENT_KEY)
    expect(stored[0]).toMatchObject({
      destinationId: 'la-marsa',
      label: PRECISE.label,
      viewport: { lat: PRECISE.lat, lng: PRECISE.lng, zoom: PRECISE.zoom },
    })
  })
})
