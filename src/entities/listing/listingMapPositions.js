import { findHostProfileByListingId } from '../host/hostProfileStore.js'

export const LISTING_MAP_POSITIONS = Object.freeze({
  'villa-perle': Object.freeze({ lat: 36.9251, lng: 10.3016 }),
  'maison-bleue': Object.freeze({ lat: 36.8704, lng: 10.3439 }),
  'res-carthage': Object.freeze({ lat: 36.8542, lng: 10.3271 }),
  'villa-emeraude': Object.freeze({ lat: 36.9164, lng: 10.2865 }),
  'loft-cote': Object.freeze({ lat: 36.884, lng: 10.329 }),
  'villa-jasmin': Object.freeze({ lat: 36.8479, lng: 10.3256 }),
  'dar-sidi': Object.freeze({ lat: 36.8679, lng: 10.3407 }),
  'riad-marsa': Object.freeze({ lat: 36.8767, lng: 10.3236 }),
  'maison-jasmin': Object.freeze({ lat: 36.8789, lng: 10.3247 }),
  'sea-breeze-marsa': Object.freeze({ lat: 36.8816, lng: 10.3284 }),
  'apartment-marsa': Object.freeze({ lat: 36.8754, lng: 10.3209 }),
  'partner-marsa': Object.freeze({ lat: 36.8838, lng: 10.3216 }),
  'dar-sidi-bleu': Object.freeze({ lat: 36.8685, lng: 10.3417 }),
  'sunset-sidi': Object.freeze({ lat: 36.8712, lng: 10.3451 }),
  'gammarth-coast': Object.freeze({ lat: 36.9206, lng: 10.2894 }),
  'apartment-gammarth': Object.freeze({ lat: 36.9174, lng: 10.2936 }),
  'villa-saphir': Object.freeze({ lat: 36.9239, lng: 10.2858 }),
  'riad-carthage': Object.freeze({ lat: 36.8528, lng: 10.3236 }),
  'hotel-carthage': Object.freeze({ lat: 36.8556, lng: 10.3274 }),
  'apartment-carthage': Object.freeze({ lat: 36.8496, lng: 10.3198 }),
  'villa-olivier': Object.freeze({ lat: 36.8579, lng: 10.3204 }),
  'dar-medina': Object.freeze({ lat: 36.8065, lng: 10.1815 }),
  'apartment-lac': Object.freeze({ lat: 36.8318, lng: 10.2214 }),
  'table-tunis': Object.freeze({ lat: 36.7994, lng: 10.1748 }),
  'azure-hammamet': Object.freeze({ lat: 36.4, lng: 10.6167 }),
  'hotel-belledune': Object.freeze({ lat: 36.4041, lng: 10.6228 }),
  'villa-azur': Object.freeze({ lat: 36.3958, lng: 10.6102 }),
  'sea-escape': Object.freeze({ lat: 36.4074, lng: 10.6136 }),
  'partner-hammamet': Object.freeze({ lat: 36.3919, lng: 10.6246 }),
  'hotel-marina': Object.freeze({ lat: 35.8256, lng: 10.6411 }),
  'partner-sousse': Object.freeze({ lat: 35.8298, lng: 10.6364 }),
  'djerba-sand': Object.freeze({ lat: 33.8075, lng: 10.8451 }),
  'hotel-djerba': Object.freeze({ lat: 33.8116, lng: 10.8508 }),
  'villa-djerba': Object.freeze({ lat: 33.8034, lng: 10.8389 }),
  'partner-djerba': Object.freeze({ lat: 33.8149, lng: 10.8416 }),
  'sahara-night': Object.freeze({ lat: 33.9197, lng: 8.1335 }),
})

export function getListingMapPosition(id) {
  const fixed = LISTING_MAP_POSITIONS[id]
  if (fixed) return fixed
  const listing = findHostProfileByListingId(id)?.listing
  const lat = Number(listing?.latitude)
  const lng = Number(listing?.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}
