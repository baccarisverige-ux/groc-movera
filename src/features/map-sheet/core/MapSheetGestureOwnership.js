import { MAP_SHEET_GESTURE_AXIS, classifyMapSheetTravel } from './MapSheetGesturePolicy.js'
import { MAP_SHEET_POSITION } from './MapSheetState.js'
import { MAP_SHEET_SCROLL_OWNER, resolveMapSheetScrollHandoff } from './MapSheetScrollHandoff.js'

export const MAP_SHEET_GESTURE_OWNER = Object.freeze({
  TAP: 'tap',
  PENDING: 'pending',
  HORIZONTAL: 'horizontal',
  SHEET: 'sheet',
  LIST: 'list',
})

export const MAP_SHEET_GESTURE_AREA = Object.freeze({
  SHEET: 'sheet',
  HEADER: 'header',
  PROPERTY_RAIL: 'property-rail',
  LIST: 'list',
})

const EXPANDED_PROGRESS_EPSILON = 0.985

function isExpanded({ position, progress }) {
  return position === MAP_SHEET_POSITION.EXPANDED || Number(progress) >= EXPANDED_PROGRESS_EPSILON
}

export function resolveMapSheetGestureOwner({
  position = MAP_SHEET_POSITION.COLLAPSED,
  progress = 0,
  deltaX = 0,
  deltaY = 0,
  origin = {},
  scroll = {},
} = {}, policy) {
  const axis = classifyMapSheetTravel({ deltaX, deltaY }, policy)

  if (axis === MAP_SHEET_GESTURE_AXIS.TAP) return MAP_SHEET_GESTURE_OWNER.TAP
  if (axis === MAP_SHEET_GESTURE_AXIS.PENDING) return MAP_SHEET_GESTURE_OWNER.PENDING
  if (axis === MAP_SHEET_GESTURE_AXIS.HORIZONTAL) return MAP_SHEET_GESTURE_OWNER.HORIZONTAL

  if (!isExpanded({ position, progress })) return MAP_SHEET_GESTURE_OWNER.SHEET

  if (origin.area !== MAP_SHEET_GESTURE_AREA.LIST) return MAP_SHEET_GESTURE_OWNER.SHEET

  const owner = resolveMapSheetScrollHandoff({
    deltaY,
    atTop: Boolean(scroll.atTop),
    startsOnFirstOffer: Boolean(origin.startsOnFirstOffer),
  })

  return owner === MAP_SHEET_SCROLL_OWNER.SHEET
    ? MAP_SHEET_GESTURE_OWNER.SHEET
    : MAP_SHEET_GESTURE_OWNER.LIST
}
