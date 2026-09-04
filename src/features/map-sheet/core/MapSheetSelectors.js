import { MAP_SHEET_MODE, getMapSheetPositionProgress } from './MapSheetState.js'

export function selectMapSheetProgress(state) {
  return state?.progress ?? 0
}

export function selectMapSheetPosition(state) {
  return state?.position ?? null
}

export function selectMapSheetTargetPosition(state) {
  return state?.targetPosition ?? null
}

export function isMapSheetDragging(state) {
  return state?.mode === MAP_SHEET_MODE.SHEET_DRAGGING
}

export function isMapSheetSnapping(state) {
  return state?.mode === MAP_SHEET_MODE.SNAPPING
}

export function isMapSheetIdle(state) {
  return state?.mode === MAP_SHEET_MODE.IDLE
}

export function isMapSheetAtPosition(state, position, epsilon = 0.001) {
  if (!state) return false
  return state.position === position && Math.abs(state.progress - getMapSheetPositionProgress(position)) <= epsilon
}
