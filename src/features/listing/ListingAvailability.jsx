import { useEffect, useMemo, useState } from 'react'
import { HOST_CALENDAR_EVENT, readHostCalendarForListing } from '../../entities/host/hostCalendarStore.js'
import { findHostProfileByListingId, HOST_PROFILE_EVENT } from '../../entities/host/hostProfileStore.js'
import { ListingAvailabilityModal } from './ListingAvailabilityModal.jsx'
import './listing-availability.css'
import './listing-room-types.css'

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

function CheckGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4 4L19 7" /></svg>
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

function roomMeta(room) {
  const parts = [`${room.guests} voyageur${room.guests > 1 ? 's' : ''}`, `${room.beds} lit${room.beds > 1 ? 's' : ''}`]
  if (room.bathrooms) parts.push(`${room.bathrooms} sdb`)
  return parts.join(' · ')
}

export function ListingAvailability({ listingId, basePrice = 0, currency = 'TND' }) {
  const now = useMemo(() => new Date(), [])
  const initialProfile = useMemo(() => findHostProfileByListingId(listingId), [listingId])
  const initialRoomTypeId = initialProfile?.listing?.roomTypes?.[0]?.id || ''
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState(initialProfile)
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(initialRoomTypeId)
  const [calendar, setCalendar] = useState(() => readHostCalendarForListing(listingId, initialRoomTypeId))

  const roomTypes = Array.isArray(profile?.listing?.roomTypes) ? profile.listing.roomTypes : []
  const selectedRoom = roomTypes.find((room) => room.id === selectedRoomTypeId) || roomTypes[0] || null
  const selectedPrice = selectedRoom?.basePrice || basePrice

  useEffect(() => {
    const syncProfile = () => {
      const next = findHostProfileByListingId(listingId)
      setProfile(next)
      const nextRooms = next?.listing?.roomTypes || []
      setSelectedRoomTypeId((current) => nextRooms.some((room) => room.id === current) ? current : nextRooms[0]?.id || '')
    }
    syncProfile()
    window.addEventListener(HOST_PROFILE_EVENT, syncProfile)
    window.addEventListener('storage', syncProfile)
    return () => {
      window.removeEventListener(HOST_PROFILE_EVENT, syncProfile)
      window.removeEventListener('storage', syncProfile)
    }
  }, [listingId])

  useEffect(() => {
    const sync = () => setCalendar(readHostCalendarForListing(listingId, selectedRoomTypeId))
    sync()
    window.addEventListener(HOST_CALENDAR_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_CALENDAR_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listingId, selectedRoomTypeId])

  const summary = availabilitySummary(calendar, now)

  return (
    <>
      <section className="listing-availability" id="listing-availability" data-calendar-linked={calendar.linked ? 'true' : 'false'}>
        {roomTypes.length > 1 ? (
          <div className="listing-room-types" aria-labelledby="listing-room-types-title">
            <div className="listing-room-types__head">
              <span>Choisissez votre chambre</span>
              <small>Chaque type possède ses propres détails et tarifs.</small>
            </div>
            <div className="listing-room-types__rail" role="radiogroup" aria-label="Type de chambre">
              {roomTypes.map((room) => {
                const active = room.id === selectedRoom?.id
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-active={active ? 'true' : 'false'}
                    key={room.id}
                    onClick={() => { setSelectedRoomTypeId(room.id); setOpen(false) }}
                  >
                    <span className="listing-room-types__check">{active ? <CheckGlyph /> : null}</span>
                    <strong>{room.name}</strong>
                    {room.view ? <em>{room.view}</em> : null}
                    <small>{roomMeta(room)}</small>
                    {room.description ? <p>{room.description}</p> : null}
                    <b>{room.basePrice} {currency} <span>/ nuit</span></b>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <button type="button" className="listing-availability__row" aria-expanded={open} onClick={() => setOpen(true)}>
          <span className="listing-availability__icon"><CalendarGlyph /></span>
          <span className="listing-availability__copy">
            <strong>{selectedRoom ? `Disponibilité · ${selectedRoom.name}` : 'Disponibilité'}</strong>
            <span>{summary}</span>
          </span>
          <span className="listing-availability__chevron"><ChevronGlyph /></span>
        </button>
      </section>

      {open ? (
        <ListingAvailabilityModal
          listing={{ id: listingId, title: selectedRoom?.name || 'Calendrier de l’hôte', nightlyRate: selectedPrice, currency, roomTypeId: selectedRoom?.id || '', roomTypeName: selectedRoom?.name || '' }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
