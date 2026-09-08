import { screenPoint } from '../geometry/geometry.js'
import { getMarkerState, MarkerState } from '../model/markerModel.js'

export function MarkerLayer({
  markers,
  viewport,
  size,
  selectedListingId,
  onSelect,
  onSeparate,
  interactive = true,
  hiddenIds = new Set(),
  clusteredIds = new Set(),
  absorbedCounts = new Map(),
}) {
  return (
    <div className="map-marker-layer" data-testid="map-marker-layer" data-marker-count={markers.length} data-interactive={interactive ? 'true' : 'false'}>
      {markers.map((marker) => {
        const state = getMarkerState(marker, { selectedListingId, clusteredIds, hiddenIds })
        /* A clustered pin is not drawn at all -- it is counted on the pin that
           kept its place. Drawing it anyway is what buried its neighbours. */
        if (state === MarkerState.HIDDEN || state === MarkerState.CLUSTERED) return null
        const point = screenPoint(marker.lat, marker.lng, viewport, size)
        const visible = point.x > -80 && point.x < size.width + 80 && point.y > -80 && point.y < size.height + 80
        if (!visible) return null
        const price = marker.price || marker.label
        const selected = state === MarkerState.SELECTED
        const absorbed = absorbedCounts.get(marker.id) || 0
        const group = absorbed > 0
        return (
          <button
            className={`map-marker map-marker--${state}${group ? ' map-marker--group' : ''}`}
            data-testid={`map-marker-${marker.id}`}
            data-marker-state={state}
            data-price={price}
            data-absorbed={absorbed}
            aria-pressed={group ? undefined : selected}
            aria-disabled={interactive ? undefined : 'true'}
            key={marker.id}
            type="button"
            /* A pin standing in for others announces the group and zooms in, the
               same contract as the cluster bubble. A lone pin still selects. */
            aria-label={group ? `${marker.label} et ${absorbed} autre${absorbed > 1 ? 's' : ''} logement${absorbed > 1 ? 's' : ''}, agrandir` : `${marker.label}, ${price}`}
            tabIndex={interactive ? 0 : -1}
            style={{
              transform: `translate3d(${point.x.toFixed(3)}px, ${point.y.toFixed(3)}px, 0)`,
              pointerEvents: interactive ? 'auto' : 'none',
            }}
            onClick={interactive ? (event) => {
              event.stopPropagation()
              if (group) onSeparate?.(marker)
              else onSelect(marker)
            } : undefined}
          >
            <span className="map-marker__pill">
              {price}
              {group ? <span className="map-marker__more" aria-hidden="true">+{absorbed}</span> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
