const hasStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage)

export const storageAdapter = {
  get(key, fallback = null) {
    if (!hasStorage()) return fallback
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value
  },
  set(key, value) {
    if (!hasStorage()) return
    window.localStorage.setItem(key, String(value))
  },
  remove(key) {
    if (!hasStorage()) return
    window.localStorage.removeItem(key)
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
    this.set(key, JSON.stringify(value))
  },
}
