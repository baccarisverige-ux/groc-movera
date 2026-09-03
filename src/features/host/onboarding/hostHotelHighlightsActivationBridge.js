import { storageAdapter } from '../../../services/storage/storageAdapter.js'

const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const ROOM_DRAFT_KEY = 'movera:host-room-type-drafts:v1'
const BADGE_KEY = 'movera:host-hotel-highlight-badges:v1'
const HIGHLIGHT_EVENT = 'movera:hotel-highlights-change'
const LISTING_ID = 'primary-listing'

const FALLBACK_GROUPS = Object.freeze([
  {
    id: 'board',
    title: 'Restauration & formules',
    text: 'Indiquez les formules réellement proposées par votre hôtel.',
    items: [
      ['breakfast', 'Petit-déjeuner', 'Petit-déjeuner disponible', 'amber', '☕'],
      ['half-board', 'Demi-pension', 'Petit-déjeuner + 1 repas', 'orange', '◐'],
      ['full-board', 'Pension complète', 'Petit-déjeuner + déjeuner + dîner', 'terracotta', '●'],
      ['all-inclusive', 'All inclusive', 'Formule tout compris', 'rose', '✦'],
      ['restaurant', 'Restaurant', 'Restaurant dans l’établissement', 'gold', '◇'],
      ['bar', 'Bar', 'Bar ou lounge', 'berry', '▽'],
      ['room-service', 'Room service', 'Service en chambre', 'plum', '⌁'],
    ],
  },
  {
    id: 'setting',
    title: 'Vue & emplacement',
    text: 'Les atouts de situation qui différencient l’établissement.',
    items: [
      ['sea-view', 'Vue mer', '', 'sky', '≈'],
      ['beachfront', 'Bord de mer', '', 'cyan', '≋'],
      ['panoramic', 'Vue panoramique', '', 'blue', '⌁'],
      ['rooftop', 'Rooftop', '', 'violet', '⌂'],
      ['central', 'Central', '', 'green', '⌖'],
      ['airport', 'Proche aéroport', '', 'indigo', '✈'],
      ['nightlife', 'Vie nocturne', '', 'purple', '☾'],
      ['historic', 'Quartier historique', '', 'sand', '▥'],
    ],
  },
  {
    id: 'experience',
    title: 'Style & expérience',
    text: 'L’ambiance et le positionnement de votre hôtel.',
    items: [
      ['luxury', 'Luxe', '', 'gold', '◇'],
      ['stylish', 'Élégant', '', 'rose', '✦'],
      ['design', 'Design', '', 'coral', '△'],
      ['unique', 'Unique', '', 'violet', '★'],
      ['romantic', 'Romantique', '', 'pink', '♡'],
      ['peaceful', 'Calme', '', 'sage', '⌁'],
      ['spacious', 'Spacieux', '', 'teal', '↔'],
      ['eco', 'Éco-responsable', '', 'green', '♧'],
    ],
  },
  {
    id: 'wellness',
    title: 'Bien-être & loisirs',
    text: 'Les expériences qui peuvent devenir un motif de réservation.',
    items: [
      ['spa', 'Spa', '', 'lavender', '✿'],
      ['wellness', 'Bien-être', '', 'mint', '◎'],
      ['pool-highlight', 'Piscine', '', 'cyan', '≈'],
      ['fitness', 'Fitness', '', 'lime', '↔'],
      ['hammam', 'Hammam', '', 'aqua', '≋'],
      ['private-beach', 'Plage privée', '', 'sky', '⌁'],
    ],
  },
  {
    id: 'audience',
    title: 'Clientèle & séjour',
    text: 'À qui l’établissement convient particulièrement.',
    items: [
      ['family', 'Familial', '', 'green', '♧'],
      ['adults-only', 'Adults only', '', 'charcoal', '○'],
      ['business', 'Business', '', 'navy', '▣'],
      ['couples', 'Idéal couples', '', 'pink', '♡'],
      ['long-stay', 'Long séjour', '', 'olive', '▦'],
      ['accessible', 'Accessible PMR', '', 'blue', '◎'],
    ],
  },
])

