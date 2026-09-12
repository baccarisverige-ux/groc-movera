import { describe, expect, it } from 'vitest'
import {
  HOST_MENU_ROWS,
  HOST_NAV_ITEMS,
  REVIEW_WINDOW_DAYS,
  SERVICE_FEE_RATE,
  hostFollowUps,
  hostRevenueBreakdown,
  hostRevenueByPeriod,
  hostRevenueSpark,
  hostReviewSummary,
  hostTodayRows,
  initialsFor,
  reservationCountLabel,
  todayCardTime,
  todayCardTitle,
} from '../../src/features/host/workspace/hostB225Model.js'

/* The b225 reference is a static mock: "1 réservation en cours", "620 TND",
   "5,0", "12 jours restants" are all literals in its markup. Porting the
   design without porting a model would ship those literals to a host who has
   no reservations and no reviews. These tests pin the derivations that
   replaced them. */

const NOW = new Date(2026, 8, 12, 10) // Sat 12 Sep 2026

const iso = (offsetDays) => {
  const date = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offsetDays, 12)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const stay = (id, from, to, extra = {}) => ({
  id,
  listingId: 'listing-1',
  checkIn: iso(from),
  checkOut: iso(to),
  units: 1,
  guestLabel: 'Bilel Trabelsi',
  total: 2720,
  gross: 2720,
  ...extra,
})

describe('today rows', () => {
  it('sorts a stay into arriving, departing, in-stay or upcoming by its dates', () => {
    const rows = hostTodayRows([
      stay('arrive', 0, 4),
      stay('depart', -3, 0),
      stay('staying', -2, 3),
      stay('later', 9, 13),
      stay('over', -9, -4),
    ], NOW)

    expect(rows.today.map((row) => row.kind).sort()).toEqual(['arrival', 'departure', 'staying'])
    expect(rows.upcoming.map((row) => row.id)).toEqual(['later'])
    // a finished stay belongs to neither tab
    expect([...rows.today, ...rows.upcoming].some((row) => row.id === 'over')).toBe(false)
  })

  it('reads the check-in hour off the listing rather than a constant', () => {
    const [row] = hostTodayRows([stay('a', 0, 3)], NOW).today
    expect(todayCardTime(row, { stayRules: { checkInFrom: '14:00' } })).toBe('Arrivée · 14:00')
    expect(todayCardTime(row, {})).toBe('Arrivée · 15:00')
  })

  it('names the card after what is actually happening', () => {
    const rows = hostTodayRows([stay('a', 0, 3), stay('b', -2, 0, { guestLabel: 'Sara Ben Ali' })], NOW).today
    const arrival = rows.find((row) => row.kind === 'arrival')
    const departure = rows.find((row) => row.kind === 'departure')
    expect(todayCardTitle(arrival)).toBe('Bilel Trabelsi arrive')
    expect(todayCardTitle(departure)).toBe('Sara Ben Ali repart')
  })

  /* A reservation with no guest name is not an anonymous blank -- the host
     still has to identify it, so it falls back to the booking reference. */
  it('never renders a nameless guest', () => {
    const [row] = hostTodayRows([stay('ref-abc123', 0, 3, { guestLabel: '' })], NOW).today
    expect(row.guest).toContain('ABC123')
    expect(row.initials).toBeTruthy()
  })

  it('counts what the tab is showing', () => {
    expect(reservationCountLabel(0)).toBe('Aucune réservation en cours')
    expect(reservationCountLabel(1)).toBe('1 réservation en cours')
    expect(reservationCountLabel(3)).toBe('3 réservations en cours')
  })
})

describe('follow-ups', () => {
  /* b225 prints "12 jours restants" as text. Here the window is real: it
     opens at check-out and shuts REVIEW_WINDOW_DAYS later, so a stay that
     ended a month ago stops asking to be reviewed. */
  it('counts down only inside the review window', () => {
    const rows = hostFollowUps([
      stay('fresh', -1, -1),
      stay('edge', -REVIEW_WINDOW_DAYS + 1, -REVIEW_WINDOW_DAYS + 1),
      stay('expired', -40, -30),
      stay('future', 2, 6),
    ], NOW)

    expect(rows.map((row) => row.id)).toEqual(['edge', 'fresh'])
    expect(rows.find((row) => row.id === 'fresh').daysLeft).toBe(REVIEW_WINDOW_DAYS - 1)
    expect(rows.find((row) => row.id === 'edge').daysLeft).toBe(1)
  })

  it('drops a stay the host has already reviewed', () => {
    expect(hostFollowUps([stay('done', -2, -2)], NOW, ['done'])).toHaveLength(0)
  })
})

