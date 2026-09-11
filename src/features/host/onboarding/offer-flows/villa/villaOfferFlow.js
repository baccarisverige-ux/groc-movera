import { selectStayHighlights, stayHighlightGroupsFor } from '../../../../../entities/listing/listingHighlights.js'
import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'
import { createStayOfferVisuals } from '../shared/offerVisuals.jsx'

/* Villa — space, privacy and the outdoors. The grounds are the product here,
   so the outdoor group carries the most weight, and the audience options cover
   the groups and families a villa is actually booked by. */
const highlights = selectStayHighlights([
  'sea-view', 'beachfront', 'panoramic', 'central',
  'private-pool', 'garden', 'terrace', 'bbq', 'rooftop',
  'luxury', 'stylish', 'design', 'unique', 'peaceful', 'spacious', 'eco',
  'family', 'groups', 'couples', 'long-stay',
])

export const villaOfferFlow = createCommonOfferFlow({
  id: 'villa',
  propertyType: 'Villa',
  supportsRoomInventory: false,
  photoPolicy: { min: 5, max: 20, scope: 'listing' },
  highlightGroups: stayHighlightGroupsFor(highlights),
  highlights,
  minHighlights: 1,
  maxHighlights: Infinity,
  presentation: { ...createStayOfferVisuals('villa'), propertyIcon: 'house' },
  copy: {
    amenitiesTitle: 'Quels équipements propose votre villa ?',
    amenitiesText: 'Sélectionnez les équipements intérieurs et extérieurs réellement disponibles.',
    highlightsTitle: 'Les points forts de votre villa',
    highlightsText: 'Mettez en avant les extérieurs, la vue et le type de séjour que votre villa permet.',
    highlightsSummaryTitle: 'Affichage sur votre offre',
    highlightsSummaryText: 'Tous les éléments cochés seront affichés comme badges sur votre annonce.',
  },
})
