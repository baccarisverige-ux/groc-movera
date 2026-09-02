import { expect, test } from '@playwright/test'

function numberAttribute(locator, name) {
  return locator.getAttribute(name).then((value) => Number(value))
}

test('La Marsa map exposes only its mapped offers in the full-width Motion bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const pageMap = page.getByTestId('page-map')
  const sheet = page.getByTestId('map-offer-sheet')
  const panel = sheet.locator('.map-offer-sheet__panel')
  await expect(pageMap).toBeVisible()
  await expect(pageMap).toHaveAttribute('data-city-offer-count', '4')
  await expect(sheet).toBeVisible()
  await expect(sheet).toHaveAttribute('data-motion-engine', 'motion')
  await expect(sheet).toHaveAttribute('data-motion-boundary', 'shared')
  await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed')
  await expect(sheet.locator('[data-motion-list="map-offers"]')).toBeVisible()
  await expect(sheet.locator('[data-listing-id]')).toHaveCount(4)
  await expect(sheet.locator('[data-listing-id="maison-jasmin"]')).toHaveCount(1)
  await expect(sheet.locator('[data-listing-id="sea-breeze-marsa"]')).toHaveCount(1)
  await expect(sheet.locator('[data-listing-id="apartment-marsa"]')).toHaveCount(1)
  await expect(sheet.locator('[data-listing-id="partner-marsa"]')).toHaveCount(1)
  await expect(sheet.locator('[data-listing-id="loft-cote"]')).toHaveCount(0)
  await expect(sheet.locator('[data-listing-id="riad-marsa"]')).toHaveCount(0)
  await expect(sheet.locator('[data-listing-id="villa-perle"]')).toHaveCount(0)

  const mapBox = await pageMap.boundingBox()
  const collapsedPanelBox = await panel.boundingBox()
  expect(mapBox).not.toBeNull()
  expect(collapsedPanelBox).not.toBeNull()
  expect(Math.abs(collapsedPanelBox.x - mapBox.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(collapsedPanelBox.width - mapBox.width)).toBeLessThanOrEqual(1)

  const visibleCollapsedHeight = mapBox.y + mapBox.height - collapsedPanelBox.y
  expect(visibleCollapsedHeight).toBeGreaterThanOrEqual(45)
  expect(visibleCollapsedHeight).toBeLessThanOrEqual(85)
})

test('sheet attachment uses one Motion translation with a stable structural header offset', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=la-marsa')

  const pageMap = page.getByTestId('page-map')
  const surface = page.getByTestId('map-surface')
  const sheet = page.getByTestId('map-offer-sheet')
  const panel = sheet.locator('.map-offer-sheet__panel')
  const spacer = page.getByTestId('map-offer-sheet-header-spacer')
  const handle = page.getByTestId('map-offer-sheet-handle')
  const list = sheet.locator('.map-offer-sheet__list')
  const listContent = page.getByTestId('map-offer-sheet-list-content')
  const header = page.locator('.b225-map-top')

  await expect(sheet).toHaveAttribute('data-progress', '0')
  await expect(sheet).toHaveAttribute('data-snap-state', 'collapsed')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'false')
  await expect(listContent).toHaveCSS('transform', 'none')

  const mapBox = await pageMap.boundingBox()
  const headerBox = await header.boundingBox()
  const sheetBox = await sheet.boundingBox()
  const panelBox = await panel.boundingBox()
  const spacerBox = await spacer.boundingBox()
  const handleBox = await handle.boundingBox()
  expect(mapBox).not.toBeNull()
  expect(headerBox).not.toBeNull()
  expect(sheetBox).not.toBeNull()
  expect(panelBox).not.toBeNull()
  expect(spacerBox).not.toBeNull()
  expect(handleBox).not.toBeNull()

  const structuralOffset = panelBox.y - sheetBox.y
  expect(Math.abs(structuralOffset - headerBox.height)).toBeLessThanOrEqual(2)
  expect(Math.abs(spacerBox.height - headerBox.height)).toBeLessThanOrEqual(2)

  const travel = panelBox.y - (headerBox.y + headerBox.height)
  const x = handleBox.x + handleBox.width / 2
  const y = handleBox.y + handleBox.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y - travel * 0.84, { steps: 20 })

  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.8)
  await expect(sheet).toHaveAttribute('data-snap-state', 'moving')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'false')

  const sheetBoxAt84 = await sheet.boundingBox()
  const panelBoxAt84 = await panel.boundingBox()
  expect(sheetBoxAt84).not.toBeNull()
  expect(panelBoxAt84).not.toBeNull()
  const progressAt84 = await numberAttribute(sheet, 'data-progress')
  expect(Math.abs((panelBoxAt84.y - sheetBoxAt84.y) - structuralOffset * (1 - progressAt84))).toBeLessThanOrEqual(2.5)
  const zoomAt84 = await numberAttribute(surface, 'data-zoom')

  await page.mouse.move(x, y - travel * 0.94, { steps: 10 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.9)
  await expect(list).toHaveAttribute('data-scroll-enabled', 'false')
  await expect(listContent).toHaveCSS('transform', 'none')

  const sheetBoxAt94 = await sheet.boundingBox()
  const panelBoxAt94 = await panel.boundingBox()
  expect(sheetBoxAt94).not.toBeNull()
  expect(panelBoxAt94).not.toBeNull()
  const progressAt94 = await numberAttribute(sheet, 'data-progress')
  expect(Math.abs((panelBoxAt94.y - sheetBoxAt94.y) - structuralOffset * (1 - progressAt94))).toBeLessThanOrEqual(2.5)
  expect(await numberAttribute(surface, 'data-zoom')).toBeCloseTo(zoomAt84, 4)

  await page.mouse.up()
  await expect(sheet).toHaveAttribute('data-expanded', 'true')
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await expect(panel).toHaveAttribute('data-attachment-state', 'attached')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'true')

  const attachedPanelBox = await panel.boundingBox()
  expect(attachedPanelBox).not.toBeNull()
  expect(Math.abs(attachedPanelBox.y - mapBox.y)).toBeLessThanOrEqual(2)
})

