export const DEFAULT_MAP_LISTING_FOCUS = Object.freeze({
  anchorX: 0.5,
  anchorY: 0.26,
  zoomDelta: 0.65,
  minZoom: 13.6,
  maxZoom: 17,
})

export function assertMapSheetMapCameraPort(port) {
  for (const method of ['focusListing', 'cancelFocus']) {
    if (typeof port?.[method] !== 'function') throw new TypeError(`Map Sheet MapCameraPort requires ${method}()`)
  }
  return port
}
