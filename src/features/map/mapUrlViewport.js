const MAP_VIEWPORT_LIMITS = Object.freeze({
  lat: Object.freeze([-90, 90]),
  lng: Object.freeze([-180, 180]),
  zoom: Object.freeze([1, 20]),
})

function rawParam(searchParams, key) {
  const raw = searchParams?.get?.(key)
  return raw == null ? '' : String(raw).trim()
}

function boundedParam(searchParams, key, min, max) {
  const raw = rawParam(searchParams, key)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= min && value <= max ? value : null
}

function integerParam(searchParams, key, fallback, minimum = 0) {
  const raw = rawParam(searchParams, key)
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isInteger(value) && value >= minimum ? value : fallback
}

export function parseMapViewport(searchParams) {
  const lat = boundedParam(searchParams, 'lat', ...MAP_VIEWPORT_LIMITS.lat)
  const lng = boundedParam(searchParams, 'lng', ...MAP_VIEWPORT_LIMITS.lng)
  const zoom = boundedParam(searchParams, 'zoom', ...MAP_VIEWPORT_LIMITS.zoom)
  return lat === null || lng === null || zoom === null ? null : { lat, lng, zoom }
}

export function parseMapSearchContext(searchParams) {
  return {
    destination: rawParam(searchParams, 'destination'),
    listing: rawParam(searchParams, 'listing'),
    place: rawParam(searchParams, 'place'),
    searchTriggered: rawParam(searchParams, 'search') === '1',
    checkin: rawParam(searchParams, 'checkin'),
    checkout: rawParam(searchParams, 'checkout'),
    adults: integerParam(searchParams, 'adults', 1, 1),
    children: integerParam(searchParams, 'children', 0),
    infants: integerParam(searchParams, 'infants', 0),
    pets: integerParam(searchParams, 'pets', 0),
    viewport: parseMapViewport(searchParams),
  }
}

export function mapCameraContextKey(searchParams) {
  const context = parseMapSearchContext(searchParams)
  const viewport = context.viewport
  const scope = context.listing
    ? `listing:${context.listing}`
    : context.destination
      ? `destination:${context.destination}`
      : 'grand-tunis'

  // Camera identity is numeric, not textual. Equivalent URL spellings such as
  // 36.8782 and 36.878200 must keep the same mounted Map camera context.
  const lat = viewport?.lat ?? ''
  const lng = viewport?.lng ?? ''
  const zoom = viewport?.zoom ?? ''
  return `${scope}|place:${context.place}|lat:${lat}|lng:${lng}|zoom:${zoom}`
}
