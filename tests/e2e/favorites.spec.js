import { expect, test } from '@playwright/test'

test('favorites page starts empty and can be opened from bottom navigation', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('movera:favorites:v1'))
  await page.reload()

  await expect(page.locator('[data-motion-list^="home-"]').first()).toBeVisible()

  const favoritesNav = page.locator('.app-shell__nav-item', { hasText: 'Favoris' })
  await expect(favoritesNav).not.toHaveAttribute('aria-disabled', 'true')
  await favoritesNav.click()

  await expect(page.getByTestId('page-favorites')).toBeVisible()
  await expect(page.locator('.favorites-empty')).toBeVisible()
  await expect(page.locator('.favorites-count')).toHaveText('0')
  await expect(page.locator('.app-shell__nav-item[data-active="true"] span')).toHaveText('Favoris')
})

test('home heart saves an offer and favorites page can remove it', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('movera:favorites:v1'))
  await page.reload()

  const card = page.getByTestId('home-card-all-dar-sidi-bleu')
  const heart = card.locator('.b225-offer-card__heart')
  await expect(heart).toHaveAttribute('aria-pressed', 'false')
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')

  await page.locator('.app-shell__nav-item', { hasText: 'Favoris' }).click()
  await expect(page.getByTestId('page-favorites')).toBeVisible()
  await expect(page.locator('[data-motion-list="favorites"]')).toBeVisible()
  await expect(page.locator('[data-favorite-id="dar-sidi-bleu"]')).toBeVisible()
  await expect(page.locator('.favorites-count')).toHaveText('1')

  await page.reload()
  await expect(page.locator('[data-favorite-id="dar-sidi-bleu"]')).toBeVisible()

  await page.locator('[data-favorite-id="dar-sidi-bleu"] .favorite-card__heart').click()
  await expect(page.locator('[data-favorite-id="dar-sidi-bleu"]')).toHaveCount(0)
  await expect(page.locator('.favorites-empty')).toBeVisible()
  await expect(page.locator('.favorites-count')).toHaveText('0')
})

test('collection heart uses the same persistent favorites store', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('movera:favorites:v1'))
  await page.goto('/Movera-host1/plage')

  await expect(page.locator('[data-motion-list="collection-offers"]')).toBeVisible()

  const firstOffer = page.locator('.beach-offer').first()
  const id = await firstOffer.evaluate((node) => node.querySelector('.beach-offer__heart')?.getAttribute('aria-label'))
  expect(id).toBeTruthy()

  const heart = firstOffer.locator('.beach-offer__heart')
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')

  await page.locator('.app-shell__nav-item', { hasText: 'Favoris' }).click()
  await expect(page.getByTestId('page-favorites')).toBeVisible()
  await expect(page.locator('[data-motion-list="favorites"]')).toBeVisible()
  await expect(page.locator('.favorite-card')).toHaveCount(1)
})
