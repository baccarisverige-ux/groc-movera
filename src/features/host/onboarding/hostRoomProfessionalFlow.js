import { usesPooledRoomInventory } from '../../../entities/host/hostProfileStore.js'
import {
  HOST_ROOM_SETUP_MODES,
  readHostRoomConfigurationDraft,
  writeHostRoomConfigurationDraft,
} from '../../../entities/host/hostRoomTypeDraftStore.js'
import { readAuthSession } from '../../auth/authSession.js'
import { readHostOnboardingDraft } from './hostOnboardingDraftStore.js'
import { getOfferFlow } from './offer-flows/offerFlowRegistry.js'
import {
  migrateLegacyHostPhoto,
  removeHostPhoto,
  resolveHostPhotoUrl,
  saveHostPhotoFile,
} from './hostPhotoMediaStore.js'
import './host-room-professional-flow.css'

const BASIC = '.host-onboarding[data-screen="basics"]'
const PHOTOS = '.host-onboarding[data-screen="photos"]'
const DEFAULT_MAX_PHOTOS = 8
let observer
let frame = 0
let busy = false
const openCategory = new Map()
const photoTab = new Map()

function context() {
  const session = readAuthSession()
  if (!session?.userId) return null
  const draft = readHostOnboardingDraft(session.userId)
  if (!usesPooledRoomInventory(draft.propertyType, draft.guestAccess)) return null
  return {
    userId: session.userId,
    draft,
    fallback: { guests: draft.guests, beds: draft.beds, bathrooms: draft.bathrooms, basePrice: draft.basePrice },
  }
}

function el(tag, cls = '', text = '') {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (text) node.textContent = text
  return node
}

function btn(text, cls, handler) {
  const node = el('button', cls, text)
  node.type = 'button'
  node.addEventListener('click', handler)
  return node
}

function read(ctx) { return readHostRoomConfigurationDraft(ctx.userId, ctx.fallback) }
function write(ctx, value) { return writeHostRoomConfigurationDraft(ctx.userId, value, ctx.fallback) }
function units(room) { return Math.max(1, Math.round(Number(room?.totalUnits) || 1)) }
function price(room) { return Math.max(1, Math.round(Number(room?.basePrice) || 1)) }

function roomCategoryPhotoRules(ctx, configuration) {
  const policy = getOfferFlow(ctx?.draft?.propertyType).photoPolicy
  const enforced = configuration?.mode === HOST_ROOM_SETUP_MODES.CATEGORIES && policy?.scope === 'room-category'
  return enforced
    ? { enforced: true, min: Math.max(0, Number(policy.min) || 0), max: Math.max(1, Number(policy.max) || DEFAULT_MAX_PHOTOS) }
    : { enforced: false, min: 0, max: DEFAULT_MAX_PHOTOS }
}

function roomCategoryPhotosValid(ctx, configuration) {
  const rules = roomCategoryPhotoRules(ctx, configuration)
  if (!rules.enforced) return true
  const rooms = Array.isArray(configuration?.roomTypes) ? configuration.roomTypes : []
  return rooms.length > 0 && rooms.every((room) => {
    const count = Array.isArray(room?.photos) ? room.photos.length : 0
    return count >= rules.min && count <= rules.max
  })
}

function syncPhotoContinueButton(page, ctx, configuration) {
  const button = page?.querySelector('.host-onboarding__primary')
  if (!button) return
  const rules = roomCategoryPhotoRules(ctx, configuration)
  if (!rules.enforced) {
    delete button.dataset.roomPhotosValid
    return
  }
  const valid = roomCategoryPhotosValid(ctx, configuration)
  button.dataset.roomPhotosValid = valid ? 'true' : 'false'
  button.disabled = !valid
}

