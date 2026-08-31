import { useEffect, useRef, useState } from 'react'
import { ArrowLeftIcon } from '../../shared/icons/AppIcons.jsx'
import { getListingMapPosition } from '../../entities/listing/listingMapPositions.js'
import { readHostPublicIdentity } from '../../entities/host/hostPublicIdentityStore.js'
import { useFavorites } from '../favorites/favoritesStore.js'
import { getGuestListingById } from './guestListings.js'
import { ListingAvailability } from './ListingAvailability.jsx'
import './listing-detail-page.css'
import './listing-room-category-detail.css'

const TUNIS_CENTER = Object.freeze({ lat: 36.8065, lng: 10.1815 })
const CITY_COORDS = Object.freeze({
  'la marsa': { lat: 36.8789, lng: 10.3247 },
  carthage: { lat: 36.8528, lng: 10.3236 },
  gammarth: { lat: 36.9206, lng: 10.2894 },
  'sidi bou said': { lat: 36.8685, lng: 10.3417 },
  tunis: TUNIS_CENTER,
  hammamet: { lat: 36.4, lng: 10.6167 },
  sousse: { lat: 35.8256, lng: 10.6411 },
  djerba: { lat: 33.8075, lng: 10.8451 },
})

const SEED_KNOW_ITEMS = Object.freeze([
  { id: 'cancellation', title: 'Conditions d’annulation', summary: 'Les conditions exactes sont présentées avant validation.', detail: 'Movera affiche les conditions applicables au séjour avant toute confirmation.', icon: 'cancel' },
  { id: 'rules', title: 'Règles de la maison', summary: 'Les règles finales sont confirmées avant le séjour.', detail: 'Les horaires et règles applicables sont communiqués avant la validation de la réservation.', icon: 'rules' },
  { id: 'safety', title: 'Sécurité', summary: 'Informations utiles communiquées au bon moment.', detail: 'Les informations d’accès et de sécurité propres au lieu sont communiquées au voyageur lorsqu’elles sont disponibles.', icon: 'safety' },
])

function goBack(onNavigate) {
  if (window.history.length > 1) { window.history.back(); return }
  onNavigate('/')
}

