import { describe, expect, it } from 'vitest'
import { assertMapSheetGesturePort } from '../../src/features/map-sheet/ports/GesturePort.js'
import { assertMapSheetScrollPort } from '../../src/features/map-sheet/ports/ScrollPort.js'
import { createPointerGestureAdapter } from '../../src/features/map-sheet/adapters/browser/PointerGestureAdapter.js'
import { createIOSGestureAdapter } from '../../src/features/map-sheet/adapters/browser/IOSGestureAdapter.js'
import { createIOSScrollAdapter, normalizeIOSScrollSnapshot } from '../../src/features/map-sheet/adapters/browser/IOSScrollAdapter.js'

class FakeSurface {
  constructor() {
    this.listeners = new Map()
    this.captured = new Set()
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener)
  }

  dispatch(type, event) {
    event.target ??= this
    for (const listener of this.listeners.get(type) || []) listener(event)
  }

  setPointerCapture(id) { this.captured.add(id) }
  hasPointerCapture(id) { return this.captured.has(id) }
  releasePointerCapture(id) { this.captured.delete(id) }
}

function preventableEvent(fields = {}) {
  return {
    cancelable: true,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true },
    ...fields,
  }
}

function touch(identifier, clientX, clientY) {
  return { identifier, clientX, clientY }
}

