import { MAP_SHEET_GESTURE_PHASE, createMapSheetGestureFrame } from '../../ports/GesturePort.js'

function defaultNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function firstTouch(event) {
  return event?.touches?.[0] || event?.changedTouches?.[0] || null
}

function touchById(event, identifier) {
  const collections = [event?.touches, event?.changedTouches]
  for (const touches of collections) {
    if (!touches) continue
    for (const touch of Array.from(touches)) {
      if ((touch?.identifier ?? 0) === identifier) return touch
    }
  }
  return null
}

export function createIOSGestureAdapter({
  surface,
  describeOrigin = () => ({}),
  now = defaultNow,
} = {}) {
  if (!surface?.addEventListener || !surface?.removeEventListener) {
    throw new TypeError('IOSGestureAdapter requires an EventTarget-like surface')
  }

  const listeners = new Set()
  const claimed = new Set()
  let active = null
  let destroyed = false

  const emit = (frame) => {
    for (const listener of listeners) listener(frame)
  }

  const makeFrame = (phase, event, touch, state = active) => {
    const time = Number(event?.timeStamp) || now()
    const x = Number(touch?.clientX) || 0
    const y = Number(touch?.clientY) || 0
    const elapsedMs = state ? Math.max(1, time - state.lastTime) : 1
    const velocityX = state ? ((x - state.lastX) / elapsedMs) * 1000 : 0
    const velocityY = state ? ((y - state.lastY) / elapsedMs) * 1000 : 0

    return createMapSheetGestureFrame({
      phase,
      pointerId: touch?.identifier ?? 0,
      pointerType: 'touch',
      x,
      y,
      startX: state?.startX ?? x,
      startY: state?.startY ?? y,
      deltaX: x - (state?.startX ?? x),
      deltaY: y - (state?.startY ?? y),
      velocityX,
      velocityY,
      time,
      origin: state?.origin ?? describeOrigin(event?.target),
    })
  }

  const onTouchStart = (event) => {
    if (destroyed || active || event?.touches?.length !== 1) return
    const touch = firstTouch(event)
    if (!touch) return
    const frame = makeFrame(MAP_SHEET_GESTURE_PHASE.START, event, touch, null)
    active = {
      identifier: frame.pointerId,
      startX: frame.x,
      startY: frame.y,
      lastX: frame.x,
      lastY: frame.y,
      lastTime: frame.time,
      origin: frame.origin,
    }
    emit(frame)
  }

  const onTouchMove = (event) => {
    if (!active) return
    const touch = touchById(event, active.identifier)
    if (!touch) return
    const frame = makeFrame(MAP_SHEET_GESTURE_PHASE.MOVE, event, touch)
    emit(frame)

    // The listener may claim synchronously while processing this exact frame.
    // Re-check after emit so Safari's current touchmove can be cancelled before
    // native scrolling wins ownership.
    if (claimed.has(active.identifier) && event?.cancelable) event.preventDefault?.()

    active.lastX = frame.x
    active.lastY = frame.y
    active.lastTime = frame.time
  }

  const finish = (phase, event) => {
    if (!active) return
    const touch = touchById(event, active.identifier) || {
      identifier: active.identifier,
      clientX: active.lastX,
      clientY: active.lastY,
    }
    const frame = makeFrame(phase, event, touch)
    emit(frame)
    claimed.delete(active.identifier)
    active = null
  }

  const onTouchEnd = (event) => finish(MAP_SHEET_GESTURE_PHASE.END, event)
  const onTouchCancel = (event) => finish(MAP_SHEET_GESTURE_PHASE.CANCEL, event)

  surface.addEventListener('touchstart', onTouchStart, { passive: true })
  surface.addEventListener('touchmove', onTouchMove, { passive: false })
  surface.addEventListener('touchend', onTouchEnd, { passive: true })
  surface.addEventListener('touchcancel', onTouchCancel, { passive: true })

  const subscribe = (listener) => {
    if (typeof listener !== 'function') throw new TypeError('GesturePort subscriber must be a function')
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const claim = (pointerId) => {
    if (!active || pointerId !== active.identifier) return false
    claimed.add(pointerId)
    return true
  }

  const release = (pointerId) => {
    claimed.delete(pointerId)
    return true
  }

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    listeners.clear()
    claimed.clear()
    active = null
    surface.removeEventListener('touchstart', onTouchStart)
    surface.removeEventListener('touchmove', onTouchMove)
    surface.removeEventListener('touchend', onTouchEnd)
    surface.removeEventListener('touchcancel', onTouchCancel)
  }

  return Object.freeze({ subscribe, claim, release, destroy })
}
