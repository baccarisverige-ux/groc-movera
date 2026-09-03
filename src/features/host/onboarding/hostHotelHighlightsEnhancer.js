import { storageAdapter } from '../../../services/storage/storageAdapter.js'
import './host-hotel-highlights.css'

const STORE_KEY = 'movera:host-hotel-highlight-badges:v1'
const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const LISTING_ID = 'primary-listing'

const GROUPS = Object.freeze([
  {
    id: 'board',
    title: 'Restauration & formules',
    text: 'Indiquez les formules réellement proposées par votre hôtel.',
    items: [
      { id: 'breakfast', label: 'Petit-déjeuner', detail: 'Petit-déjeuner disponible', icon: 'breakfast', tone: 'amber' },
      { id: 'half-board', label: 'Demi-pension', detail: 'Petit-déjeuner + 1 repas', icon: 'meal', tone: 'orange' },
      { id: 'full-board', label: 'Pension complète', detail: 'Petit-déjeuner + déjeuner + dîner', icon: 'meal', tone: 'terracotta' },
      { id: 'all-inclusive', label: 'All inclusive', detail: 'Formule tout compris', icon: 'inclusive', tone: 'rose' },
      { id: 'restaurant', label: 'Restaurant', detail: 'Restaurant dans l’établissement', icon: 'restaurant', tone: 'gold' },
      { id: 'bar', label: 'Bar', detail: 'Bar ou lounge', icon: 'bar', tone: 'berry' },
      { id: 'room-service', label: 'Room service', detail: 'Service en chambre', icon: 'bell', tone: 'plum' },
    ],
  },
  {
    id: 'setting',
    title: 'Vue & emplacement',
    text: 'Les atouts de situation qui différencient vraiment l’établissement.',
    items: [
      { id: 'sea-view', label: 'Vue mer', icon: 'sea', tone: 'sky' },
      { id: 'beachfront', label: 'Bord de mer', icon: 'beach', tone: 'cyan' },
      { id: 'panoramic', label: 'Vue panoramique', icon: 'panorama', tone: 'blue' },
      { id: 'rooftop', label: 'Rooftop', icon: 'rooftop', tone: 'violet' },
      { id: 'central', label: 'Central', icon: 'pin', tone: 'green' },
      { id: 'airport', label: 'Proche aéroport', icon: 'plane', tone: 'indigo' },
      { id: 'nightlife', label: 'Vie nocturne', icon: 'moon', tone: 'purple' },
      { id: 'historic', label: 'Quartier historique', icon: 'landmark', tone: 'sand' },
    ],
  },
  {
    id: 'experience',
    title: 'Style & expérience',
    text: 'L’ambiance et le positionnement de votre hôtel.',
    items: [
      { id: 'luxury', label: 'Luxe', icon: 'diamond', tone: 'gold' },
      { id: 'stylish', label: 'Élégant', icon: 'sparkles', tone: 'rose' },
      { id: 'design', label: 'Design', icon: 'design', tone: 'coral' },
      { id: 'unique', label: 'Unique', icon: 'star', tone: 'violet' },
      { id: 'romantic', label: 'Romantique', icon: 'heart', tone: 'pink' },
      { id: 'peaceful', label: 'Calme', icon: 'leaf', tone: 'sage' },
      { id: 'spacious', label: 'Spacieux', icon: 'expand', tone: 'teal' },
      { id: 'eco', label: 'Éco-responsable', icon: 'eco', tone: 'green' },
    ],
  },
  {
    id: 'wellness',
    title: 'Bien-être & loisirs',
    text: 'Les expériences qui peuvent devenir un motif de réservation.',
    items: [
      { id: 'spa', label: 'Spa', icon: 'spa', tone: 'lavender' },
      { id: 'wellness', label: 'Bien-être', icon: 'wellness', tone: 'mint' },
      { id: 'pool-highlight', label: 'Piscine', icon: 'pool', tone: 'cyan' },
      { id: 'fitness', label: 'Fitness', icon: 'fitness', tone: 'lime' },
      { id: 'hammam', label: 'Hammam', icon: 'steam', tone: 'aqua' },
      { id: 'private-beach', label: 'Plage privée', icon: 'umbrella', tone: 'sky' },
    ],
  },
  {
    id: 'audience',
    title: 'Clientèle & séjour',
    text: 'À qui l’établissement convient particulièrement.',
    items: [
      { id: 'family', label: 'Familial', icon: 'family', tone: 'green' },
      { id: 'adults-only', label: 'Adults only', icon: 'adult', tone: 'charcoal' },
      { id: 'business', label: 'Business', icon: 'briefcase', tone: 'navy' },
      { id: 'couples', label: 'Idéal couples', icon: 'heart', tone: 'pink' },
      { id: 'long-stay', label: 'Long séjour', icon: 'calendar', tone: 'olive' },
      { id: 'accessible', label: 'Accessible PMR', icon: 'access', tone: 'blue' },
    ],
  },
])

