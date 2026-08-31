import { supportsPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import { readHostRoomConfigurationDraft, roomConfigurationIsValid } from '../../../entities/host/hostRoomTypeDraftStore.js'
import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'

const PAGE_SELECTOR = '.host-onboarding[data-screen="basics"]'

function baseBasicsValid(draft) {
  return Number(draft?.guests) >= 1
    && Number(draft?.bedrooms) >= 0
    && Number(draft?.beds) >= 1
    && Number(draft?.bathrooms) >= 0
}

function syncContinueButton() {
  const page = document.querySelector(PAGE_SELECTOR)
  const button = page?.querySelector('.host-onboarding__primary')
  if (!page || !button) return

  const session = readAuthSession()
  if (!session?.userId) return
  const draft = readHostOnboardingDraft(session.userId)
  if (!supportsPooledRoomInventory(draft.propertyType)) return

  const configuration = readHostRoomConfigurationDraft(session.userId, {
    guests: draft.guests,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    basePrice: draft.basePrice,
  })
  const roomValid = roomConfigurationIsValid(configuration)
  const valid = baseBasicsValid(draft) && roomValid

  button.dataset.roomSetupValid = roomValid ? 'true' : 'false'
  button.disabled = !valid
}

let frame = 0
function scheduleSync() {
  window.cancelAnimationFrame(frame)
  frame = window.requestAnimationFrame(syncContinueButton)
}

const observer = new MutationObserver(scheduleSync)
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-screen'],
})

document.addEventListener('click', scheduleSync, true)
document.addEventListener('input', scheduleSync, true)
document.addEventListener('change', scheduleSync, true)
window.addEventListener('storage', scheduleSync)

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleSync, { once: true })
else scheduleSync()
