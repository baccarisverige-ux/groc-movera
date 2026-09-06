import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { HOST_PROFILE_EVENT } from '../../entities/host/hostProfileStore.js'
import { getListingMapPosition } from '../../entities/listing/listingMapPositions.js'
import { listingMapPrice } from '../../entities/listing/listingPrice.js'
import { getGuestListingById, listMapGuestListings } from '../listing/guestListings.js'
import { ArrowLeftIcon } from '../../shared/icons/AppIcons.jsx'
import '../../styles/map-b225.css'
import '../../styles/map-return-offers.css'
import { MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD } from '../map-sheet/index.js'
import { INITIAL_VIEWPORT, MapContainer } from '../map-engine/MapContainer.jsx'
import { announceMapReady } from '../search/mapHandoff.js'
import { DESTINATION_VIEWPORTS } from './constants/map.constants.js'
import { listingMatchesMapFilters } from './mapListingFilters.js'
import { panToKeepMarkerAbovePopup, panViewportToScreenPoint, parseMapSurfaceViewport, uncoveredMapBottom } from './mapPopupCamera.js'
import { mapCameraContextKey, parseMapSearchContext } from './mapUrlViewport.js'
import { createMapViewportCommand, normalizeMapViewport, viewportCommandForContext } from './mapViewportCommand.js'
import { MapOfferPopup } from './MapOfferPopup.jsx'
import { MapOfferSheet } from './MapOfferSheet.jsx'
import { MapSearchFilters } from './MapSearchFilters.jsx'
import '../../styles/map-page-cleanup.css'

const MAP_GESTURE_SETTLE_MS = 500
const GRAND_TUNIS_LOCATIONS = Object.freeze(['La Marsa', 'Sidi Bou Saïd', 'Gammarth', 'Carthage', 'Tunis'])

function formatSearchDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

function formatSearchDateRange(checkin, checkout) {
  const start = formatSearchDate(checkin)
  const end = formatSearchDate(checkout)
  return start && end ? `${start} – ${end}` : start || end
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
  if (filterId === 'guesthouse') return category.includes('guesthouse') || haystack.includes('maison d') || haystack.includes('dar ') || haystack.includes('riad')
  if (filterId === 'beach') return category.includes('beach') || haystack.includes('plage')
  if (filterId === 'house') return !category.includes('guesthouse') && (haystack.includes('maison') || haystack.includes('dar') || haystack.includes('riad'))
  return true
}

function listingHasDiscount(listing) {
  return Array.isArray(listing?.promotions) && listing.promotions.length > 0
}

const COLLECTION_ROUTE_BY_CATEGORY = Object.freeze({ beach: '/plage', guesthouse: '/maison-d-hote', hotel: '/hotel', family: '/appartement', prestige: '/villa' })
const DESTINATION_LISTING_LOCATIONS = Object.freeze({ 'la-marsa': ['La Marsa'], 'sidi-bou-said': ['Sidi Bou Saïd'], gammarth: ['Gammarth'], carthage: ['Carthage'], tunis: ['Tunis'], hammamet: ['Hammamet'], sousse: ['Sousse'], djerba: ['Djerba'], tozeur: ['Tozeur'] })
const DESTINATION_LABELS = Object.freeze({ 'la-marsa': 'La Marsa', 'sidi-bou-said': 'Sidi Bou Saïd', gammarth: 'Gammarth', carthage: 'Carthage', hammamet: 'Hammamet', tunis: 'Tunis', sousse: 'Sousse', djerba: 'Djerba', tozeur: 'Tozeur', tabarka: 'Tabarka', nabeul: 'Nabeul', bizerte: 'Bizerte' })

