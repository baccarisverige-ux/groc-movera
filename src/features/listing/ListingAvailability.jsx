import { useEffect, useMemo, useState } from 'react'
import { HOST_CALENDAR_EVENT, readHostCalendarForListing } from '../../entities/host/hostCalendarStore.js'
import './listing-availability.css'

const WEEKDAYS = Object.freeze(['L', 'M', 'M', 'J', 'V', 'S', 'D'])
const MONTHS = Object.freeze(['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'])

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  )
}

function ChevronGlyph({ direction = 'down' }) {
  const path = direction === 'left' ? 'm15 6-6 6 6 6' : direction === 'right' ? 'm9 6 6 6-6 6' : 'm6 9 6 6 6-6'
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg>
}

function dayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthCells(year, month) {
  const offset = (new Date(year, month, 1, 12).getDay() + 6) % 7
  const total = new Date(year, month + 1, 0, 12).getDate()
  return [...Array(offset).fill(null), ...Array.from({ length: total }, (_, index) => index + 1)]
}

function localDay(year, month, day) {
  return new Date(year, month, day, 12, 0, 0, 0)
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatPrice(value, currency) {
  const amount = Math.round(Number(value) || 0)
  return amount > 0 ? `${amount} ${currency}` : ''
}

function availabilitySummary(calendar, now) {
  if (!calendar.linked) return 'À confirmer avec l’hôte'
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
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1, 12))
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

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => monthCells(year, month), [year, month])
  const summary = availabilitySummary(calendar, now)
  const currentMonth = year === now.getFullYear() && month === now.getMonth()

  const changeMonth = (delta) => {
    const next = new Date(year, month + delta, 1, 12)
    const floor = new Date(now.getFullYear(), now.getMonth(), 1, 12)
    if (next < floor) return
    setCursor(next)
  }

  return (
    <section className="listing-availability" id="listing-availability" data-calendar-linked={calendar.linked ? 'true' : 'false'}>
      <button type="button" className="listing-availability__row" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="listing-availability__icon"><CalendarGlyph /></span>
        <span className="listing-availability__copy">
          <strong>Disponibilité</strong>
          <span>{summary}</span>
        </span>
        <span className={open ? 'listing-availability__chevron is-open' : 'listing-availability__chevron'}><ChevronGlyph /></span>
      </button>

      {open ? (
        <div className="listing-availability__panel">
          {calendar.linked ? (
            <>
              <div className="listing-availability__head">
                <button type="button" aria-label="Mois précédent" disabled={currentMonth} onClick={() => changeMonth(-1)}><ChevronGlyph direction="left" /></button>
                <strong>{MONTHS[month]} {year}</strong>
                <button type="button" aria-label="Mois suivant" onClick={() => changeMonth(1)}><ChevronGlyph direction="right" /></button>
              </div>

              <div className="listing-availability__weekdays" aria-hidden="true">
                {WEEKDAYS.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
              </div>

              <div className="listing-availability__grid" aria-label={`Disponibilités ${MONTHS[month]} ${year}`}>
                {cells.map((day, index) => {
                  if (!day) return <span key={`empty-${index}`} className="listing-availability__empty" aria-hidden="true" />
                  const date = localDay(year, month, day)
                  const past = date < localDay(now.getFullYear(), now.getMonth(), now.getDate())
                  const key = dayKey(year, month, day)
                  const settings = calendar.days[key] || {}
                  const blocked = !past && Boolean(settings.blocked)
                  const price = settings.price ?? basePrice
                  const status = past ? 'past' : blocked ? 'blocked' : 'free'
                  const priceLabel = !past && !blocked ? formatPrice(price, currency) : ''
                  return (
                    <span
                      key={key}
                      className="listing-availability__day"
                      data-status={status}
                      data-today={isSameDay(date, now) ? 'true' : 'false'}
                      aria-label={`${day} ${MONTHS[month]} ${year}, ${past ? 'passé' : blocked ? 'indisponible' : `disponible${priceLabel ? `, ${priceLabel}` : ''}`}`}
                    >
                      <b>{day}</b>
                      <small>{past ? '' : blocked ? '—' : priceLabel ? String(Math.round(Number(price) || 0)) : 'Libre'}</small>
                    </span>
                  )
                })}
              </div>

              <div className="listing-availability__legend">
                <span><i data-kind="free" />Libre</span>
                <span><i data-kind="blocked" />Indisponible</span>
              </div>
              <p>Disponibilités et tarifs synchronisés avec le calendrier défini par l’hôte pour ce logement.</p>
            </>
          ) : (
            <div className="listing-availability__unlinked">
              <strong>Calendrier hôte non synchronisé</strong>
              <p>La disponibilité de ce logement doit être confirmée avec l’hôte. Aucune date statique n’est affichée comme si elle était réelle.</p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
