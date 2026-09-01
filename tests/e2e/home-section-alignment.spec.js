import { expect, test } from '@playwright/test'

test('all Home sections share the Bienvenue content edge', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-home')).toBeVisible()

  const geometry = await page.evaluate(() => {
    const home = document.querySelector('.b225-home')
    const welcome = document.querySelector('.b225-welcome')
    if (!home || !welcome) throw new Error('Home alignment reference is missing')

    const referenceLeft = welcome.getBoundingClientRect().left
    const targets = []

    const add = (name, node) => {
      if (!node) throw new Error(`Missing alignment target: ${name}`)
      targets.push({ name, left: node.getBoundingClientRect().left })
    }

    add('categories', document.querySelector('.b225-categories button[data-category-id]'))
    add('services title', document.querySelector('[data-testid="home-services-mini"] .b225-services-mini__head h2'))
    add('services cards', document.querySelector('[data-testid="home-services-mini"] .b225-service-mini-card'))

    document.querySelectorAll('.b225-home > .b225-section').forEach((section, index) => {
      const title = section.querySelector('.b225-section__title h2')
      if (title) add(`section ${index + 1} title`, title)

      const content = section.querySelector('.b225-offer-scroll > *, .b225-scroll > *, .b225-experience-grid > *')
      if (content) add(`section ${index + 1} content`, content)
    })

    return {
      homeLeft: home.getBoundingClientRect().left,
      referenceLeft,
      targets,
    }
  })

  expect(geometry.referenceLeft - geometry.homeLeft).toBeCloseTo(16, 0)
  for (const target of geometry.targets) {
    expect(Math.abs(target.left - geometry.referenceLeft), `${target.name} must align with Bienvenue`).toBeLessThanOrEqual(1)
  }
})
