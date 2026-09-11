import {
  COMMON_HOST_AMENITIES,
  COMMON_HOST_AMENITY_GROUPS,
  COMMON_HOST_HIGHLIGHTS,
  HOST_GUEST_ACCESS,
  HOST_ONBOARDING_SCREENS,
} from '../../hostOnboardingModel.js'

/* The generic wording, used when a flow says nothing more specific.

   Every string here names the property, and French makes that a per-category
   decision rather than a substitution: a villa is "spéciale", an hôtel is
   "spécial". So each flow writes its own sentences instead of interpolating a
   noun into a template — the grammar stays correct and stays readable. */
const DEFAULT_COPY = Object.freeze({
  presentationTitle: 'Mettez votre logement en valeur',
  presentationText: 'Choisissez les équipements, préparez les photos et rédigez une présentation claire de votre logement.',
  amenitiesTitle: 'Choisissez les équipements qui font la différence',
  amenitiesText: 'Sélectionnez uniquement ce qui est réellement disponible.',
  photosTitle: 'Ajoutez quelques photos de votre logement',
  titleTitle: 'Donnez un titre mémorable à votre logement',
  descriptionTitle: 'Présentez ce qui rend votre logement spécial',
  highlightsTitle: 'Décrivez votre logement',
  highlightsText: 'Choisissez jusqu’à 2 points forts pour commencer.',
  highlightsSummaryTitle: 'Affichage sur votre offre',
  highlightsSummaryText: 'Les points forts sélectionnés seront affichés sur votre offre.',
})

const DEFAULT_PRESENTATION = Object.freeze({
  variant: 'default',
  propertyIcon: 'house',
  amenitySymbols: Object.freeze({}),
  HighlightIcon: null,
})

function freezeRoomAccessPresentation(value) {
  if (!value) return null
  return Object.freeze({
    ...value,
    options: Object.freeze((value.options || []).map((option) => Object.freeze({ ...option }))),
  })
}

export function createCommonOfferFlow({
  id,
  propertyType,
  guestAccess = HOST_GUEST_ACCESS,
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
  roomAccessPresentation = null,
}) {
  return Object.freeze({
    id,
    propertyType,
    screens: HOST_ONBOARDING_SCREENS,
    guestAccess: Object.freeze([...guestAccess]),
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
    roomAccessPresentation: freezeRoomAccessPresentation(roomAccessPresentation),
  })
}
