import { expect, test } from '@playwright/test'

test.describe('Movera core quality', () => {
  test('home loads and primary navigation remains stable', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.locator('.b225-search')).toBeVisible()
    await page.getByText('Carte', { exact: true }).last().click()
    await expect(page.getByTestId('page-map')).toBeVisible()
  })

  test('search transition opens without page scroll and supports address focus', async ({ page }) => {
    await page.goto('/')
    const startScroll = await page.evaluate(() => window.scrollY)
    await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
    const transition = page.getByTestId('search-transition')
    await expect(transition).toBeVisible()
    await expect.poll(async () => transition.getAttribute('data-ready')).toBe('true')

    const input = page.getByLabel('Destination ou adresse')
    await input.focus()
    await expect(input).toBeFocused()
    await expect(transition).toHaveAttribute('data-address-mode', 'true')
    await expect(page.getByText('Adresses populaires')).toBeVisible()
    await expect(page.getByText('Destinations suggérées')).toBeHidden()

    const fontSize = await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(fontSize).toBeGreaterThanOrEqual(16)
    expect(await page.evaluate(() => window.scrollY)).toBe(startScroll)
  })

  test('search flow reaches calendar and voyageurs', async ({ page }) => {
    await page.goto('/')
    await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
    await expect.poll(async () => page.getByTestId('search-transition').getAttribute('data-ready')).toBe('true')
    await page.locator('[data-destination="la-marsa"]').click()
    await expect(page.getByTestId('search-calendar')).toBeVisible()
    expect(await page.locator('.movera-st__calendar-grid .movera-st__day').count()).toBeGreaterThanOrEqual(28)
  })
})
