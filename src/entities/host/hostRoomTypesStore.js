import { HOST_PROFILE_EVENT, HOST_PROFILES_KEY, readHostProfile, supportsPooledRoomInventory } from './hostProfileStore.js'
import { normalizeRoomLots, roomLotTotalUnits, validateRoomLotPlan } from './roomLotModel.js'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

function readProfiles() {
  const value = storageAdapter.getJson(HOST_PROFILES_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function saveHostRoomLots(userId, roomLots) {
  if (!userId) throw new Error('A user is required to update room lots')
  const current = readHostProfile(userId)
  if (!current || !supportsPooledRoomInventory(current.listing.type)) {
    throw new Error('Room lots are only available for hotels and guest houses')
  }

  const cleaned = normalizeRoomLots(roomLots, {
    basePrice: current.listing.basePrice,
    guests: current.listing.guests,
    beds: current.listing.beds,
    bathrooms: current.listing.bathrooms,
  })
  const totalRooms = roomLotTotalUnits(cleaned)
  const validation = validateRoomLotPlan({ totalRooms, roomLots: cleaned })
  if (!validation.ok) throw new Error(validation.issues[0] || 'Invalid room lot plan')

  const profiles = readProfiles()
  const raw = profiles[userId]
  if (!raw?.listing) throw new Error('Host listing not found')

  const nextRaw = {
    ...raw,
    listing: {
      ...raw.listing,
      totalRooms,
      roomLots: validation.roomLots,
      roomTypes: validation.roomLots,
      basePrice: Math.min(...validation.roomLots.map((lot) => lot.basePrice)),
      roomInventory: {
        mode: 'room-lots',
        totalUnits: totalRooms,
      },
    },
  }
  profiles[userId] = nextRaw
  storageAdapter.setJson(HOST_PROFILES_KEY, profiles)
  const next = readHostProfile(userId)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PROFILE_EVENT, { detail: next }))
  return next
}

export function saveHostRoomTypes(userId, roomTypes) {
  return saveHostRoomLots(userId, roomTypes)
}