function allocation(configuration) {
  const assigned = configuration.roomTypes.reduce((sum, room) => sum + units(room), 0)
  const remaining = configuration.totalRooms - assigned
  const box = el('div', 'host-room-pro-allocation')
  box.dataset.valid = remaining === 0 ? 'true' : 'false'
  const line = el('div')
  line.append(
    el('strong', '', `${assigned}/${configuration.totalRooms} chambres attribuées`),
    el('span', '', remaining === 0 ? 'Complet' : remaining > 0 ? `${remaining} à répartir` : `${Math.abs(remaining)} en trop`),
  )
  const track = el('div', 'host-room-pro-allocation__track')
  const fill = el('i')
  fill.style.width = `${Math.min(100, Math.max(0, assigned / Math.max(1, configuration.totalRooms) * 100))}%`
  track.append(fill)
  box.append(line, track)
  return box
}

function enhanceBasics(ctx) {
  const page = document.querySelector(BASIC)
  const setup = page?.querySelector('.host-room-setup')
  if (!setup) return
  const configuration = read(ctx)
  setup.dataset.professional = 'true'
  setup.querySelector('.host-room-allocation-overview')?.remove()
  setup.querySelector('.host-room-pro-allocation')?.remove()

  if (configuration.mode !== HOST_ROOM_SETUP_MODES.CATEGORIES) {
    setup.querySelectorAll('.host-onboarding-room-types__card').forEach((card) => card.removeAttribute('data-pro-collapsed'))
    return
  }

  const list = setup.querySelector('.host-onboarding-room-types__list')
  if (list) list.insertAdjacentElement('beforebegin', allocation(configuration))
  const active = openCategory.get(ctx.userId) || ''

  setup.querySelectorAll('.host-onboarding-room-types__card').forEach((card, index) => {
    const room = configuration.roomTypes[index]
    if (!room) return
    card.dataset.proCollapsed = active === room.id ? 'false' : 'true'
    card.querySelector('.host-room-pro-summary')?.remove()
    card.querySelector('.host-room-pro-edit')?.remove()

    const head = card.querySelector('.host-onboarding-room-types__card-head')
    const title = head?.querySelector('div')
    if (title) {
      const summary = el('span', 'host-room-pro-summary', [
        `${units(room)} chambre${units(room) > 1 ? 's' : ''}`,
        room.view || '',
        `${price(room)} TND / nuit`,
      ].filter(Boolean).join(' · '))
      title.append(summary)
    }
    if (head) {
      const existingDelete = Array.from(head.children).find((child) => child.tagName === 'BUTTON')
      const edit = btn(active === room.id ? 'Fermer' : 'Modifier', 'host-room-pro-edit', () => {
        openCategory.set(ctx.userId, active === room.id ? '' : room.id)
        schedule()
      })
      if (existingDelete) head.insertBefore(edit, existingDelete)
      else head.append(edit)
    }
  })
}

function hydrateImage(image, ref) {
  if (typeof ref !== 'string' || !ref) return
  if (ref.startsWith('data:') || ref.startsWith('blob:')) {
    image.src = ref
    return
  }
  resolveHostPhotoUrl(ref).then((url) => {
    if (url && image.isConnected) image.src = url
  }).catch(() => {})
}

async function migrateLegacyPhotos(ctx, configuration) {
  let changed = false
  const roomTypes = await Promise.all((configuration.roomTypes || []).map(async (room) => {
    const refs = Array.isArray(room.photos) ? room.photos : []
    const photos = await Promise.all(refs.map(async (ref) => {
      if (typeof ref !== 'string' || !ref.startsWith('data:')) return ref
      changed = true
      return migrateLegacyHostPhoto(ref, { userId: ctx.userId, roomId: room.id })
    }))
    return { ...room, photos }
  }))
  if (!changed) return configuration
  return write(ctx, { ...configuration, roomTypes })
}

