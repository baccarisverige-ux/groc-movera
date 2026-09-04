import { useEffect, useRef } from 'react'

const EDGE_EPSILON_PX = 2
const DRAG_ACTIVATION_PX = 10
const HORIZONTAL_BIAS = 1.08
const CLICK_SUPPRESSION_MS = 280
const INTERACTIVE_SELECTOR = 'button,a,[role="button"],input,select,textarea'
const HORIZONTAL_RAIL_SELECTOR = '.map-offer-sheet__property-rail,.map-offer-sheet__room-categories'

function asElement(value) {
  return value instanceof Element ? value : null
}

function interactiveOrigin(target, panel) {
  const element = asElement(target)
  if (!element) return null
  return element.closest(INTERACTIVE_SELECTOR) || (panel?.contains(element) ? element : null)
}

function startedInside(target, node) {
  const element = asElement(target)
  return Boolean(element && node?.contains(element))
}

function startedInHorizontalRail(target) {
  return Boolean(asElement(target)?.closest(HORIZONTAL_RAIL_SELECTOR))
}

/**
 * One gesture router owns the complete Map offer panel.
 *
 * Touch rules:
 * - collapsed/mid sheet: any deliberate vertical gesture in the panel drags it;
 * - expanded list: native vertical scrolling wins, except a downward pull at
 *   scrollTop=0, which hands control back to the sheet;
 * - horizontal property/room rails keep their native horizontal gesture.
 *
 * Mouse/pen rules:
 * - a deliberate vertical drag anywhere in the panel moves the sheet;
 * - normal clicks remain clicks until the activation threshold is crossed.
 *
 * Starting a new gesture clears the previous click guard, so a fresh tap on
 * "Voir sur la carte" can never be swallowed by an older drag.
 */
