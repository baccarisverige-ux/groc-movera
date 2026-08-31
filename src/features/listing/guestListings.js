import { findHostProfileByListingId, listActiveHostProfiles } from '../../entities/host/hostProfileStore.js'
import { getListingDetail, listingCatalog } from '../../entities/listing/listingCatalog.js'
import { homeCategoryOffers, homeDestinations } from '../home/data/homeData.js'

const DEFAULT_DATES = '3–4 sept.'
const DEFAULT_AMENITIES = Object.freeze(['Wi-Fi', 'Parking', 'Climatisation', 'Cuisine', 'TV', 'Jardin'])
const HOST_AMENITY_LABELS = Object.freeze({
  wifi: 'Wi-Fi haut débit', parking: 'Parking privé', ac: 'Climatisation', kitchen: 'Cuisine équipée', tv: 'Télévision', pool: 'Piscine', waterfront: 'Bord de mer', 'beach-access': 'Accès plage', outdoor: 'Mobilier de terrasse', gym: 'Espace fitness', workspace: 'Coin bureau', heating: 'Chauffage', 'hot-water': 'Eau chaude', refrigerator: 'Réfrigérateur', washer: 'Lave-linge', dryer: 'Sèche-linge', 'coffee-maker': 'Machine à café', essentials: 'Linge & essentiels',
})

function reviewCountFromRating(rating) {
  const value = Number.parseFloat(rating)
  if (!Number.isFinite(value)) return 32
  const t = Math.min(1, Math.max(0, (value - 4.7) / 0.29))
  return Math.round(24 + t * 24)
}

function formatRating(rating) {
  const value = Number.parseFloat(rating)
  if (!Number.isFinite(value)) return '4.90'
  return value.toFixed(2)
}

function inferCapacity(title = '', category = '') {
  const hay = `${title} ${category}`.toLowerCase()
  if (hay.includes('éxpérience') || hay.includes('sunset') || hay.includes('table') || hay.includes('escapade') || hay.includes('sahara') || category === 'experience') return { type: 'Expérience', guests: 2, bedrooms: 0, beds: 0, baths: 0 }
  if (hay.includes('villa') || category === 'prestige') return { type: 'Villa entière', guests: 6, bedrooms: 3, beds: 4, baths: 2 }
  if (hay.includes('hôtel') || hay.includes('hotel') || hay.includes('palace') || category === 'hotel') return { type: 'Chambre d’hôtel', guests: 2, bedrooms: 1, beds: 1, baths: 1 }
  if (hay.includes('appartement') || hay.includes('loft') || category === 'family') return { type: 'Logement entier', guests: 3, bedrooms: 1, beds: 2, baths: 1 }
  if (hay.includes('maison') || hay.includes('dar') || hay.includes('riad') || category === 'guesthouse') return { type: 'Maison d’hôte', guests: 2, bedrooms: 1, beds: 1, baths: 1 }
  return { type: 'Logement entier', guests: 2, bedrooms: 1, beds: 1, baths: 1 }
}

function capacityLine(capacity) {
  const parts = [capacity.type, `${capacity.guests} voyageur${capacity.guests > 1 ? 's' : ''}`]
  if (capacity.bedrooms) parts.push(`${capacity.bedrooms} chambre${capacity.bedrooms > 1 ? 's' : ''}`)
  if (capacity.beds) parts.push(`${capacity.beds} lit${capacity.beds > 1 ? 's' : ''}`)
  if (capacity.baths) parts.push(`${capacity.baths} sdb`)
  return parts.join(' · ')
}

function buildDescription(title, location, subtitle) {
  const place = location || 'Tunisie'
  const lead = subtitle || `Un logement chaleureux à ${place}.`
  return `${lead} ${title} se trouve à ${place}, en Tunisie. L’espace est pensé pour un séjour simple et confortable : lumière, calme, et les essentiels du quotidien.`
}

const PHOTO_LABELS = Object.freeze(['Chambre', 'Séjour', 'Cuisine', 'Extérieur'])

const GALLERY_EXTRA_POOL = (() => {
  const urls = []
  const seen = new Set()
  const add = (src) => {
    if (typeof src !== 'string' || !src.includes('images.unsplash.com') || seen.has(src)) return
    seen.add(src); urls.push(src)
  }
  for (const items of Object.values(homeCategoryOffers)) for (const item of items) add(item.image)
  for (const item of listingCatalog) add(item.image)
  for (const item of homeDestinations) add(item.image)
  return Object.freeze(urls)
})()

