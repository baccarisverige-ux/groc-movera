import { expect, test } from '@playwright/test'

test('capture Home, Search and Map reference states', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('home-reference.png'), fullPage: true })

  await page.locator('.b225-search').click({ position: { x: 80, y: 25 } })
  await expect.poll(async () => page.getByTestId('search-transition').getAttribute('data-ready')).toBe('true')
  await page.screenshot({ path: testInfo.outputPath('search-reference.png'), fullPage: true })

  await page.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByTestId('search-transition')).toBeHidden()
  await page.getByText('Carte', { exact: true }).last().click()
  await expect(page.getByTestId('page-map')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('map-reference.png'), fullPage: true })
})
