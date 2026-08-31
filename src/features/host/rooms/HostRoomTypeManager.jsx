import { useEffect, useMemo, useState } from 'react'
import { readHostRoomInventoryForListing } from '../../../entities/host/hostRoomInventoryStore.js'
import { saveHostRoomTypes } from '../../../entities/host/hostRoomTypesStore.js'
import { supportsPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import './host-room-type-manager.css'

function makeRoomType(listing, index, totalUnits = 1) {
  const id = `room-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    name: `Catégorie ${index}`,
    view: '',
    description: '',
    surface: 0,
    guests: Math.max(1, Number(listing?.guests) || 2),
    beds: Math.max(1, Number(listing?.beds) || 1),
    bedType: '',
    bathrooms: Math.max(0, Number(listing?.bathrooms) || 1),
    bathroomType: 'private',
    basePrice: Math.max(1, Number(listing?.basePrice) || 180),
    totalUnits: Math.max(1, totalUnits),
    features: [],
    photos: [],
  }
}

function cloneRooms(rooms) {
  return (Array.isArray(rooms) ? rooms : []).map((room) => ({
    ...room,
    features: Array.isArray(room.features) ? [...room.features] : [],
    photos: Array.isArray(room.photos) ? [...room.photos] : [],
  }))
}

function totalRooms(rooms) {
  return rooms.reduce((sum, room) => sum + Math.max(1, Number(room.totalUnits) || 1), 0)
}

function configurationLabel(rooms) {
  const total = totalRooms(rooms)
  if (rooms.length > 1) return `${rooms.length} catégories · ${total} chambres`
  if (total > 1) return `${total} chambres identiques`
  return '1 chambre'
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

function RoomPhotoSummary({ room }) {
  const photos = Array.isArray(room.photos) ? room.photos : []
  return (
    <div className="host-room-type-manager__photo-note">
      <strong>Photos de cette catégorie</strong>
      <span>{photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''} associée${photos.length > 1 ? 's' : ''}` : 'Aucune photo spécifique enregistrée.'}</span>
    </div>
  )
}

