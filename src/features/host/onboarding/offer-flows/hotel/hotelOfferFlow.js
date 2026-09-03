import { HOTEL_HIGHLIGHT_GROUPS, HOTEL_LISTING_HIGHLIGHTS } from '../../../../../entities/listing/listingHighlights.js'
import { HOST_GUEST_ACCESS } from '../../hostOnboardingModel.js'
import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'
import { HOTEL_OFFER_PRESENTATION } from './hotelOfferVisuals.jsx'

const HOTEL_AMENITY_GROUPS = Object.freeze([
  { id: 'hotel-essential', label: 'Les essentiels' },
  { id: 'hotel-comfort', label: 'Confort & services' },
])

const HOTEL_AMENITIES = Object.freeze([
  { id: 'wifi', group: 'hotel-essential', label: 'Wi‑Fi', detail: 'Internet haut débit' },
  { id: 'ac', group: 'hotel-essential', label: 'Climatisation', detail: 'Confort dans les chambres' },
  { id: 'parking', group: 'hotel-essential', label: 'Parking', detail: 'Sur place ou privé' },
  { id: 'essentials', group: 'hotel-essential', label: 'Linge & essentiels', detail: 'Draps, serviettes, savon' },
  { id: 'pool', group: 'hotel-comfort', label: 'Piscine', detail: 'Espace détente' },
  { id: 'gym', group: 'hotel-comfort', label: 'Salle de sport', detail: 'Espace fitness' },
  { id: 'workspace', group: 'hotel-comfort', label: 'Espace de travail', detail: 'Bureau ou coworking' },
  { id: 'coffee-maker', group: 'hotel-comfort', label: 'Café & boissons', detail: 'À disposition des voyageurs' },
])

export const hotelOfferFlow = createCommonOfferFlow({
  id: 'hotel',
  propertyType: 'Hôtel',
  guestAccess: HOST_GUEST_ACCESS.filter((item) => item.id === 'private' || item.id === 'shared'),
  supportsRoomInventory: true,
  photoPolicy: { min: 5, max: 20, scope: 'room-category' },
  amenityGroups: HOTEL_AMENITY_GROUPS,
  amenities: HOTEL_AMENITIES,
  highlightGroups: HOTEL_HIGHLIGHT_GROUPS,
  highlights: HOTEL_LISTING_HIGHLIGHTS,
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
    amenitiesTitle: 'Équipements & services',
    amenitiesText: 'Sélectionnez uniquement les principaux équipements réellement disponibles dans votre établissement.',
    highlightsTitle: 'Les points forts de votre hôtel',
    highlightsText: 'Cochez tout ce qui décrit réellement votre établissement. Tous vos choix seront visibles sur l’offre.',
    highlightsSummaryTitle: 'Affichage sur votre offre',
    highlightsSummaryText: 'Vous pouvez sélectionner plusieurs points forts. Tous les éléments cochés seront affichés comme badges sur l’offre.',
  },
})
