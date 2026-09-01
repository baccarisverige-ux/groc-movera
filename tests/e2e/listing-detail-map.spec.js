import { expect, test } from '@playwright/test'

test('listing detail keeps the exact offer map position and permanent pin visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/listing/maison-jasmin')

  await expect(page.getByTestId('page-listing')).toHaveAttribute('data-listing-id', 'maison-jasmin')

  const frame = page.locator('.listing-detail-map-frame')
  const surface = frame.getByTestId('map-surface')
  await frame.scrollIntoViewIfNeeded()
  await expect(frame).toBeVisible()
  await expect(surface).toBeVisible()

  await expect(surface).toHaveAttribute('data-lat', '36.878900')
  await expect(surface).toHaveAttribute('data-lng', '10.324700')
  await expect(surface).toHaveAttribute('data-zoom', '13')

  const previewState = await frame.evaluate((element) => {
    const pin = getComputedStyle(element, '::before')
    const pinGlyph = getComputedStyle(element, '::after')
    const surface = element.querySelector('[data-testid="map-surface"]')
    return {
      pinContent: pin.content,
      pinDisplay: pin.display,
      pinWidth: pin.width,
      pinHeight: pin.height,
      pinZIndex: pin.zIndex,
      glyphContent: pinGlyph.content,
      surfacePointerEvents: surface ? getComputedStyle(surface).pointerEvents : null,
    }
  })

  expect(previewState.pinContent).not.toBe('none')
  expect(previewState.pinDisplay).not.toBe('none')
  expect(previewState.pinWidth).toBe('42px')
  expect(previewState.pinHeight).toBe('42px')
  expect(Number(previewState.pinZIndex)).toBeGreaterThan(0)
  expect(previewState.glyphContent).not.toBe('none')
  expect(previewState.surfacePointerEvents).toBe('none')

  const cta = frame.getByRole('button', { name: 'Voir sur la carte' })
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(page).toHaveURL(/\/groc-movera\/map\?listing=maison-jasmin$/)
  await expect(page.getByTestId('page-map')).toHaveAttribute('data-listing', 'maison-jasmin')
})
