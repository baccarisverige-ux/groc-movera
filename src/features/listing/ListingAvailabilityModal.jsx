import { useEffect, useMemo, useState } from 'react'
import { HOST_CALENDAR_EVENT, readHostCalendarForListing } from '../../entities/host/hostCalendarStore.js'
import {
  HOST_WEEKDAYS,
  bookingRole,
  buildMonthCells,
  dayKey,
  defaultNightlyPrice,
  findBookingForDay,
  isToday,
  makeDemoBookings,
  monthLabel,
} from '../host/calendar/hostCalendarModel.js'
import '../host/calendar/host-calendar-page.css'
import './listing-availability-modal.css'

function ChevronIcon({ direction = 'right' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" data-direction={direction}><path d="m9 6 6 6-6 6"/></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
}

function atMidday(year, month, day) {
  return new Date(year, month, day, 12, 0, 0, 0)
}

function isPastDay(year, month, day, now) {
  const today = atMidday(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return atMidday(year, month, day).getTime() < today
}

export function ListingAvailabilityModal({ listing, onClose }) {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [calendar, setCalendar] = useState(() => readHostCalendarForListing(listing.id))

  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const bookings = useMemo(() => makeDemoBookings(year, month), [year, month])
  const basePrice = Number(listing.nightlyRate) > 0 ? Number(listing.nightlyRate) : 180

  useEffect(() => {
    const sync = () => setCalendar(readHostCalendarForListing(listing.id))
    window.addEventListener(HOST_CALENDAR_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_CALENDAR_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listing.id])

  const changeMonth = (delta) => {
    const next = new Date(year, month + delta, 1, 12)
    const floor = new Date(now.getFullYear(), now.getMonth(), 1, 12)
    if (next < floor) return
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  const previousDisabled = year === now.getFullYear() && month === now.getMonth()

  return (
    <div className="listing-availability-modal" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="listing-availability-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="listing-availability-title" data-calendar-linked={calendar.linked ? 'true' : 'false'}>
        <div className="listing-availability-modal__handle" aria-hidden="true" />
        <header className="listing-availability-modal__head">
          <div>
            <span className="listing-availability-modal__eyebrow">Movera Host</span>
            <h2 id="listing-availability-title">Disponibilités</h2>
            <p>{listing.title}</p>
          </div>
          <button type="button" className="listing-availability-modal__close" aria-label="Fermer le calendrier" onClick={onClose}><CloseIcon /></button>
        </header>

        <section className="host-calendar listing-availability-modal__calendar" aria-label={`Calendrier ${monthLabel(year, month)}`}>
          <div className="host-calendar__monthbar">
            <button type="button" aria-label="Mois précédent" disabled={previousDisabled} onClick={() => changeMonth(-1)}><ChevronIcon direction="left" /></button>
            <strong>{monthLabel(year, month)}</strong>
            <button type="button" aria-label="Mois suivant" onClick={() => changeMonth(1)}><ChevronIcon /></button>
          </div>

          <div className="host-calendar__grid" data-testid="listing-availability-grid">
            {HOST_WEEKDAYS.map((label, index) => <div key={`${label}-${index}`} className="host-calendar__dow">{label}</div>)}
            {cells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} className="host-calendar__blank" aria-hidden="true" />
              const key = dayKey(year, month, day)
              const data = calendar.days[key] || {}
              const booking = findBookingForDay(bookings, year, month, day)
              const role = booking ? bookingRole(booking, year, month, day) : ''
              const past = isPastDay(year, month, day, now)
              const blocked = (Boolean(data.blocked) || past) && !booking
              const price = data.price ?? defaultNightlyPrice(basePrice, day)
              const classes = [
                'host-calendar__day',
                blocked ? 'is-blocked' : '',
                booking ? 'has-booking' : '',
                booking ? `book-${role}` : '',
                isToday(year, month, day, now) ? 'is-today' : '',
                past ? 'is-past' : '',
              ].filter(Boolean).join(' ')
              const status = booking ? 'réservé' : blocked ? 'indisponible' : 'libre'

              return (
                <div key={key} className={classes} data-day-key={key} data-status={status} aria-label={`${day} ${monthLabel(year, month)}, ${status}${!blocked && !booking ? `, ${price} TND` : ''}`}>
                  <span className="host-calendar__number">{day}</span>
                  <span className="host-calendar__price">{blocked || booking ? '—' : `${price}`}</span>
                  {booking ? <i className="host-calendar__booking-bar" aria-hidden="true" /> : null}
                  {booking && (role === 'start' || role === 'both') ? <span className="host-calendar__guest" aria-hidden="true">R</span> : null}
                </div>
              )
            })}
          </div>

          <div className="host-calendar__legend">
            <span><i className="free" />Libre</span>
            <span><i className="booked" />Réservé</span>
            <span><i className="blocked" />Bloqué</span>
          </div>
          <p className="host-calendar__hint">Les disponibilités sont pilotées depuis le calendrier de l’hôte.</p>
        </section>

        <button type="button" className="listing-availability-modal__done" onClick={onClose}>Terminé</button>
      </section>
    </div>
  )
}
