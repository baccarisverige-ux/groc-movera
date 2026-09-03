import { useMemo, useState } from 'react'
import { useFavorites } from '../../entities/favorite/favoritesStore.js'
import { MotionList, MotionListItem } from '../motion/MotionList.jsx'
import { OptimizedListingImage } from '../media/OptimizedListingImage.jsx'
import { ListingHighlightBadges } from '../listing/ListingHighlightBadges.jsx'
import './collection-page.css'
import './collection-page-scale.css'
import './collection-premium-architecture.css'

const QUICK_CITIES = ['Toutes', 'Gammarth', 'La Marsa', 'Hammamet', 'Sousse', 'Djerba', 'Bizerte', 'Nabeul']

const TUNISIA_CITIES = [
  'Ajim', 'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Carthage', 'Djerba', 'Douz',
  'El Jem', 'Ezzahra', 'Gabès', 'Gafsa', 'Gammarth', 'Ghar El Melh', 'Hammam Lif',
  'Hammamet', 'Haouaria', 'Houmt Souk', 'Jendouba', 'Kairouan', 'Kasserine',
  'Kébili', 'Kélibia', 'Kerkennah', 'Korba', 'Ksar Hellal', 'La Goulette',
  'La Marsa', 'La Soukra', 'Le Kef', 'Le Kram', 'Mahdia', 'Manouba', 'Médenine',
  'Menzel Bourguiba', 'Menzel Temime', 'Midoun', 'Moknine', 'Monastir', 'Mornag',
  'Nabeul', 'Nefta', 'Port El Kantaoui', 'Rades', 'Raf Raf', 'Raoued',
  'Sfax', 'Sidi Bou Saïd', 'Sidi Bouzid', 'Siliana', 'Soliman', 'Sousse',
  'Tabarka', 'Tataouine', 'Tozeur', 'Tunis', 'Yasmine Hammamet', 'Zaghouan', 'Zarzis'
]

const COLLECTION_OFFER_MOTION = Object.freeze({
  enterScale: 0.992,
  enterY: 12,
  exitScale: 0.994,
  exitY: -6,
  initialOpacity: 0.7,
  layout: true,
  stagger: 0.022,
  tapScale: 1,
  spring: Object.freeze({ stiffness: 360, damping: 32, mass: 0.8 }),
})

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.3"/></svg>
}

function MapIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5 8.7 3l6.6 2.5L21 3v15.5L15.3 21l-6.6-2.5L3 21V5.5Z"/><path d="M8.7 3v15.5M15.3 5.5V21"/></svg>
}

function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"/></svg>
}

