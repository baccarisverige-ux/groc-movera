import { useEffect, useMemo, useState } from 'react'
import { readHostCalendar, writeHostCalendarDays } from '../../../entities/host/hostCalendarStore.js'
import { HOST_PROFILE_EVENT, supportsPooledRoomInventory, updateHostRoomInventoryTotal, useHostProfile } from '../../../entities/host/hostProfileStore.js'
import { HOST_ROOM_INVENTORY_EVENT, readHostRoomInventoryForListing, remainingRoomUnitsForDay } from '../../../entities/host/hostRoomInventoryStore.js'
import { useAuthSession } from '../../auth/authSession.js'
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
} from './hostCalendarModel.js'
import './host-calendar-page.css'
import './host-room-inventory.css'

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
}

function ChevronIcon({ direction = 'right' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" data-direction={direction}><path d="m9 6 6 6-6 6"/></svg>
}

function dayLabel(day, month, year) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month, day))
}

function bookingDateLabel(date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

export function HostCalendarPage({ onNavigate, hostProfile = null }) {
  const { session } = useAuthSession()
  const { profile: storedProfile } = useHostProfile(session?.userId)
  const profile = hostProfile || storedProfile
  const listing = profile?.listing
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [calendar, setCalendar] = useState(() => readHostCalendar(session?.userId))
  const [roomInventory, setRoomInventory] = useState(() => readHostRoomInventoryForListing(listing?.id))
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [editPrice, setEditPrice] = useState('')
  const [editBlocked, setEditBlocked] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [notice, setNotice] = useState('')

  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const bookings = useMemo(() => makeDemoBookings(year, month), [year, month])
  const selectedArray = useMemo(() => Array.from(selectedKeys), [selectedKeys])
  const pooledRooms = supportsPooledRoomInventory(listing?.type)
  const selectedRoomStock = selectedArray.length === 1 && roomInventory.enabled
    ? remainingRoomUnitsForDay(roomInventory, selectedArray[0])
    : null

  useEffect(() => {
    setCalendar(readHostCalendar(session?.userId))
  }, [session?.userId])

  useEffect(() => {
    const sync = () => setRoomInventory(readHostRoomInventoryForListing(listing?.id))
    sync()
    window.addEventListener(HOST_ROOM_INVENTORY_EVENT, sync)
    window.addEventListener(HOST_PROFILE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_ROOM_INVENTORY_EVENT, sync)
      window.removeEventListener(HOST_PROFILE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listing?.id])

  useEffect(() => {
    const first = selectedArray[0]
    if (!first) {
      setEditPrice('')
      setEditBlocked(false)
      return
    }
    const value = calendar.days[first] || {}
    const day = Number(first.slice(-2)) || 1
    setEditPrice(String(value.price ?? defaultNightlyPrice(listing?.basePrice || 180, day)))
    setEditBlocked(Boolean(value.blocked))
  }, [selectedArray, calendar.days, listing?.basePrice])

  const changeMonth = (delta) => {
    const date = new Date(year, month + delta, 1)
    setYear(date.getFullYear())
    setMonth(date.getMonth())
    setSelectedKeys(new Set())
    setNotice('')
  }

  const goToday = () => {
    const current = new Date()
    setYear(current.getFullYear())
    setMonth(current.getMonth())
    setSelectedKeys(new Set())
    setNotice('Mois en cours')
  }

  const selectDay = (day) => {
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
    const next = writeHostCalendarDays(session?.userId, selectedArray, {
      price: Number(editPrice),
      blocked: editBlocked,
    }, listing?.id)
    setCalendar(next)
    setNotice(`Réglages appliqués à ${selectedArray.length} jour${selectedArray.length > 1 ? 's' : ''}`)
  }

  const changeRoomTotal = (delta) => {
    if (!session?.userId || !listing?.id || !pooledRooms) return
    const current = Math.max(1, Number(roomInventory.totalUnits) || 1)
    const nextTotal = Math.max(1, Math.min(999, current + delta))
    if (nextTotal === current) return
    updateHostRoomInventoryTotal(session.userId, nextTotal)
    setRoomInventory(readHostRoomInventoryForListing(listing.id))
    setNotice(`${nextTotal} chambre${nextTotal > 1 ? 's' : ''} identique${nextTotal > 1 ? 's' : ''} dans le stock`)
  }

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
          <button type="button" className="host-calendar-page__today" onClick={goToday} aria-label="Aujourd’hui"><ClockIcon /><span>Aujourd’hui</span></button>
        </div>
        <p>Pilotez disponibilités, tarifs et séjours depuis un seul calendrier hôte.</p>
      </header>

      <main className="host-calendar-page__content">
        <section className="host-calendar-page__listing" aria-label="Logement actif">
          <span className="host-calendar-page__listing-icon"><CalendarIcon /></span>
          <span><small>Logement actif</small><strong>{listing.name}</strong><em>{listing.type} · {listing.city}</em></span>
          <b>{listing.basePrice} TND</b>
        </section>

        {roomInventory.enabled ? (
          <section className="host-room-inventory" data-testid="host-room-inventory" aria-label="Stock des chambres identiques">
            <div className="host-room-inventory__copy">
              <small>Stock privé</small>
              <strong>Chambres identiques</strong>
              <span>Même chambre, même vue · jamais affiché aux voyageurs</span>
            </div>
            <div className="host-room-inventory__counter" aria-label={`${roomInventory.totalUnits} chambres identiques`}>
              <button type="button" aria-label="Réduire le nombre de chambres" disabled={roomInventory.totalUnits <= 1} onClick={() => changeRoomTotal(-1)}>−</button>
              <b>{roomInventory.totalUnits}</b>
              <button type="button" aria-label="Augmenter le nombre de chambres" onClick={() => changeRoomTotal(1)}>+</button>
            </div>
          </section>
        ) : null}

        <section className="host-calendar" aria-label={`Calendrier ${monthLabel(year, month)}`}>
          <div className="host-calendar__monthbar">
            <button type="button" aria-label="Mois précédent" onClick={() => changeMonth(-1)}><ChevronIcon direction="left" /></button>
            <strong>{monthLabel(year, month)}</strong>
            <button type="button" aria-label="Mois suivant" onClick={() => changeMonth(1)}><ChevronIcon /></button>
          </div>

          <div className="host-calendar__grid" data-testid="host-calendar-grid">
            {HOST_WEEKDAYS.map((label, index) => <div key={`${label}-${index}`} className="host-calendar__dow">{label}</div>)}
            {cells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} className="host-calendar__blank" aria-hidden="true" />
              const key = dayKey(year, month, day)
              const data = calendar.days[key] || {}
              const booking = findBookingForDay(bookings, year, month, day)
              const role = booking ? bookingRole(booking, year, month, day) : ''
              const selected = selectedKeys.has(key)
              const remainingRooms = roomInventory.enabled ? remainingRoomUnitsForDay(roomInventory, key) : null
              const soldOut = roomInventory.enabled && remainingRooms <= 0
              const blocked = (Boolean(data.blocked) || soldOut) && !booking
              const price = data.price ?? defaultNightlyPrice(listing.basePrice, day)
              const guestInitial = booking?.guest?.charAt(0) || ''
              const stockLabel = roomInventory.enabled ? `${remainingRooms} chambre${remainingRooms > 1 ? 's' : ''} restante${remainingRooms > 1 ? 's' : ''}` : ''
              const classes = ['host-calendar__day', selected ? 'is-selected' : '', blocked ? 'is-blocked' : '', soldOut ? 'is-sold-out' : '', booking ? 'has-booking' : '', booking ? `book-${role}` : '', isToday(year, month, day) ? 'is-today' : ''].filter(Boolean).join(' ')
              return (
                <button
                  key={key}
                  type="button"
                  className={classes}
                  data-calendar-day={day}
                  data-day-key={key}
                  data-booking-id={booking?.id || ''}
                  data-room-stock={roomInventory.enabled ? remainingRooms : ''}
                  aria-label={booking ? `${dayLabel(day, month, year)}, réservation ${booking.guest}` : `${dayLabel(day, month, year)}, ${blocked ? 'indisponible' : `${price} TND`}${stockLabel ? `, ${stockLabel}` : ''}`}
                  onClick={() => selectDay(day)}
                >
                  <span className="host-calendar__number">{day}</span>
                  <span className="host-calendar__price">{blocked ? '—' : `${price}`}</span>
                  {roomInventory.enabled && !booking ? <span className="host-calendar__room-stock" data-sold-out={soldOut ? 'true' : 'false'}>{remainingRooms}/{roomInventory.totalUnits}</span> : null}
                  {booking ? <i className="host-calendar__booking-bar" aria-hidden="true" /> : null}
                  {booking && (role === 'start' || role === 'both') ? <span className="host-calendar__guest" aria-hidden="true">{guestInitial}</span> : null}
                </button>
              )
            })}
          </div>

          <div className="host-calendar__legend"><span><i className="free" />Libre</span><span><i className="booked" />Réservé</span><span><i className="blocked" />Bloqué</span></div>
          <p className="host-calendar__hint">Touchez des dates libres pour modifier prix et disponibilité.{roomInventory.enabled ? ' Le petit compteur indique uniquement à l’hôte le stock de chambres restant.' : ''}</p>
        </section>

        {notice ? <div className="host-calendar-page__notice" role="status">{notice}</div> : null}
      </main>

      {selectedArray.length ? (
        <aside className="host-day-editor" data-testid="host-day-editor" aria-label="Réglages des dates sélectionnées">
          <div className="host-day-editor__handle" />
          <div className="host-day-editor__head"><div><strong>{selectedArray.length === 1 ? 'Réglages du jour' : `${selectedArray.length} dates sélectionnées`}</strong><span>{selectedRoomStock != null ? `Stock ${selectedRoomStock}/${roomInventory.totalUnits} · ` : ''}Prix et disponibilité</span></div><button type="button" aria-label="Fermer les réglages" onClick={() => setSelectedKeys(new Set())}>×</button></div>
          <div className="host-day-editor__price"><span>Prix par nuit</span><label><input value={editPrice} inputMode="numeric" aria-label="Prix des dates sélectionnées" onChange={(event) => setEditPrice(event.target.value.replace(/\D/g, '').slice(0, 5))} /><b>TND</b></label></div>
          <div className="host-day-editor__availability"><button type="button" data-active={!editBlocked ? 'true' : 'false'} onClick={() => setEditBlocked(false)}>Disponible</button><button type="button" data-active={editBlocked ? 'true' : 'false'} onClick={() => setEditBlocked(true)}>Bloqué</button></div>
          <button type="button" className="host-day-editor__save" onClick={applySettings}>Appliquer</button>
        </aside>
      ) : null}

      {selectedBooking ? (
        <aside className="host-booking-sheet" data-testid="host-booking-sheet" aria-label="Détail de la réservation">
          <div className="host-booking-sheet__handle" />
          <button type="button" className="host-booking-sheet__close" aria-label="Fermer le détail" onClick={() => setSelectedBooking(null)}>×</button>
          <span className="host-booking-sheet__avatar">{selectedBooking.guest.charAt(0)}</span>
          <small>Réservation {selectedBooking.status.toLowerCase()}</small>
          <h2>{selectedBooking.guest}</h2>
          <p>{listing.name}</p>
          <div className="host-booking-sheet__meta"><span><small>Arrivée</small><strong>{bookingDateLabel(selectedBooking.checkIn)}</strong></span><span><small>Départ</small><strong>{bookingDateLabel(selectedBooking.checkOut)}</strong></span><span><small>Voyageurs</small><strong>{selectedBooking.guests}</strong></span></div>
          <div className="host-booking-sheet__total"><span>Total séjour</span><strong>{selectedBooking.total}</strong></div>
        </aside>
      ) : null}
    </section>
  )
}
