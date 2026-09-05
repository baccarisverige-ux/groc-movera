import { expect, test } from '@playwright/test'

function numberAttribute(locator, name) {
  return locator.getAttribute(name).then((value) => Number(value))
}

test('repeated open → scroll → Voir sur la carte cycles never leave the map sheet blocked', async ({ page }) => {
  test.setTimeout(120_000)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const engine = page.getByTestId('map-engine')
  const surface = page.getByTestId('map-surface')
  const focusIds = ['maison-jasmin', 'apartment-marsa', 'partner-marsa', 'sea-breeze-marsa']

  await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed')

  for (let cycle = 0; cycle < 8; cycle += 1) {
    await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
    await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
    await expect(list).toHaveAttribute('data-scroll-enabled', 'true')
    await expect(list).toHaveCSS('touch-action', 'pan-y')

    await list.evaluate((node, index) => {
      node.scrollTop = 0
      const max = Math.max(0, node.scrollHeight - node.clientHeight)
      const target = Math.min(max, 220 + (index % 3) * 120)
      node.scrollTo({ top: target, behavior: 'instant' })
    }, cycle)
    await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(100)

    const listingId = focusIds[cycle % focusIds.length]
    const focusButton = page.getByTestId(`map-focus-${listingId}`)
    await focusButton.scrollIntoViewIfNeeded()
    await expect(focusButton).toBeVisible()
    await focusButton.click()

    await expect(engine).toHaveAttribute('data-selected-listing-id', listingId)
    await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.47)
    await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.53)
    await expect(sheet).toHaveAttribute('data-snap-state', 'middle')
    await expect(list).toHaveAttribute('data-scroll-enabled', 'false')
    await expect(page.getByRole('button', { name: 'Afficher la liste des offres' })).toBeEnabled()
  }

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'true')

  await list.evaluate((node) => { node.scrollTop = 0 })
  await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBe(0)
  await list.evaluate((node) => { node.scrollTop = 120 })
  await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(100)

  const finalListingId = 'sea-breeze-marsa'
  const finalFocusButton = page.getByTestId(`map-focus-${finalListingId}`)
  await finalFocusButton.scrollIntoViewIfNeeded()
  await finalFocusButton.click()
  await expect(engine).toHaveAttribute('data-selected-listing-id', finalListingId)
  await expect(sheet).toHaveAttribute('data-snap-state', 'middle')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'false')

  const zoomBefore = await numberAttribute(surface, 'data-zoom')
  await page.getByRole('button', { name: 'Zoom avant' }).click()
  await expect.poll(() => numberAttribute(surface, 'data-zoom')).toBeGreaterThan(zoomBefore)
})
