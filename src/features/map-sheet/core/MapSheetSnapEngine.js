import { DEFAULT_MAP_SHEET_GESTURE_POLICY } from './MapSheetGesturePolicy.js'
import { clampMapSheetProgress } from './MapSheetState.js'

function nearestSnapIndex(points, progress) {
  let bestIndex = 0
  let bestDistance = Infinity

  points.forEach((point, index) => {
    const distance = Math.abs(point.progress - progress)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })

  return bestIndex
}

export function resolveMapSheetSnap({ progress = 0, velocity = 0, policy = DEFAULT_MAP_SHEET_GESTURE_POLICY } = {}) {
  const currentProgress = clampMapSheetProgress(progress)
  const normalizedVelocity = Number.isFinite(Number(velocity)) ? Number(velocity) : 0
  const points = policy.snapPoints
  const projectedProgress = clampMapSheetProgress(
    currentProgress + normalizedVelocity * policy.velocityProjectionSeconds,
  )

  let index = nearestSnapIndex(points, projectedProgress)

  if (Math.abs(normalizedVelocity) >= policy.fastSwipeVelocity) {
    const currentIndex = nearestSnapIndex(points, currentProgress)
    index = normalizedVelocity > 0
      ? Math.min(points.length - 1, Math.max(index, currentIndex + 1))
      : Math.max(0, Math.min(index, currentIndex - 1))
  }

  return points[index]
}

export function getMapSheetSnapPoint(position, policy = DEFAULT_MAP_SHEET_GESTURE_POLICY) {
  return policy.snapPoints.find((point) => point.position === position) ?? policy.snapPoints[0]
}
