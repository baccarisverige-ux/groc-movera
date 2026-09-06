import { describe, expect, it } from 'vitest'
import { createMapViewportCommand, normalizeMapViewport, viewportCommandForContext } from '../../src/features/map/mapViewportCommand.js'

describe('map viewport command contract', () => {
  it('normalizes numeric viewport values once', () => {
    expect(normalizeMapViewport({ lat: '36.87', lng: '10.32', zoom: '14' })).toEqual({ lat: 36.87, lng: 10.32, zoom: 14 })
    expect(normalizeMapViewport({ lat: 'x', lng: 10, zoom: 14 })).toBeNull()
  })

  it('creates a canonical command with a caller-controlled revision', () => {
    expect(createMapViewportCommand({ lat: 36.87, lng: 10.32, zoom: 14 }, 123)).toEqual({ lat: 36.87, lng: 10.32, zoom: 14, revision: 123 })
  })

  it('exposes commands only inside their current camera context', () => {
    const command = { lat: 36.87, lng: 10.32, zoom: 14, revision: 123 }
    const state = { contextKey: 'destination:la-marsa', command }
    expect(viewportCommandForContext(state, 'destination:la-marsa')).toBe(command)
    expect(viewportCommandForContext(state, 'destination:tunis')).toBeNull()
  })
})