const ITEMS = GROUPS.flatMap((group) => group.items)
const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]))

const ICONS = Object.freeze({
  breakfast: '<path d="M5 15h14M7 15V9h10v6M9 9V6h6v3M8 19h8"/>',
  meal: '<circle cx="12" cy="12" r="5"/><path d="M4 4v7M6 4v7M4 8h2M19 4v16M17 4c0 4 2 5 2 5"/>',
  inclusive: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>',
  restaurant: '<path d="M5 4v7M7 4v7M5 8h2M18 4v16M16 4c0 4 2 5 2 5M10 19h4"/>',
  bar: '<path d="M5 5h14l-5 6v7M10 20h8M8 5l4 6"/>',
  bell: '<path d="M5 16h14M7 16a5 5 0 0 1 10 0M12 8V6M10 6h4"/>',
  sea: '<path d="M3 15c2 0 2 1 4 1s2-1 4-1 2 1 4 1 2-1 4-1 2 1 4 1M5 11l4-4 3 3 2-2 5 5"/>',
  beach: '<path d="M4 16c2 0 2 1 4 1s2-1 4-1 2 1 4 1 2-1 4-1M12 5v7M7 9c1-3 3-4 5-4s4 1 5 4Z"/>',
  panorama: '<path d="M3 16l5-6 4 4 3-3 6 5M4 6h16"/>',
  rooftop: '<path d="M4 19h16M6 19V9h12v10M9 9V6h6v3M8 13h8"/>',
  pin: '<path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
  plane: '<path d="M3 12l18-6-6 6 6 6-18-6 6-1 4-5"/>',
  moon: '<path d="M18 15a7 7 0 0 1-9-9 7.5 7.5 0 1 0 9 9Z"/><path d="M17 5h.01M20 9h.01"/>',
  landmark: '<path d="M4 9h16M6 9v9M10 9v9M14 9v9M18 9v9M3 20h18M12 4l8 4H4Z"/>',
  diamond: '<path d="M4 8l4-4h8l4 4-8 12Z"/><path d="M4 8h16M8 4l4 16 4-16"/>',
  sparkles: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
  design: '<path d="M5 18l7-12 7 12ZM8 14h8M10 10h4"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
  heart: '<path d="M20 5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z"/>',
  leaf: '<path d="M19 4C10 4 5 9 5 16c5 0 10-2 14-12ZM5 20c2-5 5-8 10-11"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5M3 8l6-5M21 8l-6-5M3 16l6 5M21 16l-6 5"/>',
  eco: '<path d="M18 5c-7 0-11 4-11 10 6 0 10-3 11-10ZM6 20c2-5 5-8 10-11"/>',
  spa: '<path d="M12 19c-5-2-7-5-6-9 3 0 5 1 6 4 1-3 3-4 6-4 1 4-1 7-6 9ZM12 14V5"/>',
  wellness: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>',
  pool: '<path d="M3 15c2 0 2 1 4 1s2-1 4-1 2 1 4 1 2-1 4-1 2 1 4 1M3 19c2 0 2 1 4 1s2-1 4-1 2 1 4 1 2-1 4-1 2 1 4 1M8 13V5h4M8 9h4"/>',
  fitness: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  steam: '<path d="M5 16h14v4H5ZM8 12c0-2 2-2 2-4S8 6 8 4M13 12c0-2 2-2 2-4s-2-2-2-4"/>',
  umbrella: '<path d="M4 11c1-4 4-6 8-6s7 2 8 6H4ZM12 5v15M8 20h8"/>',
  family: '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3 19c.4-4 2-6 5-6s4.6 2 5 6M11 19c.4-4 2-6 5-6s4.6 2 5 6"/>',
  adult: '<circle cx="12" cy="7" r="3"/><path d="M5 20c.5-5 2.8-8 7-8s6.5 3 7 8"/>',
  briefcase: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V4h6v3M4 12h16M10 12v2h4v-2"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M8 13h3M13 13h3M8 17h3"/>',
  access: '<circle cx="12" cy="5" r="2"/><path d="M5 9h14M12 7v6M9 20l3-7 3 7M7 13l5 2 5-2"/>',
})

