import { useEffect, useRef, useState } from 'react'
import { OptimizedListingImage } from '../../shared/media/OptimizedListingImage.jsx'
import { useFavorites } from '../favorites/favoritesStore.js'
import { listingLocationLine, listingRatingCopy, nextListingId, rotateListingsForPopup } from './mapOfferPopupModel.js'
import './map-offer-popup.css'
import './map-room-categories.css'

function HeartGlyph({ filled }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function CloseGlyph() { return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function listingPhotos(listing) { if (listing?.photos?.length) return listing.photos; if (listing?.image) return [{ src: listing.image, label: 'Chambre' }]; return [] }
function listingPriceCopy(listing) { return listing.priceLabel || listing.priceTotal || '' }

function roomMeta(room) {
  const parts = []
  if (room.surface) parts.push(`${room.surface} m²`)
  parts.push(`${room.guests} voyageur${room.guests > 1 ? 's' : ''}`)
  parts.push(`${room.beds} lit${room.beds > 1 ? 's' : ''}`)
  return parts.join(' · ')
}

function PhotoCarousel({ photos, alt, onOpen }) {
  const [index, setIndex] = useState(0)
  const movedRef = useRef(false)
  const startXRef = useRef(0)
  useEffect(() => { setIndex(0) }, [photos])
  const onScroll = (event) => { const width = event.currentTarget.clientWidth; if (width) setIndex(Math.round(event.currentTarget.scrollLeft / width)) }
  return <div className="map-offer-popup__photos"><div className="map-offer-popup__photo-track" data-testid="map-offer-popup-photos" onScroll={onScroll} onPointerDown={(event) => { event.stopPropagation(); movedRef.current = false; startXRef.current = event.clientX }} onPointerMove={(event) => { if (Math.abs(event.clientX - startXRef.current) > 8) movedRef.current = true }} onClick={(event) => { event.stopPropagation(); if (!movedRef.current) onOpen?.() }}>{photos.map((photo, photoIndex) => <OptimizedListingImage key={`${photo.src}-${photoIndex}`} src={photo.src} alt={photoIndex === 0 ? alt : ''} sizes="(max-width:430px) calc(100vw - 32px), 398px" loading={photoIndex === 0 ? 'eager' : 'lazy'} fetchPriority={photoIndex === 0 ? 'high' : undefined} draggable="false" />)}</div>{photos.length > 1 ? <div className="map-offer-popup__dots" aria-hidden="true">{photos.map((photo, photoIndex) => <span key={`${photo.src}-dot`} className={photoIndex === index ? 'is-active' : undefined}/>)}</div> : null}</div>
}

function OfferCard({ listing, selectedRoomId, onSelectRoom, favorite, onToggleFavorite, onClose, onOpen }) {
  const roomTypes = Array.isArray(listing.roomTypes) ? listing.roomTypes : []
  const categorized = roomTypes.length > 1
  const selectedRoom = roomTypes.find((room) => room.id === selectedRoomId) || roomTypes[0] || null
  const photos = categorized && selectedRoom?.photos?.length ? selectedRoom.photos : listingPhotos(listing)
  const locationLine = listingLocationLine(listing)
  const ratingCopy = listingRatingCopy(listing)
  const capacityLine = categorized && selectedRoom ? selectedRoom.capacityLine : listing.capacityLine
  const priceCopy = categorized && selectedRoom ? `${selectedRoom.basePrice} ${listing.currency || 'TND'} / nuit` : listingPriceCopy(listing)

  return <article className="map-offer-popup__card" data-testid="map-offer-popup-card" data-listing-id={listing.id} data-current="true" onClick={onOpen}>
    <div className="map-offer-popup__media"><PhotoCarousel photos={photos} alt={categorized && selectedRoom ? `${listing.title} — ${selectedRoom.name}` : listing.title} onOpen={onOpen}/>{listing.badge ? <span className="map-offer-popup__badge">{listing.badge}</span> : null}<div className="map-offer-popup__orbs"><button type="button" className="map-offer-popup__orb" aria-label={`${favorite ? 'Retirer' : 'Ajouter'} ${listing.title} ${favorite ? 'des' : 'aux'} favoris`} aria-pressed={favorite} onClick={(event) => { event.stopPropagation(); onToggleFavorite(listing.id) }}><span className={favorite ? 'map-offer-popup__heart is-on' : 'map-offer-popup__heart'}><HeartGlyph filled={favorite}/></span></button><button type="button" className="map-offer-popup__orb" data-testid="map-offer-popup-close" aria-label="Fermer" onClick={(event) => { event.stopPropagation(); onClose() }}><CloseGlyph/></button></div></div>
    <div className="map-offer-popup__body"><div className="map-offer-popup__title-row"><h2>{listing.title}</h2><span className="map-offer-popup__rating">{ratingCopy}</span></div><p className="map-offer-popup__place">{locationLine}</p>
      {categorized ? <div className="map-room-categories" onClick={(event) => event.stopPropagation()}><span className="map-room-categories__label">{roomTypes.length} catégories</span><div>{roomTypes.map((room) => <button type="button" key={room.id} data-active={room.id === selectedRoom?.id ? 'true' : 'false'} onClick={() => onSelectRoom(room.id)}><strong>{room.name}</strong><small>{roomMeta(room)}</small><b>{room.basePrice} {listing.currency || 'TND'}</b></button>)}</div></div> : null}
      {capacityLine ? <p className="map-offer-popup__capacity">{capacityLine}</p> : null}<p className="map-offer-popup__price">{priceCopy}</p>
    </div>
  </article>
}

export function MapOfferPopup({ listings, selectedListingId, onSelectedListingChange, onClose, onNavigate }) {
  const { favoriteIds, toggleFavorite } = useFavorites()
  const [roomSelection, setRoomSelection] = useState({})
  const ordered = rotateListingsForPopup(listings, selectedListingId)
  const current = ordered[0]
  const showNavigation = ordered.length > 1
  if (!current) return null
  const roomTypes = Array.isArray(current.roomTypes) ? current.roomTypes : []
  const currentRoomId = roomSelection[current.id] || roomTypes[0]?.id || ''
  const openListing = (listingId) => {
    const listing = listings.find((item) => item.id === listingId)
    const categories = Array.isArray(listing?.roomTypes) ? listing.roomTypes : []
    const selected = roomSelection[listingId] || categories[0]?.id || ''
    onNavigate?.(`/listing/${listingId}${categories.length > 1 && selected ? `?roomType=${encodeURIComponent(selected)}` : ''}`)
  }
  const goNext = () => { const nextId = nextListingId(listings, selectedListingId); if (nextId && nextId !== selectedListingId) onSelectedListingChange?.(nextId) }
  const goPrevious = () => { const currentIndex = listings.findIndex((listing) => listing.id === selectedListingId); if (currentIndex < 0 || listings.length < 2) return; const previousId = listings[(currentIndex - 1 + listings.length) % listings.length]?.id; if (previousId && previousId !== selectedListingId) onSelectedListingChange?.(previousId) }

  return <div className="map-offer-popup" data-testid="map-offer-popup" data-listing-id={current.id} data-offer-count={ordered.length}><div className="map-offer-popup__single"><OfferCard listing={current} selectedRoomId={currentRoomId} onSelectRoom={(roomId) => setRoomSelection((state) => ({ ...state, [current.id]: roomId }))} favorite={favoriteIds.includes(current.id)} onToggleFavorite={toggleFavorite} onClose={onClose} onOpen={() => openListing(current.id)}/>{showNavigation ? <div className="map-offer-popup__rail" aria-label="Navigation entre les offres"><button type="button" className="map-offer-popup__rail-section map-offer-popup__rail-section--previous" data-testid="map-offer-popup-previous" aria-label="Offre précédente" onClick={(event) => { event.stopPropagation(); goPrevious() }}><span className="map-offer-popup__rail-copy">Préc.</span></button><span className="map-offer-popup__rail-divider" aria-hidden="true"/><button type="button" className="map-offer-popup__rail-section map-offer-popup__rail-section--next" data-testid="map-offer-popup-next" aria-label="Offre suivante" onClick={(event) => { event.stopPropagation(); goNext() }}><span className="map-offer-popup__rail-copy">Suiv.</span></button></div> : null}</div></div>
}
