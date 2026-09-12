/* The logic behind the b225 host screens.
 *
 * The reference file is a static mock: the Today screen hard-codes "1
 * réservation en cours", the revenue card hard-codes 620 TND, the review ring
 * hard-codes 5,0. Porting the design without porting a model would keep those
 * numbers -- a host would read figures that belong to a demo. Everything a
 * b225 screen displays is derived here from the real reservation, calendar
 * and listing records, and every function is pure so a test can pin it. */

import { estimateReservationGross, reservationStatus, stayNightKeys } from './hostWorkspaceModel.js'

export const HOST_NAV_ITEMS = Object.freeze([
  { id: 'dashboard', tab: 'today', label: 'Aujourd’hui', path: '/host' },
  { id: 'calendar', tab: 'cal', label: 'Calendrier', path: '/host/calendar' },
  { id: 'listings', tab: 'list', label: 'Annonces', path: '/host/listings' },
  { id: 'messages', tab: 'msg', label: 'Messages', path: '/host/messages' },
  { id: 'menu', tab: 'menu', label: 'Menu', path: '/host/menu' },
])

/* b225's Menu screen, row for row. `kind` says whether a row navigates to a
   route or opens an overlay in place -- the reference mixes both and the
   screen has to know which without a second lookup table. */
export const HOST_MENU_ROWS = Object.freeze([
  { id: 'settings', icon: 'gear', label: 'Réglages annonce', kind: 'overlay', target: 'settings' },
  { id: 'profile', icon: 'user', label: 'Profil hôte', kind: 'route', target: '/profile' },
  { id: 'wizard', icon: 'plus', label: 'Créer une annonce', kind: 'route', target: '/host?new=1' },
  { id: 'safety', icon: 'shield', label: 'Sécurité logement', kind: 'overlay', target: 'safety' },
  { id: 'reservations', icon: 'book', label: 'Réservations', kind: 'route', target: '/host/reservations' },
  { id: 'pricing', icon: 'money', label: 'Tarifs et frais', kind: 'overlay', target: 'settings' },
  { id: 'earnings', icon: 'chart', label: 'Revenus', kind: 'route', target: '/host/earnings' },
  { id: 'help', icon: 'help', label: 'Aide', kind: 'route', target: '/help' },
])

