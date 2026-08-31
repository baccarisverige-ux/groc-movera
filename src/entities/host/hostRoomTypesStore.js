import { HOST_PROFILE_EVENT, HOST_PROFILES_KEY, readHostProfile, supportsPooledRoomInventory } from './hostProfileStore.js'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

function readProfiles() {
  const value = storageAdapter.getJson(HOST_PROFILES_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function cleanRoom(room, index) {
  const source = room && typeof room === 'object' ? room : {}
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : `room-type-${index + 1}`
  return {
    id,
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : `Type de chambre ${index + 1}`,
    view: typeof source.view === 'string' ? source.view.trim() : '',
    description: typeof source.description === 'string' ? source.description.trim() : '',
    guests: Math.max(1, Math.min(20, Math.round(Number(source.guests) || 2))),
    beds: Math.max(1, Math.min(20, Math.round(Number(source.beds) || 1))),
    bathrooms: Math.max(0, Math.min(10, Math.round(Number(source.bathrooms) || 1))),
    basePrice: Math.max(1, Math.round(Number(source.basePrice) || 1)),
    totalUnits: Math.max(1, Math.min(999, Math.round(Number(source.totalUnits) || 1))),
    photos: Array.isArray(source.photos) ? source.photos.filter((item) => typeof item === 'string' && item.trim()) : [],
  }
}

export function saveHostRoomTypes(userId, roomTypes) {
  if (!userId) throw new Error('A user is required to update room types')
  const current = readHostProfile(userId)
  if (!current || !supportsPooledRoomInventory(current.listing.type)) throw new Error('Room types are only available for hotels and guest houses')

  const cleaned = (Array.isArray(roomTypes) ? roomTypes : []).slice(0, 12).map(cleanRoom)
  if (!cleaned.length) throw new Error('At least one room type is required')
  const ids = new Set(cleaned.map((room) => room.id))
  if (ids.size !== cleaned.length) throw new Error('Room type identifiers must be unique')

  const profiles = readProfiles()
  const raw = profiles[userId]
  if (!raw?.listing) throw new Error('Host listing not found')
  const nextRaw = {
    ...raw,
    listing: {
      ...raw.listing,
      roomTypes: cleaned,
      roomInventory: {
        mode: 'room-types',
        totalUnits: cleaned.reduce((sum, room) => sum + room.totalUnits, 0),
      },
    },
  }
  profiles[userId] = nextRaw
  storageAdapter.setJson(HOST_PROFILES_KEY, profiles)
  const next = readHostProfile(userId)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PROFILE_EVENT, { detail: next }))
  return next
}
