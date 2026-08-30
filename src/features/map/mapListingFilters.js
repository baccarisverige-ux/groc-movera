import { getGuestListingById } from '../listing/guestListings.js'

export const MAP_AMENITY_FILTERS = Object.freeze([
  { id: 'wifi', label: 'Wi‑Fi' },
  { id: 'pool', label: 'Piscine' },
  { id: 'parking', label: 'Parking' },
  { id: 'ac', label: 'Clim' },
  { id: 'tv', label: 'TV' },
  { id: 'pet', label: 'Animaux' },
])

const PET_FRIENDLY_LISTING_IDS = new Set(['villa-jasmin', 'riad-marsa'])

function foldAmenity(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()
}

function hasAmenity(amenities, needles) {
  const folded = amenities.map(foldAmenity)
  return needles.some((needle) => folded.some((item) => item.includes(needle) || needle.includes(item)))
}

const AMENITY_MATCHERS = Object.freeze({
  wifi: (amenities) => hasAmenity(amenities, ['wifi']),
  pool: (amenities) => hasAmenity(amenities, ['piscine', 'pool']),
  parking: (amenities) => hasAmenity(amenities, ['parking']),
  ac: (amenities) => hasAmenity(amenities, ['climatisation', 'clim']),
  tv: (amenities) => hasAmenity(amenities, ['tv', 'television']),
  pet: (amenities, listingId) => PET_FRIENDLY_LISTING_IDS.has(listingId) || hasAmenity(amenities, ['animaux', 'pets']),
})

export function listingMatchesMapFilters(listing, amenityFilters) {
  if (!amenityFilters?.size) return true

  const amenities = getGuestListingById(listing.id)?.amenities || listing.amenities || []
  for (const amenityId of amenityFilters) {
    const matches = AMENITY_MATCHERS[amenityId]
    if (!matches || !matches(amenities, listing.id)) return false
  }
  return true
}
