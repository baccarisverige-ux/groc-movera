import { describe, expect, it } from 'vitest'
import { listingMapPrice, listingPriceCopy, listingRoomPriceCopy } from '../../src/entities/listing/listingPrice.js'

describe('listing price presentation', () => {
  it('keeps map marker price parsing stable', () => {
    expect(listingMapPrice({ priceTotal: '1 240 TND total' })).toBe('1240 TND')
    expect(listingMapPrice({ nightlyRate: 180, currency: 'TND' })).toBe('180 TND')
    expect(listingMapPrice({})).toBe('TND')
  })

  it('keeps offer sheet price precedence stable', () => {
    expect(listingPriceCopy({ priceLabel: 'Dès 220 TND', priceTotal: '440 TND' })).toBe('Dès 220 TND')
    expect(listingPriceCopy({ priceTotal: '440 TND' })).toBe('440 TND')
    expect(listingPriceCopy({ nightlyRate: 220, currency: 'TND' })).toBe('220 TND')
  })

  it('formats selected room price without changing its copy', () => {
    expect(listingRoomPriceCopy({ currency: 'TND' }, { basePrice: 310 })).toBe('310 TND / nuit')
  })
})
