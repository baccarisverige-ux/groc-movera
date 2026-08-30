export function rotateListingsForPopup(listings, selectedId) {
  if (!Array.isArray(listings) || listings.length < 2) return listings || []
  const index = listings.findIndex((item) => item.id === selectedId)
  if (index <= 0) return listings
  return [...listings.slice(index), ...listings.slice(0, index)]
}

export function nextListingId(listings, selectedId) {
  if (!Array.isArray(listings) || listings.length === 0) return null
  if (listings.length === 1) return listings[0].id
  const index = listings.findIndex((item) => item.id === selectedId)
  const from = index < 0 ? 0 : index
  return listings[(from + 1) % listings.length].id
}

export function listingLocationLine(listing) {
  const type = listing?.capacity?.type || 'Logement'
  const location = listing?.location || 'Tunisie'
  return `${type} · ${location}`
}

export function listingRatingCopy(listing) {
  const rating = listing?.rating || '4.90'
  const reviews = listing?.reviews ?? 0
  return `★ ${rating} (${reviews})`
}
