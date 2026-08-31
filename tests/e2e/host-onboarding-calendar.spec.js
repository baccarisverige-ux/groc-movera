import { expect, test } from '@playwright/test'

const HOST_PROFILES_KEY = 'movera:host-profiles:v1'
const HOST_CALENDAR_KEY = 'movera:host-calendar:v1'
const HOST_DRAFT_KEY = 'movera:host-onboarding-drafts:v1'

async function clearHostState(page) {
  await page.evaluate(([profilesKey, calendarKey, draftKey]) => {
    window.localStorage.removeItem(profilesKey)
    window.localStorage.removeItem(calendarKey)
    window.localStorage.removeItem(draftKey)
  }, [HOST_PROFILES_KEY, HOST_CALENDAR_KEY, HOST_DRAFT_KEY])
}

async function continueOnboarding(page) {
  await page.getByRole('button', { name: 'Continuer' }).click()
}

test('first-time traveler completes the full Movera host procedure before reaching the host workspace and calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  await expect(page.getByTestId('switch-to-hosting')).toContainText('Passer en mode Hôte')

  await clearHostState(page)
  await page.reload()
  await expect(page.getByTestId('switch-to-hosting')).toContainText('Passer en mode Hôte')
  await page.getByTestId('switch-to-hosting').click()

  await expect(page).toHaveURL(/\/host$/)
  const onboarding = page.getByTestId('host-onboarding')
  await expect(onboarding).toBeVisible()
  await expect(onboarding).toHaveAttribute('data-screen', 'intro-place')
  await expect(page.locator('.app-shell__nav')).toHaveCount(0)

  await page.getByRole('button', { name: 'Commencer' }).click()

  await expect(onboarding).toHaveAttribute('data-screen', 'property-type')
  await page.getByRole('radio', { name: 'Villa' }).click()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'guest-access')
  await page.getByRole('radio', { name: /Logement entier/ }).click()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'address')
  await page.getByLabel('Adresse du logement').fill('12 rue du Littoral')
  await page.getByLabel('Ville du logement').fill('La Marsa')
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'pin')
  await page.getByRole('button', { name: 'Confirmer cet emplacement' }).click()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'basics')
  await page.getByRole('button', { name: 'Augmenter Voyageurs' }).click()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'intro-presentation')
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'amenities')
  await expect(page.getByRole('heading', { name: 'Les indispensables' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Confort apprécié' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Équipements & services' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cadre & emplacement' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Sèche-linge/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Machine à café/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Borne de recharge/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Accès plage/ })).toBeVisible()
  await page.getByRole('button', { name: 'Piscine' }).click()
  await page.getByRole('button', { name: 'Télévision' }).click()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'photos')
  await expect(page.getByTestId('host-photo-placeholders').locator('> div')).toHaveCount(5)
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'title')
  await page.getByLabel('Titre de l’annonce').fill('Villa Saphir — Front de mer')
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'highlights')
  await page.getByRole('button', { name: 'Calme' }).click()
  await page.getByRole('button', { name: 'Élégant' }).click()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'description')
  await page.getByLabel('Description du logement').fill('Une villa lumineuse avec de beaux espaces extérieurs, proche de la mer et pensée pour un séjour confortable.')
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'safety')
  await page.getByLabel('Détecteur de fumée').check()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'intro-publish')
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'booking')
  await page.getByRole('radio', { name: /Approuver les premières réservations/ }).click()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'price')
  await page.getByLabel('Prix par nuit').fill('220')
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'promotions')
  await page.getByRole('button', { name: /Réduction semaine/ }).click()
  await continueOnboarding(page)

  await expect(onboarding).toHaveAttribute('data-screen', 'review')
  await page.locator('.host-onboarding__check input').nth(0).check()
  await page.locator('.host-onboarding__check input').nth(1).check()
  await page.getByRole('button', { name: 'Publier le logement' }).click()

  const workspace = page.getByTestId('host-workspace')
  await expect(workspace).toHaveAttribute('data-view', 'dashboard')
  await expect(workspace).toContainText('Villa Saphir — Front de mer')
  await page.getByRole('navigation', { name: 'Navigation Hôte' }).getByRole('button', { name: 'Calendrier' }).click()

  const calendarPage = page.getByTestId('host-calendar-page')
  await expect(calendarPage).toBeVisible()
  await expect(calendarPage).toContainText('Villa Saphir — Front de mer')
  await expect(calendarPage).toContainText('220 TND')
  await expect(page.locator('.host-calendar__dow')).toHaveCount(7)

  const hostProfile = await page.evaluate((key) => window.localStorage.getItem(key), HOST_PROFILES_KEY)
  expect(hostProfile).toContain('Villa Saphir')
  expect(hostProfile).toContain('12 rue du Littoral')
  expect(hostProfile).toContain('pool')
  expect(hostProfile).toContain('smokeAlarm')
  expect(hostProfile).toContain('"status":"active"')

  const draft = await page.evaluate((key) => window.localStorage.getItem(key), HOST_DRAFT_KEY)
  expect(draft).not.toContain('Villa Saphir')
})

