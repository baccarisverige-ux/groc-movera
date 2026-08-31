import { supportsPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import {
  readHostRoomLotDraft,
  writeHostRoomLotDraft,
} from '../../../entities/host/hostRoomTypeDraftStore.js'
import {
  MAX_ROOM_LOTS,
  MIN_ROOM_LOTS,
  makeRoomLot,
  roomLotTotalUnits,
  validateRoomLotPlan,
} from '../../../entities/host/roomLotModel.js'
import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'
import './host-room-types-onboarding.css'

const PROPERTY_SELECTOR = '.host-onboarding[data-screen="property-type"] .host-onboarding__step'
const BASICS_SELECTOR = '.host-onboarding[data-screen="basics"] .host-onboarding__step'
const PHOTOS_SELECTOR = '.host-onboarding[data-screen="photos"] .host-onboarding__step'
const PRICE_SELECTOR = '.host-onboarding[data-screen="price"] .host-onboarding__step'
const REVIEW_SELECTOR = '.host-onboarding[data-screen="review"] .host-onboarding__step'
const ROOT_CLASS = 'host-onboarding-room-lots'
const REVIEW_CLASS = 'host-onboarding-room-lots-review'
const PHOTO_CLASS = 'host-onboarding-room-lot-photos'
const PRICE_CLASS = 'host-onboarding-room-lot-price'
const SUMMARY_CLASS = 'host-onboarding-room-lots-summary'
const MAX_PHOTOS_PER_LOT = 6
const MAX_PHOTO_EDGE = 960
const PHOTO_QUALITY = 0.68

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

function el(tag, className = '', text = '') {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function field(label, value, onInput, options = {}) {
  const wrapper = el('label', `host-onboarding-room-lots__field${options.wide ? ' is-wide' : ''}`)
  wrapper.append(el('span', '', label))
  const input = options.multiline ? document.createElement('textarea') : document.createElement('input')
  if (options.multiline) input.rows = options.rows || 3
  if (options.type) input.type = options.type
  if (options.inputMode) input.inputMode = options.inputMode
  if (options.placeholder) input.placeholder = options.placeholder
  if (options.min != null) input.min = String(options.min)
  if (options.max != null) input.max = String(options.max)
  input.value = value ?? ''
  input.addEventListener('input', () => onInput(input.value))
  wrapper.append(input)
  return wrapper
}

function selectField(label, value, options, onChange) {
  const wrapper = el('label', 'host-onboarding-room-lots__field')
  wrapper.append(el('span', '', label))
  const select = document.createElement('select')
  options.forEach(([optionValue, optionLabel]) => {
    const option = document.createElement('option')
    option.value = optionValue
    option.textContent = optionLabel
    option.selected = optionValue === value
    select.append(option)
  })
  select.addEventListener('change', () => onChange(select.value))
  wrapper.append(select)
  return wrapper
}

function currentPlan(userId, draft) {
  return readHostRoomLotDraft(userId, fallbackFromDraft(draft))
}

function persist(userId, draft, plan) {
  return writeHostRoomLotDraft(userId, plan, fallbackFromDraft(draft))
}

function distribute(lots, total, draft) {
  const safeLots = lots.length >= MIN_ROOM_LOTS
    ? lots
    : [...lots, ...Array.from({ length: MIN_ROOM_LOTS - lots.length }, (_, offset) => makeRoomLot(lots.length + offset, fallbackFromDraft(draft), 1))]
  const safeTotal = Math.max(safeLots.length, Math.min(999, Math.round(Number(total) || safeLots.length)))
  const base = Math.floor(safeTotal / safeLots.length)
  let remainder = safeTotal % safeLots.length
  return safeLots.map((lot) => {
    const units = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    return { ...lot, totalUnits: Math.max(1, units) }
  })
}

function setPrimaryBlocked(blocked, reason = '') {
  const button = document.querySelector('.host-onboarding__primary')
  if (!button) return
  button.dataset.roomLotBlocked = blocked ? 'true' : 'false'
  if (blocked) {
    button.setAttribute('aria-disabled', 'true')
    if (reason) button.dataset.roomLotReason = reason
  } else {
    button.removeAttribute('aria-disabled')
    delete button.dataset.roomLotReason
  }
}

function validationNotice(validation) {
  const box = el('div', `host-onboarding-room-lots__validation ${validation.ok ? 'is-valid' : 'is-invalid'}`)
  const icon = el('span', 'host-onboarding-room-lots__validation-icon', validation.ok ? '✓' : '!')
  const copy = el('div')
  copy.append(el('strong', '', validation.ok ? 'Structure prête' : 'Structure à compléter'))
  copy.append(el('span', '', validation.ok
    ? `${validation.totalRooms} chambres réparties dans ${validation.roomLots.length} lots.`
    : validation.issues[0] || 'Complétez les lots avant de continuer.'))
  box.append(icon, copy)
  return box
}

function createLotCard(lot, index, state) {
  const card = el('article', 'host-onboarding-room-lots__card')
  card.dataset.roomLotId = lot.id

  const head = el('div', 'host-onboarding-room-lots__card-head')
  const identity = el('div')
  identity.append(el('small', '', `Lot ${index + 1}`), el('strong', '', lot.name || `Lot ${index + 1}`))
  const remove = el('button', '', 'Supprimer')
  remove.type = 'button'
  remove.disabled = state.plan.roomLots.length <= MIN_ROOM_LOTS
  remove.addEventListener('click', () => state.removeLot(lot.id))
  head.append(identity, remove)

  const quantity = el('div', 'host-onboarding-room-lots__quantity')
  const qcopy = el('div')
  qcopy.append(el('strong', '', 'Chambres identiques dans ce lot'), el('span', '', 'Même catégorie, vue et niveau de prestation.'))
  const qcontrol = el('div', 'host-onboarding-room-lots__quantity-control')
  const minus = el('button', '', '−')
  minus.type = 'button'
  minus.disabled = lot.totalUnits <= 1
  const number = el('b', '', String(lot.totalUnits))
  const plus = el('button', '', '+')
  plus.type = 'button'
  minus.addEventListener('click', () => state.updateUnits(lot.id, -1))
  plus.addEventListener('click', () => state.updateUnits(lot.id, 1))
  qcontrol.append(minus, number, plus)
  quantity.append(qcopy, qcontrol)

  const grid = el('div', 'host-onboarding-room-lots__grid')
  const refreshTitle = (value) => { identity.querySelector('strong').textContent = value || `Lot ${index + 1}` }
  grid.append(
    field('Nom visible au voyageur', lot.name, (value) => { state.patch(lot.id, { name: value }); refreshTitle(value) }, { wide: true, placeholder: 'Ex. Deluxe Vue Mer' }),
    field('Vue / particularité', lot.view, (value) => state.patch(lot.id, { view: value }), { wide: true, placeholder: 'Ex. Vue mer panoramique, balcon' }),
    field('Description propre au lot', lot.description, (value) => state.patch(lot.id, { description: value }), { wide: true, multiline: true, rows: 3, placeholder: 'Décrivez précisément ce qui distingue ces chambres…' }),
    field('Surface (m²)', lot.sizeM2 || '', (value) => state.patch(lot.id, { sizeM2: Math.max(0, Number(value) || 0) }), { type: 'number', inputMode: 'numeric', min: 0, max: 500 }),
    field('Type de lit', lot.bedType, (value) => state.patch(lot.id, { bedType: value }), { placeholder: 'King, Queen, twin…' }),
    field('Voyageurs', lot.guests, (value) => state.patch(lot.id, { guests: Math.max(1, Number(value) || 1) }), { type: 'number', inputMode: 'numeric', min: 1, max: 20 }),
    field('Lits', lot.beds, (value) => state.patch(lot.id, { beds: Math.max(1, Number(value) || 1) }), { type: 'number', inputMode: 'numeric', min: 1, max: 20 }),
    field('Salles de bain', lot.bathrooms, (value) => state.patch(lot.id, { bathrooms: Math.max(0, Number(value) || 0) }), { type: 'number', inputMode: 'numeric', min: 0, max: 10 }),
    selectField('Salle de bain', lot.bathroomType, [['private', 'Privée'], ['shared', 'Partagée']], (value) => state.patch(lot.id, { bathroomType: value })),
    field('Prix / nuit (TND)', lot.basePrice, (value) => state.patch(lot.id, { basePrice: Math.max(1, Number(value) || 1) }), { type: 'number', inputMode: 'numeric', min: 1, max: 99999 }),
    field('Éléments distinctifs', (lot.features || []).join(', '), (value) => state.patch(lot.id, { features: value.split(',').map((item) => item.trim()).filter(Boolean) }), { wide: true, placeholder: 'Balcon, minibar, bureau, baignoire…' }),
  )

  const photoStatus = el('div', 'host-onboarding-room-lots__photo-status')
  photoStatus.append(
    el('strong', '', `${lot.photos?.length || 0} photo${(lot.photos?.length || 0) > 1 ? 's' : ''} liée${(lot.photos?.length || 0) > 1 ? 's' : ''}`),
    el('span', '', 'Les photos seront ajoutées séparément pour ce lot à l’étape Photos.')
  )

  card.append(head, quantity, grid, photoStatus)
  return card
}

function renderPropertyPlan(target, userId, draft) {
  if (!target || target.querySelector(`.${ROOT_CLASS}`)) return
  let plan = currentPlan(userId, draft)
  const section = el('section', ROOT_CLASS)
  section.dataset.testid = 'host-room-lot-plan'

  const intro = el('div', 'host-onboarding-room-lots__intro')
  intro.append(
    el('span', '', 'Structure de l’établissement'),
    el('h2', '', 'Combien de chambres publiez-vous ?'),
    el('p', '', 'Pour un hôtel ou une maison d’hôte, les chambres sont organisées en lots. Chaque lot regroupe uniquement des chambres identiques ou quasi identiques.')
  )

  const totalCard = el('div', 'host-onboarding-room-lots__total')
  const totalCopy = el('div')
  totalCopy.append(el('small', '', 'Nombre total publié'), el('strong', '', 'Chambres de l’établissement'))
  const totalControl = el('div', 'host-onboarding-room-lots__total-control')
  const minus = el('button', '', '−')
  minus.type = 'button'
  const count = el('b', '', String(plan.totalRooms))
  const plus = el('button', '', '+')
  plus.type = 'button'
  totalControl.append(minus, count, plus)
  totalCard.append(totalCopy, totalControl)

  const privacy = el('div', 'host-onboarding-room-lots__privacy')
  privacy.append(
    el('strong', '', 'Voyageur'), el('span', '', 'voit les catégories, photos, caractéristiques, descriptions et prix.'),
    el('strong', '', 'Hôte'), el('span', '', 'voit en plus le nombre total et le stock restant par lot.')
  )

  const heading = el('div', 'host-onboarding-room-lots__lots-head')
  const list = el('div', 'host-onboarding-room-lots__list')
  const validationSlot = el('div', 'host-onboarding-room-lots__validation-slot')
  const add = el('button', 'host-onboarding-room-lots__add', '+ Ajouter un lot de chambres')
  add.type = 'button'

  const saveAndDraw = (nextPlan) => {
    plan = persist(userId, draft, nextPlan)
    draw()
  }

  const state = {
    get plan() { return plan },
    patch(id, patch) {
      const roomLots = plan.roomLots.map((lot) => lot.id === id ? { ...lot, ...patch } : lot)
      plan = persist(userId, draft, { ...plan, roomLots })
      drawValidation()
    },
    updateUnits(id, delta) {
      const roomLots = plan.roomLots.map((lot) => lot.id === id ? { ...lot, totalUnits: Math.max(1, lot.totalUnits + delta) } : lot)
      saveAndDraw({ totalRooms: roomLotTotalUnits(roomLots), roomLots })
    },
    removeLot(id) {
      if (plan.roomLots.length <= MIN_ROOM_LOTS) return
      const roomLots = plan.roomLots.filter((lot) => lot.id !== id)
      const nextTotal = Math.max(roomLots.length, plan.totalRooms)
      saveAndDraw({ totalRooms: nextTotal, roomLots: distribute(roomLots, nextTotal, draft) })
    },
  }

  function drawValidation() {
    const validation = validateRoomLotPlan(plan)
    validationSlot.replaceChildren(validationNotice(validation))
    setPrimaryBlocked(!validation.ok, validation.issues[0] || '')
  }

  function draw() {
    count.textContent = String(plan.totalRooms)
    minus.disabled = plan.totalRooms <= plan.roomLots.length
    heading.replaceChildren(
      el('div', '', ''),
    )
    const headCopy = heading.firstChild
    headCopy.append(el('strong', '', `${plan.roomLots.length} lots de chambres`), el('span', '', `${roomLotTotalUnits(plan.roomLots)}/${plan.totalRooms} chambres réparties`))
    add.disabled = plan.roomLots.length >= MAX_ROOM_LOTS
    list.replaceChildren(...plan.roomLots.map((lot, index) => createLotCard(lot, index, state)))
    drawValidation()
  }

  minus.addEventListener('click', () => {
    const totalRooms = Math.max(plan.roomLots.length, plan.totalRooms - 1)
    saveAndDraw({ totalRooms, roomLots: distribute(plan.roomLots, totalRooms, draft) })
  })
  plus.addEventListener('click', () => {
    const totalRooms = Math.min(999, plan.totalRooms + 1)
    saveAndDraw({ totalRooms, roomLots: distribute(plan.roomLots, totalRooms, draft) })
  })
  add.addEventListener('click', () => {
    if (plan.roomLots.length >= MAX_ROOM_LOTS) return
    const roomLots = [...plan.roomLots, makeRoomLot(plan.roomLots.length, fallbackFromDraft(draft), 1)]
    const totalRooms = Math.max(plan.totalRooms, roomLots.length)
    saveAndDraw({ totalRooms, roomLots: distribute(roomLots, totalRooms, draft) })
  })

  section.append(intro, totalCard, privacy, heading, list, add, validationSlot)
  const grid = target.querySelector('.host-onboarding__choice-grid')
  if (grid) grid.insertAdjacentElement('afterend', section)
  else target.append(section)
  draw()
}

function renderBasicsSummary(target, userId, draft) {
  if (!target || target.querySelector(`.${SUMMARY_CLASS}`)) return
  const plan = currentPlan(userId, draft)
  const summary = el('section', SUMMARY_CLASS)
  summary.append(
    el('span', '', 'Structure enregistrée'),
    el('strong', '', `${plan.totalRooms} chambres · ${plan.roomLots.length} lots`),
    el('p', '', 'Les compteurs ci-dessus décrivent la capacité générale. Les caractéristiques précises de chaque catégorie sont gérées par lot.')
  )
  target.prepend(summary)
}

function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lecture image impossible'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Image invalide'))
      image.onload = () => resolve(image)
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

