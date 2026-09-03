import { COMMON_LISTING_HIGHLIGHTS } from '../../../entities/listing/listingHighlights.js'

export const HOST_ONBOARDING_SCREENS = Object.freeze([
  { id: 'intro-place', phase: 1 },
  { id: 'property-type', phase: 1 },
  { id: 'guest-access', phase: 1 },
  { id: 'address', phase: 1 },
  { id: 'pin', phase: 1 },
  { id: 'basics', phase: 1 },
  { id: 'intro-presentation', phase: 2 },
  { id: 'amenities', phase: 2 },
  { id: 'photos', phase: 2 },
  { id: 'title', phase: 2 },
  { id: 'highlights', phase: 2 },
  { id: 'description', phase: 2 },
  { id: 'safety', phase: 2 },
  { id: 'intro-publish', phase: 3 },
  { id: 'booking', phase: 3 },
  { id: 'price', phase: 3 },
  { id: 'promotions', phase: 3 },
  { id: 'review', phase: 3 },
])

export const HOST_PHASES = Object.freeze([
  { id: 1, label: 'Votre logement' },
  { id: 2, label: 'Présentation' },
  { id: 3, label: 'Publication' },
])

export const HOST_PROPERTY_TYPES = Object.freeze([
  'Appartement',
  'Villa',
  "Maison d’hôte",
  'Hôtel',
])

export const HOST_GUEST_ACCESS = Object.freeze([
  { id: 'entire', label: 'Logement entier', description: 'Les voyageurs disposent de tout le logement.' },
  { id: 'private', label: 'Chambre privée', description: 'Les voyageurs ont leur propre chambre et partagent certains espaces.' },
  { id: 'shared', label: 'Chambre partagée', description: 'Les voyageurs dorment dans un espace partagé.' },
])

export const COMMON_HOST_AMENITY_GROUPS = Object.freeze([
  { id: 'essentials', label: 'Les indispensables' },
  { id: 'popular', label: 'Confort apprécié' },
  { id: 'features', label: 'Équipements & services' },
  { id: 'location', label: 'Cadre & emplacement' },
])

export const HOST_AMENITY_GROUPS = COMMON_HOST_AMENITY_GROUPS

export const COMMON_HOST_AMENITIES = Object.freeze([
  { id: 'ac', label: 'Climatisation', group: 'essentials' },
  { id: 'dryer', label: 'Sèche-linge', group: 'essentials' },
  { id: 'essentials', label: 'Linge & essentiels', detail: 'Draps, serviettes, savon et papier', group: 'essentials' },
  { id: 'heating', label: 'Chauffage', group: 'essentials' },
  { id: 'hot-water', label: 'Eau chaude', group: 'essentials' },
  { id: 'kitchen', label: 'Cuisine équipée', group: 'essentials' },
  { id: 'refrigerator', label: 'Réfrigérateur', group: 'essentials' },
  { id: 'tv', label: 'Télévision', group: 'essentials' },
  { id: 'washer', label: 'Lave-linge', group: 'essentials' },
  { id: 'wifi', label: 'Wi-Fi haut débit', group: 'essentials' },
  { id: 'coffee-maker', label: 'Machine à café', group: 'popular' },
  { id: 'cooking-basics', label: 'Ustensiles de cuisine', detail: 'Casseroles, poêles et condiments de base', group: 'popular' },
  { id: 'hair-dryer', label: 'Sèche-cheveux', group: 'popular' },
  { id: 'hangers', label: 'Cintres', group: 'popular' },
  { id: 'iron', label: 'Fer à repasser', group: 'popular' },
  { id: 'shampoo', label: 'Produits douche', group: 'popular' },
  { id: 'crib', label: 'Lit bébé', group: 'features' },
  { id: 'workspace', label: 'Coin bureau', group: 'features' },
  { id: 'ev-charger', label: 'Borne de recharge', group: 'features' },
  { id: 'parking', label: 'Parking privé', group: 'features' },
  { id: 'gym', label: 'Espace fitness', group: 'features' },
  { id: 'hot-tub', label: 'Bain à remous', group: 'features' },
  { id: 'fireplace', label: 'Cheminée intérieure', group: 'features' },
  { id: 'outdoor', label: 'Mobilier de terrasse', group: 'features' },
  { id: 'pool', label: 'Piscine', group: 'features' },
  { id: 'beach-access', label: 'Accès plage', group: 'location' },
  { id: 'waterfront', label: 'Bord de mer', group: 'location' },
])

export const HOST_AMENITIES = COMMON_HOST_AMENITIES
export const COMMON_HOST_HIGHLIGHTS = COMMON_LISTING_HIGHLIGHTS
export const HOST_HIGHLIGHTS = COMMON_HOST_HIGHLIGHTS

export const HOST_PROMOTIONS = Object.freeze([
  { id: 'new-listing', label: 'Promotion nouveau logement', value: 20, detail: 'Pour lancer les premières réservations.' },
  { id: 'last-minute', label: 'Dernière minute', value: 7, detail: 'Pour les réservations proches de l’arrivée.' },
  { id: 'weekly', label: 'Réduction semaine', value: 10, detail: 'Pour les séjours de 7 nuits ou plus.' },
  { id: 'monthly', label: 'Réduction mensuelle', value: 25, detail: 'Pour les séjours de 28 nuits ou plus.' },
])

export const DEFAULT_HOST_ROOM_TYPE = Object.freeze({
  id: 'room-standard',
  name: 'Chambre Standard',
  view: '',
  description: '',
  guests: 2,
  beds: 1,
  bathrooms: 1,
  basePrice: '180',
  totalUnits: 1,
  photos: [],
})

export const DEFAULT_HOST_DRAFT = Object.freeze({
  propertyType: 'Appartement',
  guestAccess: 'entire',
  address: '',
  city: 'La Marsa',
  latitude: null,
  longitude: null,
  pinConfirmed: false,
  guests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  roomTypes: [DEFAULT_HOST_ROOM_TYPE],
  amenities: ['wifi'],
  title: '',
  highlights: [],
  description: '',
  safety: {
    exteriorCamera: false,
    noiseMonitor: false,
    weapons: false,
    smokeAlarm: false,
    carbonMonoxideAlarm: false,
  },
  bookingMode: 'request-first',
  basePrice: '180',
  promotions: ['new-listing'],
  confirmedAuthority: false,
  acceptedRules: false,
})

export function screenPhase(index) {
  return HOST_ONBOARDING_SCREENS[index]?.phase || 1
}

export function screenId(index) {
  return HOST_ONBOARDING_SCREENS[index]?.id || HOST_ONBOARDING_SCREENS[0].id
}

export function phaseProgress(index) {
  const phase = screenPhase(index)
  const phaseScreens = HOST_ONBOARDING_SCREENS.filter((screen) => screen.phase === phase)
  const currentId = screenId(index)
  const position = Math.max(0, phaseScreens.findIndex((screen) => screen.id === currentId))
  return phaseScreens.length <= 1 ? 1 : position / (phaseScreens.length - 1)
}