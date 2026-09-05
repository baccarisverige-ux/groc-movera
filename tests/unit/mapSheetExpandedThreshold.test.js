import { describe, expect, it } from 'vitest'
import {
  MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD,
  MAP_SHEET_GESTURE_AREA,
  MAP_SHEET_GESTURE_OWNER,
  MAP_SHEET_POSITION,
  resolveMapSheetGestureOwner,
} from '../../src/features/map-sheet/core/index.js'

describe('map sheet expanded threshold', () => {
  const listOrigin = { area: MAP_SHEET_GESTURE_AREA.LIST, startsOnFirstOffer: false }
  const scroll = { atTop: false }

  it('keeps the sheet as gesture owner immediately below the shared threshold', () => {
    const owner = resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.MIDDLE,
      progress: MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD - 0.001,
      deltaY: -20,
      origin: listOrigin,
      scroll,
    })
    expect(owner).toBe(MAP_SHEET_GESTURE_OWNER.SHEET)
  })

  it('hands vertical list gestures over at the shared expanded threshold', () => {
    const owner = resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.MIDDLE,
      progress: MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD,
      deltaY: -20,
      origin: listOrigin,
      scroll,
    })
    expect(owner).toBe(MAP_SHEET_GESTURE_OWNER.LIST)
  })
})
