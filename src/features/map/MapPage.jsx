import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { HOST_PROFILE_EVENT } from '../../entities/host/hostProfileStore.js'
import { getListingMapPosition } from '../../entities/listing/listingMapPositions.js'
import { getGuestListingById, listUniqueHomeOffers } from '../listing/guestListings.js'
import { ArrowLeftIcon } from '../../shared/icons/AppIcons.jsx'
import '../../styles/map-b225.css'
import '../../styles/map-return-offers.css'
import { INITIAL_VIEWPORT, MapContainer } from '../map-engine/MapContainer.jsx'
import { announceMapReady } from '../search/mapHandoff.js'
import { DESTINATION_VIEWPORTS } from './constants/map.constants.js'
import { listingMatchesMapFilters } from './mapListingFilters.js'
import { panToKeepMarkerAbovePopup, parseMapSurfaceViewport, uncoveredMapBottom } from './mapPopupCamera.js'
import { MapOfferPopup } from './MapOfferPopup.jsx'
import { MapOfferSheet } from './MapOfferSheet.jsx'
import { MapSearchFilters } from './MapSearchFilters.jsx'

const MAP_MOTION_PROGRESS_LIMIT = 0.72
const MAP_GESTURE_SETTLE_MS = 500
const GRAND_TUNIS_LOCATIONS = Object.freeze(['La Marsa', 'Sidi Bou Saïd', 'Gammarth', 'Carthage', 'Tunis'])

function formatMapPrice(listing) {
  const source = `${listing.priceTotal || listing.priceLabel || ''}`
  const match = source.match(/(\d[\d\s]*)\s*TND/i)
  if (match) return `${match[1].replace(/\s/g, '')} TND`
  const rate = listing.nightlyRate ?? listing.price
  if (rate != null && Number.isFinite(Number(rate))) return `${Number(rate)} ${listing.currency || 'TND'}`
  return 'TND'
}

function listingMatchesPropertyFilter(listing, filterId) {
  if (!filterId || filterId === 'all') return true
  const title = String(listing?.title || '').toLowerCase()
  const category = String(listing?.category || '').toLowerCase()
  const type = String(listing?.capacity?.type || '').toLowerCase()
  const haystack = `${title} ${category} ${type}`
  if (filterId === 'apartment') return category.includes('family') || haystack.includes('appartement') || haystack.includes('loft')
  if (filterId === 'villa') return category.includes('prestige') || haystack.includes('villa')
  if (filterId === 'hotel') return category.includes('hotel') || haystack.includes('hôtel') || haystack.includes('hotel') || haystack.includes('palace')
  if (filterId === 'guesthouse') return category.includes('guesthouse') || haystack.includes("maison d'hôte") || haystack.includes('maison d’hôte')
  if (filterId === 'beach') return category.includes('beach') || haystack.includes('plage')
  if (filterId === 'house') return !category.includes('guesthouse') && (haystack.includes('maison') || haystack.includes('dar') || haystack.includes('riad'))
  return true
}

function buildListingMarkers(listings) {
  return listings.map((listing) => {
    const position = getListingMapPosition(listing.id) || (Number.isFinite(Number(listing.latitude)) && Number.isFinite(Number(listing.longitude)) ? { lat: Number(listing.latitude), lng: Number(listing.longitude) } : null)
    if (!position) return null
    return { id: listing.id, label: listing.title, price: formatMapPrice(listing), ...position }
  }).filter(Boolean)
}

