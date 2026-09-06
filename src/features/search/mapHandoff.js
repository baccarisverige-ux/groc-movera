import { mapCameraContextKey } from '../map/mapUrlViewport.js'

export const MAP_READY_EVENT = 'movera:map-ready'

let navigationListener = null
let startedOnMap = false
let startingCameraKey = ''

function removeNavigationListener() {
  if (navigationListener) window.removeEventListener('popstate', navigationListener)
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

function armHistoryNavigation() {
  removeNavigationListener()
  navigationListener = () => {
    removeNavigationListener()
    if (!startedOnMap) return

    const nextCameraKey = currentMapCameraKey()
    if (!nextCameraKey || nextCameraKey !== startingCameraKey) return

    // Same-camera Map submissions do not require any Map reload. pushState/
    // replaceState updates window.location synchronously before popstate is
    // dispatched, so the semantic camera comparison is authoritative here.
    // Release Search immediately and reserve MAP_READY for genuine camera changes.
    announceMapReady(nextCameraKey, { source: 'same-camera-navigation' })
  }
  window.addEventListener('popstate', navigationListener)
}

export function beginMapHandoff() {
  removeNavigationListener()
  startedOnMap = isCurrentRouteMap()
  startingCameraKey = startedOnMap ? currentMapCameraKey() : ''
  document.documentElement.dataset.moveraMapHandoff = 'true'
  document.body.dataset.moveraMapHandoff = 'true'
  armHistoryNavigation()
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
