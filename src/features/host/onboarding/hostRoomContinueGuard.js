import { usesPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import {
  HOST_ROOM_SETUP_MODES,
  readHostRoomConfigurationDraft,
  roomConfigurationIsValid,
  writeHostRoomConfigurationDraft,
} from '../../../entities/host/hostRoomTypeDraftStore.js'
import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'

const PAGE_SELECTOR = '.host-onboarding[data-screen="basics"]'
const ADD_CATEGORY_SELECTOR = `${PAGE_SELECTOR} .host-onboarding-room-types__add`
const MAX_CATEGORIES = 12

function baseBasicsValid(draft) {
  return Number(draft?.guests) >= 1
    && Number(draft?.bedrooms) >= 0
    && Number(draft?.beds) >= 1
    && Number(draft?.bathrooms) >= 0
}

function roomFallback(draft) {
  return {
    guests: draft.guests,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    basePrice: draft.basePrice,
  }
}

function createCategory(index, draft) {
  return {
    id: `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Catégorie ${index + 1}`,
    view: '',
    description: '',
    surface: 0,
    guests: Math.max(1, Number(draft?.guests) || 2),
    beds: Math.max(1, Number(draft?.beds) || 1),
    bedType: '',
    bathrooms: Math.max(0, Number(draft?.bathrooms) || 1),
    bathroomType: 'private',
    basePrice: Math.max(1, Number(draft?.basePrice) || 180),
    totalUnits: 1,
    features: [],
    photos: [],
  }
}

function readCurrentRoomSetup() {
  const session = readAuthSession()
  if (!session?.userId) return null
  const draft = readHostOnboardingDraft(session.userId)
  if (!usesPooledRoomInventory(draft.propertyType, draft.guestAccess)) return null
  const fallback = roomFallback(draft)
  const configuration = readHostRoomConfigurationDraft(session.userId, fallback)
  return { session, draft, fallback, configuration }
}

function canAddCategory(configuration) {
  if (configuration?.mode !== HOST_ROOM_SETUP_MODES.CATEGORIES) return false
  const rooms = Array.isArray(configuration.roomTypes) ? configuration.roomTypes : []
  if (rooms.length >= Math.min(MAX_CATEGORIES, Number(configuration.totalRooms) || 1)) return false
  const assigned = rooms.reduce((sum, room) => sum + Math.max(1, Number(room?.totalUnits) || 1), 0)
  const hasUnassignedRoom = assigned < Number(configuration.totalRooms)
  const hasSplittableCategory = rooms.some((room) => Number(room?.totalUnits) > 1)
  return hasUnassignedRoom || hasSplittableCategory
}

function syncAddCategoryButton() {
  const button = document.querySelector(ADD_CATEGORY_SELECTOR)
  if (!button) return
  const current = readCurrentRoomSetup()
  button.disabled = !current || !canAddCategory(current.configuration)
}

function syncContinueButton() {
  const page = document.querySelector(PAGE_SELECTOR)
  const button = page?.querySelector('.host-onboarding__primary')
  if (!page || !button) {
    syncAddCategoryButton()
    return
  }

  const session = readAuthSession()
  if (!session?.userId) return
  const draft = readHostOnboardingDraft(session.userId)
  if (!usesPooledRoomInventory(draft.propertyType, draft.guestAccess)) {
    delete button.dataset.roomSetupValid
    button.disabled = !baseBasicsValid(draft)
    syncAddCategoryButton()
    return
  }

  const configuration = readHostRoomConfigurationDraft(session.userId, roomFallback(draft))
  const roomValid = roomConfigurationIsValid(configuration)
  const valid = baseBasicsValid(draft) && roomValid

  button.dataset.roomSetupValid = roomValid ? 'true' : 'false'
  button.disabled = !valid
  syncAddCategoryButton()
}

function addCategorySafely(event) {
  const button = event.target.closest?.(ADD_CATEGORY_SELECTOR)
  if (!button) return false

  const current = readCurrentRoomSetup()
  if (!current || !canAddCategory(current.configuration)) return true

  const { session, draft, fallback, configuration } = current
  const rooms = Array.isArray(configuration.roomTypes) ? configuration.roomTypes.map((room) => ({ ...room })) : []
  const assigned = rooms.reduce((sum, room) => sum + Math.max(1, Number(room?.totalUnits) || 1), 0)

  if (assigned >= Number(configuration.totalRooms)) {
    const donor = [...rooms]
      .sort((a, b) => Number(b.totalUnits) - Number(a.totalUnits))
      .find((room) => Number(room.totalUnits) > 1)
    if (!donor) return true
    donor.totalUnits = Number(donor.totalUnits) - 1
  }

  rooms.push(createCategory(rooms.length, draft))
  writeHostRoomConfigurationDraft(session.userId, {
    ...configuration,
    mode: HOST_ROOM_SETUP_MODES.CATEGORIES,
    roomTypes: rooms,
  }, fallback)

  event.preventDefault()
  event.stopImmediatePropagation()

  // Force the canonical room enhancer to redraw from the freshly persisted draft.
  document.querySelector(`${PAGE_SELECTOR} .host-room-setup`)?.remove()
  scheduleSync()
  return true
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

document.addEventListener('click', (event) => {
  if (addCategorySafely(event)) return
  scheduleSync()
}, true)
document.addEventListener('input', scheduleSync, true)
document.addEventListener('change', scheduleSync, true)
window.addEventListener('storage', scheduleSync)

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleSync, { once: true })
else scheduleSync()
