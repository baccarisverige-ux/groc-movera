export const GESTURE = Object.freeze({
  NONE: 'none',
  PINCH: 'pinch',
  PHOTO: 'photo',
  LISTING: 'listing',
  MAP: 'map',
})

export const AXIS_LOCK_THRESHOLD = 10
export const SWIPE_THRESHOLD = 38

export function resolveAxis(dx, dy, threshold = AXIS_LOCK_THRESHOLD) {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (Math.max(ax, ay) < threshold) return GESTURE.NONE
  return ax >= ay ? GESTURE.LISTING : GESTURE.PHOTO
}

export function resolveGesture({ pointerCount, insideCarousel, dx = 0, dy = 0 }) {
  if (pointerCount >= 2) return GESTURE.PINCH
  if (insideCarousel) return resolveAxis(dx, dy)
  return GESTURE.MAP
}
