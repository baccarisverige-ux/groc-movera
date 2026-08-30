import { useCallback, useEffect, useRef, useState } from 'react'
import { ClusterLayer } from './layers/ClusterLayer.jsx'
import { MapControls } from './controls/MapControls.jsx'
import { MarkerLayer } from './layers/MarkerLayer.jsx'
import { ResizeManager } from './lifecycle/ResizeManager.jsx'
import { TileLayer } from './layers/TileLayer.jsx'
import { ViewportController } from './lifecycle/ViewportController.jsx'
import { panViewport, zoomViewport, zoomViewportAtPoint } from './geometry/geometry.js'
import '../../styles/map-engine.css'

export const INITIAL_VIEWPORT = Object.freeze({ lat: 36.8065, lng: 10.1815, zoom: 11 })
const MARKER_MIN_FOCUS_ZOOM = 13.5
const CLUSTER_FOCUS_ZOOM = 11
const PINCH_ZOOM_SENSITIVITY = 0.65
const PINCH_ZOOM_THRESHOLD = 0.003
const PINCH_PAN_THRESHOLD = 0.8
const VIEWPORT_EPSILON = 0.000001
const ZOOM_EPSILON = 0.001
export const DEFAULT_MARKERS = Object.freeze([
  { id: 'marsa-sea', label: 'La Marsa', lat: 36.8782, lng: 10.3247 },
  { id: 'carthage-suite', label: 'Carthage', lat: 36.8528, lng: 10.3233 },
  { id: 'gammarth-house', label: 'Gammarth', lat: 36.9179, lng: 10.2934 },
])

function pinchSnapshot(points) {
  const [a, b] = [...points.values()]
  if (!a || !b) return null
  return {
    distance: Math.hypot(a.x - b.x, a.y - b.y),
    midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  }
}

function sameViewport(a, b) {
  return Math.abs(a.lat - b.lat) <= VIEWPORT_EPSILON
    && Math.abs(a.lng - b.lng) <= VIEWPORT_EPSILON
    && Math.abs(a.zoom - b.zoom) <= ZOOM_EPSILON
}

