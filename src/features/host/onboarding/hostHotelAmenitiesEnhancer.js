import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'
import './host-hotel-amenities.css'

const STEP_SELECTOR = '.host-onboarding[data-screen="amenities"] .host-onboarding__step'
const HOTEL_GROUP_SELECTOR = '.host-onboarding__amenity-section[data-group^="hotel-"]'
const OBSERVER_OPTIONS = Object.freeze({
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-screen'],
})

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

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value
}

function decorateHotelSections(step) {
  step.querySelectorAll(HOTEL_GROUP_SELECTOR).forEach((section) => {
    const symbol = GROUP_SYMBOLS[section.dataset.group] || '◇'
    const heading = section.querySelector('h2')
    if (heading?.dataset.hotelSymbol !== symbol) heading.dataset.hotelSymbol = symbol
    section.querySelectorAll('.host-onboarding__amenity-grid > button').forEach((button) => {
      if (button.dataset.hotelSymbol !== symbol) button.dataset.hotelSymbol = symbol
    })
  })
}

let observer = null
let frame = 0

function observe() {
  observer?.observe(document.documentElement, OBSERVER_OPTIONS)
}

function syncHotelAmenities() {
  observer?.disconnect()
  try {
    const step = document.querySelector(STEP_SELECTOR)
    if (!step) return

    const current = hotelContext()
    const isHotel = Boolean(current?.isHotel)
    const hotelState = isHotel ? 'true' : 'false'
    if (step.dataset.hotelAmenities !== hotelState) step.dataset.hotelAmenities = hotelState

    const heading = step.querySelector(':scope > h1')
    const intro = heading?.nextElementSibling
    const oldNote = step.querySelector('.host-hotel-amenities__intro')

    if (!isHotel) {
      oldNote?.remove()
      return
    }

    setText(heading, 'Quels équipements et services propose votre établissement ?')
    if (intro?.tagName === 'P') {
      setText(intro, 'Sélectionnez tout ce qui est réellement disponible dans votre hôtel, auberge ou hostel.')
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
  } finally {
    observe()
  }
}

function scheduleSync() {
  window.cancelAnimationFrame(frame)
  frame = window.requestAnimationFrame(syncHotelAmenities)
}

observer = new MutationObserver(scheduleSync)
observe()

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleSync, { once: true })
} else {
  scheduleSync()
}
