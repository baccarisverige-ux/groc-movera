import { HOTEL_HIGHLIGHT_GROUPS, HOTEL_LISTING_HIGHLIGHTS } from '../../../../../entities/listing/listingHighlights.js'
import { HOST_HOTEL_AMENITIES, HOST_HOTEL_AMENITY_GROUPS } from '../../hostHotelAmenitiesModel.js'
import { COMMON_HOST_AMENITIES, COMMON_HOST_AMENITY_GROUPS } from '../../hostOnboardingModel.js'
import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'

export const hotelOfferFlow = createCommonOfferFlow({
  id: 'hotel',
  propertyType: 'Hôtel',
  supportsRoomInventory: true,
  photoPolicy: { min: 5, max: 20, scope: 'room-category' },
  amenityGroups: [...COMMON_HOST_AMENITY_GROUPS, ...HOST_HOTEL_AMENITY_GROUPS],
  amenities: [...COMMON_HOST_AMENITIES, ...HOST_HOTEL_AMENITIES],
  highlightGroups: HOTEL_HIGHLIGHT_GROUPS,
  highlights: HOTEL_LISTING_HIGHLIGHTS,
  minHighlights: 1,
  maxHighlights: Infinity,
  copy: {
    amenitiesTitle: 'Quels équipements et services propose votre établissement ?',
    amenitiesText: 'Sélectionnez tout ce qui est réellement disponible dans votre hôtel ou hostel.',
    highlightsTitle: 'Les points forts de votre hôtel',
    highlightsText: 'Cochez tout ce qui décrit réellement votre établissement. Tous vos choix seront visibles sur l’offre.',
  },
})
