export function listingRoomTypes(listing) {
  return Array.isArray(listing?.roomTypes) ? listing.roomTypes : []
}

export function resolveListingRoom(listing, selectedRoomId) {
  const rooms = listingRoomTypes(listing)
  return rooms.find((room) => room.id === selectedRoomId) || rooms[0] || null
}

export function buildListingDetailPath(listing, selectedRoomId) {
  const rooms = listingRoomTypes(listing)
  const room = resolveListingRoom(listing, selectedRoomId)
  const roomQuery = rooms.length > 1 && room?.id
    ? `?roomType=${encodeURIComponent(room.id)}`
    : ''
  return `/listing/${listing.id}${roomQuery}`
}
