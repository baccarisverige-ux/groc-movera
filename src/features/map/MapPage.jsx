import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { listingCatalog } from '../../entities/listing/listingCatalog.js'
import { getListingMapPosition } from '../../entities/listing/listingMapPositions.js'
import { ArrowLeftIcon } from '../../shared/icons/AppIcons.jsx'
import '../../styles/map-b225.css'
import '../../styles/map-return-offers.css'
import { INITIAL_VIEWPORT, MapContainer } from '../map-engine/MapContainer.jsx'
import { announceMapReady } from '../search/mapHandoff.js'
import { DESTINATION_VIEWPORTS } from './constants/map.constants.js'
import { listingMatchesMapFilters } from './mapListingFilters.js'
import { MapOfferSheet } from './MapOfferSheet.jsx'
import { MapSearchFilters } from './MapSearchFilters.jsx'

const MAP_MOTION_PROGRESS_LIMIT = 0.72
const MAP_GESTURE_SETTLE_MS = 500

const LISTING_MARKERS = Object.freeze(
  listingCatalog
    .map((listing) => {
      const position = getListingMapPosition(listing.id)
      return position ? Object.freeze({ id: listing.id, label: listing.title, ...position }) : null
    })
    .filter(Boolean),
)

const COLLECTION_ROUTE_BY_CATEGORY = Object.freeze({
  beach: '/plage',
  guesthouse: '/maison-d-hote',
  hotel: '/hotel',
  family: '/appartement',
  prestige: '/villa',
})

const DESTINATION_LISTING_LOCATIONS = Object.freeze({
  'la-marsa': ['La Marsa'],
  'sidi-bou-said': ['Sidi Bou Saïd'],
  gammarth: ['Gammarth'],
  carthage: ['Carthage'],
  tunis: ['La Marsa', 'Sidi Bou Saïd', 'Gammarth', 'Carthage'],
})

const DESTINATION_LABELS = Object.freeze({
  'la-marsa': 'La Marsa',
  'sidi-bou-said': 'Sidi Bou Saïd',
  gammarth: 'Gammarth',
  carthage: 'Carthage',
  hammamet: 'Hammamet',
  tunis: 'Tunis',
  sousse: 'Sousse',
  djerba: 'Djerba',
  tozeur: 'Tozeur',
  tabarka: 'Tabarka',
  nabeul: 'Nabeul',
  bizerte: 'Bizerte',
})

function boundedNumber(searchParams, key, min, max) {
  const value = Number(searchParams.get(key))
  return Number.isFinite(value) && value >= min && value <= max ? value : null
}

function viewportFromSearch(searchParams) {
  const lat = boundedNumber(searchParams, 'lat', -90, 90)
  const lng = boundedNumber(searchParams, 'lng', -180, 180)
  const zoom = boundedNumber(searchParams, 'zoom', 1, 20)
  return lat === null || lng === null || zoom === null ? null : { lat, lng, zoom }
}

function collectionFallbackPath(listingId) {
  const listing = listingCatalog.find((item) => item.id === listingId)
  if (!listing) return '/'
  const categories = listing.category.split(' ')
  const category = categories.find((item) => COLLECTION_ROUTE_BY_CATEGORY[item])
  return category ? COLLECTION_ROUTE_BY_CATEGORY[category] : '/'
}

function listingsForMapContext(requestedDestination, requestedListing) {
  if (requestedDestination) {
    const locations = DESTINATION_LISTING_LOCATIONS[requestedDestination]
    if (!locations) return []
    return listingCatalog.filter((listing) => locations.includes(listing.location))
  }

  if (requestedListing) {
    const selected = listingCatalog.find((listing) => listing.id === requestedListing)
    if (!selected) return []
    return listingCatalog.filter((listing) => listing.location === selected.location)
  }

  return listingCatalog
}

