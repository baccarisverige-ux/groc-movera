export const LISTING_MAP_POSITIONS = Object.freeze({
  'villa-perle': Object.freeze({ lat: 36.9251, lng: 10.3016 }),
  'maison-bleue': Object.freeze({ lat: 36.8704, lng: 10.3439 }),
  'res-carthage': Object.freeze({ lat: 36.8542, lng: 10.3271 }),
  'villa-emeraude': Object.freeze({ lat: 36.9164, lng: 10.2865 }),
  'loft-cote': Object.freeze({ lat: 36.884, lng: 10.329 }),
  'villa-jasmin': Object.freeze({ lat: 36.8479, lng: 10.3256 }),
  'dar-sidi': Object.freeze({ lat: 36.8679, lng: 10.3407 }),
  'riad-marsa': Object.freeze({ lat: 36.8767, lng: 10.3236 }),
})

export function getListingMapPosition(id) {
  return LISTING_MAP_POSITIONS[id] || null
}
