import { expect, test } from '@playwright/test'

async function expectStableHomeNav(page) {
  const nav = page.locator('.app-shell--guest > .app-shell__nav')
  const items = nav.locator('.app-shell__nav-item')

  await expect(nav).toBeVisible()
  await expect(items).toHaveCount(5)
  await expect(nav.locator('svg')).toHaveCount(5)

  const state = await nav.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const itemState = [...node.querySelectorAll('.app-shell__nav-item')].map((item) => {
      const itemRect = item.getBoundingClientRect()
      const before = getComputedStyle(item, '::before')
      const after = getComputedStyle(item, '::after')
      return {
        top: itemRect.top,
        bottom: itemRect.bottom,
        beforeContent: before.content,
        beforeDisplay: before.display,
        afterContent: after.content,
        afterDisplay: after.display,
        svgCount: item.querySelectorAll('svg').length,
      }
    })
    return {
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      itemState,
    }
  })

  expect(state.rect.left).toBeGreaterThanOrEqual(-1)
  expect(state.rect.right).toBeLessThanOrEqual(state.viewport.width + 1)
  expect(Math.abs(state.rect.bottom - state.viewport.height)).toBeLessThanOrEqual(1)
  expect(state.rect.height).toBeGreaterThanOrEqual(59)

  for (const item of state.itemState) {
    expect(item.svgCount).toBe(1)
    expect(item.top).toBeGreaterThanOrEqual(state.rect.top - 1)
    expect(item.bottom).toBeLessThanOrEqual(state.rect.bottom + 1)
    expect(item.beforeContent === 'none' || item.beforeDisplay === 'none').toBe(true)
    expect(item.afterContent === 'none' || item.afterDisplay === 'none').toBe(true)
  }
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]) {
  test(`Home bottom bar stays clean at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()

    await expectStableHomeNav(page)
    await expect(page.locator('.app-shell__nav-item[data-active="true"] span')).toHaveText('Accueil')

    await page.evaluate(() => window.scrollTo(0, Math.min(900, document.documentElement.scrollHeight)))
    await expectStableHomeNav(page)

    await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
    await expect.poll(async () => page.getByTestId('search-transition').getAttribute('data-ready')).toBe('true')
    await page.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByTestId('search-transition')).toBeHidden({ timeout: 5_000 })

    await expectStableHomeNav(page)
    await expect(page.locator('.app-shell__nav-item[data-active="true"] span')).toHaveText('Accueil')
  })
}
