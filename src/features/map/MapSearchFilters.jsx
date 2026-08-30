import {
  ArrowLeftIcon,
  SlidersHorizontalIcon,
} from '../../shared/icons/AppIcons.jsx'
import { MAP_AMENITY_FILTERS } from './mapListingFilters.js'
import './map-search-filters.css'

const MAP_PROPERTY_FILTERS = Object.freeze([
  { id: 'all', label: 'Tout' },
  { id: 'apartment', label: 'Appartement' },
  { id: 'house', label: 'Maison' },
  { id: 'villa', label: 'Villa' },
  { id: 'guesthouse', label: "Maison d’hôte" },
  { id: 'beach', label: 'Plage' },
])

export function MapSearchFilters({
  amenityFilters,
  propertyFilter = 'all',
  compact = false,
  onHome,
  onPropertyFilterChange,
  onAmenityFilterToggle,
  onResetFilters,
}) {
  const activeFilterCount = amenityFilters.size

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
        <div className="map-search-filter-stack__toolbar map-search-filter-stack__toolbar--categories">
          <button
            type="button"
            className="map-search-filter-stack__side-button map-search-filter-stack__back"
            onClick={onHome}
            aria-label="Retour à l’accueil"
          >
            <ArrowLeftIcon />
          </button>

          <div className="map-property-rail" data-testid="map-property-filters" aria-label="Type de logement">
            {MAP_PROPERTY_FILTERS.map((filter) => {
              const active = propertyFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  className="map-property-chip"
                  data-property-filter={filter.id}
                  data-active={active ? 'true' : 'false'}
                  aria-pressed={active}
                  onClick={() => onPropertyFilterChange?.(filter.id)}
                >
                  <span>{filter.label}</span>
                </button>
              )
            })}
          </div>

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
