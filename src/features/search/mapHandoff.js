import { mapCameraContextKey } from '../map/mapUrlViewport.js'

export const MAP_READY_EVENT = 'movera:map-ready'

let navigationListener = null
let probeFrame = 0
let paintFrame = 0
let finalFrame = 0
let sameCameraProbeTimer = 0
let probeStartedAt = 0
let startedOnMap = false
let startingCameraKey = ''

function clearScheduledProbe() {
  if (navigationListener) window.removeEventListener('popstate', navigationListener)
  navigationListener = null
  window.cancelAnimationFrame(probeFrame)
  window.cancelAnimationFrame(paintFrame)
  window.cancelAnimationFrame(finalFrame)
  window.clearTimeout(sameCameraProbeTimer)
  probeFrame = 0
  paintFrame = 0
  finalFrame = 0
  sameCameraProbeTimer = 0
}

function resetHandoffContext() {
  startedOnMap = false
  startingCameraKey = ''
}

function announceAfterPaint() {
  paintFrame = window.requestAnimationFrame(() => {
    finalFrame = window.requestAnimationFrame(() => announceMapReady())
  })
}

function mountedMapSurface() {
  return document.querySelector('[data-testid="page-map"] [data-testid="map-surface"]')
}

function isCurrentRouteMap() {
  const pathname = String(window.location.pathname || '').replace(/\/+$/, '')
  return pathname === '/map' || pathname.endsWith('/map')
}

function currentMapCameraKey() {
  if (!isCurrentRouteMap()) return ''
  return mapCameraContextKey(new URLSearchParams(window.location.search))
}

function waitForMapSurface() {
  const surface = mountedMapSurface()
  if (surface) {
    const rect = surface.getBoundingClientRect()
    const measuredWidth = Number(surface.dataset.width)
    const measuredHeight = Number(surface.dataset.height)
    const sizeStable = Number.isFinite(measuredWidth)
      && Number.isFinite(measuredHeight)
      && Math.abs(measuredWidth - Math.round(rect.width)) <= 1
      && Math.abs(measuredHeight - Math.round(rect.height)) <= 1
    if (sizeStable) {
      announceAfterPaint()
      return
    }
  }

  if (performance.now() - probeStartedAt >= 1000) {
    announceAfterPaint()
    return
  }
  probeFrame = window.requestAnimationFrame(waitForMapSurface)
}

function waitForExistingMapSurface() {
  if (mountedMapSurface()) {
    announceAfterPaint()
    return
  }

  // Same-camera navigation can briefly rerender the Map route in WebKit while
  // canonical query parameters are applied. This is not a new camera load, so
  // wait only for the already-owned Map surface to return instead of falling
  // through to the 2.5 s Search handoff timeout.
  if (performance.now() - probeStartedAt >= 700) {
    announceAfterPaint()
    return
  }
  probeFrame = window.requestAnimationFrame(waitForExistingMapSurface)
}

function beginSameCameraProbe() {
  probeStartedAt = performance.now()
  window.cancelAnimationFrame(probeFrame)
  probeFrame = window.requestAnimationFrame(waitForExistingMapSurface)
}

function armNavigationProbe() {
  clearScheduledProbe()
  navigationListener = () => {
    window.removeEventListener('popstate', navigationListener)
    navigationListener = null
    window.clearTimeout(sameCameraProbeTimer)
    sameCameraProbeTimer = 0

    const nextCameraKey = currentMapCameraKey()

    if (startedOnMap && nextCameraKey) {
      // Reservation metadata (dates/guests) and equivalent numeric URL formatting
      // do not require a new camera. WebKit can briefly rerender the same Map
      // surface while canonical query parameters are applied, so tolerate that
      // short gap before revealing the existing Map again.
      if (nextCameraKey === startingCameraKey) beginSameCameraProbe()

      // A genuinely different camera context is owned by MapPage. Its
      // mapContextKey effect will announce readiness after the new camera settles.
      return
    }

    // Home/collection → Search → Map mounts a new Map surface, so wait for its
    // measured geometry before releasing the Search transition.
    probeStartedAt = performance.now()
    probeFrame = window.requestAnimationFrame(waitForMapSurface)
  }
  window.addEventListener('popstate', navigationListener)

  // Search schedules navigation after its 560 ms completion animation. This
  // semantic fallback also covers a true router no-op where no navigation event
  // arrives. It is safe only when the mounted route still owns the exact same
  // normalized camera context captured when Search opened.
  sameCameraProbeTimer = window.setTimeout(() => {
    if (!startedOnMap) return
    const nextCameraKey = currentMapCameraKey()
    if (!nextCameraKey || nextCameraKey !== startingCameraKey) return
    beginSameCameraProbe()
  }, 650)
}

export function beginMapHandoff() {
  clearScheduledProbe()
  startedOnMap = isCurrentRouteMap() && Boolean(mountedMapSurface())
  startingCameraKey = startedOnMap ? currentMapCameraKey() : ''
  document.documentElement.dataset.moveraMapHandoff = 'true'
  document.body.dataset.moveraMapHandoff = 'true'
  armNavigationProbe()
}

export function endMapHandoff() {
  clearScheduledProbe()
  resetHandoffContext()
  delete document.documentElement.dataset.moveraMapHandoff
  delete document.body.dataset.moveraMapHandoff
}

export function announceMapReady() {
  window.dispatchEvent(new CustomEvent(MAP_READY_EVENT))
}
