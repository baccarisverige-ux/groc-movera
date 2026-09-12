import { useEffect, useMemo, useState } from 'react'
import { OptimizedListingImage } from '../../../shared/media/OptimizedListingImage.jsx'
import { readHostCalendar, readHostCalendarForListing, writeHostCalendarDays } from '../../../entities/host/hostCalendarStore.js'
import { HOST_PROFILE_EVENT, supportsPooledRoomInventory, updateHostRoomTypeTotal, useHostProfile } from '../../../entities/host/hostProfileStore.js'
import {
  HOST_ROOM_INVENTORY_EVENT,
  listConfirmedRoomReservationsForListing,
  readHostRoomInventoryForListing,
  remainingRoomUnitsForDay,
} from '../../../entities/host/hostRoomInventoryStore.js'
import { useAuthSession } from '../../auth/authSession.js'
import {
  HOST_WEEKDAYS,
  bookingsFromReservations,
  buildMonthWeeks,
  dayKey,
  defaultNightlyPrice,
  findBookingForDay,
  isToday,
  monthName,
  monthsFrom,
  weekBookingSegments,
} from './hostCalendarModel.js'
import './host-calendar-page.css'
// after the base sheet: it replaces the dark hero and the old month grid
import './host-calendar-airbnb.css'
import './host-room-inventory.css'
import './host-room-types-calendar.css'

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
}

function dayLabel(day, month, year) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month, day))
}