export function HostRoomTypeManager({ profile, userId, onNavigate }) {
  const listing = profile?.listing
  const enabled = supportsPooledRoomInventory(listing?.type)
  const [open, setOpen] = useState(false)
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

  if (!enabled || !listing || !rooms.length) return null

  const updateRoom = (id, patch) => {
    setRooms((current) => current.map((room) => room.id === id ? { ...room, ...patch } : room))
    setFeedback('')
  }

  const splitIntoCategories = () => {
    const first = rooms[0]
    const total = Math.max(1, Number(first?.totalUnits) || 1)
    if (total <= 1) {
      setFeedback('Ajoutez d’abord une deuxième chambre avant de créer plusieurs catégories.')
      return
    }
    setRooms([
      { ...first, name: 'Catégorie 1', totalUnits: 1 },
      makeRoomType(listing, 2, Math.max(1, total - 1)),
    ])
    setFeedback('Répartissez maintenant les chambres entre les catégories.')
  }

  const mergeAsIdentical = () => {
    const hasReservations = Object.values(reservationCountByRoom).some((count) => count > 0)
    if (hasReservations) {
      setFeedback('Impossible de fusionner les catégories tant que des réservations leur sont liées.')
      return
    }
    const total = totalRooms(rooms)
    setRooms([{ ...rooms[0], name: 'Chambre', totalUnits: total }])
    setFeedback('Toutes les chambres utiliseront désormais la même annonce et le même stock.')
  }

  const addRoom = () => {
    setRooms((current) => {
      if (current.length >= 12) return current
      const donorIndex = current.reduce((best, room, index) => Number(room.totalUnits) > Number(current[best]?.totalUnits || 0) ? index : best, 0)
      if (Number(current[donorIndex]?.totalUnits) <= 1) return current
      return current.map((room, index) => index === donorIndex ? { ...room, totalUnits: room.totalUnits - 1 } : room)
        .concat(makeRoomType(listing, current.length + 1, 1))
    })
    setFeedback('')
  }

  const removeRoom = (id) => {
    if (rooms.length <= 2) return
    if (reservationCountByRoom[id]) {
      setFeedback('Cette catégorie possède déjà des réservations et ne peut pas être supprimée.')
      return
    }
    const removed = rooms.find((room) => room.id === id)
    const next = rooms.filter((room) => room.id !== id)
    if (next[0] && removed) next[0] = { ...next[0], totalUnits: next[0].totalUnits + removed.totalUnits }
    setRooms(next)
    setFeedback('')
  }

  const save = () => {
    const invalid = rooms.find((room) => !String(room.name || '').trim() || Number(room.basePrice) <= 0 || Number(room.totalUnits) <= 0)
    if (invalid) {
      setFeedback('Chaque catégorie doit avoir un nom, un prix et au moins une chambre.')
      return
    }
    try {
      saveHostRoomTypes(userId, rooms)
      setFeedback('Configuration des chambres enregistrée.')
      setOpen(false)
    } catch (error) {
      setFeedback(error?.message || 'Impossible d’enregistrer la configuration des chambres.')
    }
  }

  const total = totalRooms(rooms)
  const categorized = rooms.length > 1
  const identical = !categorized && total > 1

  return (
    <>
      <button type="button" className="host-room-type-manager__preview" onClick={() => onNavigate?.(`/listing/${encodeURIComponent(listing.id)}`)}>
        Voir comme voyageur
      </button>
      <button type="button" className="host-room-type-manager__launcher" onClick={() => { setRooms(cloneRooms(listing.roomTypes)); setFeedback(''); setOpen(true) }}>
        <span>Chambres</span>
        <b>{listing.roomInventory?.totalUnits || totalRooms(listing.roomTypes)}</b>
      </button>

      {open ? (
        <div className="host-room-type-manager" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="host-room-type-manager__sheet" role="dialog" aria-modal="true" aria-labelledby="host-room-types-title">
            <div className="host-room-type-manager__handle" />
            <header>
              <div>
                <small>Inventaire de l’établissement</small>
                <h2 id="host-room-types-title">{configurationLabel(rooms)}</h2>
                <p>Le calendrier garde un stock indépendant pour chaque nuit et, si nécessaire, pour chaque catégorie.</p>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)}>×</button>
            </header>

            <div className="host-room-type-manager__notice">
              <strong>Voyageur</strong>
              <span>{categorized ? 'Il choisit une catégorie avec ses propres photos, détails et prix.' : 'Il voit une annonce classique, sans quantité de stock.'}</span>
              <strong>Hôte</strong>
              <span>{identical ? `${total} chambres identiques partagent le même inventaire.` : categorized ? 'Chaque catégorie possède son propre stock.' : 'Une seule chambre : fonctionnement classique.'}</span>
            </div>

            {!categorized ? (
              <div className="host-room-type-manager__single-mode">
                <NumberField label="Nombre de chambres identiques" value={rooms[0].totalUnits} min={1} max={999} onChange={(value) => updateRoom(rooms[0].id, { totalUnits: value })} />
                <p>{rooms[0].totalUnits > 1 ? `Si 1 chambre est réservée sur une période, ${rooms[0].totalUnits - 1} restent disponibles sur les mêmes nuits.` : 'Avec une seule chambre, l’annonce et le calendrier fonctionnent normalement.'}</p>
                {rooms[0].totalUnits > 1 ? <button type="button" className="host-room-type-manager__mode-action" onClick={splitIntoCategories}>Les chambres ne sont pas toutes identiques</button> : null}
              </div>
            ) : (
              <>
                <button type="button" className="host-room-type-manager__mode-action" onClick={mergeAsIdentical}>Toutes les chambres sont identiques</button>
                <div className="host-room-type-manager__list">
                  {rooms.map((room, index) => {
                    const booked = reservationCountByRoom[room.id] || 0
                    return (
                      <article className="host-room-type-manager__card" key={room.id}>
                        <div className="host-room-type-manager__card-head">
                          <span>Catégorie {index + 1} · {room.totalUnits} chambre{room.totalUnits > 1 ? 's' : ''}</span>
                          <button type="button" disabled={rooms.length <= 2 || booked > 0} onClick={() => removeRoom(room.id)}>{booked > 0 ? 'Réservations liées' : 'Supprimer'}</button>
                        </div>
                        <label><span>Nom visible au voyageur</span><input value={room.name} maxLength={44} onChange={(event) => updateRoom(room.id, { name: event.target.value })} placeholder="Ex. Deluxe vue mer" /></label>
                        <label><span>Vue / particularité</span><input value={room.view || ''} maxLength={60} onChange={(event) => updateRoom(room.id, { view: event.target.value })} placeholder="Ex. Vue mer panoramique" /></label>
                        <label><span>Description de cette catégorie</span><textarea rows="3" maxLength={260} value={room.description || ''} onChange={(event) => updateRoom(room.id, { description: event.target.value })} placeholder="Ex. Chambre lumineuse, balcon privé, étage élevé…" /></label>
                        <div className="host-room-type-manager__numbers">
                          <NumberField label="Chambres" value={room.totalUnits} min={1} max={999} onChange={(value) => updateRoom(room.id, { totalUnits: value })} />
                          <NumberField label="Voyageurs" value={room.guests} min={1} max={20} onChange={(value) => updateRoom(room.id, { guests: value })} />
                          <NumberField label="Lits" value={room.beds} min={1} max={20} onChange={(value) => updateRoom(room.id, { beds: value })} />
                        </div>
                        <div className="host-room-type-manager__numbers">
                          <NumberField label="Surface m²" value={room.surface || 0} min={0} max={1000} onChange={(value) => updateRoom(room.id, { surface: value })} />
                          <NumberField label="Sdb" value={room.bathrooms} min={0} max={10} onChange={(value) => updateRoom(room.id, { bathrooms: value })} />
                          <NumberField label="Prix / nuit" value={room.basePrice} min={1} max={99999} onChange={(value) => updateRoom(room.id, { basePrice: value })} />
                        </div>
                        <label><span>Type de lit</span><input value={room.bedType || ''} maxLength={50} onChange={(event) => updateRoom(room.id, { bedType: event.target.value })} placeholder="Queen, King, twin…" /></label>
                        <label><span>Caractéristiques</span><input value={(room.features || []).join(', ')} maxLength={160} onChange={(event) => updateRoom(room.id, { features: event.target.value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8) })} placeholder="Balcon, bureau, minibar…" /></label>
                        <RoomPhotoSummary room={room} />
                      </article>
                    )
                  })}
                </div>
                <button type="button" className="host-room-type-manager__add" disabled={rooms.length >= 12 || !rooms.some((room) => room.totalUnits > 1)} onClick={addRoom}>+ Créer une autre catégorie</button>
              </>
            )}

            {feedback ? <p className="host-room-type-manager__feedback" role="status">{feedback}</p> : null}
            <button type="button" className="host-room-type-manager__save" onClick={save}>Enregistrer la configuration</button>
          </section>
        </div>
      ) : null}
    </>
  )
}
