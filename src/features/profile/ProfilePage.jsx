import { useMemo, useState } from 'react'
import {
  authProviderLabel,
  requestPasswordReset,
  resendVerificationCode,
  resetPassword,
  signInWithCredentials,
  signUpWithCredentials,
  startOAuthSignIn,
  verifyResetCode,
  verifySignUpCode,
} from '../auth/authClient.js'
import { clearAuthSession, useAuthSession } from '../auth/authSession.js'
import './profile-page.css'

function AppleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.8 12.8c0-2.7 2.2-4 2.3-4.1-1.2-1.8-3.2-2-3.9-2-1.7-.2-3.2 1-4.1 1-.9 0-2.2-1-3.7-1C5.5 6.8 3.8 8 2.8 9.8c-2 3.5-.5 8.8 1.4 11.6.9 1.4 2 3 3.5 2.9 1.4-.1 2-1 3.8-1s2.3 1 3.8 1c1.6 0 2.6-1.4 3.5-2.8 1.1-1.6 1.5-3.2 1.5-3.3-.1 0-3.5-1.4-3.5-5.4ZM14.1 4.9c.8-1 1.4-2.4 1.2-3.9-1.2.1-2.7.8-3.6 1.8-.8.9-1.4 2.3-1.2 3.7 1.4.1 2.8-.6 3.6-1.6Z"/></svg>
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.3Z"/><path d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6Z"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>
}

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3h2.4l1.2 4.4-2 1.4a15 15 0 0 0 6.4 6.4l1.4-2 4.4 1.2v2.4A3.2 3.2 0 0 1 17.8 20C10.2 20 4 13.8 4 6.2A3.2 3.2 0 0 1 7.2 3Z"/></svg>
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
}

function CredentialMethodSwitch({ method, onChange }) {
  return (
    <div className="profile-method-switch" role="tablist" aria-label="Méthode d’identification">
      <button type="button" role="tab" aria-selected={method === 'email'} data-active={method === 'email' ? 'true' : 'false'} onClick={() => onChange('email')}><MailIcon />E-mail</button>
      <button type="button" role="tab" aria-selected={method === 'phone'} data-active={method === 'phone' ? 'true' : 'false'} onClick={() => onChange('phone')}><PhoneIcon />Téléphone</button>
    </div>
  )
}

function CredentialField({ method, value, onChange }) {
  return (
    <label>
      <span>{method === 'email' ? 'Adresse e-mail' : 'Numéro de téléphone'}</span>
      <div className="profile-field">
        {method === 'email' ? <MailIcon /> : <PhoneIcon />}
        <input
          type={method === 'email' ? 'email' : 'tel'}
          inputMode={method === 'email' ? 'email' : 'tel'}
          autoComplete={method === 'email' ? 'email' : 'tel'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={method === 'email' ? 'vous@exemple.com' : '+216 00 000 000'}
          aria-label={method === 'email' ? 'Adresse e-mail' : 'Numéro de téléphone'}
        />
      </div>
    </label>
  )
}

function PasswordField({ label = 'Mot de passe', value, onChange, showPassword, onToggle, autoComplete = 'current-password', inputLabel = label }) {
  return (
    <label>
      <span>{label}</span>
      <div className="profile-field profile-field--password">
        <span className="profile-password-dot" aria-hidden="true">●</span>
        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="8 caractères, lettre + chiffre"
          aria-label={inputLabel}
        />
        <button type="button" className="profile-password-toggle" onClick={onToggle} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? 'Masquer' : 'Afficher'}</button>
      </div>
    </label>
  )
}

