import { useEffect, useRef } from 'react'

const EDGE_EPSILON_PX = 1
const DIRECTION_EPSILON_PX = 2

/**
 * Keeps native list scrolling when the sheet is fully open, while allowing
 * the sheet itself to be dragged directly from an offer/card image whenever
 * it is not fully open. At the top of an expanded list, a downward gesture is
 * handed back to the sheet so it can close from the card as well.
 *
 * This hook is intentionally isolated from the map engine.
 */
export function useMapOfferScrollSheetHandoff({ expanded, externalDrag }) {
  const nodeRef = useRef(null)
  const gestureRef = useRef(null)
  const externalDragRef = useRef(externalDrag)
  const expandedRef = useRef(expanded)
  const suppressNextClickRef = useRef(false)

  useEffect(() => { externalDragRef.current = externalDrag }, [externalDrag])
  useEffect(() => { expandedRef.current = expanded }, [expanded])

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return undefined

    const beginHandoff = (state, clientY, event) => {
      const started = externalDragRef.current?.start(state.lastClientY)
      if (!started) return false
      state.handedOff = true
      suppressNextClickRef.current = true
      event.preventDefault()
      event.stopPropagation()
      externalDragRef.current?.move(clientY)
      return true
    }

    const onTouchStart = (event) => {
      const clientY = event.touches?.[0]?.clientY
      gestureRef.current = Number.isFinite(clientY)
        ? { lastClientY: clientY, handedOff: false }
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

      // While collapsed or midway, the list is not a scrolling surface: any
      // deliberate vertical gesture from a card/image owns the whole sheet.
      if (!expandedRef.current && movedEnough) {
        beginHandoff(state, clientY, event)
      // Once fully open, keep native scrolling. Only a downward gesture at the
      // top edge hands control back to the sheet so the user can close it.
      } else if (expandedRef.current && atTop && movingFingerDown) {
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
      if (!suppressNextClickRef.current) return
      suppressNextClickRef.current = false
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
