import { useEffect, useState } from 'react'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_PROFILES_KEY = 'movera:host-profiles:v1'
export const HOST_PROFILE_EVENT = 'movera:host-profile-change'

function readAllProfiles() {
  const value = storageAdapter.getJson(HOST_PROFILES_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function stringArray(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
}

function normalizeSafety(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    exteriorCamera: Boolean(source.exteriorCamera),
    noiseMonitor: Boolean(source.noiseMonitor),
    weapons: Boolean(source.weapons),
    smokeAlarm: Boolean(source.smokeAlarm),
    carbonMonoxideAlarm: Boolean(source.carbonMonoxideAlarm),
  }
}

function normalizeCoordinate(value) {
  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate : null
}

function foldType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .trim()
}

function roomTypeId(value, index) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (raw) return raw
  return `room-type-${index + 1}`
}

export function supportsPooledRoomInventory(type) {
  const normalized = foldType(type)
  return normalized === 'hotel' || normalized === "maison d'hote"
}

function normalizeRoomTypes(value, type, fallback) {
  if (!supportsPooledRoomInventory(type)) return []
  const source = Array.isArray(value) ? value : []
  const legacyUnits = Math.max(1, Math.min(999, Math.round(Number(fallback?.legacyUnits) || 1)))
  const fallbackPrice = Math.max(1, Math.round(Number(fallback?.basePrice) || 1))
  const fallbackGuests = Math.max(1, Math.round(Number(fallback?.guests) || 2))
  const fallbackBeds = Math.max(1, Math.round(Number(fallback?.beds) || 1))
  const fallbackBaths = Math.max(0, Math.round(Number(fallback?.bathrooms) || 1))

  const candidates = source.length ? source : [{
    id: 'room-standard',
    name: 'Chambre Standard',
    view: '',
    description: '',
    guests: fallbackGuests,
    beds: fallbackBeds,
    bathrooms: fallbackBaths,
    basePrice: fallbackPrice,
    totalUnits: legacyUnits,
    photos: [],
  }]

  const seen = new Set()
  return candidates.slice(0, 12).map((item, index) => {
    const sourceRoom = item && typeof item === 'object' ? item : {}
    let id = roomTypeId(sourceRoom.id, index)
    if (seen.has(id)) id = `${id}-${index + 1}`
    seen.add(id)
    const price = Number(sourceRoom.basePrice)
    return {
      id,
      name: typeof sourceRoom.name === 'string' && sourceRoom.name.trim() ? sourceRoom.name.trim() : `Type de chambre ${index + 1}`,
      view: typeof sourceRoom.view === 'string' ? sourceRoom.view.trim() : '',
      description: typeof sourceRoom.description === 'string' ? sourceRoom.description.trim() : '',
      guests: Math.max(1, Math.min(20, Math.round(Number(sourceRoom.guests) || fallbackGuests))),
      beds: Math.max(1, Math.min(20, Math.round(Number(sourceRoom.beds) || fallbackBeds))),
      bathrooms: Math.max(0, Math.min(10, Math.round(Number(sourceRoom.bathrooms) || fallbackBaths))),
      basePrice: Number.isFinite(price) && price > 0 ? Math.round(price) : fallbackPrice,
      totalUnits: Math.max(1, Math.min(999, Math.round(Number(sourceRoom.totalUnits) || legacyUnits))),
      photos: stringArray(sourceRoom.photos),
    }
  })
}

function normalizeRoomInventory(value, type, roomTypes) {
  const enabled = supportsPooledRoomInventory(type)
  const source = value && typeof value === 'object' ? value : {}
  const roomTotal = roomTypes.reduce((sum, room) => sum + room.totalUnits, 0)
  const totalUnits = enabled
    ? Math.max(1, roomTotal || Math.min(999, Math.round(Number(source.totalUnits) || 1)))
    : 1
  return {
    mode: enabled ? 'room-types' : 'single',
    totalUnits,
  }
}

