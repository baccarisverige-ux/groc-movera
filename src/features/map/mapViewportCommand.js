export function normalizeMapViewport(viewport) {
  if (!viewport) return null
  const lat = Number(viewport.lat)
  const lng = Number(viewport.lng)
  const zoom = Number(viewport.zoom)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoom)) return null
  return { lat, lng, zoom }
}

export function createMapViewportCommand(viewport, revision = performance.now()) {
  const normalized = normalizeMapViewport(viewport)
  return normalized ? { ...normalized, revision } : null
}

export function viewportCommandForContext(viewportState, contextKey) {
  return viewportState?.contextKey === contextKey ? viewportState.command : null
}