async function compressPhoto(file) {
  const image = await imageFromFile(file)
  const ratio = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.naturalWidth || 1, image.naturalHeight || 1))
  const width = Math.max(1, Math.round((image.naturalWidth || 1) * ratio))
  const height = Math.max(1, Math.round((image.naturalHeight || 1) * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY)
}

function renderPhotoStep(target, userId, draft) {
  if (!target || target.querySelector(`.${PHOTO_CLASS}`)) return
  const generic = target.querySelector('.host-onboarding__photo-uploader')
  const slots = target.querySelector('.host-onboarding__photo-slots')
  if (generic) generic.hidden = true
  if (slots) slots.hidden = true
  target.classList.add('is-room-lot-photo-flow')

  let plan = currentPlan(userId, draft)
  const section = el('section', PHOTO_CLASS)
  const intro = el('div', 'host-onboarding-room-lot-photos__intro')
  intro.append(
    el('span', '', 'Photos par lot'),
    el('h2', '', 'Montrez chaque catégorie séparément'),
    el('p', '', 'Ajoutez des photos représentatives du lot. Toutes les chambres de ce lot doivent être identiques ou quasi identiques à ce que montrent ces images.')
  )
  const list = el('div', 'host-onboarding-room-lot-photos__list')
  const status = el('p', 'host-onboarding-room-lot-photos__status')

  const save = () => { plan = persist(userId, draft, plan) }

  const draw = () => {
    list.replaceChildren()
    plan.roomLots.forEach((lot, index) => {
      const card = el('article', 'host-onboarding-room-lot-photos__card')
      const head = el('div', 'host-onboarding-room-lot-photos__head')
      const copy = el('div')
      copy.append(el('small', '', `Lot ${index + 1}`), el('strong', '', lot.name), el('span', '', lot.view || 'Vue à préciser'))
      const counter = el('b', '', `${lot.photos.length}/${MAX_PHOTOS_PER_LOT}`)
      head.append(copy, counter)

      const rail = el('div', 'host-onboarding-room-lot-photos__rail')
      lot.photos.forEach((src, photoIndex) => {
        const tile = el('div', 'host-onboarding-room-lot-photos__tile')
        const image = document.createElement('img')
        image.src = src
        image.alt = photoIndex === 0 ? `${lot.name} — photo principale` : `${lot.name} — photo ${photoIndex + 1}`
        const remove = el('button', '', '×')
        remove.type = 'button'
        remove.setAttribute('aria-label', `Supprimer photo ${photoIndex + 1} de ${lot.name}`)
        remove.addEventListener('click', () => {
          plan = { ...plan, roomLots: plan.roomLots.map((item) => item.id === lot.id ? { ...item, photos: item.photos.filter((_, i) => i !== photoIndex) } : item) }
          save(); draw()
        })
        tile.append(image, remove)
        if (photoIndex === 0) tile.append(el('span', '', 'Principale'))
        rail.append(tile)
      })

      const uploader = el('label', 'host-onboarding-room-lot-photos__upload')
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/jpeg,image/png,image/webp'
      input.multiple = true
      input.hidden = true
      uploader.append(el('strong', '', lot.photos.length ? '+ Ajouter des photos' : '+ Ajouter les photos du lot'), el('span', '', 'Jusqu’à 6 photos · première photo = couverture du lot'), input)
      if (lot.photos.length >= MAX_PHOTOS_PER_LOT) uploader.classList.add('is-full')
      input.disabled = lot.photos.length >= MAX_PHOTOS_PER_LOT
      input.addEventListener('change', async () => {
        const available = MAX_PHOTOS_PER_LOT - lot.photos.length
        const files = Array.from(input.files || []).slice(0, available)
        if (!files.length) return
        uploader.classList.add('is-loading')
        try {
          const images = []
          for (const file of files) images.push(await compressPhoto(file))
          plan = { ...plan, roomLots: plan.roomLots.map((item) => item.id === lot.id ? { ...item, photos: [...item.photos, ...images].slice(0, MAX_PHOTOS_PER_LOT) } : item) }
          save(); draw()
        } catch {
          status.textContent = 'Une photo n’a pas pu être traitée. Utilisez JPG, PNG ou WebP.'
        } finally {
          uploader.classList.remove('is-loading')
        }
      })

      card.append(head, rail, uploader)
      list.append(card)
    })
    const missing = plan.roomLots.filter((lot) => !lot.photos.length)
    status.textContent = missing.length
      ? `Ajoutez au moins une photo pour ${missing.length} lot${missing.length > 1 ? 's' : ''}.`
      : 'Chaque lot possède au moins une photo représentative.'
    status.dataset.valid = missing.length ? 'false' : 'true'
    setPrimaryBlocked(Boolean(missing.length), status.textContent)
  }

  section.append(intro, list, status)
  target.append(section)
  draw()
}

