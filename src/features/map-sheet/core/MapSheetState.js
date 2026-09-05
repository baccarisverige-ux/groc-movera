export const MAP_SHEET_POSITION = Object.freeze({
  COLLAPSED: 'collapsed',
  MIDDLE: 'middle',
  EXPANDED: 'expanded',
})

export const MAP_SHEET_MODE = Object.freeze({
  IDLE: 'idle',
  TAP_PENDING: 'tap-pending',
  SHEET_DRAGGING: 'sheet-dragging',
  LIST_SCROLLING: 'list-scrolling',
  SNAPPING: 'snapping',
  MAP_FOCUSING: 'map-focusing',
})

export const MAP_SHEET_POSITION_PROGRESS = Object.freeze({
  [MAP_SHEET_POSITION.COLLAPSED]: 0,
  [MAP_SHEET_POSITION.MIDDLE]: 0.5,
  [MAP_SHEET_POSITION.EXPANDED]: 1,
})

export const MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD = 0.985

const VALID_POSITIONS = new Set(Object.values(MAP_SHEET_POSITION))

export function clampMapSheetProgress(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(1, Math.max(0, numeric))
}

export function isMapSheetPosition(value) {
  return VALID_POSITIONS.has(value)
}

export function getMapSheetPositionProgress(position) {
  return MAP_SHEET_POSITION_PROGRESS[position] ?? MAP_SHEET_POSITION_PROGRESS[MAP_SHEET_POSITION.COLLAPSED]
}

export function createMapSheetState({ position = MAP_SHEET_POSITION.COLLAPSED, progress } = {}) {
  const safePosition = isMapSheetPosition(position) ? position : MAP_SHEET_POSITION.COLLAPSED
  const safeProgress = progress == null
    ? getMapSheetPositionProgress(safePosition)
    : clampMapSheetProgress(progress)

  return {
    mode: MAP_SHEET_MODE.IDLE,
    position: safePosition,
    progress: safeProgress,
    targetPosition: null,
    interaction: null,
  }
}
