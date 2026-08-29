import { screenPoint } from '../geometry/geometry.js'
import { getMarkerState, MarkerState } from '../model/markerModel.js'

export function MarkerLayer({ markers, viewport, size, selectedListingId, onSelect, interactive = true, hiddenIds = new Set() }) {
  return (
    <div className="map-marker-layer" data-testid="map-marker-layer" data-marker-count={markers.length} data-interactive={interactive ? 'true' : 'false'}>
      {markers.map((marker) => {
        const state = getMarkerState(marker, { selectedListingId, hiddenIds })
        if (state === MarkerState.HIDDEN) return null
        const point = screenPoint(marker.lat, marker.lng, viewport, size)
        const visible = point.x > -60 && point.x < size.width + 60 && point.y > -60 && point.y < size.height + 60
        if (!visible) return null
        return (
          <button
            className={`map-marker map-marker--${state}`}
            data-testid={`map-marker-${marker.id}`}
            data-marker-state={state}
            aria-pressed={state === MarkerState.SELECTED}
            aria-disabled={interactive ? undefined : 'true'}
            key={marker.id}
            type="button"
            aria-label={marker.label}
            tabIndex={interactive ? 0 : -1}
            style={{
              transform: `translate3d(${Math.round(point.x)}px, ${Math.round(point.y)}px, 0)`,
              pointerEvents: interactive ? 'auto' : 'none',
            }}
            onClick={interactive ? (event) => {
              event.stopPropagation()
              onSelect(marker)
            } : undefined}
          >
            <span aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
