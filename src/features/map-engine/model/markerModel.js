export const MarkerState = Object.freeze({
  NORMAL: 'normal',
  SELECTED: 'selected',
  CLUSTERED: 'clustered',
  HIDDEN: 'hidden',
})

export function getMarkerState(marker, { selectedListingId = null, clusteredIds = new Set(), hiddenIds = new Set() } = {}) {
  if (hiddenIds.has(marker.id)) return MarkerState.HIDDEN
  if (clusteredIds.has(marker.id)) return MarkerState.CLUSTERED
  if (selectedListingId === marker.id) return MarkerState.SELECTED
  return MarkerState.NORMAL
}

export function selectListing(currentId, nextId) {
  return currentId === nextId ? currentId : nextId
}
