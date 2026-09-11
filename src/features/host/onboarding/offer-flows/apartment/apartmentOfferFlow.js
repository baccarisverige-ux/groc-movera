import { selectStayHighlights, stayHighlightGroupsFor } from '../../../../../entities/listing/listingHighlights.js'
import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'
import { createStayOfferVisuals } from '../shared/offerVisuals.jsx'

/* Appartement — an urban stay. What sells one is the address, the light and
   how workable it is for a longer stay, so the catalogue leans on location and
   liveability and leaves out the grounds an apartment does not have. */
const highlights = selectStayHighlights([
  'central', 'sea-view', 'panoramic', 'historic',
  'terrace', 'rooftop',
  'stylish', 'design', 'unique', 'peaceful', 'spacious', 'eco',
  'family', 'couples', 'business', 'long-stay', 'accessible',
])

export const apartmentOfferFlow = createCommonOfferFlow({
  id: 'apartment',
  propertyType: 'Appartement',
  supportsRoomInventory: false,
  photoPolicy: { min: 5, max: 20, scope: 'listing' },
  highlightGroups: stayHighlightGroupsFor(highlights),
  highlights,
  minHighlights: 1,
  maxHighlights: Infinity,
  presentation: { ...createStayOfferVisuals('apartment'), propertyIcon: 'building' },
  copy: {
    amenitiesTitle: 'Quels équipements propose votre appartement ?',
    amenitiesText: 'Sélectionnez uniquement ce qui est réellement à disposition du voyageur.',
    highlightsTitle: 'Les points forts de votre appartement',
    highlightsText: 'Choisissez ce qui distingue votre appartement : son emplacement, son style et le type de séjour auquel il convient.',
    highlightsSummaryTitle: 'Affichage sur votre offre',
    highlightsSummaryText: 'Tous les éléments cochés seront affichés comme badges sur votre annonce.',
  },
})
