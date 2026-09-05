import { useEffect, useState } from 'react'
import { TILE_SIZE, project } from '../geometry/geometry.js'
import { GoogleMapLayer } from './GoogleMapLayer.jsx'

const CARTO_SUBDOMAINS = Object.freeze(['a', 'b', 'c', 'd'])
const CARTO_API_KEY = String(import.meta.env.VITE_CARTO_API_KEY || '').trim()

function googleMapsRuntimeEnabled() {
  return typeof window !== 'undefined' && window.__MOVERA_GOOGLE_MAPS_ENABLED__ === true
}

function cartoVoyagerUrl(zoom, x, y) {
  const subdomain = CARTO_SUBDOMAINS[Math.abs(x + y) % CARTO_SUBDOMAINS.length]
  const retina = typeof window !== 'undefined' && window.devicePixelRatio > 1 ? '@2x' : ''
  const key = CARTO_API_KEY ? `?apikey=${encodeURIComponent(CARTO_API_KEY)}` : ''
  return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}${retina}.png${key}`
}

function openStreetMapFallbackUrl(zoom, x, y) {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}

function rasterTileUrl(zoom, x, y) {
  return CARTO_API_KEY ? cartoVoyagerUrl(zoom, x, y) : openStreetMapFallbackUrl(zoom, x, y)
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
  const useGoogleMaps = googleMapsRuntimeEnabled()
  const fallback = showFallbackTiles ? fallbackTiles(viewport, size) : null
  const fallbackKey = fallback
    ? `${fallback.zoom}:${fallback.tiles.map((tile) => `${tile.wrappedX}-${tile.y}`).join(',')}`
    : 'none'
  const [tileStatus, setTileStatus] = useState({ key: fallbackKey, loaded: 0, failed: 0 })
  const currentTileStatus = tileStatus.key === fallbackKey ? tileStatus : { key: fallbackKey, loaded: 0, failed: 0 }

  useEffect(() => {
    setTileStatus({ key: fallbackKey, loaded: 0, failed: 0 })
  }, [fallbackKey])

  useEffect(() => {
    if (!useGoogleMaps) onGoogleStatus?.('fallback')
  }, [useGoogleMaps, onGoogleStatus])

  const settleTile = (image, result) => {
    if (image.dataset.tileSettled === 'true') return
    image.dataset.tileSettled = 'true'
    setTileStatus((current) => {
      const base = current.key === fallbackKey ? current : { key: fallbackKey, loaded: 0, failed: 0 }
      return { ...base, [result]: base[result] + 1 }
    })
  }

  const tileCount = fallback?.tiles.length || 0
  const tilesUnavailable = tileCount > 0
    && currentTileStatus.loaded === 0
    && currentTileStatus.failed >= tileCount

  return (
    <>
      {fallback ? (
        <div
          className="map-tiles"
          data-testid="map-tile-layer"
          data-tile-count={fallback.tiles.length}
          data-tile-zoom={fallback.zoom}
          data-scale={fallback.scale}
          data-tile-provider={CARTO_API_KEY ? 'carto-voyager' : 'osm'}
          aria-hidden="true"
        >
          {fallback.tiles.map((tile) => {
            const src = rasterTileUrl(fallback.zoom, tile.wrappedX, tile.y)
            const fallbackSrc = CARTO_API_KEY ? openStreetMapFallbackUrl(fallback.zoom, tile.wrappedX, tile.y) : ''
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
                  onLoad={(event) => {
                    event.currentTarget.style.visibility = 'visible'
                    settleTile(event.currentTarget, 'loaded')
                  }}
                  onError={(event) => {
                    const image = event.currentTarget
                    const fallbackSrcValue = image.dataset.fallbackSrc
                    if (fallbackSrcValue && image.src !== fallbackSrcValue) {
                      image.dataset.fallbackSrc = ''
                      image.src = fallbackSrcValue
                      return
                    }
                    image.style.visibility = 'hidden'
                    settleTile(image, 'failed')
                  }}
                />
              </div>
            )
          })}
        </div>
      ) : null}
      {tilesUnavailable ? (
        <div className="map-tile-fallback" data-testid="map-tile-fallback" role="status">
          <strong>Carte momentanément indisponible</strong>
          <span>Les offres restent consultables.</span>
        </div>
      ) : null}
      {useGoogleMaps ? (
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
      ) : null}
    </>
  )
}
