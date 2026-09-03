import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'
import './host-hotel-amenities.css'

const STEP_SELECTOR = '.host-onboarding[data-screen="amenities"] .host-onboarding__step'
const HOTEL_GROUP_SELECTOR = '.host-onboarding__amenity-section[data-group^="hotel-"]'

const GROUP_SYMBOLS = Object.freeze({
  'hotel-room': '◇',
  'hotel-bath': '◡',
  'hotel-reception': '✦',
  'hotel-housekeeping': '✧',
  'hotel-food': '○',
  'hotel-wellness': '≈',
  'hotel-business': '□',
  'hotel-family': '◎',
  'hotel-transport': '→',
  'hotel-accessibility': '＋',
  'hotel-security': '◆',
  'hotel-hostel': '▤',
  'hotel-outdoor': '☼',
  'hotel-sustainability': '⌁',
})

function hotelContext() {
  const session = readAuthSession()
  if (!session?.userId) return null
  const draft = readHostOnboardingDraft(session.userId)
  return { session, draft, isHotel: draft.propertyType === 'Hôtel' }
}

function decorateHotelSections(step) {
  step.querySelectorAll(HOTEL_GROUP_SELECTOR).forEach((section) => {
    const heading = section.querySelector('h2')
    if (heading) heading.dataset.hotelSymbol = GROUP_SYMBOLS[section.dataset.group] || '◇'
  })
}

function syncHotelAmenities() {
  const step = document.querySelector(STEP_SELECTOR)
  if (!step) return

  const current = hotelContext()
  const isHotel = Boolean(current?.isHotel)
  step.dataset.hotelAmenities = isHotel ? 'true' : 'false'

  const heading = step.querySelector(':scope > h1')
  const intro = heading?.nextElementSibling
  const oldNote = step.querySelector('.host-hotel-amenities__intro')

  if (!isHotel) {
    oldNote?.remove()
    return
  }

  if (heading) heading.textContent = 'Quels équipements et services propose votre établissement ?'
  if (intro?.tagName === 'P') {
    intro.textContent = 'Sélectionnez tout ce qui est réellement disponible dans votre hôtel, auberge ou hostel.'
  }

  if (!oldNote) {
    const note = document.createElement('div')
    note.className = 'host-hotel-amenities__intro'
    const mark = document.createElement('i')
    mark.textContent = 'H'
    const copy = document.createElement('div')
    const strong = document.createElement('strong')
    strong.textContent = 'Catalogue Hôtel & Hostel'
    const span = document.createElement('span')
    span.textContent = 'Chambre, accueil, restauration, ménage, spa, business, transport, accessibilité, sécurité et espaces partagés : sélectionnez uniquement les services réellement proposés.'
    copy.append(strong, span)
    note.append(mark, copy)
    const groups = step.querySelector('.host-onboarding__amenity-groups')
    groups?.insertAdjacentElement('beforebegin', note)
  }

  decorateHotelSections(step)
}

const observer = new MutationObserver(syncHotelAmenities)
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-screen'],
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncHotelAmenities, { once: true })
} else {
  syncHotelAmenities()
}

requestAnimationFrame(syncHotelAmenities)
