import { getOfferFlow } from './offer-flows/offerFlowRegistry.js'
import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'
import './hostHospitalityGuestAccessEnhancer.css'

const PROPERTY_SCREEN = '.host-onboarding[data-screen="property-type"]'
const ACCESS_SCREEN = '.host-onboarding[data-screen="guest-access"]'
const ORIGINAL_OPTIONS = '.host-onboarding__stacked-options'

let currentPage = null
let cleanupCurrent = () => {}
let frame = 0
let hospitalityDefaultPending = false
let pendingPropertyType = ''

function iconSvg(kind) {
  if (kind === 'door') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v18H7zM10 6h7v15M14 12h.01"/></svg>'
  }
  if (kind === 'bunk') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v16M19 5v16M5 9h14M5 17h14M7 6h5a2 2 0 0 1 2 2v1M7 14h5a2 2 0 0 1 2 2v1"/></svg>'
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V5h9v16M15 10h4v11M9 8h3M9 12h3M9 16h3M17 13h2M17 17h2M4 21h17"/></svg>'
}

function checkSvg() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4L18 8"/></svg>'
}

function currentContext() {
  const session = readAuthSession()
  if (!session?.userId) return null
  const draft = readHostOnboardingDraft(session.userId)
  const propertyType = pendingPropertyType || draft.propertyType
  const offerFlow = getOfferFlow(propertyType)
  if (!offerFlow.supportsRoomInventory || !offerFlow.roomAccessPresentation) return null
  return { propertyType, guestAccess: draft.guestAccess, access: offerFlow.roomAccessPresentation }
}

function originalButtonFor(list, accessId) {
  return Array.from(list.querySelectorAll('button[role="radio"]'))
    .find((button) => button.dataset.guestAccessId === accessId) || null
}

function selectedSourceId(original) {
  const selected = Array.from(original.querySelectorAll('button[role="radio"]'))
    .find((button) => button.getAttribute('aria-checked') === 'true')
  return selected?.dataset.guestAccessId || ''
}

function attachPropertyTypeDefaults() {
  const page = document.querySelector(PROPERTY_SCREEN)
  if (!page) return
  page.querySelectorAll('button[role="radio"]').forEach((button) => {
    if (button.dataset.hospitalityDefaultListener === 'true') return
    button.dataset.hospitalityDefaultListener = 'true'
    button.addEventListener('click', () => {
      const type = button.dataset.propertyType || button.textContent.trim()
      pendingPropertyType = type
      hospitalityDefaultPending = Boolean(getOfferFlow(type).roomAccessPresentation)
    })
  })
}

function mountHospitalityAccess(page) {
  const context = currentContext()
  const step = page.querySelector('.host-onboarding__step')
  const original = step?.querySelector(ORIGINAL_OPTIONS)
  const title = step?.querySelector('h1')
  const intro = title?.nextElementSibling
  if (!context || !step || !original || !title) return () => {}

  const visibleOptions = context.access.options
  const allowedIds = new Set(visibleOptions.map((option) => option.id))
  const originalTitle = title.textContent
  const originalIntro = intro?.textContent || ''

  step.dataset.hospitalityAccess = 'true'
  original.dataset.hospitalitySource = 'true'
  title.textContent = context.access.title

  if (intro) intro.textContent = context.access.intro

  const currentSelection = selectedSourceId(original)
  if (hospitalityDefaultPending || !allowedIds.has(currentSelection)) {
    const defaultButton = originalButtonFor(original, context.access.defaultId || visibleOptions[0]?.id)
    if (defaultButton && defaultButton.getAttribute('aria-checked') !== 'true') defaultButton.click()
  }
  hospitalityDefaultPending = false

  const panel = document.createElement('section')
  panel.className = 'host-hospitality-access'
  panel.dataset.testid = 'host-hospitality-access'

  const contextCard = document.createElement('div')
  contextCard.className = 'host-hospitality-access__context'
  contextCard.innerHTML = `
    <span class="host-hospitality-access__property-icon">${iconSvg('building')}</span>
    <span class="host-hospitality-access__property-copy">
      <small>${context.access.contextLabel}</small>
      <strong>${context.propertyType}</strong>
    </span>
    <span class="host-hospitality-access__property-status">${context.access.statusLabel}</span>
  `

  const list = document.createElement('div')
  list.className = 'host-hospitality-access__options'
  list.setAttribute('role', 'radiogroup')
  list.setAttribute('aria-label', 'Ce que le voyageur réserve')

  const customButtons = new Map()

  const syncSelection = () => {
    visibleOptions.forEach((option) => {
      const source = originalButtonFor(original, option.id)
      const custom = customButtons.get(option.id)
      if (!source || !custom) return
      const active = source.getAttribute('aria-checked') === 'true'
      custom.dataset.active = active ? 'true' : 'false'
      custom.setAttribute('aria-checked', active ? 'true' : 'false')
      const indicator = custom.querySelector('.host-hospitality-access__check')
      if (indicator) indicator.innerHTML = active ? checkSvg() : ''
    })
  }

  visibleOptions.forEach((option) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'host-hospitality-access__option'
    button.setAttribute('role', 'radio')
    button.setAttribute('aria-checked', 'false')
    button.dataset.accessId = option.id
    button.innerHTML = `
      <span class="host-hospitality-access__icon">${iconSvg(option.icon)}</span>
      <span class="host-hospitality-access__copy">
        <span class="host-hospitality-access__title-row">
          <strong>${option.label}</strong>
          ${option.badge ? `<em>${option.badge}</em>` : ''}
        </span>
        <small>${option.description}</small>
      </span>
      <span class="host-hospitality-access__check" aria-hidden="true"></span>
    `
    button.addEventListener('click', () => {
      const source = originalButtonFor(original, option.id)
      if (!source) return
      source.click()
      requestAnimationFrame(syncSelection)
    })
    customButtons.set(option.id, button)
    list.append(button)
  })

  const note = document.createElement('div')
  note.className = 'host-hospitality-access__note'
  note.innerHTML = `<span>i</span><p><strong>${context.access.noteTitle}</strong><small>${context.access.noteText}</small></p>`

  panel.append(contextCard, list, note)
  original.insertAdjacentElement('afterend', panel)
  syncSelection()

  const selectionObserver = new MutationObserver(syncSelection)
  selectionObserver.observe(original, { attributes: true, subtree: true, attributeFilter: ['aria-checked'] })

  return () => {
    selectionObserver.disconnect()
    panel.remove()
    delete step.dataset.hospitalityAccess
    delete original.dataset.hospitalitySource
    title.textContent = originalTitle
    if (intro) intro.textContent = originalIntro
  }
}

function sync() {
  attachPropertyTypeDefaults()
  const page = document.querySelector(ACCESS_SCREEN)
  if (page === currentPage) return
  cleanupCurrent()
  cleanupCurrent = () => {}
  currentPage = page
  if (page) cleanupCurrent = mountHospitalityAccess(page)
}

function schedule() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(sync)
}

const observer = new MutationObserver(schedule)
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-screen'],
})

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
else schedule()