test('Grand Tunis fully expanded keeps 16 offers summary and first offer visible below the fixed header', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map')

  const pageMap = page.getByTestId('page-map')
  const sheet = page.getByTestId('map-offer-sheet')
  const panel = sheet.locator('.map-offer-sheet__panel')
  const surface = page.getByTestId('map-surface')
  const engine = page.getByTestId('map-engine')
  const topPanel = page.locator('.b225-map-top')
  const dragZone = page.getByTestId('map-offer-sheet-handle')

  await expect(pageMap).toHaveAttribute('data-city-offer-count', '16')
  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-expanded', 'true')
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await expect(panel).toHaveAttribute('data-attachment-state', 'attached')
  await expect(sheet.locator('[data-listing-id]')).toHaveCount(16)
  await expect(dragZone).toContainText('16 offres')
  await expect(dragZone).toContainText('Grand Tunis')
  await expect.poll(() => panel.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe('none')
  await expect(panel).toHaveCSS('border-top-left-radius', '22px')
  await expect(panel).toHaveCSS('border-top-right-radius', '22px')

  const list = sheet.locator('.map-offer-sheet__list')
  await expect(list).toHaveCSS('scroll-snap-type', 'none')
  await expect(list).toHaveAttribute('data-motion-list', 'map-offers')
  await expect(list).toHaveAttribute('data-map-scroll', 'independent')
  await expect(list).toHaveAttribute('data-sheet-handoff', 'drag-from-offer')
  await expect(list).toHaveAttribute('data-scroll-enabled', 'true')

  const mapBox = await pageMap.boundingBox()
  const sheetBox = await sheet.boundingBox()
  const panelBox = await panel.boundingBox()
  const topPanelBox = await topPanel.boundingBox()
  const dragZoneBox = await dragZone.boundingBox()
  const mediaBox = await sheet.locator('[data-listing-id="dar-sidi-bleu"] .map-offer-sheet__media').boundingBox()
  expect(mapBox).not.toBeNull()
  expect(sheetBox).not.toBeNull()
  expect(panelBox).not.toBeNull()
  expect(topPanelBox).not.toBeNull()
  expect(dragZoneBox).not.toBeNull()
  expect(mediaBox).not.toBeNull()

  const headerBottom = topPanelBox.y + topPanelBox.height
  const finalHeaderOffset = await numberAttribute(dragZone, 'data-header-offset')
  expect(Math.abs(finalHeaderOffset - topPanelBox.height)).toBeLessThanOrEqual(3)
  expect(Math.abs(sheetBox.y - mapBox.y)).toBeLessThanOrEqual(2)
  expect(Math.abs(panelBox.y - headerBottom)).toBeLessThanOrEqual(2)
  expect(Math.abs(dragZoneBox.y - panelBox.y)).toBeLessThanOrEqual(2)
  expect(mediaBox.y).toBeGreaterThanOrEqual(dragZoneBox.y + dragZoneBox.height - 2)
  expect(mediaBox.width).toBeGreaterThan(340)
  expect(mediaBox.height).toBeGreaterThan(240)

  const zOrder = await page.evaluate(() => {
    const header = document.querySelector('.b225-map-top')
    const offerSheet = document.querySelector('[data-testid="map-offer-sheet"]')
    return {
      header: Number(getComputedStyle(header).zIndex),
      sheet: Number(getComputedStyle(offerSheet).zIndex),
      parentClass: offerSheet.parentElement?.className || '',
    }
  })
  expect(zOrder.header).toBeGreaterThan(zOrder.sheet)
  expect(zOrder.parentClass).toContain('b225-map-page')

  await page.waitForTimeout(350)
  const zoomBeforeScroll = await numberAttribute(surface, 'data-zoom')
  const selectedBeforeScroll = await engine.getAttribute('data-selected-listing-id')
  const scrollBefore = await list.evaluate((node) => node.scrollTop)

  await list.evaluate((node) => node.scrollBy({ top: 360, behavior: 'instant' }))
  await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(scrollBefore)
  await page.waitForTimeout(200)

  expect(await numberAttribute(surface, 'data-zoom')).toBeCloseTo(zoomBeforeScroll, 4)
  expect(await engine.getAttribute('data-selected-listing-id')).toBe(selectedBeforeScroll)
})

