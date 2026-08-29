import { useState } from 'react'
import { ArrowLeftIcon } from '../../shared/icons/AppIcons.jsx'
import { useFavorites } from '../favorites/favoritesStore.js'
import { getGuestListingById } from './guestListings.js'
import './listing-detail-page.css'

function goBack(onNavigate) {
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  onNavigate('/')
}

function Glyph({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function ShareGlyph() {
  return (
    <Glyph>
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </Glyph>
  )
}

function HeartGlyph({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockGlyph() {
  return (
    <Glyph>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </Glyph>
  )
}

function HostQualityGlyph() {
  return (
    <Glyph>
      <path d="M12 3 4.8 6.4v5.3c0 4.4 3.1 8.4 7.2 9.3 4.1-.9 7.2-4.9 7.2-9.3V6.4Z" />
      <path d="m9 12 2 2 4-4" />
    </Glyph>
  )
}

function PinGlyph() {
  return (
    <Glyph>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.3" />
    </Glyph>
  )
}

function ChevronGlyph() {
  return (
    <Glyph>
      <path d="m9 6 6 6-6 6" />
    </Glyph>
  )
}

function CalendarGlyph() {
  return (
    <Glyph>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </Glyph>
  )
}

function CancelGlyph() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </Glyph>
  )
}

function RulesGlyph() {
  return (
    <Glyph>
      <path d="M8 5h11v14H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
      <path d="M11 9h5M11 13h5" />
    </Glyph>
  )
}

function SafetyGlyph() {
  return (
    <Glyph>
      <path d="M12 3 5 6.5v5c0 4.2 2.9 8 7 8.9 4.1-.9 7-4.7 7-8.9v-5Z" />
    </Glyph>
  )
}

function amenityIcon(name) {
  const key = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()

  if (key.includes('wifi')) {
    return (
      <Glyph>
        <path d="M5 12.6a10.7 10.7 0 0 1 14 0" />
        <path d="M8.5 16.1a5.8 5.8 0 0 1 7 0" />
        <path d="M12 20h.01" />
      </Glyph>
    )
  }
  if (key.includes('park')) {
    return (
      <Glyph>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 17V7.5H13a3 3 0 0 1 0 6H9.5" />
      </Glyph>
    )
  }
  if (key.includes('climat') || key.includes('air')) {
    return (
      <Glyph>
        <path d="M12 3v18" />
        <path d="m7 7 5 5 5-5" />
        <path d="m7 17 5-5 5 5" />
      </Glyph>
    )
  }
  if (key.includes('cuisine') || key.includes('petitdejeuner')) {
    return (
      <Glyph>
        <path d="M4 11h16" />
        <path d="M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
        <path d="M8 11v8M16 11v8M5 19h14" />
      </Glyph>
    )
  }
  if (key.includes('piscine') || key.includes('eau')) {
    return (
      <Glyph>
        <path d="M4 16c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
        <path d="M4 12c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
        <path d="M8 6h8" />
      </Glyph>
    )
  }
  if (key.includes('jardin')) {
    return (
      <Glyph>
        <path d="M12 21V10" />
        <path d="M12 10c-3-5-8-4-8-4 2 5 5 6 8 6" />
        <path d="M12 10c3-5 8-4 8-4-2 5-5 6-8 6" />
      </Glyph>
    )
  }
  if (key.includes('tv') || key.includes('tele')) {
    return (
      <Glyph>
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="m8 7 4-3 4 3" />
      </Glyph>
    )
  }
  if (key.includes('balcon') || key.includes('terrasse') || key.includes('patio')) {
    return (
      <Glyph>
        <path d="M4 20V9l8-5 8 5v11" />
        <path d="M10 20v-6h4v6" />
      </Glyph>
    )
  }
  if (key.includes('vue')) {
    return (
      <Glyph>
        <circle cx="12" cy="12" r="3" />
        <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
      </Glyph>
    )
  }
  if (key.includes('lave')) {
    return (
      <Glyph>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="13" r="4" />
        <path d="M7 6h.01M9.5 6h.01" />
      </Glyph>
    )
  }
  return (
    <Glyph>
      <path d="M5 12.5 9.2 17 19 7" />
    </Glyph>
  )
}

function reviewChips(amenities = []) {
  const keys = amenities.map((name) => String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase())
  const chips = []
  if (keys.some((key) => key.includes('parking') || key.includes('vue') || key.includes('plage') || key.includes('balcon'))) {
    chips.push('Emplacement')
  }
  if (keys.some((key) => key.includes('clim') || key.includes('cuisine') || key.includes('tv') || key.includes('tele'))) {
    chips.push('Confort')
  }
  if (keys.some((key) => key.includes('piscine') || key.includes('jardin') || key.includes('terrasse') || key.includes('patio'))) {
    chips.push('Extérieur')
  }
  if (!chips.length) chips.push('Emplacement', 'Confort')
  return chips.slice(0, 3)
}

function hostYears(since) {
  const match = String(since || '').match(/(20\d{2})/)
  if (!match) return null
  return Math.max(1, 2026 - Number(match[1]))
}

async function shareListing(title) {
  const url = window.location.href
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, url })
      return 'shared'
    }
  } catch (error) {
    if (error?.name === 'AbortError') return 'aborted'
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

function OverlayButton({ label, onClick, children, pressed }) {
  return (
    <button
      type="button"
      className="listing-detail-orb"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function ListingDetailPage({ params, onNavigate }) {
  const listing = getGuestListingById(params?.id)
  const { favoriteIds, toggleFavorite } = useFavorites()
  const [descOpen, setDescOpen] = useState(false)
  const [amenitiesOpen, setAmenitiesOpen] = useState(false)
  const [shareHint, setShareHint] = useState('')
  const favorite = listing ? favoriteIds.includes(listing.id) : false

  if (!listing) {
    return (
      <div className="listing-detail-page" data-testid="page-listing-missing">
        <header className="listing-detail-missing-top">
          <OverlayButton label="Retour" onClick={() => goBack(onNavigate)}>
            <ArrowLeftIcon />
          </OverlayButton>
        </header>
        <section className="listing-detail-empty">
          <h1>Logement introuvable</h1>
          <p>Cette adresse n’est plus disponible dans Movera.</p>
          <button type="button" onClick={() => onNavigate('/')}>Retour à l’accueil</button>
        </section>
      </div>
    )
  }

  const photos = listing.photos?.length ? listing.photos : listing.image ? [{ src: listing.image, label: 'Chambre' }] : []
  const visibleAmenities = amenitiesOpen ? listing.amenities : listing.amenities.slice(0, 5)
  const years = hostYears(listing.host?.since)
  const chips = reviewChips(listing.amenities)
  const hostName = listing.host?.name || 'Movera'
  const hostInitial = hostName.trim().charAt(0).toUpperCase() || 'M'
  const hostSince = listing.host?.since || 'Hôte Movera'
  const sleepCards = photos.slice(0, 2)
  const photoIndex = photos.length ? 1 : 0
  const photoTotal = Math.max(photos.length, 1)

  const onShare = async () => {
    const result = await shareListing(listing.title)
    if (result === 'copied') {
      setShareHint('Lien copié')
      window.setTimeout(() => setShareHint(''), 1800)
    }
  }

  return (
    <div className="listing-detail-page" data-testid="page-listing" data-listing-id={listing.id}>
      <div className="listing-detail-hero">
        {listing.image ? (
          <img src={listing.image} alt={listing.title} />
        ) : (
          <div className="listing-detail-hero-fallback" aria-hidden="true" />
        )}
        <div className="listing-detail-hero-bar">
          <OverlayButton label="Retour" onClick={() => goBack(onNavigate)}>
            <ArrowLeftIcon />
          </OverlayButton>
          <div className="listing-detail-hero-end">
            <OverlayButton label={shareHint || 'Partager'} onClick={onShare}>
              <ShareGlyph />
            </OverlayButton>
            <OverlayButton
              label={`${favorite ? 'Retirer' : 'Ajouter'} ${listing.title} ${favorite ? 'des' : 'aux'} favoris`}
              pressed={favorite}
              onClick={() => toggleFavorite(listing.id)}
            >
              <span className={favorite ? 'listing-detail-heart is-on' : 'listing-detail-heart'}>
                <HeartGlyph filled={favorite} />
              </span>
            </OverlayButton>
          </div>
        </div>
        <span className="listing-detail-counter">{photoIndex} / {photoTotal}</span>
      </div>

      <div className="listing-detail-sheet">
        <section className="listing-detail-intro">
          <h1>{listing.title}</h1>
          <p className="listing-detail-place">{listing.location}, Tunisie</p>
          <p className="listing-detail-capacity">{listing.capacityLine}</p>
          <p className="listing-detail-rating-row">
            <span>★ {listing.rating}</span>
            <span className="listing-detail-dot">·</span>
            <span>{listing.reviews} avis</span>
          </p>
        </section>

        <div className="listing-detail-host-row">
          <span className="listing-detail-avatar" aria-hidden="true">{hostInitial}</span>
          <div>
            <strong>Hôte · {hostName}</strong>
            <span>{hostSince}</span>
          </div>
        </div>

        <ul className="listing-detail-highlights">
          <li>
            <span className="listing-detail-well"><LockGlyph /></span>
            <div>
              <strong>Arrivée autonome</strong>
              <span>Boîte à clés sur place — entrez à votre rythme, sans rendez-vous.</span>
            </div>
          </li>
          <li>
            <span className="listing-detail-well"><HostQualityGlyph /></span>
            <div>
              <strong>Hôte attentif</strong>
              <span>{listing.host?.response || 'Un accueil soigné, suivi de près par l’équipe Movera.'}</span>
            </div>
          </li>
        </ul>

        <section className="listing-detail-block">
          <p className={descOpen ? 'listing-detail-copy' : 'listing-detail-copy is-clamped'}>
            {listing.description}
          </p>
          <button type="button" className="listing-detail-pill" onClick={() => setDescOpen((open) => !open)}>
            {descOpen ? 'Réduire' : 'Lire la suite'}
          </button>
        </section>

        {sleepCards.length ? (
          <section className="listing-detail-block">
            <h2>Où vous dormirez</h2>
            <div className="listing-detail-sleep">
              {sleepCards.map((photo) => (
                <article className="listing-detail-sleep-card" key={photo.label}>
                  <img src={photo.src} alt="" />
                  <strong>{photo.label || 'Chambre'}</strong>
                  <span>{listing.capacity?.beds ? `${listing.capacity.beds} lit${listing.capacity.beds > 1 ? 's' : ''}` : 'Espace nuit'}</span>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="listing-detail-block">
          <h2>Ce que propose ce lieu</h2>
          <ul className="listing-detail-amenities">
            {visibleAmenities.map((name) => (
              <li key={name}>
                <span className="listing-detail-well">{amenityIcon(name)}</span>
                <span>{name}</span>
              </li>
            ))}
          </ul>
          {listing.amenities.length > 5 ? (
            <button type="button" className="listing-detail-pill" onClick={() => setAmenitiesOpen((open) => !open)}>
              {amenitiesOpen ? 'Réduire' : 'Voir tout'}
            </button>
          ) : null}
        </section>

        <section className="listing-detail-block">
          <h2>Où vous serez</h2>
          <p className="listing-detail-copy">{listing.location}, Tunisie</p>
          <button
            type="button"
            className="listing-detail-map"
            onClick={() => onNavigate(`/map?listing=${encodeURIComponent(listing.id)}`)}
          >
            <span className="listing-detail-map-canvas" aria-hidden="true">
              <span className="listing-detail-map-pin"><PinGlyph /></span>
            </span>
            <span className="listing-detail-map-label">
              <strong>Voir sur la carte</strong>
              <small>Localiser cette adresse Movera</small>
            </span>
          </button>
        </section>

        <section className="listing-detail-block">
          <h2>Avis des voyageurs</h2>
          <div className="listing-detail-review-head">
            <strong>★ {listing.rating}</strong>
            <span>{listing.reviews} avis</span>
          </div>
          <p className="listing-detail-copy">Les séjours ici sont très bien notés.</p>
          <div className="listing-detail-chips">
            {chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        </section>

        <section className="listing-detail-block">
          <h2>Votre hôte</h2>
          <article className="listing-detail-host-card">
            <span className="listing-detail-avatar listing-detail-avatar--lg" aria-hidden="true">{hostInitial}</span>
            <div>
              <strong>{hostName}</strong>
              <span>{hostSince}</span>
            </div>
            <dl>
              <div>
                <dt>Avis</dt>
                <dd>{listing.reviews}</dd>
              </div>
              <div>
                <dt>Note</dt>
                <dd>{listing.rating}</dd>
              </div>
              {years ? (
                <div>
                  <dt>Années</dt>
                  <dd>{years}</dd>
                </div>
              ) : null}
            </dl>
          </article>
        </section>

        <button type="button" className="listing-detail-row">
          <span className="listing-detail-well"><CalendarGlyph /></span>
          <div>
            <strong>Disponibilité</strong>
            <span>{listing.dates || '3–4 sept.'}</span>
          </div>
          <ChevronGlyph />
        </button>

        <section className="listing-detail-block">
          <h2>À savoir</h2>
          <ul className="listing-detail-know">
            <li>
              <span className="listing-detail-well"><CancelGlyph /></span>
              <div>
                <strong>Annulation flexible</strong>
                <span>Remboursement selon les conditions Movera du séjour.</span>
              </div>
              <ChevronGlyph />
            </li>
            <li>
              <span className="listing-detail-well"><RulesGlyph /></span>
              <div>
                <strong>Règles de la maison</strong>
                <span>Arrivée 15:00 · Départ 11:00</span>
              </div>
              <ChevronGlyph />
            </li>
            <li>
              <span className="listing-detail-well"><SafetyGlyph /></span>
              <div>
                <strong>Sécurité</strong>
                <span>Conseils de séjour et contacts utiles partagés après réservation.</span>
              </div>
              <ChevronGlyph />
            </li>
          </ul>
        </section>
      </div>

      <footer className="listing-detail-footer">
        <div className="listing-detail-footer-price">
          <strong>{listing.priceLabel}</strong>
          <span>{listing.dates || '3–4 sept.'}</span>
        </div>
        <button type="button" className="listing-detail-reserve">Réserver</button>
      </footer>
      {shareHint ? <p className="listing-detail-toast" role="status">{shareHint}</p> : null}
    </div>
  )
}
