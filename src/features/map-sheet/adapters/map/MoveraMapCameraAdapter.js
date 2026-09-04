import { DEFAULT_MAP_LISTING_FOCUS } from '../../ports/MapCameraPort.js'

export function createMoveraMapCameraAdapter({
  focusListing,
  cancelFocus = () => {},
} = {}) {
  if (typeof focusListing !== 'function') throw new TypeError('MoveraMapCameraAdapter requires focusListing(listingId, options)')
  if (typeof cancelFocus !== 'function') throw new TypeError('MoveraMapCameraAdapter cancelFocus must be a function')

  return {
    focusListing(listingId, options = {}) {
      return focusListing(listingId, { ...DEFAULT_MAP_LISTING_FOCUS, ...options })
    },
    cancelFocus() {
      return cancelFocus()
    },
  }
}
