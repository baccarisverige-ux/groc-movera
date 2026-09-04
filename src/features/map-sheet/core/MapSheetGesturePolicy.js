import { MAP_SHEET_POSITION, MAP_SHEET_POSITION_PROGRESS, isMapSheetPosition } from './MapSheetState.js'

export const MAP_SHEET_GESTURE_AXIS = Object.freeze({
  TAP: 'tap',
  PENDING: 'pending',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
})

const DEFAULT_SNAP_POINTS = Object.freeze([
  Object.freeze({ position: MAP_SHEET_POSITION.COLLAPSED, progress: MAP_SHEET_POSITION_PROGRESS[MAP_SHEET_POSITION.COLLAPSED] }),
  Object.freeze({ position: MAP_SHEET_POSITION.MIDDLE, progress: MAP_SHEET_POSITION_PROGRESS[MAP_SHEET_POSITION.MIDDLE] }),
  Object.freeze({ position: MAP_SHEET_POSITION.EXPANDED, progress: MAP_SHEET_POSITION_PROGRESS[MAP_SHEET_POSITION.EXPANDED] }),
])

export const DEFAULT_MAP_SHEET_GESTURE_POLICY = Object.freeze({
  tapSlopPx: 7,
  dragActivationPx: 10,
  horizontalBias: 1.08,
  fastSwipeVelocity: 0.85,
  velocityProjectionSeconds: 0.16,
  snapPoints: DEFAULT_SNAP_POINTS,
})

function positiveNumber(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

function normalizeSnapPoints(points) {
  if (!Array.isArray(points) || points.length < 2) return DEFAULT_SNAP_POINTS
  const normalized = points
    .filter((point) => point && isMapSheetPosition(point.position) && Number.isFinite(Number(point.progress)))
    .map((point) => ({ position: point.position, progress: Math.min(1, Math.max(0, Number(point.progress))) }))
    .sort((left, right) => left.progress - right.progress)
  return normalized.length >= 2 ? Object.freeze(normalized.map((point) => Object.freeze(point))) : DEFAULT_SNAP_POINTS
}

export function createMapSheetGesturePolicy(overrides = {}) {
  const tapSlopPx = positiveNumber(overrides.tapSlopPx, DEFAULT_MAP_SHEET_GESTURE_POLICY.tapSlopPx)
  const dragActivationPx = Math.max(
    tapSlopPx,
    positiveNumber(overrides.dragActivationPx, DEFAULT_MAP_SHEET_GESTURE_POLICY.dragActivationPx),
  )

  return Object.freeze({
    tapSlopPx,
    dragActivationPx,
    horizontalBias: positiveNumber(overrides.horizontalBias, DEFAULT_MAP_SHEET_GESTURE_POLICY.horizontalBias),
    fastSwipeVelocity: positiveNumber(overrides.fastSwipeVelocity, DEFAULT_MAP_SHEET_GESTURE_POLICY.fastSwipeVelocity),
    velocityProjectionSeconds: positiveNumber(overrides.velocityProjectionSeconds, DEFAULT_MAP_SHEET_GESTURE_POLICY.velocityProjectionSeconds),
    snapPoints: normalizeSnapPoints(overrides.snapPoints),
  })
}

export function classifyMapSheetTravel({ deltaX = 0, deltaY = 0 } = {}, policy = DEFAULT_MAP_SHEET_GESTURE_POLICY) {
  const absX = Math.abs(Number(deltaX) || 0)
  const absY = Math.abs(Number(deltaY) || 0)
  const largestTravel = Math.max(absX, absY)

  if (largestTravel <= policy.tapSlopPx) return MAP_SHEET_GESTURE_AXIS.TAP
  if (largestTravel < policy.dragActivationPx) return MAP_SHEET_GESTURE_AXIS.PENDING
  if (absX > absY * policy.horizontalBias) return MAP_SHEET_GESTURE_AXIS.HORIZONTAL
  return MAP_SHEET_GESTURE_AXIS.VERTICAL
}
