import { useEffect, useMemo, useState } from 'react'
import { scanTunisia } from '../../services/geocoding/index.js'
import { SEARCH_ADDRESS_SUGGESTIONS, SEARCH_DESTINATIONS } from './searchData.js'
import { scanTunisiaByVirtualPinLegacy } from './tunisiaPinScannerLegacy.js'

export const SEARCH_ADDRESS_PREVIEW_EVENT = 'movera:search-address-preview'

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('fr')
}

function localMatches(query) {
  const normalized = normalize(query)
  if (!normalized) return SEARCH_ADDRESS_SUGGESTIONS.slice(0, 2)
  return SEARCH_ADDRESS_SUGGESTIONS.filter((address) => normalize(`${address.label} ${address.subtitle}`).includes(normalized)).slice(0, 5)
}

function nearestDestinationId(lat, lng) {
  let best = SEARCH_DESTINATIONS[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const destination of SEARCH_DESTINATIONS) {
    const dLat = destination.viewport.lat - lat
    const dLng = destination.viewport.lng - lng
    const distance = dLat * dLat + dLng * dLng
    if (distance < bestDistance) {
      bestDistance = distance
      best = destination
    }
  }
  return best?.id || 'tunis'
}

function attachDestination(address) {
  if (!address?.viewport) return address
  return {
    ...address,
    destinationId: nearestDestinationId(address.viewport.lat, address.viewport.lng),
  }
}

function dedupe(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = normalize(`${item?.label}|${item?.subtitle}`)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function publishPreview(address, stage = 'idle') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SEARCH_ADDRESS_PREVIEW_EVENT, {
    detail: address
      ? {
          id: address.id,
          label: address.label,
          subtitle: address.subtitle,
          viewport: address.viewport,
          source: address.source,
          scanStage: stage,
        }
      : null,
  }))
}

async function scanWithSafeFallback(query, options) {
  try {
    return await scanTunisia(query, options)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return scanTunisiaByVirtualPinLegacy(query, options)
  }
}

export function useAddressAutocomplete(query, active) {
  const local = useMemo(() => localMatches(query), [query])
  const [remote, setRemote] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const normalized = normalize(query)
    if (!active || normalized.length < 3) {
      setRemote([])
      setLoading(false)
      publishPreview(null)
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const scan = await scanWithSafeFallback(query, {
          signal: controller.signal,
          onCandidate: (candidate) => {
            if (controller.signal.aborted) return
            publishPreview(attachDestination(candidate), 'candidate')
          },
        })

        if (controller.signal.aborted) return

        const next = dedupe((scan.suggestions || []).map(attachDestination)).slice(0, 10)
        const detected = attachDestination(scan.detected)
        setRemote(next)

        publishPreview(detected || next[0] || null, detected ? 'detected' : 'candidate')
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setRemote([])
          publishPreview(null)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 460)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, active])

  const suggestions = useMemo(() => {
    const hasQuery = normalize(query).length >= 3
    if (hasQuery) return remote.slice(0, 10)
    return dedupe(local).slice(0, 5)
  }, [local, remote, query])

  return { suggestions, loading }
}
