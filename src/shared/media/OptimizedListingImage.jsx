import './optimized-listing-image.css'

const RESPONSIVE_WIDTHS = [320, 480, 640, 800, 1080, 1440]
const LISTING_FALLBACK_SRC = `${import.meta.env.BASE_URL}assets/listing-placeholder.svg`

function optimizedUrl(src, width) {
  if (!src || !width) return src
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
  if (!src) return undefined
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
  if (!src) return null
  const srcSet = responsiveSrcSet(src)
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
    src={optimizedUrl(src, 800)}
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
