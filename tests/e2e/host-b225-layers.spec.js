import { expect, test } from '@playwright/test'

const HOST_PROFILES_KEY = 'movera:host-profiles:v1'

/* The floating dock is fixed to the bottom of the screen. Every host sheet
   puts its save button in exactly the same place. If the dock outranks the
   sheet, the sheet still renders, still accepts typing, and quietly refuses
   to be saved -- the tap lands on a nav tab instead. It shipped that way once
   because the dock inherited b225's own z-index of 95 while this app's sheets
   sit at 90, and nothing asserted the order.

   These tests check reachability, not numbers: they ask the browser what is
   actually on top at the button's own centre. A future restyle can renumber
   every layer it likes as long as a host can still save. */

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
          name: 'Villa Saphir',
          city: 'Gammarth',
          type: 'Villa',
          basePrice: 680,
          currency: 'TND',
          address: '5 rue des Oliviers',
          guests: 6,
          bedrooms: 3,
          beds: 4,
          bathrooms: 2,
          amenities: ['wifi', 'parking'],
          description: 'Une villa lumineuse à deux pas de la plage, pensée pour les familles nombreuses.',
          bookingMode: 'request-first',
          roomTypes: [],
          photos: [],
        },
      },
    }))
  }, HOST_PROFILES_KEY)
}

/* True when the topmost element at the target's own centre is the target
   itself, or something inside it. Anything else is covering it. */
async function isTopmostAtItsCentre(page, testId) {
  return page.evaluate((id) => {
    const element = document.querySelector(`[data-testid="${id}"]`)
    if (!element) return { found: false }
    const box = element.getBoundingClientRect()
    const x = Math.round(box.left + box.width / 2)
    const y = Math.round(box.top + box.height / 2)
    const hit = document.elementFromPoint(x, y)
    return {
      found: true,
      reachable: Boolean(hit && element.contains(hit)),
      covering: hit && !element.contains(hit) ? (hit.closest('[class]')?.className || hit.tagName) : '',
      box: { x, y },
    }
  }, testId)
}

test.describe('host layer order', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedHost(page)
  })

  test('the dock never covers an editor sheet save button', async ({ page }) => {
    await page.goto('/groc-movera/host/listings/editor')
    await page.getByTestId('host-editor-card-title').click()
    await expect(page.getByTestId('host-edit-sheet-title')).toBeVisible()

    const save = await isTopmostAtItsCentre(page, 'host-edit-save-title')
    expect(save.found).toBe(true)
    expect(save.reachable, `covered by ${save.covering}`).toBe(true)

    // and it actually saves, which is the thing the host cares about
    await page.locator('[data-testid="host-edit-sheet-title"] textarea').fill('Villa Saphir Premium')
    await page.getByTestId('host-edit-save-title').click()
    await expect(page.getByTestId('host-editor-card-title')).toContainText('Villa Saphir Premium')
  })

  test('the dock never covers the calendar day editor', async ({ page }) => {
    await page.goto('/groc-movera/host/calendar')
    await expect(page.getByTestId('host-calendar-page')).toBeVisible()
    await page.locator('.host-calendar-month').first().locator('[data-calendar-day]').first().click()
    await expect(page.getByTestId('host-day-editor')).toBeVisible()

    const apply = await page.evaluate(() => {
      const button = document.querySelector('[data-testid="host-day-editor"] .host-day-editor__save')
      if (!button) return { found: false }
      const box = button.getBoundingClientRect()
      const hit = document.elementFromPoint(Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2))
      return {
        found: true,
        reachable: Boolean(hit && (button === hit || button.contains(hit))),
        covering: hit && !button.contains(hit) ? (hit.closest('[class]')?.className || hit.tagName) : '',
      }
    })
    expect(apply.found).toBe(true)
    expect(apply.reachable, `covered by ${apply.covering}`).toBe(true)
  })

  test('the settings overlay covers the dock, not the other way round', async ({ page }) => {
    await page.goto('/groc-movera/host/menu')
    await page.getByTestId('host-menu-settings').click()
    await expect(page.getByTestId('host-listing-settings')).toBeVisible()

    const save = await isTopmostAtItsCentre(page, 'host-settings-save')
    expect(save.found).toBe(true)
    expect(save.reachable, `covered by ${save.covering}`).toBe(true)
  })
})
