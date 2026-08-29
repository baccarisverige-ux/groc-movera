import { useEffect, useState } from 'react'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_PROFILES_KEY = 'movera:host-profiles:v1'
const HOST_PROFILE_EVENT = 'movera:host-profile-change'

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

function normalizeListing(value) {
  if (!value || typeof value !== 'object') return null
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const city = typeof value.city === 'string' ? value.city.trim() : ''
  const type = typeof value.type === 'string' ? value.type.trim() : ''
  const basePrice = Number(value.basePrice)
  if (!name || !city || !type || !Number.isFinite(basePrice) || basePrice <= 0) return null
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : 'primary-listing',
    name,
    city,
    type,
    basePrice: Math.round(basePrice),
    currency: 'TND',
    address: typeof value.address === 'string' ? value.address.trim() : '',
    latitude: normalizeCoordinate(value.latitude),
    longitude: normalizeCoordinate(value.longitude),
    guestAccess: typeof value.guestAccess === 'string' ? value.guestAccess : 'entire',
    guests: Math.max(1, Number(value.guests) || 1),
    bedrooms: Math.max(0, Number(value.bedrooms) || 0),
    beds: Math.max(1, Number(value.beds) || 1),
    bathrooms: Math.max(0, Number(value.bathrooms) || 0),
    amenities: stringArray(value.amenities),
    highlights: stringArray(value.highlights).slice(0, 2),
    description: typeof value.description === 'string' ? value.description.trim() : '',
    bookingMode: value.bookingMode === 'instant' ? 'instant' : 'request-first',
    promotions: stringArray(value.promotions),
    safety: normalizeSafety(value.safety),
    photos: [],
  }
}

function normalizeHostProfile(value, userId) {
  if (!value || typeof value !== 'object' || value.status !== 'active') return null
  const listing = normalizeListing(value.listing)
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

export function activateHostProfile(userId, listing) {
  if (!userId) throw new Error('A user is required to activate host mode')
  const normalizedListing = normalizeListing(listing)
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
