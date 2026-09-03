import { HOTEL_HIGHLIGHT_GROUPS, HOTEL_LISTING_HIGHLIGHTS } from '../../../../../entities/listing/listingHighlights.js'
import { HOTEL_AMENITIES, HOTEL_AMENITY_GROUPS } from '../../../../../entities/listing/listingAmenities.js'
import { COMMON_HOST_AMENITIES, COMMON_HOST_AMENITY_GROUPS, HOST_GUEST_ACCESS } from '../../hostOnboardingModel.js'
import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'
import { HOTEL_OFFER_PRESENTATION } from './hotelOfferVisuals.jsx'

export const hotelOfferFlow = createCommonOfferFlow({
  id: 'hotel',
  propertyType: 'Hôtel',
  guestAccess: HOST_GUEST_ACCESS.filter((item) => item.id === 'private' || item.id === 'shared'),
  supportsRoomInventory: true,
  photoPolicy: { min: 5, max: 20, scope: 'room-category' },
  amenityGroups: [...COMMON_HOST_AMENITY_GROUPS, ...HOTEL_AMENITY_GROUPS],
  amenities: [...COMMON_HOST_AMENITIES, ...HOTEL_AMENITIES],
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
    amenitiesTitle: 'Quels équipements et services propose votre établissement ?',
    amenitiesText: 'Sélectionnez tout ce qui est réellement disponible dans votre hôtel ou hostel.',
    highlightsTitle: 'Les points forts de votre hôtel',
    highlightsText: 'Cochez tout ce qui décrit réellement votre établissement. Tous vos choix seront visibles sur l’offre.',
    highlightsSummaryTitle: 'Affichage sur votre offre',
    highlightsSummaryText: 'Vous pouvez sélectionner plusieurs points forts. Tous les éléments cochés seront affichés comme badges sur l’offre.',
  },
})