function renderPriceSummary(target, userId, draft) {
  if (!target || target.querySelector(`.${PRICE_CLASS}`)) return
  const plan = currentPlan(userId, draft)
  const prices = plan.roomLots.map((lot) => lot.basePrice)
  const section = el('section', PRICE_CLASS)
  const intro = el('div')
  intro.append(el('span', '', 'Tarification par lot'), el('h2', '', `À partir de ${Math.min(...prices)} TND / nuit`), el('p', '', 'Le tarif général de la publication n’écrase pas les prix des lots. Chaque catégorie conserve son propre prix de base et son calendrier tarifaire.'))
  const list = el('div', 'host-onboarding-room-lot-price__list')
  plan.roomLots.forEach((lot) => {
    const row = el('div')
    const copy = el('span')
    copy.append(el('strong', '', lot.name), el('small', '', `${lot.totalUnits} chambre${lot.totalUnits > 1 ? 's' : ''} · ${lot.view}`))
    row.append(copy, el('b', '', `${lot.basePrice} TND`))
    list.append(row)
  })
  section.append(intro, list)
  target.prepend(section)
}

function renderReview(target, userId, draft) {
  if (!target || target.querySelector(`.${REVIEW_CLASS}`)) return
  const plan = currentPlan(userId, draft)
  const validation = validateRoomLotPlan(plan)
  const section = el('section', REVIEW_CLASS)
  const intro = el('div')
  intro.append(
    el('span', '', 'Structure de la publication'),
    el('h2', '', `${plan.totalRooms} chambres · ${plan.roomLots.length} lots`),
    el('p', '', 'Le voyageur pourra comparer les lots sans voir vos quantités restantes. Le stock reste exclusivement dans l’espace Hôte.')
  )
  const list = el('ul')
  plan.roomLots.forEach((lot) => {
    const item = el('li')
    item.append(
      el('strong', '', lot.name),
      el('span', '', `${lot.view} · ${lot.sizeM2 ? `${lot.sizeM2} m² · ` : ''}${lot.guests} voyageurs · ${lot.beds} lit${lot.beds > 1 ? 's' : ''} · ${lot.basePrice} TND/nuit`),
      el('small', '', `Privé Hôte : ${lot.totalUnits} chambre${lot.totalUnits > 1 ? 's' : ''} · Public : ${lot.photos.length} photo${lot.photos.length > 1 ? 's' : ''}`)
    )
    list.append(item)
  })
  section.append(intro, list, validationNotice(validation))
  target.prepend(section)
  setPrimaryBlocked(!validation.ok, validation.issues[0] || '')
}

