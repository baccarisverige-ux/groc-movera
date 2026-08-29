export function MapControls({ onZoomIn, onZoomOut }) {
  return (
    <div className="map-controls" data-testid="map-controls">
      <button type="button" aria-label="Zoom avant" onClick={onZoomIn}>+</button>
      <button type="button" aria-label="Zoom arrière" onClick={onZoomOut}>−</button>
    </div>
  )
}
