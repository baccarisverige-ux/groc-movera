export const MAP_READY_EVENT = 'movera:map-ready'

export function beginMapHandoff() {
  document.documentElement.dataset.moveraMapHandoff = 'true'
  document.body.dataset.moveraMapHandoff = 'true'
}

export function endMapHandoff() {
  delete document.documentElement.dataset.moveraMapHandoff
  delete document.body.dataset.moveraMapHandoff
}

export function announceMapReady() {
  window.dispatchEvent(new CustomEvent(MAP_READY_EVENT))
}
