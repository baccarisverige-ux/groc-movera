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

const lazyNamed = (loader, name) => lazy(() => loader().then(module => ({ default: module[name] })))
const CarouselLab = lazyNamed(() => import('../../features/carousel/CarouselShell.jsx'), 'CarouselLab')
const GestureLab = lazyNamed(() => import('../../features/carousel/GestureLab.jsx'), 'GestureLab')
const ResilienceLab = lazyNamed(() => import('../../features/resilience/ResilienceLab.jsx'), 'ResilienceLab')

export function NotFoundPage({ onNavigate }) { return <main className="not-found" data-testid="page-404"><p className="route-page__eyebrow">404</p><h1>Page introuvable</h1><p>Cette route n’existe pas dans Movera Host.</p><button className="route-link-button" onClick={() => onNavigate('/')}>Retour à l’accueil</button></main> }
export const routeDefinitions = [
  { path: '/', area: 'guest', component: HomePage },
  { path: '/plage', area: 'guest', component: BeachPage },
  { path: '/maison-d-hote', area: 'guest', component: GuestHousePage },
  { path: '/hotel', area: 'guest', component: HotelPage },
  { path: '/appartement', area: 'guest', component: ApartmentPage },
  { path: '/villa', area: 'guest', component: VillaPage },
  { path: '/map', area: 'guest', component: MapPage },
  { path: '/favorites', area: 'guest', component: FavoritesPage },
  { path: '/messages', area: 'guest', component: MessagesPage, requiresAuth: true, authFeature: 'vos messages' },
  { path: '/messages/:threadId', area: 'guest', component: MessageThreadPage, requiresAuth: true, authFeature: 'vos messages' },
  { path: '/profile', area: 'guest', component: ProfileGatewayPage },
  { path: '/host', area: 'host', component: HostEntryPage, requiresAuth: true, authFeature: 'votre espace Hôte' },
  { path: '/host/calendar', area: 'host', component: HostEntryPage, requiresAuth: true, authFeature: 'votre calendrier Hôte' },
  { path: '/carousel-lab', area: 'guest', component: CarouselLab },
  { path: '/gesture-lab', area: 'guest', component: GestureLab },
  { path: '/resilience-lab', area: 'guest', component: ResilienceLab },
]
