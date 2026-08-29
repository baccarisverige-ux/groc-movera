import { useState } from 'react'
import { clearHostCalendar } from '../../entities/host/hostCalendarStore.js'
import { clearHostProfile, useHostProfile } from '../../entities/host/hostProfileStore.js'
import { authProviderLabel } from '../auth/authClient.js'
import { clearAuthSession, useAuthSession } from '../auth/authSession.js'
import './connected-profile-page.css'

function BellIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 5.5 2 5.5h-15s2-.5 2-5.5Z"/><path d="M9.5 18a2.8 2.8 0 0 0 5 0"/></svg>
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"/><path d="m9.2 12 1.8 1.8 3.9-4"/></svg>
}

function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 5.8a5.3 5.3 0 0 0-7.5 0L12 7.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 22l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"/></svg>
}

function MessageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z"/></svg>
}

function HostIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 12 5l8 7"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M9 20v-5h6v5"/></svg>
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a7 7 0 0 0-1.7-1L14.3 3h-4.6l-.4 3a7 7 0 0 0-1.7 1l-2.5-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a7 7 0 0 0 1.7 1l.4 3h4.6l.4-3a7 7 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z"/></svg>
}

function HelpIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 9.3a2.4 2.4 0 1 1 3.7 2c-1 .7-1.5 1.2-1.5 2.4"/><path d="M12 17h.01"/></svg>
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
}

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6Z"/><path d="M14 3v4h4M9 12h6M9 16h5"/></svg>
}

function LogoutIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4M18 12H9"/></svg>
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
}

const SUPPORT_ROWS = [
  { id: 'settings', label: 'Paramètres du compte', detail: 'Identité, sécurité et préférences', Icon: SettingsIcon },
  { id: 'help', label: 'Aide et assistance', detail: 'Centre d’aide Movera', Icon: HelpIcon },
  { id: 'privacy', label: 'Confidentialité', detail: 'Données et autorisations', Icon: LockIcon },
  { id: 'legal', label: 'Informations légales', detail: 'Conditions et politique Movera', Icon: DocumentIcon },
]

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
      <header className="connected-profile__header">
        <div>
          <span className="connected-profile__eyebrow">Votre espace</span>
          <h1>Profil</h1>
        </div>
        <button type="button" className="connected-profile__bell" aria-label="Notifications" onClick={() => showPrototypeNotice('Notifications')}>
          <BellIcon />
        </button>
      </header>

      <main className="connected-profile__content">
        <section className="connected-profile__identity" aria-label="Profil Movera">
          <div className="connected-profile__avatar-wrap">
            <div className="connected-profile__avatar" aria-hidden="true">{initial}</div>
            <span className="connected-profile__verified" aria-label="Session vérifiée"><ShieldIcon /></span>
          </div>
          <div className="connected-profile__identity-copy">
            <strong>{displayName}</strong>
            <span>{isHost ? 'Voyageur & Hôte Movera' : 'Voyageur Movera'}</span>
            <small>{contact}</small>
          </div>
          <div className="connected-profile__session">
            <i aria-hidden="true" />
            <span>Session Movera active</span>
          </div>
        </section>

        <section className="connected-profile__quick-grid" aria-label="Raccourcis">
          <button type="button" className="connected-profile__quick-card" onClick={() => onNavigate('/favorites')}>
            <span className="connected-profile__quick-icon"><HeartIcon /></span>
            <span><strong>Favoris</strong><small>Vos lieux enregistrés</small></span>
            <ChevronIcon />
          </button>
          <button type="button" className="connected-profile__quick-card" onClick={() => onNavigate('/messages')}>
            <span className="connected-profile__quick-icon"><MessageIcon /></span>
            <span><strong>Messages</strong><small>Vos échanges récents</small></span>
            <ChevronIcon />
          </button>
        </section>

        <section className="connected-profile__host-card" aria-label={isHost ? 'Ouvrir le mode Hôte' : 'Devenir hôte'}>
          <div className="connected-profile__host-symbol"><HostIcon /></div>
          <div className="connected-profile__host-copy">
            <span>{isHost ? 'Mode Hôte' : 'Devenir hôte'}</span>
            <strong>{isHost ? 'Votre calendrier vous attend.' : 'Accueillez autrement.'}</strong>
            <p>{isHost ? 'Ouvrez votre espace Hôte et gérez les disponibilités de votre logement.' : 'Créez votre espace Hôte en quelques étapes, puis pilotez prix et disponibilités depuis le calendrier.'}</p>
          </div>
          <button type="button" className="connected-profile__host-button" onClick={requestHostMode} data-testid="switch-to-hosting">
            <span>{isHost ? 'Ouvrir l’espace Hôte' : 'Devenir hôte'}</span>
            <ChevronIcon />
          </button>
          {isDemoSession && isHost ? (
            <button type="button" className="connected-profile__host-button" onClick={restartDemoHostOnboarding} data-testid="restart-host-onboarding">
              <span>Recommencer « Devenir hôte »</span>
              <ChevronIcon />
            </button>
          ) : null}
        </section>

        <section className="connected-profile__settings" aria-label="Compte et assistance">
          <div className="connected-profile__section-heading">
            <span>Compte & assistance</span>
            <small>Connecté avec {provider}</small>
          </div>
          <div className="connected-profile__rows">
            {SUPPORT_ROWS.map(({ id, label, detail, Icon }) => (
              <button key={id} type="button" className="connected-profile__row" onClick={() => showPrototypeNotice(label)}>
                <span className="connected-profile__row-icon"><Icon /></span>
                <span className="connected-profile__row-copy"><strong>{label}</strong><small>{detail}</small></span>
                <ChevronIcon />
              </button>
            ))}
          </div>
        </section>

        {notice ? <div className="connected-profile__notice" role="status">{notice}</div> : null}

        <button type="button" className="connected-profile__logout" onClick={signOut}>
          <LogoutIcon />
          <span>Se déconnecter</span>
        </button>
      </main>
    </section>
  )
}
