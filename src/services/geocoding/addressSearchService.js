import { GOOGLE_PLACES_PROVIDER } from './googlePlacesProvider.js'
import { reverseGeocode } from './geocodingService.js'

/* The single address-search entry point for Voyageur Search and Host.

   The rule this service exists to enforce: typing never reaches a public
   geocoder. Suggestions while typing come from Places API (New) when the
   Movera browser key is configured, and otherwise stay local-only — never
   from Nominatim, whose usage policy prohibits autocomplete. Coordinates are
   resolved once, after the user picks a suggestion.

   Nominatim remains only behind explicit, one-shot user actions (confirming a
   dropped pin, "use my current location"), which its policy does allow. */

export function isRemoteAddressSearchAvailable() {
  return GOOGLE_PLACES_PROVIDER.isConfigured()
}

export function createAddressSearchSession() {
  return {
    token: isRemoteAddressSearchAvailable() ? GOOGLE_PLACES_PROVIDER.createSessionToken() : '',
    closed: false,
  }
}

/* A session ends when its details call is made. Callers start a new session for
   the next lookup so keystrokes are never billed across unrelated searches. */
export function closeAddressSearchSession(session) {
  if (session) session.closed = true
}

export async function suggestAddresses(query, { session, signal, limit = 6 } = {}) {
  if (!isRemoteAddressSearchAvailable()) return []
  return GOOGLE_PLACES_PROVIDER.autocomplete(query, {
    sessionToken: session?.token,
    signal,
    limit,
  })
}

/* Turns a picked suggestion into coordinates. Local Movera suggestions already
   carry their viewport, so they resolve without any network call at all. */
export async function resolveAddressSuggestion(suggestion, { session, signal } = {}) {
  if (!suggestion) return null
  if (suggestion.viewport) return suggestion
  if (!suggestion.placeId || !isRemoteAddressSearchAvailable()) return null

  const resolved = await GOOGLE_PLACES_PROVIDER.details(suggestion.placeId, {
    sessionToken: session?.token,
    signal,
  })
  closeAddressSearchSession(session)
  if (!resolved) return null

  return {
    ...suggestion,
    ...resolved,
    // Keep the label the user actually chose in the list.
    label: suggestion.label || resolved.label,
    subtitle: suggestion.subtitle || resolved.subtitle,
  }
}

/* Explicit, one-shot reverse lookup: confirming a dropped pin or resolving the
   device's current position. Not a typing path. */
export async function describeCoordinates({ lat, lng, signal, zoom = 18 } = {}) {
  return reverseGeocode({ lat, lng, signal, zoom })
}

export const addressSearchService = Object.freeze({
  isRemoteAvailable: isRemoteAddressSearchAvailable,
  createSession: createAddressSearchSession,
  closeSession: closeAddressSearchSession,
  suggest: suggestAddresses,
  resolve: resolveAddressSuggestion,
  describeCoordinates,
})