function normalizeListing(value, fallbackId = 'primary-listing') {
  if (!value || typeof value !== 'object') return null
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const city = typeof value.city === 'string' ? value.city.trim() : ''
  const type = typeof value.type === 'string' ? value.type.trim() : ''
  const basePrice = Number(value.basePrice)
  if (!name || !city || !type || !Number.isFinite(basePrice) || basePrice <= 0) return null
  const rawId = typeof value.id === 'string' ? value.id.trim() : ''
  const id = !rawId || rawId === 'primary-listing' ? fallbackId : rawId
  const guests = Math.max(1, Number(value.guests) || 1)
  const beds = Math.max(1, Number(value.beds) || 1)
  const bathrooms = Math.max(0, Number(value.bathrooms) || 0)
  const roomTypes = normalizeRoomTypes(value.roomTypes, type, {
    basePrice,
    guests,
    beds,
    bathrooms,
    legacyUnits: value.roomInventory?.totalUnits,
  })

  return {
    id,
    name,
    city,
    type,
    basePrice: Math.round(basePrice),
    currency: 'TND',
    address: typeof value.address === 'string' ? value.address.trim() : '',
    latitude: normalizeCoordinate(value.latitude),
    longitude: normalizeCoordinate(value.longitude),
    guestAccess: typeof value.guestAccess === 'string' ? value.guestAccess : 'entire',
    guests,
    bedrooms: Math.max(0, Number(value.bedrooms) || 0),
    beds,
    bathrooms,
    amenities: stringArray(value.amenities),
    highlights: stringArray(value.highlights).slice(0, 2),
    description: typeof value.description === 'string' ? value.description.trim() : '',
    bookingMode: value.bookingMode === 'instant' ? 'instant' : 'request-first',
    promotions: stringArray(value.promotions),
    safety: normalizeSafety(value.safety),
    roomTypes,
    roomInventory: normalizeRoomInventory(value.roomInventory, type, roomTypes),
    photos: stringArray(value.photos),
  }
}

function normalizeHostProfile(value, userId) {
  if (!value || typeof value !== 'object' || value.status !== 'active') return null
  const listing = normalizeListing(value.listing, `host-${userId}`)
  if (!listing) return null
  return {
    status: 'active',
    userId,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    listing,
  }
}

export function readHostProfile(userId) {
  if (!userId) return null
  return normalizeHostProfile(readAllProfiles()[userId], userId)
}

export function findHostProfileByListingId(listingId) {
  if (!listingId) return null
  const matches = []
  for (const [userId, value] of Object.entries(readAllProfiles())) {
    const profile = normalizeHostProfile(value, userId)
    if (profile?.listing?.id === listingId) matches.push(profile)
  }
  return matches.length === 1 ? matches[0] : null
}

export function activateHostProfile(userId, listing) {
  if (!userId) throw new Error('A user is required to activate host mode')
  const normalizedListing = normalizeListing(listing, `host-${userId}`)
  if (!normalizedListing) throw new Error('Invalid host listing')
  const profiles = readAllProfiles()
  const profile = {
    status: 'active',
    userId,
    createdAt: new Date().toISOString(),
    listing: normalizedListing,
  }
  profiles[userId] = profile
  storageAdapter.setJson(HOST_PROFILES_KEY, profiles)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PROFILE_EVENT, { detail: profile }))
  return profile
}

export function updateHostRoomTypeTotal(userId, roomTypeIdValue, totalUnits) {
  if (!userId) throw new Error('A user is required to update room inventory')
  const profiles = readAllProfiles()
  const current = normalizeHostProfile(profiles[userId], userId)
  if (!current) throw new Error('Host profile not found')
  if (!supportsPooledRoomInventory(current.listing.type)) return current

  const roomTypes = current.listing.roomTypes.map((room) => room.id === roomTypeIdValue
    ? { ...room, totalUnits: Math.max(1, Math.min(999, Math.round(Number(totalUnits) || 1))) }
    : room)
  if (!roomTypes.some((room) => room.id === roomTypeIdValue)) return current

  const next = {
    ...current,
    listing: {
      ...current.listing,
      roomTypes,
      roomInventory: {
        mode: 'room-types',
        totalUnits: roomTypes.reduce((sum, room) => sum + room.totalUnits, 0),
      },
    },
  }

  profiles[userId] = next
  storageAdapter.setJson(HOST_PROFILES_KEY, profiles)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PROFILE_EVENT, { detail: next }))
  return next
}

export function updateHostRoomInventoryTotal(userId, totalUnits) {
  const profile = readHostProfile(userId)
  const firstRoom = profile?.listing?.roomTypes?.[0]
  if (!firstRoom) return profile
  return updateHostRoomTypeTotal(userId, firstRoom.id, totalUnits)
}

export function clearHostProfile(userId) {
  if (!userId) return
  const profiles = readAllProfiles()
  delete profiles[userId]
  storageAdapter.setJson(HOST_PROFILES_KEY, profiles)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PROFILE_EVENT, { detail: { userId, status: 'cleared' } }))
}

export function useHostProfile(userId) {
  const [profile, setProfile] = useState(() => readHostProfile(userId))

  useEffect(() => {
    const sync = () => setProfile(readHostProfile(userId))
    sync()
    window.addEventListener(HOST_PROFILE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_PROFILE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [userId])

  return { profile, isHost: Boolean(profile) }
}