export function dayKey(date) {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function initialsFor(label) {
  const parts = String(label || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'MV'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function guestNameFor(reservation) {
  const label = String(reservation?.guestLabel || '').trim()
  return label || `Réf. ${String(reservation?.id || '').slice(-6).toUpperCase()}`
}

/* The Today tabs. b225 shows "Aujourd'hui" and "À venir"; what belongs in
   each is a date question, not a flag on the record -- a stay is an arrival
   today, a departure today, or in progress, and anything starting later is
   upcoming. */
export function hostTodayRows(reservations = [], now = new Date()) {
  const today = dayKey(now)
  const todayRows = []
  const upcoming = []

  for (const reservation of reservations) {
    const name = guestNameFor(reservation)
    const row = { id: reservation.id, reservation, guest: name, initials: initialsFor(name) }

    /* Check-out day is tested before the status filter, deliberately.
       `reservationStatus` calls a stay past the moment check-out arrives --
       correct for booking arithmetic, since check-out day is not a night --
       but the guest is still in the property that morning and leaves at the
       check-out hour. Filtering on the status first dropped every departure
       from the one screen a host reads over breakfast. */
    if (reservation.checkOut === today) {
      todayRows.push({ ...row, kind: 'departure' })
      continue
    }
    if (reservationStatus(reservation, now) === 'past') continue
    if (reservation.checkIn === today) {
      todayRows.push({ ...row, kind: 'arrival' })
    } else if (reservationStatus(reservation, now) === 'current') {
      todayRows.push({ ...row, kind: 'staying' })
    } else {
      upcoming.push({ ...row, kind: 'upcoming' })
    }
  }

  const byDate = (a, b) => String(a.reservation.checkIn).localeCompare(String(b.reservation.checkIn))
  return { today: todayRows.sort(byDate), upcoming: upcoming.sort(byDate) }
}

export const REVIEW_WINDOW_DAYS = 14

/* "Suivis" in b225: a countdown to leave a guest a review. The reference
   prints "12 jours restants" as text; here the window is a real one that
   opens at check-out and closes REVIEW_WINDOW_DAYS later, so a stay that
   ended three weeks ago drops off the list instead of counting down forever. */
export function hostFollowUps(reservations = [], now = new Date(), reviewed = []) {
  const done = new Set(reviewed)
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()
  const rows = []
  for (const reservation of reservations) {
    if (done.has(reservation.id)) continue
    const checkOut = new Date(`${reservation.checkOut}T12:00:00`)
    if (Number.isNaN(checkOut.getTime())) continue
    const elapsed = Math.floor((todayMs - checkOut.getTime()) / 86400000)
    if (elapsed < 0 || elapsed >= REVIEW_WINDOW_DAYS) continue
    const name = guestNameFor(reservation)
    rows.push({
      id: reservation.id,
      guest: name,
      initials: initialsFor(name),
      daysLeft: REVIEW_WINDOW_DAYS - elapsed,
      reservation,
    })
  }
  return rows.sort((a, b) => a.daysLeft - b.daysLeft)
}

export const SERVICE_FEE_RATE = 0.03

/* b225's revenue page shows a per-stay breakdown, a service fee and a net
   line. The fee was a fixed −48 TND in the mock; it is a rate here, so the
   three lines always add up. */
export function hostRevenueBreakdown(rows = [], rate = SERVICE_FEE_RATE) {
  const stays = rows.map((row) => ({
    id: row.id,
    /* The room category names the row for a hotel, which has several. A villa
       or an apartment has none, and every row then read the same bare word
       "Séjour" -- three identical labels against three different amounts, with
       nothing to say which stay earned which. The guest names it instead. */
    label: row.room?.name || String(row.guestLabel || '').trim() || 'Séjour',
    nights: stayNightKeys(row.checkIn, row.checkOut).length,
    gross: Math.round(Number(row.gross) || 0),
  }))
  const gross = stays.reduce((total, stay) => total + stay.gross, 0)
  const fee = Math.round(gross * rate)
  return { stays, gross, fee, net: gross - fee }
}

export function hostRevenueByPeriod(rows = [], period = 'month', now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()
  return rows.filter((row) => {
    const date = new Date(`${row.checkIn}T12:00:00`)
    if (Number.isNaN(date.getTime())) return false
    if (period === 'month') return date.getFullYear() === year && date.getMonth() === month
    if (period === 'year') return date.getFullYear() === year
    return true
  })
}

/* The seven bars under b225's revenue card. They were literal --h values in
   the markup; here they are the last seven days of confirmed gross, scaled to
   the tallest so the chart reads even when every day is small. */
export function hostRevenueSpark(rows = [], now = new Date(), days = 7) {
  const totals = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 12)
    const key = dayKey(day)
    const total = rows.reduce((sum, row) => {
      const nights = stayNightKeys(row.checkIn, row.checkOut)
      if (!nights.includes(key)) return sum
      return sum + Math.round((Number(row.gross) || 0) / Math.max(1, nights.length))
    }, 0)
    totals.push(total)
  }
  const peak = Math.max(...totals, 0)
  return totals.map((total) => ({ total, height: peak > 0 ? Math.max(6, Math.round((total / peak) * 100)) : 6 }))
}

export const REVIEW_CATEGORIES = Object.freeze([
  { id: 'cleanliness', label: 'Propreté' },
  { id: 'accuracy', label: 'Exactitude' },
  { id: 'communication', label: 'Communication' },
  { id: 'location', label: 'Emplacement' },
  { id: 'value', label: 'Rapport qualité-prix' },
])

/* b225 hard-codes 5,0 and five full bars. With no review records a host has
   no score, and inventing one is the kind of number a host would act on.
   `hasReviews` lets the screen say so instead. */
export function hostReviewSummary(reviews = []) {
  const rows = Array.isArray(reviews) ? reviews.filter((item) => item && typeof item === 'object') : []
  if (!rows.length) {
    return {
      hasReviews: false,
      count: 0,
      score: 0,
      categories: REVIEW_CATEGORIES.map((category) => ({ ...category, score: 0, percent: 0 })),
    }
  }
  const average = (pick) => {
    const values = rows.map(pick).filter((value) => Number.isFinite(value) && value > 0)
    if (!values.length) return 0
    return values.reduce((total, value) => total + value, 0) / values.length
  }
  const categories = REVIEW_CATEGORIES.map((category) => {
    const score = average((row) => Number(row.scores?.[category.id]))
    return { ...category, score: Math.round(score * 10) / 10, percent: Math.round((score / 5) * 100) }
  })
  const overall = average((row) => Number(row.score))
  return {
    hasReviews: true,
    count: rows.length,
    score: Math.round(overall * 10) / 10,
    categories,
  }
}

export function formatMoney(value, currency = 'TND') {
  return `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} ${currency}`
}

export function formatShortDate(value) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return String(value ?? '')
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

export function formatMonth(value) {
  const date = new Date(`${value}-01T12:00:00`)
  if (Number.isNaN(date.getTime())) return String(value ?? '')
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date)
}

/* The line under the arrival card: b225 writes "Arrivée · 17:00". The hour
   comes from the listing's own check-in rule rather than a constant, so a
   hotel that opens reception at 14:00 does not advertise 17:00. */
export function todayCardTime(row, listing) {
  if (row.kind === 'arrival') return `Arrivée · ${listing?.stayRules?.checkInFrom || '15:00'}`
  if (row.kind === 'departure') return `Départ · ${listing?.stayRules?.checkOutUntil || '11:00'}`
  if (row.kind === 'staying') return 'En séjour'
  return `Arrivée ${formatShortDate(row.reservation.checkIn)}`
}

export function todayCardTitle(row) {
  if (row.kind === 'arrival') return `${row.guest} arrive`
  if (row.kind === 'departure') return `${row.guest} repart`
  if (row.kind === 'staying') return `${row.guest} est sur place`
  return `${row.guest} arrive bientôt`
}

export function reservationCountLabel(count) {
  if (!count) return 'Aucune réservation en cours'
  return `${count} réservation${count > 1 ? 's' : ''} en cours`
}

export { estimateReservationGross }
