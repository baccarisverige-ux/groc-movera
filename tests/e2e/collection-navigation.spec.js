import { expect, test } from '@playwright/test'

const collections = [
  { categoryId: 'beach', route: '/plage', pageTestId: 'page-beach' },
  { categoryId: 'guesthouse', route: '/maison-d-hote', pageTestId: 'page-guesthouse' },
  { categoryId: 'hotel', route: '/hotel', pageTestId: 'page-hotel' },
  { categoryId: 'family', route: '/appartement', pageTestId: 'page-apartment' },
  { categoryId: 'prestige', route: '/villa', pageTestId: 'page-villa' },
]

for (const collection of collections) {
  test(`${collection.categoryId} category opens its collection page with the shared collection shell`, async ({ page }) => {
    await page.goto('/')

    const criticalHeroPreloads = page.locator('link[rel="preload"][as="image"][fetchpriority="high"]')
    await expect(criticalHeroPreloads).toHaveCount(3)
    await expect.poll(async () => page.evaluate(() => {
      const links = [...document.querySelectorAll('link[rel="preload"][as="image"][fetchpriority="high"]')]
      return links.length === 3 && links.every((link) => performance.getEntriesByName(link.href).length > 0)
    })).toBe(true)

    const categoryButton = page.locator(`.b225-categories button[data-category-id="${collection.categoryId}"]`)
    await expect(categoryButton).toHaveCount(1)
    await categoryButton.click()

    await expect(page).toHaveURL(new RegExp(`${collection.route.replaceAll('-', '\\-')}$`))
    await expect(page.getByTestId(collection.pageTestId)).toBeVisible()

    const heroImage = page.locator('.portrait-collection-hero__image')
    await expect(heroImage).toHaveAttribute('loading', 'eager')
    await expect(heroImage).toHaveAttribute('fetchpriority', 'high')
    await expect.poll(() => heroImage.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true)

    const shell = page.locator('.app-shell--guest')
    await expect(shell).toHaveClass(/app-shell--collection/)

    const content = shell.locator(':scope > .app-shell__content')
    await expect.poll(() => content.evaluate((node) => getComputedStyle(node).paddingTop)).toBe('0px')
    await expect.poll(() => content.evaluate((node) => getComputedStyle(node).overflowY)).toBe('auto')

    await expect(shell.locator(':scope > .app-shell__nav .app-shell__nav-item[data-active="true"] span')).toHaveText('Accueil')
  })
}
