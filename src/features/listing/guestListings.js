import { findHostProfileByListingId, listActiveHostProfiles, listingCategoryFromType } from '../../entities/host/hostProfileStore.js'
import { getListingDetail, listingCatalog } from '../../entities/listing/listingCatalog.js'
import { listingAmenityLabels } from '../../entities/listing/listingAmenities.js'
import { listingHighlightBadges } from '../../entities/listing/listingHighlights.js'
import { homeCategoryOffers } from '../home/data/homeData.js'

const HOST_PRESENTATION_IMAGES = Object.freeze({
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=90&fm=webp',
  guesthouse: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=90&fm=webp',
  family: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=90&fm=webp',
  prestige: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=90&fm=webp',
})

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function ratingValue(value) {
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number.toFixed(2) : null
}

function categoriesFrom(value) {
  return [...new Set(String(value || '').split(/\s+/).map((item) => item.trim()).filter(Boolean))]
}

function seedPhotos(image) {
  return image ? [{ src: image, label: 'Photo principale' }] : []
}

function priceFromLabel(value) {
  const match = String(value || '').replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/)
  return match ? Number(match[1].replace(',', '.')) : null
}

function capacityLine(capacity) {
  if (!capacity) return ''
  const parts = []
  if (capacity.type) parts.push(capacity.type)
  if (capacity.guests) parts.push(`${capacity.guests} voyageur${capacity.guests > 1 ? 's' : ''}`)
  if (capacity.bedrooms) parts.push(`${capacity.bedrooms} chambre${capacity.bedrooms > 1 ? 's' : ''}`)
  if (capacity.beds) parts.push(`${capacity.beds} lit${capacity.beds > 1 ? 's' : ''}`)
  if (capacity.baths) parts.push(`${capacity.baths} sdb`)
  return parts.join(' · ')
}

function seedCapacity(item, category) {
  const detail = getListingDetail(item.id)
  if (detail?.capacity) return detail.capacity
  const title = String(item.title || '').toLowerCase()
  const categories = categoriesFrom(category)
  if (categories.includes('experience')) return { type: 'Expérience', guests: 2, bedrooms: 0, beds: 0, baths: 0 }
  if (categories.includes('hotel') || title.includes('hôtel') || title.includes('hotel')) return { type: 'Chambre d’hôtel', guests: 2, bedrooms: 1, beds: 1, baths: 1 }
  if (categories.includes('prestige') || title.includes('villa')) return { type: 'Villa entière', guests: 6, bedrooms: 3, beds: 4, baths: 2 }
  if (categories.includes('family') || title.includes('appartement') || title.includes('loft')) return { type: 'Logement entier', guests: 3, bedrooms: 1, beds: 2, baths: 1 }
  if (categories.includes('guesthouse') || title.includes('riad') || title.includes('dar ')) return { type: 'Maison d’hôte', guests: 2, bedrooms: 1, beds: 1, baths: 1 }
  return null
}

function seedListing(item, category = '') {
  const detail = getListingDetail(item.id)
  const categories = categoriesFrom(category || item.category)
  const image = item.image || ''
  const nightlyRate = numberOrNull(detail?.nightlyRate ?? item.price ?? priceFromLabel(item.priceTotal))
  const currency = detail?.currency || item.currency || 'TND'
  const rating = ratingValue(detail?.rating ?? item.rating)
  const capacity = seedCapacity(item, categories.join(' '))
  return {
    id: item.id,
    origin: 'seed',
    ownerUserId: null,
    publicationStatus: 'published',
    dataQuality: detail ? 'seed-catalog' : 'seed-card',
    title: detail?.title || item.title,
    location: item.location || detail?.location?.split(',')[0] || '',
    address: '',
    latitude: null,
    longitude: null,
    image,
    imageIsPlaceholder: false,
    photos: seedPhotos(image),
    rating,
    reviews: Number.isFinite(Number(detail?.reviews)) ? Number(detail.reviews) : null,
    badge: item.badge || '',
    highlights: [],
    highlightBadges: [],
    nightlyRate,
    currency,
    priceLabel: item.priceTotal || (nightlyRate != null ? `${nightlyRate} ${currency} / nuit` : 'Tarif à confirmer'),
    dates: item.dateLabel || '',
    amenities: Array.isArray(detail?.amenities) ? [...detail.amenities] : [],
    host: detail?.host || null,
    subtitle: detail?.subtitle || '',
    description: detail?.description || '',
    availability: detail?.availability || '',
    capacity,
    capacityLine: capacityLine(capacity),
    category: categories.join(' '),
    categories,
    roomTypes: [],
    bookingMode: 'request-first',
    promotions: [],
    stayRules: null,
    safety: null,
  }
}

