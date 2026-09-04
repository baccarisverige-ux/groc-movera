import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useDragControls, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from './runtime.js'

const DEFAULT_SPRING = Object.freeze({
  stiffness: 430,
  damping: 38,
  mass: 0.82,
  restDelta: 0.35,
  restSpeed: 2,
})

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function nearestIndex(values, value) {
  let bestIndex = 0
  let bestDistance = Infinity
  values.forEach((candidate, index) => {
    const distance = Math.abs(candidate - value)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}

function resolveSnapProgress({ distance, currentY, fastSwipeVelocity, snapRatios, velocityProjectionSeconds, velocityY }) {
  const points = snapRatios.map((ratio) => distance * ratio)
  const projected = clamp(currentY + velocityY * velocityProjectionSeconds, 0, distance)
  let index = nearestIndex(points, projected)

  if (Math.abs(velocityY) >= fastSwipeVelocity) {
    const currentIndex = nearestIndex(points, currentY)
    index = velocityY > 0
      ? Math.min(points.length - 1, Math.max(index, currentIndex + 1))
      : Math.max(0, Math.min(index, currentIndex - 1))
  }

  return clamp(1 - snapRatios[index])
}

export function SnapSheetMotionSurface({
  ariaLabel,
  children,
  className,
  collapsedVisiblePx = 62,
  expandedThreshold = 0.86,
  fastSwipeVelocity = 680,
  onProgressChange,
  snapRatios = [0, 0.5, 1],
  spring = DEFAULT_SPRING,
  testId = 'motion-snap-surface',
  toggleThreshold = 0.72,
  velocityProjectionSeconds = 0.16,
}) {
  const surfaceRef = useRef(null)
  const collapsedYRef = useRef(0)
  const progressRef = useRef(0)
  const progressCallbackRef = useRef(onProgressChange)
  const lastReportedProgressRef = useRef(0)
  const animationRef = useRef(null)
  const snapProgressTargetRef = useRef(null)
  const snapVelocityRef = useRef(0)
  const suppressClickRef = useRef(false)
  const externalDragRef = useRef(null)
  const y = useMotionValue(0)
  const progressMotion = useTransform(y, (latest) => {
    const distance = collapsedYRef.current
    if (distance <= 0) return 0
    return clamp(1 - clamp(latest, 0, distance) / distance)
  })
  const dragControls = useDragControls()
  const reduceMotion = useReducedMotion()
  const [collapsedY, setCollapsedY] = useState(1)
  const [progress, setProgress] = useState(0)

  useEffect(() => { progressCallbackRef.current = onProgressChange }, [onProgressChange])
  useEffect(() => () => animationRef.current?.stop?.(), [])

  const animateToProgress = (nextProgress, velocity = 0) => {
    const boundedProgress = clamp(Number(nextProgress) || 0)
    const distance = collapsedYRef.current
    const target = (1 - boundedProgress) * distance

    snapProgressTargetRef.current = boundedProgress
    snapVelocityRef.current = velocity
    animationRef.current?.stop?.()

    if (reduceMotion) {
      y.set(target)
      return
    }

    animationRef.current = animate(y, target, {
      type: 'spring',
      ...DEFAULT_SPRING,
      ...spring,
      velocity,
    })
  }

  useMotionValueEvent(y, 'change', (latest) => {
    const distance = collapsedYRef.current
    if (distance <= 0) return
    const next = clamp(1 - clamp(latest, 0, distance) / distance)
    progressRef.current = next

    const critical = next <= 0.015 || next >= 0.985 || Math.abs(next - 0.5) <= 0.008
    setProgress((current) => (Math.abs(current - next) < 0.008 && !critical ? current : next))

    if (Math.abs(lastReportedProgressRef.current - next) >= 0.018 || critical) {
      lastReportedProgressRef.current = next
      progressCallbackRef.current?.(next)
    }
  })

  useLayoutEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return undefined

    const measure = () => {
      const height = surface.getBoundingClientRect().height
      const nextDistance = Math.max(1, height - collapsedVisiblePx)
      const previousDistance = collapsedYRef.current
      const preservedProgress = previousDistance > 0 ? progressRef.current : 0
      const distanceChanged = Math.abs(nextDistance - previousDistance) > 0.5

      collapsedYRef.current = nextDistance
      setCollapsedY(nextDistance)
      y.set((1 - preservedProgress) * nextDistance)

      const snapProgress = snapProgressTargetRef.current
      if (!distanceChanged || snapProgress === null || externalDragRef.current) return

      const target = (1 - snapProgress) * nextDistance
      animationRef.current?.stop?.()
      if (reduceMotion || Math.abs(snapProgress - preservedProgress) <= 0.002) {
        y.set(target)
        return
      }
      animationRef.current = animate(y, target, {
        type: 'spring',
        ...DEFAULT_SPRING,
        ...spring,
        velocity: snapVelocityRef.current,
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(surface)
    return () => observer.disconnect()
  }, [collapsedVisiblePx, reduceMotion, spring, y])

  const startDrag = (event) => {
    snapProgressTargetRef.current = null
    animationRef.current?.stop?.()
    suppressClickRef.current = false
    dragControls.start(event)
  }

  const toggleExpanded = (event) => {
    if (suppressClickRef.current) {
      event?.preventDefault?.()
      suppressClickRef.current = false
      return
    }
    animateToProgress(progressRef.current > toggleThreshold ? 0 : 1)
  }

  const snapToProgress = (nextProgress) => {
    animateToProgress(nextProgress)
  }

  const startExternalDrag = (clientY) => {
    if (!Number.isFinite(clientY)) return false
    snapProgressTargetRef.current = null
    animationRef.current?.stop?.()
    suppressClickRef.current = true
    const now = performance.now()
    externalDragRef.current = {
      startClientY: clientY,
      startSheetY: clamp(y.get(), 0, collapsedYRef.current),
      lastClientY: clientY,
      lastAt: now,
      velocityY: 0,
    }
    return true
  }

  const moveExternalDrag = (clientY) => {
    const state = externalDragRef.current
    if (!state || !Number.isFinite(clientY)) return false
    const now = performance.now()
    const elapsedMs = Math.max(8, now - state.lastAt)
    state.velocityY = ((clientY - state.lastClientY) / elapsedMs) * 1000
    state.lastClientY = clientY
    state.lastAt = now
    y.set(clamp(state.startSheetY + (clientY - state.startClientY), 0, collapsedYRef.current))
    return true
  }

  const finishExternalDrag = ({ cancel = false } = {}) => {
    const state = externalDragRef.current
    if (!state) return false
    externalDragRef.current = null
    suppressClickRef.current = false

    const distance = collapsedYRef.current
    const currentY = clamp(y.get(), 0, distance)
    const velocityY = cancel ? 0 : state.velocityY
    animateToProgress(resolveSnapProgress({
      distance,
      currentY,
      fastSwipeVelocity,
      snapRatios,
      velocityProjectionSeconds,
      velocityY,
    }), velocityY)
    return true
  }

  const roundedProgress = Math.round(progress * 100) / 100
  const snapState = progress >= 0.985 ? 'expanded' : progress <= 0.015 ? 'collapsed' : 'moving'
  const externalDrag = {
    start: startExternalDrag,
    move: moveExternalDrag,
    end: () => finishExternalDrag(),
    cancel: () => finishExternalDrag({ cancel: true }),
  }

  return (
    <motion.section
      ref={surfaceRef}
      className={className}
      aria-label={ariaLabel}
      data-testid={testId}
      data-progress={roundedProgress}
      data-expanded={progress > expandedThreshold ? 'true' : 'false'}
      data-snap-state={snapState}
      data-motion-engine="motion"
      data-motion-boundary="shared"
      style={{ y }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: collapsedY }}
      dragElastic={{ top: 0.035, bottom: 0.035 }}
      dragMomentum={false}
      onDragStart={() => {
        snapProgressTargetRef.current = null
        suppressClickRef.current = true
      }}
      onDragEnd={(_, info) => {
        suppressClickRef.current = false
        const distance = collapsedYRef.current
        const currentY = clamp(y.get(), 0, distance)
        animateToProgress(resolveSnapProgress({
          distance,
          currentY,
          fastSwipeVelocity,
          snapRatios,
          velocityProjectionSeconds,
          velocityY: info.velocity.y,
        }), info.velocity.y)
      }}
    >
      {children({ progress, progressMotion, startDrag, toggleExpanded, snapToProgress, externalDrag })}
    </motion.section>
  )
}