function gallery(ctx, configuration, room, roomIndex) {
  const section = el('section', 'host-room-pro-gallery')
  const rules = roomCategoryPhotoRules(ctx, configuration)
  const head = el('header')
  head.append(
    el('strong', '', configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES ? room.name : 'Votre chambre'),
    el('span', '', configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES
      ? `${units(room)} chambre${units(room) > 1 ? 's' : ''} identique${units(room) > 1 ? 's' : ''} dans cette catégorie`
      : configuration.mode === HOST_ROOM_SETUP_MODES.IDENTICAL
        ? `${configuration.totalRooms} chambres identiques · une seule galerie`
        : '1 chambre · une seule galerie'),
  )
  section.append(head)
  const photos = Array.isArray(room.photos) ? room.photos : []

  if (rules.enforced) {
    const missing = Math.max(0, rules.min - photos.length)
    const requirement = el('div', 'host-room-pro-gallery__requirement')
    requirement.dataset.valid = missing === 0 ? 'true' : 'false'
    requirement.append(
      el('strong', '', `Minimum ${rules.min} photos · maximum ${rules.max}`),
      el('span', '', missing === 0 ? `${photos.length}/${rules.max} · catégorie complète` : `${missing} photo${missing > 1 ? 's' : ''} à ajouter · ${photos.length}/${rules.max}`),
    )
    section.append(requirement)
  }

  if (photos.length) {
    const hero = el('div', 'host-room-pro-gallery__hero')
    const image = document.createElement('img')
    image.alt = `${room.name || 'Chambre'} — photo principale`
    hydrateImage(image, photos[0])
    hero.append(image, el('span', '', 'Photo principale'))
    section.append(hero)

    const thumbs = el('div', 'host-room-pro-gallery__thumbs')
    photos.forEach((ref, index) => {
      const figure = el('figure')
      const thumb = document.createElement('img')
      thumb.alt = `${room.name || 'Chambre'} — photo ${index + 1}`
      hydrateImage(thumb, ref)
      const remove = btn('×', '', async () => {
        const next = read(ctx)
        const currentPhotos = Array.isArray(next.roomTypes?.[roomIndex]?.photos) ? next.roomTypes[roomIndex].photos : []
        const removedRef = currentPhotos[index]
        next.roomTypes[roomIndex].photos = currentPhotos.filter((_, photoIndex) => photoIndex !== index)
        write(ctx, next)
        await removeHostPhoto(removedRef)
        schedule()
      })
      remove.setAttribute('aria-label', `Supprimer la photo ${index + 1}`)
      figure.append(thumb, remove)
      thumbs.append(figure)
    })
    section.append(thumbs)
  } else {
    const empty = el('div', 'host-room-pro-gallery__empty')
    empty.append(el('strong', '', 'Ajoutez une première photo'), el('span', '', 'Montrez la chambre, sa vue et les éléments qui la différencient.'))
    section.append(empty)
  }

  const upload = el('label', 'host-room-pro-gallery__upload')
  upload.append(el('strong', '', photos.length ? 'Ajouter d’autres photos' : 'Ajouter des photos'), el('span', '', `${photos.length}/${rules.max}`))
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.disabled = photos.length >= rules.max
  input.dataset.minPhotos = String(rules.min)
  input.dataset.maxPhotos = String(rules.max)
  input.addEventListener('change', async () => {
    const selectedFiles = Array.from(input.files || [])
    if (!selectedFiles.length) return
    input.disabled = true
    try {
      let next = await migrateLegacyPhotos(ctx, read(ctx))
      const target = next.roomTypes?.[roomIndex]
      if (!target) return
      const existing = Array.isArray(target.photos) ? target.photos : []
      const files = selectedFiles.slice(0, Math.max(0, rules.max - existing.length))
      if (!files.length) return
      const refs = await Promise.all(files.map((file) => saveHostPhotoFile(file, {
        userId: ctx.userId,
        roomId: target.id,
      })))
      next = read(ctx)
      const currentTarget = next.roomTypes?.[roomIndex]
      if (!currentTarget) return
      const current = Array.isArray(currentTarget.photos) ? currentTarget.photos : []
      currentTarget.photos = [...current, ...refs].slice(0, rules.max)
      write(ctx, next)
      input.value = ''
      schedule()
    } catch {
      input.value = ''
      input.disabled = false
    }
  })
  upload.append(input)
  section.append(upload)
  return section
}