test('host onboarding draft resumes the last logical screen after save and exit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  await clearHostState(page)
  await page.reload()
  await page.getByTestId('switch-to-hosting').click()
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.getByRole('radio', { name: 'Villa' }).click()
  await continueOnboarding(page)
  await page.getByRole('radio', { name: /Logement entier/ }).click()
  await continueOnboarding(page)
  await page.getByLabel('Adresse du logement').fill('7 avenue de Carthage')
  await page.getByLabel('Ville du logement').fill('Tunis')
  await page.getByRole('button', { name: 'Enregistrer et quitter' }).click()

  await expect(page).toHaveURL(/\/profile$/)
  await page.getByTestId('switch-to-hosting').click()
  await expect(page.getByTestId('host-onboarding')).toHaveAttribute('data-screen', 'address')
  await expect(page.getByLabel('Adresse du logement')).toHaveValue('7 avenue de Carthage')
})

test('host calendar supports month navigation, day pricing, blocking and booking detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()

  await page.evaluate(([profilesKey, calendarKey]) => {
    const userId = 'movera-demo-user'
    window.localStorage.setItem(profilesKey, JSON.stringify({
      [userId]: {
        status: 'active',
        userId,
        createdAt: new Date().toISOString(),
        listing: { id: 'primary-listing', name: 'Villa Saphir — Front de mer', city: 'La Marsa', type: 'Villa', basePrice: 220, currency: 'TND' },
      },
    }))
    window.localStorage.removeItem(calendarKey)
  }, [HOST_PROFILES_KEY, HOST_CALENDAR_KEY])

  await page.goto('/groc-movera/host/calendar')
  const calendarPage = page.getByTestId('host-calendar-page')
  await expect(calendarPage).toBeVisible()

  const monthTitle = page.locator('.host-calendar__monthbar strong')
  const before = await monthTitle.innerText()
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  await expect(monthTitle).not.toHaveText(before)
  await page.getByRole('button', { name: 'Aujourd’hui' }).click()

  const freeDay = page.locator('[data-calendar-day="9"]')
  await freeDay.click()
  const editor = page.getByTestId('host-day-editor')
  await expect(editor).toBeVisible()
  await page.getByLabel('Prix des dates sélectionnées').fill('250')
  await editor.getByRole('button', { name: 'Bloqué' }).click()
  await editor.getByRole('button', { name: 'Appliquer' }).click()
  await expect(freeDay.locator('.host-calendar__price')).toHaveText('—')

  const persisted = await page.evaluate((key) => window.localStorage.getItem(key), HOST_CALENDAR_KEY)
  expect(persisted).toContain('250')
  expect(persisted).toContain('"blocked":true')

  await page.reload()
  await expect(page.locator('[data-calendar-day="9"] .host-calendar__price')).toHaveText('—')

  await page.locator('[data-calendar-day="4"]').click()
  const bookingSheet = page.getByTestId('host-booking-sheet')
  await expect(bookingSheet).toBeVisible()
  await expect(bookingSheet).toContainText('Bilel Ben Ali')
  await expect(bookingSheet).toContainText('1 260 TND')
})

test('existing host sees direct host workspace access in profile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()
  await page.evaluate((key) => {
    const userId = 'movera-demo-user'
    window.localStorage.setItem(key, JSON.stringify({
      [userId]: {
        status: 'active',
        userId,
        createdAt: new Date().toISOString(),
        listing: { id: 'primary-listing', name: 'Dar Movera', city: 'Tunis', type: 'Appartement', basePrice: 180, currency: 'TND' },
      },
    }))
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }, HOST_PROFILES_KEY)

  await expect(page.getByTestId('switch-to-hosting')).toContainText('Ouvrir l’espace Hôte')
  await expect(page.getByTestId('restart-host-onboarding')).toContainText('Recommencer')
  await page.getByTestId('switch-to-hosting').click()
  await expect(page.getByTestId('host-workspace')).toHaveAttribute('data-view', 'dashboard')
  await expect(page.getByTestId('host-workspace')).toContainText('Dar Movera')
  await page.getByRole('navigation', { name: 'Navigation Hôte' }).getByRole('button', { name: 'Calendrier' }).click()
  await expect(page.getByTestId('host-calendar-page')).toBeVisible()
})

test('demo host can reset only host test data and restart Devenir hôte from the beginning', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groc-movera/profile')
  await page.getByTestId('profile-test-login').click()

  await page.evaluate(([profilesKey, calendarKey]) => {
    const userId = 'movera-demo-user'
    window.localStorage.setItem(profilesKey, JSON.stringify({
      [userId]: {
        status: 'active',
        userId,
        createdAt: new Date().toISOString(),
        listing: { id: 'primary-listing', name: 'Test Host', city: 'Tunis', type: 'Appartement', basePrice: 180, currency: 'TND' },
      },
    }))
    window.localStorage.setItem(calendarKey, JSON.stringify({ [userId]: { days: { '2026-08-20': { price: 250, blocked: true } } } }))
  }, [HOST_PROFILES_KEY, HOST_CALENDAR_KEY])
  await page.reload()

  const restart = page.getByTestId('restart-host-onboarding')
  await expect(restart).toBeVisible()
  await restart.click()

  await expect(page).toHaveURL(/\/host$/)
  await expect(page.getByTestId('host-onboarding')).toHaveAttribute('data-screen', 'intro-place')

  const state = await page.evaluate(([profilesKey, calendarKey]) => ({
    profiles: window.localStorage.getItem(profilesKey),
    calendar: window.localStorage.getItem(calendarKey),
  }), [HOST_PROFILES_KEY, HOST_CALENDAR_KEY])
  expect(state.profiles).not.toContain('Test Host')
  expect(state.calendar).not.toContain('2026-08-20')
})
