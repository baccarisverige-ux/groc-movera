import { supportsPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import { readAuthSession } from '../../auth/authSession.js'
import { HOST_ROOM_SETUP_MODES, readHostOnboardingDraft, readHostRoomConfigurationDraft } from './hostOfferDraftStore.js'
import './host-room-allocation-polish.css'

const PAGE_SELECTOR = '.host-onboarding[data-screen="basics"]'
const SETUP_SELECTOR = '.host-room-setup'
const SUMMARY_CLASS = 'host-room-allocation-overview'
const HELPER_CLASS = 'host-room-allocation-helper'
const OBSERVER_OPTIONS = { childList: true, subtree: true, attributes: true, attributeFilter: ['data-screen'] }

function currentContext() {
  const session = readAuthSession()
  if (!session?.userId) return null
  const draft = readHostOnboardingDraft(session.userId)
  if (!supportsPooledRoomInventory(draft.propertyType)) return null
  const fallback = {
    guests: draft.guests,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    basePrice: draft.basePrice,
  }
  return {
    configuration: readHostRoomConfigurationDraft(session.userId, fallback),
  }
}

function metric(label, value, tone = '') {
  const item = document.createElement('span')
  item.className = 'host-room-allocation-overview__metric'
  if (tone) item.dataset.tone = tone
  const strong = document.createElement('strong')
  strong.textContent = String(value)
  const small = document.createElement('small')
  small.textContent = label
  item.append(strong, small)
  return item
}

function renderOverview(setup, configuration) {
  const existing = setup.querySelector(`.${SUMMARY_CLASS}`)
  if (configuration.mode !== HOST_ROOM_SETUP_MODES.CATEGORIES) {
    existing?.remove()
    return
  }

  const rooms = Array.isArray(configuration.roomTypes) ? configuration.roomTypes : []
  const total = Math.max(1, Number(configuration.totalRooms) || 1)
  const assigned = rooms.reduce((sum, room) => sum + Math.max(1, Number(room.totalUnits) || 1), 0)
  const remaining = total - assigned
  const progress = Math.max(0, Math.min(100, (assigned / total) * 100))

  const overview = existing || document.createElement('section')
  overview.className = SUMMARY_CLASS
  overview.setAttribute('aria-label', 'Répartition des chambres entre les catégories')
  overview.replaceChildren()

  const head = document.createElement('div')
  head.className = 'host-room-allocation-overview__head'
  const copy = document.createElement('span')
  const eyebrow = document.createElement('small')
  eyebrow.textContent = 'Répartition de l’inventaire'
  const title = document.createElement('strong')
  title.textContent = 'Chaque chambre reste comptée une seule fois'
  copy.append(eyebrow, title)
  const badge = document.createElement('b')
  badge.textContent = remaining === 0 ? 'Répartition complète' : remaining > 0 ? `${remaining} à répartir` : `${Math.abs(remaining)} en trop`
  badge.dataset.valid = remaining === 0 ? 'true' : 'false'
  head.append(copy, badge)

  const metrics = document.createElement('div')
  metrics.className = 'host-room-allocation-overview__metrics'
  metrics.append(
    metric('Total établissement', total),
    metric('Attribuées', assigned),
    metric(remaining >= 0 ? 'Restantes' : 'En trop', Math.abs(remaining), remaining === 0 ? 'ok' : 'attention'),
  )

  const track = document.createElement('div')
  track.className = 'host-room-allocation-overview__track'
  const fill = document.createElement('i')
  fill.style.width = `${progress}%`
  fill.dataset.valid = remaining === 0 ? 'true' : 'false'
  track.append(fill)

  const note = document.createElement('p')
  note.textContent = 'Aucune limite fixe à 2 chambres par catégorie. Le plafond dépend uniquement du nombre total déclaré et du fait que chaque autre catégorie doit garder au moins 1 chambre.'

  overview.append(head, metrics, track, note)

  if (!existing) {
    const list = setup.querySelector('.host-onboarding-room-types__list')
    if (list) list.insertAdjacentElement('beforebegin', overview)
    else setup.append(overview)
  }
}

function renderCategoryHelpers(setup, configuration) {
  if (configuration.mode !== HOST_ROOM_SETUP_MODES.CATEGORIES) {
    setup.querySelectorAll(`.${HELPER_CLASS}`).forEach((node) => node.remove())
    return
  }

  const rooms = Array.isArray(configuration.roomTypes) ? configuration.roomTypes : []
  const total = Math.max(1, Number(configuration.totalRooms) || 1)
  const categoryCount = rooms.length
  const absoluteMaxPerCategory = Math.max(1, total - Math.max(0, categoryCount - 1))

  setup.querySelectorAll('.host-onboarding-room-types__card').forEach((card) => {
    const roomId = card.dataset.roomCategoryId
    const room = rooms.find((item) => item.id === roomId)
    if (!room) return

    const quantity = card.querySelector('.host-room-setup__lot-quantity')
    if (!quantity) return
    quantity.dataset.inventoryQuantity = 'true'

    let helper = card.querySelector(`.${HELPER_CLASS}`)
    if (!helper) {
      helper = document.createElement('div')
      helper.className = HELPER_CLASS
      quantity.insertAdjacentElement('afterend', helper)
    }
    helper.replaceChildren()

    const current = Math.max(1, Number(room.totalUnits) || 1)
    const left = document.createElement('span')
    const leftStrong = document.createElement('strong')
    leftStrong.textContent = String(current)
    const leftSmall = document.createElement('small')
    leftSmall.textContent = `chambre${current > 1 ? 's' : ''} dans cette catégorie`
    left.append(leftStrong, leftSmall)

    const right = document.createElement('span')
    const rightStrong = document.createElement('strong')
    rightStrong.textContent = String(absoluteMaxPerCategory)
    const rightSmall = document.createElement('small')
    rightSmall.textContent = 'maximum possible ici'
    right.append(rightStrong, rightSmall)
    helper.append(left, right)

    const plusButton = quantity.querySelector('button:last-child')
    if (plusButton) {
      plusButton.title = current >= absoluteMaxPerCategory
        ? `Maximum actuel : ${absoluteMaxPerCategory}. Les ${categoryCount - 1} autre${categoryCount - 1 > 1 ? 's' : ''} catégorie${categoryCount - 1 > 1 ? 's' : ''} gardent au moins 1 chambre.`
        : `Vous pouvez attribuer jusqu’à ${absoluteMaxPerCategory} chambres à cette catégorie.`
    }
  })
}

let observer = null

function observe() {
  if (!observer) return
  observer.observe(document.documentElement, OBSERVER_OPTIONS)
}

function polishRoomAllocation() {
  const page = document.querySelector(PAGE_SELECTOR)
  const setup = page?.querySelector(SETUP_SELECTOR)
  if (!setup) return

  const context = currentContext()
  if (!context) return

  observer?.disconnect()
  try {
    setup.dataset.polished = 'true'
    renderOverview(setup, context.configuration)
    renderCategoryHelpers(setup, context.configuration)
  } finally {
    observe()
  }
}

let frame = 0
function schedulePolish() {
  window.cancelAnimationFrame(frame)
  frame = window.requestAnimationFrame(polishRoomAllocation)
}

observer = new MutationObserver(schedulePolish)
observe()
window.addEventListener('storage', schedulePolish)

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedulePolish, { once: true })
else schedulePolish()
