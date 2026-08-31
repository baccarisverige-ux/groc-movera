import { reverseGeocode, searchAddress } from '../../../services/geocoding/index.js'

const PAGE_SELECTOR = '.host-onboarding[data-screen="address"]'
const PANEL_CLASS = 'host-address-smart-panel'
const CURRENT_CLASS = 'host-address-location-action'
const STATUS_CLASS = 'host-address-location-status'
const LIST_CLASS = 'host-address-suggestion-list'
const SEARCH_DELAY_MS = 320
const HOST_MAP_LOCATION_EVENT = 'movera:host-map-address-change'

function svgIcon(path) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  element.setAttribute('d', path)
  svg.append(element)
  return svg
}

function locationIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '12')
  circle.setAttribute('cy', '12')
  circle.setAttribute('r', '3')
  const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  outer.setAttribute('cx', '12')
  outer.setAttribute('cy', '12')
  outer.setAttribute('r', '8')
  const axes = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  axes.setAttribute('d', 'M12 2v3M12 19v3M2 12h3M19 12h3')
  svg.append(circle, outer, axes)
  return svg
}

function setStatus(status, message, state = '') {
  status.textContent = message
  status.dataset.state = state
}

function setControlledInput(input, value) {
  if (!input) return
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function suggestionCity(result, fallback = '') {
  const location = result?.location || {}
  return String(location.city || location.district || fallback || '').trim()
}

function publishDetectedLocation(result, address, city) {
  const lat = Number(result?.viewport?.lat)
  const lng = Number(result?.viewport?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  window.dispatchEvent(new CustomEvent(HOST_MAP_LOCATION_EVENT, {
    detail: { lat, lng, address, city },
  }))
}

function selectDetectedAddress(result, addressInput, cityInput, status) {
  const address = String(result?.label || '').trim()
  const city = suggestionCity(result, cityInput?.value)
  if (!address) return false
  setControlledInput(addressInput, address)
  if (city) setControlledInput(cityInput, city)
  publishDetectedLocation(result, address, city)
  setStatus(status, 'Adresse détectée · la carte se positionnera automatiquement à l’étape suivante.', 'success')
  return true
}

function createCurrentAddressButton(onClick) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = CURRENT_CLASS
  button.dataset.loading = 'false'
  button.append(locationIcon())

  const copy = document.createElement('span')
  const title = document.createElement('strong')
  title.textContent = 'Utiliser mon adresse actuelle'
  const detail = document.createElement('small')
  detail.textContent = 'Autoriser la localisation pour retrouver l’adresse'
  copy.append(title, detail)
  button.append(copy)
  button.addEventListener('click', onClick)
  return button
}

function createSuggestionButton(result, onSelect) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'host-address-suggestion'
  button.append(svgIcon('M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z'))

  const copy = document.createElement('span')
  const title = document.createElement('strong')
  title.textContent = String(result?.label || 'Adresse')
  const detail = document.createElement('small')
  detail.textContent = String(result?.subtitle || result?.displayName || 'Tunisie')
  copy.append(title, detail)
  button.append(copy)

  const arrow = document.createElement('i')
  arrow.textContent = '›'
  button.append(arrow)

  button.addEventListener('pointerdown', (event) => event.preventDefault())
  button.addEventListener('click', () => onSelect(result))
  return button
}

