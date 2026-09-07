/* Browser storage is not guaranteed. It throws QuotaExceededError when full,
   and merely touching window.localStorage throws a SecurityError where site
   data is blocked (Safari private browsing, Chrome with site data disabled).

   Nearly every caller here — host onboarding drafts, favourites, the auth
   session, host calendars — wrote through this adapter without a try/catch, so
   a full or blocked store did not degrade: it threw into the middle of a user
   flow. This adapter now absorbs that. Writes report whether they actually
   persisted, so a caller can tell the difference between "saved" and "could
   not save" instead of assuming success. */

function readStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage || null
  } catch {
    // Access itself is denied when the browser blocks site data.
    return null
  }
}

export const storageAdapter = {
  /* Whether writes can actually outlive this page. Callers that promise the
     user something is saved should check this rather than assume it. */
  isPersistent() {
    return readStorage() !== null
  },

  get(key, fallback = null) {
    const storage = readStorage()
    if (!storage) return fallback
    try {
      const value = storage.getItem(key)
      return value === null ? fallback : value
    } catch {
      return fallback
    }
  },

  /* Returns true only when the value is durably stored. */
  set(key, value) {
    const storage = readStorage()
    if (!storage) return false
    try {
      storage.setItem(key, String(value))
      return true
    } catch {
      // Quota exceeded, or the store rejected the write.
      return false
    }
  },

  remove(key) {
    const storage = readStorage()
    if (!storage) return false
    try {
      storage.removeItem(key)
      return true
    } catch {
      return false
    }
  },

  getJson(key, fallback) {
    try {
      const raw = this.get(key, null)
      return raw === null ? fallback : JSON.parse(raw)
    } catch {
      return fallback
    }
  },

  setJson(key, value) {
    try {
      return this.set(key, JSON.stringify(value))
    } catch {
      // Value could not be serialised (circular reference, BigInt, …).
      return false
    }
  },
}
