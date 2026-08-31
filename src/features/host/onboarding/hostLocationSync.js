import { useEffect } from 'react'

export const HOST_MAP_LOCATION_EVENT = 'movera:host-map-address-change'
export const HOST_MAP_LOCATION_CACHE_KEY = 'movera:host-map-last-location:v1'

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function clearHostMapLocationCache() {
  try { window.localStorage.removeItem(HOST_MAP_LOCATION_CACHE_KEY) } catch { /* storage can be unavailable */ }
}

function writeHostMapLocationCache(location) {
  try {
    window.localStorage.setItem(HOST_MAP_LOCATION_CACHE_KEY, JSON.stringify({
      address: location.address || '',
      city: location.city || '',
      lat: Number(location.latitude),
      lng: Number(location.longitude),
      updatedAt: Date.now(),
    }))
  } catch { /* storage can be unavailable */ }
}

export function readHostMapLocationCache(address, city) {
  try {
    const cached = JSON.parse(window.localStorage.getItem(HOST_MAP_LOCATION_CACHE_KEY) || 'null')
    const lat = Number(cached?.lat)
    const lng = Number(cached?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (normalizeText(cached?.address) !== normalizeText(address)) return null
    if (normalizeText(cached?.city) !== normalizeText(city)) return null
    return { lat, lng, address: cached.address || '', city: cached.city || '' }
  } catch {
    return null
  }
}

export function invalidateHostMapLocation() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HOST_MAP_LOCATION_EVENT, { detail: { clear: true } }))
}

export function normalizeHostMapLocation(detail, current = {}) {
  const latitude = Number(detail?.lat)
  const longitude = Number(detail?.lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const address = typeof detail?.address === 'string' ? detail.address.trim() : ''
  const city = typeof detail?.city === 'string' ? detail.city.trim() : ''

  return {
    address: address || current.address || '',
    city: city || current.city || '',
    latitude,
    longitude,
    pinConfirmed: false,
  }
}

export function useHostMapLocationSync(setDraft) {
  useEffect(() => {
    const onMapLocation = (event) => {
      if (event.detail?.clear === true) {
        clearHostMapLocationCache()
        setDraft((current) => ({
          ...current,
          latitude: null,
          longitude: null,
          pinConfirmed: false,
        }))
        return
      }

      setDraft((current) => {
        const patch = normalizeHostMapLocation(event.detail, current)
        if (!patch) return current
        writeHostMapLocationCache(patch)
        return { ...current, ...patch }
      })
    }

    window.addEventListener(HOST_MAP_LOCATION_EVENT, onMapLocation)
    return () => window.removeEventListener(HOST_MAP_LOCATION_EVENT, onMapLocation)
  }, [setDraft])
}
