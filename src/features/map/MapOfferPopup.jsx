import { useEffect, useRef, useState } from 'react'
import { useFavorites } from '../favorites/favoritesStore.js'
import { listingLocationLine, listingRatingCopy, nextListingId, rotateListingsForPopup } from './mapOfferPopupModel.js'
import './map-offer-popup.css'

function HeartGlyph({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function NextGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function listingPhotos(listing) {
  if (listing?.photos?.length) return listing.photos
  if (listing?.image) return [{ src: listing.image, label: 'Chambre' }]
  return []
}

function listingPriceCopy(listing) {
  return listing.priceLabel || listing.priceTotal || ''
}

function PhotoCarousel({ photos, alt, onOpen }) {
  const [index, setIndex] = useState(0)
  const movedRef = useRef(false)
  const startXRef = useRef(0)

  useEffect(() => { setIndex(0) }, [photos])

  const onScroll = (event) => {
    const width = event.currentTarget.clientWidth
    if (!width) return
    setIndex(Math.round(event.currentTarget.scrollLeft / width))
  }

  return (
    <div className="map-offer-popup__photos">
      <div
        className="map-offer-popup__photo-track"
        data-testid="map-offer-popup-photos"
        onScroll={onScroll}
        onPointerDown={(event) => {
          event.stopPropagation()
          movedRef.current = false
          startXRef.current = event.clientX
        }}
        onPointerMove={(event) => {
          if (Math.abs(event.clientX - startXRef.current) > 8) movedRef.current = true
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (!movedRef.current) onOpen?.()
        }}
      >
        {photos.map((photo, photoIndex) => (
          <img
            key={`${photo.src}-${photoIndex}`}
            src={photo.src}
            alt={photoIndex === 0 ? alt : ''}
            draggable="false"
          />
        ))}
      </div>
      {photos.length > 1 ? (
        <div className="map-offer-popup__dots" aria-hidden="true">
          {photos.map((photo, photoIndex) => (
            <span
              key={`${photo.src}-dot`}
              className={photoIndex === index ? 'is-active' : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function OfferCard({ listing, favorite, onToggleFavorite, onClose, onOpen }) {
  const photos = listingPhotos(listing)
  const locationLine = listingLocationLine(listing)
  const ratingCopy = listingRatingCopy(listing)

  return (
    <article
      className="map-offer-popup__card"
      data-testid="map-offer-popup-card"
      data-listing-id={listing.id}
      data-current="true"
      onClick={onOpen}
    >
      <div className="map-offer-popup__media">
        <PhotoCarousel photos={photos} alt={listing.title} onOpen={onOpen} />
        {listing.badge ? <span className="map-offer-popup__badge">{listing.badge}</span> : null}
        <div className="map-offer-popup__orbs">
          <button
            type="button"
            className="map-offer-popup__orb"
            aria-label={`${favorite ? 'Retirer' : 'Ajouter'} ${listing.title} ${favorite ? 'des' : 'aux'} favoris`}
            aria-pressed={favorite}
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite(listing.id)
            }}
          >
            <span className={favorite ? 'map-offer-popup__heart is-on' : 'map-offer-popup__heart'}>
              <HeartGlyph filled={favorite} />
            </span>
          </button>
          <button
            type="button"
            className="map-offer-popup__orb"
            data-testid="map-offer-popup-close"
            aria-label="Fermer"
            onClick={(event) => {
              event.stopPropagation()
              onClose()
            }}
          >
            <CloseGlyph />
          </button>
        </div>
      </div>
      <div className="map-offer-popup__body">
        <div className="map-offer-popup__title-row">
          <h2>{listing.title}</h2>
          <span className="map-offer-popup__rating">{ratingCopy}</span>
        </div>
        <p className="map-offer-popup__place">{locationLine}</p>
        {listing.capacityLine ? <p className="map-offer-popup__capacity">{listing.capacityLine}</p> : null}
        <p className="map-offer-popup__price">{listingPriceCopy(listing)}</p>
      </div>
    </article>
  )
}

export function MapOfferPopup({
  listings,
  selectedListingId,
  onSelectedListingChange,
  onClose,
  onNavigate,
}) {
  const { favoriteIds, toggleFavorite } = useFavorites()
  const ordered = rotateListingsForPopup(listings, selectedListingId)
  const current = ordered[0]
  const showNext = ordered.length > 1

  if (!current) return null

  const openListing = (listingId) => {
    onNavigate?.(`/listing/${listingId}`)
  }

  const goNext = () => {
    const nextId = nextListingId(listings, selectedListingId)
    if (nextId && nextId !== selectedListingId) onSelectedListingChange?.(nextId)
  }

  return (
    <div
      className="map-offer-popup"
      data-testid="map-offer-popup"
      data-listing-id={current.id}
      data-offer-count={ordered.length}
    >
      <div className="map-offer-popup__single">
        <OfferCard
          listing={current}
          favorite={favoriteIds.includes(current.id)}
          onToggleFavorite={toggleFavorite}
          onClose={onClose}
          onOpen={() => openListing(current.id)}
        />
        {showNext ? (
          <button
            type="button"
            className="map-offer-popup__next-band"
            data-testid="map-offer-popup-next"
            aria-label="Offre suivante"
            onClick={(event) => {
              event.stopPropagation()
              goNext()
            }}
          >
            <span className="map-offer-popup__next-line" />
            <span className="map-offer-popup__next-icon"><NextGlyph /></span>
            <span className="map-offer-popup__next-copy">Suivante</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
