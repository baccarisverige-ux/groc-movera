import { useEffect, useMemo, useState } from 'react'
import { readHostRoomInventoryForListing } from '../../../entities/host/hostRoomInventoryStore.js'
import { saveHostRoomLots } from '../../../entities/host/hostRoomTypesStore.js'
import { supportsPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import { makeRoomLot, MIN_ROOM_LOTS, validateRoomLotPlan } from '../../../entities/host/roomLotModel.js'
import './host-room-type-manager.css'

const MAX_PHOTOS = 6

function cloneLots(lots) {
  return (Array.isArray(lots) ? lots : []).map((lot) => ({
    ...lot,
    features: Array.isArray(lot.features) ? [...lot.features] : [],
    photos: Array.isArray(lot.photos) ? [...lot.photos] : [],
  }))
}

function NumberField({ label, value, min = 0, max = 999, onChange }) {
  return (
    <label className="host-room-type-manager__number">
      <span>{label}</span>
      <input type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} />
    </label>
  )
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const image = new Image()
      image.onerror = reject
      image.onload = () => resolve(image)
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

async function compressPhoto(file) {
  const image = await fileToImage(file)
  const ratio = Math.min(1, 960 / Math.max(image.naturalWidth || 1, image.naturalHeight || 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.68)
}

export function HostRoomTypeManager({ profile, userId, onNavigate }) {
  const listing = profile?.listing
  const enabled = supportsPooledRoomInventory(listing?.type)
  const sourceLots = listing?.roomLots || listing?.roomTypes || []
  const [open, setOpen] = useState(false)
  const [lots, setLots] = useState(() => cloneLots(sourceLots))
  const [feedback, setFeedback] = useState('')
  const [uploadingLotId, setUploadingLotId] = useState('')

  useEffect(() => {
    if (!open) setLots(cloneLots(listing?.roomLots || listing?.roomTypes || []))
  }, [listing?.roomLots, listing?.roomTypes, open])

  const inventory = useMemo(() => readHostRoomInventoryForListing(listing?.id), [listing?.id, listing?.roomLots, listing?.roomTypes])
  const reservationCountByLot = useMemo(() => {
    const counts = {}
    Object.values(inventory.reservations || {}).forEach((reservation) => {
      counts[reservation.roomTypeId] = (counts[reservation.roomTypeId] || 0) + 1
    })
    return counts
  }, [inventory.reservations])

  if (!enabled || !listing) return null

  const updateLot = (id, patch) => {
    setLots((current) => current.map((lot) => lot.id === id ? { ...lot, ...patch } : lot))
    setFeedback('')
  }

  const addLot = () => {
    setLots((current) => current.length >= 12 ? current : [...current, makeRoomLot(current.length, listing, 1)])
    setFeedback('')
  }

  const removeLot = (id) => {
    if (lots.length <= MIN_ROOM_LOTS) {
      setFeedback(`Une publication Hôtel/Maison d’hôte doit conserver au moins ${MIN_ROOM_LOTS} lots.`)
      return
    }
    if (reservationCountByLot[id]) {
      setFeedback('Ce lot possède déjà des réservations et ne peut pas être supprimé.')
      return
    }
    setLots((current) => current.filter((lot) => lot.id !== id))
  }

  const addPhotos = async (lotId, files) => {
    const lot = lots.find((item) => item.id === lotId)
    if (!lot) return
    const selected = Array.from(files || []).slice(0, Math.max(0, MAX_PHOTOS - lot.photos.length))
    if (!selected.length) return
    setUploadingLotId(lotId)
    try {
      const photos = []
      for (const file of selected) photos.push(await compressPhoto(file))
      updateLot(lotId, { photos: [...lot.photos, ...photos].slice(0, MAX_PHOTOS) })
    } catch {
      setFeedback('Une photo n’a pas pu être traitée. Utilisez JPG, PNG ou WebP.')
    } finally {
      setUploadingLotId('')
    }
  }

  const save = () => {
    const validation = validateRoomLotPlan({
      totalRooms: lots.reduce((sum, lot) => sum + Number(lot.totalUnits || 0), 0),
      roomLots: lots,
    })
    if (!validation.ok) {
      setFeedback(validation.issues[0] || 'Complétez les lots avant d’enregistrer.')
      return
    }
    if (lots.some((lot) => !lot.photos.length)) {
      setFeedback('Chaque lot doit avoir au moins une photo représentative.')
      return
    }
    try {
      saveHostRoomLots(userId, validation.roomLots)
      setFeedback('Lots enregistrés.')
      setOpen(false)
    } catch (error) {
      setFeedback(error?.message || 'Impossible d’enregistrer les lots.')
    }
  }

  return (
    <>
      <button type="button" className="host-room-type-manager__preview" onClick={() => onNavigate?.(`/listing/${encodeURIComponent(listing.id)}`)}>Voir comme voyageur</button>
      <button type="button" className="host-room-type-manager__launcher" onClick={() => { setLots(cloneLots(sourceLots)); setFeedback(''); setOpen(true) }}>
        <span>Lots de chambres</span><b>{sourceLots.length}</b>
      </button>

      {open ? (
        <div className="host-room-type-manager" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="host-room-type-manager__sheet" role="dialog" aria-modal="true" aria-labelledby="host-room-types-title">
            <div className="host-room-type-manager__handle" />
            <header>
              <div><small>Structure de la publication</small><h2 id="host-room-types-title">Lots de chambres</h2><p>{lots.reduce((sum, lot) => sum + Number(lot.totalUnits || 0), 0)} chambres réparties dans {lots.length} lots.</p></div>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)}>×</button>
            </header>

            <div className="host-room-type-manager__notice">
              <strong>Visible au voyageur</strong><span>Nom du lot, photos, vue, surface, couchage, capacité, description, caractéristiques et prix.</span>
              <strong>Privé côté hôte</strong><span>Quantité totale et stock restant de chaque lot.</span>
            </div>

            <div className="host-room-type-manager__list">
              {lots.map((lot, index) => {
                const booked = reservationCountByLot[lot.id] || 0
                return (
                  <article className="host-room-type-manager__card" key={lot.id}>
                    <div className="host-room-type-manager__card-head"><span>Lot {index + 1} · {lot.totalUnits} chambre{lot.totalUnits > 1 ? 's' : ''}</span><button type="button" disabled={lots.length <= MIN_ROOM_LOTS || booked > 0} onClick={() => removeLot(lot.id)}>{booked > 0 ? 'Réservations liées' : 'Supprimer'}</button></div>
                    <label><span>Nom visible au client</span><input value={lot.name} maxLength={44} onChange={(event) => updateLot(lot.id, { name: event.target.value })} placeholder="Ex. Deluxe Vue Mer" /></label>
                    <label><span>Vue / particularité</span><input value={lot.view} maxLength={80} onChange={(event) => updateLot(lot.id, { view: event.target.value })} placeholder="Ex. Vue mer panoramique · balcon" /></label>
                    <label><span>Description du lot</span><textarea rows="3" maxLength={320} value={lot.description} onChange={(event) => updateLot(lot.id, { description: event.target.value })} placeholder="Décrivez ce qui distingue exactement ces chambres…" /></label>
                    <div className="host-room-type-manager__numbers">
                      <NumberField label="Chambres identiques" value={lot.totalUnits} min={1} max={999} onChange={(value) => updateLot(lot.id, { totalUnits: value })} />
                      <NumberField label="Surface m²" value={lot.sizeM2 || 0} min={0} max={500} onChange={(value) => updateLot(lot.id, { sizeM2: value })} />
                      <NumberField label="Voyageurs" value={lot.guests} min={1} max={20} onChange={(value) => updateLot(lot.id, { guests: value })} />
                      <NumberField label="Lits" value={lot.beds} min={1} max={20} onChange={(value) => updateLot(lot.id, { beds: value })} />
                      <NumberField label="Sdb" value={lot.bathrooms} min={0} max={10} onChange={(value) => updateLot(lot.id, { bathrooms: value })} />
                      <NumberField label="Prix / nuit TND" value={lot.basePrice} min={1} max={99999} onChange={(value) => updateLot(lot.id, { basePrice: value })} />
                    </div>
                    <label><span>Type de lit</span><input value={lot.bedType || ''} maxLength={50} onChange={(event) => updateLot(lot.id, { bedType: event.target.value })} placeholder="King, Queen, twin…" /></label>
                    <label><span>Éléments distinctifs</span><input value={(lot.features || []).join(', ')} onChange={(event) => updateLot(lot.id, { features: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="Balcon, minibar, bureau…" /></label>
                    <label><span>Salle de bain</span><select value={lot.bathroomType || 'private'} onChange={(event) => updateLot(lot.id, { bathroomType: event.target.value })}><option value="private">Privée</option><option value="shared">Partagée</option></select></label>

                    <div className="host-room-type-manager__photos">
                      <div className="host-room-type-manager__photos-head"><strong>Photos de ce lot</strong><span>{lot.photos.length}/{MAX_PHOTOS}</span></div>
                      {lot.photos.length ? <div className="host-room-type-manager__photos-rail">{lot.photos.map((src, photoIndex) => <span key={`${lot.id}-${photoIndex}`}><img src={src} alt=""/><button type="button" aria-label={`Supprimer photo ${photoIndex + 1}`} onClick={() => updateLot(lot.id, { photos: lot.photos.filter((_, i) => i !== photoIndex) })}>×</button>{photoIndex === 0 ? <i>Principale</i> : null}</span>)}</div> : null}
                      <label className="host-room-type-manager__photo-upload" data-loading={uploadingLotId === lot.id ? 'true' : 'false'}><b>{uploadingLotId === lot.id ? 'Traitement…' : lot.photos.length ? '+ Ajouter' : '+ Ajouter les photos'}</b><small>Photos représentatives de toutes les chambres de ce lot</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={lot.photos.length >= MAX_PHOTOS || uploadingLotId === lot.id} onChange={(event) => addPhotos(lot.id, event.target.files)} /></label>
                    </div>
                  </article>
                )
              })}
            </div>

            <button type="button" className="host-room-type-manager__add" disabled={lots.length >= 12} onClick={addLot}>+ Ajouter un autre lot</button>
            {feedback ? <p className="host-room-type-manager__feedback" role="status">{feedback}</p> : null}
            <button type="button" className="host-room-type-manager__save" onClick={save}>Enregistrer les lots</button>
          </section>
        </div>
      ) : null}
    </>
  )
}
