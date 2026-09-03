import {
  clearHostRoomTypeDraft,
  HOST_ROOM_SETUP_MODES,
  readHostRoomConfigurationDraft,
  roomConfigurationIsValid,
  writeHostRoomConfigurationDraft,
} from '../../../entities/host/hostRoomTypeDraftStore.js'
import {
  clearHostOnboardingDraft,
  readHostOnboardingDraft,
  writeHostOnboardingDraft,
} from './hostOnboardingDraftStore.js'

export { HOST_ROOM_SETUP_MODES, roomConfigurationIsValid }

export function roomFallbackFromDraft(draft = {}) {
  return {
    guests: draft.guests,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    basePrice: Number(draft.basePrice),
    amenities: draft.amenities,
    highlights: draft.highlights,
    promotions: draft.promotions,
    bookingMode: draft.bookingMode,
    safety: draft.safety,
  }
}

export function readHostOfferDraft(userId) {
  const draft = readHostOnboardingDraft(userId)
  return {
    draft,
    roomConfiguration: readHostRoomConfigurationDraft(userId, roomFallbackFromDraft(draft)),
  }
}

export function clearHostOfferDraft(userId) {
  clearHostOnboardingDraft(userId)
  clearHostRoomTypeDraft(userId)
}

export {
  readHostOnboardingDraft,
  readHostRoomConfigurationDraft,
  writeHostOnboardingDraft,
  writeHostRoomConfigurationDraft,
}