function guestRoomTypes(roomTypes, currency = 'TND') {
  return (Array.isArray(roomTypes) ? roomTypes : []).map((room) => {
    const capacity = {
      type: 'Chambre',
      guests: Math.max(1, Number(room.guests) || 1),
      bedrooms: 1,
      beds: Math.max(1, Number(room.beds) || 1),
      baths: Math.max(0, Number(room.bathrooms) || 0),
    }
    return {
      id: room.id,
      name: room.name,
      view: room.view || '',
      description: room.description || '',
      surface: Math.max(0, Number(room.surface) || 0),
      guests: capacity.guests,
      beds: capacity.beds,
      bedType: room.bedType || '',
      bathrooms: capacity.baths,
      bathroomType: room.bathroomType === 'shared' ? 'shared' : 'private',
      features: Array.isArray(room.features) ? [...room.features] : [],
      basePrice: Math.max(1, Number(room.basePrice) || 1),
      currency,
      photos: Array.isArray(room.photos)
        ? room.photos.filter(Boolean).map((src, index) => ({ src, label: index === 0 ? room.name : `${room.name} · ${index + 1}` }))
        : [],
      capacity,
      capacityLine: capacityLine(capacity),
    }
  })
}

function hostListing(profile) {
  const source = profile?.listing
  if (!source) return null
  const currency = source.currency || 'TND'
  const roomTypes = guestRoomTypes(source.roomTypes, currency)
  const categorized = roomTypes.length > 1
  const cheapestRoomPrice = roomTypes.length ? Math.min(...roomTypes.map((room) => room.basePrice)) : null
  const nightlyRate = cheapestRoomPrice ?? Math.max(1, Number(source.basePrice) || 1)
  const category = listingCategoryFromType(source.type)
  const categories = categoriesFrom(category)
  const actualPhotoSources = Array.from(new Set([
    ...(Array.isArray(source.photos) ? source.photos : []),
    ...roomTypes.flatMap((room) => room.photos.map((photo) => photo.src)),
  ].filter(Boolean)))
  const actualPhotos = actualPhotoSources.map((src, index) => ({ src, label: index === 0 ? 'Photo principale' : `Photo ${index + 1}` }))
  const presentationImage = actualPhotos[0]?.src || HOST_PRESENTATION_IMAGES[category] || ''
  const primaryRoom = roomTypes[0]
  const capacity = primaryRoom?.capacity || {
    type: source.type || 'Logement',
    guests: Math.max(1, Number(source.guests) || 1),
    bedrooms: Math.max(0, Number(source.bedrooms) || 0),
    beds: Math.max(1, Number(source.beds) || 1),
    baths: Math.max(0, Number(source.bathrooms) || 0),
  }
  const amenities = listingAmenityLabels(source.amenities)
  const highlightBadges = listingHighlightBadges(source.highlights)
  const highlights = highlightBadges.map((item) => item.label)

  return {
    id: source.id,
    origin: 'host',
    ownerUserId: profile.userId,
    publicationStatus: profile.status === 'active' ? 'published' : 'unpublished',
    dataQuality: 'host-authored',
    title: source.name,
    location: source.city,
    address: source.address || '',
    latitude: numberOrNull(source.latitude),
    longitude: numberOrNull(source.longitude),
    image: presentationImage,
    imageIsPlaceholder: actualPhotos.length === 0 && Boolean(presentationImage),
    photos: actualPhotos,
    rating: null,
    reviews: 0,
    badge: highlightBadges[0]?.label || 'Nouveau',
    highlights,
    highlightBadges,
    nightlyRate,
    currency,
    priceLabel: categorized ? `À partir de ${nightlyRate} ${currency} / nuit` : `${nightlyRate} ${currency} / nuit`,
    dates: '',
    amenities,
    host: { name: 'Hôte Movera', since: '', response: '' },
    subtitle: `${source.type} à ${source.city}`,
    description: source.description || '',
    availability: 'Voir les disponibilités',
    capacity,
    capacityLine: capacityLine(capacity),
    category,
    categories,
    roomTypes,
    bookingMode: source.bookingMode === 'instant' ? 'instant' : 'request-first',
    promotions: Array.isArray(source.promotions) ? [...source.promotions] : [],
    stayRules: source.stayRules || null,
    safety: source.safety || null,
  }
}

