import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'

export const apartmentOfferFlow = createCommonOfferFlow({
  id: 'apartment',
  propertyType: 'Appartement',
  supportsRoomInventory: false,
  photoPolicy: { min: 5, max: 20, scope: 'listing' },
})
