import { describe, expect, it, vi } from 'vitest'
import {
  createListingSelectionAdapter,
  createMotionSheetAdapter,
  createMoveraMapCameraAdapter,
} from '../../src/features/map-sheet/index.js'

describe('Map Sheet V2 runtime adapters', () => {
  it('animates normalized progress and resolves at the requested semantic position', async () => {
    let progress = 0
    let animationOptions = null
    const writeProgress = vi.fn((value) => { progress = value })
    const animateValue = vi.fn((from, to, options) => {
      animationOptions = options
      expect(from).toBe(0)
      expect(to).toBe(0.5)
      return { stop: vi.fn() }
    })

    const adapter = createMotionSheetAdapter({
      readProgress: () => progress,
      writeProgress,
      animateValue,
    })

    const pending = adapter.snapToPosition({ position: 'middle' })
    animationOptions.onUpdate(0.24)
    expect(progress).toBe(0.24)
    animationOptions.onComplete()

    await expect(pending).resolves.toMatchObject({ interrupted: false, position: 'middle', progress: 0.5 })
    expect(progress).toBe(0.5)
  })

  it('interrupts an active Motion snap without leaving its promise pending', async () => {
    let progress = 0.2
    let controls = null
    const animateValue = vi.fn(() => {
      controls = { stop: vi.fn() }
      return controls
    })
    const adapter = createMotionSheetAdapter({
      readProgress: () => progress,
      writeProgress: (value) => { progress = value },
      animateValue,
    })

    const pending = adapter.snapToPosition({ position: 'expanded' })
    adapter.interrupt()

    await expect(pending).resolves.toMatchObject({ interrupted: true, progress: 0.2 })
    expect(controls.stop).toHaveBeenCalledTimes(1)
  })

  it('keeps the map camera host-injected while preserving Movera focus defaults', async () => {
    const focusListing = vi.fn(async (listingId, options) => ({ listingId, options }))
    const cancelFocus = vi.fn()
    const adapter = createMoveraMapCameraAdapter({ focusListing, cancelFocus })

    await adapter.focusListing('partner-marsa', { anchorY: 0.3 })

    expect(focusListing).toHaveBeenCalledWith('partner-marsa', {
      anchorX: 0.5,
      anchorY: 0.3,
      zoomDelta: 0.65,
      minZoom: 13.6,
      maxZoom: 17,
    })
    adapter.cancelFocus()
    expect(cancelFocus).toHaveBeenCalledTimes(1)
  })

  it('keeps listing selection behind an independent state port', async () => {
    const selectListing = vi.fn(async () => undefined)
    const adapter = createListingSelectionAdapter({ selectListing })

    expect(adapter.getSelectedListing()).toBeNull()
    await adapter.selectListing('maison-jasmin')
    expect(selectListing).toHaveBeenCalledWith('maison-jasmin')
    expect(adapter.getSelectedListing()).toBe('maison-jasmin')
  })
})