describe('revenue', () => {
  it('makes the three lines add up', () => {
    const breakdown = hostRevenueBreakdown([stay('a', -4, 0), stay('b', 2, 6)])
    expect(breakdown.gross).toBe(5440)
    expect(breakdown.fee).toBe(Math.round(5440 * SERVICE_FEE_RATE))
    expect(breakdown.net).toBe(breakdown.gross - breakdown.fee)
  })

  /* The defect this covers: the row label read `row.room?.name || 'Séjour'`,
     and a villa has no room categories -- so every line of the breakdown said
     "Séjour" against a different amount, with nothing to tell them apart. */
  it('labels a stay even when the listing has no room categories', () => {
    const breakdown = hostRevenueBreakdown([
      stay('a', -4, 0, { guestLabel: 'Bilel Trabelsi' }),
      stay('b', 2, 6, { guestLabel: 'Sara Ben Ali' }),
      stay('c', 8, 12, { room: { name: 'Suite Deluxe' } }),
    ])
    expect(breakdown.stays.map((item) => item.label)).toEqual(['Bilel Trabelsi', 'Sara Ben Ali', 'Suite Deluxe'])
  })

  it('scopes to the period the tab asks for', () => {
    const rows = [stay('this-month', 1, 4), { ...stay('last-year', 0, 3), checkIn: '2025-03-02', checkOut: '2025-03-06' }]
    expect(hostRevenueByPeriod(rows, 'month', NOW).map((row) => row.id)).toEqual(['this-month'])
    expect(hostRevenueByPeriod(rows, 'year', NOW).map((row) => row.id)).toEqual(['this-month'])
    expect(hostRevenueByPeriod(rows, 'all', NOW)).toHaveLength(2)
  })

  /* The seven bars were literal --h values in the reference. Scaling to the
     tallest day is what makes the chart readable when every day is small; a
     floor keeps a zero week from rendering as nothing at all. */
  it('scales the spark to its own peak and survives an empty week', () => {
    const bars = hostRevenueSpark([stay('a', -2, 0)], NOW)
    expect(bars).toHaveLength(7)
    expect(Math.max(...bars.map((bar) => bar.height))).toBe(100)
    expect(hostRevenueSpark([], NOW).every((bar) => bar.height === 6)).toBe(true)
  })
})

describe('reviews', () => {
  /* b225 hard-codes 5,0 and five full bars. With no reviews there is no
     score, and showing one is a number a host would act on. */
  it('reports no score rather than inventing one', () => {
    const summary = hostReviewSummary([])
    expect(summary.hasReviews).toBe(false)
    expect(summary.count).toBe(0)
    expect(summary.score).toBe(0)
    expect(summary.categories.every((category) => category.percent === 0)).toBe(true)
  })

  it('averages the overall score and every category', () => {
    const summary = hostReviewSummary([
      { id: 'r1', score: 5, scores: { cleanliness: 5, accuracy: 5, communication: 5, location: 5, value: 4 } },
      { id: 'r2', score: 4, scores: { cleanliness: 4, accuracy: 5, communication: 5, location: 5, value: 4 } },
    ])
    expect(summary.hasReviews).toBe(true)
    expect(summary.count).toBe(2)
    expect(summary.score).toBe(4.5)
    expect(summary.categories.find((item) => item.id === 'cleanliness').score).toBe(4.5)
    expect(summary.categories.find((item) => item.id === 'value').score).toBe(4)
    expect(summary.categories.find((item) => item.id === 'accuracy').percent).toBe(100)
  })
})

describe('initials', () => {
  it('takes one letter per name, two letters from a single name', () => {
    expect(initialsFor('Bilel Trabelsi')).toBe('BT')
    expect(initialsFor('Karim')).toBe('KA')
    expect(initialsFor('  ')).toBe('MV')
  })
})

describe('navigation tables', () => {
  it('keeps the dock to the five b225 tabs', () => {
    expect(HOST_NAV_ITEMS).toHaveLength(5)
    expect(HOST_NAV_ITEMS.map((item) => item.tab)).toEqual(['today', 'cal', 'list', 'msg', 'menu'])
  })

  /* Every menu row either routes or opens an overlay. A row with neither is a
     dead tap, which is how the Menu tab shipped pointing at a route that had
     never been registered. */
  it('gives every menu row a destination of a known kind', () => {
    for (const row of HOST_MENU_ROWS) {
      expect(['route', 'overlay'], row.id).toContain(row.kind)
      expect(row.target, row.id).toBeTruthy()
      expect(row.label, row.id).toBeTruthy()
      expect(row.icon, row.id).toBeTruthy()
    }
  })
})
