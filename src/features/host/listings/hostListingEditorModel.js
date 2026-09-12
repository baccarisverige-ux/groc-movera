import { COMMON_HOST_AMENITIES } from '../onboarding/hostOnboardingModel.js'
import { getOfferFlow } from '../onboarding/offer-flows/offerFlowRegistry.js'

/* The listing editor, as data.

   Every row on the editor screen is a card: a label, the value as the host
   would read it, and the editor that opens when they tap it. Describing them
   here rather than in JSX means the "is this filled in?" question has exactly
   one answer, shared by the card, the completeness meter and the tests --
   the alternative was three places deciding separately what "complete" means,
   which is how a screen ends up claiming 100% while a card reads "À ajouter".

   Pure module: no React, no storage. It reads a listing and returns a
   description of the screen. */

export const LISTING_EDITOR_TABS = Object.freeze([
  { id: 'space', label: 'Votre logement' },
  { id: 'arrival', label: 'Guide d’arrivée' },
])

export const CANCELLATION_POLICIES = Object.freeze([
  { id: 'flexible', label: 'Flexible', detail: 'Remboursement intégral jusqu’à 24 h avant l’arrivée.' },
  { id: 'moderate', label: 'Modérée', detail: 'Remboursement intégral jusqu’à 5 jours avant l’arrivée.' },
  { id: 'strict', label: 'Stricte', detail: 'Remboursement intégral dans les 48 h suivant la réservation, si l’arrivée est à plus de 14 jours.' },
])

export const LISTING_STATUSES = Object.freeze([
  { id: 'listed', label: 'Publiée', detail: 'Visible par les voyageurs et réservable.' },
  { id: 'unlisted', label: 'Masquée', detail: 'Retirée de la recherche. Les réservations déjà confirmées restent valables.' },
])

const EMPTY = 'À ajouter'

function countPhotos(listing) {
  const direct = Array.isArray(listing?.photos) ? listing.photos.filter(Boolean).length : 0
  const rooms = (listing?.roomTypes || []).reduce((total, room) => total + (Array.isArray(room.photos) ? room.photos.filter(Boolean).length : 0), 0)
  return direct + rooms
}

export function listingCoverPhoto(listing) {
  const direct = Array.isArray(listing?.photos) ? listing.photos.find(Boolean) : ''
  if (direct) return direct
  for (const room of listing?.roomTypes || []) {
    const photo = Array.isArray(room.photos) ? room.photos.find(Boolean) : ''
    if (photo) return photo
  }
  return ''
}

export function listingGallery(listing) {
  const direct = Array.isArray(listing?.photos) ? listing.photos.filter(Boolean) : []
  const rooms = (listing?.roomTypes || []).flatMap((room) => (Array.isArray(room.photos) ? room.photos.filter(Boolean) : []))
  return [...direct, ...rooms]
}

/* "2 chambres · 2 lits · 1 salle de bain" — the line under Photo tour. */
export function sleepingSummary(listing) {
  const bedrooms = Math.max(0, Number(listing?.bedrooms) || 0)
  const beds = Math.max(0, Number(listing?.beds) || 0)
  const baths = Math.max(0, Number(listing?.bathrooms) || 0)
  return [
    `${bedrooms} chambre${bedrooms > 1 ? 's' : ''}`,
    `${beds} lit${beds > 1 ? 's' : ''}`,
    `${baths} salle${baths > 1 ? 's' : ''} de bain`,
  ].join(' · ')
}

const ACCESS_LABELS = Object.freeze({
  entire: 'Logement entier',
  private: 'Chambre privée',
  shared: 'Chambre partagée',
})

export function propertyTypeSummary(listing) {
  const access = ACCESS_LABELS[listing?.guestAccess] || ACCESS_LABELS.entire
  return `${access} · ${listing?.type || 'Logement'}`
}

export function amenityLabels(listing) {
  const flow = getOfferFlow(listing?.type)
  const catalogue = new Map([...COMMON_HOST_AMENITIES, ...flow.amenities].map((item) => [item.id, item.label]))
  return (listing?.amenities || []).map((id) => catalogue.get(id) || id)
}

function locationSummary(listing) {
  const parts = [listing?.address, listing?.city].map((part) => String(part || '').trim()).filter(Boolean)
  return parts.join(', ')
}

function timeOrEmpty(value) {
  return /^\d{2}:\d{2}$/.test(String(value || '')) ? value : ''
}

/* A card is "done" when a traveller reading the listing would learn something
   from it -- not merely when the field is a non-empty string. A 12-character
   description is a field with text in it and a listing with no description. */
function card(id, label, value, editor, { done = undefined, hint = '' } = {}) {
  const filled = done === undefined ? Boolean(value) : done
  return Object.freeze({
    id,
    label,
    value: filled ? value : EMPTY,
    editor,
    done: filled,
    hint,
  })
}

export function hasRoomInventory(listing) {
  return Array.isArray(listing?.roomTypes) && listing.roomTypes.length > 0
}

function roomsSummary(listing) {
  const rooms = listing?.roomTypes || []
  if (!rooms.length) return ''
  const units = rooms.reduce((total, room) => total + Math.max(1, Number(room.totalUnits) || 1), 0)
  return rooms.length > 1
    ? `${rooms.length} catégories · ${units} chambre${units > 1 ? 's' : ''}`
    : `${units} chambre${units > 1 ? 's' : ''} identique${units > 1 ? 's' : ''}`
}

