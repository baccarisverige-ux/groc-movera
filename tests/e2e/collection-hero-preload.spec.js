import { expect, test } from '@playwright/test'

/* The three collection heroes are the LCP images of /plage, /maison-d-hote and
   /hotel. Preloading them at high priority is worth it where a collection is
   the likely next view; on every other route it is bandwidth and decode time
   spent on images the page cannot display. */

function trackHeroRequests(page) {
  const heroes = []
  page.on('request', (request) => {
    const file = new URL(request.url()).pathname.split('/').pop() || ''
    if (/^hero-.*\.(webp|jpg)$/.test(file)) heroes.push(file)
  })
  return heroes
}

async function heroesFetchedOn(page, route) {
  const heroes = trackHeroRequests(page)
  await page.goto(route)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2500)
  return [...new Set(heroes)]
}

test.describe('Collection hero preloading is scoped to routes that use it', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Map does not fetch any collection hero', async ({ page }) => {
    const heroes = await heroesFetchedOn(page, '/map')
    await expect(page.getByTestId('page-map')).toBeVisible()
    expect(heroes, `Map fetched collection heroes it never shows: ${heroes.join(', ')}`).toEqual([])
  })

  test('Profile does not fetch any collection hero', async ({ page }) => {
    const heroes = await heroesFetchedOn(page, '/profile')
    expect(heroes, `Profile fetched collection heroes it never shows: ${heroes.join(', ')}`).toEqual([])
  })

  test('Home still preloads the collection heroes it leads to', async ({ page }) => {
    const heroes = await heroesFetchedOn(page, '/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    expect(heroes.length).toBe(3)
  })

  test('a collection route fetches its own hero and not the other two', async ({ page }) => {
    const heroes = await heroesFetchedOn(page, '/hotel')
    await expect(page.getByTestId('page-hotel')).toBeVisible()
    expect(heroes.length).toBe(1)
  })
})
