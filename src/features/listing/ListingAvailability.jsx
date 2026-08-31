import { useEffect, useMemo, useState } from 'react'
import { HOST_CALENDAR_EVENT, readHostCalendarForListing } from '../../entities/host/hostCalendarStore.js'
import { HOST_PROFILE_EVENT } from '../../entities/host/hostProfileStore.js'
import { getGuestListingById } from './guestListings.js'
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
  const parts = []
  if (room.surface) parts.push(`${room.surface} m²`)
  parts.push(`${room.guests} voyageur${room.guests > 1 ? 's' : ''}`)
  parts.push(`${room.beds} lit${room.beds > 1 ? 's' : ''}${room.bedType ? ` · ${room.bedType}` : ''}`)
  if (room.bathrooms) parts.push(`${room.bathrooms} sdb ${room.bathroomType === 'shared' ? 'partagée' : 'privée'}`)
  return parts.join(' · ')
}

function roomPhoto(room) {
  const first = Array.isArray(room?.photos) ? room.photos[0] : null
  if (typeof first === 'string') return first
  return typeof first?.src === 'string' ? first.src : ''
}

export function ListingAvailability({
  listingId,
  basePrice = 0,
  currency = 'TND',
  selectedRoomTypeId: controlledRoomTypeId = '',
  onRoomTypeChange,
}) {
  const now = useMemo(() => new Date(), [])
  const initialListing = useMemo(() => getGuestListingById(listingId), [listingId])
  const initialRoomTypeId = controlledRoomTypeId || initialListing?.roomTypes?.[0]?.id || ''
  const [open, setOpen] = useState(false)
  const [publicListing, setPublicListing] = useState(initialListing)
  const [localRoomTypeId, setLocalRoomTypeId] = useState(initialRoomTypeId)
  const selectedRoomTypeId = controlledRoomTypeId || localRoomTypeId
  const [calendar, setCalendar] = useState(() => readHostCalendarForListing(listingId, initialRoomTypeId))

  const roomTypes = Array.isArray(publicListing?.roomTypes) ? publicListing.roomTypes : []
  const categorized = roomTypes.length > 1
  const selectedRoom = roomTypes.find((room) => room.id === selectedRoomTypeId) || roomTypes[0] || null
  const selectedPrice = selectedRoom?.basePrice || basePrice

  const selectRoom = (roomId) => {
    setLocalRoomTypeId(roomId)
    onRoomTypeChange?.(roomId)
    setOpen(false)
  }

  useEffect(() => {
    if (!controlledRoomTypeId) return
    setLocalRoomTypeId(controlledRoomTypeId)
  }, [controlledRoomTypeId])

  useEffect(() => {
    const syncListing = () => {
      const next = getGuestListingById(listingId)
      setPublicListing(next)
      const nextRooms = next?.roomTypes || []
      setLocalRoomTypeId((current) => {
        const preferred = controlledRoomTypeId || current
        return nextRooms.some((room) => room.id === preferred) ? preferred : nextRooms[0]?.id || ''
      })
    }
    syncListing()
    window.addEventListener(HOST_PROFILE_EVENT, syncListing)
    window.addEventListener('storage', syncListing)
    return () => {
      window.removeEventListener(HOST_PROFILE_EVENT, syncListing)
      window.removeEventListener('storage', syncListing)
    }
  }, [listingId, controlledRoomTypeId])

  useEffect(() => {
    const roomId = selectedRoom?.id || ''
    const sync = () => setCalendar(readHostCalendarForListing(listingId, roomId))
    sync()
    window.addEventListener(HOST_CALENDAR_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_CALENDAR_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listingId, selectedRoom?.id])

  const summary = availabilitySummary(calendar, now)

  return (
    <>
      <section className="listing-availability" id="listing-availability" data-calendar-linked={calendar.linked ? 'true' : 'false'}>
        {categorized ? (
          <div className="listing-room-types" aria-labelledby="listing-room-types-title">
            <div className="listing-room-types__head">
              <span id="listing-room-types-title">Choisissez votre catégorie de chambre</span>
              <small>Chaque catégorie possède ses propres photos, caractéristiques, tarif et disponibilité.</small>
            </div>
            <div className="listing-room-types__rail" role="radiogroup" aria-label="Catégorie de chambre">
              {roomTypes.map((room) => {
                const active = room.id === selectedRoom?.id
                const photo = roomPhoto(room)
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-active={active ? 'true' : 'false'}
                    key={room.id}
                    onClick={() => selectRoom(room.id)}
                  >
                    {photo ? <img className="listing-room-types__photo" src={photo} alt={`${room.name}${room.view ? ` — ${room.view}` : ''}`} loading="lazy" decoding="async" /> : null}
                    <span className="listing-room-types__check">{active ? <CheckGlyph /> : null}</span>
                    <strong>{room.name}</strong>
                    {room.view ? <em>{room.view}</em> : null}
                    <small>{roomMeta(room)}</small>
                    {room.description ? <p>{room.description}</p> : null}
                    {room.features?.length ? <span className="listing-room-types__features">{room.features.slice(0, 3).join(' · ')}</span> : null}
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
            <strong>{categorized && selectedRoom ? `Disponibilité · ${selectedRoom.name}` : 'Disponibilité'}</strong>
            <span>{summary}</span>
          </span>
          <span className="listing-availability__chevron"><ChevronGlyph /></span>
        </button>
      </section>

      {open ? (
        <ListingAvailabilityModal
          listing={{
            id: listingId,
            title: categorized && selectedRoom ? selectedRoom.name : publicListing?.title || 'Calendrier de l’hôte',
            nightlyRate: selectedPrice,
            currency,
            roomTypeId: selectedRoom?.id || '',
            roomTypeName: categorized ? selectedRoom?.name || '' : '',
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
