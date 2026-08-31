import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const RESERVATIONS_KEY = 'movera:reservations:v1'
export const RESERVATIONS_EVENT = 'movera:reservations-change'
const HOST_CALENDAR_EVENT = 'movera:host-calendar-change'

const STATUSES = new Set(['pending', 'confirmed', 'cancelled'])

function readAll() {
  const value = storageAdapter.getJson(RESERVATIONS_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function dateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? '' : value
}

export function reservationNightKeys(checkIn, checkOut) {
  const startKey = dateKey(checkIn)
  const endKey = dateKey(checkOut)
  if (!startKey || !endKey) return []
  const start = new Date(`${startKey}T12:00:00`)
  const end = new Date(`${endKey}T12:00:00`)
  if (end <= start) return []
  const keys = []
  const cursor = new Date(start)
  while (cursor < end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

function normalize(value, fallbackId = '') {
  if (!value || typeof value !== 'object') return null
  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : fallbackId
  const listingId = typeof value.listingId === 'string' ? value.listingId.trim() : ''
  const guestUserId = typeof value.guestUserId === 'string' ? value.guestUserId.trim() : ''
  const checkIn = dateKey(value.checkIn)
  const checkOut = dateKey(value.checkOut)
  if (!id || !listingId || !guestUserId || !reservationNightKeys(checkIn, checkOut).length) return null
  const total = Math.max(0, Math.round(Number(value.total) || 0))
  const originalTotal = Math.max(total, Math.round(Number(value.originalTotal) || total))
  return {
    id,
    listingId,
    roomTypeId: typeof value.roomTypeId === 'string' ? value.roomTypeId.trim() : '',
    guestUserId,
    guestLabel: typeof value.guestLabel === 'string' && value.guestLabel.trim() ? value.guestLabel.trim() : 'Voyageur Movera',
    checkIn,
    checkOut,
    units: Math.max(1, Math.round(Number(value.units) || 1)),
    status: STATUSES.has(value.status) ? value.status : 'pending',
    originalTotal,
    total,
    discountValue: Math.max(0, Math.min(100, Math.round(Number(value.discountValue) || 0))),
    currency: typeof value.currency === 'string' && value.currency.trim() ? value.currency.trim() : 'TND',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  }
}

function dispatchChange(reservation) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(RESERVATIONS_EVENT, { detail: reservation }))
  window.dispatchEvent(new CustomEvent(HOST_CALENDAR_EVENT, { detail: { listingId: reservation?.listingId || '' } }))
}

function save(reservation) {
  const all = readAll()
  all[reservation.id] = reservation
  storageAdapter.setJson(RESERVATIONS_KEY, all)
  dispatchChange(reservation)
  return reservation
}

export function readReservation(id) {
  if (!id) return null
  return normalize(readAll()[id], id)
}

export function listReservations() {
  return Object.entries(readAll())
    .map(([id, value]) => normalize(value, id))
    .filter(Boolean)
    .sort((left, right) => left.checkIn.localeCompare(right.checkIn) || left.createdAt.localeCompare(right.createdAt))
}

export function listReservationsForListing(listingId, { includeCancelled = false } = {}) {
  return listReservations().filter((item) => item.listingId === listingId && (includeCancelled || item.status !== 'cancelled'))
}

export function listReservationsForGuest(guestUserId, { includeCancelled = true } = {}) {
  return listReservations().filter((item) => item.guestUserId === guestUserId && (includeCancelled || item.status !== 'cancelled'))
}

export function createReservation({
  listingId,
  roomTypeId = '',
  guestUserId,
  guestLabel = 'Voyageur Movera',
  checkIn,
  checkOut,
  units = 1,
  status = 'pending',
  originalTotal = 0,
  total = 0,
  discountValue = 0,
  currency = 'TND',
}) {
  const reservation = normalize({
    id: `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    listingId,
    roomTypeId,
    guestUserId,
    guestLabel,
    checkIn,
    checkOut,
    units,
    status: STATUSES.has(status) ? status : 'pending',
    originalTotal,
    total,
    discountValue,
    currency,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  if (!reservation) throw new Error('Invalid reservation')
  return save(reservation)
}

export function updateReservationStatus(id, status) {
  if (!STATUSES.has(status)) throw new Error('Invalid reservation status')
  const current = readReservation(id)
  if (!current) throw new Error('Reservation not found')
  if (current.status === status) return current
  return save({ ...current, status, updatedAt: new Date().toISOString() })
}

export function confirmedReservationBlocksForListing(listingId) {
  const blocked = new Set()
  listReservationsForListing(listingId).forEach((reservation) => {
    if (reservation.status !== 'confirmed') return
    reservationNightKeys(reservation.checkIn, reservation.checkOut).forEach((key) => blocked.add(key))
  })
  return blocked
}
