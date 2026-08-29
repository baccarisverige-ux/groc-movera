import { useEffect, useState } from 'react'
import { startOAuthSignIn } from '../auth/authClient.js'
import { useAuthSession, writeAuthSession } from '../auth/authSession.js'
import { ConnectedProfilePage } from './ConnectedProfilePage.jsx'
import { ProfilePage } from './ProfilePage.jsx'
import './profile-page.css'
import './profile-gateway-page.css'

function AppleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.8 12.8c0-2.7 2.2-4 2.3-4.1-1.2-1.8-3.2-2-3.9-2-1.7-.2-3.2 1-4.1 1-.9 0-2.2-1-3.7-1C5.5 6.8 3.8 8 2.8 9.8c-2 3.5-.5 8.8 1.4 11.6.9 1.4 2 3 3.5 2.9 1.4-.1 2-1 3.8-1s2.3 1 3.8 1c1.6 0 2.6-1.4 3.5-2.8 1.1-1.6 1.5-3.2 1.5-3.3-.1 0-3.5-1.4-3.5-5.4ZM14.1 4.9c.8-1 1.4-2.4 1.2-3.9-1.2.1-2.7.8-3.6 1.8-.8.9-1.4 2.3-1.2 3.7 1.4.1 2.8-.6 3.6-1.6Z"/></svg>
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.3Z"/><path d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6Z"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
}

function TestUserIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/><path d="M18.5 4.5 20 6l2.5-2.5"/></svg>
}

export function ProfileGatewayPage({ onNavigate }) {
  const { isAuthenticated } = useAuthSession()
  const [standardOpen, setStandardOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (isAuthenticated) setStandardOpen(false)
  }, [isAuthenticated])

  const returnTo = (() => {
    const value = new URLSearchParams(window.location.search).get('returnTo')
    return value && value.startsWith('/') && !value.startsWith('//') ? value : ''
  })()

  const startProvider = (provider) => {
    setFeedback(null)
    const result = startOAuthSignIn(provider, returnTo || '/profile')
    if (!result.ok) setFeedback({ type: 'info', message: result.message })
  }

  const startTestSession = () => {
    setFeedback(null)
    writeAuthSession({
      authenticated: true,
      userId: 'movera-demo-user',
      displayName: 'Compte test Movera',
      provider: 'demo',
      email: 'demo@movera.test',
    })
    if (returnTo) onNavigate(returnTo)
  }

  if (isAuthenticated) return <ConnectedProfilePage onNavigate={onNavigate} />

  if (standardOpen) {
    return (
      <div className="profile-standard-gateway">
        <button
          type="button"
          className="profile-gateway-back"
          aria-label="Retour aux options de connexion"
          onClick={() => { setStandardOpen(false); setFeedback(null) }}
        >
          <BackIcon />
        </button>
        <ProfilePage onNavigate={onNavigate} />
      </div>
    )
  }

  return (
    <section className="profile-page profile-gateway-page" data-testid="page-profile" data-auth-flow="entry">
      <header className="profile-login-hero">
        <span className="profile-eyebrow">Movera Host</span>
        <h1>Continuer avec Movera.</h1>
        <p>Choisissez simplement comment vous souhaitez accéder à votre compte.</p>
      </header>

      <div className="profile-login-content profile-gateway-content">
        <div className="profile-social-stack profile-gateway-options" aria-label="Options de connexion">
          <button type="button" className="profile-social-button profile-social-button--apple" onClick={() => startProvider('apple')}>
            <AppleIcon /><span>Continuer avec Apple</span>
          </button>
          <button type="button" className="profile-social-button profile-social-button--google" onClick={() => startProvider('google')}>
            <GoogleIcon /><span>Continuer avec Google</span>
          </button>
          <button type="button" className="profile-social-button profile-social-button--email" onClick={() => { setStandardOpen(true); setFeedback(null) }}>
            <MailIcon /><span>Continuer avec une adresse e-mail</span>
          </button>
        </div>

        <div className="profile-test-login" aria-label="Accès de démonstration">
          <span className="profile-test-login__label">Test rapide</span>
          <button type="button" className="profile-test-login__button" onClick={startTestSession} data-testid="profile-test-login">
            <TestUserIcon />
            <span>Connexion test</span>
          </button>
        </div>

        {feedback ? <div className={`profile-feedback profile-feedback--${feedback.type}`} role="status">{feedback.message}</div> : null}

        <p className="profile-gateway-caption">Apple et Google créent le compte à la première utilisation ou reconnectent automatiquement un compte existant.</p>
      </div>
    </section>
  )
}