export function MapPage({ onNavigate }) {
  const searchString = window.location.search
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString])
  const requestedDestination = searchParams.get('destination')
  const requestedListing = searchParams.get('listing')
  const mapContextKey = requestedDestination || requestedListing || searchString || 'grand-tunis'
  const selectedMarker = requestedListing ? LISTING_MARKERS.find((marker) => marker.id === requestedListing) || null : null
  const handoffViewport = useMemo(() => viewportFromSearch(searchParams), [searchParams])
  const destinationViewport = requestedDestination ? DESTINATION_VIEWPORTS[requestedDestination] || null : null
  const listingViewport = useMemo(
    () => selectedMarker ? { lat: selectedMarker.lat, lng: selectedMarker.lng, zoom: 13.5 } : null,
    [selectedMarker],
  )
  const initialViewport = handoffViewport || listingViewport || destinationViewport || INITIAL_VIEWPORT

  const headerRef = useRef(null)
  const mapInteractionRef = useRef(false)
  const mapAutoCameraBlockedUntilRef = useRef(0)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [selectionState, setSelectionState] = useState(() => ({ contextKey: mapContextKey, id: selectedMarker?.id || null }))
  const [viewportState, setViewportState] = useState(() => ({ contextKey: mapContextKey, command: null }))
  const [amenityFilters, setAmenityFilters] = useState(() => new Set())
  const [mapInteracting, setMapInteracting] = useState(false)
  const selectedListingId = selectionState.contextKey === mapContextKey ? selectionState.id : selectedMarker?.id || null
  const viewportCommand = viewportState.contextKey === mapContextKey ? viewportState.command : null

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return undefined

    const measure = () => {
      const nextHeight = header.getBoundingClientRect().height
      setHeaderHeight((current) => Math.abs(current - nextHeight) < 0.5 ? current : nextHeight)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  const setSelectedListingId = useCallback((id) => {
    setSelectionState({ contextKey: mapContextKey, id })
  }, [mapContextKey])

  const issueViewportCommand = useCallback((command) => {
    setViewportState({
      contextKey: mapContextKey,
      command: { ...command, revision: performance.now() },
    })
  }, [mapContextKey])

  const handleMapInteractionChange = useCallback((active) => {
    const next = Boolean(active)
    mapInteractionRef.current = next
    mapAutoCameraBlockedUntilRef.current = next
      ? Number.POSITIVE_INFINITY
      : performance.now() + MAP_GESTURE_SETTLE_MS
    setMapInteracting(next)
  }, [])

  const contextListings = useMemo(
    () => listingsForMapContext(requestedDestination, requestedListing),
    [requestedDestination, requestedListing],
  )

  const cityListings = useMemo(
    () => contextListings.filter((listing) => listingMatchesMapFilters(listing, amenityFilters)),
    [contextListings, amenityFilters],
  )

  const visibleMarkers = useMemo(() => {
    const ids = new Set(cityListings.map((listing) => listing.id))
    return LISTING_MARKERS.filter((marker) => ids.has(marker.id))
  }, [cityListings])

  const cityLabel = requestedDestination
    ? DESTINATION_LABELS[requestedDestination] || 'Cette destination'
    : requestedListing
      ? listingCatalog.find((listing) => listing.id === requestedListing)?.location || 'Cette ville'
      : 'Grand Tunis'

  const toggleAmenityFilter = useCallback((amenityId) => {
    setAmenityFilters((current) => {
      const next = new Set(current)
      if (next.has(amenityId)) next.delete(amenityId)
      else next.add(amenityId)
      return next
    })
  }, [])

  const resetFilters = useCallback(() => {
    setAmenityFilters(new Set())
  }, [])

  useEffect(() => {
    if (!selectedListingId) return
    if (cityListings.some((listing) => listing.id === selectedListingId)) return
    setSelectedListingId(null)
  }, [cityListings, selectedListingId, setSelectedListingId])

  const returnToOffers = () => {
    if (!requestedListing) return
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    onNavigate(collectionFallbackPath(requestedListing))
  }

  const handleSheetProgress = useCallback((progress) => {
    const autoCameraBlocked = mapInteractionRef.current || performance.now() < mapAutoCameraBlockedUntilRef.current

    // The map gets exclusive camera ownership from the first pointer-down until
    // a short settling window after Google reports the gesture complete. Using
    // refs here is intentional: it blocks sheet commands synchronously, before
    // a React state render can lag one frame behind the native touch event.
    if (autoCameraBlocked || progress > MAP_MOTION_PROGRESS_LIMIT) return

    if (progress > 0.14 && !selectedListingId && cityListings[0]) setSelectedListingId(cityListings[0].id)

    const base = handoffViewport || listingViewport || destinationViewport || INITIAL_VIEWPORT
    const activeId = selectedListingId || cityListings[0]?.id
    const activeMarker = activeId ? visibleMarkers.find((marker) => marker.id === activeId) : null
    const blend = activeMarker ? Math.max(0, Math.min(1, (progress - 0.08) / 0.92)) : 0
    const focusStrength = blend * 0.72
    const lat = activeMarker ? base.lat + (activeMarker.lat - base.lat) * focusStrength : base.lat
    const lng = activeMarker ? base.lng + (activeMarker.lng - base.lng) * focusStrength : base.lng
    const zoom = Math.min(17, base.zoom + progress * 1.45)

    issueViewportCommand({ lat, lng, zoom })
  }, [handoffViewport, listingViewport, destinationViewport, selectedListingId, cityListings, visibleMarkers, setSelectedListingId, issueViewportCommand])

  const handleSheetSelectedListingChange = useCallback((listingId) => {
    setSelectedListingId(listingId)
    const marker = visibleMarkers.find((item) => item.id === listingId)
    const base = handoffViewport || listingViewport || destinationViewport || INITIAL_VIEWPORT
    if (!marker) return
    issueViewportCommand({
      lat: marker.lat,
      lng: marker.lng,
      zoom: Math.min(17, Math.max(13.6, base.zoom + 1.65)),
    })
  }, [visibleMarkers, handoffViewport, listingViewport, destinationViewport, setSelectedListingId, issueViewportCommand])

  useEffect(() => {
    let frame = 0
    let paintFrame = 0
    let finalFrame = 0
    const startedAt = performance.now()
    const maxWaitMs = 260

    const announceAfterPaint = () => {
      paintFrame = window.requestAnimationFrame(() => {
        finalFrame = window.requestAnimationFrame(() => announceMapReady())
      })
    }

    const checkSurface = () => {
      const surface = document.querySelector('.b225-map-page [data-testid="map-surface"]')
      if (!surface) {
        if (performance.now() - startedAt >= maxWaitMs) announceAfterPaint()
        else frame = window.requestAnimationFrame(checkSurface)
        return
      }

      const rect = surface.getBoundingClientRect()
      const measuredWidth = Number(surface.dataset.width)
      const measuredHeight = Number(surface.dataset.height)
      const sizeStable = Number.isFinite(measuredWidth)
        && Number.isFinite(measuredHeight)
        && Math.abs(measuredWidth - Math.round(rect.width)) <= 1
        && Math.abs(measuredHeight - Math.round(rect.height)) <= 1

      if (sizeStable || performance.now() - startedAt >= maxWaitMs) {
        announceAfterPaint()
        return
      }

      frame = window.requestAnimationFrame(checkSurface)
    }

    frame = window.requestAnimationFrame(checkSurface)
    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(paintFrame)
      window.cancelAnimationFrame(finalFrame)
    }
  }, [mapContextKey])

  return (
    <section
      className="b225-map-page"
      data-testid="page-map"
      data-destination={requestedDestination || ''}
      data-listing={selectedMarker?.id || ''}
      data-handoff-viewport={handoffViewport ? 'true' : 'false'}
      data-city-offer-count={cityListings.length}
      data-context-offer-count={contextListings.length}
      data-amenity-filter-count={amenityFilters.size}
      data-map-interacting={mapInteracting ? 'true' : 'false'}
    >
      <div ref={headerRef} className="b225-map-top">
        <MapSearchFilters
          cityLabel={cityLabel}
          amenityFilters={amenityFilters}
          onHome={() => onNavigate('/')}
          onAmenityFilterToggle={toggleAmenityFilter}
          onResetFilters={resetFilters}
        />
      </div>

      <div className="b225-map-stage">
        {requestedListing ? (
          <button type="button" className="b225-map-return b225-map-return--floating" onClick={returnToOffers} aria-label="Retour aux offres">
            <span className="b225-map-return__icon"><ArrowLeftIcon /></span>
            <span>Retour aux offres</span>
          </button>
        ) : null}

        <MapContainer
          key={`map-${mapContextKey}`}
          markers={visibleMarkers}
          selectedListingId={selectedListingId}
          onSelectedListingChange={setSelectedListingId}
          onInteractionChange={handleMapInteractionChange}
          initialViewport={initialViewport}
          viewportCommand={viewportCommand}
        />
      </div>

      <MapOfferSheet
        key={`sheet-${mapContextKey}`}
        listings={cityListings}
        cityLabel={cityLabel}
        headerHeight={headerHeight}
        selectedListingId={selectedListingId}
        onSelectedListingChange={handleSheetSelectedListingChange}
        onProgressChange={handleSheetProgress}
      />
    </section>
  )
}