const VALID_IDS = new Set(FALLBACK_GROUPS.flatMap((group) => group.items.map((item) => item[0])))

function foldType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .trim()
}

function readObject(key) {
  const value = storageAdapter.getJson(key, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function hasProfessionalRoomDraft(userId) {
  const roomDrafts = readObject(ROOM_DRAFT_KEY)
  const roomDraft = userId ? roomDrafts[userId] : null
  if (!roomDraft || typeof roomDraft !== 'object') return false
  const roomTypes = Array.isArray(roomDraft.roomTypes) ? roomDraft.roomTypes : []
  return roomDraft.mode === 'categories' || Number(roomDraft.totalRooms) > 1 || roomTypes.length > 1
}

function isHotelLike(value) {
  const type = foldType(value)
  if (type.includes("maison d'hote")) return false
  return type === 'hotel' || type === 'hostel' || type.includes('hotel') || type.includes('hostel')
}

function canonicalizeHotelDrafts() {
  const drafts = readObject(DRAFT_KEY)
  let changed = false
  let hotelFound = false

  for (const [userId, draft] of Object.entries(drafts)) {
    if (!draft || typeof draft !== 'object') continue
    const type = foldType(draft.propertyType)

    if (isHotelLike(type)) {
      hotelFound = true
      if (draft.propertyType !== 'Hôtel') {
        drafts[userId] = { ...draft, propertyType: 'Hôtel' }
        changed = true
      }
      continue
    }

    if (!type && hasProfessionalRoomDraft(userId)) {
      drafts[userId] = { ...draft, propertyType: 'Hôtel' }
      hotelFound = true
      changed = true
    }
  }

  if (changed) storageAdapter.setJson(DRAFT_KEY, drafts)
  return hotelFound
}

function readSelections() {
  const store = readObject(BADGE_KEY)
  const ids = Array.isArray(store[LISTING_ID]) ? store[LISTING_ID] : []
  return [...new Set(ids.filter((id) => VALID_IDS.has(id)))]
}

function writeSelections(ids) {
  const store = readObject(BADGE_KEY)
  store[LISTING_ID] = [...new Set(ids.filter((id) => VALID_IDS.has(id)))]
  storageAdapter.setJson(BADGE_KEY, store)
  window.dispatchEvent(new CustomEvent(HIGHLIGHT_EVENT, { detail: { listingId: LISTING_ID, ids: store[LISTING_ID] } }))
}

function syncReactGate(step, selectedIds) {
  const original = step.querySelector('.host-onboarding__chips')
  if (!original) return
  const buttons = [...original.querySelectorAll('button')]
  const active = buttons.filter((button) => button.getAttribute('aria-pressed') === 'true')
  if (selectedIds.length && active.length === 0) buttons[0]?.click()
  if (!selectedIds.length && active.length) active.forEach((button) => button.click())
}

function refreshFallback(root, selectedIds = readSelections()) {
  const selected = new Set(selectedIds)
  root.querySelectorAll('[data-highlight-id]').forEach((button) => {
    const active = selected.has(button.dataset.highlightId)
    button.dataset.active = active ? 'true' : 'false'
    button.setAttribute('aria-pressed', active ? 'true' : 'false')
  })
  const count = root.querySelector('[data-hotel-highlight-count]')
  if (count) count.textContent = `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}`
}

function createFallback(step) {
  const root = document.createElement('div')
  root.className = 'host-hotel-highlights'
  root.dataset.listingId = LISTING_ID
  root.dataset.activationFallback = 'true'

  const summary = document.createElement('div')
  summary.className = 'host-hotel-highlights__summary'
  summary.innerHTML = '<strong>Affichage sur votre offre</strong><span>Vous pouvez sélectionner plusieurs points forts. Tous les éléments cochés seront visibles comme badges sur votre offre.</span><b data-hotel-highlight-count>0 sélectionné</b>'
  root.appendChild(summary)

  for (const group of FALLBACK_GROUPS) {
    const section = document.createElement('section')
    section.className = 'host-hotel-highlights__group'
    section.dataset.group = group.id

    const head = document.createElement('div')
    head.className = 'host-hotel-highlights__group-head'
    const heading = document.createElement('h2')
    heading.textContent = group.title
    const text = document.createElement('p')
    text.textContent = group.text
    head.append(heading, text)

    const grid = document.createElement('div')
    grid.className = 'host-hotel-highlights__grid'
    for (const [id, label, detail, tone, glyph] of group.items) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'host-hotel-highlight'
      button.dataset.highlightId = id
      button.dataset.tone = tone
      button.setAttribute('aria-pressed', 'false')

      const icon = document.createElement('span')
      icon.className = 'host-hotel-highlight__icon'
      icon.textContent = glyph
      const copy = document.createElement('span')
      copy.className = 'host-hotel-highlight__copy'
      const strong = document.createElement('strong')
      strong.textContent = label
      copy.appendChild(strong)
      if (detail) {
        const small = document.createElement('small')
        small.textContent = detail
        copy.appendChild(small)
      }
      const check = document.createElement('span')
      check.className = 'host-hotel-highlight__check'
      check.textContent = '✓'
      button.append(icon, copy, check)

      button.addEventListener('click', () => {
        const current = readSelections()
        const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
        writeSelections(next)
        refreshFallback(root, next)
        syncReactGate(step, next)
      })
      grid.appendChild(button)
    }

    section.append(head, grid)
    root.appendChild(section)
  }

  return root
}

function ensureSafariFallback(page) {
  if (page.querySelector('.host-hotel-highlights')) return
  const step = page.querySelector('.host-onboarding__step')
  if (!step) return

  step.dataset.hotelHighlights = 'true'
  const title = step.querySelector('h1')
  const description = step.querySelector(':scope > p')
  if (title) title.textContent = 'Les points forts de votre hôtel'
  if (description) description.textContent = 'Cochez tout ce qui décrit réellement votre établissement. Tous vos choix seront visibles sur l’offre.'

  const root = createFallback(step)
  const original = step.querySelector('.host-onboarding__chips')
  if (original) original.before(root)
  else step.appendChild(root)
  const selected = readSelections()
  refreshFallback(root, selected)
  syncReactGate(step, selected)
}

let scheduled = false
function verifyHighlightsActivation() {
  scheduled = false
  const page = document.querySelector('.host-onboarding[data-screen="highlights"]')
  if (!page) return

  const hotelContext = canonicalizeHotelDrafts()
  if (!hotelContext) return

  if (!page.querySelector('.host-hotel-highlights')) {
    window.dispatchEvent(new CustomEvent(HIGHLIGHT_EVENT, { detail: { reason: 'activation-bridge' } }))
    window.requestAnimationFrame(() => {
      if (!page.querySelector('.host-hotel-highlights')) {
        window.dispatchEvent(new CustomEvent(HIGHLIGHT_EVENT, { detail: { reason: 'activation-retry' } }))
        window.setTimeout(() => ensureSafariFallback(page), 40)
      }
    })
  }
}

function scheduleVerification() {
  if (scheduled) return
  scheduled = true
  window.requestAnimationFrame(verifyHighlightsActivation)
}

if (typeof window !== 'undefined') {
  const start = () => {
    if (!document.body) return
    const observer = new MutationObserver(scheduleVerification)
    observer.observe(document.body, { childList: true, subtree: true })
    scheduleVerification()
    window.addEventListener('pageshow', scheduleVerification)
    window.addEventListener('popstate', scheduleVerification)
    window.addEventListener('focus', scheduleVerification)
    document.addEventListener('visibilitychange', scheduleVerification)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}
