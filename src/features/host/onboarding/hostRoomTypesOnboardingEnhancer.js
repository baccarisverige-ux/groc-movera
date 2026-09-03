import { usesPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import {
  HOST_ROOM_SETUP_MODES,
  readHostRoomConfigurationDraft,
  roomConfigurationIsValid,
  writeHostRoomConfigurationDraft,
} from '../../../entities/host/hostRoomTypeDraftStore.js'
import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'
import './host-room-types-onboarding.css'
import './host-room-basics-logic.css'

const BASICS_SELECTOR = '.host-onboarding[data-screen="basics"] .host-onboarding__step'
const REVIEW_SELECTOR = '.host-onboarding[data-screen="review"] .host-onboarding__step'
const SETUP_CLASS = 'host-room-setup'
const REVIEW_CLASS = 'host-onboarding-room-types-review'
const MAX_CATEGORIES = 12

function roomId() {
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function context() {
  const session = readAuthSession()
  if (!session?.userId) return null
  const draft = readHostOnboardingDraft(session.userId)
  if (!usesPooledRoomInventory(draft.propertyType, draft.guestAccess)) return null
  return { userId: session.userId, draft }
}

function fallbackFromDraft(draft) {
  return {
    guests: draft.guests,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    basePrice: draft.basePrice,
    bookingMode: draft.bookingMode,
    safety: draft.safety,
  }
}

function textElement(tag, text, className = '') {
  const element = document.createElement(tag)
  if (className) element.className = className
  element.textContent = text
  return element
}

function buttonElement(text, className, onClick) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.textContent = text
  button.addEventListener('click', onClick)
  return button
}

function counter(label, value, min, max, onChange) {
  const wrapper = document.createElement('div')
  wrapper.className = 'host-room-setup__counter'
  wrapper.append(textElement('span', label))
  const controls = document.createElement('div')
  const minus = buttonElement('−', '', () => onChange(Math.max(min, value - 1)))
  minus.setAttribute('aria-label', `Réduire ${label}`)
  minus.disabled = value <= min
  const number = textElement('b', String(value))
  const plus = buttonElement('+', '', () => onChange(Math.min(max, value + 1)))
  plus.setAttribute('aria-label', `Augmenter ${label}`)
  plus.disabled = value >= max
  controls.append(minus, number, plus)
  wrapper.append(controls)
  return wrapper
}

function inputField(label, value, onInput, options = {}) {
  const wrapper = document.createElement('label')
  wrapper.className = options.wide ? 'host-onboarding-room-types__field is-wide' : 'host-onboarding-room-types__field'
  wrapper.append(textElement('span', label))
  const input = options.multiline ? document.createElement('textarea') : document.createElement('input')
  if (options.multiline) input.rows = options.rows || 3
  if (options.type) input.type = options.type
  if (options.inputMode) input.inputMode = options.inputMode
  if (options.placeholder) input.placeholder = options.placeholder
  if (options.min != null) input.min = String(options.min)
  if (options.max != null) input.max = String(options.max)
  if (options.maxLength) input.maxLength = options.maxLength
  input.value = value ?? ''
  input.addEventListener('input', () => onInput(input.value))
  wrapper.append(input)
  return wrapper
}

function radioField(label, value, choices, onChange) {
  const fieldset = document.createElement('fieldset')
  fieldset.className = 'host-room-setup__mini-choice'
  fieldset.append(textElement('legend', label))
  const rail = document.createElement('div')
  choices.forEach((choice) => {
    const button = buttonElement(choice.label, '', () => {
      onChange(choice.value)
      rail.querySelectorAll('button').forEach((item) => {
        const active = item === button
        item.dataset.active = active ? 'true' : 'false'
        item.setAttribute('aria-pressed', active ? 'true' : 'false')
      })
    })
    button.dataset.active = value === choice.value ? 'true' : 'false'
    button.setAttribute('aria-pressed', value === choice.value ? 'true' : 'false')
    rail.append(button)
  })
  fieldset.append(rail)
  return fieldset
}

function newCategory(index, fallback, totalUnits = 1) {
  return {
    id: roomId(),
    name: `Catégorie ${index + 1}`,
    view: '',
    description: '',
    surface: 0,
    guests: Math.max(1, Number(fallback.guests) || 2),
    beds: Math.max(1, Number(fallback.beds) || 1),
    bedType: '',
    bathrooms: Math.max(0, Number(fallback.bathrooms) || 1),
    bathroomType: 'private',
    basePrice: Math.max(1, Number(fallback.basePrice) || 180),
    totalUnits: Math.max(1, totalUnits),
    features: [],
    amenities: [],
    highlights: [],
    promotions: [],
    bookingMode: fallback.bookingMode === 'instant' ? 'instant' : 'request-first',
    safety: { ...(fallback.safety || {}) },
    photos: [],
  }
}

function statusCopy(configuration) {
  if (configuration.mode === HOST_ROOM_SETUP_MODES.SINGLE) {
    return ['1 chambre', 'Une seule chambre publiée. Aucun système de lots n’est nécessaire.']
  }
  if (configuration.mode === HOST_ROOM_SETUP_MODES.MULTIPLE_UNSET) {
    return [`${configuration.totalRooms} chambres`, 'Indiquez maintenant si elles sont identiques ou si elles doivent être séparées en catégories.']
  }
  if (configuration.mode === HOST_ROOM_SETUP_MODES.IDENTICAL) {
    return [
      `${configuration.totalRooms} chambres identiques`,
      'Même annonce, mêmes photos, mêmes caractéristiques et même tarif. Movera gère uniquement le stock disponible pour chaque nuit.',
    ]
  }
  const assigned = configuration.roomTypes.reduce((sum, room) => sum + Number(room.totalUnits || 0), 0)
  return [
    `${configuration.roomTypes.length} catégories · ${assigned}/${configuration.totalRooms} chambres attribuées`,
    assigned === configuration.totalRooms
      ? 'Chaque catégorie possède son propre stock, ses caractéristiques, ses photos et son tarif.'
      : `Répartissez exactement ${configuration.totalRooms} chambres entre les catégories avant de continuer.`,
  ]
}

function syncContinueState(configuration) {
  const page = document.querySelector('.host-onboarding[data-screen="basics"]')
  if (!page) return
  const button = page.querySelector('.host-onboarding__primary')
  if (!button) return
  const valid = roomConfigurationIsValid(configuration)
  button.dataset.roomSetupValid = valid ? 'true' : 'false'
  button.disabled = !valid
}

function persistConfiguration(userId, configuration, fallback) {
  const next = writeHostRoomConfigurationDraft(userId, configuration, fallback)
  syncContinueState(next)
  return next
}

function syncRoomBasicsPresentation(target, configuration) {
  if (!target) return
  const heading = target.querySelector('h1')
  const intro = heading?.nextElementSibling
  const counterCard = target.querySelector('.host-onboarding__counter-card')
  const categoryMode = configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES

  target.dataset.roomInventoryBasics = categoryMode ? 'categories' : 'room'
  if (heading) heading.textContent = categoryMode ? 'Configurez vos catégories de chambres' : 'Configurez vos chambres'
  if (intro?.tagName === 'P') {
    intro.textContent = categoryMode
      ? 'Chaque catégorie définit sa propre capacité, ses lits, sa salle de bain et son tarif. Les informations ne sont jamais mélangées entre catégories.'
      : 'Commencez par le nombre de chambres à publier, puis indiquez la capacité d’une chambre. Le stock et les caractéristiques restent séparés.'
  }

  if (counterCard) {
    const bedroomRow = Array.from(counterCard.querySelectorAll('.host-onboarding__counter-row'))
      .find((row) => row.querySelector('.host-onboarding__counter-label strong')?.textContent?.trim() === 'Chambres')
    if (bedroomRow) bedroomRow.hidden = true
    counterCard.hidden = categoryMode
  }

  let capacityHeading = target.querySelector('.host-room-setup__capacity-heading')
  if (!capacityHeading && counterCard) {
    capacityHeading = document.createElement('div')
    capacityHeading.className = 'host-room-setup__capacity-heading'
    capacityHeading.append(
      textElement('span', 'Capacité'),
      textElement('h2', 'Capacité d’une chambre'),
      textElement('p', 'Voyageurs, lits et salle de bain pour la chambre proposée. Le nombre total de chambres est géré séparément.'),
    )
    counterCard.insertAdjacentElement('beforebegin', capacityHeading)
  }
  if (capacityHeading) capacityHeading.hidden = categoryMode
}

function renderCategoryCard(room, index, configuration, persist, redraw) {
  const card = document.createElement('article')
  card.className = 'host-onboarding-room-types__card'
  card.dataset.roomCategoryId = room.id

  const head = document.createElement('div')
  head.className = 'host-onboarding-room-types__card-head'
  const title = document.createElement('div')
  title.append(textElement('small', `Catégorie ${index + 1}`), textElement('strong', room.name || `Catégorie ${index + 1}`))
  const remove = buttonElement('Supprimer', '', () => {
    if (configuration.roomTypes.length <= 2) return
    configuration.roomTypes = configuration.roomTypes.filter((item) => item.id !== room.id)
    persist()
    redraw()
  })
  remove.disabled = configuration.roomTypes.length <= 2
  head.append(title, remove)

  const quantity = counter('Chambres identiques dans cette catégorie', Number(room.totalUnits) || 1, 1, configuration.totalRooms, (value) => {
    room.totalUnits = value
    persist()
    redraw()
  })
  quantity.classList.add('host-room-setup__lot-quantity')

  const grid = document.createElement('div')
  grid.className = 'host-onboarding-room-types__grid'
  grid.append(
    inputField('Nom visible au voyageur', room.name, (value) => {
      room.name = value
      title.querySelector('strong').textContent = value || `Catégorie ${index + 1}`
      persist()
    }, { wide: true, placeholder: 'Ex. Deluxe vue mer', maxLength: 44 }),
    inputField('Vue / particularité', room.view, (value) => { room.view = value; persist() }, { wide: true, placeholder: 'Ex. Vue mer panoramique', maxLength: 60 }),
    inputField('Description de cette catégorie', room.description, (value) => { room.description = value; persist() }, { wide: true, multiline: true, placeholder: 'Ex. Chambre lumineuse, balcon privé, étage élevé…', maxLength: 260 }),
    inputField('Surface (m²)', room.surface || '', (value) => { room.surface = Math.max(0, Number(value) || 0); persist() }, { type: 'number', inputMode: 'numeric', min: 0, max: 1000 }),
    inputField('Voyageurs', room.guests, (value) => { room.guests = Math.max(1, Number(value) || 1); persist() }, { type: 'number', inputMode: 'numeric', min: 1, max: 20 }),
    inputField('Lits', room.beds, (value) => { room.beds = Math.max(1, Number(value) || 1); persist() }, { type: 'number', inputMode: 'numeric', min: 1, max: 20 }),
    inputField('Type de lit', room.bedType, (value) => { room.bedType = value; persist() }, { placeholder: 'Queen, King, twin…' }),
    inputField('Salles de bain', room.bathrooms, (value) => { room.bathrooms = Math.max(0, Number(value) || 0); persist() }, { type: 'number', inputMode: 'numeric', min: 0, max: 10 }),
    inputField('Prix / nuit (TND)', room.basePrice, (value) => { room.basePrice = Math.max(1, Number(value) || 1); persist() }, { type: 'number', inputMode: 'numeric', min: 1, max: 99999 }),
    inputField('Caractéristiques', (room.features || []).join(', '), (value) => {
      room.features = value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8)
      persist()
    }, { wide: true, placeholder: 'Balcon, bureau, minibar…' }),
  )
  grid.append(radioField('Salle de bain', room.bathroomType || 'private', [
    { value: 'private', label: 'Privée' },
    { value: 'shared', label: 'Partagée' },
  ], (value) => { room.bathroomType = value; persist() }))

  const photoNote = document.createElement('div')
  photoNote.className = 'host-onboarding-room-types__photo-note'
  photoNote.append(
    textElement('strong', 'Photos spécifiques à cette catégorie'),
    textElement('span', 'Vous les ajouterez à l’étape Photos. Elles ne seront pas mélangées avec les autres catégories.'),
  )

  card.append(head, quantity, grid, photoNote)
  return card
}

