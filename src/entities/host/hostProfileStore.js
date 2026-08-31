import { useEffect, useState } from 'react'
import { storageAdapter } from '../../services/storage/storageAdapter.js'
import { ensureHostListingCalendar } from './hostCalendarStore.js'
import {
  clearHostRoomTypeDraft,
  HOST_ROOM_SETUP_MODES,
  readHostRoomConfigurationDraft,
} from './hostRoomTypeDraftStore.js'

export const HOST_PROFILES_KEY = 'movera:host-profiles:v1'
export const HOST_PROFILE_EVENT = 'movera:host-profile-change'

function readAllProfiles() {
  const value = storageAdapter.getJson(HOST_PROFILES_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function stringArray(value, max = Infinity) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, max)
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

function clampInt(value, min, max, fallback) {
  const number = Math.round(Number(value))
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback))
}

export function supportsPooledRoomInventory(type) {
  const normalized = foldType(type)
  return normalized === 'hotel' || normalized === "maison d'hote"
}

export function listingCategoryFromType(type) {
  const normalized = foldType(type)
  if (normalized === 'hotel') return 'hotel'
  if (normalized === "maison d'hote") return 'guesthouse'
  if (normalized === 'appartement') return 'family'
  if (normalized === 'villa') return 'prestige'
  return ''
}

function normalizeRoomTypes(value, type, fallback) {
  if (!supportsPooledRoomInventory(type)) return []
  const source = Array.isArray(value) ? value : []
  const legacyUnits = clampInt(fallback?.legacyUnits, 1, 999, 1)
  const fallbackPrice = clampInt(fallback?.basePrice, 1, 99999, 180)
  const fallbackGuests = clampInt(fallback?.guests, 1, 20, 2)
  const fallbackBeds = clampInt(fallback?.beds, 1, 20, 1)
  const fallbackBaths = clampInt(fallback?.bathrooms, 0, 10, 1)

  const candidates = source.length ? source : [{
    id: 'room-standard',
    name: 'Chambre',
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
      name: typeof sourceRoom.name === 'string' && sourceRoom.name.trim() ? sourceRoom.name.trim() : index === 0 ? 'Chambre' : `Catégorie ${index + 1}`,
      view: typeof sourceRoom.view === 'string' ? sourceRoom.view.trim() : '',
      description: typeof sourceRoom.description === 'string' ? sourceRoom.description.trim() : '',
      surface: clampInt(sourceRoom.surface, 0, 1000, 0),
      guests: clampInt(sourceRoom.guests, 1, 20, fallbackGuests),
      beds: clampInt(sourceRoom.beds, 1, 20, fallbackBeds),
      bedType: typeof sourceRoom.bedType === 'string' ? sourceRoom.bedType.trim() : '',
      bathrooms: clampInt(sourceRoom.bathrooms, 0, 10, fallbackBaths),
      bathroomType: sourceRoom.bathroomType === 'shared' ? 'shared' : 'private',
      basePrice: Number.isFinite(price) && price > 0 ? Math.round(price) : fallbackPrice,
      totalUnits: clampInt(sourceRoom.totalUnits, 1, 999, legacyUnits),
      features: stringArray(sourceRoom.features, 8),
      photos: stringArray(sourceRoom.photos, 8),
    }
  })
}

function deriveRoomInventoryMode(type, roomTypes) {
  if (!supportsPooledRoomInventory(type)) return HOST_ROOM_SETUP_MODES.SINGLE
  const totalUnits = roomTypes.reduce((sum, room) => sum + Math.max(1, Number(room.totalUnits) || 1), 0)
  if (roomTypes.length > 1) return HOST_ROOM_SETUP_MODES.CATEGORIES
  if (totalUnits > 1) return HOST_ROOM_SETUP_MODES.IDENTICAL
  return HOST_ROOM_SETUP_MODES.SINGLE
}

function normalizeRoomInventory(value, type, roomTypes) {
  if (!supportsPooledRoomInventory(type)) return { mode: HOST_ROOM_SETUP_MODES.SINGLE, totalUnits: 1 }
  const source = value && typeof value === 'object' ? value : {}
  const roomTotal = roomTypes.reduce((sum, room) => sum + room.totalUnits, 0)
  const totalUnits = Math.max(1, roomTotal || clampInt(source.totalUnits, 1, 999, 1))
  return {
    mode: deriveRoomInventoryMode(type, roomTypes),
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

export function listActiveHostProfiles() {
  return Object.entries(readAllProfiles())
    .map(([userId, value]) => normalizeHostProfile(value, userId))
    .filter(Boolean)
}

export function findHostProfileByListingId(listingId) {
  if (!listingId) return null
  const matches = []
  for (const profile of listActiveHostProfiles()) {
    if (profile?.listing?.id === listingId) matches.push(profile)
  }
  return matches.length === 1 ? matches[0] : null
}

export function activateHostProfile(userId, listing) {
  if (!userId) throw new Error('A user is required to activate host mode')
  const roomFallback = {
    guests: listing?.guests,
    beds: listing?.beds,
    bathrooms: listing?.bathrooms,
    basePrice: listing?.basePrice,
  }
  const configuration = supportsPooledRoomInventory(listing?.type)
    ? readHostRoomConfigurationDraft(userId, roomFallback)
    : null
  const listingForActivation = configuration
    ? {
        ...listing,
        roomTypes: Array.isArray(listing?.roomTypes) && listing.roomTypes.length ? listing.roomTypes : configuration.roomTypes,
        roomInventory: {
          mode: configuration.mode,
          totalUnits: configuration.totalRooms,
        },
      }
    : listing
  const normalizedListing = normalizeListing(listingForActivation, `host-${userId}`)
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
  clearHostRoomTypeDraft(userId)
  ensureHostListingCalendar(userId, normalizedListing.id)
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
    ? { ...room, totalUnits: clampInt(totalUnits, 1, 999, 1) }
    : room)
  if (!roomTypes.some((room) => room.id === roomTypeIdValue)) return current

  const next = {
    ...current,
    listing: {
      ...current.listing,
      roomTypes,
      roomInventory: {
        mode: deriveRoomInventoryMode(current.listing.type, roomTypes),
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
