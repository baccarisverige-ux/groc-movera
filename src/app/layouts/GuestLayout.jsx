import '../../styles/guest-bottom-nav.css'
import { useAuthSession } from '../../features/auth/authSession.js'
import { getGuestNavigationPath, isGuestCollectionRoute } from '../../shared/navigation/guestCollectionRoutes.js'

const guestNav = [
  { label: 'Accueil', path: '/', tone: 'home', icon: <><path d="M216,120v96H152V152H104v64H40V120a8,8,0,0,1,2.34-5.66l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,216,120Z" opacity=".2"/><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z"/></> },
  { label: 'Carte', path: '/map', tone: 'map', icon: <><path d="M184,80c0,56-56,88-56,88S72,136,72,80a56,56,0,0,1,112,0Z" opacity=".2"/><path d="M112,80a16,16,0,1,1,16,16A16,16,0,0,1,112,80ZM64,80a64,64,0,0,1,128,0c0,59.95-57.58,93.54-60,94.95a8,8,0,0,1-7.94,0C121.58,173.54,64,140,64,80Zm16,0c0,42.2,35.84,70.21,48,78.5,12.15-8.28,48-36.3,48-78.5a48,48,0,0,0-96,0Zm122.77,67.63a8,8,0,0,0-5.54,15C213.74,168.74,224,176.92,224,184c0,13.36-36.52,32-96,32s-96-18.64-96-32c0-7.08,10.26-15.26,26.77-21.36a8,8,0,0,0-5.54-15C29.22,156.49,16,169.41,16,184c0,31.18,57.71,48,112,48s112-16.82,112-48C240,169.41,226.78,156.49,202.77,147.63Z"/></> },
  { label: 'Favoris', path: '/favorites', tone: 'favorites', icon: <><path d="M232,102c0,66-104,122-104,122S24,168,24,102A54,54,0,0,1,78,48c22.59,0,41.94,12.31,50,32,8.06-19.69,27.41-32,50-32A54,54,0,0,1,232,102Z" opacity=".2"/><path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z"/></> },
  { label: 'Messages', path: '/messages', tone: 'messages', requiresAuth: true, icon: <><path d="M224,128A96,96,0,0,1,79.93,211.11L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39A96,96,0,1,1,224,128Z" opacity=".2"/><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.53-.66L40,216l12.47-37.4a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/></> },
  { label: 'Profil', path: '/profile', tone: 'profile', icon: <><path d="M224,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37A96,96,0,1,1,224,128Z" opacity=".2"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></> },
]

const COLLECTION_HEADER_LABELS = Object.freeze({
  '/plage': 'Collection Plage',
  '/maison-d-hote': "Collection Maison d’hôte",
  '/hotel': 'Collection Hôtel',
  '/appartement': 'Collection Appartement',
  '/villa': 'Collection Villa',
})

const screenBackground = 'var(--color-screen-bg)'
const mapShellStyle = { maxWidth: 430, margin: '0 auto', background: screenBackground }
const mapContentStyle = { padding: 0, overflow: 'hidden', background: screenBackground }
const hostShellStyle = { maxWidth: 430, margin: '0 auto', background: screenBackground, gridTemplateColumns: 'minmax(0, 1fr)' }
const hostContentStyle = { padding: 0, overflow: 'visible', background: screenBackground }
const collectionContentStyle = { paddingTop: 0, paddingLeft: 0, paddingRight: 0, overflow: 'auto', background: screenBackground }
const stackedContentStyle = { padding: 0, overflow: 'auto', background: screenBackground }
const profileContentStyle = { padding: 0, overflow: 'auto', background: screenBackground }

function AppLink({ children, className, href, onNavigate, active, disabled = false }) {
  return (
    <a
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      className={className}
      data-active={active ? 'true' : 'false'}
      href={href}
      onClick={(event) => {
        event.preventDefault()
        if (disabled) return
        onNavigate(href)
      }}
    >
      {children}
    </a>
  )
}

export function GuestLayout({ children, currentPath, onNavigate }) {
  const { isAuthenticated } = useAuthSession()
  const activePath = currentPath.startsWith('/messages/') ? '/messages' : getGuestNavigationPath(currentPath)
  const isMapRoute = currentPath === '/map'
  const isHostRoute = currentPath === '/host' || currentPath.startsWith('/host/')
  const isCollectionRoute = isGuestCollectionRoute(currentPath)
  const isBeachRoute = currentPath === '/plage'
  const isStackedGuestRoute = currentPath.startsWith('/listing/') || currentPath.startsWith('/services/')
  const isProfileRoute = currentPath === '/profile'
  const collectionHeaderLabel = COLLECTION_HEADER_LABELS[currentPath] || ''
  const shellStyle = isMapRoute ? mapShellStyle : isHostRoute ? hostShellStyle : undefined
  const contentStyle = isMapRoute
    ? mapContentStyle
    : isHostRoute
      ? hostContentStyle
      : isCollectionRoute
        ? collectionContentStyle
        : isStackedGuestRoute
          ? stackedContentStyle
          : isProfileRoute
            ? profileContentStyle
            : undefined

  return (
    <div className={`app-shell app-shell--guest${isMapRoute ? ' app-shell--map' : ''}${isHostRoute ? ' app-shell--host' : ''}${isCollectionRoute ? ' app-shell--collection' : ''}${isBeachRoute ? ' app-shell--beach' : ''}${isStackedGuestRoute ? ' app-shell--stacked' : ''}${isProfileRoute ? ' app-shell--profile' : ''}`} style={shellStyle}>
      <header className="app-shell__header" style={isMapRoute || isHostRoute || isStackedGuestRoute || isProfileRoute ? { display: 'none' } : undefined}>
        <strong>Movera Host</strong>
        {collectionHeaderLabel ? <span className="app-shell__collection-badge">{collectionHeaderLabel}</span> : null}
      </header>
      <main
        className="app-shell__content"
        id="main-content"
        tabIndex={-1}
        style={contentStyle}
      >
        {children}
      </main>
      {!isMapRoute && !isHostRoute && !isStackedGuestRoute ? (
        <nav className="app-shell__nav" aria-label="Navigation principale">
          {guestNav.map(({ label, path, tone, icon, disabled: permanentlyDisabled, requiresAuth }) => {
            const disabled = Boolean(permanentlyDisabled || (requiresAuth && !isAuthenticated))
            return (
              <AppLink
                active={activePath === path}
                className="app-shell__nav-item"
                href={path}
                key={path}
                onNavigate={onNavigate}
                disabled={disabled}
              >
                <div className="app-shell__nav-icon" data-tone={tone} aria-hidden="true">
                  <svg viewBox="0 0 256 256">{icon}</svg>
                </div>
                <span className="app-shell__nav-label">{label}</span>
              </AppLink>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
}
