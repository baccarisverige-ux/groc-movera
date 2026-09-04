export const MAP_SHEET_EVENT = Object.freeze({
  INTERACTION_BEGIN: 'interaction.begin',
  SHEET_DRAG_BEGIN: 'sheet-drag.begin',
  LIST_SCROLL_BEGIN: 'list-scroll.begin',
  SHEET_DRAG_PROGRESS: 'sheet-drag.progress',
  INTERACTION_END: 'interaction.end',
  INTERACTION_CANCEL: 'interaction.cancel',
  SNAP_REQUEST: 'snap.request',
  SNAP_COMPLETE: 'snap.complete',
  MAP_FOCUS_BEGIN: 'map-focus.begin',
  MAP_FOCUS_COMPLETE: 'map-focus.complete',
  MAP_FOCUS_FAILED: 'map-focus.failed',
})

export function mapSheetEvent(type, payload = {}) {
  return { type, ...payload }
}

export const beginMapSheetInteraction = (payload = {}) => mapSheetEvent(MAP_SHEET_EVENT.INTERACTION_BEGIN, payload)
export const beginMapSheetDrag = (payload = {}) => mapSheetEvent(MAP_SHEET_EVENT.SHEET_DRAG_BEGIN, payload)
export const beginMapSheetListScroll = (payload = {}) => mapSheetEvent(MAP_SHEET_EVENT.LIST_SCROLL_BEGIN, payload)
export const updateMapSheetDrag = (progress) => mapSheetEvent(MAP_SHEET_EVENT.SHEET_DRAG_PROGRESS, { progress })
export const endMapSheetInteraction = (velocity = 0) => mapSheetEvent(MAP_SHEET_EVENT.INTERACTION_END, { velocity })
export const cancelMapSheetInteraction = () => mapSheetEvent(MAP_SHEET_EVENT.INTERACTION_CANCEL)
export const requestMapSheetSnap = (position, payload = {}) => mapSheetEvent(MAP_SHEET_EVENT.SNAP_REQUEST, { ...payload, position })
export const completeMapSheetSnap = (position) => mapSheetEvent(MAP_SHEET_EVENT.SNAP_COMPLETE, { position })
export const beginMapSheetMapFocus = (listingId) => mapSheetEvent(MAP_SHEET_EVENT.MAP_FOCUS_BEGIN, { listingId })
export const completeMapSheetMapFocus = () => mapSheetEvent(MAP_SHEET_EVENT.MAP_FOCUS_COMPLETE)
export const failMapSheetMapFocus = () => mapSheetEvent(MAP_SHEET_EVENT.MAP_FOCUS_FAILED)
