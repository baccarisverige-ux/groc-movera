import { useEffect, useMemo, useState } from 'react'
import { readHostRoomInventoryForListing } from '../../../entities/host/hostRoomInventoryStore.js'
import { saveHostRoomTypes } from '../../../entities/host/hostRoomTypesStore.js'
import { supportsPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import './host-room-type-manager.css'

function makeRoomType(listing, index) {
  const id = `room-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    name: `Type de chambre ${index}`,
    view: '',
    description: '',
    guests: Math.max(1, Number(listing?.guests) || 2),
    beds: Math.max(1, Number(listing?.beds) || 1),
    bathrooms: Math.max(0, Number(listing?.bathrooms) || 1),
    basePrice: Math.max(1, Number(listing?.basePrice) || 180),
    totalUnits: 1,
    photos: [],
  }
}

function cloneRooms(rooms) {
  return (Array.isArray(rooms) ? rooms : []).map((room) => ({
    ...room,
    photos: Array.isArray(room.photos) ? [...room.photos] : [],
  }))
}

function needsInitialSetup(listing) {
  if (!supportsPooledRoomInventory(listing?.type)) return false
  const rooms = Array.isArray(listing?.roomTypes) ? listing.roomTypes : []
  if (rooms.length !== 1) return false
  const room = rooms[0]
  return room?.id === 'room-standard' && !String(room.view || '').trim() && !String(room.description || '').trim()
}

function NumberField({ label, value, min = 0, max = 999, onChange }) {
  return (
    <label className="host-room-type-manager__number">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))}
      />
    </label>
  )
}

export function HostRoomTypeManager({ profile, userId, onNavigate }) {
  const listing = profile?.listing
  const enabled = supportsPooledRoomInventory(listing?.type)
  const [open, setOpen] = useState(() => needsInitialSetup(listing))
  const [rooms, setRooms] = useState(() => cloneRooms(listing?.roomTypes))
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!open) setRooms(cloneRooms(listing?.roomTypes))
  }, [listing?.roomTypes, open])

  const inventory = useMemo(() => readHostRoomInventoryForListing(listing?.id), [listing?.id, listing?.roomTypes])
  const reservationCountByRoom = useMemo(() => {
    const counts = {}
    Object.values(inventory.reservations || {}).forEach((reservation) => {
      counts[reservation.roomTypeId] = (counts[reservation.roomTypeId] || 0) + 1
    })
    return counts
  }, [inventory.reservations])

  if (!enabled || !listing) return null

  const updateRoom = (id, patch) => {
    setRooms((current) => current.map((room) => room.id === id ? { ...room, ...patch } : room))
    setFeedback('')
  }

  const addRoom = () => {
    setRooms((current) => current.length >= 12 ? current : [...current, makeRoomType(listing, current.length + 1)])
    setFeedback('')
  }

  const removeRoom = (id) => {
    if (rooms.length <= 1) return
    if (reservationCountByRoom[id]) {
      setFeedback('Ce type possède déjà des réservations et ne peut pas être supprimé.')
      return
    }
    setRooms((current) => current.filter((room) => room.id !== id))
  }

  const save = () => {
    const invalid = rooms.find((room) => !String(room.name || '').trim() || Number(room.basePrice) <= 0 || Number(room.totalUnits) <= 0)
    if (invalid) {
      setFeedback('Chaque type doit avoir un nom, un prix et au moins une chambre.')
      return
    }
    try {
      saveHostRoomTypes(userId, rooms)
      setFeedback('Types de chambres enregistrés.')
      setOpen(false)
    } catch (error) {
      setFeedback(error?.message || 'Impossible d’enregistrer les types de chambres.')
    }
  }

  return (
    <>
      <button type="button" className="host-room-type-manager__preview" onClick={() => onNavigate?.(`/listing/${encodeURIComponent(listing.id)}`)}>
        Voir comme voyageur
      </button>
      <button type="button" className="host-room-type-manager__launcher" onClick={() => { setRooms(cloneRooms(listing.roomTypes)); setFeedback(''); setOpen(true) }}>
        <span>Types de chambres</span>
        <b>{listing.roomTypes.length}</b>
      </button>

      {open ? (
        <div className="host-room-type-manager" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="host-room-type-manager__sheet" role="dialog" aria-modal="true" aria-labelledby="host-room-types-title">
            <div className="host-room-type-manager__handle" />
            <header>
              <div>
                <small>Configuration de l’offre</small>
                <h2 id="host-room-types-title">Types de chambres</h2>
                <p>Une seule publication, plusieurs chambres clairement différentes.</p>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)}>×</button>
            </header>

            <div className="host-room-type-manager__notice">
              <strong>Visible au voyageur</strong>
              <span>Nom, vue, caractéristiques, description et prix de chaque type.</span>
              <strong>Privé côté hôte</strong>
              <span>Le nombre total et le stock restant ne sont jamais affichés aux voyageurs.</span>
            </div>

            <div className="host-room-type-manager__list">
              {rooms.map((room, index) => {
                const booked = reservationCountByRoom[room.id] || 0
                return (
                  <article className="host-room-type-manager__card" key={room.id}>
                    <div className="host-room-type-manager__card-head">
                      <span>Type {index + 1}</span>
                      <button type="button" disabled={rooms.length <= 1 || booked > 0} onClick={() => removeRoom(room.id)}>{booked > 0 ? 'Réservations liées' : 'Supprimer'}</button>
                    </div>
                    <label><span>Nom visible au client</span><input value={room.name} maxLength={44} onChange={(event) => updateRoom(room.id, { name: event.target.value })} placeholder="Ex. Deluxe Vue Mer" /></label>
                    <label><span>Vue / particularité</span><input value={room.view} maxLength={60} onChange={(event) => updateRoom(room.id, { view: event.target.value })} placeholder="Ex. Vue mer panoramique" /></label>
                    <label><span>Détails de cette chambre</span><textarea rows="3" maxLength={220} value={room.description} onChange={(event) => updateRoom(room.id, { description: event.target.value })} placeholder="Ex. 28 m², balcon privé, étage élevé…" /></label>
                    <div className="host-room-type-manager__numbers">
                      <NumberField label="Voyageurs" value={room.guests} min={1} max={20} onChange={(value) => updateRoom(room.id, { guests: value })} />
                      <NumberField label="Lits" value={room.beds} min={1} max={20} onChange={(value) => updateRoom(room.id, { beds: value })} />
                      <NumberField label="Sdb" value={room.bathrooms} min={0} max={10} onChange={(value) => updateRoom(room.id, { bathrooms: value })} />
                    </div>
                    <div className="host-room-type-manager__numbers host-room-type-manager__numbers--price">
                      <NumberField label="Prix / nuit (TND)" value={room.basePrice} min={1} max={99999} onChange={(value) => updateRoom(room.id, { basePrice: value })} />
                      <NumberField label="Chambres identiques" value={room.totalUnits} min={1} max={999} onChange={(value) => updateRoom(room.id, { totalUnits: value })} />
                    </div>
                    <div className="host-room-type-manager__photo-note"><strong>Photos de ce type</strong><span>{room.photos?.length ? `${room.photos.length} photo${room.photos.length > 1 ? 's' : ''} liée${room.photos.length > 1 ? 's' : ''}` : 'Les photos spécifiques seront reliées au module photo de l’annonce.'}</span></div>
                  </article>
                )
              })}
            </div>

            <button type="button" className="host-room-type-manager__add" disabled={rooms.length >= 12} onClick={addRoom}>+ Ajouter un autre type de chambre</button>
            {feedback ? <p className="host-room-type-manager__feedback" role="status">{feedback}</p> : null}
            <button type="button" className="host-room-type-manager__save" onClick={save}>Enregistrer les types de chambres</button>
          </section>
        </div>
      ) : null}
    </>
  )
}
