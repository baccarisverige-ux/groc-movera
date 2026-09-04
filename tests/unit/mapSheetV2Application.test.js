import { describe, expect, it, vi } from 'vitest'
import {
  MAP_SHEET_MODE,
  MAP_SHEET_POSITION,
  beginMapSheetDrag,
  beginMapSheetInteraction,
  createMapSheetController,
  createMapSheetMachine,
  endMapSheetInteraction,
  updateMapSheetDrag,
} from '../../src/features/map-sheet/index.js'

function createRuntime(log, overrides = {}) {
  let selected = null
  const motion = {
    interrupt: vi.fn(() => { log.push('motion.interrupt'); return 0 }),
    startDrag: vi.fn(() => { log.push('motion.start'); return 0 }),
    moveToProgress: vi.fn((progress) => { log.push(`motion.move:${progress}`); return progress }),
    endDrag: vi.fn(() => { log.push('motion.end'); return 0 }),
    snapToPosition: vi.fn(async ({ position }) => { log.push(`motion.snap:${position}`); return { interrupted: false, position } }),
    destroy: vi.fn(),
    ...overrides.motion,
  }
  const mapCamera = {
    focusListing: vi.fn(async (listingId, options) => { log.push(`map.focus:${listingId}`); return { listingId, options } }),
    cancelFocus: vi.fn(() => { log.push('map.cancel') }),
    ...overrides.mapCamera,
  }
  const selection = {
    selectListing: vi.fn(async (listingId) => { selected = listingId; log.push(`selection:${listingId}`) }),
    getSelectedListing: vi.fn(() => selected),
    ...overrides.selection,
  }
  return { motion, mapCamera, selection }
}

describe('Map Sheet V2 application controller', () => {
  it('executes drag commands through MotionPort and completes the semantic snap', async () => {
    const log = []
    const runtime = createRuntime(log)
    const controller = createMapSheetController({ machine: createMapSheetMachine(), ...runtime })

    controller.dispatch(beginMapSheetInteraction({ x: 20, y: 700, origin: 'offer' }))
    controller.dispatch(beginMapSheetDrag())
    controller.dispatch(updateMapSheetDrag(0.42))
    const ended = controller.dispatch(endMapSheetInteraction(0))
    await ended.done

    expect(log).toContain('motion.start')
    expect(log).toContain('motion.move:0.42')
    expect(log).toContain('motion.end')
    expect(log).toContain('motion.snap:middle')
    expect(controller.getState().mode).toBe(MAP_SHEET_MODE.IDLE)
    expect(controller.getState().position).toBe(MAP_SHEET_POSITION.MIDDLE)
    expect(controller.getState().progress).toBe(0.5)
  })

  it('runs Voir sur la carte as one ordered select → middle snap → exact camera focus transaction', async () => {
    const log = []
    const runtime = createRuntime(log)
    const controller = createMapSheetController({ ...runtime })

    const result = await controller.focusListingOnMap('sea-breeze-marsa')

    const selectIndex = log.indexOf('selection:sea-breeze-marsa')
    const snapIndex = log.indexOf('motion.snap:middle')
    const cameraIndex = log.indexOf('map.focus:sea-breeze-marsa')
    expect(selectIndex).toBeGreaterThan(-1)
    expect(snapIndex).toBeGreaterThan(selectIndex)
    expect(cameraIndex).toBeGreaterThan(snapIndex)
    expect(result).toMatchObject({ listingId: 'sea-breeze-marsa', position: 'middle', progress: 0.5, superseded: false })
    expect(controller.getState()).toMatchObject({ mode: 'idle', position: 'middle', progress: 0.5, targetPosition: null })

    const cameraOptions = runtime.mapCamera.focusListing.mock.calls[0][1]
    expect(cameraOptions).toMatchObject({ anchorX: 0.5, anchorY: 0.26, zoomDelta: 0.65, minZoom: 13.6, maxZoom: 17 })
  })

  it('returns to a stable idle state when map focus fails', async () => {
    const log = []
    const runtime = createRuntime(log, {
      mapCamera: {
        focusListing: vi.fn(async () => {
          log.push('map.focus:failed')
          throw new Error('camera failed')
        }),
      },
    })
    const controller = createMapSheetController({ ...runtime })

    await expect(controller.focusListingOnMap('maison-jasmin')).rejects.toThrow('camera failed')
    expect(controller.getState().mode).toBe(MAP_SHEET_MODE.IDLE)
    expect(controller.getState().position).toBe(MAP_SHEET_POSITION.MIDDLE)
    expect(controller.getState().progress).toBe(0.5)
  })

  it('notifies subscribers from the headless state instead of exposing Motion or DOM state', () => {
    const log = []
    const runtime = createRuntime(log)
    const controller = createMapSheetController({ ...runtime })
    const states = []
    const unsubscribe = controller.subscribe((state) => states.push(state.mode), { emitCurrent: true })

    controller.dispatch(beginMapSheetInteraction({ x: 1, y: 1 }))
    unsubscribe()

    expect(states).toEqual([MAP_SHEET_MODE.IDLE, MAP_SHEET_MODE.TAP_PENDING])
  })
})
