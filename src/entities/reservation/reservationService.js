import { readHostCalendarForListing } from '../host/hostCalendarStore.js'
import { findHostProfileByListingId } from '../host/hostProfileStore.js'
import {
  canReserveRoomUnits,
  registerConfirmedRoomReservation,
  releaseConfirmedRoomReservation,
} from '../host/hostRoomInventoryStore.js'
import {
  createReservation,
  readReservation,
  reservationNightKeys,
  updateReservationStatus,
} from './reservationStore.js'

function hostListing(listingId) {
  return findHostProfileByListingId(listingId)?.listing || null
}

function hasPooledInventory(listingId) {
  const listing = hostListing(listingId)
  return Boolean(Array.isArray(listing?.roomTypes) && listing.roomTypes.length)
}

function dateAtMidday(value) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function validateStayRules(listing, checkIn, checkOut) {
  if (!listing) throw new Error('Cette annonce Hôte n’est plus disponible.')
  const nights = reservationNightKeys(checkIn, checkOut)
  if (!nights.length) throw new Error('Dates de réservation invalides.')
  const rules = listing.stayRules || {}
  const minNights = Math.max(1, Number(rules.minNights) || 1)
  const maxNights = Math.max(minNights, Number(rules.maxNights) || 365)
  if (nights.length < minNights) throw new Error(`Ce logement demande au moins ${minNights} nuit${minNights > 1 ? 's' : ''}.`)
  if (nights.length > maxNights) throw new Error(`Ce logement accepte au maximum ${maxNights} nuit${maxNights > 1 ? 's' : ''}.`)

  const advanceNoticeDays = Math.max(0, Number(rules.advanceNoticeDays) || 0)
  const arrival = dateAtMidday(checkIn)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const daysToArrival = arrival ? Math.floor((arrival.getTime() - today.getTime()) / 86400000) : -1
  if (daysToArrival < 0) throw new Error('La date d’arrivée est déjà passée.')
  if (daysToArrival < advanceNoticeDays) throw new Error(`L’hôte demande ${advanceNoticeDays} jour${advanceNoticeDays > 1 ? 's' : ''} de préavis.`)
  return nights
}

function validateLiveAvailability({ listingId, roomTypeId = '', checkIn, checkOut, units = 1 }) {
  const listing = hostListing(listingId)
  const nights = validateStayRules(listing, checkIn, checkOut)
  const calendar = readHostCalendarForListing(listingId, roomTypeId)
  const blockedKey = nights.find((key) => calendar.days?.[key]?.blocked)
  if (blockedKey) throw new Error('Ces dates ne sont plus disponibles.')

  if (hasPooledInventory(listingId)) {
    const availability = canReserveRoomUnits({ listingId, roomTypeId, checkIn, checkOut, units })
    if (!availability.ok) throw new Error(availability.reason === 'not-enough-rooms' ? 'Ces dates ne sont plus disponibles.' : 'Dates de réservation invalides.')
  }
}

export function createGuestReservation(input) {
  const status = input?.status === 'confirmed' ? 'confirmed' : 'pending'
  validateLiveAvailability({
    listingId: input.listingId,
    roomTypeId: input.roomTypeId || '',
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    units: input.units || 1,
  })

  const reservation = createReservation({ ...input, status })
  if (reservation.status === 'confirmed' && hasPooledInventory(reservation.listingId)) {
    try {
      registerConfirmedRoomReservation({
        reservationId: reservation.id,
        listingId: reservation.listingId,
        roomTypeId: reservation.roomTypeId || '',
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        units: reservation.units,
      })
    } catch (error) {
      updateReservationStatus(reservation.id, 'cancelled')
      throw error
    }
  }
  return readReservation(reservation.id)
}

export function changeReservationStatus(id, status) {
  const current = readReservation(id)
  if (!current) throw new Error('Reservation not found')
  if (current.status === status) return current
  const pooled = hasPooledInventory(current.listingId)

  if (pooled && current.status === 'confirmed' && status !== 'confirmed') {
    releaseConfirmedRoomReservation({ reservationId: current.id, listingId: current.listingId })
  }
  if (current.status !== 'confirmed' && status === 'confirmed') {
    validateLiveAvailability({
      listingId: current.listingId,
      roomTypeId: current.roomTypeId,
      checkIn: current.checkIn,
      checkOut: current.checkOut,
      units: current.units,
    })
    if (pooled) {
      registerConfirmedRoomReservation({
        reservationId: current.id,
        listingId: current.listingId,
        roomTypeId: current.roomTypeId,
        checkIn: current.checkIn,
        checkOut: current.checkOut,
        units: current.units,
      })
    }
  }
  return updateReservationStatus(id, status)
}
