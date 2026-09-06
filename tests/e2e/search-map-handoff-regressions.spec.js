import { expect, test } from '@playwright/test'

const MAP_SEARCH = '/groc-movera/map?destination=la-marsa&search=1&place=La%20Marsa&checkin=2027-01-10&checkout=2027-01-12&adults=2&children=0&infants=0&pets=0&lat=36.8782&lng=10.3247&zoom=14'
const CANONICAL_MAP_SEARCH = '/groc-movera/map?destination=la-marsa&place=La+Marsa&lat=36.878200&lng=10.324700&zoom=14&checkin=2027-01-10&checkout=2027-01-12&guests=2&adults=2&children=0&infants=0&pets=0&search=1'

async function openGuestsFromMap(page, url = MAP_SEARCH) {
  await page.goto(url)
  await page.getByRole('button', { name: 'Modifier la recherche' }).click()
  const transition = page.getByTestId('search-transition')
  await expect(transition).toBeVisible()
  await transition.locator('.movera-st__step').filter({ hasText: 'Voyageurs' }).click()
  await expect(page.getByTestId('search-step-guests')).toBeVisible()
  return transition
}

async function submitUnchangedSearch(page, url) {
  const transition = await openGuestsFromMap(page, url)
  await page.getByRole('button', { name: 'Rechercher sur la carte' }).click()
  await expect(page).toHaveURL(/adults=2/)
  await expect(transition).toHaveCount(0, { timeout: 1800 })
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.moveraMapHandoff || '')).toBe('')
  await expect(page.getByTestId('page-map')).toBeVisible()
}

test('Map to Search to Map finishes promptly when only guests change', async ({ page }) => {
  const transition = await openGuestsFromMap(page)
  await page.getByRole('button', { name: 'Ajouter adultes' }).click()
  await expect(page.getByTestId('search-adults-count')).toHaveText('3')

  await page.getByRole('button', { name: 'Rechercher sur la carte' }).click()
  await expect(page).toHaveURL(/adults=3/)
  await expect(transition).toHaveCount(0, { timeout: 1800 })
  await expect.poll(() => page.evaluate(() => document.body.dataset.moveraSearchLock || '')).toBe('')
  await expect(page.getByTestId('page-map')).toBeVisible()
})

test('semantically unchanged Map search closes promptly while URL is canonicalized', async ({ page }) => {
  await submitUnchangedSearch(page, MAP_SEARCH)
})

test('exact canonical current Map URL closes promptly without a router no-op timeout', async ({ page }) => {
  await submitUnchangedSearch(page, CANONICAL_MAP_SEARCH)
  await expect(page).toHaveURL(CANONICAL_MAP_SEARCH)
})
