import { describe, expect, it } from 'vitest'
import {
  bookingsFromReservations,
  buildMonthWeeks,
  monthsFrom,
  weekBookingSegments,
} from '../../src/features/host/calendar/hostCalendarModel.js'

const reservation = (id, checkIn, checkOut, extra = {}) => ({
  id,
  listingId: 'listing-1',
  checkIn,
  checkOut,
  units: 1,
  guestLabel: 'Amine Ben Salah',
  total: 3400,
  ...extra,
})

describe('calendar month grid', () => {
  it('splits a month into whole weeks, padded at both ends', () => {
    // September 2026 starts on a Tuesday and has 30 days
    const weeks = buildMonthWeeks(2026, 8)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[0][0]).toBeNull()
    expect(weeks[0][1]).toBe(1)
    expect(weeks.flat().filter((day) => day !== null)).toHaveLength(30)
  })

  it('runs continuously across a year boundary', () => {
    const months = monthsFrom(2026, 11, 3)
    expect(months).toEqual([
      { year: 2026, month: 11 },
      { year: 2027, month: 0 },
      { year: 2027, month: 1 },
    ])
  })
})

describe('bookings from reservations', () => {
  it('reads real confirmed stays rather than inventing them', () => {
    const [booking] = bookingsFromReservations([reservation('r1', '2026-10-04', '2026-10-09')])
    expect(booking.id).toBe('r1')
    expect(booking.guest).toBe('Amine Ben Salah')
    expect(booking.initials).toBe('AB')
    expect(booking.checkIn.getDate()).toBe(4)
  })

  it('drops a stay whose dates cannot make a night', () => {
    expect(bookingsFromReservations([reservation('bad', '2026-10-09', '2026-10-09')])).toHaveLength(0)
    expect(bookingsFromReservations([reservation('worse', 'not-a-date', '2026-10-09')])).toHaveLength(0)
  })

  it('keeps a room-category calendar to its own category', () => {
    const rows = [
      reservation('deluxe', '2026-10-04', '2026-10-06', { roomTypeId: 'room-deluxe' }),
      reservation('standard', '2026-10-04', '2026-10-06', { roomTypeId: 'room-standard' }),
    ]
    expect(bookingsFromReservations(rows, 'room-deluxe').map((item) => item.id)).toEqual(['deluxe'])
  })
})

describe('booking bars', () => {
  /* The bar is the whole point of the redesign: a stay is one thing spanning
     nights, and the old grid could only mark each night separately, which is
     why it could never carry the guest's name. */
  it('spans the nights of a stay inside one week', () => {
    const bookings = bookingsFromReservations([reservation('r1', '2026-10-06', '2026-10-09')])
    const weeks = buildMonthWeeks(2026, 9)
    const week = weeks.find((row) => row.includes(6))
    const [segment] = weekBookingSegments(bookings, week, 2026, 9)

    // three nights: the 6th, 7th and 8th. Check-out day is not a night.
    expect(segment.span).toBe(3)
    expect(week[segment.start]).toBe(6)
    expect(segment.opensStay).toBe(true)
    expect(segment.closesInWeek).toBe(true)
  })

  /* A bar cannot cross a row, so a stay that runs over a Sunday is two
     segments -- and only the first carries the name, or the guest would be
     announced twice for one stay. */
  it('splits a stay that crosses a week boundary and labels it once', () => {
    const bookings = bookingsFromReservations([reservation('r1', '2026-10-09', '2026-10-14')])
    const weeks = buildMonthWeeks(2026, 9)
    const segments = weeks
      .map((week) => weekBookingSegments(bookings, week, 2026, 9))
      .filter((list) => list.length)
      .flat()

    expect(segments).toHaveLength(2)
    expect(segments.filter((segment) => segment.opensStay)).toHaveLength(1)
    expect(segments[0].opensStay).toBe(true)
    expect(segments[1].opensStay).toBe(false)
    expect(segments.reduce((total, segment) => total + segment.span, 0)).toBe(5)
  })

  it('reports no segment for a week the stay does not touch', () => {
    const bookings = bookingsFromReservations([reservation('r1', '2026-10-06', '2026-10-09')])
    const weeks = buildMonthWeeks(2026, 9)
    const untouched = weeks.find((week) => week.includes(20))
    expect(weekBookingSegments(bookings, untouched, 2026, 9)).toHaveLength(0)
  })
})
