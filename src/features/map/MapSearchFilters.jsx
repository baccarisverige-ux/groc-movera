import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  SlidersHorizontalIcon,
} from '../../shared/icons/AppIcons.jsx'
import { MAP_AMENITY_FILTERS } from './mapListingFilters.js'
import './map-search-filters.css'

export function MapSearchFilters({
  cityLabel,
  primaryLabel,
  dateLabel,
  amenityFilters,
  discountOnly = false,
  propertyFilter = 'all',
  compact = false,
  onHome,
  onAmenityFilterToggle,
  onDiscountToggle,
  onResetFilters,
}) {
  const activeFilterCount = amenityFilters.size
    + (discountOnly ? 1 : 0)
    + (propertyFilter !== 'all' ? 1 : 0)
  const [searchDraft, setSearchDraft] = useState(primaryLabel)
  const filterRailRef = useRef(null)

  useEffect(() => {
    setSearchDraft(primaryLabel)
  }, [primaryLabel])

  useEffect(() => {
    const syncPopupDraft = (event) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement)) return
      if (!target.closest('.movera-st__persistent-search')) return
      setSearchDraft(target.value)
    }

    document.addEventListener('input', syncPopupDraft, true)
    return () => document.removeEventListener('input', syncPopupDraft, true)
  }, [])

  const openSearchPopup = (event) => {
    const trigger = event.currentTarget
    if (!trigger || trigger.dataset.searchDispatching === 'true') return

    const homeProxy = document.createElement('span')
    homeProxy.hidden = true
    homeProxy.setAttribute('aria-hidden', 'true')
    homeProxy.setAttribute('data-testid', 'page-home')
    homeProxy.setAttribute('data-map-search-proxy', 'true')
    document.body.appendChild(homeProxy)

    trigger.dataset.searchDispatching = 'true'
    try {
      trigger.click()
    } finally {
      delete trigger.dataset.searchDispatching
      homeProxy.remove()
    }
  }

  const revealFilters = () => {
    const rail = filterRailRef.current
    if (!rail) return
    rail.scrollTo?.({ left: 0, behavior: 'auto' })
    rail.querySelector('button[data-filter-id]')?.focus?.({ preventScroll: true })
  }

  const handleFilterControl = () => {
    if (activeFilterCount > 0) {
      onResetFilters?.()
      return
    }
    revealFilters()
  }

  const displayedPrimaryLabel = searchDraft !== undefined
    ? searchDraft
    : `Logements à ${cityLabel}`

  return (
    <div
      className="map-search-filter-stack"
      data-testid="map-search-filter-stack"
      data-compact={compact ? 'true' : 'false'}
      data-active-filter-count={activeFilterCount}
    >
      <div
        className="map-search-filter-stack__toolbar-clip"
        aria-hidden={compact ? 'true' : undefined}
        inert={compact ? true : undefined}
      >
        <div className="map-search-filter-stack__toolbar">
          <button
            type="button"
            className="map-search-filter-stack__side-button map-search-filter-stack__back"
            onClick={onHome}
            aria-label="Retour à l’accueil"
          >
            <ArrowLeftIcon />
          </button>

          <button
            type="button"
            className="map-search-filter-stack__search-pill b225-search"
            onClick={openSearchPopup}
            aria-label="Modifier la recherche"
          >
            <span className="map-search-filter-stack__search-copy">
              <strong>{displayedPrimaryLabel}</strong>
              {dateLabel ? <small>{dateLabel}</small> : null}
            </span>
          </button>

          <button
            type="button"
            className="map-search-filter-stack__side-button map-search-filter-stack__filter-button"
            data-testid="map-filter-control"
            onClick={handleFilterControl}
            aria-controls="map-amenity-filter-rail"
            aria-label={activeFilterCount ? 'Réinitialiser les filtres' : 'Filtres'}
          >
            <SlidersHorizontalIcon />
            {activeFilterCount ? <span className="map-search-filter-stack__filter-count">{activeFilterCount}</span> : null}
          </button>
        </div>
      </div>

      <div
        className="map-offer-sheet__property-dock"
        data-testid="map-amenity-filters"
        aria-label="Équipements"
      >
        <div
          ref={filterRailRef}
          id="map-amenity-filter-rail"
          className="map-offer-sheet__property-rail"
        >
          <button
            type="button"
            className="map-offer-sheet__property-chip map-offer-sheet__property-chip--discount"
            data-filter-id="discount"
            data-active={discountOnly ? 'true' : 'false'}
            aria-pressed={discountOnly}
            onClick={onDiscountToggle}
          >
            <span>Promo</span>
          </button>

          {MAP_AMENITY_FILTERS.map((filter) => {
            const active = amenityFilters.has(filter.id)
            return (
              <button
                key={filter.id}
                type="button"
                className="map-offer-sheet__property-chip"
                data-filter-id={filter.id}
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() => onAmenityFilterToggle(filter.id)}
              >
                <span>{filter.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
