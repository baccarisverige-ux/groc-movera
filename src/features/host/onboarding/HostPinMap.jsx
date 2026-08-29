import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer } from '../../map-engine/MapContainer.jsx'
import { reverseGeocode, searchAddress } from '../../../services/geocoding/index.js'
import './host-pin-react-map.css'

const FALLBACK_VIEWPORT = Object.freeze({ lat: 36.8065, lng: 10.1815, zoom: 13 })
const PIN_ZOOM = 17
const REVERSE_DELAY_MS = 420

export function hostPinViewportFromDraft(draft = {}) {
  const lat = Number(draft.latitude)
  const lng = Number(draft.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, zoom: PIN_ZOOM }
  return { ...FALLBACK_VIEWPORT }
}

export function hostLocationFromResult(result, viewport, fallback = {}) {
  const lat = Number(viewport?.lat)
  const lng = Number(viewport?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const location = result?.location || {}
  return {
    lat,
    lng,
    address: String(result?.label || fallback.address || '').trim(),
    city: String(location.city || fallback.city || '').trim(),
  }
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}

function SearchPinIcon() {
  return (
    <svg className="host-step5-address-search__pin" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  )
}

function SearchArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
}

export function HostPinMap({
  initialAddress = '',
  initialCity = '',
  latitude = null,
  longitude = null,
  onLocationChange,
  onHintChange,
}) {
  const initialViewport = useMemo(
    () => hostPinViewportFromDraft({ latitude, longitude }),
    [latitude, longitude],
  )
  const [query, setQuery] = useState(initialAddress)
  const [viewportCommand, setViewportCommand] = useState(null)
  const [loading, setLoading] = useState('')
  const currentViewportRef = useRef(initialViewport)
  const reverseTimerRef = useRef(0)
  const reverseRevisionRef = useRef(0)
  const initializationRef = useRef(true)

  const setHint = useCallback((message) => {
    onHintChange?.(message)
  }, [onHintChange])

  const publishResult = useCallback((result, viewport, fallbackAddress = query) => {
    const location = hostLocationFromResult(result, viewport, {
      address: fallbackAddress,
      city: initialCity,
    })
    if (!location) return
    if (location.address) setQuery(location.address)
    onLocationChange?.(location)
  }, [initialCity, onLocationChange, query])

  const reverseAt = useCallback(async (viewport, hint = 'Adresse ajustée · déplacez la carte si nécessaire') => {
    const revision = ++reverseRevisionRef.current
    try {
      const result = await reverseGeocode({ lat: viewport.lat, lng: viewport.lng, zoom: 18 })
      if (revision !== reverseRevisionRef.current) return
      publishResult(result, viewport)
      setHint(hint)
    } catch {
      if (revision !== reverseRevisionRef.current) return
      publishResult(null, viewport)
      setHint('Position ajustée · adresse non disponible')
    }
  }, [publishResult, setHint])

  const scheduleReverse = useCallback((viewport) => {
    window.clearTimeout(reverseTimerRef.current)
    setHint('Détection de l’adresse…')
    reverseTimerRef.current = window.setTimeout(() => reverseAt(viewport), REVERSE_DELAY_MS)
  }, [reverseAt, setHint])

  const handleViewportChange = useCallback((viewport) => {
    currentViewportRef.current = viewport
    if (initializationRef.current) return
    scheduleReverse(viewport)
  }, [scheduleReverse])

  const moveTo = useCallback((lat, lng, zoom = PIN_ZOOM) => {
    const next = { lat: Number(lat), lng: Number(lng), zoom, revision: Date.now() + Math.random() }
    if (![next.lat, next.lng, next.zoom].every(Number.isFinite)) return
    currentViewportRef.current = next
    setViewportCommand(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    const typed = [initialAddress, initialCity].filter(Boolean).join(', ').trim()

    const initialize = async () => {
      if (!hasCoordinates && typed.length >= 3) {
        setHint('Recherche de l’adresse…')
        try {
          const [found] = await searchAddress(typed, { countryCode: 'tn', language: 'fr', limit: 1 })
          if (!cancelled && found?.viewport) {
            const next = { ...found.viewport, zoom: PIN_ZOOM }
            publishResult(found, next, initialAddress)
            initializationRef.current = false
            moveTo(next.lat, next.lng, PIN_ZOOM)
            setHint('Adresse trouvée · ajustez la carte si nécessaire')
            return
          }
        } catch {
          // Keep the Tunis fallback and let the fixed pin resolve the visible position.
        }
      }

      if (cancelled) return
      initializationRef.current = false
      scheduleReverse(currentViewportRef.current)
    }

    initialize()
    return () => {
      cancelled = true
      window.clearTimeout(reverseTimerRef.current)
      reverseRevisionRef.current += 1
    }
  }, [initialAddress, initialCity, latitude, longitude, moveTo, publishResult, scheduleReverse, setHint])

  const submitSearch = async (event) => {
    event.preventDefault()
    const text = query.trim()
    if (text.length < 3) {
      setHint('Écrivez une adresse complète')
      return
    }

    setLoading('search')
    setHint('Recherche de l’adresse…')
    try {
      const [found] = await searchAddress(text, { countryCode: 'tn', language: 'fr', limit: 1 })
      if (!found?.viewport) {
        setHint('Adresse introuvable · vérifiez puis réessayez')
        return
      }
      const next = { ...found.viewport, zoom: PIN_ZOOM }
      publishResult(found, next, text)
      moveTo(next.lat, next.lng, PIN_ZOOM)
      setHint('Adresse trouvée · ajustez la carte si nécessaire')
    } catch {
      setHint('Impossible de rechercher cette adresse pour le moment')
    } finally {
      setLoading('')
    }
  }

  const locateUser = () => {
    if (!navigator.geolocation) {
      setHint('La géolocalisation n’est pas disponible')
      return
    }

    setLoading('gps')
    setHint('Recherche de votre position…')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude, zoom: PIN_ZOOM }
        moveTo(next.lat, next.lng, PIN_ZOOM)
        await reverseAt(next, 'Adresse détectée à partir de votre position')
        setLoading('')
      },
      () => {
        setLoading('')
        setHint('Autorisez la localisation ou déplacez la carte')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  return (
    <div className="host-step5-react-map" data-testid="host-pin-react-map">
      <div className="host-step5-real-map host-step5-real-map--react">
        <MapContainer
          markers={[]}
          initialViewport={initialViewport}
          onViewportChange={handleViewportChange}
          viewportCommand={viewportCommand}
        />
      </div>

      <form className="host-step5-address-search" role="search" onSubmit={submitSearch}>
        <SearchPinIcon />
        <input
          className="host-step5-address-input"
          type="text"
          autoComplete="street-address"
          enterKeyHint="search"
          aria-label="Rechercher ou modifier l’adresse"
          placeholder="Écrivez une adresse"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="host-step5-address-search__button" type="submit" aria-label="Rechercher cette adresse" data-loading={loading === 'search' ? 'true' : 'false'}>
          <SearchArrowIcon />
        </button>
      </form>

      <div className="host-step5-center-pin" aria-hidden="true" />
      <button className="host-step5-location-button" type="button" aria-label="Utiliser ma position actuelle" data-loading={loading === 'gps' ? 'true' : 'false'} onClick={locateUser}>
        <LocationIcon />
      </button>
    </div>
  )
}
