const MONTH_NAMES = Object.freeze(['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'])
export const HOST_WEEKDAYS = Object.freeze(['L','M','M','J','V','S','D'])

export function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`
}

export function dayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function monthStartPadding(year, month) {
  return (new Date(year, month, 1).getDay() + 6) % 7
}

export function buildMonthCells(year, month) {
  const cells = Array(monthStartPadding(year, month)).fill(null)
  for (let day = 1; day <= daysInMonth(year, month); day += 1) cells.push(day)
  return cells
}

export function defaultNightlyPrice(basePrice) {
  return Math.max(0, Math.round(Number(basePrice) || 0))
}

/* The month grid, split into weeks.

   The calendar draws a booking as one bar running across the nights it covers,
   and a bar cannot cross a row: a stay from Thursday to Tuesday is two
   segments, not one. Weeks are therefore the unit the grid is built from, and
   a segment carries whether it is the true start of the stay -- only the true
   start shows the guest's name and avatar, so a stay spanning three weeks is
   labelled once rather than three times. */
export function buildMonthWeeks(year, month) {
  const cells = buildMonthCells(year, month)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return weeks
}

/* A continuous run of months starting at the given one -- what the screen
   scrolls through instead of paging. */
export function monthsFrom(year, month, count) {
  const months = []
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(year, month + offset, 1)
    months.push({ year: date.getFullYear(), month: date.getMonth() })
  }
  return months
}

export function monthName(month) {
  return MONTH_NAMES[month] || ''
}

/* Where a booking sits inside one week row: the first column it occupies, how
   many columns it spans, and whether this segment opens the stay. */
export function weekBookingSegments(bookings, week, year, month) {
  const segments = []
  for (const booking of bookings) {
    let start = -1
    let span = 0
    for (let index = 0; index < week.length; index += 1) {
      const day = week[index]
      const covered = day != null && bookingCoversDay(booking, year, month, day)
      if (covered) {
        if (start === -1) start = index
        span += 1
      } else if (start !== -1) {
        break
      }
    }
    if (start === -1) continue
    const firstDay = week[start]
    const role = bookingRole(booking, year, month, firstDay)
    segments.push({
      booking,
      start,
      span,
      opensStay: role === 'start' || role === 'both',
      closesInWeek: bookingRole(booking, year, month, week[start + span - 1]) === 'end'
        || bookingRole(booking, year, month, week[start + span - 1]) === 'both',
    })
  }
  return segments
}

function guestInitials(label) {
  const text = String(label || '').trim()
  if (!text) return 'V'
  const parts = text.split(/\s+/)
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : text.slice(0, 2)).toUpperCase()
}

/* Real reservations become calendar bookings.

   The calendar showed nothing here: makeDemoBookings returned an empty list,
   and it was right not to invent stays -- but it left the host with a grid
   that never showed the bookings they actually had. These come from the
   confirmed reservations in this listing's inventory, the same rows the inbox
   and the reservations screen read. */
export function bookingsFromReservations(reservations, roomTypeId = '') {
  return (reservations || [])
    .filter((item) => !roomTypeId || !item.roomTypeId || item.roomTypeId === roomTypeId)
    .map((item) => {
      const checkIn = new Date(`${item.checkIn}T12:00:00`)
      const checkOut = new Date(`${item.checkOut}T12:00:00`)
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) return null
      const guest = item.guestLabel || 'Voyageur Movera'
      return {
        id: item.id,
        guest,
        initials: guestInitials(guest),
        units: Math.max(1, Number(item.units) || 1),
        total: Math.max(0, Number(item.total) || 0),
        roomTypeId: item.roomTypeId || '',
        checkIn,
        checkOut,
      }
    })
    .filter(Boolean)
}

function localDate(year, month, day) {
  return new Date(year, month, day, 12, 0, 0, 0)
}

export function makeDemoBookings() {
  return Object.freeze([])
}

export function bookingCoversDay(booking, year, month, day) {
  const current = localDate(year, month, day).getTime()
  return current >= booking.checkIn.getTime() && current < booking.checkOut.getTime()
}

export function bookingRole(booking, year, month, day) {
  const current = localDate(year, month, day)
  const start = booking.checkIn
  const lastNight = new Date(booking.checkOut.getFullYear(), booking.checkOut.getMonth(), booking.checkOut.getDate() - 1, 12)
  const isStart = current.getFullYear() === start.getFullYear() && current.getMonth() === start.getMonth() && current.getDate() === start.getDate()
  const isEnd = current.getFullYear() === lastNight.getFullYear() && current.getMonth() === lastNight.getMonth() && current.getDate() === lastNight.getDate()
  if (isStart && isEnd) return 'both'
  if (isStart) return 'start'
  if (isEnd) return 'end'
  return 'mid'
}

export function findBookingForDay(bookings, year, month, day) {
  return bookings.find((booking) => bookingCoversDay(booking, year, month, day)) || null
}

export function isToday(year, month, day, now = new Date()) {
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}