function cleanupIfNeeded(current) {
  if (current) return
  document.querySelectorAll(`.${ROOT_CLASS}, .${SUMMARY_CLASS}, .${PHOTO_CLASS}, .${PRICE_CLASS}, .${REVIEW_CLASS}`).forEach((node) => node.remove())
  document.querySelectorAll('.host-onboarding__photo-uploader[hidden], .host-onboarding__photo-slots[hidden]').forEach((node) => { node.hidden = false })
  document.querySelector('.host-onboarding__step--photos')?.classList.remove('is-room-lot-photo-flow')
  setPrimaryBlocked(false)
}

function enhanceRoomLots() {
  const current = context()
  cleanupIfNeeded(current)
  if (!current) return
  const { userId, draft } = current
  renderPropertyPlan(document.querySelector(PROPERTY_SELECTOR), userId, draft)
  renderBasicsSummary(document.querySelector(BASICS_SELECTOR), userId, draft)
  renderPhotoStep(document.querySelector(PHOTOS_SELECTOR), userId, draft)
  renderPriceSummary(document.querySelector(PRICE_SELECTOR), userId, draft)
  renderReview(document.querySelector(REVIEW_SELECTOR), userId, draft)
}

function enforceCurrentScreen(event) {
  const button = event.target?.closest?.('.host-onboarding__primary')
  if (!button) return
  const current = context()
  if (!current) return
  const screen = document.querySelector('.host-onboarding')?.dataset.screen
  if (!['property-type', 'photos', 'review'].includes(screen)) return

  const plan = currentPlan(current.userId, current.draft)
  let reason = ''
  if (screen === 'property-type' || screen === 'review') {
    const validation = validateRoomLotPlan(plan)
    if (!validation.ok) reason = validation.issues[0] || 'Complétez la structure des chambres.'
  }
  if (screen === 'photos') {
    const missing = plan.roomLots.find((lot) => !lot.photos.length)
    if (missing) reason = `Ajoutez au moins une photo pour ${missing.name}.`
  }
  if (!reason) return

  event.preventDefault()
  event.stopImmediatePropagation()
  const section = document.querySelector(screen === 'photos' ? `.${PHOTO_CLASS}` : `.${ROOT_CLASS}, .${REVIEW_CLASS}`)
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const feedback = document.querySelector('.host-onboarding__feedback')
  if (feedback) feedback.textContent = reason
}

document.addEventListener('click', enforceCurrentScreen, true)

let scheduled = 0
function scheduleEnhance() {
  window.cancelAnimationFrame(scheduled)
  scheduled = window.requestAnimationFrame(() => {
    enhanceRoomLots()
    window.setTimeout(enhanceRoomLots, 0)
  })
}

const observer = new MutationObserver(scheduleEnhance)
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-screen', 'data-active', 'aria-checked'],
})

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true })
else scheduleEnhance()
