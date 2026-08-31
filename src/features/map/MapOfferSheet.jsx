import { useEffect, useState } from 'react'
import { MotionList, MotionListItem } from '../../shared/motion/MotionList.jsx'
import { MapOfferSheetMotionSurface } from './motion/MapOfferSheetMotionSurface.jsx'
import { MAP_OFFER_ITEM_MOTION } from './motion/mapOfferSheetMotion.config.js'
import { useMapOfferScrollSheetHandoff } from './motion/useMapOfferScrollSheetHandoff.js'
import './map-offer-sheet.css'
import '../../styles/map-offer-sheet-premium.css'

const COLLAPSED_PANEL_VISIBLE_PX = 78
const TOP_BAR_SEAM_OVERLAP_PX = 2
const ATTACHED_ENTER_PROGRESS = 0.995
const ATTACHED_EXIT_PROGRESS = 0.92

const MAP_PROPERTY_FILTERS = Object.freeze([
  { id: 'all', label: 'Tout' },
  { id: 'apartment', label: 'Appartement' },
  { id: 'house', label: 'Maison' },
  { id: 'villa', label: 'Villa' },
  { id: 'hotel', label: 'Hôtel' },
  { id: 'guesthouse', label: "Maison d’hôte" },
  { id: 'beach', label: 'Plage' },
])

function useStableAttached(progress) {
  const [attached, setAttached] = useState(() => progress >= ATTACHED_ENTER_PROGRESS)

  useEffect(() => {
    setAttached((current) => {
      if (current) return progress > ATTACHED_EXIT_PROGRESS
      return progress >= ATTACHED_ENTER_PROGRESS
    })
  }, [progress])

  return attached
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5" /></svg>
}

function StarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7L6.8 19l1-5.8-4.2-4.1 5.8-.8L12 3Z" /></svg>
}

function listingPriceCopy(listing) {
  if (listing.priceLabel) return listing.priceLabel
  if (listing.priceTotal) return listing.priceTotal
  if (listing.nightlyRate != null) return `${listing.nightlyRate} ${listing.currency || 'TND'}`
  if (listing.price != null) return `${listing.price} ${listing.currency || 'TND'}`
  return ''
}

function listingMatchesSheetPropertyFilter(listing, filterId) {
  if (filterId !== 'hotel') return true
  const category = String(listing?.category || '').toLowerCase()
  const title = String(listing?.title || '').toLowerCase()
  const type = String(listing?.capacity?.type || '').toLowerCase()
  const haystack = `${category} ${title} ${type}`
  return category.includes('hotel')
    || haystack.includes('hôtel')
    || haystack.includes('hotel')
    || haystack.includes('palace')
}

