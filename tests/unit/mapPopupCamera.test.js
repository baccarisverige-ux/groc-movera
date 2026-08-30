import { describe, expect, it } from 'vitest'
import { screenPoint } from '../../src/features/map-engine/geometry/geometry.js'
import {
  MARKER_PILL_HALF_HEIGHT,
  markerIsInUncoveredBand,
  panToKeepMarkerAbovePopup,
  panViewportToScreenPoint,
  parseMapSurfaceViewport,
  uncoveredMapBottom,
} from '../../src/features/map/mapPopupCamera.js'

const viewport = Object.freeze({ lat: 36.8782, lng: 10.3247, zoom: 13 })
const size = Object.freeze({ width: 390, height: 700 })

describe('map popup camera pan-without-zoom', () => {
  it('parses map-surface data attributes', () => {
    expect(parseMapSurfaceViewport({
      dataset: { lat: '36.878200', lng: '10.324700', zoom: '13', width: '390', height: '700' },
    })).toEqual({ lat: 36.8782, lng: 10.3247, zoom: 13, width: 390, height: 700 })
    expect(parseMapSurfaceViewport(null)).toBeNull()
  })

  it('measures the uncovered band from the popup top', () => {
    expect(uncoveredMapBottom({ surfaceTop: 80, surfaceHeight: 700, popupTop: 430 })).toBe(350)
    expect(uncoveredMapBottom({ surfaceTop: 80, surfaceHeight: 700, popupTop: Number.NaN })).toBeCloseTo(406, 5)
  })

  it('keeps zoom exactly when placing a marker on screen', () => {
    const marker = { lat: 36.85, lng: 10.31 }
    const next = panViewportToScreenPoint(viewport, size, marker, { x: 195, y: 180 })
    expect(next.zoom).toBe(13)
    const point = screenPoint(marker.lat, marker.lng, next, size)
    expect(point.x).toBeCloseTo(195, 5)
    expect(point.y).toBeCloseTo(180, 5)
  })

  it('returns null when the selected pill is already in the uncovered band', () => {
    const marker = { lat: viewport.lat, lng: viewport.lng }
    const next = panToKeepMarkerAbovePopup({
      viewport,
      size,
      marker,
      uncoveredBottom: 500,
    })
    expect(next).toBeNull()
    const point = screenPoint(marker.lat, marker.lng, viewport, size)
    expect(markerIsInUncoveredBand(point, size, 500)).toBe(true)
  })

  it('pans without zooming so a covered marker sits in the uncovered band', () => {
    const marker = { lat: 36.84, lng: 10.32 }
    const uncoveredBottom = 360
    const covered = screenPoint(marker.lat, marker.lng, viewport, size)
    expect(covered.y + MARKER_PILL_HALF_HEIGHT).toBeGreaterThan(uncoveredBottom)

    const next = panToKeepMarkerAbovePopup({ viewport, size, marker, uncoveredBottom })
    expect(next).not.toBeNull()
    expect(next.zoom).toBe(viewport.zoom)
    expect(next.lat).not.toBeCloseTo(viewport.lat, 4)

    const point = screenPoint(marker.lat, marker.lng, next, size)
    expect(point.y + MARKER_PILL_HALF_HEIGHT).toBeLessThan(uncoveredBottom)
    expect(point.y - MARKER_PILL_HALF_HEIGHT).toBeGreaterThan(0)
    expect(markerIsInUncoveredBand(point, size, uncoveredBottom)).toBe(true)
  })
})