function Glyph({ children, size = 24 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}
function ShareGlyph() { return <Glyph size={18}><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></Glyph> }
function HeartGlyph({ filled }) { return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> }
function LockGlyph() { return <Glyph><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/></Glyph> }
function HostQualityGlyph() { return <Glyph><path d="M12 3 4.8 6.4v5.3c0 4.4 3.1 8.4 7.2 9.3 4.1-.9 7.2-4.9 7.2-9.3V6.4Z"/><path d="m9 12 2 2 4-4"/></Glyph> }
function PinGlyph() { return <Glyph size={16}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.3"/></Glyph> }
function ChevronGlyph({ direction = 'right' }) { const path = direction === 'left' ? 'm15 6-6 6 6 6' : direction === 'down' ? 'm6 9 6 6 6-6' : 'm9 6 6 6-6 6'; return <Glyph size={18}><path d={path}/></Glyph> }
function CancelGlyph() { return <Glyph><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></Glyph> }
function RulesGlyph() { return <Glyph><path d="M8 5h11v14H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"/><path d="M11 9h5M11 13h5"/></Glyph> }
function SafetyGlyph() { return <Glyph><path d="M12 3 5 6.5v5c0 4.2 2.9 8 7 8.9 4.1-.9 7-4.7 7-8.9v-5Z"/></Glyph> }
function CheckGlyph() { return <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 9.2 17 19 7"/></svg> }
function CloseGlyph() { return <Glyph size={18}><path d="m6 6 12 12M18 6 6 18"/></Glyph> }

function amenityIcon(name) {
  const key = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase()
  if (key.includes('wifi')) return <Glyph><path d="M5 12.6a10.7 10.7 0 0 1 14 0"/><path d="M8.5 16.1a5.8 5.8 0 0 1 7 0"/><path d="M12 20h.01"/></Glyph>
  if (key.includes('park')) return <Glyph><circle cx="12" cy="12" r="9"/><path d="M9.5 17V7.5H13a3 3 0 0 1 0 6H9.5"/></Glyph>
  if (key.includes('climat') || key.includes('air')) return <Glyph><path d="M12 3v18"/><path d="m7 7 5 5 5-5"/><path d="m7 17 5-5 5 5"/></Glyph>
  if (key.includes('cuisine') || key.includes('petitdejeuner')) return <Glyph><path d="M4 11h16"/><path d="M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/><path d="M8 11v8M16 11v8M5 19h14"/></Glyph>
  if (key.includes('piscine') || key.includes('eau')) return <Glyph><path d="M4 16c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/><path d="M4 12c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/><path d="M8 6h8"/></Glyph>
  if (key.includes('tv') || key.includes('tele')) return <Glyph><rect x="3" y="7" width="18" height="12" rx="2"/><path d="m8 7 4-3 4 3"/></Glyph>
  if (key.includes('balcon') || key.includes('terrasse') || key.includes('patio')) return <Glyph><path d="M4 20V9l8-5 8 5v11"/><path d="M10 20v-6h4v6"/></Glyph>
  return <Glyph><path d="M5 12.5 9.2 17 19 7"/></Glyph>
}

function knowIcon(kind) { if (kind === 'cancel') return <CancelGlyph/>; if (kind === 'rules') return <RulesGlyph/>; return <SafetyGlyph/> }
function hostYears(since) { const match = String(since || '').match(/(20\d{2})/); if (!match) return null; return Math.max(1, new Date().getFullYear() - Number(match[1])) }
function foldKey(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
function listingMapCenter(listing) { const known = getListingMapPosition(listing.id); if (known) return known; const hay = foldKey(listing.location); for (const [city, coords] of Object.entries(CITY_COORDS)) if (hay.includes(city)) return coords; return TUNIS_CENTER }
function osmStaticUrl({ lat, lng }) { return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=13&size=600x360&maptype=mapnik` }
function uniqueSpaceCards(photos) { const cards = []; const seen = new Set(); for (const photo of photos) { if (!photo?.src || seen.has(photo.src)) continue; seen.add(photo.src); cards.push(photo); if (cards.length === 4) break } return cards }
function spaceDetail(photo, listing, index) {
  if (listing.origin === 'host') {
    const capacity = listing.capacity || {}
    return [capacity.guests ? `${capacity.guests} voyageur${capacity.guests > 1 ? 's' : ''}` : '', capacity.beds ? `${capacity.beds} lit${capacity.beds > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') || 'Photo fournie par l’hôte'
  }
  const label = foldKey(photo?.label); const capacity = listing.capacity || {}; const amenities = Array.isArray(listing.amenities) ? listing.amenities : []
  if (label.includes('chambre') || index === 0) { const bedrooms = capacity.bedrooms ? `${capacity.bedrooms} chambre${capacity.bedrooms > 1 ? 's' : ''}` : 'Espace nuit'; const beds = capacity.beds ? `${capacity.beds} lit${capacity.beds > 1 ? 's' : ''}` : ''; return [bedrooms, beds].filter(Boolean).join(' · ') }
  return amenities[index] || 'Photo du lieu'
}
function categoryMeta(room) {
  const parts = []
  if (room.surface) parts.push(`${room.surface} m²`)
  parts.push(`${room.guests} voyageur${room.guests > 1 ? 's' : ''}`)
  parts.push(`${room.beds} lit${room.beds > 1 ? 's' : ''}${room.bedType ? ` · ${room.bedType}` : ''}`)
  if (room.bathrooms) parts.push(`${room.bathrooms} sdb ${room.bathroomType === 'shared' ? 'partagée' : 'privée'}`)
  return parts.join(' · ')
}
function hostKnowItems(listing) {
  if (listing.origin !== 'host') return SEED_KNOW_ITEMS
  const rules = listing.stayRules || {}
  const safety = listing.safety || {}
  const rulesDetail = [
    `Séjour : ${rules.minNights || 1} nuit${(rules.minNights || 1) > 1 ? 's' : ''} minimum${rules.maxNights ? `, ${rules.maxNights} maximum` : ''}.`,
    `Animaux ${rules.petsAllowed ? 'autorisés' : 'non autorisés'}.`,
    `Fumeurs ${rules.smokingAllowed ? 'autorisés' : 'non autorisés'}.`,
    `Événements ${rules.eventsAllowed ? 'autorisés' : 'non autorisés'}.`,
  ].join(' ')
  const safetyItems = []
  if (safety.smokeAlarm) safetyItems.push('détecteur de fumée déclaré')
  if (safety.carbonMonoxideAlarm) safetyItems.push('détecteur de monoxyde de carbone déclaré')
  if (safety.exteriorCamera) safetyItems.push('caméra extérieure déclarée')
  if (safety.noiseMonitor) safetyItems.push('détecteur de niveau sonore déclaré')
  if (safety.weapons) safetyItems.push('présence d’armes déclarée')
  return [
    { id: 'cancellation', title: 'Conditions d’annulation', summary: 'Les conditions applicables sont présentées avant confirmation.', detail: 'Aucune condition d’annulation spécifique n’est inventée à partir de l’annonce. Les conditions de la réservation sont présentées avant validation.', icon: 'cancel' },
    { id: 'rules', title: 'Règles de la maison', summary: `Arrivée dès ${rules.checkInFrom || '15:00'} · Départ avant ${rules.checkOutUntil || '11:00'}`, detail: rulesDetail, icon: 'rules' },
    { id: 'safety', title: 'Sécurité', summary: safetyItems.length ? `${safetyItems.length} information${safetyItems.length > 1 ? 's' : ''} déclarée${safetyItems.length > 1 ? 's' : ''}` : 'Aucun dispositif spécifique déclaré dans cette annonce.', detail: safetyItems.length ? safetyItems.join(' · ') : 'L’hôte n’a activé aucun des dispositifs de sécurité proposés dans le formulaire de publication.', icon: 'safety' },
  ]
}

async function shareListing(title) {
  const url = window.location.href
  try { if (typeof navigator.share === 'function') { await navigator.share({ title, url }); return 'shared' } } catch (error) { if (error?.name === 'AbortError') return 'aborted' }
  try { await navigator.clipboard.writeText(url); return 'copied' } catch { return 'failed' }
}
function OverlayButton({ label, onClick, children, pressed, className = '' }) {
  return <button type="button" className={`listing-detail-orb ${className}`.trim()} aria-label={label} aria-pressed={typeof pressed === 'boolean' ? pressed : undefined} onClick={onClick}>{children}</button>
}

export function ListingDetailPage({ params, onNavigate }) {
  const listing = getGuestListingById(params?.id)
  const roomTypes = Array.isArray(listing?.roomTypes) ? listing.roomTypes : []
  const queryRoomTypeId = new URLSearchParams(window.location.search).get('roomType') || ''
  const initialRoomTypeId = roomTypes.some((room) => room.id === queryRoomTypeId) ? queryRoomTypeId : roomTypes[0]?.id || ''
  const { favoriteIds, toggleFavorite } = useFavorites()
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(initialRoomTypeId)
  const [descOpen, setDescOpen] = useState(false)
  const [amenitiesOpen, setAmenitiesOpen] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [knowOpen, setKnowOpen] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [shareHint, setShareHint] = useState('')
  const [photoIndex, setPhotoIndex] = useState(0)
  const galleryTouchX = useRef(null)
  const favorite = listing ? favoriteIds.includes(listing.id) : false

  useEffect(() => {
    if (!roomTypes.length) return
    setSelectedRoomTypeId((current) => roomTypes.some((room) => room.id === current) ? current : roomTypes[0].id)
  }, [listing?.id])

  if (!listing) {
    return <div className="listing-detail-page" data-testid="page-listing-missing"><header className="listing-detail-missing-top"><OverlayButton label="Retour" onClick={() => goBack(onNavigate)}><ArrowLeftIcon/></OverlayButton></header><section className="listing-detail-empty"><span className="listing-detail-eyebrow">Movera Host</span><h1>Logement introuvable</h1><p>Cette adresse n’est plus disponible dans Movera.</p><button type="button" onClick={() => onNavigate('/')}>Retour à l’accueil</button></section></div>
  }

  const categorized = roomTypes.length > 1
  const selectedRoom = roomTypes.find((room) => room.id === selectedRoomTypeId) || roomTypes[0] || null
  const activePhotos = selectedRoom?.photos?.length ? selectedRoom.photos : listing.photos?.length ? listing.photos : listing.image ? [{ src: listing.image, label: listing.imageIsPlaceholder ? 'Visuel de catégorie' : 'Photo principale' }] : []
  const activeCapacity = selectedRoom?.capacity || listing.capacity
  const activeCapacityLine = selectedRoom?.capacityLine || listing.capacityLine
  const activeDescription = categorized && selectedRoom?.description ? selectedRoom.description : listing.description
  const activeNightlyRate = selectedRoom?.basePrice || listing.nightlyRate
  const activePriceLabel = categorized && selectedRoom ? `${selectedRoom.basePrice} ${listing.currency} / nuit` : listing.priceLabel
  const activeListing = { ...listing, capacity: activeCapacity, capacityLine: activeCapacityLine }
  const safePhotoIndex = activePhotos.length ? Math.min(photoIndex, activePhotos.length - 1) : 0
  const heroPhoto = activePhotos[safePhotoIndex]?.src || listing.image
  const heroPhotoLabel = activePhotos[safePhotoIndex]?.label || listing.title
  const photoTotal = Math.max(activePhotos.length, 1)
  const visibleAmenities = amenitiesOpen ? listing.amenities : listing.amenities.slice(0, 5)
  const publicIdentity = listing.ownerUserId ? readHostPublicIdentity(listing.ownerUserId) : null
  const hostName = publicIdentity?.displayName || listing.host?.name || 'Hôte Movera'
  const years = hostYears(publicIdentity?.since || listing.host?.since)
  const hostInitial = hostName.trim().charAt(0).toUpperCase() || 'M'
  const spaceCards = listing.imageIsPlaceholder ? [] : uniqueSpaceCards(activePhotos)
  const mapCenter = listingMapCenter(listing)
  const mapUrl = osmStaticUrl(mapCenter)
  const knowItems = hostKnowItems(listing)
  const hasRating = Number.isFinite(Number(listing.rating)) && Number(listing.rating) > 0 && Number(listing.reviews) > 0

  const selectRoom = (roomId) => {
    setSelectedRoomTypeId(roomId)
    setPhotoIndex(0)
    setDescOpen(false)
    setReserveOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.set('roomType', roomId)
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }
  const nextPhoto = () => { if (activePhotos.length < 2) return; setPhotoIndex((index) => (index + 1) % activePhotos.length) }
  const previousPhoto = () => { if (activePhotos.length < 2) return; setPhotoIndex((index) => (index - 1 + activePhotos.length) % activePhotos.length) }
  const onGalleryTouchStart = (event) => { galleryTouchX.current = event.touches?.[0]?.clientX ?? null }
  const onGalleryTouchEnd = (event) => { const startX = galleryTouchX.current; galleryTouchX.current = null; const endX = event.changedTouches?.[0]?.clientX; if (!Number.isFinite(startX) || !Number.isFinite(endX)) return; const delta = endX - startX; if (Math.abs(delta) < 36) return; if (delta < 0) nextPhoto(); else previousPhoto() }
  const onShare = async () => { const result = await shareListing(listing.title); if (result === 'aborted') return; setShareHint(result === 'copied' ? 'Lien copié' : result === 'shared' ? 'Partagé' : 'Partage indisponible'); window.setTimeout(() => setShareHint(''), 1800) }
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const showAvailability = () => { setReserveOpen(false); window.setTimeout(() => scrollTo('listing-availability'), 80) }

  return (
    <div className="listing-detail-page" data-testid="page-listing" data-listing-id={listing.id} data-origin={listing.origin} data-room-category={categorized ? selectedRoom?.id || '' : ''}>
      <div className="listing-detail-hero" onTouchStart={onGalleryTouchStart} onTouchEnd={onGalleryTouchEnd}>
        {heroPhoto ? <img key={heroPhoto} src={heroPhoto} alt={`${listing.title} — ${heroPhotoLabel}`} /> : <div className="listing-detail-hero-fallback" aria-hidden="true"/>}
        <div className="listing-detail-hero-shade" aria-hidden="true"/>
        <div className="listing-detail-hero-bar"><OverlayButton label="Retour" onClick={() => goBack(onNavigate)}><ArrowLeftIcon/></OverlayButton><div className="listing-detail-hero-end"><OverlayButton label={shareHint || 'Partager'} onClick={onShare}><ShareGlyph/></OverlayButton><OverlayButton label={`${favorite ? 'Retirer' : 'Ajouter'} ${listing.title} ${favorite ? 'des' : 'aux'} favoris`} pressed={favorite} onClick={() => toggleFavorite(listing.id)}><span className={favorite ? 'listing-detail-heart is-on' : 'listing-detail-heart'}><HeartGlyph filled={favorite}/></span></OverlayButton></div></div>
        <div className="listing-detail-gallery-meta">{activePhotos.length > 1 ? <span className="listing-detail-gallery-dots" aria-hidden="true">{activePhotos.map((photo, index) => <i key={`${photo.src}-${index}`} data-active={index === safePhotoIndex ? 'true' : 'false'}/>)}</span> : null}<span className="listing-detail-counter">{activePhotos.length ? safePhotoIndex + 1 : 0}/{photoTotal}</span></div>
      </div>

      <div className="listing-detail-sheet">
        <section className="listing-detail-intro">
          <div className="listing-detail-kicker"><span>Movera Host</span>{listing.badge ? <b>{listing.badge}</b> : null}</div>
          <h1>{listing.title}</h1><p className="listing-detail-place">{listing.location}, Tunisie</p>{activeCapacityLine ? <p className="listing-detail-capacity">{activeCapacityLine}</p> : null}
          <p className="listing-detail-rating-row">{hasRating ? <><span>★ {listing.rating}</span><span className="listing-detail-dot">·</span><button type="button" className="listing-detail-reviews-link" onClick={() => scrollTo('listing-reviews')}>{listing.reviews} avis</button></> : <button type="button" className="listing-detail-reviews-link" onClick={() => scrollTo('listing-reviews')}>Nouvelle annonce · aucun avis</button>}</p>
        </section>

        {categorized ? <section className="listing-detail-room-category" aria-labelledby="listing-room-category-title"><div className="listing-detail-room-category__head"><span id="listing-room-category-title">Catégories de chambres</span><small>Comparez les caractéristiques, photos et tarifs fournis pour chaque catégorie.</small></div><div className="listing-detail-room-category__rail" role="radiogroup" aria-label="Catégorie de chambre">{roomTypes.map((room) => <button type="button" role="radio" aria-checked={room.id === selectedRoom?.id} data-active={room.id === selectedRoom?.id ? 'true' : 'false'} key={room.id} onClick={() => selectRoom(room.id)}><strong>{room.name}</strong>{room.view ? <span>{room.view}</span> : null}<small>{categoryMeta(room)}</small><b>{room.basePrice} {listing.currency}<em>/ nuit</em></b></button>)}</div>{selectedRoom ? <div className="listing-detail-room-category__selected"><div><strong>{selectedRoom.name}</strong>{selectedRoom.view ? <span>{selectedRoom.view}</span> : null}</div><p>{categoryMeta(selectedRoom)}</p>{selectedRoom.features?.length ? <div className="listing-detail-room-category__features">{selectedRoom.features.map((feature) => <span key={feature}>{feature}</span>)}</div> : null}</div> : null}</section> : null}

        <div className="listing-detail-host-row"><div><strong>{activeCapacity?.type || listing.subtitle || 'Logement'}</strong><span>Hôte : {hostName}</span></div><span className="listing-detail-avatar" aria-hidden="true">{hostInitial}</span></div>
        <ul className="listing-detail-highlights"><li><span className="listing-detail-ico"><LockGlyph/></span><div><strong>Informations d’arrivée</strong><span>{listing.origin === 'host' ? `Arrivée dès ${listing.stayRules?.checkInFrom || '15:00'} · départ avant ${listing.stayRules?.checkOutUntil || '11:00'}.` : 'Les instructions d’accès sont confirmées avant le séjour.'}</span></div></li><li><span className="listing-detail-ico"><HostQualityGlyph/></span><div><strong>{listing.origin === 'host' ? 'Annonce publiée par l’hôte' : 'Annonce Movera'}</strong><span>{listing.origin === 'host' ? 'Les caractéristiques affichées proviennent des informations enregistrées par cet hôte.' : (listing.host?.response || 'Les informations disponibles dans le catalogue sont affichées sans ajout de faits non fournis.')}</span></div></li></ul>

        <section className="listing-detail-block listing-detail-description"><p className={descOpen ? 'listing-detail-copy' : 'listing-detail-copy is-clamped'}>{activeDescription || 'Description non renseignée.'}</p>{activeDescription?.length > 180 ? <button type="button" className="listing-detail-more" aria-expanded={descOpen} onClick={() => setDescOpen((open) => !open)}>{descOpen ? 'Réduire' : 'Lire la suite'}</button> : null}</section>

        {spaceCards.length ? <section className="listing-detail-block"><h2>{categorized && selectedRoom ? `Photos · ${selectedRoom.name}` : 'Photos du logement'}</h2><div className={spaceCards.length === 1 ? 'listing-detail-sleep is-single' : 'listing-detail-sleep'}>{spaceCards.map((photo, index) => <article className="listing-detail-sleep-card" key={photo.label || photo.src}><img src={photo.src} alt={`${listing.title} — ${photo.label || `Photo ${index + 1}`}`} loading="lazy" decoding="async"/><strong>{photo.label || `Photo ${index + 1}`}</strong><span>{spaceDetail(photo, activeListing, index)}</span></article>)}</div></section> : listing.imageIsPlaceholder ? <section className="listing-detail-block"><h2>Photos du logement</h2><p className="listing-detail-copy">L’hôte n’a pas encore fourni de photo exploitable pour cette annonce. Le visuel supérieur sert uniquement à représenter la catégorie.</p></section> : null}

        <section className="listing-detail-block"><h2>Ce que propose ce lieu</h2>{visibleAmenities.length ? <ul className="listing-detail-amenities">{visibleAmenities.map((name) => <li key={name}><span className="listing-detail-ico">{amenityIcon(name)}</span><span>{name}</span></li>)}</ul> : <p className="listing-detail-copy">Aucun équipement supplémentaire n’a été renseigné pour cette annonce.</p>}{listing.amenities.length > 5 ? <button type="button" className="listing-detail-more" aria-expanded={amenitiesOpen} onClick={() => setAmenitiesOpen((open) => !open)}>{amenitiesOpen ? 'Réduire' : `Voir les ${listing.amenities.length} équipements`}</button> : null}</section>

        <section className="listing-detail-block"><h2>Où vous serez</h2><p className="listing-detail-copy listing-detail-location-copy"><PinGlyph/>{listing.location}, Tunisie</p><button type="button" className="listing-detail-map" onClick={() => onNavigate(`/map?listing=${encodeURIComponent(listing.id)}`)} aria-label={`Voir ${listing.title} sur la carte`}><span className="listing-detail-map-frame"><img src={mapUrl} alt="" width="600" height="360" loading="lazy" decoding="async"/><span className="listing-detail-map-pin" aria-hidden="true"><PinGlyph/></span><span className="listing-detail-map-cta">Voir sur la carte</span></span></button></section>

        <section className="listing-detail-block" id="listing-reviews"><h2>Avis des voyageurs</h2>{hasRating ? <><div className="listing-detail-review-score"><strong>★ {listing.rating}</strong><span>{listing.reviews} avis</span></div><p className="listing-detail-copy">Note et volume d’avis enregistrés pour cette annonce.</p>{reviewsOpen ? <div className="listing-detail-review-panel"><div><span>Note globale</span><strong>{listing.rating}/5</strong></div><div><span>Avis disponibles</span><strong>{listing.reviews}</strong></div><p>Aucun commentaire individuel n’est inventé lorsque la source n’en fournit pas.</p></div> : null}<button type="button" className="listing-detail-more" aria-expanded={reviewsOpen} onClick={() => setReviewsOpen((open) => !open)}>{reviewsOpen ? 'Masquer le résumé' : 'Voir le résumé des avis'}</button></> : <><div className="listing-detail-review-score"><strong>Nouveau</strong><span>0 avis</span></div><p className="listing-detail-copy">Cette annonce n’a pas encore reçu d’avis voyageur. Aucune note n’est générée par défaut.</p></>}</section>

        <section className="listing-detail-host-wrap"><h2>Votre hôte</h2><article className="listing-detail-host-card"><div className="listing-detail-host-identity"><span className="listing-detail-avatar listing-detail-avatar--lg" aria-hidden="true">{hostInitial}<span className="listing-detail-host-check"><CheckGlyph/></span></span><strong>{hostName}</strong><span>Hôte Movera</span></div>{hasRating || years ? <dl>{hasRating ? <><div><dd>{listing.reviews}</dd><dt>Avis</dt></div><div><dd>{listing.rating}</dd><dt>Note</dt></div></> : null}{years ? <div><dd>{years}</dd><dt>Années</dt></div> : null}</dl> : null}</article></section>

        <ListingAvailability listingId={listing.id} basePrice={activeNightlyRate} currency={listing.currency} selectedRoomTypeId={selectedRoom?.id || ''} onRoomTypeChange={categorized ? selectRoom : undefined} />

        <section className="listing-detail-block listing-detail-know-block"><h2>À savoir</h2><ul className="listing-detail-know">{knowItems.map((item) => { const open = knowOpen === item.id; return <li key={item.id}><button type="button" className="listing-detail-know-row" aria-expanded={open} onClick={() => setKnowOpen((current) => current === item.id ? '' : item.id)}><span className="listing-detail-ico">{knowIcon(item.icon)}</span><span className="listing-detail-know-copy"><strong>{item.title}</strong><span>{item.summary}</span></span><span className={open ? 'listing-detail-row-chevron is-open' : 'listing-detail-row-chevron'}><ChevronGlyph direction="down"/></span></button>{open ? <div className="listing-detail-know-detail">{item.detail}</div> : null}</li> })}</ul></section>
      </div>

      <footer className="listing-detail-footer"><div className="listing-detail-footer-price"><strong>{activePriceLabel || 'Tarif à confirmer'}</strong><span>{categorized && selectedRoom ? selectedRoom.name : 'Selon le calendrier de l’hôte'}</span></div><button type="button" className="listing-detail-reserve" onClick={() => setReserveOpen(true)}>Réserver</button></footer>

      {reserveOpen ? <div className="listing-detail-modal" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setReserveOpen(false) }}><section className="listing-detail-reserve-sheet" role="dialog" aria-modal="true" aria-labelledby="listing-reserve-title"><div className="listing-detail-reserve-head"><div><span className="listing-detail-eyebrow">Movera Host</span><h2 id="listing-reserve-title">Préparer votre réservation</h2></div><OverlayButton label="Fermer" onClick={() => setReserveOpen(false)}><CloseGlyph/></OverlayButton></div><div className="listing-detail-reserve-summary"><div><span>Logement</span><strong>{listing.title}</strong></div>{categorized && selectedRoom ? <div><span>Catégorie</span><strong>{selectedRoom.name}</strong></div> : null}<div><span>Dates</span><strong>À choisir selon le calendrier de l’hôte</strong></div><div><span>Voyageurs</span><strong>{activeCapacity?.guests ? `${activeCapacity.guests} max.` : 'À confirmer'}</strong></div><div><span>Tarif affiché</span><strong>{activePriceLabel || 'À confirmer'}</strong></div></div><p className="listing-detail-reserve-note">Aucun paiement n’est lancé à cette étape. Disponibilités, tarif et règles viennent des données reliées à cette annonce.</p><button type="button" className="listing-detail-reserve-primary" onClick={showAvailability}>Voir les disponibilités de l’hôte</button><button type="button" className="listing-detail-reserve-secondary" onClick={() => setReserveOpen(false)}>Continuer à explorer</button></section></div> : null}
      {shareHint ? <p className="listing-detail-toast" role="status">{shareHint}</p> : null}
    </div>
  )
}
