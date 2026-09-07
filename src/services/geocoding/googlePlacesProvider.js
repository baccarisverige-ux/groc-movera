/* Places API (New) over its REST surface, called directly from the browser with
   the existing referrer-restricted Movera browser key. This deliberately does
   not touch the Maps JavaScript runtime: the Map loads its own script, and
   address search must also work on screens where no Map is mounted. */
const PLACES_BASE = 'https://places.googleapis.com/v1'
/* Defaults to the existing Movera browser key, so production needs no new key
   and no extra configuration. The optional override exists so address search
   can be exercised without also switching the Map over to the live Google
   renderer, and so a separately restricted key can be adopted later. */
const BROWSER_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim()
  || import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  || ''
const DEFAULT_LANGUAGE = 'fr'
const DEFAULT_REGION = 'tn'

// Enough to frame a street address once a suggestion is resolved. Kept here so
// every caller places the camera identically.
const RESOLVED_ADDRESS_ZOOM = 16

export function isGooglePlacesConfigured() {
  return Boolean(BROWSER_KEY)
}

/* One token groups the keystrokes of a single lookup with the Place Details
   call that ends it, so Google bills the whole thing as one session instead of
   charging per keystroke. The token must be discarded once details are
   fetched — createPlacesSessionToken is called again for the next lookup. */
export function createPlacesSessionToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `movera-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
}

async function placesRequest(url, { method = 'GET', body, signal, fieldMask }) {
  const headers = { 'X-Goog-Api-Key': BROWSER_KEY }
  if (body) headers['Content-Type'] = 'application/json'
  if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask

  const response = await fetch(url, {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`Places API ${response.status}`)
  return response.json()
}

function normalizeSuggestion(entry) {
  const prediction = entry?.placePrediction
  if (!prediction?.placeId) return null
  const label = prediction.structuredFormat?.mainText?.text || prediction.text?.text || ''
  if (!label) return null
  return {
    id: `google-${prediction.placeId}`,
    placeId: prediction.placeId,
    label,
    subtitle: prediction.structuredFormat?.secondaryText?.text || '',
    source: 'google-places',
    // Coordinates are intentionally absent: Places autocomplete does not return
    // them, and resolving them per keystroke is exactly what this replaces.
    viewport: null,
  }
}

export async function placesAutocomplete(query, {
  sessionToken,
  signal,
  languageCode = DEFAULT_LANGUAGE,
  regionCode = DEFAULT_REGION,
  limit = 6,
} = {}) {
  const input = String(query || '').trim()
  if (!isGooglePlacesConfigured() || input.length < 3) return []

  const payload = {
    input,
    languageCode,
    includedRegionCodes: [regionCode],
  }
  if (sessionToken) payload.sessionToken = sessionToken

  const data = await placesRequest(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    body: payload,
    signal,
  })

  return (data?.suggestions || []).map(normalizeSuggestion).filter(Boolean).slice(0, limit)
}

export async function placeDetails(placeId, {
  sessionToken,
  signal,
  languageCode = DEFAULT_LANGUAGE,
} = {}) {
  const id = String(placeId || '').trim()
  if (!isGooglePlacesConfigured() || !id) return null

  const url = new URL(`${PLACES_BASE}/places/${encodeURIComponent(id)}`)
  url.searchParams.set('languageCode', languageCode)
  // Passing the session token here closes the session it belongs to.
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken)

  const data = await placesRequest(url.toString(), {
    signal,
    fieldMask: 'id,location,displayName,formattedAddress,shortFormattedAddress',
  })

  const lat = Number(data?.location?.latitude)
  const lng = Number(data?.location?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  return {
    id: `google-${data.id || id}`,
    placeId: data.id || id,
    label: data.displayName?.text || data.shortFormattedAddress || '',
    subtitle: data.shortFormattedAddress || data.formattedAddress || '',
    displayName: data.formattedAddress || data.displayName?.text || '',
    source: 'google-places',
    viewport: { lat, lng, zoom: RESOLVED_ADDRESS_ZOOM },
  }
}

export const GOOGLE_PLACES_PROVIDER = Object.freeze({
  isConfigured: isGooglePlacesConfigured,
  createSessionToken: createPlacesSessionToken,
  autocomplete: placesAutocomplete,
  details: placeDetails,
})