function buildSeedMap() {
  const byId = new Map()
  for (const item of listingCatalog) byId.set(item.id, seedListing(item, item.category))
  for (const [category, items] of Object.entries(homeCategoryOffers)) {
    for (const item of items) {
      const existing = byId.get(item.id)
      const next = seedListing(item, category)
      byId.set(item.id, existing ? { ...next, ...existing, image: item.image || existing.image, photos: next.photos.length ? next.photos : existing.photos, badge: item.badge || existing.badge, priceLabel: item.priceTotal || existing.priceLabel, category: next.category || existing.category, categories: next.categories.length ? next.categories : existing.categories } : next)
    }
  }
  return byId
}

export const guestListingById = buildSeedMap()

export function getGuestListingById(id) {
  const hostProfile = findHostProfileByListingId(id)
  if (hostProfile) return hostListing(hostProfile)
  return guestListingById.get(id) || null
}

export function listGuestListingsByIds(ids) {
  return (Array.isArray(ids) ? ids : []).map((id) => getGuestListingById(id)).filter(Boolean)
}

export function listPublishedHostGuestListings() {
  return listActiveHostProfiles().map(hostListing).filter((listing) => listing?.publicationStatus === 'published')
}

export function listAllPublishedGuestListings() {
  const hosted = listPublishedHostGuestListings()
  const hostIds = new Set(hosted.map((listing) => listing.id))
  return [...hosted, ...Array.from(guestListingById.values()).filter((listing) => !hostIds.has(listing.id))]
}

export function listUniqueHomeOffers() {
  const seen = new Set()
  const seed = []
  for (const items of Object.values(homeCategoryOffers)) {
    for (const item of items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const listing = guestListingById.get(item.id)
      if (listing) seed.push(listing)
    }
  }
  return seed
}

export function listMapGuestListings() {
  const hosted = listPublishedHostGuestListings()
  const hostIds = new Set(hosted.map((listing) => listing.id))
  return [...hosted, ...listUniqueHomeOffers().filter((listing) => !hostIds.has(listing.id))]
}

export function listHomeOffersByCategory(category) {
  const requested = category || 'all'
  const hosted = listPublishedHostGuestListings().filter((listing) => requested === 'all' || listing.categories.includes(requested))
  const hostIds = new Set(hosted.map((listing) => listing.id))
  const seedIds = requested === 'all'
    ? Array.from(new Set(Object.values(homeCategoryOffers).flat().map((item) => item.id)))
    : (homeCategoryOffers[requested] || []).map((item) => item.id)
  const seed = seedIds.map((id) => guestListingById.get(id)).filter((listing) => listing && !hostIds.has(listing.id))
  return [...hosted, ...seed]
}