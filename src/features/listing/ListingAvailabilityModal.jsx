import { useEffect, useMemo, useState } from 'react'
import { HOST_CALENDAR_EVENT, readHostCalendarForListing } from '../../entities/host/hostCalendarStore.js'
import { findHostProfileByListingId } from '../../entities/host/hostProfileStore.js'
import './listing-availability.css'
import './listing-availability-modal.css'

const WEEKDAYS = Object.freeze(['L', 'M', 'M', 'J', 'V', 'S', 'D'])
const MONTHS = Object.freeze(['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'])
const PROMOTIONS = Object.freeze({
  'new-listing': { label: 'Promotion nouveau logement', value: 20 },
  'last-minute': { label: 'Dernière minute', value: 7 },
  weekly: { label: 'Réduction semaine', value: 10 },
  monthly: { label: 'Réduction mensuelle', value: 25 },
})

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

function keyFromDate(date) {
  return dayKey(date.getFullYear(), date.getMonth(), date.getDate())
}

function dateFromKey(key) {
  if (!key) return null
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
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

function formatShortDate(key) {
  const date = dateFromKey(key)
  if (!date) return 'Sélectionner'
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

function nightCount(checkIn, checkOut) {
  const start = dateFromKey(checkIn)
  const end = dateFromKey(checkOut)
  if (!start || !end || end <= start) return 0
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

function rangeHasBlockedNight(days, startDate, endDate) {
  if (!startDate || !endDate || endDate <= startDate) return false
  const cursor = new Date(startDate)
  while (cursor < endDate) {
    if (days[keyFromDate(cursor)]?.blocked) return true
    cursor.setDate(cursor.getDate() + 1)
  }
  return false
}

function rangeTotal(days, checkIn, checkOut, basePrice) {
  const start = dateFromKey(checkIn)
  const end = dateFromKey(checkOut)
  if (!start || !end || end <= start) return 0
  let total = 0
  const cursor = new Date(start)
  while (cursor < end) {
    const key = keyFromDate(cursor)
    const settings = days[key] || {}
    total += settings.price ?? defaultNightlyPrice(basePrice, cursor.getDate())
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(0, Math.round(total))
}

function bestDiscount(promotions, checkIn, nights, now) {
  if (!checkIn || !nights || !Array.isArray(promotions)) return null
  const arrival = dateFromKey(checkIn)
  const daysToArrival = arrival ? Math.max(0, Math.floor((arrival.getTime() - atMidday(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)) : Infinity
  const candidates = []

  promotions.forEach((id) => {
    const promotion = PROMOTIONS[id]
    if (!promotion) return
    if (id === 'last-minute' && daysToArrival > 7) return
    if (id === 'weekly' && nights < 7) return
    if (id === 'monthly' && nights < 28) return
    candidates.push({ id, ...promotion })
  })

  return candidates.sort((a, b) => b.value - a.value)[0] || null
}

export function ListingAvailabilityModal({ listing, onClose }) {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [calendar, setCalendar] = useState(() => readHostCalendarForListing(listing.id, listing.roomTypeId || ''))
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [selectionError, setSelectionError] = useState('')

  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const hostProfile = useMemo(() => findHostProfileByListingId(listing.id), [listing.id])
  const promotions = hostProfile?.listing?.promotions || []
  const basePrice = Number(listing.nightlyRate) > 0 ? Number(listing.nightlyRate) : Number(hostProfile?.listing?.basePrice) > 0 ? Number(hostProfile.listing.basePrice) : 180
  const currency = listing.currency || hostProfile?.listing?.currency || 'TND'
  const nights = nightCount(checkIn, checkOut)
  const originalTotal = nights ? rangeTotal(calendar.days, checkIn, checkOut, basePrice) : 0
  const discount = bestDiscount(promotions, checkIn, nights, now)
  const finalTotal = discount ? Math.max(0, Math.round(originalTotal * (1 - discount.value / 100))) : originalTotal
  const saving = Math.max(0, originalTotal - finalTotal)

  useEffect(() => {
    const sync = () => setCalendar(readHostCalendarForListing(listing.id, listing.roomTypeId || ''))
    sync()
    window.addEventListener(HOST_CALENDAR_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_CALENDAR_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listing.id, listing.roomTypeId])

  const changeMonth = (delta) => {
    const next = new Date(year, month + delta, 1, 12)
    const floor = new Date(now.getFullYear(), now.getMonth(), 1, 12)
    if (next < floor) return
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  const selectDate = (key) => {
    const picked = dateFromKey(key)
    if (!picked) return
    setSelectionError('')

    if (!checkIn || checkOut) {
      setCheckIn(key)
      setCheckOut('')
      return
    }

    const start = dateFromKey(checkIn)
    if (picked <= start) {
      setCheckIn(key)
      setCheckOut('')
      return
    }

    if (rangeHasBlockedNight(calendar.days, start, picked)) {
      setSelectionError('Ce séjour traverse une date indisponible. Choisissez un départ avant la date bloquée.')
      return
    }

    setCheckOut(key)
  }

  const previousDisabled = year === now.getFullYear() && month === now.getMonth()
  const startDate = dateFromKey(checkIn)
  const endDate = dateFromKey(checkOut)

  return (
    <div className="listing-availability-modal" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="listing-availability-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="listing-availability-title" data-calendar-linked={calendar.linked ? 'true' : 'false'} data-room-type-id={listing.roomTypeId || ''}>
        <div className="listing-availability-modal__handle" aria-hidden="true" />
        <header className="listing-availability-modal__head">
          <div>
            <span className="listing-availability-modal__eyebrow">Movera Host</span>
            <h2 id="listing-availability-title">Choisissez vos dates</h2>
            <p>{listing.roomTypeName ? `${listing.roomTypeName} · ` : ''}Arrivée puis départ · aucune nuit indisponible entre les deux</p>
          </div>
          <button type="button" className="listing-availability-modal__close" aria-label="Fermer le calendrier" onClick={onClose}><CloseIcon /></button>
        </header>

        {calendar.linked ? (
          <>
            <div className="listing-availability-modal__selection" aria-label="Dates du séjour">
              <span data-active={checkIn ? 'true' : 'false'}><small>Arrivée</small><strong>{formatShortDate(checkIn)}</strong></span>
              <i aria-hidden="true">→</i>
              <span data-active={checkOut ? 'true' : 'false'}><small>Départ</small><strong>{formatShortDate(checkOut)}</strong></span>
            </div>

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
                  const date = atMidday(year, month, day)
                  const past = isPastDay(year, month, day, now)
                  const blocked = !past && Boolean(settings.blocked)
                  const isAfterStart = Boolean(startDate && date > startDate && !endDate)
                  const unreachable = isAfterStart && rangeHasBlockedNight(calendar.days, startDate, date)
                  const disabled = past || blocked || unreachable
                  const price = settings.price ?? defaultNightlyPrice(basePrice, day)
                  const status = past ? 'past' : blocked ? 'blocked' : unreachable ? 'unreachable' : 'free'
                  const selectedStart = key === checkIn
                  const selectedEnd = key === checkOut
                  const inRange = Boolean(startDate && endDate && date > startDate && date < endDate)
                  const priceText = !past && !blocked ? `${price} ${currency}` : ''

                  return (
                    <button
                      type="button"
                      key={key}
                      className="listing-availability__day"
                      data-day-key={key}
                      data-status={status}
                      data-today={isToday(year, month, day, now) ? 'true' : 'false'}
                      data-start={selectedStart ? 'true' : 'false'}
                      data-end={selectedEnd ? 'true' : 'false'}
                      data-range={inRange ? 'true' : 'false'}
                      disabled={disabled}
                      aria-pressed={selectedStart || selectedEnd}
                      aria-label={`${day} ${monthLabel(year, month)}, ${past ? 'passé' : blocked ? 'indisponible' : unreachable ? 'non sélectionnable, une date bloquée se trouve avant' : `disponible, ${priceText}`}`}
                      onClick={() => selectDate(key)}
                    >
                      <b>{day}</b>
                      <small>{past ? '' : blocked || unreachable ? '—' : price}</small>
                    </button>
                  )
                })}
              </div>

              <div className="listing-availability__legend">
                <span><i data-kind="free" />Libre</span>
                <span><i data-kind="blocked" />Indisponible</span>
              </div>
              <p className="listing-availability-modal__hint">Touchez d’abord le jour d’arrivée, puis le jour de départ.</p>
              {selectionError ? <p className="listing-availability-modal__error" role="alert">{selectionError}</p> : null}
            </section>

            {nights > 0 ? (
              <section className="listing-availability-modal__price" aria-label="Prix du séjour">
                <div className="listing-availability-modal__price-head">
                  <span><strong>{nights} nuit{nights > 1 ? 's' : ''}</strong><small>{formatShortDate(checkIn)} → {formatShortDate(checkOut)}</small></span>
                  {discount ? <b>−{discount.value}%</b> : null}
                </div>
                {discount ? (
                  <div className="listing-availability-modal__price-total is-discounted">
                    <span><small>Avant réduction</small><del>{originalTotal} {currency}</del></span>
                    <span><small>{discount.label}</small><strong>{finalTotal} {currency}</strong></span>
                  </div>
                ) : (
                  <div className="listing-availability-modal__price-total">
                    <span><small>Total du séjour</small><strong>{finalTotal} {currency}</strong></span>
                  </div>
                )}
                {discount && saving ? <p>Vous économisez {saving} {currency} sur ce séjour.</p> : null}
              </section>
            ) : null}
          </>
        ) : (
          <div className="listing-availability-modal__unlinked">
            <strong>Calendrier hôte non synchronisé</strong>
            <p>La disponibilité doit être confirmée avec l’hôte. Movera n’affiche pas de dates statiques comme si elles provenaient du calendrier.</p>
          </div>
        )}

        {nights > 0 ? <button type="button" className="listing-availability-modal__done" onClick={onClose}>Choisir ces dates</button> : null}
      </section>
    </div>
  )
}
