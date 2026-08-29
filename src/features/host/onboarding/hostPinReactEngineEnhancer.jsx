import { createRoot } from 'react-dom/client'
import { HostPinMap } from './HostPinMap.jsx'

export const HOST_PIN_REACT_QUERY_VALUE = 'react'
export const HOST_MAP_LOCATION_EVENT = 'movera:host-map-address-change'
const REACT_READY_SELECTOR = '[data-testid="host-pin-react-map"]'

export function shouldUseReactHostPinMap(search = typeof window !== 'undefined' ? window.location.search : '') {
  return new URLSearchParams(search).get('hostMap') === HOST_PIN_REACT_QUERY_VALUE
}

function publishLocation(location) {
  if (!location || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HOST_MAP_LOCATION_EVENT, { detail: location }))
}

function readInitialAddress(card) {
  return card.querySelector('.host-onboarding__address-chip span')?.textContent?.trim() || ''
}

export function installHostPinReactEngine() {
  if (typeof window === 'undefined' || !shouldUseReactHostPinMap()) return () => {}

  let mountedCard = null
  let reactRoot = null
  let reactNode = null
  let readyFrame = 0
  const failedCards = new WeakSet()

  const unmount = ({ keepFailure = false } = {}) => {
    if (readyFrame) cancelAnimationFrame(readyFrame)
    readyFrame = 0
    reactRoot?.unmount()
    reactNode?.remove()
    if (mountedCard) {
      if (!keepFailure) delete mountedCard.dataset.reactMapEngine
      else mountedCard.dataset.reactMapEngine = 'failed'
    }
    reactRoot = null
    reactNode = null
    mountedCard = null
  }

  const verifyReactSurface = (card, node, setHint) => {
    readyFrame = requestAnimationFrame(() => {
      readyFrame = requestAnimationFrame(() => {
        readyFrame = 0
        if (mountedCard !== card || reactNode !== node || !card.isConnected) return
        if (node.querySelector(REACT_READY_SELECTOR)) {
          card.dataset.reactMapEngine = 'true'
          return
        }

        failedCards.add(card)
        setHint('Moteur de secours activé')
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
    if (card === mountedCard) return
    if (mountedCard) unmount()

    card.dataset.reactMapEngine = 'pending'
    const hint = card.querySelector('.host-onboarding__map-hint')
    const node = document.createElement('div')
    node.className = 'host-step5-react-engine-root'
    card.prepend(node)

    const setHint = (message) => {
      if (hint && message) hint.textContent = message
    }

    reactNode = node
    mountedCard = card
    reactRoot = createRoot(node)
    reactRoot.render(
      <HostPinMap
        initialAddress={readInitialAddress(card)}
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
