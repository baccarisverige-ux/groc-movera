import { getListingDetail, listingCatalog } from '../../entities/listing/listingCatalog.js'
import { homeCategoryOffers, homeDestinations } from '../home/data/homeData.js'

const DEFAULT_DATES = '3–4 sept.'
const DEFAULT_AMENITIES = Object.freeze([
  'Wi-Fi',
  'Parking',
  'Climatisation',
  'Cuisine',
  'TV',
  'Jardin',
])

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
  if (
    hay.includes('éxpérience')
    || hay.includes('sunset')
    || hay.includes('table')
    || hay.includes('escapade')
    || hay.includes('sahara')
    || category === 'experience'
  ) {
    return { type: 'Expérience', guests: 2, bedrooms: 0, beds: 0, baths: 0 }
  }
  if (hay.includes('villa') || category === 'prestige') {
    return { type: 'Villa entière', guests: 6, bedrooms: 3, beds: 4, baths: 2 }
  }
  if (hay.includes('hôtel') || hay.includes('hotel') || hay.includes('palace') || category === 'hotel') {
    return { type: 'Chambre d’hôtel', guests: 2, bedrooms: 1, beds: 1, baths: 1 }
  }
  if (hay.includes('appartement') || hay.includes('loft') || category === 'family') {
    return { type: 'Logement entier', guests: 3, bedrooms: 1, beds: 2, baths: 1 }
  }
  if (hay.includes('maison') || hay.includes('dar') || hay.includes('riad') || category === 'guesthouse') {
    return { type: 'Maison entière', guests: 4, bedrooms: 2, beds: 3, baths: 1 }
  }
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
  return `${lead} ${title} se trouve à ${place}, en Tunisie. L’espace est pensé pour un séjour simple et confortable : lumière, calme, et les essentiels du quotidien. Vous êtes proche des lieux de vie, dans une atmosphère Movera, sans chichi.`
}

const PHOTO_LABELS = Object.freeze(['Chambre', 'Séjour', 'Extérieur'])

const GALLERY_EXTRA_POOL = (() => {
  const urls = []
  const seen = new Set()
  const add = (src) => {
    if (typeof src !== 'string' || !src.includes('images.unsplash.com') || seen.has(src)) return
    seen.add(src)
    urls.push(src)
  }
  for (const items of Object.values(homeCategoryOffers)) {
    for (const item of items) add(item.image)
  }
  for (const item of listingCatalog) add(item.image)
  for (const item of homeDestinations) add(item.image)
  return Object.freeze(urls)
})()

function hashString(value) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function extraGallerySources(image, listingId) {
  const pool = GALLERY_EXTRA_POOL.filter((src) => src !== image)
  if (pool.length < 2) return pool.slice()
  const hash = hashString(String(listingId || image))
  const first = pool[hash % pool.length]
  let second = pool[(hash + 5 + (hash % 7)) % pool.length]
  if (second === first) second = pool[(hash + 1) % pool.length]
  return [first, second]
}

function photosFrom(image, listingId) {
  if (!image) return []
  const extras = extraGallerySources(image, listingId)
  return [image, ...extras].map((src, index) => ({
    src,
    label: PHOTO_LABELS[index] || 'Galerie',
  }))
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
  const amenities = detail?.amenities?.length
    ? [...detail.amenities]
    : [...(extras.amenities || DEFAULT_AMENITIES)]
  const capacity = inferCapacity(title, category)
  const subtitle = detail?.subtitle || extras.subtitle || `Séjour à ${location}`
  const nightlyRate = detail?.nightlyRate ?? extras.nightlyRate ?? item.price ?? null
  const currency = detail?.currency || extras.currency || item.currency || 'TND'
  const priceLabel = extras.priceLabel || (nightlyRate != null ? `${nightlyRate} ${currency} / nuit` : '')
  const dates = extras.dates || item.dateLabel || DEFAULT_DATES

  return {
    id: item.id,
    title,
    location,
    image,
    photos: photosFrom(image, item.id),
    rating,
    reviews,
    badge: item.badge || extras.badge || '',
    priceLabel,
    dates,
    amenities,
    host,
    subtitle,
    description: buildDescription(title, location, subtitle),
    availability: detail?.availability || dates,
    nightlyRate,
    currency,
    capacity,
    capacityLine: capacityLine(capacity),
    category,
  }
}

function fromHomeOffer(item, category) {
  return toGuestListing(item, {
    category,
    priceLabel: item.priceTotal,
    dates: item.dateLabel || DEFAULT_DATES,
    host: { name: 'Movera', since: 'Hôte Movera' },
    subtitle: `Séjour à ${item.location}`,
  })
}

function fromCatalog(item) {
  return toGuestListing(item, {
    category: item.category,
    priceLabel: `${item.price} ${item.currency} / nuit`,
    nightlyRate: item.price,
    currency: item.currency,
  })
}

export const guestListingById = (() => {
  const byId = new Map()
  for (const item of listingCatalog) byId.set(item.id, fromCatalog(item))
  for (const [category, items] of Object.entries(homeCategoryOffers)) {
    for (const item of items) byId.set(item.id, fromHomeOffer(item, category))
  }
  return byId
})()

export function getGuestListingById(id) {
  return guestListingById.get(id) || null
}

export function listGuestListingsByIds(ids) {
  return ids.map((id) => guestListingById.get(id)).filter(Boolean)
}

export function listUniqueHomeOffers() {
  const seen = new Set()
  const offers = []
  for (const items of Object.values(homeCategoryOffers)) {
    for (const item of items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const listing = guestListingById.get(item.id)
      if (listing) offers.push(listing)
    }
  }
  return offers
}

export function listHomeOffersByCategory(category) {
  return (homeCategoryOffers[category] || [])
    .map((item) => guestListingById.get(item.id))
    .filter(Boolean)
}
