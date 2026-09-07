import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BEACH_HERO_IMAGE from './features/beach/assets/hero.webp'
import GUESTHOUSE_HERO_IMAGE from './features/guesthouse/assets/hero.webp'
import HOTEL_HERO_IMAGE from './features/hotel/assets/hero.webp'
import './index.css'
import './styles/partner-category.css'
import './styles/category-luxury-3d.css'
import './styles/collection-card-size.css'
import './styles/home-scroll-link.css'
import './styles/welcome-city-cards.css'
import './styles/search-open-slow.css'
import './styles/search-motion-very-slow.css'
import './styles/search-popup-continuity.css'
import './styles/search-close-sync.css'
import './styles/search-hit-target-fix.css'
import './styles/property-type-native-bundled.css'
import './styles/property-type-premium-bundled.css'
import './styles/property-type-artwork-bundled.css'
import './styles/host-onboarding-stackblitz-sync.css'
import './styles/host-pin-layout-polish.css'
import './styles/app-premium-surface.css'
import './styles/guest-chrome-authority.css'
import './styles/map-offer-sheet-premium.css'
import './styles/hotel-guesthouse-design.css'
import './features/home/homeScrollLink.js'
import './features/search/searchOpenFocusGuard.js'
import './features/host/onboarding/hostAddressLocationEnhancer.js'
import './features/host/onboarding/host-address-location.css'
import { installPropertyArtworkRuntime } from './features/host/onboarding/propertyArtworkRuntime.js'
import { installGeocodingBrowserBridge } from './services/geocoding/browserBridge.js'
import { toInternalPath } from './app/router/basePath.js'
import App from './app/App.jsx'

installPropertyArtworkRuntime()
installGeocodingBrowserBridge(window)

// The address-driven React pin map is the normal host onboarding map.
// It is still code-split so the guest app does not pay for it until needed.
import('./features/host/onboarding/hostPinReactEngineEnhancer.jsx')
  .then(({ installHostPinReactEngine }) => installHostPinReactEngine())
  .catch(() => {})

/* These are the collection pages' LCP images. Preloading them at high priority
   pays off on Home, where a collection card is the likely next tap, and on a
   collection route itself. Everywhere else — Map, Profile, listings, Host
   onboarding — all three were still being fetched and decoded at high priority
   without ever being shown: 147 kB per load spent on images the route cannot
   display, competing with the assets it actually needs. */
const COLLECTION_HERO_PRELOADS = {
  '/plage': [BEACH_HERO_IMAGE],
  '/maison-d-hote': [GUESTHOUSE_HERO_IMAGE],
  '/hotel': [HOTEL_HERO_IMAGE],
}

function collectionHeroesToPreload(pathname) {
  const route = toInternalPath(pathname)
  if (route === '/') return [BEACH_HERO_IMAGE, GUESTHOUSE_HERO_IMAGE, HOTEL_HERO_IMAGE]
  return COLLECTION_HERO_PRELOADS[route] || []
}

for (const src of collectionHeroesToPreload(window.location.pathname)) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = src
  link.setAttribute('fetchpriority', 'high')
  document.head.appendChild(link)

  const image = new Image()
  image.decoding = 'async'
  image.fetchPriority = 'high'
  image.src = src
  image.decode?.().catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
