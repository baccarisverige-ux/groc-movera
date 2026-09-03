import './listing-highlight-badges.css'

export function ListingHighlightBadges({ badges, variant = 'card', className = '' }) {
  const items = Array.isArray(badges) ? badges.filter((item) => item?.label) : []
  if (!items.length) return null
  return (
    <span className={`listing-highlight-badges listing-highlight-badges--${variant} ${className}`.trim()} aria-label="Points forts de l’offre">
      {items.map((item) => <span key={item.id || item.label} data-tone={item.tone || 'sage'}>{item.label}</span>)}
    </span>
  )
}
