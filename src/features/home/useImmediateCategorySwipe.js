import { useEffect, useRef } from 'react'

const START_THRESHOLD_PX = 2
const HORIZONTAL_BIAS = 1.04
const CLICK_SUPPRESS_MS = 320
const DRAG_GAIN = 0.82
const MAX_MOMENTUM_PX_PER_MS = 0.9
const MOMENTUM_DECAY = 0.875

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function useImmediateCategorySwipe() {
  const railRef = useRef(null)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return undefined

    let axis = 'idle'
    let startX = 0
    let startY = 0
    let startScrollLeft = 0
    let lastScrollLeft = 0
    let lastMoveTime = 0
    let velocity = 0
    let momentumRaf = 0
    let momentumTime = 0
    let suppressClickUntil = 0

    const stopMomentum = () => {
      if (momentumRaf) cancelAnimationFrame(momentumRaf)
      momentumRaf = 0
      momentumTime = 0
      velocity = 0
    }

    const startMomentum = () => {
      if (Math.abs(velocity) < 0.035) return
      velocity = clamp(velocity, -MAX_MOMENTUM_PX_PER_MS, MAX_MOMENTUM_PX_PER_MS)
      momentumTime = performance.now()

      const step = (time) => {
        const dt = Math.min(22, Math.max(1, time - momentumTime))
        momentumTime = time
        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth)
        const next = clamp(rail.scrollLeft + velocity * dt, 0, maxScroll)
        const hitEdge = next === 0 || next === maxScroll
        rail.scrollLeft = next
        velocity *= Math.pow(MOMENTUM_DECAY, dt / 16.67)

        if (hitEdge || Math.abs(velocity) < 0.02) {
          stopMomentum()
          return
        }
        momentumRaf = requestAnimationFrame(step)
      }

      momentumRaf = requestAnimationFrame(step)
    }

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return
      stopMomentum()
      const touch = event.touches[0]
      axis = 'pending'
      startX = touch.clientX
      startY = touch.clientY
      startScrollLeft = rail.scrollLeft
      lastScrollLeft = rail.scrollLeft
      lastMoveTime = performance.now()
      rail.removeAttribute('data-dragging')
    }

    const onTouchMove = (event) => {
      if (axis === 'idle' || event.touches.length !== 1) return
      const touch = event.touches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)

      if (axis === 'pending') {
        if (absX < START_THRESHOLD_PX && absY < START_THRESHOLD_PX) return
        axis = absX > absY * HORIZONTAL_BIAS ? 'horizontal' : 'vertical'
        if (axis === 'horizontal') rail.setAttribute('data-dragging', 'true')
      }

      if (axis !== 'horizontal') return
      if (event.cancelable) event.preventDefault()

      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth)
      rail.scrollLeft = clamp(startScrollLeft - dx * DRAG_GAIN, 0, maxScroll)

      const now = performance.now()
      const dt = Math.max(1, now - lastMoveTime)
      const instantaneousVelocity = (rail.scrollLeft - lastScrollLeft) / dt
      velocity = velocity * 0.68 + instantaneousVelocity * 0.32
      lastScrollLeft = rail.scrollLeft
      lastMoveTime = now
    }

    const finishTouch = () => {
      if (axis === 'horizontal') {
        suppressClickUntil = performance.now() + CLICK_SUPPRESS_MS
        startMomentum()
      }
      axis = 'idle'
      rail.removeAttribute('data-dragging')
    }

    const onClickCapture = (event) => {
      if (performance.now() >= suppressClickUntil) return
      const target = event.target instanceof Element ? event.target : null
      if (!target?.closest('button[data-category-id]')) return
      event.preventDefault()
      event.stopPropagation()
    }

    rail.addEventListener('touchstart', onTouchStart, { passive: true })
    rail.addEventListener('touchmove', onTouchMove, { passive: false })
    rail.addEventListener('touchend', finishTouch, { passive: true })
    rail.addEventListener('touchcancel', finishTouch, { passive: true })
    rail.addEventListener('click', onClickCapture, true)

    return () => {
      stopMomentum()
      rail.removeEventListener('touchstart', onTouchStart)
      rail.removeEventListener('touchmove', onTouchMove)
      rail.removeEventListener('touchend', finishTouch)
      rail.removeEventListener('touchcancel', finishTouch)
      rail.removeEventListener('click', onClickCapture, true)
      rail.removeAttribute('data-dragging')
    }
  }, [])

  return railRef
}
