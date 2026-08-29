import { describe, expect, it } from 'vitest'
import {
  getCollectionRouteForCategory,
  getGuestNavigationPath,
  isGuestCollectionRoute,
} from '../../src/shared/navigation/guestCollectionRoutes.js'

describe('guest collection route contract', () => {
  it('maps navigable Home categories to their collection pages', () => {
    expect(getCollectionRouteForCategory('beach')).toBe('/plage')
    expect(getCollectionRouteForCategory('guesthouse')).toBe('/maison-d-hote')
    expect(getCollectionRouteForCategory('hotel')).toBe('/hotel')
    expect(getCollectionRouteForCategory('family')).toBe('/appartement')
    expect(getCollectionRouteForCategory('prestige')).toBe('/villa')
    expect(getCollectionRouteForCategory('all')).toBeNull()
  })

  it('keeps every collection page under the Accueil navigation context', () => {
    for (const path of ['/plage', '/maison-d-hote', '/hotel', '/appartement', '/villa']) {
      expect(isGuestCollectionRoute(path)).toBe(true)
      expect(getGuestNavigationPath(path)).toBe('/')
    }
    expect(isGuestCollectionRoute('/map')).toBe(false)
    expect(getGuestNavigationPath('/map')).toBe('/map')
  })
})
