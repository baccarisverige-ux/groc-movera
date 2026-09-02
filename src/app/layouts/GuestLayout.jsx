import '../../styles/guest-bottom-nav.css'
import { useAuthSession } from '../../features/auth/authSession.js'
import { getGuestNavigationPath, isGuestCollectionRoute } from '../../shared/navigation/guestCollectionRoutes.js'

const guestNav = [
  { label: 'Accueil', path: '/', icon: <><path d="M3.75 10.5 12 3.75l8.25 6.75"/><path d="M5.25 9.75v10.5h13.5V9.75"/><path d="M9 20.25v-6h6v6"/></> },
  { label: 'Carte', path: '/map', icon: <><path d="M3 5.25 8.25 3l7.5 3L21 3.75v15L15.75 21l-7.5-3L3 20.25z"/><path d="M8.25 3v15"/><path d="M15.75 6v15"/></> },
  { label: 'Favoris', path: '/favorites', icon: <><path d="M12 20.25S4.5 16.1 4.5 9.6A4.35 4.35 0 0 1 12 6.67 4.35 4.35 0 0 1 19.5 9.6C19.5 16.1 12 20.25 12 20.25z"/></> },
  { label: 'Messages', path: '/messages', requiresAuth: true, icon: <><path d="M20.25 11.25a8.25 8.25 0 0 1-8.25 8.25 8.05 8.05 0 0 1-3.67-.87L4.5 19.5l.87-3.83A8.05 8.05 0 0 1 4.5 12a8.25 8.25 0 1 1 15.75-.75z"/><circle cx="9" cy="12" r=".6"/><circle cx="12" cy="12" r=".6"/><circle cx="15" cy="12" r=".6"/></> },
  { label: 'Profil', path: '/profile', icon: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6.75 18.15c1.28-2.1 3.02-3.15 5.25-3.15s3.97 1.05 5.25 3.15"/></> },
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