function hashString(value) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}

function extraGallerySources(image, listingId) {
  const pool = GALLERY_EXTRA_POOL.filter((src) => src !== image)
  if (!pool.length) return []
  const hash = hashString(String(listingId || image))
  const picked = []
  const seen = new Set()
  for (let offset = 0; offset < pool.length && picked.length < 3; offset += 1) {
    const index = (hash + offset * 7 + offset * offset) % pool.length
    const src = pool[index]
    if (seen.has(src)) continue
    seen.add(src); picked.push(src)
  }
  return picked
}

function photosFrom(image, listingId) {
  if (!image) return []
  return [image, ...extraGallerySources(image, listingId)].map((src, index) => ({ src, label: PHOTO_LABELS[index] || 'Galerie' }))
}

function publicRoomLots(roomLots, currency = 'TND') {
  return (Array.isArray(roomLots) ? roomLots : []).map((lot) => {
    const guests = Math.max(1, Number(lot.guests) || 2)
    const beds = Math.max(1, Number(lot.beds) || 1)
    const bathrooms = Math.max(0, Number(lot.bathrooms) || 0)
    const capacity = { type: 'Chambre', guests, bedrooms: 1, beds, baths: bathrooms }
    return {
      id: lot.id,
      name: lot.name,
      view: lot.view || '',
      description: lot.description || '',
      sizeM2: Math.max(0, Number(lot.sizeM2) || 0),
      guests,
      beds,
      bathrooms,
      bedType: lot.bedType || '',
      bathroomType: lot.bathroomType === 'shared' ? 'shared' : 'private',
      features: Array.isArray(lot.features) ? [...lot.features] : [],
      basePrice: Math.max(1, Number(lot.basePrice) || 1),
      currency,
      photos: Array.isArray(lot.photos) ? lot.photos.map((src, index) => ({ src, label: index === 0 ? lot.name : `${lot.name} · ${index + 1}` })) : [],
      capacity,
      capacityLine: capacityLine(capacity),
    }
  })
}

function toGuestListing(item, extras = {}) {
  const detail = getListingDetail(item.id)
  const title = item.title
  const location = item.location
  const image = item.image
  const category = extras.category || item.category || ''
  const rating = formatRating(detail?.rating ?? item.rating)
  const reviews = detail?.reviews ?? extras.reviews ?? reviewCountFromRating(rating)
  const host = detail?.host || extras.host || { name: 'Movera', since: 'Hôte Movera' }
  const amenities = detail?.amenities?.length ? [...detail.amenities] : [...(extras.amenities || DEFAULT_AMENITIES)]
  const capacity = inferCapacity(title, category)
  const subtitle = detail?.subtitle || extras.subtitle || `Séjour à ${location}`
  const nightlyRate = detail?.nightlyRate ?? extras.nightlyRate ?? item.price ?? null
  const currency = detail?.currency || extras.currency || item.currency || 'TND'
  const priceLabel = extras.priceLabel || (nightlyRate != null ? `${nightlyRate} ${currency} / nuit` : '')
  const dates = extras.dates || item.dateLabel || DEFAULT_DATES
  const roomLots = extras.roomLots || []

  return {
    id: item.id, title, location, image, photos: photosFrom(image, item.id), rating, reviews,
    badge: item.badge || extras.badge || '', priceLabel, dates, amenities, host, subtitle,
    description: buildDescription(title, location, subtitle), availability: detail?.availability || dates,
    nightlyRate, currency, capacity, capacityLine: capacityLine(capacity), category,
    roomLots,
    roomTypes: roomLots,
    latitude: extras.latitude ?? null,
    longitude: extras.longitude ?? null,
  }
}

function fromHomeOffer(item, category) {
  return toGuestListing(item, { category, priceLabel: item.priceTotal, dates: item.dateLabel || DEFAULT_DATES, host: { name: 'Movera', since: 'Hôte Movera' }, subtitle: `Séjour à ${item.location}` })
}

function fromCatalog(item) {
  return toGuestListing(item, { category: item.category, priceLabel: `${item.price} ${item.currency} / nuit`, nightlyRate: item.price, currency: item.currency })
}

