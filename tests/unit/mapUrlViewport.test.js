import { describe, expect, it } from 'vitest'
import { mapCameraContextKey, parseMapViewport } from '../../src/features/map/mapUrlViewport.js'

describe('map URL viewport', () => {
  it('accepts a complete bounded viewport', () => {
    const params = new URLSearchParams('lat=36.8782&lng=10.3247&zoom=14')
    expect(parseMapViewport(params)).toEqual({ lat: 36.8782, lng: 10.3247, zoom: 14 })
  })

  it('rejects missing or blank coordinates instead of coercing them to zero', () => {
    expect(parseMapViewport(new URLSearchParams('zoom=13'))).toBeNull()
    expect(parseMapViewport(new URLSearchParams('lat=&lng=&zoom=13'))).toBeNull()
    expect(parseMapViewport(new URLSearchParams('lat=36.8&zoom=13'))).toBeNull()
  })

  it('rejects out-of-range and non-numeric values', () => {
    expect(parseMapViewport(new URLSearchParams('lat=91&lng=10&zoom=13'))).toBeNull()
    expect(parseMapViewport(new URLSearchParams('lat=36&lng=181&zoom=13'))).toBeNull()
    expect(parseMapViewport(new URLSearchParams('lat=36&lng=10&zoom=99'))).toBeNull()
    expect(parseMapViewport(new URLSearchParams('lat=nope&lng=10&zoom=13'))).toBeNull()
  })

  it('changes camera context for a new place or camera inside the same destination', () => {
    const first = new URLSearchParams('destination=la-marsa&place=Rue+A&lat=36.87&lng=10.32&zoom=14&checkin=2026-09-10')
    const second = new URLSearchParams('destination=la-marsa&place=Rue+B&lat=36.88&lng=10.33&zoom=15&checkin=2026-09-10')
    expect(mapCameraContextKey(first)).not.toBe(mapCameraContextKey(second))
  })

  it('does not remount the camera for date-only changes', () => {
    const first = new URLSearchParams('destination=la-marsa&lat=36.87&lng=10.32&zoom=14&checkin=2026-09-10')
    const second = new URLSearchParams('destination=la-marsa&lat=36.87&lng=10.32&zoom=14&checkin=2026-09-20')
    expect(mapCameraContextKey(first)).toBe(mapCameraContextKey(second))
  })
})
