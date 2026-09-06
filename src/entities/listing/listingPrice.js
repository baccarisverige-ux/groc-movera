function currencyOf(listing) {
  return listing?.currency || 'TND'
}

export function listingMapPrice(listing) {
  const source = `${listing?.priceTotal || listing?.priceLabel || ''}`
  const match = source.match(/(\d[\d\s]*)\s*TND/i)
  if (match) return `${match[1].replace(/\s/g, '')} TND`

  const rate = listing?.nightlyRate ?? listing?.price
  if (rate != null && Number.isFinite(Number(rate))) {
    return `${Number(rate)} ${currencyOf(listing)}`
  }

  return 'TND'
}

export function listingPriceCopy(listing) {
  if (listing?.priceLabel) return listing.priceLabel
  if (listing?.priceTotal) return listing.priceTotal
  if (listing?.nightlyRate != null) return `${listing.nightlyRate} ${currencyOf(listing)}`
  if (listing?.price != null) return `${listing.price} ${currencyOf(listing)}`
  return ''
}

export function listingRoomPriceCopy(listing, room) {
  if (!room) return listingPriceCopy(listing)
  return `${room.basePrice} ${currencyOf(listing)} / nuit`
}
