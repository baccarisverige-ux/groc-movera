import { describe, expect, it } from 'vitest'
import { LISTING_MAP_POSITIONS } from '../../src/entities/listing/listingMapPositions.js'
import { listUniqueHomeOffers } from '../../src/features/listing/guestListings.js'
import { listingMatchesMapFilters } from '../../src/features/map/mapListingFilters.js'

const GRAND_TUNIS = new Set(['La Marsa', 'Sidi Bou Saïd', 'Gammarth', 'Carthage', 'Tunis'])
const LA_MARSA_IDS = ['maison-jasmin', 'sea-breeze-marsa', 'apartment-marsa', 'partner-marsa']

describe('Home offers on the map', () => {
  it('gives every unique Home offer a map position', () => {
    const offers = listUniqueHomeOffers()
    expect(offers).toHaveLength(28)
    for (const offer of offers) {
      expect(LISTING_MAP_POSITIONS[offer.id], offer.id).toBeTruthy()
      expect(offer.priceLabel).toMatch(/TND/)
      expect(offer.priceLabel).not.toMatch(/€|EUR/i)
    }
  })

  it('counts Grand Tunis and La Marsa Home offers', () => {
    const offers = listUniqueHomeOffers()
    const grandTunis = offers.filter((item) => GRAND_TUNIS.has(item.location))
    const laMarsa = offers.filter((item) => item.location === 'La Marsa')
    expect(grandTunis).toHaveLength(16)
    expect(grandTunis[0].id).toBe('dar-sidi-bleu')
    expect(laMarsa.map((item) => item.id).sort()).toEqual([...LA_MARSA_IDS].sort())
  })

  it('does not invent amenities for a seed card that never supplied them', () => {
    const listing = listUniqueHomeOffers().find((item) => item.id === 'dar-sidi-bleu')
    expect(listing.amenities).toEqual([])
    expect(listingMatchesMapFilters(listing, new Set(['wifi']))).toBe(false)
    expect(listingMatchesMapFilters(listing, new Set(['tv']))).toBe(false)
    expect(listingMatchesMapFilters(listing, new Set(['ac']))).toBe(false)
    expect(listingMatchesMapFilters(listing, new Set(['pool']))).toBe(false)
  })
})
