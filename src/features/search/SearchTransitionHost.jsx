import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { storageAdapter } from '../../services/storage/storageAdapter.js'
import { SearchMapPreview } from '../map-engine/SearchMapPreview.jsx'
import { beginMapHandoff, endMapHandoff, MAP_READY_EVENT } from './mapHandoff.js'
import { GuestSelector } from './GuestSelector.jsx'
import { SearchCalendar } from './SearchCalendar.jsx'
import { SearchStepMotion } from './SearchStepMotion.jsx'
import { SEARCH_DESTINATIONS } from './searchData.js'
import { buildMapSearchPath, createSearchState, isDateRangeValid, totalTravellers } from './searchState.js'
import { useAddressAutocomplete } from './useAddressAutocomplete.js'
import { useSearchPanelFit } from './useSearchPanelFit.js'
import { useSearchPanelHeightMotion } from './useSearchPanelHeightMotion.js'
import './searchTransition.css'
import './searchTransition-stability.css'
import './searchStepFit.css'
import './searchAddressMode.css'
import './searchExactFit.css'

const OPEN_MS = 980
const CLOSE_MS = 1750
const COMPLETE_MS = 560
const READY_MS = 820
const RECENT_KEY = 'movera-search-recents-v1'
const SEARCH_OVERVIEW_VIEWPORT = Object.freeze({ lat: 34.15, lng: 9.55, zoom: 7 })

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="3"/><path d="M8 3v5M16 3v5M4 10h16"/></svg>
}

