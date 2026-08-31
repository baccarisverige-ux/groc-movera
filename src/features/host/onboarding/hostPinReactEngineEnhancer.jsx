import { createRoot } from 'react-dom/client'
import { HostPinMap } from './HostPinMap.jsx'
import { readHostMapLocationCache } from './hostLocationSync.js'

export const HOST_PIN_REACT_QUERY_VALUE = 'react'
export const HOST_MAP_LOCATION_EVENT = 'movera:host-map-address-change'
const REACT_READY_SELECTOR = '[data-testid="host-pin-react-map"]'

// The React address-driven map is the normal host pin engine.
// Keep this helper for compatibility with older tests/imports.
export function shouldUseReactHostPinMap() {
  return true
}

function publishLocation(location) {
  if (!location || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HOST_MAP_LOCATION_EVENT, { detail: location }))
}

function readInitialLocation(card) {
  const text = card.querySelector('.host-onboarding__address-chip span')?.textContent?.trim() || ''
  if (!text) return { address: '', city: '', latitude: null, longitude: null }

  const parts = text.split(',').map((part) => part.trim()).filter(Boolean)
  const base = parts.length <= 1
    ? { address: text, city: '' }
    : { address: parts.slice(0, -1).join(', '), city: parts.at(-1) || '' }
  const cached = readHostMapLocationCache(base.address, base.city)

  return {
    ...base,
    latitude: cached?.lat ?? null,
    longitude: cached?.lng ?? null,
  }
}

export function installHostPinReactEngine() {
  if (typeof window === 'undefined') return () => {}

  let mountedCard = null
  let mountedSection = null
  let reactRoot = null
  let reactNode = null
  let readyFrame = 0
  let readinessObserver = null
  const failedCards = new WeakSet()

  const syncConfirmState = () => {
    const map = reactNode?.querySelector(REACT_READY_SELECTOR)
    const confirm = mountedSection?.querySelector('.host-onboarding__secondary')
    if (!confirm) return
    const ready = map?.dataset.locationReady === 'true'
    confirm.disabled = !ready
    confirm.setAttribute('aria-disabled', ready ? 'false' : 'true')
    confirm.dataset.locationReady = ready ? 'true' : 'false'
  }

  const watchLocationReadiness = () => {
    readinessObserver?.disconnect()
    readinessObserver = new MutationObserver(syncConfirmState)
    if (reactNode) {
      readinessObserver.observe(reactNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-location-ready'],
      })
    }
    if (mountedSection) readinessObserver.observe(mountedSection, { childList: true, subtree: true })
    syncConfirmState()
  }

  const unmount = ({ keepFailure = false } = {}) => {
    if (readyFrame) cancelAnimationFrame(readyFrame)
    readyFrame = 0
    readinessObserver?.disconnect()
    readinessObserver = null
    const confirm = mountedSection?.querySelector('.host-onboarding__secondary')
    if (confirm) {
      confirm.disabled = false
      confirm.removeAttribute('aria-disabled')
      delete confirm.dataset.locationReady
    }
    reactRoot?.unmount()
    reactNode?.remove()
    if (mountedCard) {
      if (!keepFailure) delete mountedCard.dataset.reactMapEngine
      else mountedCard.dataset.reactMapEngine = 'failed'
    }
    reactRoot = null
    reactNode = null
    mountedCard = null
    mountedSection = null
  }

  const verifyReactSurface = (card, node, setHint) => {
    readyFrame = requestAnimationFrame(() => {
      readyFrame = requestAnimationFrame(() => {
        readyFrame = 0
        if (mountedCard !== card || reactNode !== node || !card.isConnected) return
        if (node.querySelector(REACT_READY_SELECTOR)) {
          card.dataset.reactMapEngine = 'true'
          watchLocationReadiness()
          return
        }

        failedCards.add(card)
        setHint('Impossible de charger la carte pour le moment')
        const confirm = mountedSection?.querySelector('.host-onboarding__secondary')
        if (confirm) confirm.disabled = true
        unmount({ keepFailure: true })
      })
    })
  }

  const sync = () => {
    const section = document.querySelector('.host-onboarding[data-screen="pin"]')
    const card = section?.querySelector('.host-onboarding__map-card')

    if (!card) {
      if (mountedCard) unmount()
      return
    }
    if (failedCards.has(card)) return
    if (card === mountedCard) {
      syncConfirmState()
      return
    }
    if (mountedCard) unmount()

    card.dataset.reactMapEngine = 'pending'
    const hint = card.querySelector('.host-onboarding__map-hint')
    const node = document.createElement('div')
    node.className = 'host-step5-react-engine-root'
    card.prepend(node)

    const setHint = (message) => {
      if (hint && message) hint.textContent = message
    }

    const initial = readInitialLocation(card)

    reactNode = node
    mountedCard = card
    mountedSection = section
    reactRoot = createRoot(node)
    reactRoot.render(
      <HostPinMap
        initialAddress={initial.address}
        initialCity={initial.city}
        latitude={initial.latitude}
        longitude={initial.longitude}
        onLocationChange={publishLocation}
        onHintChange={setHint}
      />,
    )
    verifyReactSurface(card, node, setHint)
  }

  const observer = new MutationObserver(sync)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-screen'],
  })
  sync()

  return () => {
    observer.disconnect()
    unmount()
  }
}
