const MAP_VIEWPORT_LIMITS = Object.freeze({
  lat: Object.freeze([-90, 90]),
  lng: Object.freeze([-180, 180]),
  zoom: Object.freeze([1, 20]),
})

function boundedParam(searchParams, key, min, max) {
  const raw = searchParams?.get?.(key)
  if (raw == null || String(raw).trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= min && value <= max ? value : null
}

export function parseMapViewport(searchParams) {
  const lat = boundedParam(searchParams, 'lat', ...MAP_VIEWPORT_LIMITS.lat)
  const lng = boundedParam(searchParams, 'lng', ...MAP_VIEWPORT_LIMITS.lng)
  const zoom = boundedParam(searchParams, 'zoom', ...MAP_VIEWPORT_LIMITS.zoom)
  return lat === null || lng === null || zoom === null ? null : { lat, lng, zoom }
}

export function mapCameraContextKey(searchParams) {
  const destination = searchParams?.get?.('destination')?.trim() || ''
  const listing = searchParams?.get?.('listing')?.trim() || ''
  const place = searchParams?.get?.('place')?.trim() || ''
  const lat = searchParams?.get?.('lat')?.trim() || ''
  const lng = searchParams?.get?.('lng')?.trim() || ''
  const zoom = searchParams?.get?.('zoom')?.trim() || ''
  const scope = listing ? `listing:${listing}` : destination ? `destination:${destination}` : 'grand-tunis'
  return `${scope}|place:${place}|lat:${lat}|lng:${lng}|zoom:${zoom}`
}
