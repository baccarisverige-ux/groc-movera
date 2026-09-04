import {
  MAP_SHEET_GESTURE_OWNER,
  beginMapSheetDrag,
  beginMapSheetInteraction,
  beginMapSheetListScroll,
  cancelMapSheetInteraction,
  clampMapSheetProgress,
  endMapSheetInteraction,
  resolveMapSheetGestureOwner,
  updateMapSheetDrag,
} from '../core/index.js'
import {
  MAP_SHEET_GESTURE_PHASE,
  assertMapSheetGesturePort,
  assertMapSheetScrollPort,
} from '../ports/index.js'

function positiveDistance(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1
}

function finite(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function createMapSheetGestureCoordinator({
  controller,
  gesture,
  scroll,
  getDistancePx,
  getVisualProgress,
  policy,
  onGestureStart = () => {},
  onSheetClaim = () => {},
  onSheetRelease = () => {},
} = {}) {
  if (typeof controller?.dispatch !== 'function' || typeof controller?.getState !== 'function') {
    throw new TypeError('MapSheetGestureCoordinator requires a controller with dispatch() and getState()')
  }
  assertMapSheetGesturePort(gesture)
  assertMapSheetScrollPort(scroll)
  if (typeof getDistancePx !== 'function') throw new TypeError('MapSheetGestureCoordinator requires getDistancePx()')
  if (typeof getVisualProgress !== 'function') throw new TypeError('MapSheetGestureCoordinator requires getVisualProgress()')

  let session = null
  let destroyed = false

  const releaseClaim = () => {
    if (!session?.sheetClaimed) return
    gesture.release(session.pointerId)
    session.sheetClaimed = false
    onSheetRelease()
  }

  const finish = (frame, cancel = false) => {
    if (!session || frame.pointerId !== session.pointerId) return

    if (session.sheetClaimed) {
      const distance = positiveDistance(getDistancePx())
      const velocity = cancel ? 0 : -finite(session.lastVelocityY) / distance
      if (cancel) controller.dispatch(cancelMapSheetInteraction())
      else controller.dispatch(endMapSheetInteraction(velocity))
      releaseClaim()
    } else if (cancel) {
      controller.dispatch(cancelMapSheetInteraction())
    } else {
      controller.dispatch(endMapSheetInteraction(0))
    }

    session = null
  }

  const onFrame = (frame) => {
    if (destroyed || !frame) return

    if (frame.phase === MAP_SHEET_GESTURE_PHASE.START) {
      if (session) releaseClaim()
      onGestureStart(frame)
      session = {
        pointerId: frame.pointerId,
        startProgress: clampMapSheetProgress(getVisualProgress()),
        dragBaselineProgress: null,
        dragBaselineY: null,
        sheetClaimed: false,
        lastVelocityY: 0,
      }
      controller.dispatch(beginMapSheetInteraction({
        origin: frame.origin,
        x: frame.x,
        y: frame.y,
        time: frame.time,
      }))
      return
    }

    if (!session || frame.pointerId !== session.pointerId) return

    if (frame.phase === MAP_SHEET_GESTURE_PHASE.END) {
      finish(frame, false)
      return
    }

    if (frame.phase === MAP_SHEET_GESTURE_PHASE.CANCEL) {
      finish(frame, true)
      return
    }

    if (frame.phase !== MAP_SHEET_GESTURE_PHASE.MOVE) return

    const machineState = controller.getState()
    const owner = resolveMapSheetGestureOwner({
      position: machineState.position,
      progress: getVisualProgress(),
      deltaX: frame.deltaX,
      deltaY: frame.deltaY,
      origin: frame.origin,
      scroll: scroll.getSnapshot(),
    }, policy)

    if (owner === MAP_SHEET_GESTURE_OWNER.LIST) {
      if (machineState.mode === 'tap-pending') controller.dispatch(beginMapSheetListScroll())
      return
    }

    if (owner !== MAP_SHEET_GESTURE_OWNER.SHEET) return

    if (!session.sheetClaimed) {
      const handoffFromList = machineState.mode === 'list-scrolling'
      session.dragBaselineProgress = handoffFromList
        ? clampMapSheetProgress(getVisualProgress())
        : session.startProgress
      session.dragBaselineY = handoffFromList ? frame.y : frame.startY
      session.sheetClaimed = gesture.claim(frame.pointerId)
      if (!session.sheetClaimed) return
      onSheetClaim(frame)
      controller.dispatch(beginMapSheetDrag())
    }

    const distance = positiveDistance(getDistancePx())
    const deltaY = frame.y - session.dragBaselineY
    const progress = clampMapSheetProgress(session.dragBaselineProgress - deltaY / distance)
    session.lastVelocityY = finite(frame.velocityY)
    controller.dispatch(updateMapSheetDrag(progress))
  }

  const unsubscribe = gesture.subscribe(onFrame)

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    unsubscribe?.()
    releaseClaim()
    session = null
  }

  return Object.freeze({ destroy })
}