export function ProfilePage({ onNavigate }) {
  const { session, isAuthenticated } = useAuthSession()
  const [flow, setFlow] = useState('signin')
  const [method, setMethod] = useState('email')
  const [displayName, setDisplayName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingId, setPendingId] = useState('')
  const [demoCode, setDemoCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const returnTo = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('returnTo')
    return value && value.startsWith('/') && !value.startsWith('//') ? value : ''
  }, [])

  const resetTransientFields = () => {
    setPassword('')
    setConfirmPassword('')
    setVerificationCode('')
    setPendingId('')
    setDemoCode('')
    setFeedback(null)
  }

  const changeFlow = (next) => {
    resetTransientFields()
    setFlow(next)
  }

  const changeMethod = (next) => {
    setMethod(next)
    setIdentifier('')
    setFeedback(null)
  }

  const completeAuthentication = () => {
    setFeedback(null)
    if (returnTo && returnTo !== '/profile') onNavigate(returnTo)
  }

  const submitSignIn = async (event) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      const result = await signInWithCredentials({ method, identifier, password })
      if (!result.ok) return setFeedback({ type: 'error', message: result.message })
      completeAuthentication()
    } finally {
      setLoading(false)
    }
  }

  const submitSignUp = async (event) => {
    event.preventDefault()
    if (!acceptedTerms) return setFeedback({ type: 'error', message: 'Acceptez les conditions pour créer votre compte.' })
    setLoading(true)
    setFeedback(null)
    try {
      const result = await signUpWithCredentials({ displayName, method, identifier, password, confirmPassword })
      if (!result.ok) return setFeedback({ type: 'error', message: result.message })
      setPendingId(result.pendingId)
      setDemoCode(result.verificationCode || '')
      setVerificationCode('')
      setPassword('')
      setConfirmPassword('')
      setFlow('verify-signup')
    } finally {
      setLoading(false)
    }
  }

  const submitSignUpVerification = async (event) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      const result = await verifySignUpCode({ pendingId, code: verificationCode })
      if (!result.ok) return setFeedback({ type: 'error', message: result.message })
      completeAuthentication()
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      const result = await resendVerificationCode(pendingId)
      if (!result.ok) return setFeedback({ type: 'error', message: result.message })
      setDemoCode(result.verificationCode || '')
      setVerificationCode('')
      setFeedback({ type: 'info', message: 'Un nouveau code a été généré.' })
    } finally {
      setLoading(false)
    }
  }

  const submitForgotPassword = async (event) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      const result = await requestPasswordReset({ method, identifier })
      if (!result.ok) return setFeedback({ type: 'error', message: result.message })
      setPendingId(result.pendingId)
      setDemoCode(result.verificationCode || '')
      setVerificationCode('')
      setFlow('verify-reset')
    } finally {
      setLoading(false)
    }
  }

  const submitResetVerification = async (event) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      const result = await verifyResetCode({ pendingId, code: verificationCode })
      if (!result.ok) return setFeedback({ type: 'error', message: result.message })
      setVerificationCode('')
      setPassword('')
      setConfirmPassword('')
      setFlow('new-password')
    } finally {
      setLoading(false)
    }
  }

  const submitNewPassword = async (event) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      const result = await resetPassword({ pendingId, password, confirmPassword })
      if (!result.ok) return setFeedback({ type: 'error', message: result.message })
      setPassword('')
      setConfirmPassword('')
      setPendingId('')
      setDemoCode('')
      setFlow('signin')
      setFeedback({ type: 'success', message: 'Mot de passe modifié. Vous pouvez maintenant vous connecter.' })
    } finally {
      setLoading(false)
    }
  }

  const startProvider = (provider) => {
    setFeedback(null)
    const result = startOAuthSignIn(provider, returnTo || '/profile')
    if (!result.ok) setFeedback({ type: 'info', message: result.message })
  }

  const signOut = () => {
    clearAuthSession()
    setIdentifier('')
    setDisplayName('')
    setAcceptedTerms(false)
    resetTransientFields()
    setFlow('signin')
  }

  if (isAuthenticated && session) {
    const initial = (session.displayName || 'M').charAt(0).toUpperCase()
    const contact = session.email || session.phone || 'Compte Movera'
    return (
      <section className="profile-page profile-page--connected" data-testid="page-profile">
        <div className="profile-connected-hero">
          <span className="profile-eyebrow">Votre espace</span>
          <h1>Profil</h1>
          <div className="profile-identity-card">
            <div className="profile-avatar" aria-hidden="true">{initial}</div>
            <div className="profile-identity-copy">
              <strong>{session.displayName || 'Voyageur Movera'}</strong>
              <span>{contact}</span>
              <small>Connecté avec {authProviderLabel(session.provider)}</small>
            </div>
            <div className="profile-verified" aria-label="Session active"><ShieldIcon /></div>
          </div>
        </div>
        <div className="profile-connected-content">
          <span className="profile-section-label">Votre compte</span>
          <div className="profile-menu-card">
            <button type="button" onClick={() => onNavigate('/messages')}><span className="profile-menu-icon"><MailIcon /></span><span><strong>Messages</strong><small>Vos échanges et séjours</small></span><ChevronIcon /></button>
            <button type="button" onClick={() => onNavigate('/favorites')}><span className="profile-menu-icon profile-menu-icon--heart">♡</span><span><strong>Favoris</strong><small>Vos adresses enregistrées</small></span><ChevronIcon /></button>
          </div>
          <div className="profile-security-note"><ShieldIcon /><div><strong>Session Movera active</strong><span>Messages est déverrouillé pour cette session.</span></div></div>
          <button type="button" className="profile-signout" onClick={signOut}>Se déconnecter</button>
        </div>
      </section>
    )
  }

  const isVerifyFlow = flow === 'verify-signup' || flow === 'verify-reset'
  const title = flow === 'signup'
    ? 'Créer votre compte.'
    : flow === 'forgot'
      ? 'Retrouver votre compte.'
      : isVerifyFlow
        ? 'Vérifier votre identité.'
        : flow === 'new-password'
          ? 'Nouveau mot de passe.'
          : 'Bon retour chez Movera.'

  return (
    <section className="profile-page" data-testid="page-profile" data-auth-flow={flow}>
      <header className="profile-login-hero">
        <span className="profile-eyebrow">Movera Host</span>
        <h1>{title}</h1>
        <p>{flow === 'signup' ? 'Créez un compte vérifié pour sécuriser vos messages et vos séjours.' : flow === 'signin' ? 'Connectez-vous à un compte existant.' : 'Suivez les étapes sécurisées pour continuer.'}</p>
      </header>

      <div className="profile-login-content">
        {(flow === 'signin' || flow === 'signup') ? (
          <>
            <div className="profile-social-stack" aria-label="Accès avec Apple ou Google">
              <button type="button" className="profile-social-button profile-social-button--apple" onClick={() => startProvider('apple')}><AppleIcon /><span>Continuer avec Apple</span></button>
              <button type="button" className="profile-social-button profile-social-button--google" onClick={() => startProvider('google')}><GoogleIcon /><span>Continuer avec Google</span></button>
            </div>
            <p className="profile-provider-note">Apple et Google créent automatiquement votre compte lors de la première utilisation, puis vous reconnectent les fois suivantes.</p>
            <div className="profile-divider"><span>avec e-mail ou téléphone</span></div>
            <div className="profile-auth-mode" role="tablist" aria-label="Connexion ou création par e-mail ou téléphone">
              <button type="button" role="tab" aria-selected={flow === 'signin'} data-active={flow === 'signin' ? 'true' : 'false'} onClick={() => changeFlow('signin')}>Se connecter</button>
              <button type="button" role="tab" aria-selected={flow === 'signup'} data-active={flow === 'signup' ? 'true' : 'false'} onClick={() => changeFlow('signup')}>Créer un compte</button>
            </div>
          </>
        ) : null}

        {flow === 'signin' ? (
          <>
            <CredentialMethodSwitch method={method} onChange={changeMethod} />
            <form className="profile-login-form" onSubmit={submitSignIn} noValidate>
              <CredentialField method={method} value={identifier} onChange={(value) => { setIdentifier(value); setFeedback(null) }} />
              <PasswordField value={password} onChange={(value) => { setPassword(value); setFeedback(null) }} showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} />
              <button type="button" className="profile-forgot" onClick={() => changeFlow('forgot')}>Mot de passe oublié ?</button>
              {feedback ? <div className={`profile-feedback profile-feedback--${feedback.type}`} role="status">{feedback.message}</div> : null}
              <button type="submit" className="profile-submit" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
            </form>
          </>
        ) : null}

        {flow === 'signup' ? (
          <>
            <CredentialMethodSwitch method={method} onChange={changeMethod} />
            <form className="profile-login-form" onSubmit={submitSignUp} noValidate>
              <label><span>Nom complet</span><div className="profile-field"><input value={displayName} onChange={(event) => { setDisplayName(event.target.value); setFeedback(null) }} placeholder="Votre nom" aria-label="Nom complet" autoComplete="name" /></div></label>
              <CredentialField method={method} value={identifier} onChange={(value) => { setIdentifier(value); setFeedback(null) }} />
              <PasswordField value={password} onChange={(value) => { setPassword(value); setFeedback(null) }} showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
              <PasswordField label="Confirmer le mot de passe" inputLabel="Confirmer le mot de passe" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setFeedback(null) }} showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
              <label className="profile-terms"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span>J’accepte les conditions d’utilisation et la politique de confidentialité de Movera.</span></label>
              {feedback ? <div className={`profile-feedback profile-feedback--${feedback.type}`} role="status">{feedback.message}</div> : null}
              <button type="submit" className="profile-submit" disabled={loading}>{loading ? 'Création…' : 'Créer mon compte'}</button>
            </form>
          </>
        ) : null}

        {flow === 'verify-signup' ? (
          <form className="profile-login-form profile-code-form" onSubmit={submitSignUpVerification} noValidate>
            <button type="button" className="profile-flow-back" onClick={() => changeFlow('signup')}><BackIcon />Modifier les informations</button>
            <p className="profile-flow-copy">Entrez le code à 6 chiffres pour vérifier {method === 'email' ? 'votre e-mail' : 'votre téléphone'}.</p>
            {demoCode ? <div className="profile-demo-code"><span>Mode prototype · code de vérification</span><strong>{demoCode}</strong><small>En production, ce code sera envoyé par e-mail ou SMS.</small></div> : null}
            <label><span>Code de vérification</span><div className="profile-field profile-field--code"><input value={verificationCode} onChange={(event) => { setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setFeedback(null) }} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Code de vérification" /></div></label>
            {feedback ? <div className={`profile-feedback profile-feedback--${feedback.type}`} role="status">{feedback.message}</div> : null}
            <button type="submit" className="profile-submit" disabled={loading || verificationCode.length !== 6}>{loading ? 'Vérification…' : 'Vérifier et continuer'}</button>
            <button type="button" className="profile-secondary-action" disabled={loading} onClick={resendCode}>Renvoyer un code</button>
          </form>
        ) : null}

        {flow === 'forgot' ? (
          <>
            <button type="button" className="profile-flow-back" onClick={() => changeFlow('signin')}><BackIcon />Retour à la connexion</button>
            <CredentialMethodSwitch method={method} onChange={changeMethod} />
            <form className="profile-login-form" onSubmit={submitForgotPassword} noValidate>
              <CredentialField method={method} value={identifier} onChange={(value) => { setIdentifier(value); setFeedback(null) }} />
              {feedback ? <div className={`profile-feedback profile-feedback--${feedback.type}`} role="status">{feedback.message}</div> : null}
              <button type="submit" className="profile-submit" disabled={loading}>{loading ? 'Recherche…' : 'Recevoir un code'}</button>
            </form>
          </>
        ) : null}

        {flow === 'verify-reset' ? (
          <form className="profile-login-form profile-code-form" onSubmit={submitResetVerification} noValidate>
            <button type="button" className="profile-flow-back" onClick={() => changeFlow('forgot')}><BackIcon />Retour</button>
            <p className="profile-flow-copy">Vérifiez votre identité avant de choisir un nouveau mot de passe.</p>
            {demoCode ? <div className="profile-demo-code"><span>Mode prototype · code de récupération</span><strong>{demoCode}</strong><small>En production, ce code sera envoyé par e-mail ou SMS.</small></div> : null}
            <label><span>Code de récupération</span><div className="profile-field profile-field--code"><input value={verificationCode} onChange={(event) => { setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setFeedback(null) }} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Code de récupération" /></div></label>
            {feedback ? <div className={`profile-feedback profile-feedback--${feedback.type}`} role="status">{feedback.message}</div> : null}
            <button type="submit" className="profile-submit" disabled={loading || verificationCode.length !== 6}>{loading ? 'Vérification…' : 'Continuer'}</button>
          </form>
        ) : null}

        {flow === 'new-password' ? (
          <form className="profile-login-form" onSubmit={submitNewPassword} noValidate>
            <PasswordField label="Nouveau mot de passe" inputLabel="Nouveau mot de passe" value={password} onChange={(value) => { setPassword(value); setFeedback(null) }} showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
            <PasswordField label="Confirmer le nouveau mot de passe" inputLabel="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setFeedback(null) }} showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
            {feedback ? <div className={`profile-feedback profile-feedback--${feedback.type}`} role="status">{feedback.message}</div> : null}
            <button type="submit" className="profile-submit" disabled={loading}>{loading ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}</button>
          </form>
        ) : null}

        <div className="profile-login-note"><ShieldIcon /><p><strong>Architecture sécurisée du prototype</strong><span>Les mots de passe locaux sont dérivés avec PBKDF2 + sel et ne sont jamais enregistrés dans la session.</span></p></div>
      </div>
    </section>
  )
}
