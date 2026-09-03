import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'

export const guestHouseOfferFlow = createCommonOfferFlow({
  id: 'guesthouse',
  propertyType: 'Maison d’hôte',
  supportsRoomInventory: true,
  photoPolicy: { min: 5, max: 20, scope: 'room-category-when-pooled' },
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
