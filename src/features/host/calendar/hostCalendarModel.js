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

export function defaultNightlyPrice(basePrice, day) {
  const offsets = [-20, -10, 0, 10, 20, 30, 40]
  return Math.max(0, Math.round(basePrice + offsets[day % offsets.length]))
}

function localDate(year, month, day) {
  return new Date(year, month, day, 12, 0, 0, 0)
}

export function makeDemoBookings(year, month) {
  const last = daysInMonth(year, month)
  const range = (start, end) => ({
    checkIn: localDate(year, month, Math.min(start, last)),
    checkOut: localDate(year, month, Math.min(end, last) + 1),
  })
  return Object.freeze([
    { id: 'bk1', guest: 'Bilel Ben Ali', guests: 3, total: '1 260 TND', status: 'Confirmée', ...range(4, 7) },
    { id: 'bk2', guest: 'Amira Khelifi', guests: 2, total: '940 TND', status: 'Confirmée', ...range(13, 15) },
    { id: 'bk3', guest: 'Karim Trabelsi', guests: 4, total: '1 680 TND', status: 'Confirmée', ...range(24, 27) },
  ])
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
