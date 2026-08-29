import { expect, test } from '@playwright/test'

test('Home keeps vertical scroll independent from horizontal rails', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  const categories = page.getByTestId('home-categories')
  await expect.poll(() => categories.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true)
  await categories.evaluate(node => { node.scrollLeft = Math.min(120, node.scrollWidth - node.clientWidth) })
  await expect.poll(() => categories.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)

  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'auto' }))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)

  const allRail = page.getByTestId('home-selection-all').locator('.b225-offer-scroll')
  await expect.poll(() => allRail.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true)
  await allRail.evaluate(node => { node.scrollLeft = Math.min(120, node.scrollWidth - node.clientWidth) })
  await expect.poll(() => allRail.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)

  const pageOverflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth)
  expect(pageOverflow).toBeLessThanOrEqual(1)
})

test('category rail reacts on the first horizontal move without stealing vertical page pan', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  const categories = page.getByTestId('home-categories')

  await expect.poll(() => categories.evaluate(node => getComputedStyle(node).touchAction)).toContain('pan-y')

  const firstMoveScroll = await categories.evaluate((node) => {
    node.scrollLeft = 0
    const dispatchTouch = (type, x, y, active = true) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: active ? [{ clientX: x, clientY: y }] : [],
      })
      node.dispatchEvent(event)
    }

    dispatchTouch('touchstart', 220, 24)
    dispatchTouch('touchmove', 214, 24)
    const scrollLeft = node.scrollLeft
    dispatchTouch('touchend', 214, 24, false)
    return scrollLeft
  })

  expect(firstMoveScroll).toBeGreaterThan(0)

  const beach = categories.locator('button[data-category-id="beach"]')
  await beach.evaluate(button => button.click())
  await expect(page.getByTestId('page-home')).toBeVisible()
})

test('Categories stays pinned while Bienvenue passes underneath, then retires beneath Search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  const header = page.locator('.b225-home-header')
  const shell = page.locator('.b225-categories-shell')
  const welcome = page.locator('.b225-welcome')

  await expect(shell).toHaveClass(/movera-categories-linked/)
  await page.evaluate(() => window.scrollTo({ top: 80, behavior: 'auto' }))

  const docked = await page.evaluate(() => {
    const headerNode = document.querySelector('.b225-home-header')
    const shellNode = document.querySelector('.b225-categories-shell')
    const welcomeNode = document.querySelector('.b225-welcome')
    const headerRect = headerNode.getBoundingClientRect()
    const shellRect = shellNode.getBoundingClientRect()
    const welcomeRect = welcomeNode.getBoundingClientRect()
    return {
      headerBottom: headerRect.bottom,
      shellTop: shellRect.top,
      shellHeight: shellRect.height,
      welcomeBottom: welcomeRect.bottom,
    }
  })

  expect(Math.abs(docked.shellTop - docked.headerBottom)).toBeLessThanOrEqual(3)
  expect(docked.welcomeBottom).toBeGreaterThan(docked.headerBottom + docked.shellHeight)

  await page.evaluate(() => {
    const headerRect = document.querySelector('.b225-home-header').getBoundingClientRect()
    const shellRect = document.querySelector('.b225-categories-shell').getBoundingClientRect()
    const welcomeRect = document.querySelector('.b225-welcome').getBoundingClientRect()
    const dockBottom = headerRect.bottom + shellRect.height
    const delta = Math.max(0, welcomeRect.bottom - dockBottom + 18)
    window.scrollBy({ top: delta, behavior: 'auto' })
  })

  await expect.poll(() => page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--movera-category-upward-travel')) || 0)).toBeGreaterThan(8)
  await expect.poll(async () => {
    const [headerBox, shellBox] = await Promise.all([header.boundingBox(), shell.boundingBox()])
    return headerBox && shellBox ? shellBox.y - (headerBox.y + headerBox.height) : 0
  }).toBeLessThan(-5)

  const shellHeight = await shell.evaluate(node => node.getBoundingClientRect().height)
  await page.evaluate((distance) => window.scrollBy({ top: distance + 24, behavior: 'auto' }), shellHeight)
  await expect(shell).toHaveClass(/movera-categories-under-search/)
})

test('forward navigation starts at top and browser Back restores Home scroll', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 850, behavior: 'auto' }))
  const savedScroll = await page.evaluate(() => window.scrollY)
  expect(savedScroll).toBeGreaterThan(500)

  await page.locator('.b225-categories button[data-category-id="beach"]').evaluate(button => button.click())
  await expect(page.getByTestId('page-beach')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1)

  await page.goBack()
  await expect(page.getByTestId('page-home')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(savedScroll - 80)
})

test('closing Search restores Home scroll and releases the document lock', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'auto' }))
  const before = await page.evaluate(() => window.scrollY)
  expect(before).toBeGreaterThan(400)

  await page.locator('.b225-search').click()
  await expect(page.getByTestId('search-transition')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.body.dataset.moveraSearchLock)).toBe('true')

  await page.locator('.movera-st__close').click()
  await expect(page.getByTestId('search-transition')).toHaveCount(0, { timeout: 2500 })
  await expect.poll(() => page.evaluate(() => document.body.dataset.moveraSearchLock || '')).toBe('')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 80)
})
