import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'

export const guestHouseOfferFlow = createCommonOfferFlow({
  id: 'guesthouse',
  propertyType: 'Maison d’hôte',
  supportsRoomInventory: true,
  photoPolicy: { min: 5, max: 20, scope: 'room-category-when-pooled' },
})
