import { clamp, project, screenPoint, unproject } from '../map-engine/geometry/geometry.js'

export const MARKER_PILL_HALF_HEIGHT = 20
export const MARKER_PILL_HALF_WIDTH = 36
const EDGE_MARGIN = 10
const FALLBACK_UNCOVERED_FRACTION = 0.58

export function parseMapSurfaceViewport(surface) {
  if (!surface?.dataset) return null
  const lat = Number(surface.dataset.lat)
  const lng = Number(surface.dataset.lng)
  const zoom = Number(surface.dataset.zoom)
  const width = Number(surface.dataset.width)
  const height = Number(surface.dataset.height)
  if (![lat, lng, zoom, width, height].every(Number.isFinite)) return null
  if (width <= 0 || height <= 0) return null
  return { lat, lng, zoom, width, height }
}

export function uncoveredMapBottom({ surfaceTop, surfaceHeight, popupTop }) {
  if (!Number.isFinite(surfaceHeight) || surfaceHeight <= 0) return 0
  if (!Number.isFinite(popupTop) || !Number.isFinite(surfaceTop)) {
    return surfaceHeight * FALLBACK_UNCOVERED_FRACTION
  }
  return clamp(popupTop - surfaceTop, 80, surfaceHeight)
}

export function panViewportToScreenPoint(viewport, size, marker, target) {
  const point = project(marker.lat, marker.lng, viewport.zoom)
  const center = unproject(
    point.x - target.x + size.width / 2,
    point.y - target.y + size.height / 2,
    viewport.zoom,
  )
  return { lat: center.lat, lng: center.lng, zoom: viewport.zoom }
}

export function markerIsInUncoveredBand(point, size, uncoveredBottom, halfHeight = MARKER_PILL_HALF_HEIGHT, halfWidth = MARKER_PILL_HALF_WIDTH) {
  return point.y - halfHeight >= EDGE_MARGIN
    && point.y + halfHeight <= uncoveredBottom - EDGE_MARGIN
    && point.x - halfWidth >= EDGE_MARGIN
    && point.x + halfWidth <= size.width - EDGE_MARGIN
}

export function panToKeepMarkerAbovePopup({
  viewport,
  size,
  marker,
  uncoveredBottom,
  halfHeight = MARKER_PILL_HALF_HEIGHT,
  halfWidth = MARKER_PILL_HALF_WIDTH,
}) {
  if (!viewport || !size || !marker || !Number.isFinite(uncoveredBottom)) return null
  const point = screenPoint(marker.lat, marker.lng, viewport, size)
  if (markerIsInUncoveredBand(point, size, uncoveredBottom, halfHeight, halfWidth)) return null

  const minY = EDGE_MARGIN + halfHeight
  const maxY = Math.max(minY, uncoveredBottom - EDGE_MARGIN - halfHeight)
  const target = {
    x: clamp(size.width / 2, EDGE_MARGIN + halfWidth, size.width - EDGE_MARGIN - halfWidth),
    y: clamp(uncoveredBottom * 0.5, minY, maxY),
  }
  return panViewportToScreenPoint(viewport, size, marker, target)
}
