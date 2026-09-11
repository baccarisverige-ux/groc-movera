import { expect, test } from '@playwright/test'

/* The 84px bottom-nav reservation must follow the nav, not the guest shell.

   app-premium-surface.css reserves 84px on .app-shell__content for the fixed
   bottom nav. GuestLayout renders that nav for neither /map, /host*, nor the
   stacked routes (/listing/*, /services/*), but the reservation was scoped
   `:not(.app-shell--map)` — an exclusion list naming only the one route
   somebody had already debugged.

   So every other nav-less route reserved space for furniture it does not have.
   Signed out, /host and its seven children showed the auth gate and scrolled
   14px; signed in they show the onboarding workspace and scrolled 84px.
   /services/* carried 84px of dead space and scrolled by it.

   The exclusion also outranked authored intent. `:not()` contributes a class's
   worth of specificity, putting the rule at (0,3,0) against the (0,2,0) of
   `.app-shell--stacked > .app-shell__content{ padding-bottom:0 }` that
   listing-detail-page.css already declares — so the listing page, which states
   its own 90px clearance for its fixed footer, silently got 84px it had
   explicitly opted out of.

   Both pages that carry their own fixed footer also reserve their own room for
   it — .listing-detail-page 90px, .host-onboarding 205px — so removing the
   shell reservation cannot bury their content. The last two tests hold that. */

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
]

const documentOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)

const reservedPadding = (page) =>
  page.evaluate(() => {
    const main = document.querySelector('.app-shell__content')
    return main ? getComputedStyle(main).paddingBottom : null
  })

const hasNav = (page) => page.evaluate(() => !!document.querySelector('.app-shell__nav'))

/* The document must be exactly as tall as the page's own content demands and
   not one pixel more. Stated this way the assertion holds at every width,
   including the narrow ones where the content legitimately exceeds the
   viewport — /services/menage really is 692px tall at 320x568 — while still
   catching any reservation the shell adds back on top. */
const surplusBeyondOwnContent = (page, pageSelector) =>
  page.evaluate((selector) => {
    const doc = document.documentElement
    const own = document.querySelector(selector)
    const ownHeight = own ? Math.ceil(own.getBoundingClientRect().height) : 0
    const expected = Math.max(doc.clientHeight, ownHeight)
    return doc.scrollHeight - expected
  }, pageSelector)

/* Does the strip immediately above a fixed bar belong to the page's own
   content box? If it does, the page is reserving its own clearance and the
   bar is not sitting on top of anything. */
const clearsOwnFooter = (page, barSelector, pageSelector) =>
  page.evaluate(({ bar, own }) => {
    const el = document.querySelector(bar)
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const probe = document.elementFromPoint(
      Math.round(rect.left + rect.width / 2),
      Math.round(rect.top - 6),
    )
    return probe ? probe.closest(own) !== null : false
  }, { bar: barSelector, own: pageSelector })

async function signIn(page) {
  await page.goto('/profile')
  await page.getByTestId('profile-test-login').click()
  await expect.poll(() => page.evaluate(() => !!window.localStorage.getItem('movera:auth-session:v1'))).toBe(true)
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}px nav reservation`, () => {
    test.use({ viewport })

    test('/host signed out reserves nothing beyond its own content', async ({ page }) => {
      await page.goto('/host')
      await expect(page.getByTestId('page-auth-required')).toBeVisible()

      expect(await hasNav(page)).toBe(false)
      await expect.poll(() => reservedPadding(page)).toBe('0px')
      await expect.poll(() => surplusBeyondOwnContent(page, '.auth-required-page')).toBe(0)
    })

    test('/services/* reserves nothing beyond its own content', async ({ page }) => {
      await page.goto('/services/menage')
      await expect(page.getByTestId('page-service')).toBeVisible()

      expect(await hasNav(page)).toBe(false)
      await expect.poll(() => reservedPadding(page)).toBe('0px')
      await expect.poll(() => surplusBeyondOwnContent(page, '.service-request-page')).toBe(0)
    })

    test('the signed-in host workspace reserves nothing and clears its own footer', async ({ page }) => {
      await signIn(page)
      await page.goto('/host')
      await expect(page.locator('.host-onboarding')).toBeVisible()

      expect(await hasNav(page)).toBe(false)
      await expect.poll(() => reservedPadding(page)).toBe('0px')

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await expect.poll(() => clearsOwnFooter(page, '.host-onboarding__footer', '.host-onboarding')).toBe(true)
    })

    test('/map still fits its viewport', async ({ page }) => {
      await page.goto('/map')
      await expect(page.getByTestId('page-map')).toBeVisible()
      await expect.poll(() => documentOverflow(page)).toBe(0)
    })

    test('routes that do have a nav keep their reservation', async ({ page }) => {
      await page.goto('/favorites')
      await expect(page.getByTestId('page-favorites')).toBeVisible()
      await expect(page.locator('.app-shell__nav')).toBeVisible()

      const padding = await reservedPadding(page)
      expect(parseFloat(padding)).toBeGreaterThanOrEqual(84)
    })

    test('the listing footer never covers listing content', async ({ page }) => {
      await page.goto('/listing/dar-sidi-bleu')
      await expect(page.getByTestId('page-listing')).toBeVisible()
      await expect(page.locator('.listing-detail-footer')).toBeVisible()

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await expect.poll(() => clearsOwnFooter(page, '.listing-detail-footer', '.listing-detail-page')).toBe(true)
    })
  })
}
