import { useEffect, useMemo, useState } from 'react'
import { HOST_CALENDAR_EVENT, readHostCalendarForListing } from '../../entities/host/hostCalendarStore.js'
import { ListingAvailabilityModal } from './ListingAvailabilityModal.jsx'
import './listing-availability.css'

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  )
}

function ChevronGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
}

function dayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function availabilitySummary(calendar, now) {
  if (!calendar.linked) return 'Voir le calendrier de l’hôte'
  let free = 0
  let blocked = 0
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12)
    const key = dayKey(date.getFullYear(), date.getMonth(), date.getDate())
    if (calendar.days[key]?.blocked) blocked += 1
    else free += 1
  }
  if (!free) return 'Aucune date libre sur les 14 prochains jours'
  if (!blocked) return 'Disponible selon le calendrier de l’hôte'
  return `${free} jour${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''} sur les 14 prochains`
}

export function ListingAvailability({ listingId, basePrice = 0, currency = 'TND' }) {
  const now = useMemo(() => new Date(), [])
  const [open, setOpen] = useState(false)
  const [calendar, setCalendar] = useState(() => readHostCalendarForListing(listingId))

  useEffect(() => {
    const sync = () => setCalendar(readHostCalendarForListing(listingId))
    sync()
    window.addEventListener(HOST_CALENDAR_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_CALENDAR_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listingId])

  const summary = availabilitySummary(calendar, now)

  return (
    <>
      <section className="listing-availability" id="listing-availability" data-calendar-linked={calendar.linked ? 'true' : 'false'}>
        <button type="button" className="listing-availability__row" aria-expanded={open} onClick={() => setOpen(true)}>
          <span className="listing-availability__icon"><CalendarGlyph /></span>
          <span className="listing-availability__copy">
            <strong>Disponibilité</strong>
            <span>{summary}</span>
          </span>
          <span className="listing-availability__chevron"><ChevronGlyph /></span>
        </button>
      </section>

      {open ? (
        <ListingAvailabilityModal
          listing={{ id: listingId, title: 'Calendrier de l’hôte', nightlyRate: basePrice, currency }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
