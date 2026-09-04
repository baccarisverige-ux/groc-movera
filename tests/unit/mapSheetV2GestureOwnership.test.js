import { describe, expect, it } from 'vitest'
import {
  MAP_SHEET_GESTURE_AREA,
  MAP_SHEET_GESTURE_OWNER,
  MAP_SHEET_POSITION,
  resolveMapSheetGestureOwner,
} from '../../src/features/map-sheet/core/index.js'

const offerOrigin = (startsOnFirstOffer = false) => ({
  area: MAP_SHEET_GESTURE_AREA.LIST,
  startsOnFirstOffer,
})

describe('Map Sheet V2 gesture ownership', () => {
  it('keeps small finger jitter as a tap', () => {
    expect(resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.MIDDLE,
      progress: 0.5,
      deltaX: 3,
      deltaY: 5,
      origin: offerOrigin(true),
    })).toBe(MAP_SHEET_GESTURE_OWNER.TAP)
  })

  it('gives collapsed and middle vertical offer drags to the sheet', () => {
    for (const [position, progress] of [
      [MAP_SHEET_POSITION.COLLAPSED, 0],
      [MAP_SHEET_POSITION.MIDDLE, 0.5],
    ]) {
      expect(resolveMapSheetGestureOwner({
        position,
        progress,
        deltaY: -80,
        origin: offerOrigin(false),
      })).toBe(MAP_SHEET_GESTURE_OWNER.SHEET)
    }
  })

  it('lets the expanded list own an upward swipe', () => {
    expect(resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.EXPANDED,
      progress: 1,
      deltaY: -90,
      origin: offerOrigin(true),
      scroll: { atTop: true },
    })).toBe(MAP_SHEET_GESTURE_OWNER.LIST)
  })

  it('hands an expanded top-edge pull on the first offer back to the sheet', () => {
    expect(resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.EXPANDED,
      progress: 1,
      deltaY: 90,
      origin: offerOrigin(true),
      scroll: { atTop: true },
    })).toBe(MAP_SHEET_GESTURE_OWNER.SHEET)
  })

  it('keeps list ownership when the expanded list is not at its top edge', () => {
    expect(resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.EXPANDED,
      progress: 1,
      deltaY: 90,
      origin: offerOrigin(true),
      scroll: { atTop: false },
    })).toBe(MAP_SHEET_GESTURE_OWNER.LIST)
  })

  it('does not hand off a downward pull that starts on a non-first offer', () => {
    expect(resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.EXPANDED,
      progress: 1,
      deltaY: 90,
      origin: offerOrigin(false),
      scroll: { atTop: true },
    })).toBe(MAP_SHEET_GESTURE_OWNER.LIST)
  })

  it('keeps horizontal travel out of sheet/list ownership', () => {
    expect(resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.MIDDLE,
      progress: 0.5,
      deltaX: 90,
      deltaY: 10,
      origin: { area: MAP_SHEET_GESTURE_AREA.PROPERTY_RAIL },
    })).toBe(MAP_SHEET_GESTURE_OWNER.HORIZONTAL)
  })

  it('lets structural header drags move the sheet even while expanded', () => {
    expect(resolveMapSheetGestureOwner({
      position: MAP_SHEET_POSITION.EXPANDED,
      progress: 1,
      deltaY: 80,
      origin: { area: MAP_SHEET_GESTURE_AREA.HEADER },
    })).toBe(MAP_SHEET_GESTURE_OWNER.SHEET)
  })
})
