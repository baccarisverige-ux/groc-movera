import { Fragment, useMemo, useRef, useState } from 'react'
import { getCollectionRouteForCategory } from '../../shared/navigation/guestCollectionRoutes.js'
import { MotionList, MotionListItem } from '../../shared/motion/MotionList.jsx'
import { useFavorites } from '../favorites/favoritesStore.js'
import { homeCategories, homeCategoryOffers } from './data/homeData.js'
import { getSelectedHomeCategory, setSelectedHomeCategory } from './homeCategorySelection.js'
import { useImmediateCategorySwipe } from './useImmediateCategorySwipe.js'
import '../../styles/home-b225.css'
import '../../styles/home-b225-block2.css'
import '../../styles/home-b225-block3.css'
import '../../styles/home-map-search-copy.css'
import '../../styles/home-section-alignment.css'
import '../../styles/home-premium-polish.css'
import '../../styles/home-mirror-header.css'
import '../../styles/home-reference-gloss.css'
import '../../styles/home-airbnb-surface.css'
import '../../styles/home-category-6d.css'
import '../../styles/home-category-offers.css'
import '../../styles/home-see-all-card.css'
import '../../styles/home-services-mini.css'
import '../../styles/home-sizing-adjustments.css'
import '../../styles/home-scroll-stability.css'
import ALL_CATEGORY_GLOBE from './assets/all-category-globe.png'
import BEACH_CATEGORY_ICON from './assets/plage-category.png'
import HOTEL_CATEGORY_ICON from './assets/hotel-category.png'
import APPARTEMENT_CATEGORY_ICON from './assets/appartement-category.png'
import GUESTHOUSE_CATEGORY_ICON from './assets/maison-hote-category.png'
import VILLA_CATEGORY_ICON from './assets/villa-category.png'
import EXPERIENCE_CATEGORY_ICON from './assets/experience-category.webp'
import PARTNER_CATEGORY_ICON from './assets/partner-category.png'

const CATEGORY_ARTWORK = {
  all: ALL_CATEGORY_GLOBE,
  guesthouse: GUESTHOUSE_CATEGORY_ICON,
  beach: BEACH_CATEGORY_ICON,
  hotel: HOTEL_CATEGORY_ICON,
  family: APPARTEMENT_CATEGORY_ICON,
  prestige: VILLA_CATEGORY_ICON,
  experience: EXPERIENCE_CATEGORY_ICON,
  partner: PARTNER_CATEGORY_ICON,
}

const HOME_OFFER_MOTION = Object.freeze({
  enterScale: 0.99,
  enterY: 8,
  exitScale: 0.99,
  exitY: -4,
  initialOpacity: 0.78,
  layout: true,
  stagger: 0.018,
  tapScale: 0.988,
  spring: Object.freeze({ stiffness: 390, damping: 34, mass: 0.75 }),
})

const WELCOME_CITIES = [
  { id: 'sidi-bou-said', label: 'Sidi Bou Saïd' },
  { id: 'sousse', label: 'Sousse' },
  { id: 'hammamet', label: 'Hammamet' },
  { id: 'tunis', label: 'Tunis' },
  { id: 'djerba', label: 'Djerba' },
  { id: 'tozeur', label: 'Tozeur' },
  { id: 'tabarka', label: 'Tabarka' },
]

const HOME_SERVICES = Object.freeze([
  { id: 'driver', label: 'Chauffeur', subtitle: 'À la demande', image: '' },
  { id: 'cleaning', label: 'Ménage', subtitle: 'Pour votre séjour', image: '' },
  { id: 'car-rental', label: 'Location voiture', subtitle: 'Simple & rapide', image: '' },
])

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
}

function ScrollArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 7l5 5-5 5"/></svg>
}

function CategoryArtwork({ id }) {
  const src = CATEGORY_ARTWORK[id]
  return src ? <img className="b225-category-icon" data-category-icon={id} src={src} alt="" aria-hidden="true" decoding="async"/> : null
}

