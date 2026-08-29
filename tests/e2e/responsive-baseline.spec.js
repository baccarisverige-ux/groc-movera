import { expect, test } from '@playwright/test'

const viewports = [
  { width: 320, height: 700 },
  { width: 350, height: 760 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
]

const routes = [
  ['home', '/', 'page-home'],
  ['map', '/map', 'page-map'],
  ['plage', '/plage', 'page-beach'],
  ['maison-d-hote', '/maison-d-hote', 'page-guesthouse'],
  ['hotel', '/hotel', 'page-hotel'],
]

for (const viewport of viewports) {
  test.describe(`${viewport.width}px responsive baseline`, () => {
    test.use({ viewport })

    for (const [name, path, testId] of routes) {
      test(`${name} has no document-level horizontal overflow`, async ({ page }) => {
        const pageErrors = []
        page.on('pageerror', (error) => pageErrors.push(error.message))
        await page.goto(path)
        await expect(page.getByTestId(testId)).toBeVisible()
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
        expect(pageErrors).toEqual([])
      })
    }
  })
}
