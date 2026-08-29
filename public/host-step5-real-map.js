(() => {
  const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
  const NOMINATIM = 'https://nominatim.openstreetmap.org'
  const STORE_KEY = 'movera:host-pin-location:v1'
  const HOST_MAP_LOCATION_EVENT = 'movera:host-map-address-change'
  let leafletPromise
  let currentMount = null
  let reverseTimer = null

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L)
    if (leafletPromise) return leafletPromise
    leafletPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-host-leaflet]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = LEAFLET_CSS
        link.dataset.hostLeaflet = 'true'
        document.head.appendChild(link)
      }
      const existing = document.querySelector('script[data-host-leaflet]')
      if (existing) {
        existing.addEventListener('load', () => resolve(window.L), { once: true })
        existing.addEventListener('error', reject, { once: true })
        return
      }
      const script = document.createElement('script')
      script.src = LEAFLET_JS
      script.async = true
      script.dataset.hostLeaflet = 'true'
      script.onload = () => resolve(window.L)
      script.onerror = reject
      document.head.appendChild(script)
    })
    return leafletPromise
  }

  function sharedGeocoding() {
    const service = window.MoveraGeocoding
    if (!service || typeof service.searchAddress !== 'function' || typeof service.reverseGeocode !== 'function') return null
    return service
  }

  function addressLabel(result) {
    if (!result) return ''
    const a = result.address || {}
    const street = [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean).join(' ')
    const district = a.suburb || a.neighbourhood || a.quarter || a.village || ''
    const city = a.city || a.town || a.municipality || a.county || ''
    const postcode = a.postcode || ''
    const compact = [street, district, [postcode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    return compact || result.display_name || result.displayName || result.label || ''
  }

  function resultAddress(result, fallback = '') {
    if (result?.label) return String(result.label).trim()
    const a = result?.address || {}
    const street = [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean).join(' ')
    return street || fallback || addressLabel(result)
  }

  function resultCity(result) {
    if (result?.location?.city) return String(result.location.city).trim()
    const a = result?.address || {}
    return String(a.city || a.town || a.village || a.municipality || a.county || '').trim()
  }

  function publishLocation(lat, lng, result, fallbackAddress = '') {
    const latitude = Number(lat)
    const longitude = Number(lng)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
    window.dispatchEvent(new CustomEvent(HOST_MAP_LOCATION_EVENT, {
      detail: {
        lat: latitude,
        lng: longitude,
        address: resultAddress(result, fallbackAddress),
        city: resultCity(result),
      },
    }))
  }

  async function legacyGeocode(query) {
    const url = `${NOMINATIM}/search?format=jsonv2&limit=1&addressdetails=1&accept-language=fr&q=${encodeURIComponent(query)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('geocode failed')
    const items = await response.json()
    if (!Array.isArray(items) || !items[0]) return null
    return { lat: Number(items[0].lat), lng: Number(items[0].lon), raw: items[0] }
  }

  async function geocode(query) {
    if (!query || query.trim().length < 3) return null
    const service = sharedGeocoding()
    if (service) {
      try {
        const items = await service.searchAddress(query, { countryCode: 'tn', language: 'fr', limit: 1 })
        const first = Array.isArray(items) ? items[0] : null
        const lat = Number(first?.viewport?.lat)
        const lng = Number(first?.viewport?.lng)
        if (first && Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, raw: first }
        if (Array.isArray(items) && items.length === 0) return legacyGeocode(query)
      } catch {
        return legacyGeocode(query)
      }
    }
    return legacyGeocode(query)
  }

  async function legacyReverse(lat, lng) {
    const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=fr&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('reverse geocode failed')
    return response.json()
  }

  async function reverse(lat, lng) {
    const service = sharedGeocoding()
    if (service) {
      try {
        const result = await service.reverseGeocode({ lat, lng, zoom: 18 })
        if (result) return result
      } catch {}
    }
    return legacyReverse(lat, lng)
  }

  function persist(lat, lng, label) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ lat, lng, address: label, updatedAt: Date.now() }))
    } catch {}
  }

  function savedLocation() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
      if (value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng))) return value
    } catch {}
    return null
  }

  function setChip(card, text) {
    const span = card.querySelector('.host-onboarding__address-chip span')
    if (span && text) span.textContent = text
  }

  function setSearchValue(card, text, force = false) {
    const input = card.querySelector('.host-step5-address-input')
    if (!input || !text) return
    if (force || document.activeElement !== input) input.value = text
  }

  function setAddress(card, text, forceInput = false) {
    if (!text) return
    setChip(card, text)
    setSearchValue(card, text, forceInput)
  }

  function setHint(card, text) {
    const hint = card.querySelector('.host-onboarding__map-hint')
    if (hint && text) hint.textContent = text
  }

  function scheduleReverse(map, card) {
    clearTimeout(reverseTimer)
    setHint(card, 'Détection de l’adresse…')
    reverseTimer = setTimeout(async () => {
      const center = map.getCenter()
      try {
        const result = await reverse(center.lat, center.lng)
        const label = addressLabel(result)
        if (label) setAddress(card, label)
        persist(center.lat, center.lng, label || result.display_name || result.displayName || '')
        publishLocation(center.lat, center.lng, result, label)
        setHint(card, 'Adresse ajustée · déplacez la carte si nécessaire')
      } catch {
        persist(center.lat, center.lng, '')
        publishLocation(center.lat, center.lng, null)
        setHint(card, 'Position ajustée · adresse non disponible')
      }
    }, 420)
  }

  async function searchAddress(map, card, input, button) {
    const query = input.value.trim()
    if (query.length < 3) {
      setHint(card, 'Écrivez une adresse complète')
      input.focus()
      return
    }

    button.dataset.loading = 'true'
    setHint(card, 'Recherche de l’adresse…')
    try {
      const found = await geocode(query)
      if (!found || !Number.isFinite(found.lat) || !Number.isFinite(found.lng)) {
        setHint(card, 'Adresse introuvable · vérifiez puis réessayez')
        return
      }
      const label = addressLabel(found.raw) || query
      setAddress(card, label, true)
      persist(found.lat, found.lng, label)
      publishLocation(found.lat, found.lng, found.raw, query)
      map.flyTo([found.lat, found.lng], 17, { duration: 0.55 })
      setHint(card, 'Adresse trouvée · ajustez la carte si nécessaire')
      input.blur()
    } catch {
      setHint(card, 'Impossible de rechercher cette adresse pour le moment')
    } finally {
      button.dataset.loading = 'false'
    }
  }

  function addAddressSearch(card, map, initialAddress) {
    const form = document.createElement('form')
    form.className = 'host-step5-address-search'
    form.setAttribute('role', 'search')
    form.innerHTML = `
      <svg class="host-step5-address-search__pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.4"></circle></svg>
      <input class="host-step5-address-input" type="text" autocomplete="street-address" enterkeyhint="search" aria-label="Rechercher ou modifier l’adresse" placeholder="Écrivez une adresse" />
      <button class="host-step5-address-search__button" type="submit" aria-label="Rechercher cette adresse"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button>
    `
    card.appendChild(form)
    const input = form.querySelector('.host-step5-address-input')
    const button = form.querySelector('.host-step5-address-search__button')
    input.value = initialAddress || ''
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      searchAddress(map, card, input, button)
    })
    return { input, button }
  }

  function locateUser(map, card, button) {
    if (!navigator.geolocation) {
      setHint(card, 'La géolocalisation n’est pas disponible')
      return
    }
    button.dataset.loading = 'true'
    setHint(card, 'Recherche de votre position…')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        button.dataset.loading = 'false'
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        map.flyTo([lat, lng], 17, { duration: 0.65 })
        try {
          const result = await reverse(lat, lng)
          const label = addressLabel(result)
          if (label) setAddress(card, label, true)
          persist(lat, lng, label || result.display_name || result.displayName || '')
          publishLocation(lat, lng, result, label)
          setHint(card, 'Adresse détectée à partir de votre position')
        } catch {
          persist(lat, lng, '')
          publishLocation(lat, lng, null)
          setHint(card, 'Position détectée')
        }
      },
      () => {
        button.dataset.loading = 'false'
        setHint(card, 'Autorisez la localisation ou déplacez la carte')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  async function mount() {
    const section = document.querySelector('.host-onboarding[data-screen="pin"]')
    const card = section?.querySelector('.host-onboarding__map-card')
    if (!card || card.dataset.realMapMounted === 'true') return

    card.dataset.realMapMounted = 'true'
    setHint(card, 'Chargement de la carte…')

    try {
      const L = await loadLeaflet()
      if (!card.isConnected || !document.querySelector('.host-onboarding[data-screen="pin"]')) return

      const typedAddress = card.querySelector('.host-onboarding__address-chip span')?.textContent?.trim() || ''

      const layer = document.createElement('div')
      layer.className = 'host-step5-real-map'
      const mapNode = document.createElement('div')
      layer.appendChild(mapNode)
      card.prepend(layer)

      const centerPin = document.createElement('div')
      centerPin.className = 'host-step5-center-pin'
      centerPin.setAttribute('aria-hidden', 'true')
      card.appendChild(centerPin)

      const locate = document.createElement('button')
      locate.type = 'button'
      locate.className = 'host-step5-location-button'
      locate.setAttribute('aria-label', 'Utiliser ma position actuelle')
      locate.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path><circle cx="12" cy="12" r="8"></circle></svg>'
      card.appendChild(locate)

      const map = L.map(mapNode, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        scrollWheelZoom: false,
      }).setView([36.8065, 10.1815], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map)

      map.zoomControl.setPosition('bottomright')
      map.on('moveend', () => scheduleReverse(map, card))
      locate.addEventListener('click', () => locateUser(map, card, locate))
      addAddressSearch(card, map, typedAddress)

      currentMount = { card, map }
      setTimeout(() => map.invalidateSize(), 80)

      // The address entered on Étape 4 always has priority over an older saved map position.
      if (typedAddress.length >= 3) {
        try {
          const found = await geocode(typedAddress)
          if (found && Number.isFinite(found.lat) && Number.isFinite(found.lng)) {
            const label = addressLabel(found.raw) || typedAddress
            map.setView([found.lat, found.lng], 17, { animate: false })
            setAddress(card, label, true)
            persist(found.lat, found.lng, label)
            publishLocation(found.lat, found.lng, found.raw, typedAddress)
            setHint(card, 'Adresse de l’étape 4 trouvée · ajustez si nécessaire')
            return
          }
        } catch {}
      }

      // Only fall back to the previously adjusted position when the typed address cannot be found.
      const saved = savedLocation()
      if (saved) {
        map.setView([Number(saved.lat), Number(saved.lng)], 17, { animate: false })
        if (saved.address) setAddress(card, saved.address, true)
        publishLocation(Number(saved.lat), Number(saved.lng), null, saved.address || '')
        setHint(card, typedAddress ? 'Adresse introuvable · position précédente affichée' : 'Déplacez la carte pour ajuster le repère')
        return
      }

      setHint(card, typedAddress ? 'Adresse introuvable · écrivez-la ici ou utilisez votre position' : 'Écrivez une adresse ou utilisez votre position')
    } catch {
      card.dataset.realMapMounted = 'error'
      setHint(card, 'Impossible de charger la carte pour le moment')
    }
  }

  const observer = new MutationObserver(() => {
    if (currentMount && !currentMount.card.isConnected) {
      try { currentMount.map.remove() } catch {}
      currentMount = null
    }
    mount()
  })

  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-screen'] })
  mount()
})()
