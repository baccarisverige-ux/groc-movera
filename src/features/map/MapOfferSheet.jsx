import { useEffect, useRef, useState } from 'react'
import { OptimizedListingImage } from '../../shared/media/OptimizedListingImage.jsx'
import { ListingHighlightBadges } from '../../shared/listing/ListingHighlightBadges.jsx'
import { MotionList, MotionListItem } from '../../shared/motion/MotionList.jsx'
import { motion, useTransform } from '../../shared/motion/runtime.js'
import { MapOfferSheetMotionSurface } from './motion/MapOfferSheetMotionSurface.jsx'
import { MAP_OFFER_ITEM_MOTION } from './motion/mapOfferSheetMotion.config.js'
import { useMapOfferScrollSheetHandoff } from './motion/useMapOfferScrollSheetHandoff.js'
import './map-offer-sheet.css'
import './map-room-categories.css'
import '../../styles/map-offer-sheet-premium.css'

const COLLAPSED_PANEL_VISIBLE_PX = 74
const TOP_BAR_SEAM_OVERLAP_PX = 2
const ATTACHED_ENTER_PROGRESS = 0.995
const ATTACHED_EXIT_PROGRESS = 0.92
const TOP_HANDLE_TOUCH_THRESHOLD_PX = 2
const IDLE_HINT_INTERVAL_MS = 12000
const IDLE_HINT_DURATION_MS = 720

const MAP_PROPERTY_FILTERS = Object.freeze([
  { id: 'all', label: 'Tout' },
  { id: 'apartment', label: 'Appartement' },
  { id: 'beach', label: 'Plage' },
  { id: 'hotel', label: 'Hôtel' },
  { id: 'guesthouse', label: "Maison d’hôte" },
  { id: 'villa', label: 'Villa' },
])

function useStableAttached(progress) {
  const [attached, setAttached] = useState(() => progress >= ATTACHED_ENTER_PROGRESS)
  useEffect(() => { setAttached((current) => current ? progress > ATTACHED_EXIT_PROGRESS : progress >= ATTACHED_ENTER_PROGRESS) }, [progress])
  return attached
}
function ChevronIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5" /></svg> }
function StarIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7L6.8 19l1-5.8-4.2-4.1 5.8-.8L12 3Z" /></svg> }
function listingPriceCopy(listing) { if (listing.priceLabel) return listing.priceLabel; if (listing.priceTotal) return listing.priceTotal; if (listing.nightlyRate != null) return `${listing.nightlyRate} ${listing.currency || 'TND'}`; if (listing.price != null) return `${listing.price} ${listing.currency || 'TND'}`; return '' }
function roomPhoto(room, fallback) { return room?.photos?.[0]?.src || fallback }