function renderSetup(target, userId, draft) {
  if (!target || target.querySelector(`.${SETUP_CLASS}`)) return
  const fallback = fallbackFromDraft(draft)
  let configuration = readHostRoomConfigurationDraft(userId, fallback)
  const section = document.createElement('section')
  section.className = SETUP_CLASS
  section.setAttribute('aria-label', 'Configuration des chambres de l’établissement')

  const draw = () => {
    section.replaceChildren()

    const header = document.createElement('div')
    header.className = 'host-room-setup__header'
    header.append(
      textElement('span', 'Inventaire de l’établissement'),
      textElement('h2', 'Combien de chambres souhaitez-vous publier ?'),
      textElement('p', 'Déclarez d’abord le nombre réellement réservable. Movera adapte ensuite automatiquement le stock, les chambres identiques ou les catégories.'),
    )
    section.append(header)

    section.append(counter('Nombre total de chambres', configuration.totalRooms, 1, 999, (value) => {
      const previousTotal = configuration.totalRooms
      configuration.totalRooms = value
      if (value === 1) {
        configuration.mode = HOST_ROOM_SETUP_MODES.SINGLE
        configuration.roomTypes = [{ ...(configuration.roomTypes[0] || newCategory(0, fallback)), id: configuration.roomTypes[0]?.id || 'room-standard', totalUnits: 1 }]
      } else if (previousTotal === 1 || configuration.mode === HOST_ROOM_SETUP_MODES.SINGLE) {
        configuration.mode = HOST_ROOM_SETUP_MODES.MULTIPLE_UNSET
        configuration.roomTypes = [{ ...(configuration.roomTypes[0] || newCategory(0, fallback)), totalUnits: value }]
      } else if (configuration.mode === HOST_ROOM_SETUP_MODES.IDENTICAL || configuration.mode === HOST_ROOM_SETUP_MODES.MULTIPLE_UNSET) {
        configuration.roomTypes = [{ ...(configuration.roomTypes[0] || newCategory(0, fallback)), totalUnits: value }]
      }
      configuration = persistConfiguration(userId, configuration, fallback)
      draw()
    }))

    if (configuration.totalRooms > 1) {
      const question = document.createElement('div')
      question.className = 'host-room-setup__question'
      question.append(
        textElement('strong', 'Ces chambres sont-elles toutes identiques ?'),
        textElement('span', 'Identiques = même configuration, mêmes photos, mêmes équipements et même tarif.'),
      )
      const choices = document.createElement('div')
      choices.className = 'host-room-setup__choices'

      const identical = buttonElement('', '', () => {
        configuration.mode = HOST_ROOM_SETUP_MODES.IDENTICAL
        configuration.roomTypes = [{ ...(configuration.roomTypes[0] || newCategory(0, fallback)), name: configuration.roomTypes[0]?.name || 'Chambre', totalUnits: configuration.totalRooms }]
        configuration = persistConfiguration(userId, configuration, fallback)
        draw()
      })
      identical.dataset.active = configuration.mode === HOST_ROOM_SETUP_MODES.IDENTICAL ? 'true' : 'false'
      identical.append(textElement('strong', 'Oui, elles sont identiques'), textElement('span', 'Une seule annonce. Le stock diminue automatiquement à chaque réservation.'))

      const categories = buttonElement('', '', () => {
        const first = { ...(configuration.roomTypes[0] || newCategory(0, fallback)), id: configuration.roomTypes[0]?.id || roomId(), name: 'Catégorie 1', totalUnits: 1 }
        const second = newCategory(1, fallback, Math.max(1, configuration.totalRooms - 1))
        configuration.mode = HOST_ROOM_SETUP_MODES.CATEGORIES
        configuration.roomTypes = [first, second]
        configuration = persistConfiguration(userId, configuration, fallback)
        draw()
      })
      categories.dataset.active = configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES ? 'true' : 'false'
      categories.append(textElement('strong', 'Non, il existe plusieurs catégories'), textElement('span', 'Chaque catégorie peut contenir une ou plusieurs chambres identiques.'))
      choices.append(identical, categories)
      question.append(choices)
      section.append(question)
    }

    const [statusTitle, statusText] = statusCopy(configuration)
    const status = document.createElement('div')
    status.className = 'host-room-setup__status'
    status.dataset.valid = roomConfigurationIsValid(configuration) ? 'true' : 'false'
    status.append(textElement('strong', statusTitle), textElement('span', statusText))
    section.append(status)

    if (configuration.mode === HOST_ROOM_SETUP_MODES.IDENTICAL) {
      const info = document.createElement('div')
      info.className = 'host-room-setup__identical'
      info.append(
        textElement('strong', 'Une seule fiche, plusieurs unités disponibles'),
        textElement('span', `Vous décrivez la chambre une seule fois. Si un voyageur en réserve 1, le calendrier conserve automatiquement ${Math.max(0, configuration.totalRooms - 1)} chambre${configuration.totalRooms - 1 > 1 ? 's' : ''} disponible${configuration.totalRooms - 1 > 1 ? 's' : ''} sur les mêmes nuits.`),
      )
      section.append(info)
    }

    if (configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES) {
      const list = document.createElement('div')
      list.className = 'host-onboarding-room-types__list'
      const persist = () => {
        configuration = persistConfiguration(userId, configuration, fallback)
      }
      configuration.roomTypes.forEach((room, index) => list.append(renderCategoryCard(room, index, configuration, persist, draw)))
      section.append(list)

      const add = buttonElement('+ Ajouter une catégorie', 'host-onboarding-room-types__add', () => {
        if (configuration.roomTypes.length >= Math.min(MAX_CATEGORIES, configuration.totalRooms)) return
        const assigned = configuration.roomTypes.reduce((sum, room) => sum + Math.max(1, Number(room.totalUnits) || 1), 0)
        if (assigned >= configuration.totalRooms) {
          const donor = [...configuration.roomTypes].sort((a, b) => Number(b.totalUnits) - Number(a.totalUnits)).find((room) => Number(room.totalUnits) > 1)
          if (!donor) return
          donor.totalUnits -= 1
        }
        configuration.roomTypes.push(newCategory(configuration.roomTypes.length, fallback, 1))
        configuration = persistConfiguration(userId, configuration, fallback)
        draw()
      })
      const assigned = configuration.roomTypes.reduce((sum, room) => sum + Math.max(1, Number(room.totalUnits) || 1), 0)
      const canAdd = configuration.roomTypes.length < Math.min(MAX_CATEGORIES, configuration.totalRooms)
        && (assigned < configuration.totalRooms || configuration.roomTypes.some((room) => Number(room.totalUnits) > 1))
      add.disabled = !canAdd
      section.append(add)
      section.append(textElement('p', 'Exemple : 3 chambres toutes différentes = 3 catégories de 1 chambre. 6 chambres avec 4 Standard + 2 Deluxe = 2 catégories.', 'host-onboarding-room-types__note'))
    }

    syncRoomBasicsPresentation(target, configuration)
    syncContinueState(configuration)
  }

  draw()
  const capacityHeading = target.querySelector('.host-room-setup__capacity-heading')
  const counterCard = target.querySelector('.host-onboarding__counter-card')
  if (capacityHeading) capacityHeading.insertAdjacentElement('beforebegin', section)
  else if (counterCard) counterCard.insertAdjacentElement('beforebegin', section)
  else target.append(section)
}

