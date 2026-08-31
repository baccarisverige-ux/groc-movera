import { describe, expect, it } from 'vitest'
import { reservationNightKeys } from '../../src/entities/reservation/reservationStore.js'
import { estimateReservationGross } from '../../src/features/host/workspace/hostWorkspaceModel.js'

describe('canonical reservation data model', () => {
  it('counts check-in nights and excludes checkout', () => {
    expect(reservationNightKeys('2026-09-10', '2026-09-13')).toEqual([
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ])
    expect(reservationNightKeys('2026-09-10', '2026-09-10')).toEqual([])
  })

  it('keeps the price captured at booking even if current calendar prices later change', () => {
    const listing = { basePrice: 180, roomTypes: [] }
    const reservation = {
      checkIn: '2026-09-10',
      checkOut: '2026-09-12',
      units: 1,
      total: 330,
    }
    const changedCalendar = {
      days: {
        '2026-09-10': { price: 900 },
        '2026-09-11': { price: 900 },
      },
    }
    expect(estimateReservationGross(listing, reservation, changedCalendar)).toBe(330)
  })
})
