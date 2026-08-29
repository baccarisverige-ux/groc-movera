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

    add('categories', document.querySelector('.b225-categories > button'))
    add('featured title', document.querySelector('[data-testid="home-featured"] .b225-section__title h2'))
    add('featured cards', document.querySelector('[data-testid="home-featured"] .b225-featured-card'))
    add('destinations title', document.querySelector('[data-testid="home-destinations"] .b225-section__title h2'))
    add('destinations cards', document.querySelector('[data-testid="home-destinations"] .b225-city'))
    add('services', document.querySelector('[data-testid="home-services"] .b225-service-card'))

    document.querySelectorAll('.b225-home > .b225-section').forEach((section, index) => {
      const title = section.querySelector('.b225-section__title h2')
      if (title) add(`section ${index + 1} title`, title)

      const content = section.querySelector('.b225-scroll > *, .b225-experience-grid > *')
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
