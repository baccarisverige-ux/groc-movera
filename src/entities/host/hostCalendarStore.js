import { findHostProfileByListingId } from './hostProfileStore.js'
import { applyRoomInventoryAvailability } from './hostRoomInventoryStore.js'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_CALENDAR_KEY = 'movera:host-calendar:v1'
export const LISTING_CALENDAR_KEY = 'movera:listing-calendar:v1'
export const HOST_CALENDAR_EVENT = 'movera:host-calendar-change'

function readObject(key) {
  const value = storageAdapter.getJson(key, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeDays(value) {
  return value?.days && typeof value.days === 'object' && !Array.isArray(value.days) ? value.days : {}
}

function readAllCalendars() {
  return readObject(HOST_CALENDAR_KEY)
}

function readAllListingCalendars() {
  return readObject(LISTING_CALENDAR_KEY)
}

function resolveDaysForRoomType(days, roomTypeId) {
  if (!roomTypeId) return days
  const resolved = {}
  Object.entries(days).forEach(([key, raw]) => {
    const day = raw && typeof raw === 'object' ? raw : {}
    const roomTypes = day.roomTypes && typeof day.roomTypes === 'object' && !Array.isArray(day.roomTypes) ? day.roomTypes : {}
    const room = roomTypes[roomTypeId] && typeof roomTypes[roomTypeId] === 'object' ? roomTypes[roomTypeId] : {}
    resolved[key] = {
      ...day,
      ...room,
      blocked: Boolean(day.blocked) || Boolean(room.blocked),
    }
  })
  return resolved
}

export function readHostCalendar(userId) {
  if (!userId) return { days: {} }
  return { days: normalizeDays(readAllCalendars()[userId]) }
}

export function readHostCalendarForListing(listingId, roomTypeId = '') {
  if (!listingId) return { linked: false, userId: null, listingId: '', roomTypeId: '', days: {} }

  const direct = readAllListingCalendars()[listingId]
  if (direct) {
    const days = resolveDaysForRoomType(normalizeDays(direct), roomTypeId)
    return {
      linked: true,
      userId: typeof direct.userId === 'string' ? direct.userId : null,
      listingId,
      roomTypeId,
      days: applyRoomInventoryAvailability(listingId, days, roomTypeId),
    }
  }

  const profile = findHostProfileByListingId(listingId)
  if (!profile) return { linked: false, userId: null, listingId, roomTypeId, days: {} }

  const legacy = readHostCalendar(profile.userId)
  const days = resolveDaysForRoomType(legacy.days, roomTypeId)
  return {
    linked: true,
    userId: profile.userId,
    listingId: profile.listing.id,
    roomTypeId,
    days: applyRoomInventoryAvailability(profile.listing.id, days, roomTypeId),
  }
}

export function writeHostCalendarDays(userId, keys, settings, listingId = '', roomTypeId = '') {
  if (!userId || !Array.isArray(keys) || !keys.length) return readHostCalendar(userId)
  const price = Math.max(0, Math.round(Number(settings?.price) || 0))
  const blocked = Boolean(settings?.blocked)
  const calendars = readAllCalendars()
  const current = readHostCalendar(userId)
  const days = { ...current.days }

  keys.forEach((key) => {
    const existing = days[key] && typeof days[key] === 'object' ? days[key] : {}
    if (roomTypeId) {
      const roomTypes = existing.roomTypes && typeof existing.roomTypes === 'object' && !Array.isArray(existing.roomTypes) ? existing.roomTypes : {}
      days[key] = {
        ...existing,
        roomTypes: {
          ...roomTypes,
          [roomTypeId]: { price, blocked },
        },
      }
    } else {
      days[key] = { ...existing, price, blocked }
    }
  })

  const next = { days }
  calendars[userId] = next
  storageAdapter.setJson(HOST_CALENDAR_KEY, calendars)

  if (listingId) {
    const listingCalendars = readAllListingCalendars()
    listingCalendars[listingId] = { userId, days }
    storageAdapter.setJson(LISTING_CALENDAR_KEY, listingCalendars)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HOST_CALENDAR_EVENT, { detail: { userId, listingId, roomTypeId, ...next } }))
  }
  return next
}

export function clearHostCalendar(userId, listingId = '') {
  if (!userId) return
  const calendars = readAllCalendars()
  delete calendars[userId]
  storageAdapter.setJson(HOST_CALENDAR_KEY, calendars)

  if (listingId) {
    const listingCalendars = readAllListingCalendars()
    delete listingCalendars[listingId]
    storageAdapter.setJson(LISTING_CALENDAR_KEY, listingCalendars)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HOST_CALENDAR_EVENT, { detail: { userId, listingId, days: {} } }))
  }
}
