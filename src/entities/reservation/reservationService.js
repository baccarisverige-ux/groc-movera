import { findHostProfileByListingId } from '../host/hostProfileStore.js'
import {
  canReserveRoomUnits,
  registerConfirmedRoomReservation,
  releaseConfirmedRoomReservation,
} from '../host/hostRoomInventoryStore.js'
import {
  createReservation,
  readReservation,
  updateReservationStatus,
} from './reservationStore.js'

function hasPooledInventory(listingId) {
  const listing = findHostProfileByListingId(listingId)?.listing
  return Boolean(Array.isArray(listing?.roomTypes) && listing.roomTypes.length)
}

export function createGuestReservation(input) {
  const status = input?.status === 'confirmed' ? 'confirmed' : 'pending'
  if (status === 'confirmed' && hasPooledInventory(input.listingId)) {
    const availability = canReserveRoomUnits({
      listingId: input.listingId,
      roomTypeId: input.roomTypeId || '',
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      units: input.units || 1,
    })
    if (!availability.ok) throw new Error(availability.reason === 'not-enough-rooms' ? 'Ces dates ne sont plus disponibles.' : 'Dates de réservation invalides.')
  }

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
  if (pooled && current.status !== 'confirmed' && status === 'confirmed') {
    const availability = canReserveRoomUnits({
      listingId: current.listingId,
      roomTypeId: current.roomTypeId,
      checkIn: current.checkIn,
      checkOut: current.checkOut,
      units: current.units,
    })
    if (!availability.ok) throw new Error('Ces dates ne sont plus disponibles.')
    registerConfirmedRoomReservation({
      reservationId: current.id,
      listingId: current.listingId,
      roomTypeId: current.roomTypeId,
      checkIn: current.checkIn,
      checkOut: current.checkOut,
      units: current.units,
    })
  }
  return updateReservationStatus(id, status)
}
