import { useRef, useState } from 'react'
import { clearHostCalendar } from '../../entities/host/hostCalendarStore.js'
import { clearHostProfile, useHostProfile } from '../../entities/host/hostProfileStore.js'
import { authProviderLabel } from '../auth/authClient.js'
import { clearAuthSession, useAuthSession } from '../auth/authSession.js'
import tripsArt from './assets/profile-trips.webp'
import favoritesArt from './assets/profile-favorites.webp'
import './connected-profile-page.css'

function BellIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 5.5 2 5.5h-15s2-.5 2-5.5Z"/><path d="M9.5 18a2.8 2.8 0 0 0 5 0"/></svg>
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.2 12.2 3.6 3.6 8-8"/></svg>
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a7 7 0 0 0-1.7-1L14.3 3h-4.6l-.4 3a7 7 0 0 0-1.7 1l-2.5-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a7 7 0 0 0 1.7 1l.4 3h4.6l.4-3a7 7 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z"/></svg>
}

function HelpIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 9.3a2.4 2.4 0 1 1 3.7 2c-1 .7-1.5 1.2-1.5 2.4"/><path d="M12 17h.01"/></svg>
}

function PersonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.6 19.2c.8-3.5 3.1-5.2 6.4-5.2s5.6 1.7 6.4 5.2"/></svg>
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
}

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6Z"/><path d="M14 3v4h4M9 12h6M9 16h5"/></svg>
}

function MessageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z"/></svg>
}

function LogoutIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4M18 12H9"/></svg>
}

function HostGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 12 5l8 7"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M9 20v-5h6v5"/></svg>
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
}

const SUPPORT_ROWS = [
  { id: 'settings', label: 'Paramètres du compte', Icon: SettingsIcon },
  { id: 'help', label: 'Aide et assistance', Icon: HelpIcon },
  { id: 'view-profile', label: 'Voir le profil', Icon: PersonIcon },
  { id: 'privacy', label: 'Confidentialité', Icon: LockIcon },
]

const LEGAL_ROWS = [
  { id: 'legal', label: 'Informations légales', Icon: DocumentIcon },
]

const PROFILE_SLOT_ART = {
  'profile-trips': tripsArt,
  'profile-favorites': favoritesArt,
}

function IllustrationSlot({ name, className = '' }) {
  const src = PROFILE_SLOT_ART[name]
  return (
    <div className={`connected-profile__slot${className ? ` ${className}` : ''}${src ? ' connected-profile__slot--photo' : ''}`} data-slot={name} aria-hidden="true">
      {src ? <img src={src} alt="" /> : null}
    </div>
  )
}

function HostCardVideo() {
  const videosRef = useRef([])
  const [active, setActive] = useState(0)
  const sources = [
    `${import.meta.env.BASE_URL}assets/profile-host.mp4?v=hostcard2`,
    `${import.meta.env.BASE_URL}assets/profile-host-2.mp4?v=hostcard2`,
  ]

  const playClip = (index) => {
    videosRef.current.forEach((video, i) => {
      if (!video) return
      if (i === index) {
        video.currentTime = 0
        const playPromise = video.play()
        if (playPromise?.catch) playPromise.catch(() => {})
      } else {
        video.pause()
      }
    })
  }

  return (
    <div className="connected-profile__slot connected-profile__slot--host connected-profile__slot--video" data-slot="profile-host" aria-hidden="true">
      {sources.map((src, index) => (
        <video
          key={src}
          ref={(node) => { videosRef.current[index] = node }}
          className="connected-profile__host-video"
          data-active={index === active ? 'true' : 'false'}
          src={src}
          muted
          playsInline
          autoPlay={index === 0}
          preload="auto"
          tabIndex={-1}
          onEnded={() => {
            const next = (index + 1) % sources.length
            setActive(next)
            playClip(next)
          }}
        />
      ))}
    </div>
  )
}

