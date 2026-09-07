import { afterEach, describe, expect, it, vi } from 'vitest'
import { storageAdapter } from '../../src/services/storage/storageAdapter.js'

const originalWindow = globalThis.window

function useStorage(storage) {
  globalThis.window = { localStorage: storage }
}

function useBlockedStorage() {
  globalThis.window = {
    get localStorage() {
      const error = new Error('The operation is insecure.')
      error.name = 'SecurityError'
      throw error
    },
  }
}

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)) },
    removeItem: (key) => { map.delete(key) },
  }
}

function fullStorage() {
  return {
    getItem: () => null,
    removeItem: () => {},
    setItem: () => {
      const error = new Error('QuotaExceededError')
      error.name = 'QuotaExceededError'
      throw error
    },
  }
}

afterEach(() => {
  globalThis.window = originalWindow
  vi.restoreAllMocks()
})

describe('storage adapter resilience', () => {
  describe('when storage works', () => {
    it('round-trips values and reports success', () => {
      useStorage(memoryStorage())
      expect(storageAdapter.isPersistent()).toBe(true)
      expect(storageAdapter.set('key', 'value')).toBe(true)
      expect(storageAdapter.get('key')).toBe('value')
      expect(storageAdapter.setJson('draft', { step: 2 })).toBe(true)
      expect(storageAdapter.getJson('draft')).toEqual({ step: 2 })
      expect(storageAdapter.remove('key')).toBe(true)
      expect(storageAdapter.get('key', 'fallback')).toBe('fallback')
    })
  })

  describe('when the store is full', () => {
    it('reports the failure instead of throwing into the caller', () => {
      useStorage(fullStorage())
      // A host onboarding draft save must not explode mid-flow.
      expect(() => storageAdapter.setJson('movera:host-onboarding-drafts:v1', { step: 3 })).not.toThrow()
      expect(storageAdapter.setJson('movera:host-onboarding-drafts:v1', { step: 3 })).toBe(false)
      expect(storageAdapter.set('key', 'value')).toBe(false)
    })

    it('still reads and falls back cleanly', () => {
      useStorage(fullStorage())
      expect(storageAdapter.get('missing', 'fallback')).toBe('fallback')
      expect(storageAdapter.getJson('missing', { empty: true })).toEqual({ empty: true })
    })
  })

  describe('when the browser blocks site data', () => {
    it('never throws, even on read, and reports no persistence', () => {
      useBlockedStorage()
      expect(() => storageAdapter.get('key')).not.toThrow()
      expect(() => storageAdapter.set('key', 'value')).not.toThrow()
      expect(() => storageAdapter.remove('key')).not.toThrow()
      expect(storageAdapter.isPersistent()).toBe(false)
      expect(storageAdapter.get('key', 'fallback')).toBe('fallback')
      expect(storageAdapter.set('key', 'value')).toBe(false)
    })
  })

  describe('outside a browser', () => {
    it('degrades to fallbacks without persistence', () => {
      globalThis.window = undefined
      expect(storageAdapter.isPersistent()).toBe(false)
      expect(storageAdapter.get('key', 'fallback')).toBe('fallback')
      expect(storageAdapter.set('key', 'value')).toBe(false)
      expect(storageAdapter.getJson('key', null)).toBeNull()
    })
  })

  describe('malformed data', () => {
    it('falls back rather than throwing on unparseable JSON', () => {
      const storage = memoryStorage()
      storage.setItem('broken', '{not json')
      useStorage(storage)
      expect(storageAdapter.getJson('broken', { safe: true })).toEqual({ safe: true })
    })

    it('reports failure for values that cannot be serialised', () => {
      useStorage(memoryStorage())
      const circular = {}
      circular.self = circular
      expect(() => storageAdapter.setJson('circular', circular)).not.toThrow()
      expect(storageAdapter.setJson('circular', circular)).toBe(false)
    })
  })
})
