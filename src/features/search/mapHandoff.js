import { NAVIGATION_COMMIT_EVENT } from '../../app/router/navigationEvents.js'
import { mapCameraContextKey } from '../map/mapUrlViewport.js'

export const MAP_READY_EVENT = 'movera:map-ready'

let navigationListener = null
let startedOnMap = false
let startingCameraKey = ''

function removeNavigationListener() {
  if (navigationListener) window.removeEventListener(NAVIGATION_COMMIT_EVENT, navigationListener)
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

function armNavigationCommit() {
  removeNavigationListener()
  navigationListener = () => {
    removeNavigationListener()
    if (!startedOnMap) return

    const committedCameraKey = currentMapCameraKey()
    if (!committedCameraKey || committedCameraKey !== startingCameraKey) return

    // Same-camera Search submissions (dates/guests changes or an exact re-submit)
    // need only the router's real React commit. They must never wait on a DOM probe
    // or an arbitrary timeout because the existing Map camera is already ready.
    announceMapReady(committedCameraKey, { source: 'navigation-commit' })
  }
  window.addEventListener(NAVIGATION_COMMIT_EVENT, navigationListener)
}

export function beginMapHandoff() {
  removeNavigationListener()
  startedOnMap = isCurrentRouteMap()
  startingCameraKey = startedOnMap ? currentMapCameraKey() : ''
  document.documentElement.dataset.moveraMapHandoff = 'true'
  document.body.dataset.moveraMapHandoff = 'true'
  armNavigationCommit()
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