const COLLECTION_ROUTE_BY_CATEGORY = Object.freeze({ beach: '/plage', guesthouse: '/maison-d-hote', hotel: '/hotel', family: '/appartement', prestige: '/villa' })
const DESTINATION_LISTING_LOCATIONS = Object.freeze({ 'la-marsa': ['La Marsa'], 'sidi-bou-said': ['Sidi Bou Saïd'], gammarth: ['Gammarth'], carthage: ['Carthage'], tunis: ['Tunis'], hammamet: ['Hammamet'], sousse: ['Sousse'], djerba: ['Djerba'], tozeur: ['Tozeur'] })
const DESTINATION_LABELS = Object.freeze({ 'la-marsa': 'La Marsa', 'sidi-bou-said': 'Sidi Bou Saïd', gammarth: 'Gammarth', carthage: 'Carthage', hammamet: 'Hammamet', tunis: 'Tunis', sousse: 'Sousse', djerba: 'Djerba', tozeur: 'Tozeur', tabarka: 'Tabarka', nabeul: 'Nabeul', bizerte: 'Bizerte' })

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
  const listing = getGuestListingById(listingId)
  if (!listing) return '/'
  const categories = String(listing.category || '').split(' ')
  const category = categories.find((item) => COLLECTION_ROUTE_BY_CATEGORY[item])
  return category ? COLLECTION_ROUTE_BY_CATEGORY[category] : '/'
}

function listingsForMapContext(allOffers, requestedDestination, requestedListing) {
  if (requestedDestination) {
    const locations = DESTINATION_LISTING_LOCATIONS[requestedDestination]
    if (!locations) return []
    return allOffers.filter((listing) => locations.includes(listing.location))
  }
  if (requestedListing) {
    const selected = allOffers.find((listing) => listing.id === requestedListing)
    if (!selected) return []
    return allOffers.filter((listing) => listing.location === selected.location)
  }
  return allOffers.filter((listing) => GRAND_TUNIS_LOCATIONS.includes(listing.location))
}