function fromHostProfile(profile, baseListing = null) {
  const source = profile?.listing
  if (!source) return baseListing
  const currency = source.currency || 'TND'
  const roomLots = publicRoomLots(source.roomLots || source.roomTypes, currency)
  const cheapest = roomLots.length ? Math.min(...roomLots.map((lot) => lot.basePrice)) : source.basePrice
  const primaryLot = roomLots[0]
  const imageSources = [...(source.photos || []), ...roomLots.flatMap((lot) => lot.photos.map((photo) => photo.src))]
  const uniqueImages = Array.from(new Set(imageSources.filter(Boolean)))
  const photos = uniqueImages.map((src, index) => ({ src, label: PHOTO_LABELS[index] || 'Chambre' }))
  const image = photos[0]?.src || baseListing?.image || ''
  const category = source.type === 'Hôtel' ? 'hotel' : source.type === "Maison d’hôte" ? 'guesthouse' : baseListing?.category || ''
  const capacity = primaryLot?.capacity || { type: source.type, guests: source.guests, bedrooms: source.bedrooms, beds: source.beds, baths: source.bathrooms }
  const amenities = (source.amenities || []).map((id) => HOST_AMENITY_LABELS[id] || id).filter(Boolean)

  return {
    ...(baseListing || {}),
    id: source.id,
    title: source.name,
    location: source.city,
    image,
    photos: photos.length ? photos : baseListing?.photos || [],
    rating: baseListing?.rating || '4.90',
    reviews: baseListing?.reviews || 0,
    badge: baseListing?.badge || '',
    priceLabel: roomLots.length > 1 ? `À partir de ${cheapest} ${currency} / nuit` : `${cheapest} ${currency} / nuit`,
    dates: baseListing?.dates || DEFAULT_DATES,
    amenities: amenities.length ? amenities : baseListing?.amenities || DEFAULT_AMENITIES,
    host: baseListing?.host || { name: 'Hôte Movera', since: 'Hôte Movera' },
    subtitle: baseListing?.subtitle || `${source.type} à ${source.city}`,
    description: source.description || baseListing?.description || buildDescription(source.name, source.city, ''),
    availability: baseListing?.availability || DEFAULT_DATES,
    nightlyRate: cheapest,
    currency,
    capacity,
    capacityLine: capacityLine(capacity),
    category,
    roomLots,
    roomTypes: roomLots,
    latitude: Number.isFinite(Number(source.latitude)) ? Number(source.latitude) : null,
    longitude: Number.isFinite(Number(source.longitude)) ? Number(source.longitude) : null,
    isMultiRoomPublication: roomLots.length >= 2,
  }
}

export const guestListingById = (() => {
  const byId = new Map()
  for (const item of listingCatalog) byId.set(item.id, fromCatalog(item))
  for (const [category, items] of Object.entries(homeCategoryOffers)) for (const item of items) byId.set(item.id, fromHomeOffer(item, category))
  return byId
})()

export function getGuestListingById(id) {
  const base = guestListingById.get(id) || null
  const profile = findHostProfileByListingId(id)
  return profile ? fromHostProfile(profile, base) : base
}

export function listGuestListingsByIds(ids) {
  return ids.map((id) => getGuestListingById(id)).filter(Boolean)
}

export function listUniqueHomeOffers() {
  const seen = new Set()
  const offers = []
  for (const items of Object.values(homeCategoryOffers)) {
    for (const item of items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const listing = getGuestListingById(item.id)
      if (listing) offers.push(listing)
    }
  }
  for (const profile of listActiveHostProfiles()) {
    const listing = fromHostProfile(profile, guestListingById.get(profile.listing.id) || null)
    if (!listing || seen.has(listing.id)) continue
    seen.add(listing.id)
    offers.push(listing)
  }
  return offers
}

export function listHomeOffersByCategory(category) {
  const staticListings = (homeCategoryOffers[category] || []).map((item) => getGuestListingById(item.id)).filter(Boolean)
  const dynamic = listActiveHostProfiles()
    .map((profile) => fromHostProfile(profile, null))
    .filter((listing) => listing?.category === category)
  const seen = new Set(staticListings.map((listing) => listing.id))
  return [...staticListings, ...dynamic.filter((listing) => !seen.has(listing.id))]
}
