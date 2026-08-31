import { findHostProfileByListingId } from './hostProfileStore.js'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_ROOM_INVENTORY_KEY = 'movera:host-room-inventory:v1'
export const HOST_ROOM_INVENTORY_EVENT = 'movera:host-room-inventory-change'
const HOST_CALENDAR_EVENT = 'movera:host-calendar-change'

function readObject() {
  const value = storageAdapter.getJson(HOST_ROOM_INVENTORY_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function dateFromKey(key) {
  if (typeof key !== 'string') return null
  const [year, month, day] = key.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function stayNightKeys(checkIn, checkOut) {
  const start = dateFromKey(checkIn)
  const end = dateFromKey(checkOut)
  if (!start || !end || end <= start) return []
  const keys = []
  const cursor = new Date(start)
  while (cursor < end) {
    keys.push(dateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

function roomConfig(listingId, requestedRoomTypeId = '') {
  const profile = findHostProfileByListingId(listingId)
  const roomTypes = Array.isArray(profile?.listing?.roomTypes) ? profile.listing.roomTypes : []
  const enabled = roomTypes.length > 0
  const selected = roomTypes.find((room) => room.id === requestedRoomTypeId) || roomTypes[0] || null
  return {
    profile,
    enabled,
    roomTypes,
    roomType: selected,
    roomTypeId: selected?.id || '',
    totalUnits: selected ? Math.max(1, Math.round(Number(selected.totalUnits) || 1)) : 1,
  }
}

function normalizeReservation(value, fallbackId = '', fallbackRoomTypeId = '') {
  if (!value || typeof value !== 'object') return null
  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : fallbackId
  const listingId = typeof value.listingId === 'string' ? value.listingId.trim() : ''
  const roomTypeId = typeof value.roomTypeId === 'string' && value.roomTypeId.trim() ? value.roomTypeId.trim() : fallbackRoomTypeId
  const checkIn = typeof value.checkIn === 'string' ? value.checkIn : ''
  const checkOut = typeof value.checkOut === 'string' ? value.checkOut : ''
  const units = Math.max(1, Math.round(Number(value.units) || 1))
  if (!id || !listingId || !roomTypeId || !stayNightKeys(checkIn, checkOut).length) return null
  return {
    id,
    listingId,
    roomTypeId,
    checkIn,
    checkOut,
    units,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  }
}

function readReservations(listingId, fallbackRoomTypeId = '') {
  const source = readObject()[listingId]
  const values = source?.reservations && typeof source.reservations === 'object' && !Array.isArray(source.reservations)
    ? source.reservations
    : {}
  const reservations = {}
  Object.entries(values).forEach(([id, value]) => {
    const normalized = normalizeReservation(value, id, fallbackRoomTypeId)
    if (normalized?.listingId === listingId) reservations[id] = normalized
  })
  return reservations
}

function dispatchInventoryChange(listingId, roomTypeId = '') {
  if (typeof window === 'undefined') return
  const detail = { listingId, roomTypeId }
  window.dispatchEvent(new CustomEvent(HOST_ROOM_INVENTORY_EVENT, { detail }))
  window.dispatchEvent(new CustomEvent(HOST_CALENDAR_EVENT, { detail }))
}

function buildReservedByDay(reservations, roomTypeId) {
  const reservedByDay = {}
  Object.values(reservations).forEach((reservation) => {
    if (reservation.roomTypeId !== roomTypeId) return
    stayNightKeys(reservation.checkIn, reservation.checkOut).forEach((key) => {
      reservedByDay[key] = (reservedByDay[key] || 0) + reservation.units
    })
  })
  return reservedByDay
}

export function readHostRoomInventoryForListing(listingId, roomTypeId = '') {
  const config = roomConfig(listingId, roomTypeId)
  const reservations = config.enabled ? readReservations(listingId, config.roomTypes[0]?.id || '') : {}
  const reservedByDay = buildReservedByDay(reservations, config.roomTypeId)
  const remainingByDay = {}
  Object.entries(reservedByDay).forEach(([key, reserved]) => {
    remainingByDay[key] = Math.max(0, config.totalUnits - reserved)
  })

  return {
    listingId,
    enabled: config.enabled,
    roomTypeId: config.roomTypeId,
    roomType: config.roomType,
    roomTypes: config.roomTypes,
    totalUnits: config.totalUnits,
    reservations,
    reservedByDay,
    remainingByDay,
  }
}

export function remainingRoomUnitsForDay(inventory, key) {
  if (!inventory?.enabled) return 1
  const reserved = Math.max(0, Number(inventory.reservedByDay?.[key]) || 0)
  return Math.max(0, inventory.totalUnits - reserved)
}

export function applyRoomInventoryAvailability(listingId, days = {}, roomTypeId = '') {
  const inventory = readHostRoomInventoryForListing(listingId, roomTypeId)
  if (!inventory.enabled) return days

  let changed = false
  const next = { ...days }
  Object.keys(inventory.reservedByDay).forEach((key) => {
    if (remainingRoomUnitsForDay(inventory, key) > 0) return
    next[key] = { ...(next[key] || {}), blocked: true }
    changed = true
  })
  return changed ? next : days
}

export function canReserveRoomUnits({ listingId, roomTypeId = '', checkIn, checkOut, units = 1 }) {
  const inventory = readHostRoomInventoryForListing(listingId, roomTypeId)
  const requested = Math.max(1, Math.round(Number(units) || 1))
  const nights = stayNightKeys(checkIn, checkOut)
  if (!inventory.enabled) return { ok: true, inventory, requested, nights }
  if (!nights.length) return { ok: false, reason: 'invalid-dates', inventory, requested, nights }
  const soldOutKey = nights.find((key) => remainingRoomUnitsForDay(inventory, key) < requested)
  if (soldOutKey) return { ok: false, reason: 'not-enough-rooms', soldOutKey, inventory, requested, nights }
  return { ok: true, inventory, requested, nights }
}

export function registerConfirmedRoomReservation({ reservationId, listingId, roomTypeId = '', checkIn, checkOut, units = 1 }) {
  const id = typeof reservationId === 'string' ? reservationId.trim() : ''
  if (!id || !listingId) throw new Error('Reservation and listing are required')

  const initialInventory = readHostRoomInventoryForListing(listingId, roomTypeId)
  const resolvedRoomTypeId = initialInventory.roomTypeId
  const requested = Math.max(1, Math.round(Number(units) || 1))
  const reservations = readReservations(listingId, initialInventory.roomTypes[0]?.id || '')
  const existing = reservations[id]
  if (existing) {
    const same = existing.roomTypeId === resolvedRoomTypeId && existing.checkIn === checkIn && existing.checkOut === checkOut && existing.units === requested
    if (same) return readHostRoomInventoryForListing(listingId, resolvedRoomTypeId)
    throw new Error('Reservation inventory is already registered with different room type, dates or units')
  }

  const availability = canReserveRoomUnits({ listingId, roomTypeId: resolvedRoomTypeId, checkIn, checkOut, units: requested })
  if (!availability.ok) throw new Error(availability.reason === 'not-enough-rooms' ? 'No room inventory remains for the selected stay' : 'Invalid reservation dates')
  if (!availability.inventory.enabled) return availability.inventory

  const all = readObject()
  reservations[id] = {
    id,
    listingId,
    roomTypeId: resolvedRoomTypeId,
    checkIn,
    checkOut,
    units: requested,
    createdAt: new Date().toISOString(),
  }
  all[listingId] = { reservations }
  storageAdapter.setJson(HOST_ROOM_INVENTORY_KEY, all)
  dispatchInventoryChange(listingId, resolvedRoomTypeId)
  return readHostRoomInventoryForListing(listingId, resolvedRoomTypeId)
}

export function releaseConfirmedRoomReservation({ reservationId, listingId }) {
  const id = typeof reservationId === 'string' ? reservationId.trim() : ''
  if (!id || !listingId) return readHostRoomInventoryForListing(listingId)
  const config = roomConfig(listingId)
  const all = readObject()
  const reservations = readReservations(listingId, config.roomTypeId)
  const releasedRoomTypeId = reservations[id]?.roomTypeId || config.roomTypeId
  if (!reservations[id]) return readHostRoomInventoryForListing(listingId, releasedRoomTypeId)
  delete reservations[id]
  all[listingId] = { reservations }
  storageAdapter.setJson(HOST_ROOM_INVENTORY_KEY, all)
  dispatchInventoryChange(listingId, releasedRoomTypeId)
  return readHostRoomInventoryForListing(listingId, releasedRoomTypeId)
}
