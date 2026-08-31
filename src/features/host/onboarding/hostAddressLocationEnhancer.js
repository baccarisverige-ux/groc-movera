import { reverseGeocode } from '../../../services/geocoding/index.js'
import { HOST_MAP_LOCATION_EVENT } from './hostLocationSync.js'

const PAGE_SELECTOR = '.host-onboarding[data-screen="address"]'
const BUTTON_CLASS = 'host-address-location-action'
const STATUS_CLASS = 'host-address-location-status'

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

function publishLocation({ latitude, longitude, address = '', city = '' }) {
  window.dispatchEvent(new CustomEvent(HOST_MAP_LOCATION_EVENT, {
    detail: {
      lat: latitude,
      lng: longitude,
      address,
      city,
    },
  }))
}

async function resolveCurrentPosition(button, status) {
  if (!navigator.geolocation) {
    setStatus(status, 'La localisation n’est pas disponible sur cet appareil.', 'error')
    return
  }

  button.disabled = true
  button.dataset.loading = 'true'
  setStatus(status, 'Autorisez la localisation pour détecter votre adresse…', 'loading')

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = Number(position.coords.latitude)
      const longitude = Number(position.coords.longitude)
      try {
        const result = await reverseGeocode({ lat: latitude, lng: longitude, zoom: 18 })
        publishLocation({
          latitude,
          longitude,
          address: String(result?.label || '').trim(),
          city: String(result?.location?.city || '').trim(),
        })
        setStatus(status, 'Position détectée. Vous pourrez l’ajuster sur la carte.', 'success')
      } catch {
        publishLocation({ latitude, longitude })
        setStatus(status, 'Position détectée. L’adresse pourra être ajustée sur la carte.', 'success')
      } finally {
        button.disabled = false
        button.dataset.loading = 'false'
      }
    },
    (error) => {
      button.disabled = false
      button.dataset.loading = 'false'
      if (error?.code === 1) {
        setStatus(status, 'Localisation refusée. Vous pouvez continuer en écrivant l’adresse.', 'error')
      } else if (error?.code === 3) {
        setStatus(status, 'La localisation a pris trop de temps. Réessayez ou écrivez l’adresse.', 'error')
      } else {
        setStatus(status, 'Impossible de détecter votre position. Vous pouvez écrire l’adresse.', 'error')
      }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  )
}

function mountAddressLocationAction() {
  const page = document.querySelector(PAGE_SELECTOR)
  const step = page?.querySelector('.host-onboarding__step')
  if (!page || !step || step.querySelector(`.${BUTTON_CLASS}`)) return

  const note = step.querySelector('.host-onboarding__address-note')
  const button = document.createElement('button')
  button.type = 'button'
  button.className = BUTTON_CLASS
  button.dataset.loading = 'false'
  button.append(locationIcon())
  const copy = document.createElement('span')
  const title = document.createElement('strong')
  title.textContent = 'Utiliser ma position actuelle'
  const detail = document.createElement('small')
  detail.textContent = 'Détecter automatiquement l’adresse et le repère'
  copy.append(title, detail)
  button.append(copy)

  const status = document.createElement('div')
  status.className = STATUS_CLASS
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')

  button.addEventListener('click', () => resolveCurrentPosition(button, status))

  if (note) note.before(button, status)
  else step.append(button, status)
}

let scheduled = false
function scheduleMount() {
  if (scheduled) return
  scheduled = true
  window.requestAnimationFrame(() => {
    scheduled = false
    mountAddressLocationAction()
  })
}

const observer = new MutationObserver(scheduleMount)
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-screen'] })

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleMount, { once: true })
else scheduleMount()
