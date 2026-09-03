import { HOTEL_HIGHLIGHT_GROUPS, HOTEL_LISTING_HIGHLIGHTS } from '../../../../../entities/listing/listingHighlights.js'
import { HOTEL_AMENITIES, HOTEL_AMENITY_GROUPS } from '../../../../../entities/listing/listingAmenities.js'
import { COMMON_HOST_AMENITIES, COMMON_HOST_AMENITY_GROUPS, HOST_GUEST_ACCESS } from '../../hostOnboardingModel.js'
import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'
import { HOTEL_OFFER_PRESENTATION } from './hotelOfferVisuals.jsx'

// Keep the hotel form focused on the choices that materially affect a booking.
// The complete catalogue remains available to the other offer flows.
const ESSENTIAL_HOTEL_AMENITY_IDS = new Set([
  'wifi', 'ac', 'heating', 'hot-water', 'essentials', 'tv', 'parking',
  'hotel-minibar', 'hotel-room-safe', 'hotel-soundproofing',
  'hotel-reception-24h', 'hotel-luggage-storage', 'hotel-multilingual-staff',
  'hotel-daily-housekeeping', 'hotel-laundry-service',
  'hotel-restaurant', 'hotel-bar', 'hotel-food-room-service',
  'hotel-outdoor-pool', 'hotel-spa', 'hotel-fitness-24h',
  'hotel-airport-shuttle', 'hotel-elevator', 'hotel-accessible-rooms',
  'hotel-security-24h', 'hotel-smoke-detectors',
])

const ESSENTIAL_HOTEL_HIGHLIGHT_IDS = new Set([
  'breakfast', 'half-board', 'full-board', 'all-inclusive',
  'sea-view', 'beachfront', 'central', 'airport',
  'luxury', 'stylish', 'peaceful', 'eco',
  'spa', 'pool-highlight', 'fitness', 'private-beach',
  'family', 'adults-only', 'business', 'accessible',
])

const hotelAmenities = [...COMMON_HOST_AMENITIES, ...HOTEL_AMENITIES]
  .filter((item) => ESSENTIAL_HOTEL_AMENITY_IDS.has(item.id))
const hotelAmenityGroupIds = new Set(hotelAmenities.map((item) => item.group))
const hotelAmenityGroups = [...COMMON_HOST_AMENITY_GROUPS, ...HOTEL_AMENITY_GROUPS]
  .filter((group) => hotelAmenityGroupIds.has(group.id))

const hotelHighlights = HOTEL_LISTING_HIGHLIGHTS
  .filter((item) => ESSENTIAL_HOTEL_HIGHLIGHT_IDS.has(item.id))
const hotelHighlightGroupIds = new Set(hotelHighlights.map((item) => item.group))
const hotelHighlightGroups = HOTEL_HIGHLIGHT_GROUPS
  .filter((group) => hotelHighlightGroupIds.has(group.id))

export const hotelOfferFlow = createCommonOfferFlow({
  id: 'hotel',
  propertyType: 'Hôtel',
  guestAccess: HOST_GUEST_ACCESS.filter((item) => item.id === 'private' || item.id === 'shared'),
  supportsRoomInventory: true,
  photoPolicy: { min: 5, max: 20, scope: 'room-category' },
  amenityGroups: hotelAmenityGroups,
  amenities: hotelAmenities,
  highlightGroups: hotelHighlightGroups,
  highlights: hotelHighlights,
  minHighlights: 1,
  maxHighlights: Infinity,
  presentation: { ...HOTEL_OFFER_PRESENTATION, propertyIcon: 'building' },
  roomAccessPresentation: {
    title: 'Que réservent vos voyageurs ?',
    intro: 'Pour votre hôtel, choisissez si vous proposez une chambre entière ou une chambre partagée. Vous configurerez ensuite les catégories, quantités et tarifs.',
    contextLabel: 'Configuration professionnelle',
    statusLabel: 'Type confirmé',
    noteTitle: 'Les chambres se configurent ensuite.',
    noteText: 'Nombre de chambres, chambres identiques ou catégories, photos, capacité, disponibilités et tarifs restent gérés séparément.',
    defaultId: 'private',
    options: [
      { id: 'private', label: 'Chambre entière', description: 'Le voyageur réserve une chambre complète qui lui est réservée. Les espaces communs peuvent rester partagés.', badge: 'Recommandé', icon: 'door' },
      { id: 'shared', label: 'Chambre partagée', description: 'Le voyageur réserve un lit ou une place dans une chambre partagée.', icon: 'bunk' },
    ],
  },
  copy: {
    amenitiesTitle: 'Quels équipements et services propose votre établissement ?',
    amenitiesText: 'Sélectionnez uniquement les services essentiels réellement disponibles.',
    highlightsTitle: 'Les points forts de votre hôtel',
    highlightsText: 'Choisissez votre formule de séjour et les principaux atouts de l’établissement.',
    highlightsSummaryTitle: 'Affichage sur votre offre',
    highlightsSummaryText: 'Vous pouvez sélectionner plusieurs points forts. Tous les éléments cochés seront affichés comme badges sur l’offre.',
  },
})