export function MapPage({ onNavigate }) {
  const searchString = window.location.search
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString])
  const requestedDestination = searchParams.get('destination')
  const requestedListing = searchParams.get('listing')
  const mapContextKey = requestedDestination || requestedListing || searchString || 'grand-tunis'
  const [allOffers, setAllOffers] = useState(() => listUniqueHomeOffers())
  const listingMarkers = useMemo(() => buildListingMarkers(allOffers), [allOffers])
  const selectedMarker = requestedListing ? listingMarkers.find((marker) => marker.id === requestedListing) || null : null
  const handoffViewport = useMemo(() => viewportFromSearch(searchParams), [searchParams])
  const destinationViewport = requestedDestination ? DESTINATION_VIEWPORTS[requestedDestination] || null : null
  const listingViewport = useMemo(() => selectedMarker ? { lat: selectedMarker.lat, lng: selectedMarker.lng, zoom: 13.5 } : null, [selectedMarker])
  const initialViewport = handoffViewport || listingViewport || destinationViewport || INITIAL_VIEWPORT

  const headerRef = useRef(null)
  const mapInteractionRef = useRef(false)
  const mapAutoCameraBlockedUntilRef = useRef(0)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [selectionState, setSelectionState] = useState(() => ({ contextKey: mapContextKey, id: selectedMarker?.id || null }))
  const [viewportState, setViewportState] = useState(() => ({ contextKey: mapContextKey, command: null }))
  const [amenityFilters, setAmenityFilters] = useState(() => new Set())
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [mapInteracting, setMapInteracting] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const selectedListingId = selectionState.contextKey === mapContextKey ? selectionState.id : selectedMarker?.id || null
  const viewportCommand = viewportState.contextKey === mapContextKey ? viewportState.command : null

  useEffect(() => {
    const sync = () => setAllOffers(listUniqueHomeOffers())
    window.addEventListener(HOST_PROFILE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(HOST_PROFILE_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return undefined
    const measure = () => { const nextHeight = header.getBoundingClientRect().height; setHeaderHeight((current) => Math.abs(current - nextHeight) < 0.5 ? current : nextHeight) }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  const setSelectedListingId = useCallback((id) => { setSelectionState({ contextKey: mapContextKey, id }) }, [mapContextKey])
  const issueViewportCommand = useCallback((command) => { setViewportState({ contextKey: mapContextKey, command: { ...command, revision: performance.now() } }) }, [mapContextKey])
  const handleMapInteractionChange = useCallback((active) => {
    const next = Boolean(active)
    mapInteractionRef.current = next
    mapAutoCameraBlockedUntilRef.current = next ? Number.POSITIVE_INFINITY : performance.now() + MAP_GESTURE_SETTLE_MS
    setMapInteracting(next)
  }, [])

  const contextListings = useMemo(() => listingsForMapContext(allOffers, requestedDestination, requestedListing), [allOffers, requestedDestination, requestedListing])
  const cityListings = useMemo(() => contextListings.filter((listing) => listingMatchesPropertyFilter(listing, propertyFilter) && listingMatchesMapFilters(listing, amenityFilters)), [contextListings, propertyFilter, amenityFilters])
  const visibleMarkers = useMemo(() => { const ids = new Set(cityListings.map((listing) => listing.id)); return listingMarkers.filter((marker) => ids.has(marker.id)) }, [cityListings, listingMarkers])

  const cityLabel = requestedDestination ? DESTINATION_LABELS[requestedDestination] || 'Cette destination' : requestedListing ? allOffers.find((listing) => listing.id === requestedListing)?.location || 'Cette ville' : 'Grand Tunis'

  const toggleAmenityFilter = useCallback((amenityId) => { setAmenityFilters((current) => { const next = new Set(current); if (next.has(amenityId)) next.delete(amenityId); else next.add(amenityId); return next }) }, [])
  const handlePropertyFilterChange = useCallback((filterId) => { setPropertyFilter(filterId); setSelectedListingId(null); setPopupOpen(false) }, [setSelectedListingId])
  const resetFilters = useCallback(() => { setAmenityFilters(new Set()) }, [])

  useEffect(() => { setPopupOpen(false); setPropertyFilter('all') }, [mapContextKey])
  useEffect(() => { if (!selectedListingId) return; if (cityListings.some((listing) => listing.id === selectedListingId)) return; setSelectedListingId(null); setPopupOpen(false) }, [cityListings, selectedListingId, setSelectedListingId])

  const returnToOffers = () => {
    if (!requestedListing) return
    if (window.history.length > 1) { window.history.back(); return }
    onNavigate(collectionFallbackPath(requestedListing))
  }

  const handleSheetProgress = useCallback((progress) => {
    const autoCameraBlocked = mapInteractionRef.current || performance.now() < mapAutoCameraBlockedUntilRef.current
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
    issueViewportCommand({ lat: marker.lat, lng: marker.lng, zoom: Math.min(17, Math.max(13.6, base.zoom + 1.65)) })
  }, [visibleMarkers, handoffViewport, listingViewport, destinationViewport, setSelectedListingId, issueViewportCommand])

  const handlePinSelectedListingChange = useCallback((listingId) => { setSelectedListingId(listingId); setPopupOpen(Boolean(listingId)) }, [setSelectedListingId])
  const handlePopupListingChange = useCallback((listingId) => { setSelectedListingId(listingId) }, [setSelectedListingId])

  const panSelectedMarkerAbovePopup = useCallback((listingId) => {
    const marker = visibleMarkers.find((item) => item.id === listingId)
    const surface = document.querySelector('.b225-map-page [data-testid="map-surface"]')
    const parsed = parseMapSurfaceViewport(surface)
    if (!marker || !parsed) return
    const { width, height, ...viewport } = parsed
    const size = { width, height }
    const surfaceRect = surface.getBoundingClientRect()
    const popup = document.querySelector('[data-testid="map-offer-popup"]')
    const popupTop = popup ? popup.getBoundingClientRect().top : Number.NaN
    const uncoveredBottom = uncoveredMapBottom({ surfaceTop: surfaceRect.top, surfaceHeight: height, popupTop })
    const next = panToKeepMarkerAbovePopup({ viewport, size, marker, uncoveredBottom })
    if (!next) return
    issueViewportCommand({ lat: next.lat, lng: next.lng, zoom: viewport.zoom })
  }, [visibleMarkers, issueViewportCommand])

  useEffect(() => {
    if (!popupOpen || !selectedListingId) return undefined
    let cancelled = false
    let frame2 = 0
    const frame1 = window.requestAnimationFrame(() => { frame2 = window.requestAnimationFrame(() => { if (!cancelled) panSelectedMarkerAbovePopup(selectedListingId) }) })
    return () => { cancelled = true; window.cancelAnimationFrame(frame1); window.cancelAnimationFrame(frame2) }
  }, [popupOpen, selectedListingId, headerHeight, panSelectedMarkerAbovePopup])

  const handlePopupClose = useCallback(() => { setPopupOpen(false); setSelectedListingId(null) }, [setSelectedListingId])

  useEffect(() => {
    let frame = 0
    let paintFrame = 0
    let finalFrame = 0
    const startedAt = performance.now()
    const maxWaitMs = 260
    const announceAfterPaint = () => { paintFrame = window.requestAnimationFrame(() => { finalFrame = window.requestAnimationFrame(() => announceMapReady()) }) }
    const checkSurface = () => {
      const surface = document.querySelector('.b225-map-page [data-testid="map-surface"]')
      if (!surface) { if (performance.now() - startedAt >= maxWaitMs) announceAfterPaint(); else frame = window.requestAnimationFrame(checkSurface); return }
      const rect = surface.getBoundingClientRect()
      const measuredWidth = Number(surface.dataset.width)
      const measuredHeight = Number(surface.dataset.height)
      const sizeStable = Number.isFinite(measuredWidth) && Number.isFinite(measuredHeight) && Math.abs(measuredWidth - Math.round(rect.width)) <= 1 && Math.abs(measuredHeight - Math.round(rect.height)) <= 1
      if (sizeStable || performance.now() - startedAt >= maxWaitMs) { announceAfterPaint(); return }
      frame = window.requestAnimationFrame(checkSurface)
    }
    frame = window.requestAnimationFrame(checkSurface)
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(paintFrame); window.cancelAnimationFrame(finalFrame) }
  }, [mapContextKey])

  return (
    <section className="b225-map-page" data-testid="page-map" data-destination={requestedDestination || ''} data-listing={selectedMarker?.id || ''} data-handoff-viewport={handoffViewport ? 'true' : 'false'} data-city-offer-count={cityListings.length} data-context-offer-count={contextListings.length} data-amenity-filter-count={amenityFilters.size} data-property-filter={propertyFilter} data-map-interacting={mapInteracting ? 'true' : 'false'} data-offer-popup={popupOpen ? 'open' : 'closed'}>
      <div ref={headerRef} className="b225-map-top"><MapSearchFilters cityLabel={cityLabel} amenityFilters={amenityFilters} compact={popupOpen} onHome={() => onNavigate('/')} onAmenityFilterToggle={toggleAmenityFilter} onResetFilters={resetFilters}/></div>
      <div className="b225-map-stage">
        {requestedListing ? <button type="button" className="b225-map-return b225-map-return--floating" onClick={returnToOffers} aria-label="Retour aux offres"><span className="b225-map-return__icon"><ArrowLeftIcon /></span><span>Retour aux offres</span></button> : null}
        <MapContainer key={`map-${mapContextKey}`} markers={visibleMarkers} selectedListingId={selectedListingId} onSelectedListingChange={handlePinSelectedListingChange} onInteractionChange={handleMapInteractionChange} initialViewport={initialViewport} viewportCommand={viewportCommand} cameraOnSelect="none"/>
      </div>
      {popupOpen && selectedListingId ? <MapOfferPopup listings={cityListings} selectedListingId={selectedListingId} onSelectedListingChange={handlePopupListingChange} onClose={handlePopupClose} onNavigate={onNavigate}/> : null}
      <MapOfferSheet key={`sheet-${mapContextKey}`} listings={cityListings} cityLabel={cityLabel} headerHeight={headerHeight} selectedListingId={selectedListingId} propertyFilter={propertyFilter} onPropertyFilterChange={handlePropertyFilterChange} onSelectedListingChange={handleSheetSelectedListingChange} onProgressChange={handleSheetProgress} onNavigate={onNavigate}/>
    </section>
  )
}
