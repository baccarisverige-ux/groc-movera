export function installPropertyArtworkRuntime() {
  const root = document.documentElement
  if (root.dataset.propertyArtwork === 'ready' || root.dataset.propertyArtworkRuntime === 'loading') return

  root.dataset.propertyArtworkRuntime = 'loading'
  const assetUrl = `${import.meta.env.BASE_URL}assets/bootstrap/property/property-drawings-sprite.webp.b64.txt`

  fetch(assetUrl, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`property artwork ${response.status}`)
      return response.text()
    })
    .then((base64) => {
      let clean = base64.replace(/\s+/g, '')
      if (clean.length === 13026 && clean.startsWith('UklGRiImAABXRUJQVlA4')) {
        clean = `${clean.slice(0, 1096)}7u${clean.slice(1096)}`
      }
      if (!clean.startsWith('UklG') || clean.length % 4 !== 0) throw new Error('invalid property artwork')

      const dataUrl = `data:${'image/webp'};base64,${clean}`
      const probe = new Image()
      probe.onload = () => {
        root.style.setProperty('--property-drawings-sprite', `url("${dataUrl}")`)
        root.dataset.propertyArtwork = 'ready'
        root.dataset.propertyArtworkRuntime = 'ready'
      }
      probe.onerror = () => {
        root.dataset.propertyArtwork = 'error'
        root.dataset.propertyArtworkRuntime = 'error'
      }
      probe.src = dataUrl
    })
    .catch(() => {
      root.dataset.propertyArtwork = 'error'
      root.dataset.propertyArtworkRuntime = 'error'
    })
}