export function useMapOfferSheetGestureRouter({ expanded, externalDrag }) {
  const panelRef = useRef(null)
  const listRef = useRef(null)
  const externalDragRef = useRef(externalDrag)
  const expandedRef = useRef(expanded)
  const clickGuardRef = useRef({ until: 0, origin: null })

  useEffect(() => { externalDragRef.current = externalDrag }, [externalDrag])
  useEffect(() => { expandedRef.current = expanded }, [expanded])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return undefined

    let touchGesture = null
    let pointerGesture = null

    const createGesture = (target, clientX, clientY, pointerId = null) => ({
      startClientX: clientX,
      startClientY: clientY,
      lastClientY: clientY,
      origin: interactiveOrigin(target, panel),
      startedInList: startedInside(target, listRef.current),
      horizontalRail: startedInHorizontalRail(target),
      horizontal: false,
      handedOff: false,
      pointerId,
    })

    const beginHandoff = (state, clientY, event, startFromLast = false) => {
      const dragStartY = startFromLast ? state.lastClientY : state.startClientY
      const started = externalDragRef.current?.start(dragStartY)
      if (!started) return false
      state.handedOff = true
      if (event.cancelable) event.preventDefault()
      event.stopPropagation()
      externalDragRef.current?.move(clientY)
      return true
    }

    const classifyVerticalGesture = (state, clientX, clientY) => {
      const totalX = clientX - state.startClientX
      const totalY = clientY - state.startClientY
      const absX = Math.abs(totalX)
      const absY = Math.abs(totalY)

      if (state.horizontal) return { vertical: false, totalY }
      if (state.horizontalRail && absX >= DRAG_ACTIVATION_PX && absX > absY * HORIZONTAL_BIAS) {
        state.horizontal = true
        return { vertical: false, totalY }
      }
      if (absY < DRAG_ACTIVATION_PX || absY <= absX) return { vertical: false, totalY }
      return { vertical: true, totalY }
    }

    const onTouchStart = (event) => {
      // A fresh finger contact is a new intent. Never carry click suppression
      // from a previous completed drag into this tap.
      clickGuardRef.current = { until: 0, origin: null }
      if (event.touches?.length !== 1) {
        touchGesture = null
        return
      }
      const touch = event.touches[0]
      const clientY = Number(touch?.clientY)
      if (!Number.isFinite(clientY)) {
        touchGesture = null
        return
      }
      const clientX = Number.isFinite(Number(touch?.clientX)) ? Number(touch.clientX) : 0
      touchGesture = createGesture(event.target, clientX, clientY)
    }

    const onTouchMove = (event) => {
      const state = touchGesture
      const touch = event.touches?.[0]
      const clientY = Number(touch?.clientY)
      if (!state || !Number.isFinite(clientY)) return
      const clientX = Number.isFinite(Number(touch?.clientX)) ? Number(touch.clientX) : state.startClientX

      if (state.handedOff) {
        if (event.cancelable) event.preventDefault()
        event.stopPropagation()
        externalDragRef.current?.move(clientY)
        state.lastClientY = clientY
        return
      }

      const { vertical, totalY } = classifyVerticalGesture(state, clientX, clientY)
      if (!vertical) {
        state.lastClientY = clientY
        return
      }

      if (!expandedRef.current) {
        beginHandoff(state, clientY, event)
        state.lastClientY = clientY
        return
      }

      if (state.startedInList) {
        const list = listRef.current
        const atTop = !list || list.scrollTop <= EDGE_EPSILON_PX
        const pullingDown = totalY > DRAG_ACTIVATION_PX

        // While the open list can still scroll, native scrolling remains in
        // control. Refresh lastClientY so handing off after reaching the top
        // never makes the sheet jump by the distance already consumed by list
        // scrolling.
        if (!atTop || !pullingDown) {
          state.lastClientY = clientY
          return
        }

        beginHandoff(state, clientY, event, true)
        state.lastClientY = clientY
        return
      }

      // Header + category dock remain direct drag surfaces even when expanded.
      beginHandoff(state, clientY, event)
      state.lastClientY = clientY
    }

    const finishTouch = (cancel = false) => {
      const state = touchGesture
      touchGesture = null
      if (!state?.handedOff) return
      clickGuardRef.current = {
        until: performance.now() + CLICK_SUPPRESSION_MS,
        origin: state.origin,
      }
      if (cancel) externalDragRef.current?.cancel()
      else externalDragRef.current?.end()
    }

    const onPointerDown = (event) => {
      if (event.pointerType === 'touch' || event.button !== 0) return
      clickGuardRef.current = { until: 0, origin: null }
      pointerGesture = createGesture(event.target, event.clientX, event.clientY, event.pointerId)
    }

    const onPointerMove = (event) => {
      const state = pointerGesture
      if (!state || event.pointerId !== state.pointerId) return

      if (state.handedOff) {
        event.preventDefault()
        event.stopPropagation()
        externalDragRef.current?.move(event.clientY)
        state.lastClientY = event.clientY
        return
      }

      const { vertical } = classifyVerticalGesture(state, event.clientX, event.clientY)
      if (!vertical) {
        state.lastClientY = event.clientY
        return
      }

      if (beginHandoff(state, event.clientY, event)) {
        try { panel.setPointerCapture(event.pointerId) } catch { /* no-op */ }
      }
      state.lastClientY = event.clientY
    }

    const finishPointer = (event, cancel = false) => {
      const state = pointerGesture
      if (!state || event.pointerId !== state.pointerId) return
      pointerGesture = null
      if (!state.handedOff) return
      clickGuardRef.current = {
        until: performance.now() + CLICK_SUPPRESSION_MS,
        origin: state.origin,
      }
      if (cancel) externalDragRef.current?.cancel()
      else externalDragRef.current?.end()
      try { panel.releasePointerCapture(event.pointerId) } catch { /* no-op */ }
    }

    const onClickCapture = (event) => {
      const guard = clickGuardRef.current
      if (!guard.origin || performance.now() > guard.until) {
        clickGuardRef.current = { until: 0, origin: null }
        return
      }

      const targetOrigin = interactiveOrigin(event.target, panel)
      if (!targetOrigin || targetOrigin !== guard.origin) return

      clickGuardRef.current = { until: 0, origin: null }
      event.preventDefault()
      event.stopPropagation()
    }

    const onTouchEnd = () => finishTouch(false)
    const onTouchCancel = () => finishTouch(true)
    const onPointerUp = (event) => finishPointer(event, false)
    const onPointerCancel = (event) => finishPointer(event, true)

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: false })
    panel.addEventListener('touchend', onTouchEnd, { passive: true })
    panel.addEventListener('touchcancel', onTouchCancel, { passive: true })
    panel.addEventListener('pointerdown', onPointerDown)
    panel.addEventListener('pointermove', onPointerMove)
    panel.addEventListener('pointerup', onPointerUp)
    panel.addEventListener('pointercancel', onPointerCancel)
    panel.addEventListener('click', onClickCapture, true)

    return () => {
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', onTouchEnd)
      panel.removeEventListener('touchcancel', onTouchCancel)
      panel.removeEventListener('pointerdown', onPointerDown)
      panel.removeEventListener('pointermove', onPointerMove)
      panel.removeEventListener('pointerup', onPointerUp)
      panel.removeEventListener('pointercancel', onPointerCancel)
      panel.removeEventListener('click', onClickCapture, true)
    }
  }, [])

  return { panelRef, listRef }
}
