import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createAddressSearchSession,
  isRemoteAddressSearchAvailable,
  resolveAddressSuggestion,
  suggestAddresses,
} from '../../services/geocoding/index.js'
import { SEARCH_ADDRESS_SUGGESTIONS, SEARCH_DESTINATIONS } from './searchData.js'

export const SEARCH_ADDRESS_PREVIEW_EVENT = 'movera:search-address-preview'

const REMOTE_DEBOUNCE_MS = 460

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

/* Suggestions while typing come from local Movera addresses immediately and,
   when the Movera browser key is configured, from Places API (New). Neither
   path geocodes per keystroke: a remote suggestion carries no coordinates
   until the user picks it, which is what resolveSuggestion is for. */
export function useAddressAutocomplete(query, active) {
  const local = useMemo(() => localMatches(query), [query])
  const [remote, setRemote] = useState([])
  const [loading, setLoading] = useState(false)
  const sessionRef = useRef(null)

  useEffect(() => {
    const normalized = normalize(query)
    if (!active || normalized.length < 3 || !isRemoteAddressSearchAvailable()) {
      setRemote([])
      setLoading(false)
      return undefined
    }

    // One session spans the keystrokes of this lookup and the details call that
    // ends it, so the whole lookup is billed once.
    if (!sessionRef.current || sessionRef.current.closed) sessionRef.current = createAddressSearchSession()

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const suggestions = await suggestAddresses(query, {
          session: sessionRef.current,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setRemote(suggestions)
      } catch (error) {
        if (error?.name !== 'AbortError') setRemote([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, REMOTE_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, active])

  useEffect(() => {
    if (active) return
    sessionRef.current = null
    publishPreview(null)
  }, [active])

  const suggestions = useMemo(() => {
    const localWithDestination = dedupe(local).map(attachDestination)
    const hasQuery = normalize(query).length >= 3
    if (!hasQuery) return localWithDestination.slice(0, 5)
    // Local Movera addresses stay on top: they are instant and already framed.
    return [...localWithDestination, ...remote].slice(0, 10)
  }, [local, remote, query])

  /* Called when the user picks a suggestion. Local entries resolve instantly
     from their own viewport; a Places entry costs exactly one details call. */
  const resolveSuggestion = useCallback(async (suggestion) => {
    const resolved = await resolveAddressSuggestion(suggestion, { session: sessionRef.current })
    if (sessionRef.current?.closed) sessionRef.current = null
    if (!resolved?.viewport) return null
    const withDestination = attachDestination(resolved)
    publishPreview(withDestination, 'detected')
    return withDestination
  }, [])

  return { suggestions, loading, resolveSuggestion }
}
