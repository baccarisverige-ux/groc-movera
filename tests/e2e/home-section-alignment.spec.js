import { expect, test } from '@playwright/test'

test('Home content aligns with Bienvenue while premium shells keep their approved geometry', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  const geometry = await page.evaluate(() => {
    const home = document.querySelector('.b225-home')
    const welcome = document.querySelector('.b225-welcome')
    const categories = document.querySelector('.b225-categories-shell')
    const servicesRail = document.querySelector('[data-testid="home-services-mini"] .b225-services-mini__rail')
    const firstServiceCard = servicesRail?.querySelector('.b225-service-mini-card')
    if (!home || !welcome || !categories || !servicesRail || !firstServiceCard) throw new Error('Home alignment reference is missing')

    const referenceLeft = welcome.getBoundingClientRect().left
    const targets = []

    const add = (name, node) => {
      if (!node) throw new Error(`Missing alignment target: ${name}`)
      targets.push({ name, left: node.getBoundingClientRect().left })
    }

    add('services title', document.querySelector('[data-testid="home-services-mini"] .b225-services-mini__head h2'))

    document.querySelectorAll('.b225-home > .b225-section').forEach((section, index) => {
      const title = section.querySelector('.b225-section__title h2')
      if (title) add(`section ${index + 1} title`, title)

      const content = section.querySelector('.b225-offer-scroll > *, .b225-scroll > *, .b225-experience-grid > *')
      if (content) add(`section ${index + 1} content`, content)
    })

    const homeBox = home.getBoundingClientRect()
    const serviceCardBox = firstServiceCard.getBoundingClientRect()

    return {
      homeLeft: homeBox.left,
      homeRight: homeBox.right,
      referenceLeft,
      categoriesLeft: categories.getBoundingClientRect().left,
      servicesJustify: getComputedStyle(servicesRail).justifyContent,
      firstServiceCardLeft: serviceCardBox.left,
      firstServiceCardRight: serviceCardBox.right,
      targets,
    }
  })

  const contentInset = geometry.referenceLeft - geometry.homeLeft
  expect(contentInset).toBeGreaterThanOrEqual(10)
  expect(contentInset).toBeLessThanOrEqual(20)
  expect(Math.abs(geometry.categoriesLeft - geometry.referenceLeft), 'premium Categories shell outer inset').toBeLessThanOrEqual(4)
  expect(geometry.servicesJustify, 'mini-services rail keeps its approved centered layout').toBe('center')
  expect(geometry.firstServiceCardLeft).toBeGreaterThanOrEqual(geometry.referenceLeft)
  expect(geometry.firstServiceCardRight).toBeLessThanOrEqual(geometry.homeRight - contentInset)
  for (const target of geometry.targets) {
    expect(Math.abs(target.left - geometry.referenceLeft), `${target.name} must align with Bienvenue`).toBeLessThanOrEqual(2)
  }
})
