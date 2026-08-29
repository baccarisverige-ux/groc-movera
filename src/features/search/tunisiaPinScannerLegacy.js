// Temporary rollback implementation kept during the safe geocoding migration.
// Do not extend this file. Remove it only after the centralized service has
// passed the full popup + host onboarding migration window.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
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

  return {
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

async function forwardSearch(query, signal) {
  const url = new URL(`${NOMINATIM_BASE}/search`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('namedetails', '1')
  url.searchParams.set('extratags', '1')
  url.searchParams.set('dedupe', '1')
  url.searchParams.set('limit', '15')
  url.searchParams.set('countrycodes', TUNISIA_COUNTRY_CODE)
  url.searchParams.set('accept-language', 'fr')
  url.searchParams.set('q', query.trim())

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Tunisia forward scan HTTP ${response.status}`)
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

async function reverseAtVirtualPin(lat, lng, signal) {
  const url = new URL(`${NOMINATIM_BASE}/reverse`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '18')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('namedetails', '1')
  url.searchParams.set('extratags', '1')
  url.searchParams.set('accept-language', 'fr')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Tunisia reverse scan HTTP ${response.status}`)
  return response.json()
}

export async function scanTunisiaByVirtualPinLegacy(query, { signal, onCandidate } = {}) {
  const text = String(query || '').trim()
  if (text.length < 3) return { detected: null, suggestions: [] }

  const rawCandidates = await forwardSearch(text, signal)
  const suggestions = dedupe(rawCandidates
    .map((result) => parseResult(result, 'tunisia-search'))
    .filter(Boolean))
    .slice(0, 10)

  const candidate = suggestions[0] || null
  if (!candidate) return { detected: null, suggestions: [] }

  onCandidate?.(candidate)

  try {
    const reverseRaw = await reverseAtVirtualPin(candidate.viewport.lat, candidate.viewport.lng, signal)
    const detected = parseResult(reverseRaw, 'tunisia-pin-scan', 18)
    return {
      detected: detected || candidate,
      suggestions,
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return { detected: candidate, suggestions }
  }
}
