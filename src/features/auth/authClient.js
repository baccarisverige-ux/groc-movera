import {
  beginPasswordReset,
  beginSignUp,
  completePasswordReset,
  resendSignUpCode,
  signInLocal,
  validateIdentifier,
  validatePassword,
  verifyPasswordResetCode,
  verifySignUp,
} from './localAuthStore.js'

const OAUTH_ENTRYPOINTS = Object.freeze({
  google: import.meta.env.VITE_GOOGLE_AUTH_URL || '',
  apple: import.meta.env.VITE_APPLE_AUTH_URL || '',
})

export { validateIdentifier, validatePassword }

export async function signInWithCredentials({ method, identifier, password }) {
  return signInLocal({ method, identifier, password })
}

export async function signUpWithCredentials(payload) {
  return beginSignUp(payload)
}

export async function verifySignUpCode(payload) {
  return verifySignUp(payload)
}

export async function resendVerificationCode(pendingId) {
  return resendSignUpCode(pendingId)
}

export async function requestPasswordReset(payload) {
  return beginPasswordReset(payload)
}

export async function verifyResetCode(payload) {
  return verifyPasswordResetCode(payload)
}

export async function resetPassword(payload) {
  return completePasswordReset(payload)
}

export function startOAuthSignIn(provider, returnTo = '/profile') {
  const entrypoint = OAUTH_ENTRYPOINTS[provider]
  if (!entrypoint) {
    return {
      ok: false,
      code: 'provider_not_configured',
      message: `Connexion ${provider === 'apple' ? 'Apple' : 'Google'} non configurée sur cet environnement.`,
    }
  }

  try {
    const target = new URL(entrypoint, window.location.origin)
    target.searchParams.set('return_to', returnTo.startsWith('/') ? returnTo : '/profile')
    window.location.assign(target.toString())
    return { ok: true }
  } catch {
    return { ok: false, code: 'invalid_provider_url', message: 'Configuration de connexion invalide.' }
  }
}

export function authProviderLabel(provider) {
  return ({ apple: 'Apple', google: 'Google', email: 'E-mail', phone: 'Téléphone' })[provider] || 'Movera'
}
