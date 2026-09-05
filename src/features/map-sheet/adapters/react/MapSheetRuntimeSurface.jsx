import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion } from '../../../../shared/motion/runtime.js'
import {
  MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD,
  MAP_SHEET_GESTURE_AREA,
  MAP_SHEET_POSITION,
} from '../../core/index.js'
import { createMapSheetScrollSnapshot } from '../../ports/index.js'
import { createMapSheetController } from '../../application/MapSheetController.js'
import { createMapSheetGestureCoordinator } from '../../application/MapSheetGestureCoordinator.js'
import { createIOSGestureAdapter } from '../browser/IOSGestureAdapter.js'
import { createIOSScrollAdapter } from '../browser/IOSScrollAdapter.js'
import { createPointerGestureAdapter } from '../browser/PointerGestureAdapter.js'
import { createMoveraMapCameraAdapter } from '../map/MoveraMapCameraAdapter.js'
import { createMotionSheetAdapter } from '../motion/MotionSheetAdapter.js'
import { createListingSelectionAdapter } from '../state/ListingSelectionAdapter.js'

const CLICK_SUPPRESSION_MS = 280
const SEMANTIC_SNAP_EPSILON = 0.015
const DEFAULT_SPRING = Object.freeze({
  stiffness: 185,
  damping: 30,
  mass: 1.02,
  restDelta: 0.002,
  restSpeed: 0.01,
})

function clamp(value) {
  return Math.min(1, Math.max(0, Number(value) || 0))
}

function semanticSnapState(progress) {
  if (progress >= MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD) return MAP_SHEET_POSITION.EXPANDED
  if (progress <= SEMANTIC_SNAP_EPSILON) return MAP_SHEET_POSITION.COLLAPSED
  if (Math.abs(progress - 0.5) <= SEMANTIC_SNAP_EPSILON) return MAP_SHEET_POSITION.MIDDLE
  return 'moving'
}

function describeOrigin(target) {
  const element = target && typeof target.closest === 'function' ? target : null
  if (!element) return { area: MAP_SHEET_GESTURE_AREA.SHEET, startsOnFirstOffer: false }
  const areaNode = element.closest('[data-map-sheet-area]')
  const area = areaNode?.getAttribute('data-map-sheet-area') || MAP_SHEET_GESTURE_AREA.SHEET
  return {
    area,
    startsOnFirstOffer: Boolean(element.closest('[data-map-sheet-first-offer="true"]')),
  }
}

