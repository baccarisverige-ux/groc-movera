import { findHostProfileByListingId } from './hostProfileStore.js'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_CALENDAR_KEY = 'movera:host-calendar:v1'
export const HOST_CALENDAR_EVENT = 'movera:host-calendar-change'

function readAllCalendars() {
  const value = storageAdapter.getJson(HOST_CALENDAR_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function readHostCalendar(userId) {
  if (!userId) return { days: {} }
  const value = readAllCalendars()[userId]
  const days = value?.days && typeof value.days === 'object' && !Array.isArray(value.days) ? value.days : {}
  return { days }
}

export function readHostCalendarForListing(listingId) {
  const profile = findHostProfileByListingId(listingId)
  if (!profile) return { linked: false, userId: null, listingId: listingId || '', days: {} }
  const calendar = readHostCalendar(profile.userId)
  return {
    linked: true,
    userId: profile.userId,
    listingId: profile.listing.id,
    days: calendar.days,
  }
}

export function writeHostCalendarDays(userId, keys, settings) {
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
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_CALENDAR_EVENT, { detail: { userId, ...next } }))
  return next
}

export function clearHostCalendar(userId) {
  if (!userId) return
  const calendars = readAllCalendars()
  delete calendars[userId]
  storageAdapter.setJson(HOST_CALENDAR_KEY, calendars)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_CALENDAR_EVENT, { detail: { userId, days: {} } }))
}
