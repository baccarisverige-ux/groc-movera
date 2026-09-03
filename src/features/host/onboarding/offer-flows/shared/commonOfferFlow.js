import {
  COMMON_HOST_AMENITIES,
  COMMON_HOST_AMENITY_GROUPS,
  COMMON_HOST_HIGHLIGHTS,
  HOST_GUEST_ACCESS,
  HOST_ONBOARDING_SCREENS,
} from '../../hostOnboardingModel.js'

const DEFAULT_COPY = Object.freeze({
  amenitiesTitle: 'Choisissez les équipements qui font la différence',
  amenitiesText: 'Sélectionnez uniquement ce qui est réellement disponible.',
  highlightsTitle: 'Décrivez votre logement',
  highlightsText: 'Choisissez jusqu’à 2 points forts pour commencer.',
  highlightsSummaryTitle: 'Affichage sur votre offre',
  highlightsSummaryText: 'Les points forts sélectionnés seront affichés sur votre offre.',
})

const DEFAULT_PRESENTATION = Object.freeze({
  variant: 'default',
  amenitySymbols: Object.freeze({}),
  HighlightIcon: null,
})

export function createCommonOfferFlow({
  id,
  propertyType,
  supportsRoomInventory = false,
  photoPolicy = { min: 5, max: 20, scope: 'listing' },
  amenityGroups = COMMON_HOST_AMENITY_GROUPS,
  amenities = COMMON_HOST_AMENITIES,
  highlightGroups = [],
  highlights = COMMON_HOST_HIGHLIGHTS,
  minHighlights = 1,
  maxHighlights = 2,
  copy = {},
  presentation = {},
}) {
  return Object.freeze({
    id,
    propertyType,
    screens: HOST_ONBOARDING_SCREENS,
    guestAccess: HOST_GUEST_ACCESS,
    supportsRoomInventory,
    photoPolicy: Object.freeze({ ...photoPolicy }),
    amenityGroups: Object.freeze([...amenityGroups]),
    amenities: Object.freeze([...amenities]),
    highlightGroups: Object.freeze([...highlightGroups]),
    highlights: Object.freeze([...highlights]),
    minHighlights,
    maxHighlights,
    copy: Object.freeze({ ...DEFAULT_COPY, ...copy }),
    presentation: Object.freeze({
      ...DEFAULT_PRESENTATION,
      ...presentation,
      amenitySymbols: Object.freeze({ ...(presentation.amenitySymbols || {}) }),
    }),
  })
}
