import { expect, test } from '@playwright/test'

test.describe('Movera critical permanent regressions', () => {
  test('resilience, offline and recoverable failures stay functional', async ({ page }) => {
    for (const state of ['loading', 'empty', 'success']) {
      await page.goto(`/resilience-lab?state=${state}`)
      await expect(page.getByTestId(`state-${state}`)).toBeVisible()
    }

    await page.goto('/resilience-lab?state=error')
    for (const kind of ['api', 'map']) {
      const card = page.getByTestId(`resilience-${kind}`)
      await card.getByRole('button', { name: 'Réessayer' }).click()
      await card.getByRole('button', { name: 'Réessayer' }).click()
      await expect(card).toHaveAttribute('data-attempts', '2')
      await expect(card.getByRole('button')).toBeDisabled()
    }

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
      window.dispatchEvent(new Event('offline'))
    })
    await expect(page.getByTestId('offline-fallback')).toBeVisible()
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
      window.dispatchEvent(new Event('online'))
    })
    await expect(page.getByTestId('offline-fallback')).toBeHidden()

    await page.goto('/?__testError=1')
    await expect(page.getByTestId('global-error-boundary')).toBeVisible()
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.getByTestId('page-home')).toBeVisible()
  })

  test('responsive, accessibility and reduced motion guard stays active', async ({ page }) => {
    const sizes = [[320, 568], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768]]
    const routes = ['/', '/map', '/plage', '/maison-d-hote', '/hotel']

    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      for (const route of routes) {
        await page.goto(route)
        const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth)
        expect(overflow).toBeLessThanOrEqual(1)
      }
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const nav = page.locator('.app-shell__nav-item').first()
    const box = await nav.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1)
    await nav.focus()
    await expect(nav).toBeFocused()
  })

  test('map lifecycle and update bursts stay stable', async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.addInitScript(() => {
      const watched = new Set(['orientationchange', 'pagehide', 'pageshow', 'visibilitychange'])
      const counts = {}
      const add = EventTarget.prototype.addEventListener
      const remove = EventTarget.prototype.removeEventListener
      EventTarget.prototype.addEventListener = function (type, ...rest) {
        if (watched.has(type)) counts[type] = (counts[type] || 0) + 1
        return add.call(this, type, ...rest)
      }
      EventTarget.prototype.removeEventListener = function (type, ...rest) {
        if (watched.has(type)) counts[type] = (counts[type] || 0) - 1
        return remove.call(this, type, ...rest)
      }
      window.__listenerCounts = counts
    })

    await page.goto('/')
    const watched = ['orientationchange', 'pagehide', 'pageshow', 'visibilitychange']
    const counts = () => page.evaluate((types) => Object.fromEntries(types.map((type) => [type, window.__listenerCounts[type] || 0])), watched)
    const baseline = await counts()

    for (let i = 0; i < 6; i += 1) {
      await page.goto('/map')
      await expect(page.getByTestId('map-engine')).toHaveCount(1)
      await page.goto('/')
      await expect(page.getByTestId('map-engine')).toHaveCount(0)
    }
    expect(await counts()).toEqual(baseline)

    await page.goto('/map')
    const surface = page.getByTestId('map-surface')
    await expect(surface).toBeVisible()
    const before = Number(await surface.getAttribute('data-update-count'))
    await surface.evaluate((el) => {
      for (let i = 0; i < 120; i += 1) {
        el.dispatchEvent(new WheelEvent('wheel', { deltaY: i % 2 ? -80 : 80, bubbles: true, cancelable: true }))
      }
    })
    await page.waitForTimeout(120)
    const after = Number(await surface.getAttribute('data-update-count'))
    expect(after - before).toBeLessThanOrEqual(30)
    expect(errors).toEqual([])
  })

  test('map uses one reliable raster renderer without a hidden vector runtime', async ({ page }) => {
    await page.goto('/map')

    await expect(page.locator('.map-tiles img').first()).toBeVisible()
    await expect(page.locator('.maplibregl-map')).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByTestId('map-engine')).toBeVisible()
  })

  test('finger pinch zoom is gradual instead of jumping a full level', async ({ page }) => {
    await page.goto('/map')
    const surface = page.getByTestId('map-surface')
    const before = Number(await surface.getAttribute('data-zoom'))

    await surface.evaluate((element) => {
      const pointer = (type, pointerId, clientX) => element.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: 'touch',
        clientX,
        clientY: 220,
      }))
      pointer('pointerdown', 1, 100)
      pointer('pointerdown', 2, 200)
      pointer('pointermove', 2, 210)
      pointer('pointerup', 1, 100)
      pointer('pointerup', 2, 210)
    })

    await page.waitForTimeout(80)
    const after = Number(await surface.getAttribute('data-zoom'))
    expect(after).toBeGreaterThan(before)
    expect(after - before).toBeLessThan(0.2)
    const scale = Number(await page.getByTestId('map-tile-layer').getAttribute('data-scale'))
    expect(scale).toBeGreaterThan(1)
  })

  test('search popup uses a lightweight map preview', async ({ page }) => {
    await page.goto('/')
    await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
    await expect(page.getByTestId('search-map-preview')).toBeVisible()
    await expect(page.locator('.movera-st__map-stage canvas')).toHaveCount(0)
    await expect(page.locator('.movera-st__map-stage .map-controls')).toHaveCount(0)
  })
})
