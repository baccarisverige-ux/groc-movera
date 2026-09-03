import { useEffect, useState } from 'react'
import { isPersistentHostPhotoRef, resolveHostPhotoUrl, resolveHostPhotoUrlSync } from '../../entities/host/hostPhotoStore.js'
import './optimized-listing-image.css'

const RESPONSIVE_WIDTHS = [320, 480, 640, 800, 1080, 1440]
const LISTING_FALLBACK_SRC = `${import.meta.env.BASE_URL}assets/listing-placeholder.svg`

function optimizedUrl(src, width) {
  if (!src || !width || isPersistentHostPhotoRef(src)) return src
  try {
    const url = new URL(src, window.location.origin)
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('auto', 'format')
      url.searchParams.set('fit', 'crop')
      url.searchParams.set('q', '84')
      url.searchParams.set('w', String(width))
      return url.toString()
    }
  } catch {
    return src
  }
  return src
}

function responsiveSrcSet(src) {
  if (!src || isPersistentHostPhotoRef(src)) return undefined
  try {
    const url = new URL(src, window.location.origin)
    if (url.hostname !== 'images.unsplash.com') return undefined
    return RESPONSIVE_WIDTHS.map((width) => `${optimizedUrl(src, width)} ${width}w`).join(', ')
  } catch {
    return undefined
  }
}

export function OptimizedListingImage({
  src,
  alt = '',
  sizes = '(max-width: 430px) 46vw, 220px',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  className = '',
  draggable,
  ...props
}) {
  const [resolvedSrc, setResolvedSrc] = useState(() => resolveHostPhotoUrlSync(src) || (isPersistentHostPhotoRef(src) ? '' : src))

  useEffect(() => {
    let cancelled = false
    const immediate = resolveHostPhotoUrlSync(src)
    if (immediate) {
      setResolvedSrc(immediate)
      return () => { cancelled = true }
    }
    if (!isPersistentHostPhotoRef(src)) {
      setResolvedSrc(src || '')
      return () => { cancelled = true }
    }
    setResolvedSrc('')
    resolveHostPhotoUrl(src).then((url) => {
      if (!cancelled) setResolvedSrc(url || '')
    }).catch(() => {
      if (!cancelled) setResolvedSrc('')
    })
    return () => { cancelled = true }
  }, [src])

  if (!src) return null
  const renderSrc = resolvedSrc || LISTING_FALLBACK_SRC
  const srcSet = responsiveSrcSet(renderSrc)
  const handleError = (event) => {
    const image = event.currentTarget
    if (image.dataset.fallbackApplied === 'true') return
    image.dataset.fallbackApplied = 'true'
    image.removeAttribute('srcset')
    image.removeAttribute('sizes')
    image.src = LISTING_FALLBACK_SRC
  }
  return <img
    {...props}
    className={`movera-listing-image ${className}`.trim()}
    src={optimizedUrl(renderSrc, 800)}
    srcSet={srcSet}
    sizes={srcSet ? sizes : undefined}
    alt={alt}
    loading={loading}
    decoding={decoding}
    fetchPriority={fetchPriority}
    draggable={draggable}
    onError={handleError}
  />
}
