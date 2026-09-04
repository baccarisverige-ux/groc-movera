import { describe, expect, it } from 'vitest'
import {
  MAP_SHEET_COMMAND,
  MAP_SHEET_GESTURE_AXIS,
  MAP_SHEET_MODE,
  MAP_SHEET_POSITION,
  beginMapSheetDrag,
  beginMapSheetInteraction,
  beginMapSheetListScroll,
  cancelMapSheetInteraction,
  classifyMapSheetTravel,
  completeMapSheetSnap,
  createMapSheetMachine,
  createMapSheetState,
  endMapSheetInteraction,
  isMapSheetAtPosition,
  resolveMapSheetSnap,
  updateMapSheetDrag,
} from '../../src/features/map-sheet/index.js'

describe('Map Sheet V2 headless core', () => {
  it('starts from one explicit settled state', () => {
    const state = createMapSheetState()
    expect(state).toEqual({
      mode: MAP_SHEET_MODE.IDLE,
      position: MAP_SHEET_POSITION.COLLAPSED,
      progress: 0,
      targetPosition: null,
      interaction: null,
    })
    expect(isMapSheetAtPosition(state, MAP_SHEET_POSITION.COLLAPSED)).toBe(true)
  })

  it('uses semantic normalized anchors independent from viewport pixels', () => {
    expect(createMapSheetState({ position: MAP_SHEET_POSITION.COLLAPSED }).progress).toBe(0)
    expect(createMapSheetState({ position: MAP_SHEET_POSITION.MIDDLE }).progress).toBe(0.5)
    expect(createMapSheetState({ position: MAP_SHEET_POSITION.EXPANDED }).progress).toBe(1)
  })

  it('keeps normal finger jitter a tap before activating a drag', () => {
    expect(classifyMapSheetTravel({ deltaX: 3, deltaY: 6 })).toBe(MAP_SHEET_GESTURE_AXIS.TAP)
    expect(classifyMapSheetTravel({ deltaX: 2, deltaY: 8 })).toBe(MAP_SHEET_GESTURE_AXIS.PENDING)
    expect(classifyMapSheetTravel({ deltaX: 2, deltaY: 14 })).toBe(MAP_SHEET_GESTURE_AXIS.VERTICAL)
    expect(classifyMapSheetTravel({ deltaX: 18, deltaY: 4 })).toBe(MAP_SHEET_GESTURE_AXIS.HORIZONTAL)
  })

  it('resolves slow releases to the nearest semantic snap point', () => {
    expect(resolveMapSheetSnap({ progress: 0.12, velocity: 0 }).position).toBe(MAP_SHEET_POSITION.COLLAPSED)
    expect(resolveMapSheetSnap({ progress: 0.46, velocity: 0 }).position).toBe(MAP_SHEET_POSITION.MIDDLE)
    expect(resolveMapSheetSnap({ progress: 0.88, velocity: 0 }).position).toBe(MAP_SHEET_POSITION.EXPANDED)
  })

  it('forces a fast swipe to advance in its direction instead of sticking to the nearest anchor', () => {
    expect(resolveMapSheetSnap({ progress: 0.18, velocity: 1.1 }).position).toBe(MAP_SHEET_POSITION.MIDDLE)
    expect(resolveMapSheetSnap({ progress: 0.82, velocity: -1.1 }).position).toBe(MAP_SHEET_POSITION.MIDDLE)
  })

  it('interrupts an in-flight snap when a new interaction begins', () => {
    const machine = createMapSheetMachine({
      initialState: {
        ...createMapSheetState({ position: MAP_SHEET_POSITION.MIDDLE }),
        mode: MAP_SHEET_MODE.SNAPPING,
        targetPosition: MAP_SHEET_POSITION.EXPANDED,
      },
    })

    const result = machine.dispatch(beginMapSheetInteraction({ origin: 'sheet', x: 10, y: 20, time: 100 }))
    expect(result.state.mode).toBe(MAP_SHEET_MODE.TAP_PENDING)
    expect(result.state.targetPosition).toBeNull()
    expect(result.commands.map((command) => command.type)).toEqual([MAP_SHEET_COMMAND.INTERRUPT_SNAP])
  })

  it('runs drag -> free progress -> deterministic snap -> settled as one state machine', () => {
    const machine = createMapSheetMachine()

    machine.dispatch(beginMapSheetInteraction({ origin: 'offer', x: 100, y: 600, time: 10 }))
    const start = machine.dispatch(beginMapSheetDrag())
    expect(start.state.mode).toBe(MAP_SHEET_MODE.SHEET_DRAGGING)
    expect(start.commands[0].type).toBe(MAP_SHEET_COMMAND.START_SHEET_DRAG)

    const move = machine.dispatch(updateMapSheetDrag(0.61))
    expect(move.state.progress).toBe(0.61)
    expect(move.commands[0]).toEqual({ type: MAP_SHEET_COMMAND.MOVE_SHEET, progress: 0.61 })

    const release = machine.dispatch(endMapSheetInteraction(0))
    expect(release.state.mode).toBe(MAP_SHEET_MODE.SNAPPING)
    expect(release.state.targetPosition).toBe(MAP_SHEET_POSITION.MIDDLE)
    expect(release.commands.at(-1)).toEqual({
      type: MAP_SHEET_COMMAND.SNAP_TO_POSITION,
      position: MAP_SHEET_POSITION.MIDDLE,
      progress: 0.5,
    })

    const settled = machine.dispatch(completeMapSheetSnap(MAP_SHEET_POSITION.MIDDLE))
    expect(settled.state.mode).toBe(MAP_SHEET_MODE.IDLE)
    expect(settled.state.progress).toBe(0.5)
    expect(settled.state.position).toBe(MAP_SHEET_POSITION.MIDDLE)
    expect(settled.state.targetPosition).toBeNull()
  })

  it('returns a cancelled drag to its last settled semantic position', () => {
    const machine = createMapSheetMachine({
      initialState: createMapSheetState({ position: MAP_SHEET_POSITION.MIDDLE }),
    })

    machine.dispatch(beginMapSheetInteraction({ origin: 'offer' }))
    machine.dispatch(beginMapSheetDrag())
    machine.dispatch(updateMapSheetDrag(0.84))
    const cancelled = machine.dispatch(cancelMapSheetInteraction())

    expect(cancelled.state.mode).toBe(MAP_SHEET_MODE.SNAPPING)
    expect(cancelled.state.targetPosition).toBe(MAP_SHEET_POSITION.MIDDLE)
    expect(cancelled.commands.at(-1)).toEqual({
      type: MAP_SHEET_COMMAND.SNAP_TO_POSITION,
      position: MAP_SHEET_POSITION.MIDDLE,
      progress: 0.5,
    })
  })

  it('keeps list scrolling separate from sheet progress ownership', () => {
    const machine = createMapSheetMachine({
      initialState: createMapSheetState({ position: MAP_SHEET_POSITION.EXPANDED }),
    })

    machine.dispatch(beginMapSheetInteraction({ origin: 'list' }))
    const scrolling = machine.dispatch(beginMapSheetListScroll())
    expect(scrolling.state.mode).toBe(MAP_SHEET_MODE.LIST_SCROLLING)
    expect(scrolling.state.progress).toBe(1)

    const ignoredMove = machine.dispatch(updateMapSheetDrag(0.5))
    expect(ignoredMove.state.progress).toBe(1)
    expect(ignoredMove.commands).toEqual([])
  })
})
