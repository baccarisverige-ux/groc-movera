import { LISTING_DETAILS } from '../../entities/listing/listingCatalog.js'

export const MAP_AMENITY_FILTERS = Object.freeze([
  { id: 'wifi', label: 'Wi‑Fi' },
  { id: 'pool', label: 'Piscine' },
  { id: 'parking', label: 'Parking' },
  { id: 'ac', label: 'Clim' },
  { id: 'tv', label: 'TV' },
  { id: 'pet', label: 'Animaux' },
])

const PET_FRIENDLY_LISTING_IDS = new Set(['villa-jasmin', 'riad-marsa'])

const AMENITY_MATCHERS = Object.freeze({
  wifi: (amenities) => amenities.includes('Wi‑Fi'),
  pool: (amenities) => amenities.includes('Piscine'),
  parking: (amenities) => amenities.includes('Parking'),
  ac: (amenities) => amenities.includes('Climatisation'),
  tv: (amenities) => amenities.includes('Télévision'),
  pet: (_amenities, listingId) => PET_FRIENDLY_LISTING_IDS.has(listingId),
})

export function listingMatchesMapFilters(listing, amenityFilters) {
  if (!amenityFilters?.size) return true

  const amenities = LISTING_DETAILS[listing.id]?.amenities || []
  for (const amenityId of amenityFilters) {
    const matches = AMENITY_MATCHERS[amenityId]
    if (!matches || !matches(amenities, listing.id)) return false
  }
  return true
}
