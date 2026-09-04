export const MAP_SHEET_GESTURE_PHASE = Object.freeze({
  START: 'start',
  MOVE: 'move',
  END: 'end',
  CANCEL: 'cancel',
})

function finite(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function createMapSheetGestureFrame({
  phase,
  pointerId,
  pointerType = 'unknown',
  x = 0,
  y = 0,
  startX = x,
  startY = y,
  deltaX = x - startX,
  deltaY = y - startY,
  velocityX = 0,
  velocityY = 0,
  time = 0,
  origin = {},
} = {}) {
  return Object.freeze({
    phase,
    pointerId,
    pointerType,
    x: finite(x),
    y: finite(y),
    startX: finite(startX),
    startY: finite(startY),
    deltaX: finite(deltaX),
    deltaY: finite(deltaY),
    velocityX: finite(velocityX),
    velocityY: finite(velocityY),
    time: finite(time),
    origin: Object.freeze({ ...origin }),
  })
}

export function assertMapSheetGesturePort(port) {
  for (const method of ['subscribe', 'claim', 'release', 'destroy']) {
    if (typeof port?.[method] !== 'function') throw new TypeError(`Map Sheet GesturePort requires ${method}()`)
  }
  return port
}
