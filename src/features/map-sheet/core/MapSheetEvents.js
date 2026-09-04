export const MAP_SHEET_EVENT = Object.freeze({
  INTERACTION_BEGIN: 'interaction.begin',
  SHEET_DRAG_BEGIN: 'sheet-drag.begin',
  LIST_SCROLL_BEGIN: 'list-scroll.begin',
  SHEET_DRAG_PROGRESS: 'sheet-drag.progress',
  INTERACTION_END: 'interaction.end',
  INTERACTION_CANCEL: 'interaction.cancel',
  SNAP_COMPLETE: 'snap.complete',
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
export const completeMapSheetSnap = (position) => mapSheetEvent(MAP_SHEET_EVENT.SNAP_COMPLETE, { position })
