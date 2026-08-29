import { storageAdapter } from '../../services/storage/storageAdapter.js'
import { writeAuthSession } from './authSession.js'

export const AUTH_USERS_KEY = 'movera:auth-users:v1'
export const AUTH_PENDING_SIGNUP_KEY = 'movera:auth-pending-signup:v1'
export const AUTH_PENDING_RESET_KEY = 'movera:auth-pending-reset:v1'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9][0-9\s().-]{7,19}$/
const OTP_TTL_MS = 10 * 60 * 1000
const OTP_MAX_ATTEMPTS = 5
const PBKDF2_ITERATIONS = 120000

function normalizePhone(value = '') {
  return String(value).replace(/[\s().-]/g, '')
}

export function normalizeIdentifier(method, value = '') {
  const trimmed = String(value).trim()
  return method === 'phone' ? normalizePhone(trimmed) : trimmed.toLowerCase()
}

export function validateIdentifier(method, value) {
  const normalized = normalizeIdentifier(method, value)
  if (method === 'email' && !EMAIL_RE.test(normalized)) return { ok: false, message: 'Entrez une adresse e-mail valide.' }
  if (method === 'phone' && !PHONE_RE.test(String(value).trim())) return { ok: false, message: 'Entrez un numéro de téléphone valide.' }
  return { ok: true, normalized }
}

export function validatePassword(password) {
  const value = String(password || '')
  if (value.length < 8) return { ok: false, message: 'Utilisez au moins 8 caractères.' }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return { ok: false, message: 'Ajoutez au moins une lettre et un chiffre.' }
  return { ok: true }
}

function bytesToBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function randomBytes(length = 16) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function randomId(prefix) {
  return `${prefix}_${bytesToBase64(randomBytes(12)).replace(/[+/=]/g, '').slice(0, 16)}`
}

function randomOtp() {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return String(100000 + (values[0] % 900000))
}

async function digest(value) {
  const encoded = new TextEncoder().encode(String(value))
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return bytesToBase64(new Uint8Array(hash))
}

async function derivePassword(password, saltBase64) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltBase64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  return bytesToBase64(new Uint8Array(bits))
}

function readUsers() {
  const value = storageAdapter.getJson(AUTH_USERS_KEY, [])
  return Array.isArray(value) ? value : []
}

function writeUsers(users) {
  storageAdapter.setJson(AUTH_USERS_KEY, users)
}

function findUser(method, identifier) {
  const normalized = normalizeIdentifier(method, identifier)
  return readUsers().find((user) => user?.method === method && user?.identifier === normalized) || null
}

function publicSessionFromUser(user) {
  return {
    authenticated: true,
    userId: user.id,
    displayName: user.displayName,
    provider: user.provider || user.method,
    email: user.method === 'email' ? user.identifier : '',
    phone: user.method === 'phone' ? user.identifier : '',
  }
}

function cleanExpiredPending(key) {
  const pending = storageAdapter.getJson(key, null)
  if (!pending || Number(pending.expiresAt) <= Date.now()) {
    storageAdapter.remove(key)
    return null
  }
  return pending
}

export async function beginSignUp({ displayName, method, identifier, password, confirmPassword }) {
  const name = String(displayName || '').trim()
  if (name.length < 2) return { ok: false, field: 'displayName', message: 'Entrez votre nom.' }

  const identifierValidation = validateIdentifier(method, identifier)
  if (!identifierValidation.ok) return { ...identifierValidation, field: 'identifier' }

  const passwordValidation = validatePassword(password)
  if (!passwordValidation.ok) return { ...passwordValidation, field: 'password' }
  if (password !== confirmPassword) return { ok: false, field: 'confirmPassword', message: 'Les mots de passe ne correspondent pas.' }
  if (findUser(method, identifierValidation.normalized)) return { ok: false, field: 'identifier', code: 'account_exists', message: 'Un compte existe déjà avec ces informations.' }

  const salt = bytesToBase64(randomBytes(16))
  const passwordHash = await derivePassword(password, salt)
  const verificationCode = randomOtp()
  const now = Date.now()
  const pending = {
    id: randomId('signup'),
    displayName: name,
    method,
    identifier: identifierValidation.normalized,
    salt,
    passwordHash,
    codeHash: await digest(verificationCode),
    attempts: 0,
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
  }
  storageAdapter.setJson(AUTH_PENDING_SIGNUP_KEY, pending)
  return { ok: true, pendingId: pending.id, verificationCode, expiresAt: pending.expiresAt, delivery: 'demo' }
}

export async function resendSignUpCode(pendingId) {
  const pending = cleanExpiredPending(AUTH_PENDING_SIGNUP_KEY)
  if (!pending || pending.id !== pendingId) return { ok: false, code: 'expired', message: 'La demande a expiré. Recommencez la création du compte.' }
  const verificationCode = randomOtp()
  const next = {
    ...pending,
    codeHash: await digest(verificationCode),
    attempts: 0,
    expiresAt: Date.now() + OTP_TTL_MS,
  }
  storageAdapter.setJson(AUTH_PENDING_SIGNUP_KEY, next)
  return { ok: true, verificationCode, expiresAt: next.expiresAt, delivery: 'demo' }
}

