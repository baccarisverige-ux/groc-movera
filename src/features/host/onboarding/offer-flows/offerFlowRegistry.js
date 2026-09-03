import { apartmentOfferFlow } from './apartment/apartmentOfferFlow.js'
import { guestHouseOfferFlow } from './guesthouse/guestHouseOfferFlow.js'
import { hotelOfferFlow } from './hotel/hotelOfferFlow.js'
import { villaOfferFlow } from './villa/villaOfferFlow.js'

export const HOST_OFFER_FLOWS = Object.freeze([
  apartmentOfferFlow,
  villaOfferFlow,
  guestHouseOfferFlow,
  hotelOfferFlow,
])

function foldType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .trim()
}

const FLOW_BY_TYPE = new Map(HOST_OFFER_FLOWS.map((flow) => [foldType(flow.propertyType), flow]))

export function getOfferFlow(propertyType) {
  return FLOW_BY_TYPE.get(foldType(propertyType)) || apartmentOfferFlow
}