function formatDate(value) {
  if (!value) return 'À choisir'
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

function guestSummary(state) {
  const travellers = totalTravellers(state)
  const parts = [`${travellers} voyageur${travellers > 1 ? 's' : ''}`]
  if (state.infants) parts.push(`${state.infants} bébé${state.infants > 1 ? 's' : ''}`)
  if (state.pets) parts.push(`${state.pets} animal${state.pets > 1 ? 'aux' : ''}`)
  return parts.join(' · ')
}

function readRecents() {
  const parsed = storageAdapter.getJson(RECENT_KEY, [])
  return Array.isArray(parsed) ? parsed.slice(0, 3) : []
}

function destinationById(id) {
  return SEARCH_DESTINATIONS.find((destination) => destination.id === id) || null
}

function numericParam(params, key, fallback, minimum = 0) {
  const value = Number(params.get(key))
  return Number.isFinite(value) && value >= minimum ? value : fallback
}

function mapSearchStateFromLocation() {
  if (!window.location.pathname.endsWith('/map')) return null
  const params = new URLSearchParams(window.location.search)
  const destination = destinationById(params.get('destination'))
  if (!destination) return null

  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const zoom = Number(params.get('zoom'))
  const viewport = [lat, lng, zoom].every(Number.isFinite)
    ? { lat, lng, zoom }
    : destination.viewport
  const label = params.get('place')?.trim() || destination.label

  return {
    destinationQuery: label,
    state: {
      destination: { ...destination, label, viewport },
      checkin: params.get('checkin') || '',
      checkout: params.get('checkout') || '',
      adults: numericParam(params, 'adults', 1, 1),
      children: numericParam(params, 'children', 0),
      infants: numericParam(params, 'infants', 0),
      pets: numericParam(params, 'pets', 0),
    },
  }
}

export function SearchTransitionHost({ onNavigate }) {
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [complete, setComplete] = useState(false)
  const [closing, setClosing] = useState(false)
  const [step, setStep] = useState('destination')
  const [state, setState] = useState(createSearchState)
  const [origin, setOrigin] = useState({ top: 72, left: 14, width: 362, height: 52 })
  const [lockedViewportHeight, setLockedViewportHeight] = useState(760)
  const [destinationQuery, setDestinationQuery] = useState('')
  const [mapOriginSummary, setMapOriginSummary] = useState(null)
  const [addressMode, setAddressMode] = useState(false)
  const [recentSearches, setRecentSearches] = useState(readRecents)
  const closeTimerRef = useRef(0)
  const completeTimerRef = useRef(0)
  const stepTimerRef = useRef(0)
  const readyTimerRef = useRef(0)
  const handoffFallbackTimerRef = useRef(0)
  const mapHandoffRef = useRef(false)
  const skipScrollRestoreRef = useRef(false)
  const lockedScrollYRef = useRef(0)
  const closingRef = useRef(false)

  const selectedViewport = state.destination?.viewport || SEARCH_OVERVIEW_VIEWPORT
  const datesValid = isDateRangeValid(state.checkin, state.checkout)
  const minDate = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])
  const filteredDestinations = useMemo(() => {
    const query = destinationQuery.trim().toLocaleLowerCase('fr')
    const matches = query
      ? SEARCH_DESTINATIONS.filter((destination) => `${destination.label} ${destination.subtitle}`.toLocaleLowerCase('fr').includes(query))
      : SEARCH_DESTINATIONS
    return matches.slice(0, 4)
  }, [destinationQuery])
  const { suggestions: addressSuggestions, loading: addressLoading } = useAddressAutocomplete(destinationQuery, addressMode)
  const { contentRef, panelHeight: fittedPanelHeight } = useSearchPanelFit({ active, step, addressMode, lockedViewportHeight })
  const fallbackPanelHeight = Math.min(570, Math.max(455, Math.round(lockedViewportHeight * 0.64)))
  const animatedPanelHeight = useSearchPanelHeightMotion({
    active,
    open,
    ready,
    targetHeight: fittedPanelHeight,
    fallbackHeight: fallbackPanelHeight,
  })

  const clearTimers = () => {
    window.clearTimeout(closeTimerRef.current)
    window.clearTimeout(completeTimerRef.current)
    window.clearTimeout(stepTimerRef.current)
    window.clearTimeout(readyTimerRef.current)
    window.clearTimeout(handoffFallbackTimerRef.current)
  }

  const finalizeMapHandoff = useCallback(() => {
    if (!mapHandoffRef.current) return
    window.clearTimeout(handoffFallbackTimerRef.current)
    mapHandoffRef.current = false
    endMapHandoff()
    window.requestAnimationFrame(() => {
      setActive(false)
      setComplete(false)
      window.requestAnimationFrame(() => {
        setDestinationQuery('')
        setAddressMode(false)
        setMapOriginSummary(null)
      })
    })
  }, [])

  const closeTransition = () => {
    if (!active || complete || closingRef.current) return
    closingRef.current = true
    setClosing(true)
    clearTimers()
    setReady(false)
    setOpen(false)
    closeTimerRef.current = window.setTimeout(() => {
      setActive(false)
      closingRef.current = false
      window.requestAnimationFrame(() => {
        setClosing(false)
        setDestinationQuery('')
        setAddressMode(false)
        setMapOriginSummary(null)
      })
    }, CLOSE_MS)
  }

  const closeFromPointer = (event) => {
    if (event.pointerType !== 'touch') return
    event.preventDefault()
    event.stopPropagation()
    closeTransition()
  }

  useEffect(() => {
    const onSearchClick = (event) => {
      if (active) return
      const trigger = event.target.closest('.b225-search')
      if (!trigger || !document.querySelector('[data-testid="page-home"]')) return
      event.preventDefault()
      event.stopPropagation()
      clearTimers()
      endMapHandoff()
      mapHandoffRef.current = false
      skipScrollRestoreRef.current = false
      closingRef.current = false
      setClosing(false)
      const rect = trigger.getBoundingClientRect()
      const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || 760)
      const restoredSearch = mapSearchStateFromLocation()
      const openedFromMap = Boolean(trigger.closest('.b225-map-top'))
      const originPrimary = openedFromMap ? trigger.querySelector('strong')?.textContent?.trim() || '' : ''
      const originMeta = openedFromMap ? trigger.querySelector('small')?.textContent?.trim() || '' : ''
      setOrigin({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
      setLockedViewportHeight(viewportHeight)
      setState(restoredSearch?.state || createSearchState())
      setRecentSearches(readRecents())
      setDestinationQuery(restoredSearch?.destinationQuery || originPrimary)
      setMapOriginSummary(openedFromMap ? { primary: originPrimary, meta: originMeta } : null)
      setAddressMode(false)
      setStep('destination')
      setComplete(false)
      setReady(false)
      setActive(true)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setOpen(true)
        readyTimerRef.current = window.setTimeout(() => setReady(true), READY_MS)
      }))
    }
    document.addEventListener('click', onSearchClick, true)
    return () => document.removeEventListener('click', onSearchClick, true)
  }, [active])

  useEffect(() => {
    if (!active) return undefined
    const body = document.body
    const html = document.documentElement
    lockedScrollYRef.current = Math.max(0, window.scrollY || window.pageYOffset || 0)
    const restoreScrollY = lockedScrollYRef.current
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    }

    html.dataset.moveraSearchLock = 'true'
    body.dataset.moveraSearchLock = 'true'
    html.style.height = `${lockedViewportHeight}px`
    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    body.style.position = 'fixed'
    body.style.top = `-${restoreScrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.height = `${lockedViewportHeight}px`
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'

    const preventMove = (event) => event.preventDefault()
    document.addEventListener('touchmove', preventMove, { passive: false })
    document.addEventListener('wheel', preventMove, { passive: false })

    return () => {
      document.removeEventListener('touchmove', preventMove)
      document.removeEventListener('wheel', preventMove)
      delete html.dataset.moveraSearchLock
      delete body.dataset.moveraSearchLock
      body.style.position = previous.bodyPosition
      body.style.top = previous.bodyTop
      body.style.left = previous.bodyLeft
      body.style.right = previous.bodyRight
      body.style.width = previous.bodyWidth
      body.style.height = previous.bodyHeight
      body.style.overflow = previous.bodyOverflow
      body.style.overscrollBehavior = previous.bodyOverscroll
      html.style.height = previous.htmlHeight
      html.style.overflow = previous.htmlOverflow
      html.style.overscrollBehavior = previous.htmlOverscroll
      const shouldRestoreScroll = !skipScrollRestoreRef.current
      skipScrollRestoreRef.current = false
      if (shouldRestoreScroll) {
        window.requestAnimationFrame(() => window.scrollTo(0, restoreScrollY))
      }
    }
  }, [active, lockedViewportHeight])

  useEffect(() => {
    if (!active) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeTransition()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, complete])

  useEffect(() => {
    const onMapReady = () => {
      if (!mapHandoffRef.current) return
      window.requestAnimationFrame(finalizeMapHandoff)
    }
    window.addEventListener(MAP_READY_EVENT, onMapReady)
    return () => window.removeEventListener(MAP_READY_EVENT, onMapReady)
  }, [finalizeMapHandoff])

  useEffect(() => () => {
    clearTimers()
    if (mapHandoffRef.current) {
      mapHandoffRef.current = false
      endMapHandoff()
    }
  }, [])

  const chooseDestination = (destination) => {
    clearTimers()
    setMapOriginSummary(null)
    setAddressMode(false)
    setState((current) => ({ ...current, destination }))
    stepTimerRef.current = window.setTimeout(() => setStep('dates'), 220)
  }

  const chooseAddressSuggestion = (address) => {
    const destination = destinationById(address.destinationId)
    if (!destination) return
    clearTimers()
    setMapOriginSummary(null)
    setState((current) => ({
      ...current,
      destination: { ...destination, label: address.label, subtitle: address.subtitle, viewport: address.viewport },
    }))
    setDestinationQuery(`${address.label}, ${address.subtitle}`)
    setAddressMode(false)
    stepTimerRef.current = window.setTimeout(() => setStep('dates'), 180)
  }

  const applyRecent = (recent) => {
    const destination = destinationById(recent.destinationId)
    if (!destination) return
    setState({
      destination,
      checkin: recent.checkin || '',
      checkout: recent.checkout || '',
      adults: Math.max(1, Number(recent.adults) || 1),
      children: Math.max(0, Number(recent.children) || 0),
      infants: Math.max(0, Number(recent.infants) || 0),
      pets: Math.max(0, Number(recent.pets) || 0),
    })
    setAddressMode(false)
    setStep(recent.checkin && recent.checkout ? 'guests' : 'dates')
  }

  const saveRecent = () => {
    if (!state.destination) return
    const entry = {
      destinationId: state.destination.id,
      label: state.destination.label,
      checkin: state.checkin,
      checkout: state.checkout,
      adults: state.adults,
      children: state.children,
      infants: state.infants,
      pets: state.pets,
    }
    const next = [entry, ...recentSearches.filter((item) => item.destinationId !== entry.destinationId)].slice(0, 3)
    setRecentSearches(next)
    try { storageAdapter.setJson(RECENT_KEY, next) } catch { /* stockage indisponible */ }
  }

  const submitSearch = () => {
    if (!state.destination || !datesValid || state.adults < 1) return
    clearTimers()
    saveRecent()
    beginMapHandoff()
    mapHandoffRef.current = true
    skipScrollRestoreRef.current = true
    setReady(false)
    setComplete(true)
    setOpen(false)
    const path = buildMapSearchPath(state)
    completeTimerRef.current = window.setTimeout(() => {
      onNavigate(path)
      handoffFallbackTimerRef.current = window.setTimeout(finalizeMapHandoff, 2500)
    }, COMPLETE_MS)
  }

  if (!active) return null

  const panelHeight = animatedPanelHeight
  const rootStyle = {
    '--st-origin-top': `${origin.top}px`,
    '--st-origin-left': `${origin.left}px`,
    '--st-origin-width': `${origin.width}px`,
    '--st-origin-height': `${origin.height}px`,
    '--st-locked-vh': `${lockedViewportHeight}px`,
    '--st-runtime-panel-height': `${panelHeight}px`,
    '--st-panel-height': `${panelHeight}px`,
  }
  const rootClass = ['movera-st', open ? 'movera-st--open' : '', ready ? 'movera-st--ready' : '', complete ? 'movera-st--complete' : ''].filter(Boolean).join(' ')
  const stepIndex = step === 'destination' ? 1 : step === 'dates' ? 2 : 3

  return createPortal(
    <div className={rootClass} style={rootStyle} data-testid="search-transition" data-step={step} data-ready={ready ? 'true' : 'false'} data-address-mode={addressMode ? 'true' : 'false'} data-map-origin={mapOriginSummary ? 'true' : 'false'} data-closing={closing ? 'true' : 'false'} data-exact-fit="true">
      <div className="movera-st__map-stage" aria-hidden="true">
        <SearchMapPreview viewport={selectedViewport} />
      </div>
      <div className="movera-st__map-veil" aria-hidden="true" />

      <div className="movera-st__persistent-search movera-st__destination-search" role="search" aria-label="Rechercher une destination">
        <SearchIcon />
        <div className="movera-st__persistent-copy">
          <input
            value={destinationQuery}
            onFocus={() => {
              setAddressMode(true)
              setStep('destination')
            }}
            onChange={(event) => {
              setDestinationQuery(event.target.value)
              setMapOriginSummary(null)
              setAddressMode(true)
              setStep('destination')
            }}
            placeholder="Explorez autrement"
            aria-label="Destination ou adresse"
            role="combobox"
            aria-expanded={addressMode}
            aria-controls="movera-address-suggestions"
            autoComplete="off"
          />
          <span className="movera-st__persistent-meta">{mapOriginSummary ? mapOriginSummary.meta : datesValid ? `${formatDate(state.checkin)} – ${formatDate(state.checkout)}` : 'Destination · Dates · Voyageurs'}</span>
        </div>
      </div>
      <button type="button" className="movera-st__persistent-toggle" onPointerDown={closeFromPointer} onClick={closeTransition} aria-label="Fermer">
        <span className="movera-st__persistent-close-icon" aria-hidden="true">×</span>
      </button>

      <section className="movera-st__panel" role="dialog" aria-modal="true" aria-label="Recherche Movera">
        <div className="movera-st__shine" aria-hidden="true" />
        <div className="movera-st__content" ref={contentRef}>
          <div className="movera-st__topline">
            <span className="movera-st__brandmark" aria-hidden="true"><span /></span>
            <div className="movera-st__brandcopy"><strong>Movera</strong><span>Votre séjour, simplement</span></div>
            <span className="movera-st__progress">{stepIndex}/3</span>
          </div>

          {addressMode ? (
            <div className="movera-st__address-mode" id="movera-address-suggestions" aria-busy={addressLoading ? 'true' : 'false'}>
              <span className="movera-st__address-label">{destinationQuery.trim() ? 'Adresses suggérées' : 'Adresses populaires'}</span>
              {addressLoading ? <div className="movera-st__address-loading" role="status">Recherche d’adresses…</div> : null}
              {addressSuggestions.length ? (
                <div className="movera-st__address-suggestions">
                  {addressSuggestions.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      className="movera-st__address-suggestion"
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => chooseAddressSuggestion(address)}
                    >
                      <span className="movera-st__address-pin"><PinIcon /></span>
                      <span className="movera-st__address-copy"><strong>{address.label}</strong><small>{address.subtitle}</small></span>
                      <span className="movera-st__address-arrow" aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              ) : <div className="movera-st__address-empty">Aucune adresse correspondante</div>}
            </div>
          ) : (
            <>
              <div className="movera-st__steps" aria-label="Étapes de recherche">
                <button type="button" className="movera-st__step" data-active={step === 'destination'} data-complete={Boolean(state.destination)} onClick={() => setStep('destination')}><span>1</span>Destination</button>
                <button type="button" className="movera-st__step" data-active={step === 'dates'} data-complete={datesValid} disabled={!state.destination} onClick={() => state.destination && setStep('dates')}><span>2</span>Dates</button>
                <button type="button" className="movera-st__step" data-active={step === 'guests'} disabled={!datesValid} onClick={() => datesValid && setStep('guests')}><span>3</span>Voyageurs</button>
              </div>

              <div className="movera-st__body">
                <SearchStepMotion step={step}>
                {step === 'destination' ? (
                  <div className="movera-st__screen movera-st__screen--destination" data-testid="search-step-destination">
                    <div className="movera-st__screen-head"><div><h2 className="movera-st__title">Où allez-vous ?</h2><p className="movera-st__sub">Trouvez votre prochaine adresse Movera.</p></div><PinIcon /></div>
                    {!destinationQuery ? (
                      <div className="movera-st__recent-block">
                        <span className="movera-st__section-label">Recherches récentes</span>
                        {recentSearches.length ? <div className="movera-st__recents">{recentSearches.slice(0, 1).map((recent) => <button type="button" key={`${recent.destinationId}-${recent.checkin}`} className="movera-st__recent" onClick={() => applyRecent(recent)}><span className="movera-st__recent-pin"><PinIcon /></span><span><strong>{recent.label}</strong><small>{recent.checkin && recent.checkout ? `${formatDate(recent.checkin)} – ${formatDate(recent.checkout)} · ${Math.max(1, Number(recent.adults) || 1) + Math.max(0, Number(recent.children) || 0)} voyageur(s)` : 'Recherche précédente'}</small></span><b>›</b></button>)}</div> : <div className="movera-st__recent-empty">Aucune recherche récente pour le moment</div>}
                      </div>
                    ) : null}
                    <span className="movera-st__section-label movera-st__section-label--suggestions">Destinations suggérées</span>
                    <div className="movera-st__destinations">
                      {filteredDestinations.map((destination) => <button key={destination.id} type="button" className="movera-st__destination" data-destination={destination.id} onClick={() => chooseDestination(destination)}><span className="movera-st__destination-pin"><PinIcon /></span><span className="movera-st__destination-copy"><strong>{destination.label}</strong><small>{destination.subtitle}</small></span><span className="movera-st__chevron" aria-hidden="true">›</span></button>)}
                      {filteredDestinations.length === 0 ? <div className="movera-st__empty">Aucune destination trouvée</div> : null}
                    </div>
                  </div>
                ) : null}

                {step === 'dates' ? (
                  <div className="movera-st__screen movera-st__screen--dates" data-testid="search-step-dates">
                    <div className="movera-st__screen-head"><div><h2 className="movera-st__title">Choisissez vos dates</h2><p className="movera-st__sub">{state.destination?.label} · sélectionnez l’arrivée puis le départ.</p></div><CalendarIcon /></div>
                    <SearchCalendar checkin={state.checkin} checkout={state.checkout} minDate={minDate} onChange={({ checkin, checkout }) => setState((current) => ({ ...current, checkin, checkout }))} />
                    <div className="movera-st__tripline"><span>{state.destination?.label}</span><i /><strong>{formatDate(state.checkin)} → {formatDate(state.checkout)}</strong></div>
                    <button type="button" className="movera-st__action" disabled={!datesValid} onClick={() => setStep('guests')}>Continuer vers les voyageurs <span>›</span></button>
                  </div>
                ) : null}

                {step === 'guests' ? (
                  <div className="movera-st__screen movera-st__screen--guests" data-testid="search-step-guests">
                    <div className="movera-st__screen-head"><div><h2 className="movera-st__title">Qui voyage ?</h2><p className="movera-st__sub">Ajoutez les voyageurs et vos animaux.</p></div><span className="movera-st__people" aria-hidden="true">••</span></div>
                    <GuestSelector state={state} onChange={setState} />
                    <div className="movera-st__tripline"><span>{state.destination?.label}</span><i /><strong>{formatDate(state.checkin)} → {formatDate(state.checkout)}</strong><i /><span>{guestSummary(state)}</span></div>
                    <button type="button" className="movera-st__action movera-st__action--search" onClick={submitSearch}><SearchIcon /><span>Rechercher sur la carte</span></button>
                  </div>
                ) : null}
                </SearchStepMotion>
              </div>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
