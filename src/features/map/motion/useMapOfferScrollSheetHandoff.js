import { useEffect, useRef } from 'react'

const EDGE_EPSILON_PX = 2
const DRAG_ACTIVATION_PX = 5
const CLICK_SUPPRESSION_MS = 320

/**
 * Keeps native list scrolling only while the sheet is fully attached.
 * Everywhere else a deliberate vertical gesture started from an offer owns
 * the sheet. When the expanded list is already at its top edge, a downward
 * gesture is handed back to the sheet so the first offer can close it.
 *
 * Click suppression is scoped to the element where the drag started and is
 * short-lived, so a later tap on "Voir sur la carte" is never swallowed.
 */
export function useMapOfferScrollSheetHandoff({ expanded, externalDrag }) {
  const nodeRef = useRef(null)
  const gestureRef = useRef(null)
  const externalDragRef = useRef(externalDrag)
  const expandedRef = useRef(expanded)
  const clickGuardRef = useRef({ until: 0, origin: null })

  useEffect(() => { externalDragRef.current = externalDrag }, [externalDrag])
  useEffect(() => { expandedRef.current = expanded }, [expanded])

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return undefined

    const beginHandoff = (state, clientY, event) => {
      const started = externalDragRef.current?.start(state.startClientY)
      if (!started) return false
      state.handedOff = true
      event.preventDefault()
      event.stopPropagation()
      externalDragRef.current?.move(clientY)
      return true
    }

    const onTouchStart = (event) => {
      if (event.touches?.length !== 1) {
        gestureRef.current = null
        return
      }
      const touch = event.touches[0]
      const clientY = Number(touch?.clientY)
      if (!Number.isFinite(clientY)) {
        gestureRef.current = null
        return
      }
      const clientX = Number.isFinite(Number(touch?.clientX)) ? Number(touch.clientX) : 0
      gestureRef.current = {
        startClientX: clientX,
        startClientY: clientY,
        lastClientY: clientY,
        startTarget: event.target instanceof Element ? event.target : null,
        handedOff: false,
        horizontal: false,
      }
    }

    const onTouchMove = (event) => {
      const state = gestureRef.current
      const touch = event.touches?.[0]
      const clientY = Number(touch?.clientY)
      if (!state || !Number.isFinite(clientY)) return
      const clientX = Number.isFinite(Number(touch?.clientX)) ? Number(touch.clientX) : state.startClientX

      if (state.handedOff) {
        event.preventDefault()
        event.stopPropagation()
        externalDragRef.current?.move(clientY)
        state.lastClientY = clientY
        return
      }

      const totalX = clientX - state.startClientX
      const totalY = clientY - state.startClientY
      const absX = Math.abs(totalX)
      const absY = Math.abs(totalY)

      if (state.horizontal) return
      if (absX > DRAG_ACTIVATION_PX && absX > absY * 1.08) {
        state.horizontal = true
        return
      }
      if (absY < DRAG_ACTIVATION_PX || absY <= absX) return

      const atTop = node.scrollTop <= EDGE_EPSILON_PX
      const movingFingerDown = totalY > DRAG_ACTIVATION_PX

      // Midway/collapsed: the list is not allowed to become a competing
      // native scroll surface. A vertical gesture anywhere on an offer moves
      // the entire sheet.
      if (!expandedRef.current) {
        beginHandoff(state, clientY, event)
      // Fully expanded: preserve native scrolling, except at the top edge when
      // the user pulls downward from the first visible offer.
      } else if (atTop && movingFingerDown) {
        beginHandoff(state, clientY, event)
      }

      state.lastClientY = clientY
    }

    const finish = (cancel = false) => {
      const state = gestureRef.current
      gestureRef.current = null
      if (!state?.handedOff) return

      clickGuardRef.current = {
        until: performance.now() + CLICK_SUPPRESSION_MS,
        origin: state.startTarget,
      }

      if (cancel) externalDragRef.current?.cancel()
      else externalDragRef.current?.end()
    }

    const onClickCapture = (event) => {
      const guard = clickGuardRef.current
      if (!guard.origin || performance.now() > guard.until) {
        clickGuardRef.current = { until: 0, origin: null }
        return
      }

      const target = event.target instanceof Element ? event.target : null
      const sameGestureTarget = target
        && (guard.origin === target || guard.origin.contains(target) || target.contains(guard.origin))

      if (!sameGestureTarget) return
      clickGuardRef.current = { until: 0, origin: null }
      event.preventDefault()
      event.stopPropagation()
    }

    const onTouchEnd = () => finish(false)
    const onTouchCancel = () => finish(true)

    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    node.addEventListener('touchend', onTouchEnd, { passive: true })
    node.addEventListener('touchcancel', onTouchCancel, { passive: true })
    node.addEventListener('click', onClickCapture, true)

    return () => {
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('touchend', onTouchEnd)
      node.removeEventListener('touchcancel', onTouchCancel)
      node.removeEventListener('click', onClickCapture, true)
    }
  }, [])

  return nodeRef
}
