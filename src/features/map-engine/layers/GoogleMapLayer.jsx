import { useEffect, useRef, useState } from 'react'
import '../../../styles/map-google-layer.css'

const GOOGLE_MAPS_BROWSER_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
const GOOGLE_MAPS_SCRIPT_ID = 'movera-google-maps-js'
const GOOGLE_MAPS_CALLBACK = '__moveraGoogleMapsReady'
const GOOGLE_MAPS_TIMEOUT_MS = 15000
const GOOGLE_MAPS_POLL_MS = 50
const CAMERA_EPSILON = 0.000005
const ZOOM_EPSILON = 0.01
const MARKER_HIT_RADIUS_PX = 40
const CLUSTER_HIT_RADIUS_PX = 28

// Bright pastel roadmap inspired by the supplied reference: soft blue water,
// fresh green land/parks, warm-white roads and restrained grey labels.
const GOOGLE_REFERENCE_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#eef1e8' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#747974' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f7f8f3' }, { weight: 2 }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d9dcd4' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#e4f1cd' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f2f2ef' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#d2edac' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c6e99a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d9dcd5' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fffdf5' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d5d9cf' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#e6e8e3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bfe5ef' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#66848a' }] },
]

function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps requires a browser'))
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)
  if (!GOOGLE_MAPS_BROWSER_KEY) return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'))
  if (window.__moveraGoogleMapsPromise) return window.__moveraGoogleMapsPromise

  window.__moveraGoogleMapsPromise = new Promise((resolve, reject) => {
    let settled = false
    let timeoutId = 0
    let pollId = 0
    const previousAuthFailure = window.gm_authFailure

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(pollId)
      if (window[GOOGLE_MAPS_CALLBACK] === handleReady) delete window[GOOGLE_MAPS_CALLBACK]
      if (window.gm_authFailure === handleAuthFailure) {
        if (typeof previousAuthFailure === 'function') window.gm_authFailure = previousAuthFailure
        else delete window.gm_authFailure
      }
    }

    const fail = (error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }

    const resolveIfReady = () => {
      if (settled || !window.google?.maps?.Map) return false
      settled = true
      const maps = window.google.maps
      cleanup()
      resolve(maps)
      return true
    }

    function handleReady() {
      if (!resolveIfReady()) fail(new Error('Google Maps callback fired before Maps was ready'))
    }

    function handleAuthFailure() {
      try { previousAuthFailure?.() } catch { /* preserve previous handler without blocking fallback */ }
      fail(new Error('Google Maps authentication failed'))
    }

    window[GOOGLE_MAPS_CALLBACK] = handleReady
    window.gm_authFailure = handleAuthFailure

    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existing) {
      if (resolveIfReady()) return
      existing.addEventListener('error', () => fail(new Error('Google Maps script failed')), { once: true })
      pollId = window.setInterval(resolveIfReady, GOOGLE_MAPS_POLL_MS)
    } else {
      const script = document.createElement('script')
      script.id = GOOGLE_MAPS_SCRIPT_ID
      script.dataset.moveraGoogleMapsOwned = 'true'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_BROWSER_KEY)}&v=weekly&loading=async&callback=${GOOGLE_MAPS_CALLBACK}`
      script.async = true
      script.defer = true
      script.onerror = () => fail(new Error('Google Maps script failed'))
      script.onload = () => { resolveIfReady() }
      document.head.appendChild(script)
    }

    timeoutId = window.setTimeout(() => fail(new Error('Google Maps readiness timeout')), GOOGLE_MAPS_TIMEOUT_MS)
  }).catch((error) => {
    const script = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (!window.google?.maps?.Map && script?.dataset.moveraGoogleMapsOwned === 'true') script.remove()
    window.__moveraGoogleMapsPromise = null
    throw error
  })

  return window.__moveraGoogleMapsPromise
}

function mapViewport(map) {
  const center = map?.getCenter?.()
  const zoom = Number(map?.getZoom?.())
  if (!center || !Number.isFinite(zoom)) return null
  const lat = Number(center.lat())
  const lng = Number(center.lng())
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng, zoom }
}

function cameraMatches(map, viewport) {
  const current = mapViewport(map)
  if (!current) return false
  return Math.abs(current.lat - viewport.lat) <= CAMERA_EPSILON
    && Math.abs(current.lng - viewport.lng) <= CAMERA_EPSILON
    && Math.abs(current.zoom - viewport.zoom) <= ZOOM_EPSILON
}

function distanceMeters(a, b) {
  const radius = 6371000
  const toRadians = (value) => value * Math.PI / 180
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const deltaLat = lat2 - lat1
  const deltaLng = toRadians(b.lng - a.lng)
  const hav = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav))
}

function hitRadiusMeters(lat, zoom, pixelRadius, maxMeters) {
  const safeZoom = Math.max(3, Math.min(18, Number(zoom) || 3))
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / (2 ** safeZoom)
  return Math.min(maxMeters, Math.max(18, Math.abs(metersPerPixel) * pixelRadius))
}

export function GoogleMapLayer({
  viewport,
  viewportSource = 'app',
  markers = [],
  interactive = false,
  onStatus,
  onViewportChange,
  onInteractionChange,
  onMarkerSelect,
  onClusterFocus,
}) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const mapsRef = useRef(null)
  const listenersRef = useRef([])
  const syncFrameRef = useRef(0)
  const releaseTimerRef = useRef(0)
  const activePointersRef = useRef(new Set())
  const interactionActiveRef = useRef(false)
  const cameraMovingRef = useRef(false)
  const interactiveRef = useRef(interactive)
  const viewportRef = useRef(viewport)
  const viewportSourceRef = useRef(viewportSource)
  const markersRef = useRef(markers)
  const onViewportChangeRef = useRef(onViewportChange)
  const onInteractionChangeRef = useRef(onInteractionChange)
  const onMarkerSelectRef = useRef(onMarkerSelect)
  const onClusterFocusRef = useRef(onClusterFocus)
  const [ready, setReady] = useState(false)

  interactiveRef.current = interactive
  viewportRef.current = viewport
  viewportSourceRef.current = viewportSource
  markersRef.current = markers
  onViewportChangeRef.current = onViewportChange
  onInteractionChangeRef.current = onInteractionChange
  onMarkerSelectRef.current = onMarkerSelect
  onClusterFocusRef.current = onClusterFocus

  const setInteractionActive = (active) => {
    if (interactionActiveRef.current === active) return
    interactionActiveRef.current = active
    onInteractionChangeRef.current?.(active)
  }

  const scheduleInteractionRelease = () => {
    window.clearTimeout(releaseTimerRef.current)
    releaseTimerRef.current = window.setTimeout(() => {
      if (activePointersRef.current.size === 0 && !cameraMovingRef.current) setInteractionActive(false)
    }, 180)
  }

  const emitViewport = () => {
    if (syncFrameRef.current) return
    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncFrameRef.current = 0
      const next = mapViewport(mapRef.current)
      if (next) onViewportChangeRef.current?.(next)
    })
  }

  useEffect(() => {
    let cancelled = false
    onStatus?.('google-loading')

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !hostRef.current) return
        mapsRef.current = maps

        // Google Maps can finish loading after the app has already resolved an
        // address and moved Movera's viewport. Always construct Google from the
        // latest viewport, never from the first render's fallback camera.
        const latestViewport = viewportRef.current
        const map = new maps.Map(hostRef.current, {
          center: { lat: latestViewport.lat, lng: latestViewport.lng },
          zoom: latestViewport.zoom,
          minZoom: 3,
          maxZoom: 18,
          backgroundColor: '#f5f7f8',
          clickableIcons: false,
          disableDefaultUI: true,
          disableDoubleClickZoom: !interactiveRef.current,
          draggable: interactiveRef.current,
          fullscreenControl: false,
          gestureHandling: interactiveRef.current ? 'greedy' : 'none',
          isFractionalZoomEnabled: true,
          keyboardShortcuts: false,
          mapTypeControl: false,
          mapTypeId: 'roadmap',
          rotateControl: false,
          scaleControl: false,
          scrollwheel: interactiveRef.current,
          streetViewControl: false,
          styles: GOOGLE_REFERENCE_MAP_STYLES,
          zoomControl: false,
        })
        mapRef.current = map

        listenersRef.current = [
          map.addListener('bounds_changed', () => {
            if (!interactiveRef.current) return
            cameraMovingRef.current = true
            emitViewport()
          }),
          map.addListener('dragstart', () => {
            if (!interactiveRef.current) return
            setInteractionActive(true)
          }),
          map.addListener('idle', () => {
            cameraMovingRef.current = false
            if (interactiveRef.current) emitViewport()
            if (activePointersRef.current.size === 0) setInteractionActive(false)
          }),
          map.addListener('click', (event) => {
            if (!interactiveRef.current || !event?.latLng) return
            const point = { lat: Number(event.latLng.lat()), lng: Number(event.latLng.lng()) }
            if (![point.lat, point.lng].every(Number.isFinite)) return
            const currentMarkers = markersRef.current || []
            if (!currentMarkers.length) return
            const zoom = Number(map.getZoom()) || 3

            if (zoom <= 10) {
              const cluster = {
                lat: currentMarkers.reduce((sum, marker) => sum + marker.lat, 0) / currentMarkers.length,
                lng: currentMarkers.reduce((sum, marker) => sum + marker.lng, 0) / currentMarkers.length,
              }
              const radius = hitRadiusMeters(cluster.lat, zoom, CLUSTER_HIT_RADIUS_PX, 2200)
              if (distanceMeters(point, cluster) <= radius) onClusterFocusRef.current?.(cluster)
              return
            }

            let nearest = null
            let nearestDistance = Infinity
            currentMarkers.forEach((marker) => {
              const distance = distanceMeters(point, marker)
              if (distance < nearestDistance) {
                nearest = marker
                nearestDistance = distance
              }
            })
            if (!nearest) return
            const radius = hitRadiusMeters(nearest.lat, zoom, MARKER_HIT_RADIUS_PX, 450)
            if (nearestDistance <= radius) onMarkerSelectRef.current?.(nearest)
          }),
        ]

        setReady(true)
        onStatus?.('google')
      })
      .catch(() => {
        if (cancelled) return
        setReady(false)
        onStatus?.('fallback')
      })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(syncFrameRef.current)
      window.clearTimeout(releaseTimerRef.current)
      syncFrameRef.current = 0
      releaseTimerRef.current = 0
      listenersRef.current.forEach((listener) => listener?.remove?.())
      listenersRef.current = []
      activePointersRef.current.clear()
      setInteractionActive(false)
      if (mapRef.current && mapsRef.current?.event?.clearInstanceListeners) {
        mapsRef.current.event.clearInstanceListeners(mapRef.current)
      }
      mapRef.current = null
      mapsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !interactive) return undefined

    const releasePointer = (event) => {
      activePointersRef.current.delete(event.pointerId)
      if (activePointersRef.current.size === 0) scheduleInteractionRelease()
    }
    const cancelAllPointers = () => {
      activePointersRef.current.clear()
      cameraMovingRef.current = false
      window.clearTimeout(releaseTimerRef.current)
      setInteractionActive(false)
    }

    // iOS can finish a pointer sequence outside the map element after a fast
    // diagonal pan or pinch. Window capture guarantees the gesture state cannot
    // remain stuck and block later camera commands or alter the next gesture.
    window.addEventListener('pointerup', releasePointer, true)
    window.addEventListener('pointercancel', releasePointer, true)
    window.addEventListener('blur', cancelAllPointers)

    return () => {
      window.removeEventListener('pointerup', releasePointer, true)
      window.removeEventListener('pointercancel', releasePointer, true)
      window.removeEventListener('blur', cancelAllPointers)
    }
  }, [ready, interactive])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setOptions({
      disableDoubleClickZoom: !interactive,
      draggable: interactive,
      gestureHandling: interactive ? 'greedy' : 'none',
      scrollwheel: interactive,
    })
  }, [interactive, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    // Native Google gestures own the camera while the user is touching the map.
    // Viewport updates emitted by Google are mirrors for Movera overlays only and
    // must never be written back into Google, otherwise a delayed React render
    // can move the camera back to an older frame and make pan/pinch feel unstable.
    if (viewportSource === 'google' || interactionActiveRef.current || cameraMatches(map, viewport)) return

    const camera = { center: { lat: viewport.lat, lng: viewport.lng }, zoom: viewport.zoom }
    if (typeof map.moveCamera === 'function') map.moveCamera(camera)
    else {
      map.setCenter(camera.center)
      map.setZoom(camera.zoom)
    }
  }, [viewport.lat, viewport.lng, viewport.zoom, viewportSource, ready])

  return (
    <div
      className="map-google-layer"
      data-ready={ready ? 'true' : 'false'}
      data-interactive={interactive ? 'true' : 'false'}
      data-camera-source={viewportSource}
      data-testid="map-google-layer"
      aria-hidden="true"
      onPointerDownCapture={(event) => {
        if (!interactive) return
        window.clearTimeout(releaseTimerRef.current)
        activePointersRef.current.add(event.pointerId)
        setInteractionActive(true)
      }}
      onWheelCapture={() => {
        if (!interactive) return
        setInteractionActive(true)
        scheduleInteractionRelease()
      }}
    >
      <div ref={hostRef} className="map-google-layer__canvas" />
    </div>
  )
}