function ListingCard({ item, sectionId, favorite, toggleFavorite, index }) {
  const dates = item.dateLabel || '3–4 sept.'

  return (
    <MotionListItem
      as="article"
      className="b225-offer-card"
      config={HOME_OFFER_MOTION}
      index={index}
      data-testid={`home-card-${sectionId}-${item.id}`}
      aria-label={`${item.title}, ${item.priceTotal}, note ${item.rating}`}
    >
      <div className="b225-offer-card__image">
        <img src={item.image} alt={item.title} loading="lazy" decoding="async"/>
        {item.badge ? <span className="b225-offer-card__badge">{item.badge}</span> : null}
        <button
          type="button"
          className="b225-offer-card__heart"
          data-active={favorite ? 'true' : 'false'}
          aria-pressed={favorite}
          aria-label={`${favorite ? 'Retirer' : 'Ajouter'} ${item.title} ${favorite ? 'des' : 'aux'} favoris`}
          onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id) }}
        >
          {favorite ? '♥' : '♡'}
        </button>
      </div>
      <div className="b225-offer-card__body">
        <h3 className="b225-offer-card__title">{item.title}</h3>
        <p className="b225-offer-card__dates">{dates}</p>
        <p className="b225-offer-card__meta"><strong>{item.priceTotal}</strong><span className="b225-offer-card__dot">·</span><span>★ {item.rating}</span></p>
      </div>
    </MotionListItem>
  )
}

function SeeAllCard({ id, title, items, onNavigate }) {
  const previewItems = items.slice(-3)
  const openAll = () => {
    setSelectedHomeCategory(id)
    const route = getCollectionRouteForCategory(id)
    onNavigate(route || `/map?category=${encodeURIComponent(id)}`)
  }

  return (
    <button
      type="button"
      className="b225-see-all-card"
      data-category={id}
      data-testid={`home-see-all-${id}`}
      onClick={openAll}
      aria-label={`Tout voir dans ${title}`}
    >
      <span className="b225-see-all-card__gallery" aria-hidden="true">
        {previewItems.map((item) => (
          <span key={`${id}-preview-${item.id}`} className="b225-see-all-card__photo">
            <img src={item.image} alt="" loading="lazy" decoding="async"/>
          </span>
        ))}
        <span className="b225-see-all-card__mark">M</span>
      </span>
      <span className="b225-see-all-card__copy">
        <span className="b225-see-all-card__eyebrow">Movera Select</span>
        <span className="b225-see-all-card__title">Tout voir</span>
        <span className="b225-see-all-card__arrow" aria-hidden="true">→</span>
      </span>
    </button>
  )
}

function CategorySelection({ id, title, items, favoriteIdSet, toggleFavorite, onNavigate }) {
  const railRef = useRef(null)
  const scrollForward = () => railRef.current?.scrollBy({ left: Math.max(railRef.current.clientWidth * 0.72, 150), behavior: 'smooth' })

  return (
    <section className="b225-section b225-category-selection" data-category-selection={id} data-testid={`home-selection-${id}`}>
      <div className="b225-section__title b225-category-selection__title">
        <h2>{title}</h2>
        {items.length > 1 ? (
          <button type="button" className="b225-section-scroll-hint" onClick={scrollForward} aria-label={`Faire défiler ${title}`}><ScrollArrowIcon/></button>
        ) : null}
      </div>
      {items.length ? (
        <MotionList nodeRef={railRef} className="b225-offer-scroll" data-motion-list={`home-${id}`}>
          {items.map((item, index) => (
            <ListingCard
              key={`${id}-${item.id}`}
              item={item}
              index={index}
              sectionId={id}
              favorite={favoriteIdSet.has(item.id)}
              toggleFavorite={toggleFavorite}
            />
          ))}
          <SeeAllCard id={id} title={title} items={items} onNavigate={onNavigate}/>
        </MotionList>
      ) : <p className="b225-empty">Sélection à venir.</p>}
    </section>
  )
}

