import { describe, expect, it } from 'vitest'
import { clampViewportToTunisia, TUNISIA_BOUNDS } from '../../src/features/map-engine/geometry/geometry.js'

describe('Tunisia map limits', () => {
  it('keeps a viewport already inside Tunisia unchanged', () => {
    expect(clampViewportToTunisia({ lat: 36.8065, lng: 10.1815, zoom: 11 }))
      .toEqual({ lat: 36.8065, lng: 10.1815, zoom: 11 })
  })

  it('clamps map centers outside Tunisia to the permitted bounds', () => {
    expect(clampViewportToTunisia({ lat: 48.8566, lng: 2.3522, zoom: 9 }))
      .toEqual({ lat: TUNISIA_BOUNDS.north, lng: TUNISIA_BOUNDS.west, zoom: 9 })
    expect(clampViewportToTunisia({ lat: 20, lng: 20, zoom: 9 }))
      .toEqual({ lat: TUNISIA_BOUNDS.south, lng: TUNISIA_BOUNDS.east, zoom: 9 })
  })
})
