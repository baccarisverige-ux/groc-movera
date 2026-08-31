import { describe, expect, it } from 'vitest'
import {
  estimateReservationGross,
  hostListingCompleteness,
  hostWorkspaceViewFromPath,
  reservationStatus,
  stayNightKeys,
} from '../../src/features/host/workspace/hostWorkspaceModel.js'

describe('host workspace model', () => {
  it('resolves every host workspace route without confusing guest paths', () => {
    expect(hostWorkspaceViewFromPath('/groc-movera/host')).toBe('dashboard')
    expect(hostWorkspaceViewFromPath('/groc-movera/host/listings')).toBe('listings')
    expect(hostWorkspaceViewFromPath('/groc-movera/host/reservations')).toBe('reservations')
    expect(hostWorkspaceViewFromPath('/groc-movera/host/calendar')).toBe('calendar')
    expect(hostWorkspaceViewFromPath('/groc-movera/host/earnings')).toBe('earnings')
    expect(hostWorkspaceViewFromPath('/groc-movera/host/messages')).toBe('messages')
    expect(hostWorkspaceViewFromPath('/groc-movera/host/settings')).toBe('settings')
  })

  it('calculates stay nights with checkout excluded', () => {
    expect(stayNightKeys('2026-09-10', '2026-09-13')).toEqual(['2026-09-10', '2026-09-11', '2026-09-12'])
  })

  it('estimates gross from category price and custom calendar nights', () => {
    const listing = {
      basePrice: 180,
      roomTypes: [{ id: 'deluxe', name: 'Deluxe', basePrice: 240 }],
    }
    const reservation = { roomTypeId: 'deluxe', checkIn: '2026-09-10', checkOut: '2026-09-13', units: 2 }
    const calendar = { days: { '2026-09-11': { price: 300 } } }
    expect(estimateReservationGross(listing, reservation, calendar)).toBe((240 + 300 + 240) * 2)
  })

  it('classifies future, current and past reservations', () => {
    const now = new Date(2026, 8, 12, 12)
    expect(reservationStatus({ checkIn: '2026-09-13', checkOut: '2026-09-15' }, now)).toBe('upcoming')
    expect(reservationStatus({ checkIn: '2026-09-11', checkOut: '2026-09-14' }, now)).toBe('current')
    expect(reservationStatus({ checkIn: '2026-09-08', checkOut: '2026-09-12' }, now)).toBe('past')
  })

  it('scores only real listing content', () => {
    expect(hostListingCompleteness({ name: 'Dar', city: 'Tunis', description: '', amenities: [], photos: [], roomTypes: [], basePrice: 180 })).toBe(50)
    expect(hostListingCompleteness({ name: 'Dar', city: 'Tunis', description: 'Une description suffisamment détaillée pour présenter correctement le logement.', amenities: ['wifi', 'parking', 'ac'], photos: ['photo.jpg'], roomTypes: [], basePrice: 180 })).toBe(100)
  })
})