function enhancePhotos(ctx) {
  const page = document.querySelector(PHOTOS)
  const step = page?.querySelector('.host-onboarding__step--photos')
  if (!step) return
  const configuration = read(ctx)
  if (configuration.mode === HOST_ROOM_SETUP_MODES.MULTIPLE_UNSET) return
  const rules = roomCategoryPhotoRules(ctx, configuration)
  step.dataset.roomProfessionalPhotos = 'true'
  let flow = step.querySelector('.host-room-pro-photos')
  if (!flow) { flow = el('section', 'host-room-pro-photos'); step.append(flow) }
  flow.replaceChildren()

  const head = el('header', 'host-room-pro-photos__header')
  head.append(
    el('span', '', 'Photos'),
    el('h1', '', configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES ? 'Photos de vos catégories' : 'Photos de votre chambre'),
    el('p', '', configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES
      ? rules.enforced
        ? `Ajoutez entre ${rules.min} et ${rules.max} photos pour chaque catégorie. Toutes les catégories doivent atteindre le minimum avant de continuer.`
        : 'Chaque catégorie possède sa propre galerie. Sélectionnez une catégorie pour gérer uniquement ses photos.'
      : 'Ces photos représentent la chambre proposée. Le nombre de chambres reste géré séparément par le système.'),
  )
  flow.append(head)

  let index = 0
  if (configuration.mode === HOST_ROOM_SETUP_MODES.CATEGORIES) {
    const selected = photoTab.get(ctx.userId)
    index = Math.max(0, configuration.roomTypes.findIndex((room) => room.id === selected))
    const room = configuration.roomTypes[index] || configuration.roomTypes[0]
    photoTab.set(ctx.userId, room?.id || '')
    const tabs = el('div', 'host-room-pro-photos__tabs')
    configuration.roomTypes.forEach((item) => {
      const tab = btn('', '', () => { photoTab.set(ctx.userId, item.id); schedule() })
      tab.dataset.active = item.id === room?.id ? 'true' : 'false'
      const count = item.photos?.length || 0
      tab.dataset.photosValid = !rules.enforced || count >= rules.min ? 'true' : 'false'
      tab.append(
        el('strong', '', item.name),
        el('small', '', rules.enforced ? `${count}/${rules.max} photos · min. ${rules.min}` : `${count} photo${count === 1 ? '' : 's'}`),
      )
      tabs.append(tab)
    })
    flow.append(tabs)
  } else {
    const badge = el('div', 'host-room-pro-photos__mode')
    badge.append(
      el('strong', '', configuration.mode === HOST_ROOM_SETUP_MODES.IDENTICAL ? `${configuration.totalRooms} chambres identiques` : '1 chambre'),
      el('span', '', configuration.mode === HOST_ROOM_SETUP_MODES.IDENTICAL ? 'Même présentation pour toutes les chambres.' : 'Parcours classique.'),
    )
    flow.append(badge)
  }
  const room = configuration.roomTypes[index] || configuration.roomTypes[0]
  if (room) flow.append(gallery(ctx, configuration, room, index))
  syncPhotoContinueButton(page, ctx, configuration)
}

function cleanup() {
  document.querySelectorAll('.host-room-pro-allocation,.host-room-pro-photos').forEach((node) => node.remove())
  document.querySelectorAll('[data-room-professional-photos]').forEach((node) => delete node.dataset.roomProfessionalPhotos)
  document.querySelectorAll('.host-room-setup[data-professional]').forEach((node) => delete node.dataset.professional)
}

function render() {
  if (busy) return
  busy = true
  observer?.disconnect()
  try {
    const ctx = context()
    if (!ctx) cleanup()
    else { enhanceBasics(ctx); enhancePhotos(ctx) }
  } finally {
    observer?.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-screen'] })
    busy = false
  }
}
function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(render) }
observer = new MutationObserver(schedule)
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-screen'] })
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
else schedule()
