import {
  ArrowLeftIcon,
  SlidersHorizontalIcon,
} from '../../shared/icons/AppIcons.jsx'
import { MAP_AMENITY_FILTERS } from './mapListingFilters.js'
import './map-search-filters.css'

export function MapSearchFilters({
  cityLabel,
  amenityFilters,
  compact = false,
  onHome,
  onAmenityFilterToggle,
  onResetFilters,
}) {
  const activeFilterCount = amenityFilters.size

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

  return (
    <div
      className="map-search-filter-stack"
      data-testid="map-search-filter-stack"
      data-compact={compact ? 'true' : 'false'}
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
            <strong>Logements à {cityLabel}</strong>
          </button>

          <button
            type="button"
            className="map-search-filter-stack__side-button map-search-filter-stack__filter-button"
            onClick={activeFilterCount ? onResetFilters : undefined}
            aria-label={activeFilterCount ? 'Réinitialiser les filtres' : 'Filtres'}
          >
            <SlidersHorizontalIcon />
            {activeFilterCount ? <span className="map-search-filter-stack__filter-count">{activeFilterCount}</span> : null}
          </button>
        </div>
      </div>

      <div className="map-filter-rail map-filter-rail--amenities" data-testid="map-amenity-filters" aria-label="Équipements">
        {MAP_AMENITY_FILTERS.map((filter) => {
          const active = amenityFilters.has(filter.id)
          return (
            <button
              key={filter.id}
              type="button"
              className="map-filter-chip map-filter-chip--amenity"
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
  )
}
