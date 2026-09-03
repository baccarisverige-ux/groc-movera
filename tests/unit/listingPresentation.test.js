import { describe, expect, it } from 'vitest'
import { listingAmenityLabel } from '../../src/entities/listing/listingAmenities.js'
import { listingHighlightBadges } from '../../src/entities/listing/listingHighlights.js'

describe('hotel listing presentation', () => {
  it('keeps every selected hotel highlight in order', () => {
    const badges = listingHighlightBadges(['half-board', 'full-board', 'all-inclusive', 'hammam', 'accessible'])
    expect(badges.map((item) => item.label)).toEqual([
      'Demi-pension',
      'Pension complète',
      'All inclusive',
      'Hammam',
      'Accessible PMR',
    ])
  })

  it('maps hotel amenity ids to public labels', () => {
    expect(listingAmenityLabel('hotel-reception-24h')).toBe('Réception 24h/24')
    expect(listingAmenityLabel('hotel-hammam')).toBe('Hammam')
    expect(listingAmenityLabel('hotel-airport-shuttle')).toBe('Navette aéroport')
  })
})
