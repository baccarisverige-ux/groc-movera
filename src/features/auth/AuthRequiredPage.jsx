import './auth-required-page.css'

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/></svg>
}

export function AuthRequiredPage({ onNavigate, feature = 'cet espace', returnTo = '/' }) {
  const loginPath = `/profile?returnTo=${encodeURIComponent(returnTo)}`
  return (
    <section className="auth-required-page" data-testid="page-auth-required" aria-labelledby="auth-required-title">
      <div className="auth-required-card">
        <div className="auth-required-icon"><LockIcon /></div>
        <span className="auth-required-eyebrow">Espace privé</span>
        <h1 id="auth-required-title">Connexion requise</h1>
        <p>Connectez-vous à votre compte Movera pour accéder à {feature.toLowerCase()} et garder vos échanges privés.</p>
        <div className="auth-required-note">
          <span className="auth-required-note__dot" />
          <div>
            <strong>Accès protégé</strong>
            <small>Le contenu reste verrouillé tant qu’aucune session Movera n’est active.</small>
          </div>
        </div>
        <button type="button" onClick={() => onNavigate(loginPath)}>Se connecter</button>
      </div>
    </section>
  )
}
