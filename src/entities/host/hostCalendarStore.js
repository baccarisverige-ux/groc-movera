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

export function readHostCalendar(userId) {
  if (!userId) return { days: {} }
  return { days: normalizeDays(readAllCalendars()[userId]) }
}

export function readHostCalendarForListing(listingId) {
  if (!listingId) return { linked: false, userId: null, listingId: '', days: {} }

  const direct = readAllListingCalendars()[listingId]
  if (direct) {
    return {
      linked: true,
      userId: typeof direct.userId === 'string' ? direct.userId : null,
      listingId,
      days: applyRoomInventoryAvailability(listingId, normalizeDays(direct)),
    }
  }

  const profile = findHostProfileByListingId(listingId)
  if (!profile) return { linked: false, userId: null, listingId, days: {} }

  const legacy = readHostCalendar(profile.userId)
  return {
    linked: true,
    userId: profile.userId,
    listingId: profile.listing.id,
    days: applyRoomInventoryAvailability(profile.listing.id, legacy.days),
  }
}

export function writeHostCalendarDays(userId, keys, settings, listingId = '') {
  if (!userId || !Array.isArray(keys) || !keys.length) return readHostCalendar(userId)
  const price = Math.max(0, Math.round(Number(settings?.price) || 0))
  const blocked = Boolean(settings?.blocked)
  const calendars = readAllCalendars()
  const current = readHostCalendar(userId)
  const days = { ...current.days }

  keys.forEach((key) => {
    days[key] = { price, blocked }
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
    window.dispatchEvent(new CustomEvent(HOST_CALENDAR_EVENT, { detail: { userId, listingId, ...next } }))
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
