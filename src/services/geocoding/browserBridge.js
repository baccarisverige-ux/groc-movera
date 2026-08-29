import { reverseGeocode, searchAddress } from './geocodingService.js'

export const GEOCODING_BROWSER_BRIDGE_KEY = 'MoveraGeocoding'

function legacyAddress(result) {
  const location = result?.location || {}
  return {
    house_number: location.houseNumber || '',
    road: location.road || '',
    suburb: location.district || '',
    city: location.city || '',
    postcode: location.postcode || '',
    state: location.state || '',
    country: location.country || 'Tunisie',
    country_code: 'tn',
  }
}

function toLegacyCompatible(result) {
  if (!result) return result
  return {
    ...result,
    location: result.location || null,
    display_name: result.displayName || '',
    address: legacyAddress(result),
  }
}

async function bridgeSearchAddress(query, options) {
  const results = await searchAddress(query, options)
  return results.map(toLegacyCompatible)
}

async function bridgeReverseGeocode(options) {
  return toLegacyCompatible(await reverseGeocode(options))
}

export function createGeocodingBrowserBridge() {
  return Object.freeze({
    version: 1,
    searchAddress: bridgeSearchAddress,
    reverseGeocode: bridgeReverseGeocode,
  })
}

export function installGeocodingBrowserBridge(target = globalThis) {
  if (!target || typeof target !== 'object') return null
  const existing = target[GEOCODING_BROWSER_BRIDGE_KEY]
  if (existing?.version >= 1) return existing
  const bridge = createGeocodingBrowserBridge()
  target[GEOCODING_BROWSER_BRIDGE_KEY] = bridge
  return bridge
}
