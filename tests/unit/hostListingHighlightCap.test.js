import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { activateHostProfile, readHostProfile } from '../../src/entities/host/hostProfileStore.js'
import { HOST_OFFER_FLOWS, getOfferFlow } from '../../src/features/host/onboarding/offer-flows/offerFlowRegistry.js'

const originalWindow = globalThis.window

function installMemoryStorage() {
  const values = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (key) => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
    dispatchEvent: () => true,
    CustomEvent: class { constructor(type) { this.type = type } },
  }
}

afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})

const listingFor = (type, highlights) => ({
  name: 'Villa Saphir',
  city: 'Gammarth',
  type,
  address: '5 rue des Oliviers',
  basePrice: 680,
  guests: 6,
  bedrooms: 3,
  beds: 4,
  bathrooms: 2,
  amenities: ['wifi'],
  description: 'Une villa lumineuse à deux pas de la plage, pensée pour les familles.',
  highlights,
  bookingMode: 'request-first',
  roomTypes: [],
})

describe('published highlights', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  /* The defect this covers: the offer flows were raised to maxHighlights:
     Infinity for all four categories, while the store still normalised
     non-hotel listings down to two. The procedure offered a villa host twenty
     grouped highlights, accepted every tap, and dropped eighteen of them on
     publish -- a screen and a store disagreeing in silence. */
  it('keeps every highlight a category lets the host choose', () => {
    const villa = getOfferFlow('Villa')
    const chosen = villa.highlights.slice(0, 8).map((item) => item.id)
    expect(chosen.length).toBeGreaterThan(2)

    activateHostProfile('user-villa', listingFor('Villa', chosen))
    expect(readHostProfile('user-villa').listing.highlights).toEqual(chosen)
  })

  it('holds the store and the flows to the same limit for every category', () => {
    for (const flow of HOST_OFFER_FLOWS) {
      const chosen = flow.highlights.slice(0, 6).map((item) => item.id)
      const userId = `user-${flow.id}`
      activateHostProfile(userId, listingFor(flow.propertyType, chosen))
      const stored = readHostProfile(userId).listing.highlights
      expect(flow.maxHighlights).toBe(Infinity)
      expect(stored).toEqual(chosen)
    }
  })
})
