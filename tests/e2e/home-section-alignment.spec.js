import { expect, test } from '@playwright/test'

test('Home content aligns with Bienvenue while the premium category shell keeps its approved geometry', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  const geometry = await page.evaluate(() => {
    const home = document.querySelector('.b225-home')
    const welcome = document.querySelector('.b225-welcome')
    const categories = document.querySelector('.b225-categories-shell')
    if (!home || !welcome || !categories) throw new Error('Home alignment reference is missing')

    const referenceLeft = welcome.getBoundingClientRect().left
    const targets = []

    const add = (name, node) => {
      if (!node) throw new Error(`Missing alignment target: ${name}`)
      targets.push({ name, left: node.getBoundingClientRect().left })
    }

    document.querySelectorAll('.b225-home > .b225-section').forEach((section, index) => {
      const title = section.querySelector('.b225-section__title h2')
      if (title) add(`section ${index + 1} title`, title)

      const content = section.querySelector('.b225-offer-scroll > *, .b225-scroll > *, .b225-experience-grid > *')
      if (content) add(`section ${index + 1} content`, content)
    })

    const homeBox = home.getBoundingClientRect()
    return {
      homeLeft: homeBox.left,
      referenceLeft,
      categoriesLeft: categories.getBoundingClientRect().left,
      targets,
    }
  })

  const contentInset = geometry.referenceLeft - geometry.homeLeft
  expect(contentInset).toBeGreaterThanOrEqual(10)
  expect(contentInset).toBeLessThanOrEqual(20)
  expect(Math.abs(geometry.categoriesLeft - geometry.referenceLeft), 'premium Categories shell outer inset').toBeLessThanOrEqual(4)
  for (const target of geometry.targets) {
    expect(Math.abs(target.left - geometry.referenceLeft), `${target.name} must align with Bienvenue`).toBeLessThanOrEqual(2)
  }
})
