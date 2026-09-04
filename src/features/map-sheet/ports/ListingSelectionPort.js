export function assertMapSheetListingSelectionPort(port) {
  for (const method of ['selectListing', 'getSelectedListing']) {
    if (typeof port?.[method] !== 'function') throw new TypeError(`Map Sheet ListingSelectionPort requires ${method}()`)
  }
  return port
}