export function MapContainer({
  markers = DEFAULT_MARKERS,
  selectedListingId: controlledSelectedId,
  onSelectedListingChange,
  initialViewport = INITIAL_VIEWPORT,
  onViewportChange,
  onInteractionChange,
  viewportCommand = null,
}) {
  const surfaceRef = useRef(null)
  const pointersRef = useRef(new Map())
  const pinchGestureRef = useRef(null)
  const frameRef = useRef(0)
  const pendingViewportUpdatesRef = useRef([])
  const viewportSourceRef = useRef('app')
  const renderCountRef = useRef(0)
  const updateCountRef = useRef(0)
  const [viewport, setViewport] = useState(initialViewport)
  const [size, setSize] = useState({ width: 390, height: 560 })
  const [lifecycleEvents, setLifecycleEvents] = useState(0)
  const [internalSelectedId, setInternalSelectedId] = useState(null)
  const [mapProvider, setMapProvider] = useState('google-loading')
  const selectedListingId = controlledSelectedId === undefined ? internalSelectedId : controlledSelectedId
  const previousSelectedRef = useRef(selectedListingId)
  const commandedLat = viewportCommand?.lat
  const commandedLng = viewportCommand?.lng
  const commandedZoom = viewportCommand?.zoom
  const commandRevision = viewportCommand?.revision
  const googleNativeGestures = mapProvider === 'google'
  renderCountRef.current += 1

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current)
    pendingViewportUpdatesRef.current = []
    pointersRef.current.clear()
    pinchGestureRef.current = null
    onInteractionChange?.(false)
  }, [onInteractionChange])
  useEffect(() => { onViewportChange?.(viewport) }, [viewport, onViewportChange])

  const setSelected = useCallback((next) => {
    if (controlledSelectedId === undefined) setInternalSelectedId(next)
    onSelectedListingChange?.(next)
  }, [controlledSelectedId, onSelectedListingChange])

  const commitViewport = useCallback((updater, source = 'app') => {
    pendingViewportUpdatesRef.current.push({ updater, source })
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      const updates = pendingViewportUpdatesRef.current.splice(0)
      if (!updates.length) return
      viewportSourceRef.current = updates[updates.length - 1].source
      updateCountRef.current += 1
      setViewport((current) => updates.reduce((next, update) => update.updater(next), current))
    })
  }, [])

  const zoomBy = useCallback((delta) => commitViewport((current) => zoomViewport(current, delta), 'app'), [commitViewport])
  const handleLifecycle = useCallback(() => setLifecycleEvents((count) => count + 1), [])
  const focusPoint = useCallback((point, targetZoom) => commitViewport((current) => ({ ...current, lat: point.lat, lng: point.lng, zoom: targetZoom }), 'app'), [commitViewport])
  const focusMarker = useCallback((marker) => commitViewport((current) => ({
    ...current,
    lat: marker.lat,
    lng: marker.lng,
    zoom: Math.max(current.zoom, MARKER_MIN_FOCUS_ZOOM),
  }), 'app'), [commitViewport])
  const selectMarker = useCallback((marker) => {
    setSelected(marker.id)
    focusMarker(marker)
  }, [focusMarker, setSelected])
  const focusCluster = useCallback((point) => focusPoint(point, CLUSTER_FOCUS_ZOOM), [focusPoint])

  const handleGoogleStatus = useCallback((status) => {
    setMapProvider(status)
    if (status === 'google') {
      pointersRef.current.clear()
      pinchGestureRef.current = null
    }
  }, [])

  const handleGoogleViewportChange = useCallback((next) => {
    const lat = Number(next?.lat)
    const lng = Number(next?.lng)
    const zoom = Number(next?.zoom)
    if (![lat, lng, zoom].every(Number.isFinite)) return
    commitViewport((current) => {
      const candidate = { ...current, lat, lng, zoom }
      return sameViewport(current, candidate) ? current : candidate
    }, 'google')
  }, [commitViewport])

  const handleGoogleInteractionChange = useCallback((active) => {
    onInteractionChange?.(Boolean(active))
  }, [onInteractionChange])

  useEffect(() => {
    if (previousSelectedRef.current === selectedListingId) return
    previousSelectedRef.current = selectedListingId
    if (!selectedListingId) return
    const marker = markers.find((item) => item.id === selectedListingId)
    if (marker) focusMarker(marker)
  }, [selectedListingId, markers, focusMarker])

  useEffect(() => {
    if (![commandedLat, commandedLng, commandedZoom].every(Number.isFinite)) return
    commitViewport((current) => ({ ...current, lat: commandedLat, lng: commandedLng, zoom: commandedZoom }), 'app')
  }, [commandedLat, commandedLng, commandedZoom, commandRevision, commitViewport])

  const onPointerDown = (event) => {
    if (googleNativeGestures) return
    if (event.target.closest('button, a, input, select, textarea')) return
    event.preventDefault()
    onInteractionChange?.(true)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* synthetic */ }
    if (pointersRef.current.size === 2) pinchGestureRef.current = pinchSnapshot(pointersRef.current)
  }

  const onPointerMove = (event) => {
    if (googleNativeGestures) return
    const previous = pointersRef.current.get(event.pointerId)
    if (!previous) return
    event.preventDefault()
    const next = { x: event.clientX, y: event.clientY }
    pointersRef.current.set(event.pointerId, next)

    if (pointersRef.current.size >= 2) {
      const currentGesture = pinchSnapshot(pointersRef.current)
      const previousGesture = pinchGestureRef.current || currentGesture
      if (!currentGesture || !previousGesture || previousGesture.distance <= 0) return

      const ratio = currentGesture.distance / previousGesture.distance
      const zoomDelta = Math.log2(ratio) * PINCH_ZOOM_SENSITIVITY
      const panDx = currentGesture.midpoint.x - previousGesture.midpoint.x
      const panDy = currentGesture.midpoint.y - previousGesture.midpoint.y
      const shouldZoom = Number.isFinite(zoomDelta) && Math.abs(zoomDelta) >= PINCH_ZOOM_THRESHOLD
      const shouldPan = Math.abs(panDx) + Math.abs(panDy) >= PINCH_PAN_THRESHOLD

      if (shouldZoom || shouldPan) {
        const rect = surfaceRef.current?.getBoundingClientRect()
        const midpoint = {
          x: currentGesture.midpoint.x - (rect?.left || 0),
          y: currentGesture.midpoint.y - (rect?.top || 0),
        }

        commitViewport((current) => {
          const panned = shouldPan ? panViewport(current, panDx, panDy) : current
          return shouldZoom ? zoomViewportAtPoint(panned, zoomDelta, midpoint, size) : panned
        }, 'app')

        pinchGestureRef.current = {
          distance: shouldZoom ? currentGesture.distance : previousGesture.distance,
          midpoint: shouldPan ? currentGesture.midpoint : previousGesture.midpoint,
        }
      }
      return
    }

    const dx = next.x - previous.x
    const dy = next.y - previous.y
    if (Math.abs(dx) + Math.abs(dy) >= 1) commitViewport((current) => panViewport(current, dx, dy), 'app')
  }

  const releasePointer = (event) => {
    if (googleNativeGestures) return
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchGestureRef.current = null
    if (pointersRef.current.size === 0) onInteractionChange?.(false)
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* no capture */ }
  }

  return <section className="map-engine" data-testid="map-engine" data-selected-listing-id={selectedListingId || ''} data-map-provider={mapProvider} data-native-gestures={googleNativeGestures ? 'true' : 'false'} data-viewport-source={viewportSourceRef.current}>
    <div ref={surfaceRef} className="map-surface" data-testid="map-surface" data-lat={viewport.lat.toFixed(6)} data-lng={viewport.lng.toFixed(6)} data-zoom={viewport.zoom}
      data-width={size.width} data-height={size.height} data-update-count={updateCountRef.current} data-render-count={renderCountRef.current} data-listener-count="7" data-lifecycle-events={lifecycleEvents}
      onDoubleClick={googleNativeGestures ? undefined : (event) => { if (!event.target.closest('button')) zoomBy(1) }} onPointerCancel={releasePointer} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={releasePointer} onWheel={googleNativeGestures ? undefined : (event) => { event.preventDefault(); zoomBy(event.deltaY < 0 ? 1 : -1) }}>
      <TileLayer
        viewport={viewport}
        viewportSource={viewportSourceRef.current}
        size={size}
        markers={markers}
        interactive
        showFallbackTiles={!googleNativeGestures}
        onGoogleStatus={handleGoogleStatus}
        onGoogleViewportChange={handleGoogleViewportChange}
        onGoogleInteractionChange={handleGoogleInteractionChange}
        onGoogleMarkerSelect={selectMarker}
        onGoogleClusterFocus={focusCluster}
      />
      <ClusterLayer markers={markers} viewport={viewport} size={size} onFocus={focusCluster} interactive={!googleNativeGestures} />
      {viewport.zoom > 10 ? <MarkerLayer markers={markers} viewport={viewport} size={size} selectedListingId={selectedListingId} onSelect={selectMarker} interactive /> : null}
      <MapControls onZoomIn={() => zoomBy(1)} onZoomOut={() => zoomBy(-1)} />
      <div className="map-attribution">© OpenStreetMap contributors · © CARTO</div>
      <ResizeManager targetRef={surfaceRef} onSize={setSize} />
      <ViewportController onLifecycle={handleLifecycle} />
    </div>
    <p className="map-engine__status" aria-live="polite">{selectedListingId ? `Sélection: ${selectedListingId}` : `Tunis · zoom ${viewport.zoom}`}</p>
  </section>
}
