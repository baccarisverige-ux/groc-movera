import { describe, expect, it } from 'vitest'
import { screenPoint } from '../../src/features/map-engine/geometry/geometry.js'
import { listingMatchesMapFilters } from '../../src/features/map/mapListingFilters.js'
import { nextListingId, rotateListingsForPopup } from '../../src/features/map/mapOfferPopupModel.js'
import { markerIsInUncoveredBand, panToKeepMarkerAbovePopup } from '../../src/features/map/mapPopupCamera.js'

describe('Map discovery integration', () => {
  it('keeps filtering, popup ordering and camera focus consistent across module boundaries', () => {
    const candidates = [
      { id: 'integration-a', amenities: ['Wi-Fi', 'Parking'] },
      { id: 'integration-b', amenities: ['Wi-Fi', 'Parking', 'Piscine'] },
      { id: 'integration-c', amenities: ['Wi-Fi'] },
    ]

    const activeFilters = new Set(['wifi', 'parking'])
    const visible = candidates.filter((listing) => listingMatchesMapFilters(listing, activeFilters))
    expect(visible.map((listing) => listing.id)).toEqual(['integration-a', 'integration-b'])

    const ordered = rotateListingsForPopup(visible, 'integration-b')
    expect(ordered.map((listing) => listing.id)).toEqual(['integration-b', 'integration-a'])
    expect(nextListingId(ordered, 'integration-b')).toBe('integration-a')

    const viewport = { lat: 36.8782, lng: 10.3247, zoom: 13 }
    const size = { width: 390, height: 700 }
    const marker = { lat: 36.84, lng: 10.32 }
    const uncoveredBottom = 360

    const focusedViewport = panToKeepMarkerAbovePopup({ viewport, size, marker, uncoveredBottom })
    expect(focusedViewport).not.toBeNull()
    expect(focusedViewport.zoom).toBe(viewport.zoom)

    const focusedPoint = screenPoint(marker.lat, marker.lng, focusedViewport, size)
    expect(markerIsInUncoveredBand(focusedPoint, size, uncoveredBottom)).toBe(true)
  })
})