function renderReview(target, userId, draft) {
  if (!target || target.querySelector(`.${REVIEW_CLASS}`)) return
  const configuration = readHostRoomConfigurationDraft(userId, fallbackFromDraft(draft))
  const section = document.createElement('section')
  section.className = REVIEW_CLASS

  let title = '1 chambre'
  let copy = 'Une chambre publiée avec sa propre disponibilité.'
  if (configuration.mode === HOST_ROOM_SETUP_MODES.IDENTICAL) {
    title = `${configuration.totalRooms} chambres identiques`
    copy = 'Une seule annonce et un stock mutualisé par nuit.'
  } else if (configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES) {
    title = `${configuration.totalRooms} chambres · ${configuration.roomTypes.length} catégories`
    copy = 'Chaque catégorie conserve son propre stock, ses photos, ses détails et son tarif.'
  }

  const intro = document.createElement('div')
  intro.append(textElement('span', 'Structure de l’établissement'), textElement('h2', title), textElement('p', copy))
  section.append(intro)

  if (configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES) {
    const list = document.createElement('ul')
    configuration.roomTypes.forEach((room) => {
      const item = document.createElement('li')
      const details = [
        room.view,
        room.surface ? `${room.surface} m²` : '',
        `${room.guests} voyageur${room.guests > 1 ? 's' : ''}`,
        `${room.beds} lit${room.beds > 1 ? 's' : ''}`,
        `${room.amenities?.length || 0} équipements`,
        `${room.highlights?.length || 0} options`,
        room.description?.trim() ? 'Description prête' : 'Description à compléter',
        `${room.promotions?.length || 0} promotions`,
        room.bookingMode === 'instant' ? 'Réservation instantanée' : 'Réservation sur demande',
        room.safety?.smokeAlarm ? 'Détecteur de fumée' : 'Sécurité à vérifier',
        `${room.basePrice} TND/nuit`,
      ].filter(Boolean).join(' · ')
      item.append(
        textElement('strong', room.name),
        textElement('span', details),
        textElement('small', `Stock privé : ${room.totalUnits} chambre${room.totalUnits > 1 ? 's' : ''} · ${room.photos?.length || 0} photo${room.photos?.length > 1 ? 's' : ''}`),
      )
      list.append(item)
    })
    section.append(list)
  }

  target.prepend(section)
}

function enhanceRoomSetup() {
  const current = context()
  document.querySelectorAll(`.${SETUP_CLASS}, .${REVIEW_CLASS}`).forEach((node) => {
    if (!current) node.remove()
  })
  if (!current) return
  renderSetup(document.querySelector(BASICS_SELECTOR), current.userId, current.draft)
  renderReview(document.querySelector(REVIEW_SELECTOR), current.userId, current.draft)
  const configuration = readHostRoomConfigurationDraft(current.userId, fallbackFromDraft(current.draft))
  syncContinueState(configuration)
}

const observer = new MutationObserver(enhanceRoomSetup)
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-screen'] })

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('.host-onboarding[data-screen="basics"] .host-onboarding__primary')
  if (!button) return
  const current = context()
  if (!current) return
  const configuration = readHostRoomConfigurationDraft(current.userId, fallbackFromDraft(current.draft))
  if (roomConfigurationIsValid(configuration)) return
  event.preventDefault()
  event.stopImmediatePropagation()
}, true)

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceRoomSetup, { once: true })
else enhanceRoomSetup()

requestAnimationFrame(enhanceRoomSetup)
