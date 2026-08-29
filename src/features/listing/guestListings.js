import { listingCatalog } from '../../entities/listing/listingCatalog.js'
import { homeCategoryOffers } from '../home/data/homeData.js'

const DEFAULT_DATES = '3–4 sept.'

function fromHomeOffer(item) {
  return {
    id: item.id,
    title: item.title,
    location: item.location,
    image: item.image,
    rating: item.rating,
    badge: item.badge || '',
    priceLabel: item.priceTotal,
    dates: item.dateLabel || DEFAULT_DATES,
  }
}

function fromCatalog(item) {
  return {
    id: item.id,
    title: item.title,
    location: item.location,
    image: item.image,
    rating: item.rating,
    badge: item.badge || '',
    priceLabel: `${item.price} ${item.currency} / nuit`,
    dates: DEFAULT_DATES,
  }
}

export const guestListingById = (() => {
  const byId = new Map()
  for (const item of listingCatalog) byId.set(item.id, fromCatalog(item))
  for (const items of Object.values(homeCategoryOffers)) {
    for (const item of items) byId.set(item.id, fromHomeOffer(item))
  }
  return byId
})()

export function getGuestListingById(id) {
  return guestListingById.get(id) || null
}

export function listGuestListingsByIds(ids) {
  return ids.map((id) => guestListingById.get(id)).filter(Boolean)
}
