import { storageAdapter } from '../storage/storageAdapter.js'
import { DataError, fail, ok } from './dataContract.js'

/* The local implementation of the collection contract.

   One storage key holds one collection as a flat array. Async because the
   contract is async, not because this does any I/O — resolving immediately
   keeps call sites honest about the await they will need when a server is
   behind it.

   Writes go through storageAdapter, which returns false rather than throwing
   when the store is blocked or full, so a failed save surfaces as
   NOT_PERSISTED instead of silently looking like success. */

function nowIso() {
  return new Date().toISOString()
}

function newId(prefix) {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}

function matchesScope(record, scope) {
  return Object.entries(scope || {}).every(([key, value]) => record[key] === value)
}

export function createLocalCollection({ name, storageKey, idPrefix = name, validate = null }) {
  const readAll = () => {
    const rows = storageAdapter.getJson(storageKey, [])
    return Array.isArray(rows) ? rows : []
  }
  const writeAll = (rows) => storageAdapter.setJson(storageKey, rows)

  return Object.freeze({
    name,

    async list(scope = {}) {
      return ok(readAll().filter((record) => matchesScope(record, scope)))
    },

    async get(id) {
      const record = readAll().find((row) => row.id === id)
      return record ? ok(record) : fail(DataError.NOT_FOUND)
    },

    async create(draft, scope = {}) {
      const invalid = validate ? validate({ ...scope, ...draft }) : null
      if (invalid) return fail(DataError.INVALID, invalid)

      const record = {
        ...scope,
        ...draft,
        id: draft.id || newId(idPrefix),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      const rows = readAll()
      rows.push(record)
      return writeAll(rows) ? ok(record) : fail(DataError.NOT_PERSISTED, record)
    },

    async update(id, patch) {
      const rows = readAll()
      const index = rows.findIndex((row) => row.id === id)
      if (index < 0) return fail(DataError.NOT_FOUND)

      const next = { ...rows[index], ...patch, id, updatedAt: nowIso() }
      const invalid = validate ? validate(next) : null
      if (invalid) return fail(DataError.INVALID, invalid)

      rows[index] = next
      return writeAll(rows) ? ok(next) : fail(DataError.NOT_PERSISTED, next)
    },

    async remove(id) {
      const rows = readAll()
      const next = rows.filter((row) => row.id !== id)
      if (next.length === rows.length) return fail(DataError.NOT_FOUND)
      return writeAll(next) ? ok(null) : fail(DataError.NOT_PERSISTED)
    },
  })
}
