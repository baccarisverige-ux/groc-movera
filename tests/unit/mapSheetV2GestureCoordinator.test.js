import { describe, expect, it, vi } from 'vitest'
import {
  MAP_SHEET_GESTURE_AREA,
  MAP_SHEET_GESTURE_PHASE,
  MAP_SHEET_MODE,
  MAP_SHEET_POSITION,
  createMapSheetGestureCoordinator,
  createMapSheetGestureFrame,
  createMapSheetMachine,
  createMapSheetState,
} from '../../src/features/map-sheet/index.js'

function createGestureHarness() {
  let listener = null
  const claimed = new Set()
  const gesture = {
    subscribe: vi.fn((next) => { listener = next; return () => { listener = null } }),
    claim: vi.fn((pointerId) => { claimed.add(pointerId); return true }),
    release: vi.fn((pointerId) => { claimed.delete(pointerId); return true }),
    destroy: vi.fn(),
  }
  return {
    gesture,
    emit(frame) { listener?.(frame) },
    isClaimed(pointerId) { return claimed.has(pointerId) },
  }
}

function frame({ phase, y, startY = 600, x = 160, startX = 160, velocityY = 0, origin }) {
  return createMapSheetGestureFrame({
    phase,
    pointerId: 7,
    pointerType: 'touch',
    x,
    y,
    startX,
    startY,
    deltaX: x - startX,
    deltaY: y - startY,
    velocityY,
    time: 100,
    origin,
  })
}

function createCoordinatorHarness({ position = MAP_SHEET_POSITION.COLLAPSED, scroll = { atTop: true }, onSheetRelease = vi.fn() } = {}) {
  const machine = createMapSheetMachine({ initialState: createMapSheetState({ position }) })
  const controller = {
    dispatch: (event) => machine.dispatch(event),
    getState: () => machine.getState(),
  }
  const gestures = createGestureHarness()
  const coordinator = createMapSheetGestureCoordinator({
    controller,
    gesture: gestures.gesture,
    scroll: { getSnapshot: () => scroll },
    getDistancePx: () => 500,
    getVisualProgress: () => machine.getState().progress,
    onSheetRelease,
  })
  return { machine, controller, gestures, coordinator, onSheetRelease }
}

describe('Map Sheet V2 gesture coordinator', () => {
  it('gives a vertical offer gesture to the sheet while collapsed or middle', () => {
    const harness = createCoordinatorHarness({ position: MAP_SHEET_POSITION.MIDDLE })
    const origin = { area: MAP_SHEET_GESTURE_AREA.LIST, startsOnFirstOffer: false }

    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.START, y: 600, origin }))
    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.MOVE, y: 500, velocityY: -420, origin }))

    expect(harness.gestures.gesture.claim).toHaveBeenCalledWith(7)
    expect(harness.machine.getState().mode).toBe(MAP_SHEET_MODE.SHEET_DRAGGING)
    expect(harness.machine.getState().progress).toBeCloseTo(0.7, 3)

    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.END, y: 500, velocityY: -420, origin }))
    expect(harness.gestures.gesture.release).toHaveBeenCalledWith(7)
    expect(harness.onSheetRelease).toHaveBeenCalledTimes(1)
    expect(harness.machine.getState().mode).toBe(MAP_SHEET_MODE.SNAPPING)
  })

  it('keeps native list ownership for a non-first offer when fully expanded', () => {
    const harness = createCoordinatorHarness({ position: MAP_SHEET_POSITION.EXPANDED, scroll: { atTop: true } })
    const origin = { area: MAP_SHEET_GESTURE_AREA.LIST, startsOnFirstOffer: false }

    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.START, y: 420, startY: 420, origin }))
    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.MOVE, y: 500, startY: 420, origin }))

    expect(harness.gestures.gesture.claim).not.toHaveBeenCalled()
    expect(harness.machine.getState().mode).toBe(MAP_SHEET_MODE.LIST_SCROLLING)
  })

  it('hands the fully expanded list back to the sheet only from the first offer at the top edge', () => {
    const harness = createCoordinatorHarness({ position: MAP_SHEET_POSITION.EXPANDED, scroll: { atTop: true } })
    const origin = { area: MAP_SHEET_GESTURE_AREA.LIST, startsOnFirstOffer: true }

    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.START, y: 300, startY: 300, origin }))
    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.MOVE, y: 360, startY: 300, velocityY: 350, origin }))

    expect(harness.gestures.gesture.claim).toHaveBeenCalledWith(7)
    expect(harness.machine.getState().mode).toBe(MAP_SHEET_MODE.SHEET_DRAGGING)
    expect(harness.machine.getState().progress).toBeLessThan(1)
  })

  it('never steals a horizontal rail gesture', () => {
    const harness = createCoordinatorHarness({ position: MAP_SHEET_POSITION.MIDDLE })
    const origin = { area: MAP_SHEET_GESTURE_AREA.PROPERTY_RAIL, startsOnFirstOffer: false }

    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.START, x: 100, startX: 100, y: 600, origin }))
    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.MOVE, x: 180, startX: 100, y: 606, origin }))

    expect(harness.gestures.gesture.claim).not.toHaveBeenCalled()
    expect(harness.machine.getState().mode).toBe(MAP_SHEET_MODE.TAP_PENDING)
  })

  it('keeps normal finger jitter as a tap', () => {
    const harness = createCoordinatorHarness({ position: MAP_SHEET_POSITION.MIDDLE })
    const origin = { area: MAP_SHEET_GESTURE_AREA.LIST, startsOnFirstOffer: true }

    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.START, y: 600, origin }))
    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.MOVE, y: 606, origin }))
    harness.gestures.emit(frame({ phase: MAP_SHEET_GESTURE_PHASE.END, y: 606, origin }))

    expect(harness.gestures.gesture.claim).not.toHaveBeenCalled()
    expect(harness.machine.getState().mode).toBe(MAP_SHEET_MODE.IDLE)
  })
})