function MiniServicesSection() {
  return (
    <section className="b225-services-mini" data-testid="home-services-mini" aria-label="Services Movera">
      <div className="b225-services-mini__head">
        <h2>Services Movera</h2>
        <span className="b225-services-mini__tag">Essentiels</span>
      </div>
      <div className="b225-services-mini__rail">
        {HOME_SERVICES.map((service) => (
          <article key={service.id} className="b225-service-mini-card" data-service-id={service.id}>
            <span className="b225-service-mini-card__photo" data-empty-photo="true" aria-hidden="true">
              {service.image ? <img src={service.image} alt=""/> : null}
            </span>
            <span className="b225-service-mini-card__copy">
              <strong className="b225-service-mini-card__title">{service.label}</strong>
              <span className="b225-service-mini-card__subtitle">{service.subtitle}</span>
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}

export function HomePage({ onNavigate }) {
  const [category, setCategory] = useState(getSelectedHomeCategory)
  const [query, setQuery] = useState('')
  const { favoriteIds, toggleFavorite } = useFavorites()
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])
  const categoryRailRef = useImmediateCategorySwipe()

  const selectCategory = (item) => {
    setCategory(item.id)
    setSelectedHomeCategory(item.id)
    const route = getCollectionRouteForCategory(item.id)
    if (route) onNavigate(route)
  }

  const categorySelections = useMemo(() => {
    const q = query.trim().toLowerCase()
    return homeCategories.map((item) => ({
      id: item.id,
      title: item.label,
      items: (homeCategoryOffers[item.id] || []).filter((listing) =>
        !q || `${listing.title} ${listing.location}`.toLowerCase().includes(q)
      ),
    }))
  }, [query])

  const allSelection = categorySelections.find((selection) => selection.id === 'all')
  const remainingSelections = categorySelections.filter((selection) => selection.id !== 'all')

  const renderSelection = (selection) => (
    <CategorySelection
      key={selection.id}
      id={selection.id}
      title={selection.title}
      items={selection.items}
      favoriteIdSet={favoriteIdSet}
      toggleFavorite={toggleFavorite}
      onNavigate={onNavigate}
    />
  )

  return (
    <div className="b225-home" data-testid="page-home">
      <header className="b225-home-header">
        <div className="b225-brand">Movera Host</div>
        <label className="b225-search b225-home-map-search" aria-label="Rechercher une destination">
          <SearchIcon/>
          <span className="b225-home-map-search__copy"><strong>Explorez autrement</strong><span>Destination · Dates · Voyageurs</span></span>
          <input data-testid="home-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Destination" readOnly tabIndex={-1}/>
          <span className="b225-home-map-filter-button" aria-hidden="true">≡</span>
        </label>
      </header>

      <div className="b225-categories-shell" aria-label="Catégories">
        <span className="b225-category-swipe-hint b225-category-swipe-hint--overlay" aria-hidden="true"><span>›</span><span>›</span></span>
        <div ref={categoryRailRef} className="b225-categories" data-testid="home-categories">
          <div className="b225-categories-track">
            {homeCategories.map((item) => (
              <Fragment key={item.id}>
                <button type="button" data-category-id={item.id} data-active={category === item.id ? 'true' : 'false'} aria-pressed={category === item.id} onClick={() => selectCategory(item)}>
                  <CategoryArtwork id={item.id}/>{item.label}
                </button>
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <section className="b225-welcome" aria-label="Bienvenue chez Movera">
        <span className="b225-welcome__title">Bienvenue chez Movera</span>
        <div className="b225-welcome-cities" data-testid="home-welcome-cities">
          {WELCOME_CITIES.map((city) => (
            <button key={city.id} type="button" className="b225-welcome-city" data-city-id={city.id} onClick={() => onNavigate(`/map?destination=${city.id}`)} aria-label={`Explorer ${city.label} sur la carte`}>
              {city.label}
            </button>
          ))}
        </div>
      </section>

      <MiniServicesSection/>

      {allSelection ? renderSelection(allSelection) : null}

      {remainingSelections.map(renderSelection)}
    </div>
  )
}
