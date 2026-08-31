import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer } from '../../map-engine/MapContainer.jsx'
import { reverseGeocode, searchAddress } from '../../../services/geocoding/index.js'
import { invalidateHostMapLocation } from './hostLocationSync.js'
import './host-pin-react-map.css'

const FALLBACK_VIEWPORT = Object.freeze({ lat: 36.8065, lng: 10.1815, zoom: 13 })
const PIN_ZOOM = 17
const REVERSE_DELAY_MS = 360

function coordinateNumber(value, min, max) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) return null
  return number
}

export function hostPinHasCoordinates(value = {}) {
  const lat = coordinateNumber(value.latitude ?? value.lat, -90, 90)
  const lng = coordinateNumber(value.longitude ?? value.lng, -180, 180)
  return lat !== null && lng !== null
}

export function hostPinViewportFromDraft(draft = {}) {
  const lat = coordinateNumber(draft.latitude, -90, 90)
  const lng = coordinateNumber(draft.longitude, -180, 180)
  if (lat !== null && lng !== null) return { lat, lng, zoom: PIN_ZOOM }
  return { ...FALLBACK_VIEWPORT }
}

export function hostLocationFromResult(result, viewport, fallback = {}) {
  const lat = coordinateNumber(viewport?.lat, -90, 90)
  const lng = coordinateNumber(viewport?.lng, -180, 180)
  if (lat === null || lng === null) return null

  const location = result?.location || {}
  return {
    lat,
    lng,
    address: String(result?.label || fallback.address || '').trim(),
    city: String(location.city || fallback.city || '').trim(),
  }
}

function searchQuery(address, city) {
  const street = String(address || '').trim()
  const locality = String(city || '').trim()
  if (!locality || street.toLocaleLowerCase('fr').includes(locality.toLocaleLowerCase('fr'))) return street
  return [street, locality].filter(Boolean).join(', ')
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
  const initialSnapshotRef = useRef({ initialAddress, initialCity, latitude, longitude })
  const initialViewport = useMemo(
    () => hostPinViewportFromDraft({ latitude, longitude }),
    [latitude, longitude],
  )
  const [query, setQuery] = useState(initialAddress)
  const [viewportCommand, setViewportCommand] = useState(null)
  const [loading, setLoading] = useState('')
  const [locationReady, setLocationReady] = useState(() => hostPinHasCoordinates({ latitude, longitude }))
  const currentViewportRef = useRef(initialViewport)
  const currentAddressRef = useRef(initialAddress)
  const currentCityRef = useRef(initialCity)
  const reverseTimerRef = useRef(0)
  const reverseRevisionRef = useRef(0)
  const userInteractionRef = useRef(false)

  currentAddressRef.current = query

  const setHint = useCallback((message) => {
    onHintChange?.(message)
  }, [onHintChange])

  const publishResult = useCallback((result, viewport, fallback = {}) => {
    const location = hostLocationFromResult(result, viewport, {
      address: fallback.address || currentAddressRef.current,
      city: fallback.city || currentCityRef.current,
    })
    if (!location) return
    if (location.address) {
      currentAddressRef.current = location.address
      setQuery(location.address)
    }
    if (location.city) currentCityRef.current = location.city
    setLocationReady(true)
    onLocationChange?.(location)
  }, [onLocationChange])

  const reverseAt = useCallback(async (viewport, hint = 'Adresse ajustée · déplacez la carte si nécessaire') => {
    const revision = ++reverseRevisionRef.current
    try {
      const result = await reverseGeocode({ lat: viewport.lat, lng: viewport.lng, zoom: 18 })
      if (revision !== reverseRevisionRef.current) return
      publishResult(result, viewport)
      setHint(hint)
    } catch {
      if (revision !== reverseRevisionRef.current) return
      // A reverse-geocoding outage must never discard the coordinate the host chose.
      publishResult(null, viewport)
      setHint('Position enregistrée · adresse momentanément indisponible')
    }
  }, [publishResult, setHint])

  const scheduleReverse = useCallback((viewport) => {
    window.clearTimeout(reverseTimerRef.current)
    setHint('Détection de l’adresse…')
    reverseTimerRef.current = window.setTimeout(() => reverseAt(viewport), REVERSE_DELAY_MS)
  }, [reverseAt, setHint])

  const handleViewportChange = useCallback((viewport) => {
    currentViewportRef.current = viewport
  }, [])

  const handleInteractionChange = useCallback((active) => {
    if (active) {
      userInteractionRef.current = true
      window.clearTimeout(reverseTimerRef.current)
      return
    }
    if (!userInteractionRef.current) return
    userInteractionRef.current = false
    scheduleReverse(currentViewportRef.current)
  }, [scheduleReverse])

  const moveTo = useCallback((lat, lng, zoom = PIN_ZOOM) => {
    const next = { lat: Number(lat), lng: Number(lng), zoom, revision: Date.now() + Math.random() }
    if (![next.lat, next.lng, next.zoom].every(Number.isFinite)) return
    currentViewportRef.current = next
    setViewportCommand(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    const snapshot = initialSnapshotRef.current
    const hasCoordinates = hostPinHasCoordinates({ latitude: snapshot.latitude, longitude: snapshot.longitude })
    const typed = searchQuery(snapshot.initialAddress, snapshot.initialCity)

    const initialize = async () => {
      if (hasCoordinates) {
        setHint('Emplacement détecté · ajustez la carte si nécessaire')
        return
      }

      if (typed.length < 3) {
        setHint('Écrivez une adresse ou utilisez votre position')
        return
      }

      setHint('Recherche de l’adresse…')
      try {
        const [found] = await searchAddress(typed, { countryCode: 'tn', language: 'fr', limit: 1 })
        if (cancelled) return
        if (found?.viewport) {
          const next = { ...found.viewport, zoom: PIN_ZOOM }
          publishResult(found, next, {
            address: snapshot.initialAddress,
            city: snapshot.initialCity,
          })
          moveTo(next.lat, next.lng, PIN_ZOOM)
          setHint('Adresse trouvée · ajustez la carte si nécessaire')
          return
        }
      } catch {
        // Keep the host-entered address untouched. The fallback map is presentation only.
      }

      if (!cancelled) {
        setLocationReady(false)
        setHint('Adresse non localisée automatiquement · recherchez-la ici ou utilisez votre position')
      }
    }

    initialize()
    return () => {
      cancelled = true
      window.clearTimeout(reverseTimerRef.current)
      reverseRevisionRef.current += 1
    }
  }, [moveTo, publishResult, setHint])

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
      const fullQuery = searchQuery(text, currentCityRef.current)
      const [found] = await searchAddress(fullQuery, { countryCode: 'tn', language: 'fr', limit: 1 })
      if (!found?.viewport) {
        setHint('Adresse introuvable · vérifiez puis réessayez')
        return
      }
      const next = { ...found.viewport, zoom: PIN_ZOOM }
      publishResult(found, next, { address: text, city: currentCityRef.current })
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
        setHint('Autorisez la localisation ou recherchez l’adresse')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  return (
    <div className="host-step5-react-map" data-testid="host-pin-react-map" data-location-ready={locationReady ? 'true' : 'false'}>
      <div className="host-step5-real-map host-step5-real-map--react">
        <MapContainer
          markers={[]}
          initialViewport={initialViewport}
          onViewportChange={handleViewportChange}
          onInteractionChange={handleInteractionChange}
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
          onChange={(event) => {
            currentAddressRef.current = event.target.value
            setQuery(event.target.value)
            setLocationReady(false)
            invalidateHostMapLocation()
          }}
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