test('one remaining offer can close the fully open sheet by swiping directly on its image', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=tozeur')

  const pageMap = page.getByTestId('page-map')
  const sheet = page.getByTestId('map-offer-sheet')
  await expect(pageMap).toHaveAttribute('data-city-offer-count', '1')
  await expect(sheet.locator('[data-listing-id]')).toHaveCount(1)
  await expect(sheet.locator('[data-listing-id="sahara-night"]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-expanded', 'true')
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')

  const list = sheet.locator('.map-offer-sheet__list')
  await expect(list).toHaveAttribute('data-sheet-handoff', 'drag-from-offer')
  await list.evaluate((node) => { node.scrollTop = 0 })
  const image = sheet.locator('[data-listing-id="sahara-night"] .map-offer-sheet__media')
  await expect(image).toBeVisible()

  await image.evaluate((node) => {
    const fireTouch = (type, clientY, cancelable = true) => {
      const event = new Event(type, { bubbles: true, cancelable })
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: type === 'touchend' ? [] : [{ clientY }],
      })
      node.dispatchEvent(event)
    }

    fireTouch('touchstart', 310, false)
    fireTouch('touchmove', 350)
    fireTouch('touchmove', 430)
    fireTouch('touchend', 430, false)
  })

  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.86)
  await expect(sheet).toHaveAttribute('data-expanded', 'false')
})

test('downward swipe starting on an offer can close the fully open sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=gammarth')

  const sheet = page.getByTestId('map-offer-sheet')
  const list = sheet.locator('.map-offer-sheet__list')
  const firstOffer = sheet.locator('[data-listing-id="villa-saphir"]')

  await page.getByRole('button', { name: 'Afficher la liste des offres' }).click()
  await expect(sheet).toHaveAttribute('data-expanded', 'true')
  await expect(sheet).toHaveAttribute('data-snap-state', 'expanded')
  await list.evaluate((node) => { node.scrollTop = 0 })
  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeGreaterThan(0.98)

  await firstOffer.evaluate((node) => {
    const fireTouch = (type, clientY, cancelable = true) => {
      const event = new Event(type, { bubbles: true, cancelable })
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: type === 'touchend' ? [] : [{ clientY }],
      })
      node.dispatchEvent(event)
    }

    fireTouch('touchstart', 280, false)
    fireTouch('touchmove', 315)
    fireTouch('touchmove', 390)
    fireTouch('touchend', 390, false)
  })

  await expect.poll(() => numberAttribute(sheet, 'data-progress')).toBeLessThan(0.86)
  await expect(sheet).toHaveAttribute('data-expanded', 'false')
  await expect(sheet).not.toHaveAttribute('data-snap-state', 'expanded')
})

test('a destination with no mapped offers shows an honest empty state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/map?destination=tabarka')

  await expect(page.getByTestId('page-map')).toHaveAttribute('data-city-offer-count', '0')
  await expect(page.getByTestId('map-offer-sheet')).toHaveAttribute('data-motion-engine', 'motion')
  await expect(page.getByTestId('map-offer-sheet')).toHaveAttribute('data-motion-boundary', 'shared')
  await expect(page.getByTestId('map-offer-sheet')).toContainText('Aucune offre Movera dans cette ville')
  await expect(page.getByTestId('map-offer-sheet').locator('[data-listing-id]')).toHaveCount(0)
})
