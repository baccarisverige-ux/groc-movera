import { MAP_SHEET_GESTURE_PHASE, createMapSheetGestureFrame } from '../../ports/GesturePort.js'

function defaultNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function defaultGlobalTarget() {
  return typeof window !== 'undefined' ? window : null
}

function pointerIdOf(event) {
  return event?.pointerId ?? 1
}

function isPrimaryPointer(event) {
  if (event?.isPrimary === false) return false
  if (event?.pointerType === 'mouse' && Number(event?.button) !== 0) return false
  return true
}

export function createPointerGestureAdapter({
  surface,
  describeOrigin = () => ({}),
  now = defaultNow,
  globalTarget = defaultGlobalTarget(),
} = {}) {
  if (!surface?.addEventListener || !surface?.removeEventListener) {
    throw new TypeError('PointerGestureAdapter requires an EventTarget-like surface')
  }

  const listeners = new Set()
  const claimed = new Set()
  let active = null
  let destroyed = false

  const emit = (frame) => {
    for (const listener of listeners) listener(frame)
  }

  const makeFrame = (phase, event, state = active) => {
    const time = Number(event?.timeStamp) || now()
    const x = Number(event?.clientX) || 0
    const y = Number(event?.clientY) || 0
    const elapsedMs = state ? Math.max(1, time - state.lastTime) : 1
    const velocityX = state ? ((x - state.lastX) / elapsedMs) * 1000 : 0
    const velocityY = state ? ((y - state.lastY) / elapsedMs) * 1000 : 0

    return createMapSheetGestureFrame({
      phase,
      pointerId: pointerIdOf(event),
      pointerType: event?.pointerType || 'pointer',
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

  function release(pointerId) {
    claimed.delete(pointerId)
    try {
      if (surface.hasPointerCapture?.(pointerId)) surface.releasePointerCapture?.(pointerId)
    } catch { /* optional browser capability */ }
    return true
  }

  const finish = (phase, event, { force = false } = {}) => {
    if (!active) return false
    if (!force && pointerIdOf(event) !== active.pointerId) return false

    const pointerId = active.pointerId
    const frameEvent = force
      ? {
          pointerId,
          pointerType: active.pointerType,
          clientX: active.lastX,
          clientY: active.lastY,
          timeStamp: event?.timeStamp || now(),
        }
      : event
    const frame = makeFrame(phase, frameEvent)
    emit(frame)
    release(pointerId)
    active = null
    return true
  }

  const cancelStaleSession = (event) => finish(
    MAP_SHEET_GESTURE_PHASE.CANCEL,
    event,
    { force: true },
  )

  const onPointerDown = (event) => {
    if (destroyed || !isPrimaryPointer(event)) return

    const nextPointerId = pointerIdOf(event)
    if (active) {
      if (nextPointerId === active.pointerId) return
      cancelStaleSession(event)
    }

    const frame = makeFrame(MAP_SHEET_GESTURE_PHASE.START, event, null)
    active = {
      pointerId: frame.pointerId,
      pointerType: frame.pointerType,
      startX: frame.x,
      startY: frame.y,
      lastX: frame.x,
      lastY: frame.y,
      lastTime: frame.time,
      origin: frame.origin,
    }
    emit(frame)
  }

  const onPointerMove = (event) => {
    if (!active || pointerIdOf(event) !== active.pointerId) return
    const frame = makeFrame(MAP_SHEET_GESTURE_PHASE.MOVE, event)
    emit(frame)

    if (claimed.has(active.pointerId) && event?.cancelable) event.preventDefault?.()

    active.lastX = frame.x
    active.lastY = frame.y
    active.lastTime = frame.time
  }

  const onPointerUp = (event) => finish(MAP_SHEET_GESTURE_PHASE.END, event)
  const onPointerCancel = (event) => finish(MAP_SHEET_GESTURE_PHASE.CANCEL, event)
  const onGlobalBlur = (event) => finish(MAP_SHEET_GESTURE_PHASE.CANCEL, event, { force: true })

  surface.addEventListener('pointerdown', onPointerDown, { passive: true })
  surface.addEventListener('pointermove', onPointerMove, { passive: false })
  surface.addEventListener('pointerup', onPointerUp, { passive: true })
  surface.addEventListener('pointercancel', onPointerCancel, { passive: true })

  if (globalTarget && globalTarget !== surface) {
    globalTarget.addEventListener?.('pointerup', onPointerUp, true)
    globalTarget.addEventListener?.('pointercancel', onPointerCancel, true)
    globalTarget.addEventListener?.('blur', onGlobalBlur)
  }

  const subscribe = (listener) => {
    if (typeof listener !== 'function') throw new TypeError('GesturePort subscriber must be a function')
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function claim(pointerId) {
    if (!active || pointerId !== active.pointerId) return false
    claimed.add(pointerId)
    try { surface.setPointerCapture?.(pointerId) } catch { /* optional browser capability */ }
    return true
  }

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    if (active) release(active.pointerId)
    listeners.clear()
    claimed.clear()
    active = null
    surface.removeEventListener('pointerdown', onPointerDown)
    surface.removeEventListener('pointermove', onPointerMove)
    surface.removeEventListener('pointerup', onPointerUp)
    surface.removeEventListener('pointercancel', onPointerCancel)
    if (globalTarget && globalTarget !== surface) {
      globalTarget.removeEventListener?.('pointerup', onPointerUp, true)
      globalTarget.removeEventListener?.('pointercancel', onPointerCancel, true)
      globalTarget.removeEventListener?.('blur', onGlobalBlur)
    }
  }

  return Object.freeze({ subscribe, claim, release, destroy })
}
