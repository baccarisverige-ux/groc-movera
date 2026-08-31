import { describe, expect, it } from 'vitest'
import { listUniqueHomeOffers } from '../../src/features/listing/guestListings.js'
import {
  listingLocationLine,
  listingRatingCopy,
  nextListingId,
  rotateListingsForPopup,
} from '../../src/features/map/mapOfferPopupModel.js'

describe('map offer popup model', () => {
  it('rotates listings so the selected card is first and wraps the rest', () => {
    const listings = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(rotateListingsForPopup(listings, 'b').map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(rotateListingsForPopup(listings, 'c').map((item) => item.id)).toEqual(['c', 'a', 'b'])
    expect(rotateListingsForPopup(listings, 'a')).toBe(listings)
  })

  it('wraps from the last offer to the first', () => {
    const listings = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(nextListingId(listings, 'c')).toBe('a')
    expect(nextListingId(listings, 'a')).toBe('b')
    expect(nextListingId([{ id: 'solo' }], 'solo')).toBe('solo')
  })

  it('formats copy from the canonical seed listing without changing its property type', () => {
    const listing = listUniqueHomeOffers().find((item) => item.id === 'dar-sidi-bleu')
    expect(listingLocationLine(listing)).toBe('Maison d’hôte · Sidi Bou Saïd')
    expect(listingRatingCopy(listing)).toBe('★ 4.91 (41)')
    expect(listing.priceLabel).toBe('380 TND total')
    expect(listing.origin).toBe('seed')
  })
})

describe('guest listing photo galleries', () => {
  it('never manufactures unrelated property photos to fill a gallery', () => {
    const offers = listUniqueHomeOffers()
    for (const offer of offers) {
      expect(Array.isArray(offer.photos)).toBe(true)
      if (offer.image) {
        expect(offer.photos[0]?.src).toBe(offer.image)
      }
      const sources = offer.photos.map((photo) => photo.src)
      expect(new Set(sources).size).toBe(sources.length)
      expect(JSON.stringify(offer.photos)).not.toMatch(/data:image\//)
      expect(offer.dataQuality).toMatch(/^seed-/)
    }

    const seedCardWithoutDetailGallery = offers.find((offer) => offer.id === 'dar-sidi-bleu')
    expect(seedCardWithoutDetailGallery.photos).toHaveLength(1)
  })
})
