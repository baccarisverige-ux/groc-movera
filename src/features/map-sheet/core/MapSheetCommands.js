export const MAP_SHEET_COMMAND = Object.freeze({
  INTERRUPT_SNAP: 'snap.interrupt',
  START_SHEET_DRAG: 'sheet-drag.start',
  MOVE_SHEET: 'sheet.move',
  END_SHEET_DRAG: 'sheet-drag.end',
  SNAP_TO_POSITION: 'snap.to-position',
})

export function mapSheetCommand(type, payload = {}) {
  return { type, ...payload }
}
