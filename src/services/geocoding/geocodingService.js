import { NOMINATIM_PROVIDER } from './nominatimProvider.js'

const TUNISIA_COUNTRY_CODE = 'tn'

function normalize(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function uniqueParts(parts) {
  const seen = new Set()
  return parts.filter((value) => {
    const key = normalize(value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isTunisiaResult(result) {
  const code = String(result?.address?.country_code || result?.country_code || '').toLowerCase()
  if (code) return code === TUNISIA_COUNTRY_CODE
  return /(?:tunisie|tunisia|تونس)/i.test(String(result?.display_name || ''))
}

function zoomForResult(result) {
  const address = result?.address || {}
  const type = String(result?.addresstype || result?.type || '').toLowerCase()
  if (address.house_number) return 18
  if (address.road || address.pedestrian || address.footway || address.path) return 17
  if (['neighbourhood', 'suburb', 'quarter', 'hamlet'].includes(type)) return 15
  if (['city', 'town', 'village', 'municipality', 'county'].includes(type)) return 13
  return 16
}

function parseResult(result, source = 'tunisia-search', forcedZoom = null) {
  if (!result || !isTunisiaResult(result)) return null

  const lat = Number(result.lat)
  const lng = Number(result.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const address = result.address || {}
  const houseNumber = address.house_number || ''
  const road = address.road || address.pedestrian || address.footway || address.path || address.cycleway || ''
  const district = address.suburb || address.neighbourhood || address.quarter || address.hamlet || ''
  const city = address.city || address.town || address.village || address.municipality || address.county || ''
  const postcode = address.postcode || ''
  const state = address.state || address.region || ''
  const country = address.country || 'Tunisie'
  const named = result.name || result.namedetails?.name || ''
  const exactStreet = [houseNumber, road].filter(Boolean).join(' ')

  let label = ''
  if (houseNumber && road) label = exactStreet
  else if (named && normalize(named) !== normalize(road)) label = named
  else label = road || district || city || state || result.display_name || 'Lieu détecté'

  const cityLine = [postcode, city].filter(Boolean).join(' ')
  const subtitleParts = []
  if (named && normalize(named) !== normalize(label)) subtitleParts.push(named)
  if (road && normalize(road) !== normalize(label)) subtitleParts.push(road)
  subtitleParts.push(district, cityLine, state, country)
  const subtitle = uniqueParts(subtitleParts)
    .filter((value) => normalize(value) !== normalize(label))
    .join(', ')

  const parsed = {
    id: `nominatim-${result.place_id || `${result.osm_type || 'place'}-${result.osm_id || `${lat}-${lng}`}`}`,
    label,
    subtitle: subtitle || result.display_name || 'Tunisie',
    displayName: result.display_name || '',
    viewport: { lat, lng, zoom: forcedZoom ?? zoomForResult(result) },
    source,
    mapObject: {
      osmType: result.osm_type || '',
      osmId: result.osm_id || '',
      category: result.category || result.class || '',
      type: result.type || result.addresstype || '',
    },
  }

  Object.defineProperty(parsed, 'location', {
    value: Object.freeze({ houseNumber, road, district, city, postcode, state, country }),
    enumerable: false,
    configurable: false,
    writable: false,
  })

  return parsed
}

function dedupe(items) {
  const seen = new Set()
  return items.filter((item) => {
    const lat = Number(item?.viewport?.lat).toFixed(5)
    const lng = Number(item?.viewport?.lng).toFixed(5)
    const key = `${normalize(item?.label)}|${normalize(item?.subtitle)}|${lat}|${lng}`
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function searchAddress(query, options = {}) {
  const raw = await NOMINATIM_PROVIDER.search(query, options)
  return dedupe(raw.map((result) => parseResult(result, 'tunisia-search')).filter(Boolean)).slice(0, 10)
}

export async function reverseGeocode({ lat, lng, signal, zoom = 18 } = {}) {
  const raw = await NOMINATIM_PROVIDER.reverse({ lat, lng, signal, zoom })
  return parseResult(raw, 'tunisia-pin-scan', zoom)
}

export async function scanTunisia(query, { signal, onCandidate } = {}) {
  const text = String(query || '').trim()
  if (text.length < 3) return { detected: null, suggestions: [] }

  const suggestions = await searchAddress(text, {
    signal,
    countryCode: TUNISIA_COUNTRY_CODE,
    language: 'fr',
    limit: 15,
  })
  const candidate = suggestions[0] || null
  if (!candidate) return { detected: null, suggestions: [] }

  onCandidate?.(candidate)

  try {
    const detected = await reverseGeocode({
      lat: candidate.viewport.lat,
      lng: candidate.viewport.lng,
      signal,
      zoom: 18,
    })
    return { detected: detected || candidate, suggestions }
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return { detected: candidate, suggestions }
  }
}

export const geocodingService = Object.freeze({
  searchAddress,
  reverseGeocode,
  scanTunisia,
})
