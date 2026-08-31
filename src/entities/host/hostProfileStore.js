import { useEffect, useState } from 'react'
import { storageAdapter } from '../../services/storage/storageAdapter.js'
import { clearHostRoomLotDraft, readHostRoomLotDraft } from './hostRoomTypeDraftStore.js'
import {
  makeRoomLot,
  normalizeRoomLots,
  roomLotTotalUnits,
  supportsRoomLots,
  validateRoomLotPlan,
} from './roomLotModel.js'

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

export function supportsPooledRoomInventory(type) {
  return supportsRoomLots(type)
}

function normalizeListingRoomLots(value, type, fallback) {
  if (!supportsRoomLots(type)) return []
  const source = Array.isArray(value?.roomLots)
    ? value.roomLots
    : Array.isArray(value?.roomTypes)
      ? value.roomTypes
      : []
  if (source.length) return normalizeRoomLots(source, fallback)

  return [makeRoomLot(0, fallback, Math.max(1, Number(value?.roomInventory?.totalUnits) || 1))]
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
  const roomLots = normalizeListingRoomLots(value, type, { basePrice, guests, beds, bathrooms })
  const totalRooms = roomLots.length ? roomLotTotalUnits(roomLots) : 1
  const lowestLotPrice = roomLots.length ? Math.min(...roomLots.map((lot) => lot.basePrice)) : Math.round(basePrice)

  return {
    id,
    name,
    city,
    type,
    basePrice: supportsRoomLots(type) ? lowestLotPrice : Math.round(basePrice),
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
    totalRooms,
    roomLots,
    // Compatibility for inventory/calendar code while it migrates to roomLots.
    roomTypes: roomLots,
    roomInventory: {
      mode: supportsRoomLots(type) ? 'room-lots' : 'single',
      totalUnits: totalRooms,
    },
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
  const matches = listActiveHostProfiles().filter((profile) => profile?.listing?.id === listingId)
  return matches.length === 1 ? matches[0] : null
}

export function activateHostProfile(userId, listing) {
  if (!userId) throw new Error('A user is required to activate host mode')

  let listingForActivation = listing
  if (supportsRoomLots(listing?.type)) {
    const fallback = {
      guests: listing?.guests,
      beds: listing?.beds,
      bathrooms: listing?.bathrooms,
      basePrice: listing?.basePrice,
    }
    const suppliedLots = Array.isArray(listing?.roomLots)
      ? listing.roomLots
      : Array.isArray(listing?.roomTypes)
        ? listing.roomTypes
        : null
    const plan = suppliedLots?.length
      ? { totalRooms: listing.totalRooms || roomLotTotalUnits(suppliedLots), roomLots: suppliedLots }
      : readHostRoomLotDraft(userId, fallback)
    const validation = validateRoomLotPlan(plan)
    if (!validation.ok) throw new Error(validation.issues[0] || 'Invalid room lot plan')

    listingForActivation = {
      ...listing,
      totalRooms: validation.totalRooms,
      roomLots: validation.roomLots,
      roomTypes: validation.roomLots,
      basePrice: Math.min(...validation.roomLots.map((lot) => lot.basePrice)),
    }
  }

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
  clearHostRoomLotDraft(userId)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PROFILE_EVENT, { detail: profile }))
  return profile
}

export function updateHostRoomLotTotal(userId, roomLotId, totalUnits) {
  if (!userId) throw new Error('A user is required to update room inventory')
  const profiles = readAllProfiles()
  const current = normalizeHostProfile(profiles[userId], userId)
  if (!current) throw new Error('Host profile not found')
  if (!supportsRoomLots(current.listing.type)) return current

  const roomLots = current.listing.roomLots.map((lot) => lot.id === roomLotId
    ? { ...lot, totalUnits: Math.max(1, Math.min(999, Math.round(Number(totalUnits) || 1))) }
    : lot)
  if (!roomLots.some((lot) => lot.id === roomLotId)) return current

  const totalRooms = roomLotTotalUnits(roomLots)
  const nextRaw = {
    ...profiles[userId],
    listing: {
      ...profiles[userId].listing,
      totalRooms,
      roomLots,
      roomTypes: roomLots,
      roomInventory: { mode: 'room-lots', totalUnits: totalRooms },
      basePrice: Math.min(...roomLots.map((lot) => lot.basePrice)),
    },
  }
  profiles[userId] = nextRaw
  storageAdapter.setJson(HOST_PROFILES_KEY, profiles)
  const next = normalizeHostProfile(nextRaw, userId)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PROFILE_EVENT, { detail: next }))
  return next
}

export function updateHostRoomTypeTotal(userId, roomTypeIdValue, totalUnits) {
  return updateHostRoomLotTotal(userId, roomTypeIdValue, totalUnits)
}

export function updateHostRoomInventoryTotal(userId, totalUnits) {
  const profile = readHostProfile(userId)
  const firstLot = profile?.listing?.roomLots?.[0]
  if (!firstLot) return profile
  return updateHostRoomLotTotal(userId, firstLot.id, totalUnits)
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
