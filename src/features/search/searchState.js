export const SEARCH_STEPS = Object.freeze(['destination', 'dates', 'guests'])

export function createSearchState() {
  return {
    destination: null,
    checkin: '',
    checkout: '',
    adults: 1,
    children: 0,
    infants: 0,
    pets: 0,
  }
}

export function isDateRangeValid(checkin, checkout) {
  if (!checkin || !checkout) return false
  const start = new Date(`${checkin}T12:00:00`).getTime()
  const end = new Date(`${checkout}T12:00:00`).getTime()
  return Number.isFinite(start) && Number.isFinite(end) && end > start
}

export function totalTravellers(state) {
  return Math.max(1, Number(state.adults) || 1) + Math.max(0, Number(state.children) || 0)
}

/* A Map camera is only usable when all three components are present and in
   range. Sharing one definition keeps "can this reproduce a viewport?" the same
   question everywhere it is asked — building a Map URL, and restoring a search
   that was saved with one. */
export function isUsableViewport(viewport) {
  const lat = Number(viewport?.lat)
  const lng = Number(viewport?.lng)
  const zoom = Number(viewport?.zoom)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return false
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return false
  return Number.isFinite(zoom) && zoom >= 1 && zoom <= 20
}

function appendViewport(params, viewport) {
  if (!isUsableViewport(viewport)) return
  params.set('lat', Number(viewport.lat).toFixed(6))
  params.set('lng', Number(viewport.lng).toFixed(6))
  params.set('zoom', String(Number(viewport.zoom)))
}

export function buildMapSearchPath(state) {
  const params = new URLSearchParams()
  if (state.destination?.id) params.set('destination', state.destination.id)
  if (state.destination?.label) params.set('place', state.destination.label)
  appendViewport(params, state.destination?.viewport)
  if (state.checkin) params.set('checkin', state.checkin)
  if (state.checkout) params.set('checkout', state.checkout)
  params.set('guests', String(totalTravellers(state)))
  params.set('adults', String(Math.max(1, Number(state.adults) || 1)))
  params.set('children', String(Math.max(0, Number(state.children) || 0)))
  params.set('infants', String(Math.max(0, Number(state.infants) || 0)))
  params.set('pets', String(Math.max(0, Number(state.pets) || 0)))
  params.set('search', '1')
  return `/map?${params.toString()}`
}
