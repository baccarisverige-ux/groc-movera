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

  it('formats French location and rating copy', () => {
    const listing = listUniqueHomeOffers().find((item) => item.id === 'dar-sidi-bleu')
    expect(listingLocationLine(listing)).toBe('Maison entière · Sidi Bou Saïd')
    expect(listingRatingCopy(listing)).toBe('★ 4.91 (41)')
    expect(listing.priceLabel).toBe('380 TND total')
  })
})

describe('guest listing photo galleries', () => {
  it('keeps the Home card as photo 0 and adds two Unsplash extras per listing', () => {
    const offers = listUniqueHomeOffers()
    const secondPhotos = new Set()
    for (const offer of offers) {
      expect(offer.photos.length).toBeGreaterThanOrEqual(3)
      expect(offer.photos[0].src).toBe(offer.image)
      expect(offer.photos[1].src).toContain('images.unsplash.com')
      expect(offer.photos[2].src).toContain('images.unsplash.com')
      expect(offer.photos[1].src).not.toBe(offer.photos[0].src)
      expect(offer.photos[2].src).not.toBe(offer.photos[0].src)
      expect(offer.photos[1].src).not.toBe(offer.photos[2].src)
      secondPhotos.add(offer.photos[1].src)
      const json = JSON.stringify(offer.photos)
      expect(json).not.toMatch(/data:image\//)
    }
    expect(secondPhotos.size).toBeGreaterThan(1)
  })
})