function MapOfferSheetContent({
  listings,
  cityLabel,
  headerHeight,
  selectedListingId,
  propertyFilter,
  onPropertyFilterChange,
  onSelectedListingChange,
  onNavigate,
  progress,
  startDrag,
  toggleExpanded,
  externalDrag,
}) {
  const attached = useStableAttached(progress)
  const listRef = useMapOfferScrollSheetHandoff({ expanded: attached, externalDrag })
  const safeHeaderHeight = Math.max(0, headerHeight || 0)
  const displayedListings = listings.filter((listing) => listingMatchesSheetPropertyFilter(listing, propertyFilter))

  const openListing = (listingId) => {
    onSelectedListingChange?.(listingId)
    onNavigate?.(`/listing/${listingId}`)
  }

  return (
    <>
      <div
        className="map-offer-sheet__header-spacer"
        aria-hidden="true"
        data-testid="map-offer-sheet-header-spacer"
        style={{ height: `${safeHeaderHeight}px` }}
      />

      <div className="map-offer-sheet__panel" data-attachment-state={attached ? 'attached' : 'moving'}>
        <div
          className="map-offer-sheet__drag-zone"
          data-testid="map-offer-sheet-handle"
          data-attachment-state={attached ? 'attached' : 'moving'}
          data-header-offset={Math.round(safeHeaderHeight)}
          onPointerDown={startDrag}
        >
          <button type="button" className="map-offer-sheet__handle-button" onClick={toggleExpanded} aria-label={progress > 0.72 ? 'Réduire la liste des offres' : 'Afficher la liste des offres'}>
            <span className="map-offer-sheet__grabber" />
            <span className="map-offer-sheet__heading">
              <strong>{displayedListings.length ? `${displayedListings.length} offre${displayedListings.length > 1 ? 's' : ''}` : 'Aucune offre'}</strong>
              <span className="map-offer-sheet__city-label">{cityLabel}</span>
              <span className="map-offer-sheet__brand-badge">Movera Host</span>
            </span>
            <span className="map-offer-sheet__chevron" data-open={progress > 0.72 ? 'true' : 'false'}><ChevronIcon /></span>
          </button>
        </div>

        <div className="map-offer-sheet__property-dock" data-testid="map-sheet-property-filters" aria-label="Type de logement">
          <div className="map-offer-sheet__property-rail">
            {MAP_PROPERTY_FILTERS.map((filter) => {
              const active = propertyFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  className="map-offer-sheet__property-chip"
                  data-property-filter={filter.id}
                  data-active={active ? 'true' : 'false'}
                  aria-pressed={active}
                  onClick={() => onPropertyFilterChange?.(filter.id)}
                >
                  <span>{filter.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {displayedListings.length ? (
          <MotionList
            nodeRef={listRef}
            className="map-offer-sheet__list"
            data-scroll-enabled={attached ? 'true' : 'false'}
            data-motion-list="map-offers"
            data-map-scroll="independent"
            data-sheet-handoff="drag-from-offer"
          >
            <div className="map-offer-sheet__list-content" data-testid="map-offer-sheet-list-content">
              {displayedListings.map((listing, index) => {
                const selected = listing.id === selectedListingId || (!selectedListingId && index === 0 && progress > 0.12)
                return (
                  <MotionListItem
                    as="button"
                    type="button"
                    key={listing.id}
                    index={index}
                    active={selected}
                    config={MAP_OFFER_ITEM_MOTION}
                    className="map-offer-sheet__card"
                    data-listing-id={listing.id}
                    data-active={selected ? 'true' : 'false'}
                    onClick={() => openListing(listing.id)}
                  >
                    <span className="map-offer-sheet__media">
                      <img src={listing.image} alt="" loading={index < 2 ? 'eager' : 'lazy'} />
                      {listing.badge ? <span className="map-offer-sheet__badge">{listing.badge}</span> : null}
                      <span className="map-offer-sheet__position" aria-hidden="true">{index + 1}/{displayedListings.length}</span>
                    </span>
                    <span className="map-offer-sheet__card-copy">
                      <span className="map-offer-sheet__card-head">
                        <span>
                          <strong>{listing.title}</strong>
                          <small>{listing.location}, Tunisie</small>
                        </span>
                        <span className="map-offer-sheet__rating"><StarIcon />{listing.rating}</span>
                      </span>
                      <span className="map-offer-sheet__price"><b>{listingPriceCopy(listing)}</b></span>
                    </span>
                  </MotionListItem>
                )
              })}
            </div>
          </MotionList>
        ) : (
          <div className="map-offer-sheet__empty">
            <div className="map-offer-sheet__empty-content">
              <strong>Aucune offre Movera dans cette ville</strong>
              <span>La carte reste disponible pour explorer la zone.</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export function MapOfferSheet({
  listings,
  cityLabel,
  headerHeight = 0,
  selectedListingId,
  propertyFilter = 'all',
  onPropertyFilterChange,
  onSelectedListingChange,
  onProgressChange,
  onNavigate,
  hidden = false,
}) {
  const safeHeaderHeight = Math.max(0, (headerHeight || 0) - TOP_BAR_SEAM_OVERLAP_PX)

  return (
    <MapOfferSheetMotionSurface
      className={`map-offer-sheet${hidden ? ' map-offer-sheet--popup-hidden' : ''}`}
      ariaLabel={`Offres ${cityLabel}`}
      collapsedVisiblePx={COLLAPSED_PANEL_VISIBLE_PX + safeHeaderHeight}
      onProgressChange={onProgressChange}
    >
      {({ progress, startDrag, toggleExpanded, externalDrag }) => (
        <MapOfferSheetContent
          listings={listings}
          cityLabel={cityLabel}
          headerHeight={safeHeaderHeight}
          selectedListingId={selectedListingId}
          propertyFilter={propertyFilter}
          onPropertyFilterChange={onPropertyFilterChange}
          onSelectedListingChange={onSelectedListingChange}
          onNavigate={onNavigate}
          progress={progress}
          startDrag={startDrag}
          toggleExpanded={toggleExpanded}
          externalDrag={externalDrag}
        />
      )}
    </MapOfferSheetMotionSurface>
  )
}
