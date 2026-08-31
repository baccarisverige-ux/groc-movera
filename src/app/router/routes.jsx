import { lazy } from 'react'
import { HomePage } from '../../features/home/HomePage.jsx'
import { BeachPage } from '../../features/beach/BeachPage.jsx'
import { GuestHousePage } from '../../features/guesthouse/GuestHousePage.jsx'
import { HotelPage } from '../../features/hotel/HotelPage.jsx'
import { ApartmentPage } from '../../features/apartment/ApartmentPage.jsx'
import { VillaPage } from '../../features/villa/VillaPage.jsx'
import { MapPage } from '../../features/map/MapPage.jsx'
import { FavoritesPage } from '../../features/favorites/FavoritesPage.jsx'
import { MessagesPage } from '../../features/messages/MessagesPage.jsx'
import { MessageThreadPage } from '../../features/messages/MessageThreadPage.jsx'
import { ProfileGatewayPage } from '../../features/profile/ProfileGatewayPage.jsx'
import { HostEntryPage } from '../../features/host/HostEntryPage.jsx'
import { ListingDetailPage } from '../../features/listing/ListingDetailPage.jsx'
import { ServiceRequestPage } from '../../features/services/ServiceRequestPage.jsx'
import '../../features/auth/auth-required-page.css'

const lazyNamed = (loader, name) => lazy(() => loader().then(module => ({ default: module[name] })))

function MissingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.2" r=".9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function NotFoundPage({ onNavigate }) {
  return (
    <section className="auth-required-page not-found" data-testid="page-404" aria-labelledby="not-found-title">
      <div className="auth-required-card">
        <div className="auth-required-icon"><MissingIcon /></div>
        <span className="auth-required-eyebrow">404</span>
        <h1 id="not-found-title">Page introuvable</h1>
        <p>Cette route n’existe pas dans Movera.</p>
        <div className="auth-required-note">
          <span className="auth-required-note__dot" />
          <div>
            <strong>Chemin inconnu</strong>
            <small>Vérifiez l’URL ou revenez à l’accueil pour continuer.</small>
          </div>
        </div>
        <button type="button" onClick={() => onNavigate('/')}>Retour à l’accueil</button>
      </div>
    </section>
  )
}

const labRoutes = import.meta.env.DEV
  ? [
      { path: '/carousel-lab', area: 'guest', component: lazyNamed(() => import('../../features/carousel/CarouselShell.jsx'), 'CarouselLab') },
      { path: '/gesture-lab', area: 'guest', component: lazyNamed(() => import('../../features/carousel/GestureLab.jsx'), 'GestureLab') },
      { path: '/resilience-lab', area: 'guest', component: lazyNamed(() => import('../../features/resilience/ResilienceLab.jsx'), 'ResilienceLab') },
    ]
  : []

const hostRoute = (path, authFeature) => ({ path, area: 'host', component: HostEntryPage, requiresAuth: true, authFeature })

export const routeDefinitions = [
  { path: '/', area: 'guest', component: HomePage },
  { path: '/plage', area: 'guest', component: BeachPage },
  { path: '/maison-d-hote', area: 'guest', component: GuestHousePage },
  { path: '/hotel', area: 'guest', component: HotelPage },
  { path: '/appartement', area: 'guest', component: ApartmentPage },
  { path: '/villa', area: 'guest', component: VillaPage },
  { path: '/map', area: 'guest', component: MapPage },
  { path: '/favorites', area: 'guest', component: FavoritesPage },
  { path: '/listing/:id', area: 'guest', component: ListingDetailPage },
  { path: '/services/:slug', area: 'guest', component: ServiceRequestPage },
  { path: '/messages', area: 'guest', component: MessagesPage, requiresAuth: true, authFeature: 'vos messages' },
  { path: '/messages/:threadId', area: 'guest', component: MessageThreadPage, requiresAuth: true, authFeature: 'vos messages' },
  { path: '/profile', area: 'guest', component: ProfileGatewayPage },
  hostRoute('/host', 'votre espace Hôte'),
  hostRoute('/host/listings', 'vos annonces Hôte'),
  hostRoute('/host/reservations', 'vos réservations Hôte'),
  hostRoute('/host/calendar', 'votre calendrier Hôte'),
  hostRoute('/host/earnings', 'vos revenus Hôte'),
  hostRoute('/host/messages', 'vos messages Hôte'),
  hostRoute('/host/settings', 'vos réglages Hôte'),
  ...labRoutes,
]
