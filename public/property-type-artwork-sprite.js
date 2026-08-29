(() => {
  const scriptSrc = document.currentScript?.src || window.location.href
  const baseUrl = new URL('.', scriptSrc)
  const assetUrl = new URL('assets/bootstrap/property/property-drawings-sprite.webp.b64.txt', baseUrl)

  fetch(assetUrl, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`property artwork ${response.status}`)
      return response.text()
    })
    .then((base64) => {
      let clean = base64.replace(/\s+/g, '')

      // The committed sprite text lost two base64 characters during the binary-to-text upload.
      // Restore the known missing pair before decoding. This reproduces the original verified WebP byte-for-byte.
      if (clean.length === 13026 && clean.startsWith('UklGRiImAABXRUJQVlA4')) {
        clean = `${clean.slice(0, 1096)}7u${clean.slice(1096)}`
      }

      if (!clean.startsWith('UklG') || clean.length % 4 !== 0) throw new Error('invalid property artwork')

      const dataUrl = `data:image/webp;base64,${clean}`
      const probe = new Image()
      probe.onload = () => {
        document.documentElement.style.setProperty('--property-drawings-sprite', `url("${dataUrl}")`)
        document.documentElement.dataset.propertyArtwork = 'ready'
      }
      probe.onerror = () => {
        document.documentElement.dataset.propertyArtwork = 'error'
      }
      probe.src = dataUrl
    })
    .catch(() => {
      document.documentElement.dataset.propertyArtwork = 'error'
    })
})()