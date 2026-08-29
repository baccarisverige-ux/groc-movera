import { TILE_SIZE, project } from '../geometry/geometry.js'
import { GoogleMapLayer } from './GoogleMapLayer.jsx'

const CARTO_SUBDOMAINS = Object.freeze(['a', 'b', 'c', 'd'])

function cartoVoyagerUrl(zoom, x, y) {
  const subdomain = CARTO_SUBDOMAINS[Math.abs(x + y) % CARTO_SUBDOMAINS.length]
  const retina = typeof window !== 'undefined' && window.devicePixelRatio > 1 ? '@2x' : ''
  return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}${retina}.png`
}

function openStreetMapFallbackUrl(zoom, x, y) {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}

function fallbackTiles(viewport, size) {
  const zoom = Math.floor(viewport.zoom)
  const scale = 2 ** (viewport.zoom - zoom)
  const tilesPerAxis = 2 ** zoom
  const center = project(viewport.lat, viewport.lng, zoom)
  const halfWidth = size.width / (2 * scale)
  const halfHeight = size.height / (2 * scale)
  const minTileX = Math.floor((center.x - halfWidth) / TILE_SIZE)
  const maxTileX = Math.floor((center.x + halfWidth) / TILE_SIZE)
  const minTileY = Math.max(0, Math.floor((center.y - halfHeight) / TILE_SIZE))
  const maxTileY = Math.min(tilesPerAxis - 1, Math.floor((center.y + halfHeight) / TILE_SIZE))
  const tiles = []

  for (let y = minTileY; y <= maxTileY; y += 1) {
    for (let x = minTileX; x <= maxTileX; x += 1) {
      const wrappedX = ((x % tilesPerAxis) + tilesPerAxis) % tilesPerAxis
      const left = (x * TILE_SIZE - center.x) * scale + size.width / 2
      const top = (y * TILE_SIZE - center.y) * scale + size.height / 2
      tiles.push({ x, y, wrappedX, left, top })
    }
  }

  return { zoom, scale, tiles }
}

export function TileLayer({
  viewport,
  viewportSource = 'app',
  size,
  markers = [],
  interactive = false,
  showFallbackTiles = true,
  onGoogleStatus,
  onGoogleViewportChange,
  onGoogleInteractionChange,
  onGoogleMarkerSelect,
  onGoogleClusterFocus,
}) {
  const fallback = showFallbackTiles ? fallbackTiles(viewport, size) : null

  return (
    <>
      {fallback ? (
        <div
          className="map-tiles"
          data-testid="map-tile-layer"
          data-tile-count={fallback.tiles.length}
          data-tile-zoom={fallback.zoom}
          data-scale={fallback.scale}
          data-tile-provider="carto-voyager"
          aria-hidden="true"
        >
          {fallback.tiles.map((tile) => {
            const src = cartoVoyagerUrl(fallback.zoom, tile.wrappedX, tile.y)
            const fallbackSrc = openStreetMapFallbackUrl(fallback.zoom, tile.wrappedX, tile.y)
            return (
              <div
                className="map-tile"
                key={`${fallback.zoom}-${tile.x}-${tile.y}`}
                style={{ transform: `translate3d(${tile.left}px, ${tile.top}px, 0) scale(${fallback.scale})` }}
              >
                <img
                  alt=""
                  decoding="async"
                  draggable="false"
                  fetchPriority="high"
                  loading="eager"
                  src={src}
                  data-fallback-src={fallbackSrc}
                  onLoad={(event) => { event.currentTarget.style.visibility = 'visible' }}
                  onError={(event) => {
                    const image = event.currentTarget
                    const fallbackSrcValue = image.dataset.fallbackSrc
                    if (fallbackSrcValue && image.src !== fallbackSrcValue) {
                      image.dataset.fallbackSrc = ''
                      image.src = fallbackSrcValue
                      return
                    }
                    image.style.visibility = 'hidden'
                  }}
                />
              </div>
            )
          })}
        </div>
      ) : null}
      <GoogleMapLayer
        viewport={viewport}
        viewportSource={viewportSource}
        markers={markers}
        interactive={interactive}
        onStatus={onGoogleStatus}
        onViewportChange={onGoogleViewportChange}
        onInteractionChange={onGoogleInteractionChange}
        onMarkerSelect={onGoogleMarkerSelect}
        onClusterFocus={onGoogleClusterFocus}
      />
    </>
  )
}
