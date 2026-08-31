import { supportsPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import { readHostRoomTypeDraft, writeHostRoomTypeDraft } from '../../../entities/host/hostRoomTypeDraftStore.js'
import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'
import './host-room-types-onboarding.css'

const BASICS_SELECTOR = '.host-onboarding[data-screen="basics"] .host-onboarding__step'
const REVIEW_SELECTOR = '.host-onboarding[data-screen="review"] .host-onboarding__step'
const ROOM_EDITOR_CLASS = 'host-onboarding-room-types'
const REVIEW_CLASS = 'host-onboarding-room-types-review'

function roomId() {
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function context() {
  const session = readAuthSession()
  if (!session?.userId) return null
  const draft = readHostOnboardingDraft(session.userId)
  if (!supportsPooledRoomInventory(draft.propertyType)) return null
  return { userId: session.userId, draft }
}

function fallbackFromDraft(draft) {
  return {
    guests: draft.guests,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    basePrice: draft.basePrice,
  }
}

function inputField(label, value, onInput, options = {}) {
  const wrapper = document.createElement('label')
  wrapper.className = options.wide ? 'host-onboarding-room-types__field is-wide' : 'host-onboarding-room-types__field'
  const title = document.createElement('span')
  title.textContent = label
  const input = options.multiline ? document.createElement('textarea') : document.createElement('input')
  if (options.multiline) input.rows = 2
  if (options.type) input.type = options.type
  if (options.inputMode) input.inputMode = options.inputMode
  if (options.placeholder) input.placeholder = options.placeholder
  if (options.min != null) input.min = String(options.min)
  if (options.max != null) input.max = String(options.max)
  input.value = value ?? ''
  input.addEventListener('input', () => onInput(input.value))
  wrapper.append(title, input)
  return wrapper
}

function renderEditor(target, userId, draft) {
  if (!target || target.querySelector(`.${ROOM_EDITOR_CLASS}`)) return

  const fallback = fallbackFromDraft(draft)
  let rooms = readHostRoomTypeDraft(userId, fallback)
  const section = document.createElement('section')
  section.className = ROOM_EDITOR_CLASS
  section.setAttribute('aria-label', 'Types de chambres de cette publication')

  const header = document.createElement('div')
  header.className = 'host-onboarding-room-types__header'
  header.innerHTML = '<span>Hôtel / Maison d’hôte</span><h2>Types de chambres</h2><p>Une seule publication peut contenir plusieurs catégories de chambres. Configurez chaque lot séparément pour que le voyageur comprenne clairement la différence.</p>'

  const privacy = document.createElement('div')
  privacy.className = 'host-onboarding-room-types__privacy'
  privacy.innerHTML = '<strong>Visible au client</strong><span>Nom, vue, détails, capacité et prix.</span><strong>Privé côté hôte</strong><span>Nombre total et stock restant.</span>'

  const list = document.createElement('div')
  list.className = 'host-onboarding-room-types__list'

  const persist = () => {
    rooms = writeHostRoomTypeDraft(userId, rooms, fallback)
  }

  const drawRooms = () => {
    list.replaceChildren()
    rooms.forEach((room, index) => {
      const card = document.createElement('article')
      card.className = 'host-onboarding-room-types__card'

      const cardHead = document.createElement('div')
      cardHead.className = 'host-onboarding-room-types__card-head'
      const heading = document.createElement('div')
      heading.innerHTML = `<small>Lot ${index + 1}</small><strong>${room.name || `Type ${index + 1}`}</strong>`
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.textContent = 'Supprimer'
      remove.disabled = rooms.length <= 1
      remove.addEventListener('click', () => {
        if (rooms.length <= 1) return
        rooms = rooms.filter((item) => item.id !== room.id)
        persist()
        drawRooms()
      })
      cardHead.append(heading, remove)

      const grid = document.createElement('div')
      grid.className = 'host-onboarding-room-types__grid'
      grid.append(
        inputField('Nom visible au client', room.name, (value) => { room.name = value; heading.querySelector('strong').textContent = value || `Type ${index + 1}`; persist() }, { wide: true, placeholder: 'Ex. Deluxe Vue Mer' }),
        inputField('Vue / particularité', room.view, (value) => { room.view = value; persist() }, { wide: true, placeholder: 'Ex. Vue mer panoramique' }),
        inputField('Détails de cette chambre', room.description, (value) => { room.description = value; persist() }, { wide: true, multiline: true, placeholder: 'Ex. 28 m², balcon privé, étage élevé…' }),
        inputField('Voyageurs', room.guests, (value) => { room.guests = Math.max(1, Number(value) || 1); persist() }, { type: 'number', inputMode: 'numeric', min: 1, max: 20 }),
        inputField('Lits', room.beds, (value) => { room.beds = Math.max(1, Number(value) || 1); persist() }, { type: 'number', inputMode: 'numeric', min: 1, max: 20 }),
        inputField('Salles de bain', room.bathrooms, (value) => { room.bathrooms = Math.max(0, Number(value) || 0); persist() }, { type: 'number', inputMode: 'numeric', min: 0, max: 10 }),
        inputField('Prix / nuit (TND)', room.basePrice, (value) => { room.basePrice = Math.max(1, Number(value) || 1); persist() }, { type: 'number', inputMode: 'numeric', min: 1, max: 99999 }),
        inputField('Chambres identiques dans ce lot', room.totalUnits, (value) => { room.totalUnits = Math.max(1, Number(value) || 1); persist() }, { type: 'number', inputMode: 'numeric', min: 1, max: 999 })
      )

      const photoNote = document.createElement('div')
      photoNote.className = 'host-onboarding-room-types__photo-note'
      photoNote.innerHTML = '<strong>Photos propres à ce type</strong><span>Elles seront associées à cette catégorie dans le module Photos. Les autres types garderont leurs propres images.</span>'

      card.append(cardHead, grid, photoNote)
      list.append(card)
    })
  }

  const add = document.createElement('button')
  add.type = 'button'
  add.className = 'host-onboarding-room-types__add'
  add.textContent = '+ Ajouter un autre type de chambre'
  add.addEventListener('click', () => {
    if (rooms.length >= 12) return
    rooms.push({
      id: roomId(),
      name: `Type de chambre ${rooms.length + 1}`,
      view: '',
      description: '',
      guests: Math.max(1, Number(draft.guests) || 2),
      beds: Math.max(1, Number(draft.beds) || 1),
      bathrooms: Math.max(0, Number(draft.bathrooms) || 1),
      basePrice: Math.max(1, Number(draft.basePrice) || 180),
      totalUnits: 1,
      photos: [],
    })
    persist()
    drawRooms()
  })

  const note = document.createElement('p')
  note.className = 'host-onboarding-room-types__note'
  note.textContent = 'Exemple : Standard vue jardin × 5, Deluxe vue mer × 3, Suite terrasse × 2. Le voyageur choisira le type, jamais un numéro de chambre.'

  drawRooms()
  persist()
  section.append(header, privacy, list, add, note)

  const counterCard = target.querySelector('.host-onboarding__counter-card')
  if (counterCard) counterCard.insertAdjacentElement('afterend', section)
  else target.append(section)
}

function renderReview(target, userId, draft) {
  if (!target || target.querySelector(`.${REVIEW_CLASS}`)) return
  const rooms = readHostRoomTypeDraft(userId, fallbackFromDraft(draft))
  const section = document.createElement('section')
  section.className = REVIEW_CLASS
  const rows = rooms.map((room) => `<li><strong>${room.name}</strong><span>${room.view || 'Vue non précisée'} · ${room.guests} voyageur${room.guests > 1 ? 's' : ''} · ${room.beds} lit${room.beds > 1 ? 's' : ''} · ${room.basePrice} TND/nuit</span><small>Stock privé : ${room.totalUnits} chambre${room.totalUnits > 1 ? 's' : ''} identique${room.totalUnits > 1 ? 's' : ''}</small></li>`).join('')
  section.innerHTML = `<div><span>Avant publication</span><h2>${rooms.length} type${rooms.length > 1 ? 's' : ''} de chambres</h2><p>Le client verra chaque catégorie séparément dans cette même publication.</p></div><ul>${rows}</ul>`
  target.prepend(section)
}

function enhanceRoomTypesOnboarding() {
  const current = context()
  document.querySelectorAll(`.${ROOM_EDITOR_CLASS}, .${REVIEW_CLASS}`).forEach((node) => {
    if (!current) node.remove()
  })
  if (!current) return
  renderEditor(document.querySelector(BASICS_SELECTOR), current.userId, current.draft)
  renderReview(document.querySelector(REVIEW_SELECTOR), current.userId, current.draft)
}

const observer = new MutationObserver(enhanceRoomTypesOnboarding)
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-screen'] })

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceRoomTypesOnboarding, { once: true })
else enhanceRoomTypesOnboarding()

requestAnimationFrame(enhanceRoomTypesOnboarding)
