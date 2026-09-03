import { createCommonOfferFlow } from '../shared/commonOfferFlow.js'

export const villaOfferFlow = createCommonOfferFlow({
  id: 'villa',
  propertyType: 'Villa',
  supportsRoomInventory: false,
  photoPolicy: { min: 5, max: 20, scope: 'listing' },
})