export function ConnectedProfilePage({ onNavigate }) {
  const { session } = useAuthSession()
  const { isHost } = useHostProfile(session?.userId)
  const [notice, setNotice] = useState('')
  const displayName = session?.displayName || 'Voyageur Movera'
  const initial = displayName.charAt(0).toUpperCase()
  const contact = session?.email || session?.phone || 'Compte Movera'
  const provider = authProviderLabel(session?.provider)
  const isDemoSession = session?.provider === 'demo'

  const signOut = () => {
    clearAuthSession()
    setNotice('')
  }

  const requestHostMode = () => {
    setNotice('')
    const event = new CustomEvent('movera:host-mode-request', {
      cancelable: true,
      detail: { source: 'profile', firstTime: !isHost, target: '/host' },
    })
    const continueNavigation = window.dispatchEvent(event)
    if (continueNavigation) onNavigate('/host')
  }

  const restartDemoHostOnboarding = () => {
    if (!isDemoSession || !session?.userId) return
    clearHostCalendar(session.userId)
    clearHostProfile(session.userId)
    setNotice('')
    onNavigate('/host')
  }

  const showPrototypeNotice = (label) => {
    setNotice(`${label} sera disponible dans l’espace compte Movera.`)
  }

  return (
    <section className="connected-profile" data-testid="page-profile" data-auth-flow="connected">
      {/* drop profile-avatar.png into src/features/profile/assets/ later */}
      <header className="connected-profile__header">
        <h1>Profil</h1>
        <button type="button" className="connected-profile__bell" aria-label="Notifications" onClick={() => showPrototypeNotice('Notifications')}>
          <BellIcon />
        </button>
      </header>

      <main className="connected-profile__content">
        <section className="connected-profile__identity" aria-label="Profil Movera">
          <div className="connected-profile__avatar-wrap">
            <div className="connected-profile__avatar" data-slot="profile-avatar" aria-hidden="true">{initial}</div>
            <span className="connected-profile__verified" aria-label="Session vérifiée"><CheckIcon /></span>
          </div>
          <div className="connected-profile__identity-copy">
            <strong>{displayName}</strong>
            <span>{isHost ? 'Voyageur & Hôte Movera' : 'Voyageur Movera'}</span>
          </div>
        </section>

        <p className="connected-profile__contact">
          <span>{contact}</span>
          <small>Session Movera active</small>
        </p>

        <section className="connected-profile__quick-grid" aria-label="Raccourcis">
          <button type="button" className="connected-profile__quick-card" onClick={() => showPrototypeNotice('Voyages')}>
            <span className="connected-profile__nouveau">Nouveau</span>
            <IllustrationSlot name="profile-trips" />
            <strong>Voyages</strong>
          </button>
          <button type="button" className="connected-profile__quick-card" onClick={() => onNavigate('/favorites')}>
            <IllustrationSlot name="profile-favorites" />
            <strong>Favoris</strong>
          </button>
        </section>

        <section className="connected-profile__host-card" aria-label={isHost ? 'Ouvrir le mode Hôte' : 'Devenir hôte'} onClick={requestHostMode}>
          <div className="connected-profile__host-copy">
            <strong>{isHost ? 'Espace Hôte' : 'Devenir hôte'}</strong>
            <p>{isHost ? 'Votre calendrier vous attend.' : 'Publiez un logement et gagnez à votre rythme.'}</p>
          </div>
          <HostCardVideo />
          <button
            type="button"
            className="connected-profile__host-cta"
            onClick={(event) => {
              event.stopPropagation()
              requestHostMode()
            }}
            data-testid="switch-to-hosting"
          >
            <HostGlyph />
            <span>{isHost ? 'Ouvrir l’espace Hôte' : 'Passer en mode Hôte'}</span>
          </button>
        </section>

        {isDemoSession && isHost ? (
          <button type="button" className="connected-profile__restart" onClick={restartDemoHostOnboarding} data-testid="restart-host-onboarding">
            Recommencer « Devenir hôte »
          </button>
        ) : null}

        <section className="connected-profile__settings" aria-label="Compte et assistance">
          <div className="connected-profile__section-heading">
            <span>Compte</span>
            <small>Connecté avec {provider}</small>
          </div>
          <div className="connected-profile__rows">
            {SUPPORT_ROWS.map(({ id, label, Icon }) => (
              <button key={id} type="button" className="connected-profile__row" onClick={() => showPrototypeNotice(label)}>
                <span className="connected-profile__row-icon"><Icon /></span>
                <span className="connected-profile__row-copy"><strong>{label}</strong></span>
                <ChevronIcon />
              </button>
            ))}
          </div>
          <div className="connected-profile__rows">
            {LEGAL_ROWS.map(({ id, label, Icon }) => (
              <button key={id} type="button" className="connected-profile__row" onClick={() => showPrototypeNotice(label)}>
                <span className="connected-profile__row-icon"><Icon /></span>
                <span className="connected-profile__row-copy"><strong>{label}</strong></span>
                <ChevronIcon />
              </button>
            ))}
            <button type="button" className="connected-profile__row" onClick={() => onNavigate('/messages')}>
              <span className="connected-profile__row-icon"><MessageIcon /></span>
              <span className="connected-profile__row-copy"><strong>Messages</strong></span>
              <ChevronIcon />
            </button>
            <button type="button" className="connected-profile__row connected-profile__row--logout" onClick={signOut}>
              <span className="connected-profile__row-icon"><LogoutIcon /></span>
              <span className="connected-profile__row-copy"><strong>Se déconnecter</strong></span>
            </button>
          </div>
        </section>

        {notice ? <div className="connected-profile__notice" role="status">{notice}</div> : null}
      </main>
    </section>
  )
}
