import { useEffect, useRef } from 'react'

const EDGE_EPSILON_PX = 1
const DIRECTION_EPSILON_PX = 2
const CLICK_SUPPRESSION_MS = 420

function isInteractiveTarget(target) {
  return target instanceof Element
    && Boolean(target.closest('button, a, input, select, textarea, [role="button"], [role="link"]'))
}

/**
 * Keeps native list scrolling when the sheet is fully open, while allowing
 * the sheet itself to be dragged from the first offer only when the sheet is
 * fully open and the list is already at its top edge. Midway/collapsed sheets
 * remain draggable only from their dedicated header/filter handles.
 *
 * This hook is intentionally isolated from the map engine.
 */
export function useMapOfferScrollSheetHandoff({ expanded, externalDrag }) {
  const nodeRef = useRef(null)
  const gestureRef = useRef(null)
  const externalDragRef = useRef(externalDrag)
  const expandedRef = useRef(expanded)
  const suppressedClickRef = useRef(null)

  useEffect(() => { externalDragRef.current = externalDrag }, [externalDrag])
  useEffect(() => { expandedRef.current = expanded }, [expanded])

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return undefined

    const beginHandoff = (state, clientY, event) => {
      const started = externalDragRef.current?.start(state.lastClientY)
      if (!started) return false
      state.handedOff = true
      suppressedClickRef.current = { card: state.originCard, until: performance.now() + CLICK_SUPPRESSION_MS }
      event.preventDefault()
      event.stopPropagation()
      externalDragRef.current?.move(clientY)
      return true
    }

    const onTouchStart = (event) => {
      const target = event.target
      if (isInteractiveTarget(target)) {
        gestureRef.current = null
        return
      }
      const clientY = event.touches?.[0]?.clientY
      const originCard = target instanceof Element ? target.closest('[data-listing-id]') : null
      const firstCard = node.querySelector('[data-listing-id]')
      gestureRef.current = Number.isFinite(clientY)
        ? { lastClientY: clientY, handedOff: false, originCard, fromFirstOffer: Boolean(originCard && originCard === firstCard) }
        : null
    }

    const onTouchMove = (event) => {
      const state = gestureRef.current
      const clientY = event.touches?.[0]?.clientY
      if (!state || !Number.isFinite(clientY)) return

      if (state.handedOff) {
        event.preventDefault()
        event.stopPropagation()
        externalDragRef.current?.move(clientY)
        state.lastClientY = clientY
        return
      }

      const deltaY = clientY - state.lastClientY
      const movedEnough = Math.abs(deltaY) > DIRECTION_EPSILON_PX
      const movingFingerDown = deltaY > DIRECTION_EPSILON_PX
      const atTop = node.scrollTop <= EDGE_EPSILON_PX

      // Once fully open, keep native scrolling. Only a downward gesture that
      // starts on the first offer at the top edge can pull the whole sheet.
      if (expandedRef.current && state.fromFirstOffer && atTop && movingFingerDown && movedEnough) {
        beginHandoff(state, clientY, event)
      }

      state.lastClientY = clientY
    }

    const finish = (cancel = false) => {
      const state = gestureRef.current
      gestureRef.current = null
      if (!state?.handedOff) return
      if (cancel) externalDragRef.current?.cancel()
      else externalDragRef.current?.end()
    }

    const onClickCapture = (event) => {
      const suppressed = suppressedClickRef.current
      suppressedClickRef.current = null
      if (!suppressed || performance.now() > suppressed.until) return
      if (suppressed.card && event.target instanceof Node && !suppressed.card.contains(event.target)) return
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
