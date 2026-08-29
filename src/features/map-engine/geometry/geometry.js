export const TILE_SIZE = 256
export const MIN_ZOOM = 3
export const MAX_ZOOM = 18

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeLng(lng) {
  let value = lng
  while (value > 180) value -= 360
  while (value < -180) value += 360
  return value
}

export function project(lat, lng, zoom) {
  const scale = TILE_SIZE * 2 ** zoom
  const sin = Math.sin((clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180)
  const x = ((normalizeLng(lng) + 180) / 360) * scale
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  return { x, y }
}

export function unproject(x, y, zoom) {
  const scale = TILE_SIZE * 2 ** zoom
  const lng = normalizeLng((x / scale) * 360 - 180)
  const n = Math.PI - (2 * Math.PI * y) / scale
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n))
  return { lat: clamp(lat, -85.05112878, 85.05112878), lng }
}

export function panViewport(viewport, dx, dy) {
  const center = project(viewport.lat, viewport.lng, viewport.zoom)
  const next = unproject(center.x - dx, center.y - dy, viewport.zoom)
  return { ...viewport, ...next }
}

export function zoomViewport(viewport, delta) {
  return { ...viewport, zoom: clamp(viewport.zoom + delta, MIN_ZOOM, MAX_ZOOM) }
}

export function zoomViewportAtPoint(viewport, delta, point, size) {
  const zoom = clamp(viewport.zoom + delta, MIN_ZOOM, MAX_ZOOM)
  if (zoom === viewport.zoom) return viewport
  const center = project(viewport.lat, viewport.lng, viewport.zoom)
  const offsetX = point.x - size.width / 2
  const offsetY = point.y - size.height / 2
  const anchor = unproject(center.x + offsetX, center.y + offsetY, viewport.zoom)
  const projectedAnchor = project(anchor.lat, anchor.lng, zoom)
  const nextCenter = unproject(projectedAnchor.x - offsetX, projectedAnchor.y - offsetY, zoom)
  return { ...viewport, ...nextCenter, zoom }
}

export function screenPoint(lat, lng, viewport, size) {
  const point = project(lat, lng, viewport.zoom)
  const center = project(viewport.lat, viewport.lng, viewport.zoom)
  return {
    x: point.x - center.x + size.width / 2,
    y: point.y - center.y + size.height / 2,
  }
}