function isIOSLike() {
  if (typeof navigator === 'undefined') return false
  const userAgent = String(navigator.userAgent || '')
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true
  return navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export function MapSheetRuntimeSurface({
  ariaLabel,
  children,
  className,
  collapsedVisiblePx = 74,
  onFocusListing,
  onProgressChange,
  onSelectedListingChange,
  selectedListingId = null,
  spring = DEFAULT_SPRING,
  testId = 'map-offer-sheet',
  toggleThreshold = 0.72,
}) {
  const reduceMotion = useReducedMotion()
  const [surfaceElement, setSurfaceElement] = useState(null)
  const [listElement, setListElement] = useState(null)
  const [progress, setProgress] = useState(0)
  const distanceRef = useRef(1)
  const visualProgressRef = useRef(0)
  const lastReportedProgressRef = useRef(0)
  const progressCallbackRef = useRef(onProgressChange)
  const focusCallbackRef = useRef(onFocusListing)
  const selectionCallbackRef = useRef(onSelectedListingChange)
  const selectedListingRef = useRef(selectedListingId)
  const clickGuardRef = useRef({ until: 0 })
  const runtimeRef = useRef(null)
  const y = useMotionValue(0)
  const progressMotion = useMotionValue(0)

  progressCallbackRef.current = onProgressChange
  focusCallbackRef.current = onFocusListing
  selectionCallbackRef.current = onSelectedListingChange
  selectedListingRef.current = selectedListingId

  const writeVisualProgress = (value) => {
    const next = clamp(value)
    visualProgressRef.current = next
    progressMotion.set(next)
    y.set((1 - next) * distanceRef.current)
  }

  const reportProgress = (value) => {
    const next = clamp(value)
    const critical = semanticSnapState(next) !== 'moving'
    setProgress((current) => (Math.abs(current - next) < 0.008 && !critical ? current : next))
    if (Math.abs(lastReportedProgressRef.current - next) >= 0.018 || critical) {
      lastReportedProgressRef.current = next
      progressCallbackRef.current?.(next)
    }
  }

  if (!runtimeRef.current) {
    const motionPort = createMotionSheetAdapter({
      readProgress: () => visualProgressRef.current,
      writeProgress: writeVisualProgress,
      onProgress: reportProgress,
      reducedMotion: Boolean(reduceMotion),
      spring,
    })
    const mapCameraPort = createMoveraMapCameraAdapter({
      focusListing: (listingId, options) => focusCallbackRef.current?.(listingId, options),
    })
    const selectionPort = createListingSelectionAdapter({
      initialListingId: selectedListingRef.current,
      selectListing: (listingId) => selectionCallbackRef.current?.(listingId),
      getSelectedListing: () => selectedListingRef.current,
    })
    const controller = createMapSheetController({
      motion: motionPort,
      mapCamera: mapCameraPort,
      selection: selectionPort,
    })
    runtimeRef.current = { controller }
  }

  const controller = runtimeRef.current.controller

  useLayoutEffect(() => {
    if (!surfaceElement) return undefined
    const measure = () => {
      const height = surfaceElement.getBoundingClientRect().height
      const nextDistance = Math.max(1, height - Math.max(0, Number(collapsedVisiblePx) || 0))
      distanceRef.current = nextDistance
      y.set((1 - visualProgressRef.current) * nextDistance)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(surfaceElement)
    return () => observer.disconnect()
  }, [collapsedVisiblePx, surfaceElement, y])

  useEffect(() => {
    if (!surfaceElement) return undefined

    const gesture = isIOSLike()
      ? createIOSGestureAdapter({ surface: surfaceElement, describeOrigin })
      : createPointerGestureAdapter({ surface: surfaceElement, describeOrigin })

    const scroll = listElement
      ? createIOSScrollAdapter({ element: listElement })
      : { getSnapshot: () => createMapSheetScrollSnapshot() }

    const coordinator = createMapSheetGestureCoordinator({
      controller,
      gesture,
      scroll,
      getDistancePx: () => distanceRef.current,
      getVisualProgress: () => visualProgressRef.current,
      onGestureStart: () => { clickGuardRef.current = { until: 0 } },
      onSheetRelease: () => { clickGuardRef.current = { until: now() + CLICK_SUPPRESSION_MS } },
    })

    const suppressDragClick = (event) => {
      if (now() > clickGuardRef.current.until) return
      clickGuardRef.current = { until: 0 }
      event.preventDefault?.()
      event.stopPropagation?.()
      event.stopImmediatePropagation?.()
    }

    surfaceElement.addEventListener('click', suppressDragClick, true)
    return () => {
      surfaceElement.removeEventListener('click', suppressDragClick, true)
      coordinator.destroy()
      gesture.destroy()
    }
  }, [controller, listElement, surfaceElement])

  useEffect(() => () => controller.destroy(), [controller])

  const toggleExpanded = () => {
    const target = visualProgressRef.current > toggleThreshold
      ? MAP_SHEET_POSITION.COLLAPSED
      : MAP_SHEET_POSITION.EXPANDED
    return controller.snapToPosition(target, { reason: 'toggle' })
  }

  const focusListingOnMap = (listingId, options) => controller.focusListingOnMap(listingId, options)
  const roundedProgress = Math.round(progress * 100) / 100
  const snapState = semanticSnapState(progress)

  return (
    <motion.section
      ref={setSurfaceElement}
      className={className}
      aria-label={ariaLabel}
      data-testid={testId}
      data-progress={roundedProgress}
      data-expanded={snapState === MAP_SHEET_POSITION.EXPANDED ? 'true' : 'false'}
      data-snap-state={snapState}
      data-motion-engine="motion"
      data-motion-boundary="map-sheet-v2"
      data-map-sheet-runtime="v2"
      style={{ y }}
    >
      {children({
        progress,
        progressMotion,
        setListElement,
        toggleExpanded,
        focusListingOnMap,
      })}
    </motion.section>
  )
}
