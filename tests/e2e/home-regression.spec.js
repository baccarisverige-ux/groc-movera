import { expect, test } from '@playwright/test'

test('home keeps its current category structure, media and approved navigation stable', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  const categoryIds = ['all', 'guesthouse', 'beach', 'hotel', 'family', 'prestige', 'experience', 'partner']
  const categoryRail = page.getByTestId('home-categories')
  const categoryTrack = categoryRail.locator('.b225-categories-track')
  await expect(categoryTrack).toBeVisible()
  await expect(categoryRail.locator('button[data-category-id]')).toHaveCount(8)
  await expect(page.locator('.b225-category-swipe-hint')).toHaveCount(1)

  for (const id of categoryIds) {
    const button = categoryRail.locator(`button[data-category-id="${id}"]`)
    await expect(button).toHaveCount(1)
    await expect(button).toBeVisible()
    const icon = button.locator('img')
    await expect(icon).toHaveCount(1)
    await expect.poll(() => icon.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
  }

  await expect.poll(() => categoryRail.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true)
  await categoryRail.evaluate(node => { node.scrollLeft = node.scrollWidth })
  await expect.poll(() => categoryRail.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)
  await categoryRail.evaluate(node => { node.scrollLeft = 0 })

  await expect(page.getByTestId('home-welcome-cities').locator('.b225-welcome-city')).toHaveCount(7)
  await expect(page.locator('[data-category-selection]')).toHaveCount(8)
  for (const id of categoryIds) {
    expect(await page.getByTestId(`home-selection-${id}`).locator('.b225-offer-card').count()).toBeGreaterThan(0)
  }

  for (const id of ['family', 'prestige', 'experience', 'partner']) {
    const button = categoryRail.locator(`button[data-category-id="${id}"]`)
    await button.click()
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(button).toHaveAttribute('data-active', 'true')
  }
  await categoryRail.locator('button[data-category-id="all"]').click()

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)

  const nav = page.locator('.app-shell--guest > .app-shell__nav')
  await expect(nav).toBeVisible()
  await expect(nav.locator('.app-shell__nav-item')).toHaveCount(5)
  for (const label of ['Accueil', 'Carte', 'Favoris', 'Profil']) {
    if (label !== 'Accueil') await nav.locator('.app-shell__nav-item', { hasText: label }).click()
    await expect(page.locator('.app-shell--guest > .app-shell__nav .app-shell__nav-item[data-active="true"] span')).toHaveText(label)
  }
  await expect(nav.locator('.app-shell__nav-item', { hasText: 'Messages' })).toHaveAttribute('aria-disabled', 'true')
  expect(errors).toEqual([])
})

test('Bienvenue city cards open their exact map destination', async ({ page }) => {
  for (const id of ['sidi-bou-said', 'sousse', 'hammamet', 'tunis', 'djerba', 'tozeur', 'tabarka']) {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    const city = page.locator(`.b225-welcome-city[data-city-id="${id}"]`)
    await expect(city).toBeVisible()
    await city.click()
    await expect(page.getByTestId('page-map')).toBeVisible()
    await expect(page.getByTestId('page-map')).toHaveAttribute('data-destination', id)
    await expect(page).toHaveURL(new RegExp(`/map\\?destination=${id}$`))
  }
})

test('critical collection pages contain no broken project images', async ({ page }) => {
  for (const route of ['/', '/plage', '/maison-d-hote', '/hotel']) {
    await page.goto(route === '/' ? '/' : `/Movera-host1${route}`)
    await expect(page.locator('img')).not.toHaveCount(0)
    await page.waitForTimeout(1_000)

    const brokenImages = await page.locator('img').evaluateAll(images => images
      .filter(image => new URL(image.currentSrc || image.src).origin === window.location.origin)
      .filter(image => !image.complete || image.naturalWidth === 0)
      .map(image => image.currentSrc || image.src))

    expect(brokenImages, `${route}: broken image sources`).toEqual([])
  }

  await page.goto('/')
  const villaCategoryIcon = page.locator('.b225-category-icon[data-category-icon="prestige"]')
  await expect(villaCategoryIcon).toBeVisible()
  await expect.poll(() => villaCategoryIcon.evaluate(image => image.naturalWidth)).toBeGreaterThan(0)
})

test('separate collection routes keep their own identity and shared filtering', async ({ page }) => {
  for (const collection of [
    { route: '/plage', testId: 'page-beach', title: /La Tunisie\s*côté mer\./, city: 'Gammarth', expectOffers: true },
    { route: '/maison-d-hote', testId: 'page-guesthouse', title: /L’accueil tunisien,\s*autrement\./, city: 'La Marsa', expectOffers: true },
    { route: '/hotel', testId: 'page-hotel', title: /L’hôtel,\s*autrement\./, city: 'Tunis', expectOffers: false },
  ]) {
    await page.goto(`/Movera-host1${collection.route}`)
    await expect(page.getByTestId(collection.testId)).toBeVisible()
    await expect(page.locator('.app-shell__header')).toBeVisible()
    await expect(page.locator('.app-shell__header strong')).toHaveText('Movera')
    await expect(page.locator('.beach-hero__top, .beach-glass-button, .beach-hero__counter')).toHaveCount(0)
    const hero = page.locator('.portrait-collection-hero__image')
    await expect(hero).toHaveAttribute('src', /hero-.*\.webp$/)
    await expect.poll(() => hero.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(collection.title)
    await page.getByLabel('Ville en Tunisie').fill(collection.city)
    await expect(page.locator('.beach-results__head > div > span')).toHaveText(`Séjours à ${collection.city}`)
    if (collection.expectOffers) expect(await page.locator('.beach-offer').count()).toBeGreaterThan(0)
    else await expect(page.locator('.beach-empty')).toBeVisible()
  }
})

test('category shell stays static above Welcome after returning to Home', async ({ page }) => {
  await page.goto('/')
  await page.locator('.b225-categories button[data-category-id="beach"]').click()
  await expect(page.getByTestId('page-beach')).toBeVisible()
  await page.getByRole('button', { name: 'Retour à l’accueil' }).click()
  await expect(page.getByTestId('page-home')).toBeVisible()

  const shell = page.locator('.b225-categories-shell')
  const welcome = page.locator('.b225-welcome')
  await expect.poll(() => shell.evaluate(node => getComputedStyle(node).position)).toBe('relative')
  await expect.poll(async () => {
    const shellBox = await shell.boundingBox()
    const welcomeBox = await welcome.boundingBox()
    return Boolean(shellBox && welcomeBox && shellBox.y + shellBox.height <= welcomeBox.y + 2)
  }).toBe(true)
})

test('Plage, Maison and Hôtel selections remain active after returning Home', async ({ page }) => {
  for (const category of [
    { id: 'beach', pageTestId: 'page-beach' },
    { id: 'guesthouse', pageTestId: 'page-guesthouse' },
    { id: 'hotel', pageTestId: 'page-hotel' },
  ]) {
    await page.goto('/')
    const button = page.locator(`.b225-categories button[data-category-id="${category.id}"]`)
    await button.click()
    await expect(page.getByTestId(category.pageTestId)).toBeVisible()
    await page.goBack()
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.locator(`.b225-categories button[data-category-id="${category.id}"]`)).toHaveAttribute('data-active', 'true')
  }
})