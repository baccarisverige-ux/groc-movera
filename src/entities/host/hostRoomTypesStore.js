import { HOST_PROFILE_EVENT, HOST_PROFILES_KEY, readHostProfile, supportsPooledRoomInventory } from './hostProfileStore.js'
import { HOST_ROOM_SETUP_MODES } from './hostRoomTypeDraftStore.js'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

function readProfiles() {
  const value = storageAdapter.getJson(HOST_PROFILES_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function stringArray(value, max = Infinity) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, max)
    : []
}

function cleanRoom(room, index, photoLimit = 8) {
  const source = room && typeof room === 'object' ? room : {}
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : `room-type-${index + 1}`
  return {
    id,
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : index === 0 ? 'Chambre' : `Catégorie ${index + 1}`,
    view: typeof source.view === 'string' ? source.view.trim() : '',
    description: typeof source.description === 'string' ? source.description.trim() : '',
    surface: Math.max(0, Math.min(1000, Math.round(Number(source.surface) || 0))),
    guests: Math.max(1, Math.min(20, Math.round(Number(source.guests) || 2))),
    beds: Math.max(1, Math.min(20, Math.round(Number(source.beds) || 1))),
    bedType: typeof source.bedType === 'string' ? source.bedType.trim() : '',
    bathrooms: Math.max(0, Math.min(10, Math.round(Number(source.bathrooms) || 1))),
    bathroomType: source.bathroomType === 'shared' ? 'shared' : 'private',
    basePrice: Math.max(1, Math.round(Number(source.basePrice) || 1)),
    totalUnits: Math.max(1, Math.min(999, Math.round(Number(source.totalUnits) || 1))),
    features: stringArray(source.features, 8),
    photos: stringArray(source.photos, photoLimit),
  }
}

function inventoryMode(roomTypes) {
  const totalUnits = roomTypes.reduce((sum, room) => sum + room.totalUnits, 0)
  if (roomTypes.length > 1) return HOST_ROOM_SETUP_MODES.CATEGORIES
  if (totalUnits > 1) return HOST_ROOM_SETUP_MODES.IDENTICAL
  return HOST_ROOM_SETUP_MODES.SINGLE
}

export function saveHostRoomTypes(userId, roomTypes) {
  if (!userId) throw new Error('A user is required to update room types')
  const current = readHostProfile(userId)
  if (!current || !supportsPooledRoomInventory(current.listing.type)) throw new Error('Room configuration is only available for hotels and guest houses')

  const photoLimit = String(current.listing.type || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'hotel' ? 20 : 8
  const cleaned = (Array.isArray(roomTypes) ? roomTypes : []).slice(0, 12).map((room, index) => cleanRoom(room, index, photoLimit))
  if (!cleaned.length) throw new Error('At least one room is required')
  const ids = new Set(cleaned.map((room) => room.id))
  if (ids.size !== cleaned.length) throw new Error('Room identifiers must be unique')
  if (cleaned.some((room) => !room.name || room.basePrice <= 0 || room.totalUnits <= 0)) {
    throw new Error('Each room category needs a name, a price and at least one room')
  }

  const totalUnits = cleaned.reduce((sum, room) => sum + room.totalUnits, 0)
  const profiles = readProfiles()
  const raw = profiles[userId]
  if (!raw?.listing) throw new Error('Host listing not found')
  const nextRaw = {
    ...raw,
    listing: {
      ...raw.listing,
      roomTypes: cleaned,
      roomInventory: {
        mode: inventoryMode(cleaned),
        totalUnits,
      },
    },
  }
  profiles[userId] = nextRaw
  storageAdapter.setJson(HOST_PROFILES_KEY, profiles)
  const next = readHostProfile(userId)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PROFILE_EVENT, { detail: next }))
  return next
}