export function CollectionPage({
  offers,
  pageClassName = '',
  hero,
  collectionLabel,
  title,
  description,
  allResultsLabel,
  emptyTitle,
  badgeLabel,
  onNavigate,
}) {
  const [cityQuery, setCityQuery] = useState('')
  const [city, setCity] = useState('')
  const [focused, setFocused] = useState(false)
  const { favoriteIds, toggleFavorite } = useFavorites()
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  const suggestions = useMemo(() => {
    const q = normalize(cityQuery)
    if (!q) return TUNISIA_CITIES.slice(0, 6)
    return TUNISIA_CITIES
      .filter((name) => normalize(name).includes(q))
      .sort((a, b) => {
        const aStarts = normalize(a).startsWith(q) ? 0 : 1
        const bStarts = normalize(b).startsWith(q) ? 0 : 1
        return aStarts - bStarts || a.localeCompare(b, 'fr')
      })
      .slice(0, 7)
  }, [cityQuery])

  const visibleOffers = useMemo(() => {
    const filterCity = normalize(city || cityQuery)
    if (!filterCity) return offers
    return offers.filter((item) => normalize(item.location).includes(filterCity))
  }, [offers, city, cityQuery])

  const selectCity = (value) => {
    if (value === 'Toutes') {
      setCity('')
      setCityQuery('')
      setFocused(false)
      return
    }
    setCity(value)
    setCityQuery(value)
    setFocused(false)
  }

  const onCityChange = (event) => {
    const value = event.target.value
    setCityQuery(value)
    const exact = TUNISIA_CITIES.find((name) => normalize(name) === normalize(value))
    setCity(exact || '')
  }

  const openOfferOnMap = (item) => {
    if (!onNavigate) return
    onNavigate(`/map?listing=${encodeURIComponent(item.id)}`)
  }

  const openOfferListing = (item) => {
    if (!onNavigate) return
    onNavigate(`/listing/${item.id}`)
  }

  return (
    <div className={`beach-page${pageClassName ? ` ${pageClassName}` : ''}`} data-testid={hero.testId}>
      <section className="beach-hero collection-hero" aria-label={collectionLabel}>
        <div className="collection-hero__stage">
          <div className="collection-hero__media">
            <img
              className={`beach-hero__image${hero.className ? ` ${hero.className}` : ''}`}
              src={hero.src}
              alt={hero.alt}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div className="collection-hero__badge" aria-label={`Catégorie ${badgeLabel}`}>
            <span>{badgeLabel}</span>
            <small>Movera</small>
          </div>
        </div>
        <div className="beach-hero__copy collection-hero__copy">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>

      <section className="beach-discovery" aria-label="Choisir une ville">
        <div className={`beach-city-search${focused ? ' is-focused' : ''}`}>
          <PinIcon />
          <label>
            <span>Où souhaitez-vous aller ?</span>
            <input
              type="text"
              value={cityQuery}
              placeholder="Écrivez une ville"
              autoComplete="off"
              inputMode="search"
              aria-label="Ville en Tunisie"
              onFocus={() => setFocused(true)}
              onChange={onCityChange}
            />
          </label>
          {cityQuery ? (
            <button className="beach-city-search__clear" type="button" aria-label="Effacer la ville" onClick={() => selectCity('Toutes')}>×</button>
          ) : <SearchIcon />}
          {focused && suggestions.length > 0 ? (
            <div className="beach-city-suggestions" role="listbox" aria-label="Villes suggérées">
              {suggestions.map((name) => (
                <button type="button" role="option" key={name} onMouseDown={(event) => event.preventDefault()} onClick={() => selectCity(name)}>
                  <span><PinIcon /></span>
                  <strong>{name}</strong>
                  <small>Tunisie</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="beach-quick-head">
          <span>Accès rapide</span>
          <button type="button" onClick={() => { setCityQuery(''); setCity(''); setFocused(true) }}>Toutes les villes</button>
        </div>
        <div className="beach-city-chips" aria-label="Villes populaires">
          {QUICK_CITIES.map((name) => {
            const active = name === 'Toutes' ? !city && !cityQuery : normalize(city || cityQuery) === normalize(name)
            return (
              <button key={name} type="button" data-active={active ? 'true' : 'false'} onClick={() => selectCity(name)}>
                {name}
              </button>
            )
          })}
        </div>
      </section>

      <section className="beach-results" aria-live="polite">
        <header className="beach-results__head">
          <div>
            <span>{city || cityQuery ? `Séjours à ${city || cityQuery}` : allResultsLabel}</span>
            <h2>{visibleOffers.length ? `${visibleOffers.length} adresse${visibleOffers.length > 1 ? 's' : ''} sélectionnée${visibleOffers.length > 1 ? 's' : ''}` : 'Aucune adresse pour le moment'}</h2>
          </div>
          <span className="beach-results__count">{visibleOffers.length}</span>
        </header>

        <MotionList className="beach-offer-list" data-motion-list="collection-offers">
          {visibleOffers.map((item, index) => {
            const favorite = favoriteIdSet.has(item.id)
            const ratingLabel = item.rating ? `★ ${item.rating}` : 'Nouveau'
            return (
              <MotionListItem
                as="article"
                className="beach-offer"
                key={item.id}
                index={index}
                config={COLLECTION_OFFER_MOTION}
                data-offer-id={item.id}
                data-origin={item.origin || 'seed'}
                role="link"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                aria-label={`Voir ${item.title}`}
                onClick={() => openOfferListing(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openOfferListing(item)
                  }
                }}
              >
                <div className="beach-offer__media">
                  {item.image ? <OptimizedListingImage src={item.image} alt="" loading="lazy" sizes="(max-width:430px) 100vw, 520px" /> : <span aria-hidden="true">MH</span>}
                  {!item.highlightBadges?.length ? <span className="beach-offer__badge">{item.badge || badgeLabel}</span> : null}
                  <button type="button" className="beach-offer__heart" data-active={favorite ? 'true' : 'false'} aria-pressed={favorite} aria-label={`${favorite ? 'Retirer' : 'Ajouter'} ${item.title} ${favorite ? 'des' : 'aux'} favoris`} onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id) }}>
                    <HeartIcon />
                  </button>
                  <span className="beach-offer__rating">{ratingLabel}</span>
                </div>
                <div className="beach-offer__body">
                  <div>
                    <span className="beach-offer__location"><PinIcon />{item.location}{item.location ? ', Tunisie' : ''}</span>
                    <h3>{item.title}</h3>
                    <ListingHighlightBadges badges={item.highlightBadges} variant="collection" />
                  </div>
                  <div className="beach-offer__price">
                    <strong>{item.priceLabel || item.priceTotal || `${item.price ?? ''} ${item.currency ?? ''}`.trim() || 'Tarif à confirmer'}</strong>
                    {item.priceLabel || item.priceTotal ? null : <span>/ nuit</span>}
                  </div>
                </div>
                <div className="beach-offer__actions">
                  <button
                    type="button"
                    className="beach-offer__map-button"
                    aria-label={`Voir ${item.title} sur la carte`}
                    onClick={(event) => { event.stopPropagation(); openOfferOnMap(item) }}
                  >
                    <span className="beach-offer__map-icon"><MapIcon /></span>
                    <span className="beach-offer__map-copy"><strong>Voir sur la carte</strong><small>Localiser cette adresse</small></span>
                    <span className="beach-offer__map-arrow" aria-hidden="true">›</span>
                  </button>
                </div>
              </MotionListItem>
            )
          })}
        </MotionList>

        {!visibleOffers.length ? (
          <div className="beach-empty">
            <span>◌</span>
            <h3>{emptyTitle}</h3>
            <p>Essayez une autre ville ou affichez toute la collection.</p>
            <button type="button" onClick={() => selectCity('Toutes')}>Voir toutes les offres</button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
