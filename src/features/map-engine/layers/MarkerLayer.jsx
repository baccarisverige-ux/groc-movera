import { screenPoint } from '../geometry/geometry.js'
import { getMarkerState, MarkerState } from '../model/markerModel.js'

export function MarkerLayer({ markers, viewport, size, selectedListingId, onSelect, interactive = true, hiddenIds = new Set() }) {
  return (
    <div className="map-marker-layer" data-testid="map-marker-layer" data-marker-count={markers.length} data-interactive={interactive ? 'true' : 'false'}>
      {markers.map((marker) => {
        const state = getMarkerState(marker, { selectedListingId, hiddenIds })
        if (state === MarkerState.HIDDEN) return null
        const point = screenPoint(marker.lat, marker.lng, viewport, size)
        const visible = point.x > -80 && point.x < size.width + 80 && point.y > -80 && point.y < size.height + 80
        if (!visible) return null
        const price = marker.price || marker.label
        const selected = state === MarkerState.SELECTED
        return (
          <button
            className={`map-marker map-marker--${state}`}
            data-testid={`map-marker-${marker.id}`}
            data-marker-state={state}
            data-price={price}
            aria-pressed={selected}
            aria-disabled={interactive ? undefined : 'true'}
            key={marker.id}
            type="button"
            aria-label={`${marker.label}, ${price}`}
            tabIndex={interactive ? 0 : -1}
            style={{
              transform: `translate3d(${point.x.toFixed(3)}px, ${point.y.toFixed(3)}px, 0)`,
              pointerEvents: interactive ? 'auto' : 'none',
            }}
            onClick={interactive ? (event) => {
              event.stopPropagation()
              onSelect(marker)
            } : undefined}
          >
            <span className="map-marker__pill">{price}</span>
          </button>
        )
      })}
    </div>
  )
}
