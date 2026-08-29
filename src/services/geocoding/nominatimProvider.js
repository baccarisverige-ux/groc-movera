const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const DEFAULT_LANGUAGE = 'fr'
const DEFAULT_COUNTRY_CODE = 'tn'

function assertCoordinates(lat, lng) {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError('Valid latitude and longitude are required')
  }
  return { lat: latitude, lng: longitude }
}

async function requestJson(url, signal, label) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`)
  return response.json()
}

export async function nominatimSearch(query, {
  signal,
  countryCode = DEFAULT_COUNTRY_CODE,
  language = DEFAULT_LANGUAGE,
  limit = 15,
} = {}) {
  const text = String(query || '').trim()
  if (text.length < 3) return []

  const url = new URL(`${NOMINATIM_BASE}/search`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('namedetails', '1')
  url.searchParams.set('extratags', '1')
  url.searchParams.set('dedupe', '1')
  url.searchParams.set('limit', String(limit))
  if (countryCode) url.searchParams.set('countrycodes', String(countryCode).toLowerCase())
  url.searchParams.set('accept-language', language)
  url.searchParams.set('q', text)

  const data = await requestJson(url, signal, 'Nominatim search')
  return Array.isArray(data) ? data : []
}

export async function nominatimReverse({
  lat,
  lng,
  signal,
  language = DEFAULT_LANGUAGE,
  zoom = 18,
} = {}) {
  const coordinates = assertCoordinates(lat, lng)
  const url = new URL(`${NOMINATIM_BASE}/reverse`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', String(zoom))
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('namedetails', '1')
  url.searchParams.set('extratags', '1')
  url.searchParams.set('accept-language', language)
  url.searchParams.set('lat', String(coordinates.lat))
  url.searchParams.set('lon', String(coordinates.lng))

  return requestJson(url, signal, 'Nominatim reverse')
}

export const NOMINATIM_PROVIDER = Object.freeze({
  search: nominatimSearch,
  reverse: nominatimReverse,
})
