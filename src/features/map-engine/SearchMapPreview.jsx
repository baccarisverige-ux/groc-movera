import { useEffect, useRef, useState } from 'react'
import { SEARCH_ADDRESS_PREVIEW_EVENT } from '../search/useAddressAutocomplete.js'
import { TileLayer } from './layers/TileLayer.jsx'
import { ResizeManager } from './lifecycle/ResizeManager.jsx'

export function SearchMapPreview({ viewport }) {
  const surfaceRef = useRef(null)
  const [size, setSize] = useState({ width: 390, height: 560 })
  const [detectedAddress, setDetectedAddress] = useState(null)

  useEffect(() => {
    const onAddressPreview = (event) => {
      const next = event.detail
      const candidate = next?.viewport
      if (
        candidate
        && Number.isFinite(Number(candidate.lat))
        && Number.isFinite(Number(candidate.lng))
        && Number.isFinite(Number(candidate.zoom))
      ) {
        setDetectedAddress(next)
        return
      }
      setDetectedAddress(null)
    }

    window.addEventListener(SEARCH_ADDRESS_PREVIEW_EVENT, onAddressPreview)
    return () => window.removeEventListener(SEARCH_ADDRESS_PREVIEW_EVENT, onAddressPreview)
  }, [])

  const effectiveViewport = detectedAddress?.viewport || viewport

  return (
    <div
      className="map-engine map-engine--preview"
      data-testid="search-map-preview"
      data-address-detected={detectedAddress ? 'true' : 'false'}
      data-detected-address={detectedAddress?.label || ''}
    >
      <div ref={surfaceRef} className="map-surface map-surface--preview">
        <TileLayer viewport={effectiveViewport} size={size} />
        {detectedAddress ? (
          <div className="search-map-preview__pin" aria-hidden="true">
            <span />
          </div>
        ) : null}
        <ResizeManager targetRef={surfaceRef} onSize={setSize} />
      </div>
    </div>
  )
}
