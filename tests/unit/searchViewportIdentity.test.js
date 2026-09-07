import { describe, expect, it } from 'vitest'
import { buildMapSearchPath, isUsableViewport } from '../../src/features/search/searchState.js'

describe('Map camera identity', () => {
  it('accepts a complete, in-range viewport', () => {
    expect(isUsableViewport({ lat: 36.8421, lng: 10.2731, zoom: 16 })).toBe(true)
  })

  it('rejects viewports that cannot reproduce a camera', () => {
    expect(isUsableViewport(null)).toBe(false)
    expect(isUsableViewport(undefined)).toBe(false)
    expect(isUsableViewport({})).toBe(false)
    expect(isUsableViewport({ lat: 36.8421, lng: 10.2731 })).toBe(false)
    expect(isUsableViewport({ lat: 36.8421, zoom: 16 })).toBe(false)
    expect(isUsableViewport({ lat: 'x', lng: 10.2731, zoom: 16 })).toBe(false)
  })

  it('rejects out-of-range coordinates and zoom', () => {
    expect(isUsableViewport({ lat: 91, lng: 10.2731, zoom: 16 })).toBe(false)
    expect(isUsableViewport({ lat: 36.8421, lng: 181, zoom: 16 })).toBe(false)
    expect(isUsableViewport({ lat: 36.8421, lng: 10.2731, zoom: 0 })).toBe(false)
    expect(isUsableViewport({ lat: 36.8421, lng: 10.2731, zoom: 21 })).toBe(false)
  })

  it('carries a precise viewport into the Map URL rather than a rounded one', () => {
    const path = buildMapSearchPath({
      destination: { id: 'la-marsa', label: 'Rue du Lac Turkana', viewport: { lat: 36.8421, lng: 10.2731, zoom: 16 } },
      checkin: '2027-01-10',
      checkout: '2027-01-12',
      adults: 2,
      children: 0,
      infants: 0,
      pets: 0,
    })

    const params = new URLSearchParams(path.split('?')[1])
    expect(params.get('lat')).toBe('36.842100')
    expect(params.get('lng')).toBe('10.273100')
    expect(params.get('zoom')).toBe('16')
    expect(params.get('place')).toBe('Rue du Lac Turkana')
  })

  it('omits the camera entirely when it cannot be reproduced', () => {
    const path = buildMapSearchPath({
      destination: { id: 'la-marsa', label: 'La Marsa', viewport: { lat: 36.8421 } },
      checkin: '',
      checkout: '',
      adults: 1,
      children: 0,
      infants: 0,
      pets: 0,
    })

    const params = new URLSearchParams(path.split('?')[1])
    expect(params.get('lat')).toBeNull()
    expect(params.get('lng')).toBeNull()
    expect(params.get('zoom')).toBeNull()
    // Route and filter identity survive even without a camera.
    expect(params.get('destination')).toBe('la-marsa')
    expect(params.get('adults')).toBe('1')
  })

  it('keeps guests and dates out of the camera while keeping them in the URL', () => {
    const destination = { id: 'la-marsa', label: 'Rue du Lac Turkana', viewport: { lat: 36.8421, lng: 10.2731, zoom: 16 } }
    const base = { destination, checkin: '2027-01-10', checkout: '2027-01-12', adults: 2, children: 0, infants: 0, pets: 0 }

    const twoAdults = new URLSearchParams(buildMapSearchPath(base).split('?')[1])
    const threeAdults = new URLSearchParams(buildMapSearchPath({ ...base, adults: 3 }).split('?')[1])

    for (const key of ['lat', 'lng', 'zoom', 'destination', 'place']) {
      expect(threeAdults.get(key)).toBe(twoAdults.get(key))
    }
    expect(threeAdults.get('adults')).toBe('3')
    expect(twoAdults.get('adults')).toBe('2')
  })
})