function MapOfferSheetContent({ listings, cityLabel, headerHeight, selectedListingId, propertyFilter, onPropertyFilterChange, onSelectedListingChange, onNavigate, progress, progressMotion, startDrag, toggleExpanded, externalDrag }) {
  const attached = useStableAttached(progress)
  const listRef = useMapOfferScrollSheetHandoff({ expanded: attached, externalDrag })
  const dragZoneRef = useRef(null)
  const propertyDockRef = useRef(null)
  const externalDragRef = useRef(externalDrag)
  const progressRef = useRef(progress)
  const idleHintResetRef = useRef(null)
  const [idleHintActive, setIdleHintActive] = useState(false)
  const [roomSelection, setRoomSelection] = useState({})
  const safeHeaderHeight = Math.max(0, headerHeight || 0)
  const panelOffsetY = useTransform(progressMotion, (latest) => {
    const bounded = Math.max(0, Math.min(1, latest))
    const softened = bounded * bounded * (3 - 2 * bounded)
    return -safeHeaderHeight * softened
  })
  const displayedListings = listings

  useEffect(() => { externalDragRef.current = externalDrag }, [externalDrag])
  useEffect(() => { progressRef.current = progress; if (progress > 0.03) setIdleHintActive(false) }, [progress])
  useEffect(() => {
    const intervalId = window.setInterval(() => { if (document.hidden || progressRef.current > 0.03) return; window.clearTimeout(idleHintResetRef.current); setIdleHintActive(true); idleHintResetRef.current = window.setTimeout(() => setIdleHintActive(false), IDLE_HINT_DURATION_MS) }, IDLE_HINT_INTERVAL_MS)
    return () => { window.clearInterval(intervalId); window.clearTimeout(idleHintResetRef.current) }
  }, [])
  useEffect(() => {
    const nodes = [dragZoneRef.current, propertyDockRef.current].filter(Boolean)
    if (!nodes.length) return undefined
    const cleanups = nodes.map((node) => {
      let gesture = null
      const onTouchStart = (event) => {
        if (event.touches.length !== 1) return
        const touch = event.touches[0]
        gesture = Number.isFinite(touch?.clientY) ? { startClientX: touch.clientX, startClientY: touch.clientY, active: false, horizontal: false } : null
      }
      const onTouchMove = (event) => {
        const touch = event.touches?.[0]
        const clientY = touch?.clientY
        if (!gesture || !Number.isFinite(clientY)) return
        const deltaX = Math.abs((touch?.clientX ?? gesture.startClientX) - gesture.startClientX)
        const deltaY = Math.abs(clientY - gesture.startClientY)
        if (!gesture.active) {
          if (gesture.horizontal) return
          if (node === propertyDockRef.current && deltaX > deltaY) { gesture.horizontal = true; return }
          if (deltaY < TOP_HANDLE_TOUCH_THRESHOLD_PX) return
          const started = externalDragRef.current?.start(gesture.startClientY)
          if (!started) { gesture = null; return }
          gesture.active = true
        }
        if (event.cancelable) event.preventDefault()
        event.stopPropagation()
        externalDragRef.current?.move(clientY)
      }
      const finishTouch = (cancel = false) => {
        if (gesture?.active) {
          if (cancel) externalDragRef.current?.cancel()
          else externalDragRef.current?.end()
        }
        gesture = null
      }
      const onTouchEnd = () => finishTouch(false)
      const onTouchCancel = () => finishTouch(true)
      node.addEventListener('touchstart', onTouchStart, { passive: true })
      node.addEventListener('touchmove', onTouchMove, { passive: false })
      node.addEventListener('touchend', onTouchEnd, { passive: true })
      node.addEventListener('touchcancel', onTouchCancel, { passive: true })
      return () => {
        node.removeEventListener('touchstart', onTouchStart)
        node.removeEventListener('touchmove', onTouchMove)
        node.removeEventListener('touchend', onTouchEnd)
        node.removeEventListener('touchcancel', onTouchCancel)
      }
    })
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [])

  const openListing = (listing) => {
    onSelectedListingChange?.(listing.id)
    const categories = Array.isArray(listing.roomTypes) ? listing.roomTypes : []
    const roomId = roomSelection[listing.id] || categories[0]?.id || ''
    onNavigate?.(`/listing/${listing.id}${categories.length > 1 && roomId ? `?roomType=${encodeURIComponent(roomId)}` : ''}`)
  }
  const chooseRoom = (event, listingId, roomId) => { event.preventDefault(); event.stopPropagation(); setRoomSelection((state) => ({ ...state, [listingId]: roomId })) }

  return <>
    <div className="map-offer-sheet__header-spacer" aria-hidden="true" data-testid="map-offer-sheet-header-spacer" data-attachment-state={attached ? 'attached' : 'moving'} style={{ height: `${safeHeaderHeight}px` }}/>
    <motion.div className="map-offer-sheet__panel" data-attachment-state={attached ? 'attached' : 'moving'} data-idle-hint={idleHintActive ? 'true' : 'false'} style={{ y: panelOffsetY, marginBottom: -safeHeaderHeight }}>
      <div ref={dragZoneRef} className="map-offer-sheet__drag-zone" data-testid="map-offer-sheet-handle" data-attachment-state={attached ? 'attached' : 'moving'} data-header-offset={Math.round(safeHeaderHeight)} onPointerDown={(event) => { if (event.pointerType !== 'touch') startDrag(event) }}>
        <button type="button" className="map-offer-sheet__handle-button" onClick={toggleExpanded} aria-label={progress > 0.72 ? 'Réduire la liste des offres' : 'Afficher la liste des offres'}><span className="map-offer-sheet__grabber"/><span className="map-offer-sheet__heading"><strong>{displayedListings.length ? `${displayedListings.length} offre${displayedListings.length > 1 ? 's' : ''}` : 'Aucune offre'}</strong><span className="map-offer-sheet__city-label">{cityLabel}</span><span className="map-offer-sheet__brand-badge">Movera Host</span></span><span className="map-offer-sheet__chevron" data-open={progress > 0.72 ? 'true' : 'false'}><ChevronIcon/></span></button>
      </div>
      <div ref={propertyDockRef} className="map-offer-sheet__property-dock" data-testid="map-sheet-property-filters" aria-label="Type de logement"><div className="map-offer-sheet__property-rail">{MAP_PROPERTY_FILTERS.map((filter) => { const active = propertyFilter === filter.id; return <button key={filter.id} type="button" className="map-offer-sheet__property-chip" data-property-filter={filter.id} data-active={active ? 'true' : 'false'} aria-pressed={active} onClick={() => onPropertyFilterChange?.(filter.id)}><span>{filter.label}</span></button> })}</div></div>
      {displayedListings.length ? <MotionList nodeRef={listRef} className="map-offer-sheet__list" data-scroll-enabled={attached ? 'true' : 'false'} data-motion-list="map-offers" data-map-scroll="independent" data-sheet-handoff="drag-from-offer"><div className="map-offer-sheet__list-content" data-testid="map-offer-sheet-list-content">{displayedListings.map((listing, index) => {
        const selected = listing.id === selectedListingId || (!selectedListingId && index === 0 && progress > 0.12)
        const categories = Array.isArray(listing.roomTypes) ? listing.roomTypes : []
        const categorized = categories.length > 1
        const activeRoom = categories.find((room) => room.id === roomSelection[listing.id]) || categories[0] || null
        const image = categorized && activeRoom ? roomPhoto(activeRoom, listing.image) : listing.image
        const price = categorized && activeRoom ? `${activeRoom.basePrice} ${listing.currency || 'TND'} / nuit` : listingPriceCopy(listing)
        return <MotionListItem as="button" type="button" key={listing.id} index={index} active={selected} config={MAP_OFFER_ITEM_MOTION} className="map-offer-sheet__card" data-listing-id={listing.id} data-active={selected ? 'true' : 'false'} onClick={() => openListing(listing)}><span className="map-offer-sheet__media"><OptimizedListingImage src={image} alt="" loading={index < 2 ? 'eager' : 'lazy'} sizes="(max-width:430px) 144px, 180px" />{listing.badge && !listing.highlightBadges?.length ? <span className="map-offer-sheet__badge">{listing.badge}</span> : null}<span className="map-offer-sheet__position" aria-hidden="true">{index + 1}/{displayedListings.length}</span></span><span className="map-offer-sheet__card-copy"><span className="map-offer-sheet__card-head"><span><strong>{listing.title}</strong><small>{listing.location}, Tunisie</small></span><span className="map-offer-sheet__rating"><StarIcon/>{listing.rating}</span></span><ListingHighlightBadges badges={listing.highlightBadges} variant="map"/>{categorized ? <span className="map-offer-sheet__room-categories"><em>{categories.length} catégories</em><span>{categories.map((room) => <span role="button" tabIndex="0" key={room.id} data-active={room.id === activeRoom?.id ? 'true' : 'false'} onClick={(event) => chooseRoom(event, listing.id, room.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') chooseRoom(event, listing.id, room.id) }}>{room.name}<b>{room.basePrice}</b></span>)}</span></span> : null}<span className="map-offer-sheet__price"><b>{price}</b></span></span></MotionListItem>
      })}</div></MotionList> : <div className="map-offer-sheet__empty"><div className="map-offer-sheet__empty-content"><strong>Aucune offre Movera dans cette ville</strong><span>La carte reste disponible pour explorer la zone.</span></div></div>}
    </motion.div>
  </>
}

export function MapOfferSheet({ listings, cityLabel, headerHeight = 0, selectedListingId, propertyFilter = 'all', onPropertyFilterChange, onSelectedListingChange, onProgressChange, onNavigate, hidden = false }) {
  const safeHeaderHeight = Math.max(0, (headerHeight || 0) - TOP_BAR_SEAM_OVERLAP_PX)
  return <MapOfferSheetMotionSurface className={`map-offer-sheet${hidden ? ' map-offer-sheet--popup-hidden' : ''}`} ariaLabel={`Offres ${cityLabel}`} collapsedVisiblePx={COLLAPSED_PANEL_VISIBLE_PX + safeHeaderHeight} onProgressChange={onProgressChange}>{({ progress, progressMotion, startDrag, toggleExpanded, externalDrag }) => <MapOfferSheetContent listings={listings} cityLabel={cityLabel} headerHeight={safeHeaderHeight} selectedListingId={selectedListingId} propertyFilter={propertyFilter} onPropertyFilterChange={onPropertyFilterChange} onSelectedListingChange={onSelectedListingChange} onNavigate={onNavigate} progress={progress} progressMotion={progressMotion} startDrag={startDrag} toggleExpanded={toggleExpanded} externalDrag={externalDrag}/>}</MapOfferSheetMotionSurface>
}
