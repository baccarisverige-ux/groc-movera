import { selectStayHighlights, stayHighlightGroupsFor } from '../../../../../entities/listing/listingHighlights.js'
import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'
import { createStayOfferVisuals } from '../shared/offerVisuals.jsx'

/* Maison d'hôte — character and hospitality. Guests choose one for the house
   itself and the welcome, so the catalogue favours authenticity and atmosphere
   over square metres, and keeps the shared outdoor spaces a guesthouse is
   usually built around. */
const highlights = selectStayHighlights([
  'central', 'historic', 'sea-view', 'panoramic',
  'garden', 'terrace', 'rooftop',
  'traditional', 'unique', 'peaceful', 'stylish', 'romantic', 'eco',
  'couples', 'family', 'long-stay', 'accessible',
])

export const guestHouseOfferFlow = createCommonOfferFlow({
  id: 'guesthouse',
  propertyType: 'Maison d\u2019h\u00f4te',
  supportsRoomInventory: true,
  photoPolicy: { min: 5, max: 20, scope: 'room-category-when-pooled' },
  highlightGroups: stayHighlightGroupsFor(highlights),
  highlights,
  minHighlights: 1,
  maxHighlights: Infinity,
  presentation: { ...createStayOfferVisuals('guesthouse'), propertyIcon: 'house' },
  copy: {
    amenitiesTitle: 'Quels \u00e9quipements propose votre maison d\u2019h\u00f4te ?',
    amenitiesText: 'S\u00e9lectionnez les \u00e9quipements des chambres et des espaces communs r\u00e9ellement disponibles.',
    highlightsTitle: 'Les points forts de votre maison d\u2019h\u00f4te',
    highlightsText: 'Mettez en avant le caract\u00e8re de la maison, son emplacement et l\u2019exp\u00e9rience que vous proposez.',
    highlightsSummaryTitle: 'Affichage sur votre offre',
    highlightsSummaryText: 'Tous les \u00e9l\u00e9ments coch\u00e9s seront affich\u00e9s comme badges sur votre annonce.',
  },
  roomAccessPresentation: {
    title: 'Que réservent vos voyageurs ?',
    intro: 'Pour votre maison d’hôte, proposez une chambre entière, une chambre partagée ou toute la maison d’hôte. Vous configurerez ensuite les catégories, quantités et tarifs.',
    contextLabel: 'Configuration professionnelle',
    statusLabel: 'Type confirmé',
    noteTitle: 'Les chambres se configurent ensuite.',
    noteText: 'Nombre de chambres, chambres identiques ou catégories, photos, capacité, disponibilités et tarifs restent gérés séparément.',
    defaultId: 'private',
    options: [
      { id: 'private', label: 'Chambre entière', description: 'Le voyageur réserve une chambre complète qui lui est réservée. Les espaces communs peuvent rester partagés.', badge: 'Recommandé', icon: 'door' },
      { id: 'shared', label: 'Chambre partagée', description: 'Le voyageur réserve un lit ou une place dans une chambre partagée.', icon: 'bunk' },
      { id: 'entire', label: 'Tout l’établissement', description: 'La maison d’hôte est proposée en réservation exclusive, avec ses chambres et ses espaces communs.', icon: 'building' },
    ],
  },
})