function collectionFallbackPath(listingId) { const listing = getGuestListingById(listingId); if (!listing) return '/'; const categories = String(listing.category || '').split(' '); const category = categories.find((item) => COLLECTION_ROUTE_BY_CATEGORY[item]); return category ? COLLECTION_ROUTE_BY_CATEGORY[category] : '/' }
function listingsForMapContext(offers, requestedDestination, requestedListing) {
  if (requestedDestination) { const locations = DESTINATION_LISTING_LOCATIONS[requestedDestination]; if (!locations) return []; return offers.filter((listing) => locations.includes(listing.location)) }
  if (requestedListing) { const selected = offers.find((listing) => listing.id === requestedListing); if (!selected) return []; return offers.filter((listing) => listing.location === selected.location) }
  return offers.filter((listing) => GRAND_TUNIS_LOCATIONS.includes(listing.location))
}

export function MapPage({ onNavigate }) {
  const searchString = window.location.search
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString])
  const searchContext = useMemo(() => parseMapSearchContext(searchParams), [searchParams])
  const requestedDestination = searchContext.destination
  const requestedListing = searchContext.listing
  const searchTriggered = searchContext.searchTriggered
  const requestedPlace = searchContext.place
  const requestedDateLabel = formatSearchDateRange(searchContext.checkin, searchContext.checkout)
  const mapContextKey = useMemo(() => mapCameraContextKey(searchParams), [searchParams])
  const [homeOffers, setHomeOffers] = useState(() => listMapGuestListings())
  const markers = useMemo(() => homeOffers.map((listing) => { const position = getListingMapPosition(listing.id); if (!position) return null; return { id: listing.id, label: listing.title, price: listingMapPrice(listing), ...position } }).filter(Boolean), [homeOffers])
  const selectedMarker = requestedListing ? markers.find((marker) => marker.id === requestedListing) || null : null
  const handoffViewport = searchContext.viewport
  const destinationViewport = requestedDestination ? DESTINATION_VIEWPORTS[requestedDestination] || null : null
  const listingViewport = useMemo(() => selectedMarker ? { lat: selectedMarker.lat, lng: selectedMarker.lng, zoom: 13.5 } : null, [selectedMarker])
  const initialViewport = handoffViewport || listingViewport || destinationViewport || INITIAL_VIEWPORT

  const headerRef = useRef(null)
  const mapInteractionRef = useRef(false)
  const mapAutoCameraBlockedUntilRef = useRef(0)
  const sheetSnapRef = useRef('collapsed')
  const sheetProgressRef = useRef(0)
  const liveViewportRef = useRef(initialViewport)
  const sheetBaseViewportRef = useRef(initialViewport)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [selectionState, setSelectionState] = useState(() => ({ contextKey: mapContextKey, id: selectedMarker?.id || null }))
  const [viewportState, setViewportState] = useState(() => ({ contextKey: mapContextKey, command: null }))
  const [amenityFilters, setAmenityFilters] = useState(() => new Set())
  const [discountOnly, setDiscountOnly] = useState(false)
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [mapInteracting, setMapInteracting] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const selectedListingId = selectionState.contextKey === mapContextKey ? selectionState.id : selectedMarker?.id || null
  const viewportCommand = viewportCommandForContext(viewportState, mapContextKey)

  useEffect(() => {
    liveViewportRef.current = initialViewport
    sheetBaseViewportRef.current = initialViewport
    sheetProgressRef.current = 0
    sheetSnapRef.current = 'collapsed'
  }, [mapContextKey, initialViewport])

  useEffect(() => {
    const sync = () => setHomeOffers(listMapGuestListings())
    window.addEventListener(HOST_PROFILE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(HOST_PROFILE_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return undefined
    const measure = () => { const nextHeight = header.getBoundingClientRect().height; setHeaderHeight((current) => Math.abs(current - nextHeight) < 0.5 ? current : nextHeight) }
    measure(); const observer = new ResizeObserver(measure); observer.observe(header); return () => observer.disconnect()
  }, [])

  const setSelectedListingId = useCallback((id) => { setSelectionState({ contextKey: mapContextKey, id }) }, [mapContextKey])
  const issueViewportCommand = useCallback((viewport) => {
    const command = createMapViewportCommand(viewport)
    if (!command) return
    setViewportState({ contextKey: mapContextKey, command })
  }, [mapContextKey])
  const handleViewportChange = useCallback((nextViewport, meta = {}) => {
    const next = normalizeMapViewport(nextViewport)
    if (!next) return
    liveViewportRef.current = next
    if (sheetProgressRef.current <= 0.015 && meta.source !== 'command') sheetBaseViewportRef.current = next
  }, [])
  const handleMapInteractionChange = useCallback((active) => { const next = Boolean(active); mapInteractionRef.current = next; mapAutoCameraBlockedUntilRef.current = next ? Number.POSITIVE_INFINITY : performance.now() + MAP_GESTURE_SETTLE_MS; setMapInteracting(next) }, [])

  const contextListings = useMemo(() => listingsForMapContext(homeOffers, requestedDestination, requestedListing), [homeOffers, requestedDestination, requestedListing])
  const cityListings = useMemo(() => contextListings.filter((listing) => listingMatchesPropertyFilter(listing, propertyFilter) && listingMatchesMapFilters(listing, amenityFilters) && (!discountOnly || listingHasDiscount(listing))), [contextListings, propertyFilter, amenityFilters, discountOnly])
  const visibleMarkers = useMemo(() => { const ids = new Set(cityListings.map((listing) => listing.id)); return markers.filter((marker) => ids.has(marker.id)) }, [cityListings, markers])
  const cityLabel = requestedPlace || (requestedDestination ? DESTINATION_LABELS[requestedDestination] || 'Cette destination' : requestedListing ? homeOffers.find((listing) => listing.id === requestedListing)?.location || 'Cette ville' : 'Grand Tunis')

  const clearFilterSelection = useCallback(() => { setSelectedListingId(null); setPopupOpen(false) }, [setSelectedListingId])
  const toggleAmenityFilter = useCallback((amenityId) => {
    setAmenityFilters((current) => {
      const next = new Set(current)
      if (next.has(amenityId)) next.delete(amenityId)
      else next.add(amenityId)
      return next
    })
    clearFilterSelection()
  }, [clearFilterSelection])
  const toggleDiscountOnly = useCallback(() => { setDiscountOnly((current) => !current); clearFilterSelection() }, [clearFilterSelection])
  const handlePropertyFilterChange = useCallback((filterId) => { setPropertyFilter(filterId); clearFilterSelection() }, [clearFilterSelection])
  const resetFilters = useCallback(() => { setAmenityFilters(new Set()); setDiscountOnly(false); setPropertyFilter('all') }, [])
  useEffect(() => { resetFilters(); setPopupOpen(false) }, [mapContextKey, resetFilters])
  useEffect(() => { if (!selectedListingId) return; if (cityListings.some((listing) => listing.id === selectedListingId)) return; setSelectedListingId(null); setPopupOpen(false) }, [cityListings, selectedListingId, setSelectedListingId])

  const returnToOffers = () => { if (!requestedListing) return; if (window.history.length > 1) { window.history.back(); return } onNavigate(collectionFallbackPath(requestedListing)) }
  const handleSheetProgress = useCallback((progress) => {
    const boundedProgress = Math.max(0, Math.min(1, progress))
    const easedProgress = boundedProgress * boundedProgress * (3 - 2 * boundedProgress)
    sheetProgressRef.current = boundedProgress

    const header = headerRef.current
    if (header) {
      const fadeProgress = Math.max(0, Math.min(1, (boundedProgress - 0.58) / 0.42))
      const disappearance = fadeProgress * fadeProgress * (3 - 2 * fadeProgress)
      header.style.setProperty('--map-header-disappearance', disappearance.toFixed(4))
      header.style.pointerEvents = disappearance > 0.97 ? 'none' : ''
    }

    if (boundedProgress > 0.14 && !selectedListingId && cityListings[0]) setSelectedListingId(cityListings[0].id)

    const settledSnap = boundedProgress >= MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD ? 'expanded' : boundedProgress <= 0.015 ? 'collapsed' : null
    if (settledSnap) sheetSnapRef.current = settledSnap

    const autoCameraBlocked = mapInteractionRef.current || performance.now() < mapAutoCameraBlockedUntilRef.current
    if (autoCameraBlocked) return

    const base = sheetBaseViewportRef.current || liveViewportRef.current || initialViewport
    const activeId = selectedListingId || cityListings[0]?.id
    const activeMarker = activeId ? visibleMarkers.find((marker) => marker.id === activeId) : null
    const focusStrength = activeMarker ? 0.72 * easedProgress : 0
    const lat = activeMarker ? base.lat + (activeMarker.lat - base.lat) * focusStrength : base.lat
    const lng = activeMarker ? base.lng + (activeMarker.lng - base.lng) * focusStrength : base.lng
    const zoom = Math.min(17, base.zoom + 1.45 * easedProgress)
    issueViewportCommand({ lat, lng, zoom })
  }, [initialViewport, selectedListingId, cityListings, visibleMarkers, setSelectedListingId, issueViewportCommand])

  const handleSheetSelectedListingChange = useCallback((listingId) => {
    setSelectedListingId(listingId)
  }, [setSelectedListingId])
  const focusListingFromSheet = useCallback((listingId) => {
    const marker = visibleMarkers.find((item) => item.id === listingId)
    if (!marker) return
    setSelectedListingId(listingId)
    setPopupOpen(false)
    mapAutoCameraBlockedUntilRef.current = performance.now() + 900

    const surface = document.querySelector('.b225-map-page [data-testid="map-surface"]')
    const parsed = parseMapSurfaceViewport(surface)
    const current = parsed || liveViewportRef.current || initialViewport
    const zoom = Math.min(17, Math.max(13.6, current.zoom + 0.65))
    if (!parsed) {
      issueViewportCommand({ lat: marker.lat, lng: marker.lng, zoom })
      return
    }

    const viewport = { lat: current.lat, lng: current.lng, zoom }
    const size = { width: parsed.width, height: parsed.height }
    const focused = panViewportToScreenPoint(viewport, size, marker, { x: size.width / 2, y: size.height * 0.26 })
    issueViewportCommand(focused)
  }, [visibleMarkers, initialViewport, setSelectedListingId, issueViewportCommand])
  const handlePinSelectedListingChange = useCallback((listingId) => { setSelectedListingId(listingId); setPopupOpen(Boolean(listingId)) }, [setSelectedListingId])
  const handlePopupListingChange = useCallback((listingId) => { setSelectedListingId(listingId) }, [setSelectedListingId])

  const panSelectedMarkerAbovePopup = useCallback((listingId) => {
    const marker = visibleMarkers.find((item) => item.id === listingId); const surface = document.querySelector('.b225-map-page [data-testid="map-surface"]'); const parsed = parseMapSurfaceViewport(surface); if (!marker || !parsed) return
    const { width, height, ...viewport } = parsed; const size = { width, height }; const surfaceRect = surface.getBoundingClientRect(); const popup = document.querySelector('[data-testid="map-offer-popup"]'); const popupTop = popup ? popup.getBoundingClientRect().top : Number.NaN
    const uncoveredBottom = uncoveredMapBottom({ surfaceTop: surfaceRect.top, surfaceHeight: height, popupTop }); const next = panToKeepMarkerAbovePopup({ viewport, size, marker, uncoveredBottom }); if (!next) return; issueViewportCommand({ lat: next.lat, lng: next.lng, zoom: viewport.zoom })
  }, [visibleMarkers, issueViewportCommand])

  useEffect(() => { if (!popupOpen || !selectedListingId) return undefined; let cancelled = false; let frame2 = 0; const frame1 = window.requestAnimationFrame(() => { frame2 = window.requestAnimationFrame(() => { if (!cancelled) panSelectedMarkerAbovePopup(selectedListingId) }) }); return () => { cancelled = true; window.cancelAnimationFrame(frame1); window.cancelAnimationFrame(frame2) } }, [popupOpen, selectedListingId, headerHeight, panSelectedMarkerAbovePopup])
  const handlePopupClose = useCallback(() => { setPopupOpen(false); setSelectedListingId(null) }, [setSelectedListingId])

  useEffect(() => {
    let frame = 0; let paintFrame = 0; let finalFrame = 0; const startedAt = performance.now(); const maxWaitMs = 260
    const announceAfterPaint = () => { paintFrame = window.requestAnimationFrame(() => { finalFrame = window.requestAnimationFrame(() => announceMapReady()) }) }
    const checkSurface = () => { const surface = document.querySelector('.b225-map-page [data-testid="map-surface"]'); if (!surface) { if (performance.now() - startedAt >= maxWaitMs) announceAfterPaint(); else frame = window.requestAnimationFrame(checkSurface); return } const rect = surface.getBoundingClientRect(); const measuredWidth = Number(surface.dataset.width); const measuredHeight = Number(surface.dataset.height); const sizeStable = Number.isFinite(measuredWidth) && Number.isFinite(measuredHeight) && Math.abs(measuredWidth - Math.round(rect.width)) <= 1 && Math.abs(measuredHeight - Math.round(rect.height)) <= 1; if (sizeStable || performance.now() - startedAt >= maxWaitMs) { announceAfterPaint(); return } frame = window.requestAnimationFrame(checkSurface) }
    frame = window.requestAnimationFrame(checkSurface); return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(paintFrame); window.cancelAnimationFrame(finalFrame) }
  }, [mapContextKey])

  return <section className="b225-map-page" data-testid="page-map" data-destination={requestedDestination || ''} data-listing={selectedMarker?.id || ''} data-handoff-viewport={handoffViewport ? 'true' : 'false'} data-city-offer-count={cityListings.length} data-context-offer-count={contextListings.length} data-amenity-filter-count={amenityFilters.size} data-discount-only={discountOnly ? 'true' : 'false'} data-property-filter={propertyFilter} data-map-interacting={mapInteracting ? 'true' : 'false'} data-offer-popup={popupOpen ? 'open' : 'closed'}>
    <div ref={headerRef} className="b225-map-top"><MapSearchFilters cityLabel={cityLabel} primaryLabel={searchTriggered ? cityLabel : undefined} dateLabel={searchTriggered ? requestedDateLabel : ''} amenityFilters={amenityFilters} discountOnly={discountOnly} propertyFilter={propertyFilter} compact={popupOpen} onHome={() => onNavigate('/')} onAmenityFilterToggle={toggleAmenityFilter} onDiscountToggle={toggleDiscountOnly} onResetFilters={resetFilters}/></div>
    <div className="b225-map-stage">{requestedListing ? <button type="button" className="b225-map-return b225-map-return--floating" onClick={returnToOffers} aria-label="Retour aux offres"><span className="b225-map-return__icon"><ArrowLeftIcon/></span><span>Retour aux offres</span></button> : null}<MapContainer key={`map-${mapContextKey}`} markers={visibleMarkers} selectedListingId={selectedListingId} onSelectedListingChange={handlePinSelectedListingChange} onViewportChange={handleViewportChange} onInteractionChange={handleMapInteractionChange} initialViewport={initialViewport} viewportCommand={viewportCommand} cameraOnSelect="none"/></div>
    {popupOpen && selectedListingId ? <MapOfferPopup listings={cityListings} selectedListingId={selectedListingId} onSelectedListingChange={handlePopupListingChange} onClose={handlePopupClose} onNavigate={onNavigate}/> : null}
    <MapOfferSheet key={`sheet-${mapContextKey}`} listings={cityListings} cityLabel={cityLabel} headerHeight={headerHeight} selectedListingId={selectedListingId} propertyFilter={propertyFilter} onPropertyFilterChange={handlePropertyFilterChange} onSelectedListingChange={handleSheetSelectedListingChange} onFocusListing={focusListingFromSheet} onProgressChange={handleSheetProgress} onNavigate={onNavigate}/>
  </section>
}