function iconMarkup(item) {
  const content = ICONS[item.icon] || ICONS.star
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`
}

function readJson(key, fallback) {
  return storageAdapter.getJson(key, fallback)
}

function writeJson(key, value) {
  storageAdapter.setJson(key, value)
}

function readSelections() {
  const store = readJson(STORE_KEY, {})
  const value = Array.isArray(store?.[LISTING_ID]) ? store[LISTING_ID] : []
  return [...new Set(value.filter((id) => ITEM_BY_ID.has(id)))]
}

function writeSelections(ids) {
  const store = readJson(STORE_KEY, {})
  store[LISTING_ID] = [...new Set(ids.filter((id) => ITEM_BY_ID.has(id)))]
  writeJson(STORE_KEY, store)
  window.dispatchEvent(new CustomEvent('movera:hotel-highlights-change', { detail: { listingId: LISTING_ID, ids: store[LISTING_ID] } }))
}

function isHotelDraftActive() {
  const drafts = readJson(DRAFT_KEY, {})
  return Object.values(drafts || {}).some((draft) => draft && draft.propertyType === 'Hôtel')
}

function syncReactGate(step, selectedIds) {
  const original = step.querySelector('.host-onboarding__chips')
  if (!original) return
  const buttons = [...original.querySelectorAll('button')]
  const active = buttons.filter((button) => button.getAttribute('aria-pressed') === 'true')
  if (selectedIds.length && active.length === 0) buttons[0]?.click()
  if (!selectedIds.length && active.length) active.forEach((button) => button.click())
}

function buildSelector(step) {
  const root = document.createElement('div')
  root.className = 'host-hotel-highlights'
  root.dataset.listingId = LISTING_ID

  const intro = document.createElement('div')
  intro.className = 'host-hotel-highlights__summary'
  intro.innerHTML = '<strong>Affichage sur votre offre</strong><span>Vous pouvez sélectionner plusieurs points forts. Tous les éléments cochés seront visibles comme badges sur votre offre.</span><b data-hotel-highlight-count>0 sélectionné</b>'
  root.appendChild(intro)

  for (const group of GROUPS) {
    const section = document.createElement('section')
    section.className = 'host-hotel-highlights__group'
    section.dataset.group = group.id
    const head = document.createElement('div')
    head.className = 'host-hotel-highlights__group-head'
    head.innerHTML = `<h2>${group.title}</h2><p>${group.text}</p>`
    section.appendChild(head)
    const grid = document.createElement('div')
    grid.className = 'host-hotel-highlights__grid'

    for (const item of group.items) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'host-hotel-highlight'
      button.dataset.highlightId = item.id
      button.dataset.tone = item.tone
      button.setAttribute('aria-pressed', 'false')
      button.innerHTML = `<span class="host-hotel-highlight__icon">${iconMarkup(item)}</span><span class="host-hotel-highlight__copy"><strong>${item.label}</strong>${item.detail ? `<small>${item.detail}</small>` : ''}</span><span class="host-hotel-highlight__check">✓</span>`
      button.addEventListener('click', () => {
        const current = readSelections()
        const next = current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
        writeSelections(next)
        refreshSelector(root, next)
        syncReactGate(step, next)
      })
      grid.appendChild(button)
    }

    section.appendChild(grid)
    root.appendChild(section)
  }

  return root
}

function refreshSelector(root, selectedIds = readSelections()) {
  const selected = new Set(selectedIds)
  root.querySelectorAll('[data-highlight-id]').forEach((button) => {
    const active = selected.has(button.dataset.highlightId)
    button.dataset.active = active ? 'true' : 'false'
    button.setAttribute('aria-pressed', active ? 'true' : 'false')
  })
  const count = root.querySelector('[data-hotel-highlight-count]')
  if (count) count.textContent = `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}`
}

function enhanceHotelHighlightsPage() {
  const page = document.querySelector('.host-onboarding[data-screen="highlights"]')
  if (!page || !isHotelDraftActive()) return
  const step = page.querySelector('.host-onboarding__step')
  if (!step) return
  step.dataset.hotelHighlights = 'true'
  const title = step.querySelector('h1')
  const description = step.querySelector(':scope > p')
  if (title && title.textContent !== 'Les points forts de votre hôtel') title.textContent = 'Les points forts de votre hôtel'
  if (description && description.textContent !== 'Cochez tout ce qui décrit réellement votre établissement. Tous vos choix seront visibles sur l’offre.') description.textContent = 'Cochez tout ce qui décrit réellement votre établissement. Tous vos choix seront visibles sur l’offre.'
  let root = step.querySelector('.host-hotel-highlights')
  if (!root) {
    root = buildSelector(step)
    const original = step.querySelector('.host-onboarding__chips')
    if (original) original.before(root)
    else step.appendChild(root)
  }
  const selected = readSelections()
  refreshSelector(root, selected)
  syncReactGate(step, selected)
}

function toneFor(id) {
  return ITEM_BY_ID.get(id)?.tone || 'sage'
}

function labelFor(id) {
  return ITEM_BY_ID.get(id)?.label || id
}

function syncHomeOfferBadges() {
  const ids = readSelections()
  const cards = document.querySelectorAll('.b225-offer-card[data-origin="host"]')
  cards.forEach((card) => {
    const testId = card.getAttribute('data-testid') || ''
    if (!testId.endsWith(`-${LISTING_ID}`)) return
    card.dataset.hasHotelBadges = ids.length ? 'true' : 'false'
    let row = card.querySelector('.b225-offer-card__host-highlights')
    if (!ids.length) { row?.remove(); return }
    if (!row) {
      row = document.createElement('div')
      row.className = 'b225-offer-card__host-highlights'
      const title = card.querySelector('.b225-offer-card__title')
      if (title) title.after(row)
      else card.querySelector('.b225-offer-card__body')?.prepend(row)
    }
    const signature = ids.join('|')
    if (row.dataset.signature === signature) return
    row.dataset.signature = signature
    row.innerHTML = ids.map((id) => `<span data-tone="${toneFor(id)}">${labelFor(id)}</span>`).join('')
  })
}

function syncListingDetailBadges() {
  const ids = readSelections()
  const page = document.querySelector(`.listing-detail-page[data-origin="host"][data-listing-id="${LISTING_ID}"]`)
  if (!page) return
  const intro = page.querySelector('.listing-detail-intro')
  if (!intro) return
  let row = intro.querySelector('.listing-detail-host-badges')
  if (!ids.length) { row?.remove(); return }
  if (!row) {
    row = document.createElement('div')
    row.className = 'listing-detail-host-badges'
    const kicker = intro.querySelector('.listing-detail-kicker')
    if (kicker) kicker.after(row)
    else intro.prepend(row)
  }
  const signature = ids.join('|')
  if (row.dataset.signature === signature) return
  row.dataset.signature = signature
  row.innerHTML = ids.map((id) => `<span data-tone="${toneFor(id)}">${labelFor(id)}</span>`).join('')
  const existing = intro.querySelector('.listing-detail-kicker b')
  if (existing) existing.style.display = 'none'
}

let scheduled = false
function syncAll() {
  scheduled = false
  enhanceHotelHighlightsPage()
  syncHomeOfferBadges()
  syncListingDetailBadges()
}

function scheduleSync() {
  if (scheduled) return
  scheduled = true
  window.requestAnimationFrame(syncAll)
}

if (typeof window !== 'undefined') {
  const observer = new MutationObserver(scheduleSync)
  const start = () => {
    if (!document.body) return
    observer.observe(document.body, { childList: true, subtree: true })
    scheduleSync()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
  window.addEventListener('movera:hotel-highlights-change', scheduleSync)
  window.addEventListener('movera:host-profile-change', scheduleSync)
  window.addEventListener('storage', scheduleSync)
  window.addEventListener('focus', scheduleSync)
}
