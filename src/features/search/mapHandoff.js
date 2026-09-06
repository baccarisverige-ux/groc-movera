export const MAP_READY_EVENT = 'movera:map-ready'

let navigationListener = null
let probeFrame = 0
let paintFrame = 0
let finalFrame = 0
let probeStartedAt = 0

function clearProbe() {
  if (navigationListener) window.removeEventListener('popstate', navigationListener)
  navigationListener = null
  window.cancelAnimationFrame(probeFrame)
  window.cancelAnimationFrame(paintFrame)
  window.cancelAnimationFrame(finalFrame)
  probeFrame = 0
  paintFrame = 0
  finalFrame = 0
}

function announceAfterPaint() {
  paintFrame = window.requestAnimationFrame(() => {
    finalFrame = window.requestAnimationFrame(() => announceMapReady())
  })
}

function waitForMapSurface() {
  const page = document.querySelector('[data-testid="page-map"]')
  const surface = page?.querySelector('[data-testid="map-surface"]') || null
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

function armNavigationProbe() {
  clearProbe()
  navigationListener = () => {
    window.removeEventListener('popstate', navigationListener)
    navigationListener = null
    probeStartedAt = performance.now()
    probeFrame = window.requestAnimationFrame(waitForMapSurface)
  }
  window.addEventListener('popstate', navigationListener)
}

export function beginMapHandoff() {
  document.documentElement.dataset.moveraMapHandoff = 'true'
  document.body.dataset.moveraMapHandoff = 'true'
  armNavigationProbe()
}

export function endMapHandoff() {
  clearProbe()
  delete document.documentElement.dataset.moveraMapHandoff
  delete document.body.dataset.moveraMapHandoff
}

export function announceMapReady() {
  window.dispatchEvent(new CustomEvent(MAP_READY_EVENT))
}
