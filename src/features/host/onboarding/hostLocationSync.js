import { useEffect } from 'react'

export const HOST_MAP_LOCATION_EVENT = 'movera:host-map-address-change'

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
      setDraft((current) => {
        const patch = normalizeHostMapLocation(event.detail, current)
        return patch ? { ...current, ...patch } : current
      })
    }

    window.addEventListener(HOST_MAP_LOCATION_EVENT, onMapLocation)
    return () => window.removeEventListener(HOST_MAP_LOCATION_EVENT, onMapLocation)
  }, [setDraft])
}