export function listingSpaceCards(listing) {
  const photos = countPhotos(listing)
  const highlights = Array.isArray(listing?.highlights) ? listing.highlights.length : 0
  const amenities = amenityLabels(listing)
  const description = String(listing?.description || '').trim()
  /* A hôtel or maison d'hôte sells rooms, not a property: the categories, their
     capacities and their per-room prices are the listing for those two. The
     card only exists when the listing actually has an inventory, so a villa is
     not offered a screen that would have nothing to manage. */
  const rooms = hasRoomInventory(listing)
    ? [card('rooms', 'Chambres et catégories', roomsSummary(listing), 'rooms', { done: true })]
    : []
  return Object.freeze([
    card('photos', 'Visite en photos', `${photos} photo${photos > 1 ? 's' : ''}`, 'photos', {
      done: photos > 0,
      hint: sleepingSummary(listing),
    }),
    ...rooms,
    card('title', 'Titre', listing?.name || '', 'title'),
    card('type', 'Type de logement', propertyTypeSummary(listing), 'type', { done: true }),
    card('capacity', 'Voyageurs et couchages', `${Math.max(1, Number(listing?.guests) || 1)} voyageurs · ${sleepingSummary(listing)}`, 'capacity', { done: true }),
    card('amenities', 'Équipements', amenities.length ? `${amenities.length} proposé${amenities.length > 1 ? 's' : ''}` : '', 'amenities', {
      hint: amenities.slice(0, 3).join(' · '),
    }),
    card('description', 'Description', description, 'description', { done: description.length >= 40 }),
    card('highlights', 'Points forts', highlights ? `${highlights} sélectionné${highlights > 1 ? 's' : ''}` : '', 'highlights'),
    card('location', 'Emplacement', locationSummary(listing), 'location'),
  ])
}

export function listingArrivalCards(listing) {
  const rules = listing?.stayRules || {}
  const guide = listing?.arrivalGuide || {}
  const checkIn = timeOrEmpty(rules.checkInFrom)
  const checkOut = timeOrEmpty(rules.checkOutUntil)
  const instructions = String(guide.instructions || '').trim()
  const wifiName = String(guide.wifiName || '').trim()
  const houseRules = [
    rules.petsAllowed ? 'Animaux acceptés' : 'Animaux non acceptés',
    rules.smokingAllowed ? 'Fumeurs acceptés' : 'Non-fumeur',
    rules.eventsAllowed ? 'Événements autorisés' : 'Pas d’événement',
  ].join(' · ')
  return Object.freeze([
    card('checkin', 'Arrivée et départ', checkIn && checkOut ? `${checkIn} → ${checkOut}` : '', 'checkin'),
    card('instructions', 'Instructions d’arrivée', instructions, 'instructions', { done: instructions.length >= 20 }),
    card('wifi', 'Wi-Fi', wifiName, 'wifi'),
    card('rules', 'Règlement intérieur', houseRules, 'rules', { done: true }),
  ])
}

export function listingEditorCards(listing, tab) {
  return tab === 'arrival' ? listingArrivalCards(listing) : listingSpaceCards(listing)
}

/* The meter counts every card on both tabs, so it answers the question the
   host is actually asking -- "what is left to fill in?" -- rather than
   scoring a hand-picked subset that can read 100% with empty cards on screen. */
export function listingEditorProgress(listing) {
  const cards = [...listingSpaceCards(listing), ...listingArrivalCards(listing)]
  const done = cards.filter((item) => item.done).length
  return { done, total: cards.length, percent: Math.round((done / cards.length) * 100) }
}

export function listingStatus(listing) {
  return listing?.status === 'unlisted' ? 'unlisted' : 'listed'
}

export function listingStatusLabel(listing) {
  return LISTING_STATUSES.find((item) => item.id === listingStatus(listing))?.label || 'Publiée'
}

/* Airbnb's second line: "Home in La Marsa, Tunis Governorate". */
export function listingSubtitle(listing) {
  const access = ACCESS_LABELS[listing?.guestAccess] || ACCESS_LABELS.entire
  const where = [listing?.city, 'Tunisie'].filter(Boolean).join(', ')
  return `${access} · ${listing?.type || 'Logement'} à ${where}`
}

/* Price bounds for Smart Pricing. A max below the min is not a preference,
   it is a range that can never be satisfied, so it is corrected rather than
   stored -- the calendar reads these to clamp a nightly price. */
export function normalizePricingBounds({ min, max, base }) {
  const fallback = Math.max(1, Math.round(Number(base) || 0) || 1)
  const low = Math.max(1, Math.round(Number(min) || 0) || Math.round(fallback * 0.7))
  const high = Math.max(low, Math.round(Number(max) || 0) || Math.round(fallback * 1.6))
  return { min: low, max: high }
}

export function clampNightlyPrice(price, bounds) {
  const value = Math.round(Number(price) || 0)
  if (!bounds || !Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) return Math.max(0, value)
  return Math.min(bounds.max, Math.max(bounds.min, value))
}
