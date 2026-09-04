import {
  MAP_SHEET_POSITION,
  beginMapSheetMapFocus,
  completeMapSheetMapFocus,
  completeMapSheetSnap,
  failMapSheetMapFocus,
} from '../core/index.js'
import { DEFAULT_MAP_LISTING_FOCUS } from '../ports/MapCameraPort.js'

export class MapSheetFocusSupersededError extends Error {
  constructor() {
    super('Map Sheet focus request was superseded by a newer interaction')
    this.name = 'MapSheetFocusSupersededError'
  }
}

export async function focusListingOnMap({
  listingId,
  dispatch,
  motion,
  mapCamera,
  selection,
  options = {},
  isCurrent = () => true,
} = {}) {
  const id = String(listingId || '').trim()
  if (!id) throw new TypeError('focusListingOnMap requires a listingId')
  if (typeof dispatch !== 'function') throw new TypeError('focusListingOnMap requires dispatch(event)')

  const ensureCurrent = () => {
    if (!isCurrent()) throw new MapSheetFocusSupersededError()
  }

  const started = dispatch(beginMapSheetMapFocus(id))
  await started.done

  try {
    ensureCurrent()
    await selection.selectListing(id)

    ensureCurrent()
    const snapResult = await motion.snapToPosition({
      position: MAP_SHEET_POSITION.MIDDLE,
      progress: 0.5,
      reason: 'map-focus',
    })
    if (snapResult?.interrupted) throw new MapSheetFocusSupersededError()

    ensureCurrent()
    const snapped = dispatch(completeMapSheetSnap(MAP_SHEET_POSITION.MIDDLE))
    await snapped.done

    ensureCurrent()
    await mapCamera.focusListing(id, { ...DEFAULT_MAP_LISTING_FOCUS, ...options })

    ensureCurrent()
    const completed = dispatch(completeMapSheetMapFocus())
    await completed.done

    return {
      listingId: id,
      position: MAP_SHEET_POSITION.MIDDLE,
      progress: 0.5,
      superseded: false,
    }
  } catch (error) {
    if (isCurrent()) {
      const failed = dispatch(failMapSheetMapFocus())
      await failed.done
    }
    if (error instanceof MapSheetFocusSupersededError) {
      return { listingId: id, superseded: true }
    }
    throw error
  }
}
