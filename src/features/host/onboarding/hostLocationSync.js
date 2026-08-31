import { useEffect } from 'react'
import { storageAdapter } from '../../../services/storage/storageAdapter.js'

export const HOST_MAP_LOCATION_EVENT = 'movera:host-map-address-change'
export const HOST_MAP_LOCATION_CACHE_KEY = 'movera:host-map-last-location:v1'

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function coordinateNumber(value, min, max) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) return null
  return number
}

function clearHostMapLocationCache() {
  storageAdapter.remove(HOST_MAP_LOCATION_CACHE_KEY)
}

function writeHostMapLocationCache(location) {
  storageAdapter.setJson(HOST_MAP_LOCATION_CACHE_KEY, {
    address: location.address || '',
    city: location.city || '',
    lat: Number(location.latitude),
    lng: Number(location.longitude),
    updatedAt: Date.now(),
  })
}

export function readHostMapLocationCache(address, city) {
  const cached = storageAdapter.getJson(HOST_MAP_LOCATION_CACHE_KEY, null)
  const lat = coordinateNumber(cached?.lat, -90, 90)
  const lng = coordinateNumber(cached?.lng, -180, 180)
  if (lat === null || lng === null) return null
  if (normalizeText(cached?.address) !== normalizeText(address)) return null
  if (normalizeText(cached?.city) !== normalizeText(city)) return null
  return { lat, lng, address: cached.address || '', city: cached.city || '' }
}

export function invalidateHostMapLocation() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HOST_MAP_LOCATION_EVENT, { detail: { clear: true } }))
}

export function normalizeHostMapLocation(detail, current = {}) {
  const latitude = coordinateNumber(detail?.lat, -90, 90)
  const longitude = coordinateNumber(detail?.lng, -180, 180)
  if (latitude === null || longitude === null) return null

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
