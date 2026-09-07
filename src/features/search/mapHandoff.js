import { NAVIGATION_APPLIED_EVENT } from '../../app/router/navigationEvents.js'
import { mapCameraContextKey } from '../map/mapUrlViewport.js'

export const MAP_READY_EVENT = 'movera:map-ready'

let navigationListener = null
let startedOnMap = false
let startingCameraKey = ''

function removeNavigationListener() {
  if (navigationListener) window.removeEventListener(NAVIGATION_APPLIED_EVENT, navigationListener)
  navigationListener = null
}

function resetHandoffContext() {
  startedOnMap = false
  startingCameraKey = ''
}

function isCurrentRouteMap() {
  const pathname = String(window.location.pathname || '').replace(/\/+$/, '')
  return pathname === '/map' || pathname.endsWith('/map')
}

function currentMapCameraKey() {
  if (!isCurrentRouteMap()) return ''
  return mapCameraContextKey(new URLSearchParams(window.location.search))
}

function armNavigationApplied() {
  removeNavigationListener()
  navigationListener = () => {
    removeNavigationListener()
    if (!startedOnMap) return

    const nextCameraKey = currentMapCameraKey()
    if (!nextCameraKey || nextCameraKey !== startingCameraKey) return

    // The router emits NAVIGATION_APPLIED_EVENT synchronously after history has
    // been updated and before React route work begins. A matching camera key
    // therefore means the already-mounted Map is still the authoritative view.
    // Search can release immediately; genuine camera changes still wait for the
    // MapPage MAP_READY signal after the new surface has settled.
    announceMapReady(nextCameraKey, { source: 'same-camera-navigation-applied' })
  }
  window.addEventListener(NAVIGATION_APPLIED_EVENT, navigationListener)
}

export function beginMapHandoff() {
  removeNavigationListener()
  startedOnMap = isCurrentRouteMap()
  startingCameraKey = startedOnMap ? currentMapCameraKey() : ''
  document.documentElement.dataset.moveraMapHandoff = 'true'
  document.body.dataset.moveraMapHandoff = 'true'
  armNavigationApplied()
}

export function endMapHandoff() {
  removeNavigationListener()
  resetHandoffContext()
  delete document.documentElement.dataset.moveraMapHandoff
  delete document.body.dataset.moveraMapHandoff
}

export function announceMapReady(cameraKey = currentMapCameraKey(), meta = {}) {
  window.dispatchEvent(new CustomEvent(MAP_READY_EVENT, {
    detail: {
      cameraKey: cameraKey || '',
      ...meta,
    },
  }))
}