describe('Map Sheet V2 browser adapters', () => {
  it('normalizes pointer input and can claim the current move synchronously', () => {
    const surface = new FakeSurface()
    const port = assertMapSheetGesturePort(createPointerGestureAdapter({
      surface,
      describeOrigin: () => ({ area: 'list', startsOnFirstOffer: true }),
    }))
    const frames = []

    port.subscribe((frame) => {
      frames.push(frame)
      if (frame.phase === 'move' && frame.deltaY > 10) port.claim(frame.pointerId)
    })

    surface.dispatch('pointerdown', preventableEvent({
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 100,
      clientY: 200,
      timeStamp: 10,
    }))
    const move = preventableEvent({
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 102,
      clientY: 240,
      timeStamp: 30,
    })
    surface.dispatch('pointermove', move)
    surface.dispatch('pointerup', preventableEvent({
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 102,
      clientY: 240,
      timeStamp: 40,
    }))

    expect(frames.map((frame) => frame.phase)).toEqual(['start', 'move', 'end'])
    expect(frames[1].deltaY).toBe(40)
    expect(frames[1].origin.startsOnFirstOffer).toBe(true)
    expect(move.defaultPrevented).toBe(true)
    expect(surface.captured.size).toBe(0)
    port.destroy()
  })

  it('releases a pointer sheet gesture when pointerup lands outside the transformed surface', () => {
    const surface = new FakeSurface()
    const globalTarget = new FakeSurface()
    const port = assertMapSheetGesturePort(createPointerGestureAdapter({
      surface,
      globalTarget,
      describeOrigin: () => ({ area: 'list', startsOnFirstOffer: true }),
    }))
    const frames = []

    port.subscribe((frame) => {
      frames.push(frame)
      if (frame.phase === 'move' && frame.deltaY > 10) port.claim(frame.pointerId)
    })

    surface.dispatch('pointerdown', preventableEvent({
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 100,
      clientY: 200,
      timeStamp: 10,
    }))
    surface.dispatch('pointermove', preventableEvent({
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 100,
      clientY: 250,
      timeStamp: 30,
    }))

    globalTarget.dispatch('pointerup', preventableEvent({
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 100,
      clientY: 250,
      timeStamp: 40,
    }))

    surface.dispatch('pointerdown', preventableEvent({
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 120,
      clientY: 220,
      timeStamp: 60,
    }))
    surface.dispatch('pointerup', preventableEvent({
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 120,
      clientY: 220,
      timeStamp: 70,
    }))

    expect(frames.map((frame) => frame.phase)).toEqual(['start', 'move', 'end', 'start', 'end'])
    expect(surface.captured.size).toBe(0)
    port.destroy()
  })

  it('self-heals a stale pointer session when a fresh primary interaction begins', () => {
    const surface = new FakeSurface()
    const port = assertMapSheetGesturePort(createPointerGestureAdapter({
      surface,
      globalTarget: null,
      describeOrigin: () => ({ area: 'list', startsOnFirstOffer: true }),
    }))
    const frames = []

    port.subscribe((frame) => frames.push(frame))

    surface.dispatch('pointerdown', preventableEvent({
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 100,
      clientY: 200,
      timeStamp: 10,
    }))

    surface.dispatch('pointerdown', preventableEvent({
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 120,
      clientY: 220,
      timeStamp: 60,
    }))
    surface.dispatch('pointerup', preventableEvent({
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 120,
      clientY: 220,
      timeStamp: 70,
    }))

    expect(frames.map((frame) => frame.phase)).toEqual(['start', 'cancel', 'start', 'end'])
    expect(frames[1].pointerId).toBe(7)
    expect(frames[2].pointerId).toBe(8)
    port.destroy()
  })

  it('uses a non-passive iOS move path that can stop Safari native scroll on the same frame', () => {
    const surface = new FakeSurface()
    const port = assertMapSheetGesturePort(createIOSGestureAdapter({
      surface,
      describeOrigin: () => ({ area: 'list', startsOnFirstOffer: true }),
    }))
    const frames = []

    port.subscribe((frame) => {
      frames.push(frame)
      if (frame.phase === 'move' && frame.deltaY > 10) port.claim(frame.pointerId)
    })

    surface.dispatch('touchstart', preventableEvent({
      touches: [touch(3, 120, 240)],
      changedTouches: [touch(3, 120, 240)],
      timeStamp: 10,
    }))
    const move = preventableEvent({
      touches: [touch(3, 120, 285)],
      changedTouches: [touch(3, 120, 285)],
      timeStamp: 30,
    })
    surface.dispatch('touchmove', move)
    surface.dispatch('touchend', preventableEvent({
      touches: [],
      changedTouches: [touch(3, 120, 285)],
      timeStamp: 40,
    }))

    expect(frames.map((frame) => frame.phase)).toEqual(['start', 'move', 'end'])
    expect(frames[1].deltaY).toBe(45)
    expect(move.defaultPrevented).toBe(true)
    port.destroy()
  })

  it('releases an iOS sheet gesture when touchend lands outside the transformed surface', () => {
    const surface = new FakeSurface()
    const globalTarget = new FakeSurface()
    const port = assertMapSheetGesturePort(createIOSGestureAdapter({
      surface,
      globalTarget,
      describeOrigin: () => ({ area: 'list', startsOnFirstOffer: true }),
    }))
    const frames = []

    port.subscribe((frame) => {
      frames.push(frame)
      if (frame.phase === 'move' && frame.deltaY > 10) port.claim(frame.pointerId)
    })

    surface.dispatch('touchstart', preventableEvent({
      touches: [touch(3, 120, 240)],
      changedTouches: [touch(3, 120, 240)],
      timeStamp: 10,
    }))
    surface.dispatch('touchmove', preventableEvent({
      touches: [touch(3, 120, 285)],
      changedTouches: [touch(3, 120, 285)],
      timeStamp: 30,
    }))

    globalTarget.dispatch('touchend', preventableEvent({
      touches: [],
      changedTouches: [touch(3, 120, 285)],
      timeStamp: 40,
    }))

    surface.dispatch('touchstart', preventableEvent({
      touches: [touch(4, 130, 250)],
      changedTouches: [touch(4, 130, 250)],
      timeStamp: 60,
    }))
    surface.dispatch('touchend', preventableEvent({
      touches: [],
      changedTouches: [touch(4, 130, 250)],
      timeStamp: 70,
    }))

    expect(frames.map((frame) => frame.phase)).toEqual(['start', 'move', 'end', 'start', 'end'])
    port.destroy()
  })

  it('self-heals a stale iOS session when a fresh single-touch interaction begins', () => {
    const surface = new FakeSurface()
    const port = assertMapSheetGesturePort(createIOSGestureAdapter({
      surface,
      globalTarget: null,
      describeOrigin: () => ({ area: 'list', startsOnFirstOffer: true }),
    }))
    const frames = []

    port.subscribe((frame) => frames.push(frame))

    surface.dispatch('touchstart', preventableEvent({
      touches: [touch(3, 120, 240)],
      changedTouches: [touch(3, 120, 240)],
      timeStamp: 10,
    }))

    // Deliberately omit touchend/touchcancel to model Safari losing the end
    // while the sheet transitions from a native scrolling layer.
    surface.dispatch('touchstart', preventableEvent({
      touches: [touch(4, 130, 250)],
      changedTouches: [touch(4, 130, 250)],
      timeStamp: 60,
    }))
    surface.dispatch('touchend', preventableEvent({
      touches: [],
      changedTouches: [touch(4, 130, 250)],
      timeStamp: 70,
    }))

    expect(frames.map((frame) => frame.phase)).toEqual(['start', 'cancel', 'start', 'end'])
    expect(frames[1].pointerId).toBe(3)
    expect(frames[2].pointerId).toBe(4)
    port.destroy()
  })

  it('normalizes iOS rubber-band scroll values before ownership decisions', () => {
    const topBounce = normalizeIOSScrollSnapshot({
      scrollTop: -18,
      scrollHeight: 1200,
      clientHeight: 600,
      edgeEpsilonPx: 2,
    })
    expect(topBounce.scrollTop).toBe(0)
    expect(topBounce.atTop).toBe(true)

    const bottomBounce = normalizeIOSScrollSnapshot({
      scrollTop: 680,
      scrollHeight: 1200,
      clientHeight: 600,
      edgeEpsilonPx: 2,
    })
    expect(bottomBounce.scrollTop).toBe(600)
    expect(bottomBounce.atBottom).toBe(true)
  })

  it('implements the ScrollPort contract without exposing browser behavior to core', () => {
    const element = { scrollTop: -4, scrollHeight: 1000, clientHeight: 500 }
    const port = assertMapSheetScrollPort(createIOSScrollAdapter({ element }))
    expect(port.getSnapshot()).toMatchObject({ scrollTop: 0, atTop: true, maxScrollTop: 500 })
    expect(() => assertMapSheetScrollPort({})).toThrow(/getSnapshot/)
  })
})
