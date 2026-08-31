import { useEffect, useMemo, useState } from 'react'
import { HOST_CALENDAR_EVENT, readHostCalendarForListing } from '../../entities/host/hostCalendarStore.js'
import './listing-availability.css'
import './listing-availability-modal.css'

const WEEKDAYS = Object.freeze(['L', 'M', 'M', 'J', 'V', 'S', 'D'])
const MONTHS = Object.freeze(['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'])

function ChevronIcon({ direction = 'right' }) {
  const path = direction === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path}/></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
}

function dayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildMonthCells(year, month) {
  const padding = (new Date(year, month, 1, 12).getDay() + 6) % 7
  const total = new Date(year, month + 1, 0, 12).getDate()
  return [...Array(padding).fill(null), ...Array.from({ length: total }, (_, index) => index + 1)]
}

function defaultNightlyPrice(basePrice, day) {
  const offsets = [-20, -10, 0, 10, 20, 30, 40]
  return Math.max(0, Math.round(basePrice + offsets[day % offsets.length]))
}

function monthLabel(year, month) {
  return `${MONTHS[month]} ${year}`
}

function atMidday(year, month, day) {
  return new Date(year, month, day, 12, 0, 0, 0)
}

function isPastDay(year, month, day, now) {
  const today = atMidday(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return atMidday(year, month, day).getTime() < today
}

function isToday(year, month, day, now) {
  return year === now.getFullYear() && month === now.getMonth() && day === now.getDate()
}

export function ListingAvailabilityModal({ listing, onClose }) {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [calendar, setCalendar] = useState(() => readHostCalendarForListing(listing.id))

  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const basePrice = Number(listing.nightlyRate) > 0 ? Number(listing.nightlyRate) : 180
  const currency = listing.currency || 'TND'

  useEffect(() => {
    const sync = () => setCalendar(readHostCalendarForListing(listing.id))
    sync()
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

        {calendar.linked ? (
          <section className="listing-availability-modal__calendar" aria-label={`Calendrier ${monthLabel(year, month)}`}>
            <div className="listing-availability__head">
              <button type="button" aria-label="Mois précédent" disabled={previousDisabled} onClick={() => changeMonth(-1)}><ChevronIcon direction="left" /></button>
              <strong>{monthLabel(year, month)}</strong>
              <button type="button" aria-label="Mois suivant" onClick={() => changeMonth(1)}><ChevronIcon /></button>
            </div>

            <div className="listing-availability__weekdays" aria-hidden="true">
              {WEEKDAYS.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
            </div>

            <div className="listing-availability__grid" data-testid="listing-availability-grid" aria-label={`Disponibilités ${monthLabel(year, month)}`}>
              {cells.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} className="listing-availability__empty" aria-hidden="true" />
                const key = dayKey(year, month, day)
                const settings = calendar.days[key] || {}
                const past = isPastDay(year, month, day, now)
                const blocked = !past && Boolean(settings.blocked)
                const price = settings.price ?? defaultNightlyPrice(basePrice, day)
                const status = past ? 'past' : blocked ? 'blocked' : 'free'
                const priceText = !past && !blocked ? `${price} ${currency}` : ''

                return (
                  <span
                    key={key}
                    className="listing-availability__day"
                    data-day-key={key}
                    data-status={status}
                    data-today={isToday(year, month, day, now) ? 'true' : 'false'}
                    aria-label={`${day} ${monthLabel(year, month)}, ${past ? 'passé' : blocked ? 'indisponible' : `disponible, ${priceText}`}`}
                  >
                    <b>{day}</b>
                    <small>{past ? '' : blocked ? '—' : price}</small>
                  </span>
                )
              })}
            </div>

            <div className="listing-availability__legend">
              <span><i data-kind="free" />Libre</span>
              <span><i data-kind="blocked" />Indisponible</span>
            </div>
            <p className="listing-availability-modal__hint">Disponibilités et tarifs définis par l’hôte pour ce logement.</p>
          </section>
        ) : (
          <div className="listing-availability-modal__unlinked">
            <strong>Calendrier hôte non synchronisé</strong>
            <p>La disponibilité doit être confirmée avec l’hôte. Movera n’affiche pas de dates statiques comme si elles provenaient du calendrier.</p>
          </div>
        )}

        <button type="button" className="listing-availability-modal__done" onClick={onClose}>Terminé</button>
      </section>
    </div>
  )
}
