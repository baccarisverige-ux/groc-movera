import { MAP_SHEET_GESTURE_PHASE, createMapSheetGestureFrame } from '../../ports/GesturePort.js'

function defaultNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function defaultGlobalTarget() {
  return typeof window !== 'undefined' ? window : null
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
  globalTarget = defaultGlobalTarget(),
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

  const finish = (phase, event, { force = false } = {}) => {
    if (!active) return false

    const matchedTouch = touchById(event, active.identifier)
    const hasRemainingTouches = Number(event?.touches?.length) > 0
    if (!force && !matchedTouch && hasRemainingTouches) return false

    const touch = matchedTouch || {
      identifier: active.identifier,
      clientX: active.lastX,
      clientY: active.lastY,
    }
    const frame = makeFrame(phase, event, touch)
    const identifier = active.identifier
    emit(frame)
    claimed.delete(identifier)
    active = null
    return true
  }

  const cancelStaleSession = (event) => finish(
    MAP_SHEET_GESTURE_PHASE.CANCEL,
    { timeStamp: event?.timeStamp },
    { force: true },
  )

  const onTouchStart = (event) => {
    if (destroyed || event?.touches?.length !== 1) return

    // Safari can terminate a scroll/touch sequence outside the sheet while the
    // transformed surface is moving. A fresh single-touch start proves the old
    // session is stale, so cancel it before accepting the new interaction.
    if (active) cancelStaleSession(event)

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

  const onTouchEnd = (event) => finish(MAP_SHEET_GESTURE_PHASE.END, event)
  const onTouchCancel = (event) => finish(MAP_SHEET_GESTURE_PHASE.CANCEL, event)
  const onGlobalBlur = (event) => finish(MAP_SHEET_GESTURE_PHASE.CANCEL, event, { force: true })

  surface.addEventListener('touchstart', onTouchStart, { passive: true })
  surface.addEventListener('touchmove', onTouchMove, { passive: false })
  surface.addEventListener('touchend', onTouchEnd, { passive: true })
  surface.addEventListener('touchcancel', onTouchCancel, { passive: true })

  // A touch can finish outside the transformed sheet on iOS. Capture the end
  // at window level so ownership and claimed pointers cannot survive into the
  // next open → scroll → focus cycle.
  if (globalTarget && globalTarget !== surface) {
    globalTarget.addEventListener?.('touchend', onTouchEnd, true)
    globalTarget.addEventListener?.('touchcancel', onTouchCancel, true)
    globalTarget.addEventListener?.('blur', onGlobalBlur)
  }

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
    if (globalTarget && globalTarget !== surface) {
      globalTarget.removeEventListener?.('touchend', onTouchEnd, true)
      globalTarget.removeEventListener?.('touchcancel', onTouchCancel, true)
      globalTarget.removeEventListener?.('blur', onGlobalBlur)
    }
  }

  return Object.freeze({ subscribe, claim, release, destroy })
}
