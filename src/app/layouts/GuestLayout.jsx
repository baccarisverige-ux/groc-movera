import '../../styles/guest-bottom-nav.css'
import { useAuthSession } from '../../features/auth/authSession.js'
import { getGuestNavigationPath, isGuestCollectionRoute } from '../../shared/navigation/guestCollectionRoutes.js'

const guestNav = [
  { label: 'Accueil', path: '/', icon: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></> },
  { label: 'Carte', path: '/map', icon: <><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/></> },
  { label: 'Favoris', path: '/favorites', icon: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></> },
  { label: 'Messages', path: '/messages', requiresAuth: true, icon: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></> },
  { label: 'Profil', path: '/profile', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
]

const COLLECTION_HEADER_LABELS = Object.freeze({
  '/plage': 'Collection Plage',
  '/maison-d-hote': "Collection Maison d’hôte",
  '/hotel': 'Collection Hôtel',
  '/appartement': 'Collection Appartement',
  '/villa': 'Collection Villa',
})

const mapShellStyle = { maxWidth: 430, margin: '0 auto', background: '#f3f4f3' }
const mapContentStyle = { padding: 0, overflow: 'hidden' }
const hostShellStyle = { maxWidth: 430, margin: '0 auto', background: '#f4f7f5', gridTemplateColumns: 'minmax(0, 1fr)' }
const hostContentStyle = { padding: 0, overflow: 'visible', background: '#f4f7f5' }
const collectionContentStyle = { paddingTop: 0, paddingLeft: 0, paddingRight: 0, overflow: 'auto', background: '#f7f7f5' }
const stackedContentStyle = { padding: 0, overflow: 'auto', background: '#f7f7f5' }
const profileContentStyle = { padding: 0, overflow: 'auto', background: '#fefefd' }

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
        <strong>Movera</strong>
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
          {guestNav.map(({ label, path, icon, disabled: permanentlyDisabled, requiresAuth }) => {
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
                <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
                <span>{label}</span>
              </AppLink>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
}
