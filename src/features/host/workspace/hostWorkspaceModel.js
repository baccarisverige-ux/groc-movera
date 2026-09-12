export const HOST_WORKSPACE_VIEWS = Object.freeze([
  { id: 'dashboard', label: 'Aujourd’hui', path: '/host' },
  { id: 'listings', label: 'Annonces', path: '/host/listings' },
  { id: 'reservations', label: 'Réservations', path: '/host/reservations' },
  { id: 'calendar', label: 'Calendrier', path: '/host/calendar' },
  { id: 'earnings', label: 'Revenus', path: '/host/earnings' },
  { id: 'messages', label: 'Messages', path: '/host/messages' },
  { id: 'settings', label: 'Réglages', path: '/host/settings' },
  { id: 'menu', label: 'Menu', path: '/host/menu' },
])

/* Five tabs, not seven.

   A bottom bar stops being a bar somewhere around five items: at seven the
   labels truncate and the targets narrow, which is why the rail used to scroll
   sideways and clip its last tab. These five are the ones a host opens daily;
   everything else lives one tap deeper under Menu, which is also where the
   traveller-mode switch and the account rows belong. */
export const HOST_PRIMARY_NAV = Object.freeze(['dashboard', 'calendar', 'listings', 'messages', 'menu'])

export const HOST_MENU_VIEWS = Object.freeze(['reservations', 'earnings', 'settings'])

export function hostPrimaryNavItems() {
  return HOST_PRIMARY_NAV.map((id) => HOST_WORKSPACE_VIEWS.find((item) => item.id === id)).filter(Boolean)
}

export function hostMenuItems() {
  return HOST_MENU_VIEWS.map((id) => HOST_WORKSPACE_VIEWS.find((item) => item.id === id)).filter(Boolean)
}

export function hostWorkspaceViewFromPath(pathname = '') {
  const value = String(pathname)
  // The editor is a child of listings: it keeps the Annonce tab lit while it
  // replaces the screen, the way a detail page belongs to its section.
  if (value.endsWith('/host/listings/editor')) return 'listing-editor'
  if (value.endsWith('/host/listings')) return 'listings'
  if (value.endsWith('/host/menu')) return 'menu'
  if (value.endsWith('/host/reservations')) return 'reservations'
  if (value.endsWith('/host/calendar')) return 'calendar'
  if (value.endsWith('/host/earnings')) return 'earnings'
  if (value.endsWith('/host/messages')) return 'messages'
  if (value.endsWith('/host/settings')) return 'settings'
  return 'dashboard'
}

/* Which bottom-nav tab is lit for a view. The editor is not a tab of its own;
   it lights Annonce, because that is where the host came from and where Back
   returns them. */
export function hostNavViewFor(view) {
  return view === 'listing-editor' ? 'listings' : view
}

export function stayNightKeys(checkIn, checkOut) {
  const start = new Date(`${checkIn}T12:00:00`)
  const end = new Date(`${checkOut}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return []
  const keys = []
  const cursor = new Date(start)
  while (cursor < end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

export function roomForReservation(listing, reservation) {
  const rooms = Array.isArray(listing?.roomTypes) ? listing.roomTypes : []
  return rooms.find((room) => room.id === reservation?.roomTypeId) || rooms[0] || null
}

export function estimateReservationGross(listing, reservation, calendar = { days: {} }) {
  const bookedTotal = Number(reservation?.total)
  if (Number.isFinite(bookedTotal) && bookedTotal > 0) return Math.round(bookedTotal)
  const room = roomForReservation(listing, reservation)
  const fallbackPrice = Math.max(0, Number(room?.basePrice ?? listing?.basePrice) || 0)
  const units = Math.max(1, Number(reservation?.units) || 1)
  return stayNightKeys(reservation?.checkIn, reservation?.checkOut).reduce((total, key) => {
    const nightly = Math.max(0, Number(calendar?.days?.[key]?.price ?? fallbackPrice) || 0)
    return total + nightly * units
  }, 0)
}

export function reservationStatus(reservation, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const checkIn = new Date(`${reservation?.checkIn}T12:00:00`)
  const checkOut = new Date(`${reservation?.checkOut}T12:00:00`)
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) return 'unknown'
  if (checkOut <= today) return 'past'
  if (checkIn <= today && checkOut > today) return 'current'
  return 'upcoming'
}

export function hostListingCompleteness(listing) {
  if (!listing) return 0
  const checks = [
    Boolean(listing.name),
    Boolean(listing.city),
    Boolean(listing.description && listing.description.length >= 40),
    Boolean(Array.isArray(listing.amenities) && listing.amenities.length >= 3),
    Boolean((Array.isArray(listing.photos) && listing.photos.length) || (Array.isArray(listing.roomTypes) && listing.roomTypes.some((room) => room.photos?.length))),
    Number(listing.basePrice) > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
