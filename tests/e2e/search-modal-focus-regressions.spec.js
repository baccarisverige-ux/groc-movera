import { expect, test } from '@playwright/test'

const SEARCH_SETTLE_TIMEOUT = 10_000

async function openSearchFromHome(page) {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
  const transition = page.getByTestId('search-transition')
  await expect(transition).toBeVisible()
  await expect.poll(async () => transition.getAttribute('data-ready'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('true')
  return transition
}

async function reachGuestsStep(page, transition) {
  await page.locator('.movera-st__destination').first().click()
  await expect.poll(async () => transition.getAttribute('data-step'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('dates')

  const available = page.locator('.movera-st__calendar-grid button.movera-st__day:not(:disabled)')
  await expect.poll(async () => available.count(), { timeout: SEARCH_SETTLE_TIMEOUT }).toBeGreaterThanOrEqual(2)
  const count = await available.count()
  const firstLabel = await available.nth(0).getAttribute('aria-label')
  const secondLabel = await available.nth(Math.min(3, count - 1)).getAttribute('aria-label')
  await page.getByRole('button', { name: firstLabel, exact: true }).click()
  await page.getByRole('button', { name: secondLabel, exact: true }).click()

  await transition.locator('.movera-st__step').filter({ hasText: 'Voyageurs' }).click()
  await expect(page.getByTestId('search-step-guests')).toBeVisible()
}

/* The focus guard blurs on a queued animation frame, and headless WebKit can
   stall a frame for seconds. Waiting on real frames rather than wall-clock time
   keeps these assertions deterministic on every engine. */
async function settleAnimationFrames(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

function activeElementInfo(page) {
  return page.evaluate(() => {
    const active = document.activeElement
    if (!active || active === document.body) return { tag: 'BODY', inDialog: false, label: '' }
    return {
      tag: active.tagName,
      inDialog: Boolean(active.closest('[data-testid="search-transition"]')),
      label: active.getAttribute('aria-label') || '',
    }
  })
}

test.describe('Search behaves as a real modal', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Tab keeps focus inside the Search dialog instead of escaping to the page behind', async ({ page }) => {
    await openSearchFromHome(page)

    // Focus starts outside the dialog; the first Tab must pull it in and keep it there.
    for (let step = 0; step < 10; step += 1) {
      await page.keyboard.press('Tab')
      const active = await activeElementInfo(page)
      expect(active.inDialog, `Tab ${step + 1} escaped the dialog onto ${active.tag}`).toBe(true)
    }
  })

  test('Shift+Tab also stays inside the Search dialog', async ({ page }) => {
    await openSearchFromHome(page)

    // Enter the dialog first, so Shift+Tab has to wrap backwards from its
    // first control rather than arriving from the end of the document.
    await page.keyboard.press('Tab')
    expect((await activeElementInfo(page)).inDialog).toBe(true)

    for (let step = 0; step < 6; step += 1) {
      await page.keyboard.press('Shift+Tab')
      const active = await activeElementInfo(page)
      expect(active.inDialog, `Shift+Tab ${step + 1} escaped the dialog onto ${active.tag}`).toBe(true)
    }
  })

  test('guests step keeps keyboard focus on its controls', async ({ page }) => {
    const transition = await openSearchFromHome(page)
    await reachGuestsStep(page, transition)

    const addAdults = page.getByRole('button', { name: 'Ajouter adultes' })
    await addAdults.focus()

    // The soft-keyboard guard used to blur every focused element on this step,
    // which dropped focus back to the body on the next animation frame.
    await settleAnimationFrames(page)
    const afterFocus = await activeElementInfo(page)
    expect(afterFocus.label).toBe('Ajouter adultes')
    expect(afterFocus.inDialog).toBe(true)

    await page.keyboard.press('Tab')
    const afterTab = await activeElementInfo(page)
    expect(afterTab.inDialog).toBe(true)
    expect(afterTab.tag).toBe('BUTTON')
  })

  test('dates step keeps keyboard focus on calendar controls', async ({ page }) => {
    const transition = await openSearchFromHome(page)
    await page.locator('.movera-st__destination').first().click()
    await expect.poll(async () => transition.getAttribute('data-step'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('dates')

    const firstDay = page.locator('.movera-st__calendar-grid button.movera-st__day:not(:disabled)').first()
    await firstDay.focus()
    await settleAnimationFrames(page)

    const active = await activeElementInfo(page)
    expect(active.inDialog).toBe(true)
    expect(active.tag).toBe('BUTTON')
  })

  test('text entry still stays keyboard-free on the dates and guests steps', async ({ page }) => {
    const transition = await openSearchFromHome(page)
    await reachGuestsStep(page, transition)

    // Approved mobile behaviour: the destination field must not hold focus on
    // these steps, so the soft keyboard cannot cover the panel.
    await page.locator('.movera-st__persistent-search input').focus()
    await expect
      .poll(async () => page.evaluate(() => document.activeElement?.matches('.movera-st__persistent-search input') || false))
      .toBe(false)
  })

  test('the page behind Search is inert while open and released on close', async ({ page }) => {
    const transition = await openSearchFromHome(page)

    const whileOpen = await page.evaluate(() => {
      const root = document.getElementById('root')
      const dialog = document.querySelector('[data-testid="search-transition"]')
      return {
        inert: root?.hasAttribute('inert') ?? null,
        ariaHidden: root?.getAttribute('aria-hidden') ?? null,
        role: dialog?.getAttribute('role') ?? null,
        ariaModal: dialog?.getAttribute('aria-modal') ?? null,
        bottomNavHit: (() => {
          const element = document.elementFromPoint(195, 780)
          return element ? Boolean(element.closest('.app-shell__nav')) : false
        })(),
      }
    })

    expect(whileOpen.inert).toBe(true)
    expect(whileOpen.ariaHidden).toBe('true')
    expect(whileOpen.role).toBe('dialog')
    expect(whileOpen.ariaModal).toBe('true')
    expect(whileOpen.bottomNavHit, 'background bottom nav was still hit-testable').toBe(false)

    await page.keyboard.press('Escape')
    await expect(transition).toHaveCount(0, { timeout: SEARCH_SETTLE_TIMEOUT })

    const afterClose = await page.evaluate(() => {
      const root = document.getElementById('root')
      return { inert: root?.hasAttribute('inert') ?? null, ariaHidden: root?.getAttribute('aria-hidden') ?? null }
    })
    expect(afterClose.inert).toBe(false)
    expect(afterClose.ariaHidden).toBeNull()
  })

  test('repeated open and close leaves no residual lock or inert state', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
      const transition = page.getByTestId('search-transition')
      await expect(transition).toBeVisible()
      await expect.poll(async () => transition.getAttribute('data-ready'), { timeout: SEARCH_SETTLE_TIMEOUT }).toBe('true')

      await page.keyboard.press('Escape')
      await expect(transition).toHaveCount(0, { timeout: SEARCH_SETTLE_TIMEOUT })

      const residue = await page.evaluate(() => ({
        lock: document.body.dataset.moveraSearchLock || '',
        position: document.body.style.position || '',
        inert: document.getElementById('root')?.hasAttribute('inert') ?? null,
      }))
      expect(residue, `cycle ${cycle} left residue`).toEqual({ lock: '', position: '', inert: false })
    }
  })
})