function bookingDateLabel(date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

function isPastDay(year, month, day, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  return new Date(year, month, day, 12) < today
}

/* One month of the scroll.

   Bookings are drawn as a bar layer above each week rather than as a mark
   inside each day cell: a stay is one thing that spans nights, and painting it
   per-cell is what made the old grid unable to carry the guest's name. The bar
   layer is a second seven-column grid sitting over the same tracks, so the bar
   lines up with the days it covers without any pixel arithmetic. */
function CalendarMonth({ year, month, calendar, bookings, basePrice, selectedKeys, roomInventory, showStock, roomTotal, onSelectDay }) {
  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month])
  return (
    <section className="host-calendar-month" aria-label={`${monthName(month)} ${year}`} data-month={`${year}-${String(month + 1).padStart(2, '0')}`}>
      <h2>{monthName(month)}{month === 0 ? ` ${year}` : ''}</h2>
      <div className="host-calendar-month__dow" aria-hidden="true">
        {HOST_WEEKDAYS.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
      </div>
      <div className="host-calendar-month__weeks">
        {weeks.map((week, weekIndex) => {
          const segments = weekBookingSegments(bookings, week, year, month)
          return (
            <div className="host-calendar-week" key={`week-${weekIndex}`}>
              {segments.length ? (
                <div className="host-calendar-week__bars" aria-hidden="true">
                  {segments.map((segment) => (
                    <span
                      key={`${segment.booking.id}-${segment.start}`}
                      className="host-calendar-bar"
                      data-opens={segment.opensStay ? 'true' : 'false'}
                      data-closes={segment.closesInWeek ? 'true' : 'false'}
                      style={{ gridColumn: `${segment.start + 1} / span ${segment.span}` }}
                    >
                      {segment.opensStay ? (
                        <>
                          <i className="host-calendar-bar__avatar">{segment.booking.initials}</i>
                          <b>{segment.booking.guest}</b>
                        </>
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="host-calendar-week__days">
                {week.map((day, dayIndex) => {
                  if (!day) return <span key={`blank-${weekIndex}-${dayIndex}`} className="host-calendar-day is-blank" aria-hidden="true" />
                  const key = dayKey(year, month, day)
                  const data = calendar.days[key] || {}
                  const booking = findBookingForDay(bookings, year, month, day)
                  const remaining = roomInventory.enabled ? remainingRoomUnitsForDay(roomInventory, key) : null
                  const soldOut = roomInventory.enabled && remaining <= 0
                  const past = isPastDay(year, month, day)
                  const blocked = (Boolean(data.blocked) || soldOut) && !booking
                  const unavailable = blocked || past || Boolean(booking)
                  const price = data.price ?? defaultNightlyPrice(basePrice)
                  const today = isToday(year, month, day)
                  return (
                    <button
                      key={key}
                      type="button"
                      className="host-calendar-day"
                      data-calendar-day={day}
                      data-day-key={key}
                      data-booking-id={booking?.id || ''}
                      data-selected={selectedKeys.has(key) ? 'true' : 'false'}
                      data-unavailable={unavailable ? 'true' : 'false'}
                      data-blocked={blocked ? 'true' : 'false'}
                      data-booked={booking ? 'true' : 'false'}
                      data-today={today ? 'true' : 'false'}
                      data-past={past ? 'true' : 'false'}
                      aria-label={booking
                        ? `${dayLabel(day, month, year)}, réservation ${booking.guest}`
                        : `${dayLabel(day, month, year)}, ${blocked ? 'indisponible' : `${price} TND`}`}
                      onClick={() => onSelectDay(year, month, day)}
                    >
                      <span className="host-calendar-day__number">{day}</span>
                      <span className="host-calendar-day__price">{blocked ? '—' : price}</span>
                      {showStock && !booking && remaining != null
                        ? <span className="host-calendar-day__stock" data-sold-out={soldOut ? 'true' : 'false'}>{remaining}/{roomTotal}</span>
                        : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function HostCalendarPage({ onNavigate, hostProfile = null }) {
  const { session } = useAuthSession()
  const { profile: storedProfile } = useHostProfile(session?.userId)
  const profile = hostProfile || storedProfile
  const listing = profile?.listing
  const initialRoomTypeId = listing?.roomTypes?.[0]?.id || ''
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(initialRoomTypeId)
  const [calendar, setCalendar] = useState(() => listing?.id ? readHostCalendarForListing(listing.id, initialRoomTypeId) : readHostCalendar(session?.userId))
  const [roomInventory, setRoomInventory] = useState(() => readHostRoomInventoryForListing(listing?.id, initialRoomTypeId))
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [editPrice, setEditPrice] = useState('')
  const [editBlocked, setEditBlocked] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [notice, setNotice] = useState('')

  const roomTypes = Array.isArray(listing?.roomTypes) ? listing.roomTypes : []
  const pooledRooms = supportsPooledRoomInventory(listing?.type) && roomTypes.length > 0
  const categorizedRooms = roomTypes.length > 1
  const selectedRoomType = roomTypes.find((room) => room.id === selectedRoomTypeId) || roomTypes[0] || null
  const selectedBasePrice = selectedRoomType?.basePrice || listing?.basePrice || 180
  const selectedRoomTotal = Math.max(1, Number(roomInventory.totalUnits) || Number(selectedRoomType?.totalUnits) || 1)
  const identicalRooms = pooledRooms && !categorizedRooms && selectedRoomTotal > 1
  const showInventoryControls = categorizedRooms || identicalRooms
  /* Fourteen months forward, scrolled rather than paged. A host setting a
     price for next summer should not tap "next" nine times to reach it, and a
     stay that straddles two months should be readable without a page turn. */
  const months = useMemo(() => monthsFrom(year, month, 14), [year, month])
  const [reservations, setReservations] = useState(() => listConfirmedRoomReservationsForListing(listing?.id))
  const bookings = useMemo(
    () => bookingsFromReservations(reservations, pooledRooms ? selectedRoomTypeId : ''),
    [reservations, pooledRooms, selectedRoomTypeId],
  )
  const selectedArray = useMemo(() => Array.from(selectedKeys), [selectedKeys])
  const selectedRoomStock = selectedArray.length === 1 && roomInventory.enabled
    ? remainingRoomUnitsForDay(roomInventory, selectedArray[0])
    : null
  const startingPrice = pooledRooms && roomTypes.length
    ? Math.min(...roomTypes.map((room) => Number(room.basePrice) || listing.basePrice))
    : listing?.basePrice

  useEffect(() => {
    if (!roomTypes.length) {
      setSelectedRoomTypeId('')
      return
    }
    setSelectedRoomTypeId((current) => roomTypes.some((room) => room.id === current) ? current : roomTypes[0].id)
  }, [listing?.id, roomTypes])

  useEffect(() => {
    const next = listing?.id
      ? readHostCalendarForListing(listing.id, pooledRooms ? selectedRoomTypeId : '')
      : readHostCalendar(session?.userId)
    setCalendar(next)
    setSelectedKeys(new Set())
  }, [session?.userId, listing?.id, pooledRooms, selectedRoomTypeId])

  useEffect(() => {
    // The same event carries both: a confirmed reservation changes the stock
    // left for a night and the bar the calendar draws over it.
    const sync = () => {
      setRoomInventory(readHostRoomInventoryForListing(listing?.id, selectedRoomTypeId))
      setReservations(listConfirmedRoomReservationsForListing(listing?.id))
    }
    sync()
    window.addEventListener(HOST_ROOM_INVENTORY_EVENT, sync)
    window.addEventListener(HOST_PROFILE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_ROOM_INVENTORY_EVENT, sync)
      window.removeEventListener(HOST_PROFILE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listing?.id, selectedRoomTypeId])

  useEffect(() => {
    const first = selectedArray[0]
    if (!first) {
      setEditPrice('')
      setEditBlocked(false)
      return
    }
    const value = calendar.days[first] || {}
    const day = Number(first.slice(-2)) || 1
    setEditPrice(String(value.price ?? defaultNightlyPrice(selectedBasePrice, day)))
    setEditBlocked(Boolean(value.blocked))
  }, [selectedArray, calendar.days, selectedBasePrice])

  const goToday = () => {
    const current = new Date()
    setYear(current.getFullYear())
    setMonth(current.getMonth())
    setSelectedKeys(new Set())
    setNotice('Mois en cours')
    if (typeof window !== 'undefined') {
      document.querySelector('[data-calendar-scroll]')?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const selectDay = (year, month, day) => {
    const booking = findBookingForDay(bookings, year, month, day)
    if (booking) {
      setSelectedBooking(booking)
      return
    }
    const key = dayKey(year, month, day)
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setNotice('')
  }

  const applySettings = () => {
    if (!selectedArray.length) return
    writeHostCalendarDays(session?.userId, selectedArray, {
      price: Number(editPrice),
      blocked: editBlocked,
    }, listing?.id, pooledRooms ? selectedRoomTypeId : '')
    setCalendar(readHostCalendarForListing(listing.id, pooledRooms ? selectedRoomTypeId : ''))
    setNotice(`Réglages appliqués à ${selectedArray.length} jour${selectedArray.length > 1 ? 's' : ''}${categorizedRooms && selectedRoomType ? ` · ${selectedRoomType.name}` : ''}`)
  }

  const changeRoomTotal = (delta) => {
    if (!session?.userId || !listing?.id || !pooledRooms || !selectedRoomType) return
    const current = Math.max(1, Number(roomInventory.totalUnits) || 1)
    const nextTotal = Math.max(1, Math.min(999, current + delta))
    if (nextTotal === current) return
    updateHostRoomTypeTotal(session.userId, selectedRoomType.id, nextTotal)
    setRoomInventory(readHostRoomInventoryForListing(listing.id, selectedRoomType.id))
    setNotice(categorizedRooms
      ? `${selectedRoomType.name} · ${nextTotal} chambre${nextTotal > 1 ? 's' : ''}`
      : `${nextTotal} chambre${nextTotal > 1 ? 's' : ''} identique${nextTotal > 1 ? 's' : ''}`)
  }

  const listingPhoto = listing?.photos?.[0] || listing?.roomTypes?.flatMap((room) => room.photos || []).find(Boolean) || ''
  if (!profile || !listing) return null

  return (
    <section className="host-calendar-page" data-testid="host-calendar-page">
      <header className="host-calendar-page__hero">
        <div className="host-calendar-page__topline">
          <div className="host-calendar-page__brand"><span>MH</span><div><strong>Movera Host</strong><small>Espace Hôte · Tunisie</small></div></div>
          <button type="button" className="host-calendar-page__traveler" onClick={() => onNavigate('/')}><BackIcon /> Mode Voyageur</button>
        </div>
        <div className="host-calendar-page__headline">
          <div><span>Gestion des disponibilités</span><h1>Calendrier</h1></div>
          {/* Not "Aujourd'hui": the bottom bar's first tab already carries that name,
              and two controls answering to it on one screen is ambiguous for anyone
              navigating by label. This one says what it does. */}
          <button type="button" className="host-calendar-page__today" onClick={goToday} aria-label="Revenir au mois en cours"><ClockIcon /><span>Aujourd’hui</span></button>
        </div>
        <p>Pilotez disponibilités, tarifs et séjours depuis un seul calendrier hôte.</p>
      </header>

      <main className="host-calendar-page__content">
        <section className="host-calendar-page__listing" aria-label="Logement actif">
          {listingPhoto
            ? <OptimizedListingImage className="host-calendar-page__listing-photo" src={listingPhoto} alt="" sizes="72px" />
            : <span className="host-calendar-page__listing-icon"><CalendarIcon /></span>}
          <span><small>Logement actif</small><strong>{listing.name}</strong><em>{listing.type} · {listing.city}</em></span>
          <b>{categorizedRooms ? `Dès ${startingPrice}` : startingPrice} TND</b>
        </section>

        {showInventoryControls ? (
          <section className="host-room-inventory" data-testid="host-room-inventory" aria-label="Inventaire des chambres">
            <div className="host-room-inventory__copy">
              <small>{categorizedRooms ? 'Stock privé · catégorie sélectionnée' : 'Stock privé'}</small>
              <strong>{categorizedRooms ? selectedRoomType?.name || 'Catégorie' : `${selectedRoomTotal} chambres identiques`}</strong>
              <span>{categorizedRooms
                ? `${selectedRoomTotal} chambre${selectedRoomTotal > 1 ? 's' : ''} dans cette catégorie · stock calculé par nuit`
                : 'Une seule annonce · le stock restant est calculé séparément pour chaque nuit'}</span>
            </div>
            <div className="host-room-inventory__counter" aria-label={`${selectedRoomTotal} chambres`}>
              <button type="button" aria-label="Réduire le nombre de chambres" disabled={selectedRoomTotal <= 1} onClick={() => changeRoomTotal(-1)}>−</button>
              <b>{selectedRoomTotal}</b>
              <button type="button" aria-label="Augmenter le nombre de chambres" onClick={() => changeRoomTotal(1)}>+</button>
            </div>
            {categorizedRooms ? (
              <div className="host-room-calendar-types" aria-label="Choisir une catégorie de chambre">
                {roomTypes.map((room) => (
                  <button
                    type="button"
                    key={room.id}
                    data-active={room.id === selectedRoomType?.id ? 'true' : 'false'}
                    onClick={() => setSelectedRoomTypeId(room.id)}
                  >
                    <strong>{room.name}</strong><span>{room.view || `${room.guests} voyageurs`} · {room.basePrice} TND</span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="host-calendar-scroll" data-calendar-scroll data-testid="host-calendar-grid">
          {months.map(({ year: mYear, month: mMonth }) => (
            <CalendarMonth
              key={`${mYear}-${mMonth}`}
              year={mYear}
              month={mMonth}
              calendar={calendar}
              bookings={bookings}
              basePrice={selectedBasePrice}
              selectedKeys={selectedKeys}
              roomInventory={roomInventory}
              showStock={showInventoryControls}
              roomTotal={selectedRoomTotal}
              onSelectDay={selectDay}
            />
          ))}
          <p className="host-calendar__hint">
            Touchez des dates libres pour modifier prix et disponibilité. Les séjours confirmés
            apparaissent en barre grise{showInventoryControls ? ` · le compteur de stock reste privé${categorizedRooms && selectedRoomType ? ` pour ${selectedRoomType.name}` : ''}` : ''}.
          </p>
        </div>

        {notice ? <div className="host-calendar-page__notice" role="status">{notice}</div> : null}
      </main>

      {selectedArray.length ? (
        <aside className="host-day-editor" data-testid="host-day-editor" aria-label="Réglages des dates sélectionnées">
          <div className="host-day-editor__handle" />
          <div className="host-day-editor__head"><div><strong>{selectedArray.length === 1 ? 'Réglages du jour' : `${selectedArray.length} dates sélectionnées`}</strong><span>{categorizedRooms && selectedRoomType ? `${selectedRoomType.name} · ` : ''}{showInventoryControls && selectedRoomStock != null ? `Stock ${selectedRoomStock}/${selectedRoomTotal} · ` : ''}Prix et disponibilité</span></div><button type="button" aria-label="Fermer les réglages" onClick={() => setSelectedKeys(new Set())}>×</button></div>
          <div className="host-day-editor__price"><span>Prix par nuit</span><label><input value={editPrice} inputMode="numeric" aria-label="Prix des dates sélectionnées" onChange={(event) => setEditPrice(event.target.value.replace(/\D/g, '').slice(0, 5))} /><b>TND</b></label></div>
          <div className="host-day-editor__availability"><button type="button" data-active={!editBlocked ? 'true' : 'false'} onClick={() => setEditBlocked(false)}>Disponible</button><button type="button" data-active={editBlocked ? 'true' : 'false'} onClick={() => setEditBlocked(true)}>Bloqué</button></div>
          <button type="button" className="host-day-editor__save" onClick={applySettings}>Appliquer</button>
        </aside>
      ) : null}

      {selectedBooking ? (
        <aside className="host-booking-sheet" data-testid="host-booking-sheet" aria-label="Détail de la réservation">
          <div className="host-booking-sheet__handle" />
          <button type="button" className="host-booking-sheet__close" aria-label="Fermer le détail" onClick={() => setSelectedBooking(null)}>×</button>
          <span className="host-booking-sheet__avatar">{selectedBooking.initials}</span>
          <small>Réservation confirmée</small>
          <h2>{selectedBooking.guest}</h2>
          <p>{listing.name}</p>
          <div className="host-booking-sheet__meta"><span><small>Arrivée</small><strong>{bookingDateLabel(selectedBooking.checkIn)}</strong></span><span><small>Départ</small><strong>{bookingDateLabel(selectedBooking.checkOut)}</strong></span><span><small>{pooledRooms ? 'Chambres' : 'Unités'}</small><strong>{selectedBooking.units}</strong></span></div>
          <div className="host-booking-sheet__total"><span>Total séjour</span><strong>{selectedBooking.total ? `${selectedBooking.total} ${listing.currency || 'TND'}` : '—'}</strong></div>
          <button type="button" className="host-booking-sheet__message" onClick={() => onNavigate('/host/messages')}>Écrire au voyageur</button>
        </aside>
      ) : null}
    </section>
  )
}
