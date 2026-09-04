export function createListingSelectionAdapter({
  selectListing,
  getSelectedListing,
  initialListingId = null,
} = {}) {
  if (typeof selectListing !== 'function') throw new TypeError('ListingSelectionAdapter requires selectListing(listingId)')
  if (getSelectedListing != null && typeof getSelectedListing !== 'function') {
    throw new TypeError('ListingSelectionAdapter getSelectedListing must be a function when provided')
  }

  let selected = initialListingId

  return {
    async selectListing(listingId) {
      const result = await selectListing(listingId)
      selected = listingId
      return result
    },
    getSelectedListing() {
      return getSelectedListing ? getSelectedListing() : selected
    },
  }
}