export async function verifySignUp({ pendingId, code }) {
  const pending = cleanExpiredPending(AUTH_PENDING_SIGNUP_KEY)
  if (!pending || pending.id !== pendingId) return { ok: false, code: 'expired', message: 'Le code a expiré. Recommencez la création du compte.' }
  if (pending.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, code: 'blocked', message: 'Trop de tentatives. Demandez un nouveau code.' }

  const matches = (await digest(String(code || '').trim())) === pending.codeHash
  if (!matches) {
    storageAdapter.setJson(AUTH_PENDING_SIGNUP_KEY, { ...pending, attempts: pending.attempts + 1 })
    return { ok: false, code: 'invalid_code', message: 'Code incorrect.' }
  }
  if (findUser(pending.method, pending.identifier)) {
    storageAdapter.remove(AUTH_PENDING_SIGNUP_KEY)
    return { ok: false, code: 'account_exists', message: 'Ce compte existe déjà. Connectez-vous.' }
  }

  const user = {
    id: randomId('usr'),
    displayName: pending.displayName,
    method: pending.method,
    identifier: pending.identifier,
    provider: pending.method,
    salt: pending.salt,
    passwordHash: pending.passwordHash,
    verifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
  writeUsers([...readUsers(), user])
  storageAdapter.remove(AUTH_PENDING_SIGNUP_KEY)
  const session = writeAuthSession(publicSessionFromUser(user))
  return { ok: true, session }
}

export async function signInLocal({ method, identifier, password }) {
  const identifierValidation = validateIdentifier(method, identifier)
  if (!identifierValidation.ok) return { ...identifierValidation, field: 'identifier' }
  if (!String(password || '')) return { ok: false, field: 'password', message: 'Entrez votre mot de passe.' }

  const user = findUser(method, identifierValidation.normalized)
  if (!user) return { ok: false, code: 'account_not_found', message: 'Aucun compte trouvé. Créez d’abord votre compte.' }
  const passwordHash = await derivePassword(String(password), user.salt)
  if (passwordHash !== user.passwordHash) return { ok: false, code: 'invalid_credentials', message: 'Mot de passe incorrect.' }

  const session = writeAuthSession(publicSessionFromUser(user))
  return { ok: true, session }
}

export async function beginPasswordReset({ method, identifier }) {
  const identifierValidation = validateIdentifier(method, identifier)
  if (!identifierValidation.ok) return { ...identifierValidation, field: 'identifier' }
  const user = findUser(method, identifierValidation.normalized)
  if (!user) return { ok: false, code: 'account_not_found', message: 'Aucun compte trouvé avec ces informations.' }

  const verificationCode = randomOtp()
  const now = Date.now()
  const pending = {
    id: randomId('reset'),
    userId: user.id,
    method,
    identifier: identifierValidation.normalized,
    codeHash: await digest(verificationCode),
    verified: false,
    attempts: 0,
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
  }
  storageAdapter.setJson(AUTH_PENDING_RESET_KEY, pending)
  return { ok: true, pendingId: pending.id, verificationCode, expiresAt: pending.expiresAt, delivery: 'demo' }
}

export async function verifyPasswordResetCode({ pendingId, code }) {
  const pending = cleanExpiredPending(AUTH_PENDING_RESET_KEY)
  if (!pending || pending.id !== pendingId) return { ok: false, code: 'expired', message: 'Le code a expiré. Recommencez.' }
  if (pending.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, code: 'blocked', message: 'Trop de tentatives. Recommencez.' }
  const matches = (await digest(String(code || '').trim())) === pending.codeHash
  if (!matches) {
    storageAdapter.setJson(AUTH_PENDING_RESET_KEY, { ...pending, attempts: pending.attempts + 1 })
    return { ok: false, code: 'invalid_code', message: 'Code incorrect.' }
  }
  storageAdapter.setJson(AUTH_PENDING_RESET_KEY, { ...pending, verified: true })
  return { ok: true }
}

export async function completePasswordReset({ pendingId, password, confirmPassword }) {
  const pending = cleanExpiredPending(AUTH_PENDING_RESET_KEY)
  if (!pending || pending.id !== pendingId || pending.verified !== true) return { ok: false, code: 'not_verified', message: 'Vérifiez d’abord votre code.' }
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.ok) return { ...passwordValidation, field: 'password' }
  if (password !== confirmPassword) return { ok: false, field: 'confirmPassword', message: 'Les mots de passe ne correspondent pas.' }

  const users = readUsers()
  const index = users.findIndex((user) => user?.id === pending.userId)
  if (index < 0) return { ok: false, code: 'account_not_found', message: 'Compte introuvable.' }

  const salt = bytesToBase64(randomBytes(16))
  const passwordHash = await derivePassword(password, salt)
  const updated = [...users]
  updated[index] = { ...users[index], salt, passwordHash, passwordUpdatedAt: new Date().toISOString() }
  writeUsers(updated)
  storageAdapter.remove(AUTH_PENDING_RESET_KEY)
  return { ok: true }
}

export function clearPendingAuthFlows() {
  storageAdapter.remove(AUTH_PENDING_SIGNUP_KEY)
  storageAdapter.remove(AUTH_PENDING_RESET_KEY)
}