function mountSmartAddress(page) {
  const step = page.querySelector('.host-onboarding__step')
  const addressInput = step?.querySelector('input[aria-label="Adresse du logement"]')
  const cityInput = step?.querySelector('input[aria-label="Ville du logement"]')
  const addressLabel = addressInput?.closest('label')
  if (!step || !addressInput || !cityInput || !addressLabel || step.querySelector(`.${PANEL_CLASS}`)) return () => {}

  const panel = document.createElement('div')
  panel.className = PANEL_CLASS
  panel.dataset.suggestions = 'closed'

  const status = document.createElement('div')
  status.className = STATUS_CLASS
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')

  const list = document.createElement('div')
  list.className = LIST_CLASS
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-label', 'Suggestions d’adresse')

  let searchTimer = 0
  let searchController = null
  let revision = 0

  const clearSuggestions = () => {
    list.replaceChildren()
    panel.dataset.suggestions = 'closed'
    panel.dataset.searching = 'false'
  }

  const renderSuggestions = (results) => {
    list.replaceChildren()
    const suggestions = Array.isArray(results) ? results.slice(0, 6) : []
    suggestions.forEach((result) => {
      list.append(createSuggestionButton(result, (selected) => {
        if (!selectDetectedAddress(selected, addressInput, cityInput, status)) return
        clearSuggestions()
        addressInput.blur()
      }))
    })
    panel.dataset.suggestions = suggestions.length ? 'open' : 'empty'
    panel.dataset.searching = 'false'
    if (!suggestions.length) setStatus(status, 'Aucune adresse précise trouvée. Continuez à écrire ou vérifiez la ville.', 'idle')
  }

  const search = () => {
    window.clearTimeout(searchTimer)
    searchController?.abort()
    const query = addressInput.value.trim()
    if (query.length < 3) {
      clearSuggestions()
      return
    }

    const localRevision = ++revision
    searchTimer = window.setTimeout(async () => {
      searchController = new AbortController()
      panel.dataset.searching = 'true'
      setStatus(status, 'Recherche des adresses correspondantes…', 'loading')
      try {
        const results = await searchAddress(query, {
          signal: searchController.signal,
          countryCode: 'tn',
          language: 'fr',
          limit: 6,
        })
        if (localRevision !== revision || searchController.signal.aborted) return
        renderSuggestions(results)
        if (results.length) setStatus(status, 'Choisissez l’adresse exacte dans les suggestions.', 'idle')
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (localRevision !== revision) return
        clearSuggestions()
        setStatus(status, 'La recherche d’adresse est momentanément indisponible. Vous pouvez continuer à écrire.', 'error')
      }
    }, SEARCH_DELAY_MS)
  }

  const currentButton = createCurrentAddressButton(() => {
    if (!navigator.geolocation) {
      setStatus(status, 'La localisation n’est pas disponible sur cet appareil.', 'error')
      return
    }

    currentButton.disabled = true
    currentButton.dataset.loading = 'true'
    clearSuggestions()
    setStatus(status, 'Autorisez la localisation pour retrouver votre adresse actuelle…', 'loading')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await reverseGeocode({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            zoom: 18,
          })
          if (!selectDetectedAddress(result, addressInput, cityInput, status)) {
            setStatus(status, 'Adresse actuelle introuvable. Écrivez votre adresse manuellement.', 'error')
          }
        } catch {
          setStatus(status, 'Impossible de convertir votre position en adresse. Écrivez votre adresse manuellement.', 'error')
        } finally {
          currentButton.disabled = false
          currentButton.dataset.loading = 'false'
        }
      },
      (error) => {
        currentButton.disabled = false
        currentButton.dataset.loading = 'false'
        if (error?.code === 1) setStatus(status, 'Localisation refusée. Écrivez votre adresse ou choisissez une suggestion.', 'error')
        else if (error?.code === 3) setStatus(status, 'La localisation a pris trop de temps. Réessayez ou écrivez votre adresse.', 'error')
        else setStatus(status, 'Impossible de détecter votre adresse actuelle.', 'error')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  })

  const heading = document.createElement('div')
  heading.className = 'host-address-smart-heading'
  const headingText = document.createElement('span')
  headingText.textContent = 'Adresse détectée en direct'
  const headingHint = document.createElement('small')
  headingHint.textContent = 'Écrivez au moins 3 caractères'
  heading.append(headingText, headingHint)

  panel.append(currentButton, heading, list, status)
  addressLabel.after(panel)

  const handleInput = () => {
    setStatus(status, '', '')
    search()
  }
  const handleFocus = () => {
    if (addressInput.value.trim().length >= 3) search()
  }

  addressInput.setAttribute('autocomplete', 'street-address')
  addressInput.setAttribute('autocapitalize', 'words')
  addressInput.setAttribute('enterkeyhint', 'search')
  addressInput.addEventListener('input', handleInput)
  addressInput.addEventListener('focus', handleFocus)

  return () => {
    window.clearTimeout(searchTimer)
    searchController?.abort()
    addressInput.removeEventListener('input', handleInput)
    addressInput.removeEventListener('focus', handleFocus)
    panel.remove()
  }
}

let currentPage = null
let cleanupCurrent = () => {}
let frame = 0

function sync() {
  const page = document.querySelector(PAGE_SELECTOR)
  if (page === currentPage) return
  cleanupCurrent()
  cleanupCurrent = () => {}
  currentPage = page
  if (page) cleanupCurrent = mountSmartAddress(page)
}

function scheduleSync() {
  window.cancelAnimationFrame(frame)
  frame = window.requestAnimationFrame(sync)
}

const observer = new MutationObserver(scheduleSync)
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-screen'],
})

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleSync, { once: true })
else scheduleSync()
