/* The seam a backend would implement.

   Everything in this app persists through storageAdapter today: synchronous,
   key/value, this device only. That is fine for the current product and this
   file does not change it. What it does is give new code a shape that a server
   could take over without the calling screens being rewritten:

     - operations are async, so a network round trip is not a breaking change
     - they are resource-shaped (collection + id), not key-shaped
     - they report failure as a value rather than throwing into a render
     - every record carries id / createdAt / updatedAt, so a server can
       reconcile and a client can order without inventing fields later

   Existing stores are deliberately left alone. Rewriting eight working stores
   to async for a backend nobody has built yet would be churn with real
   regression risk and no user-visible gain. New surfaces are written against
   this instead, so the migration is incremental when it is actually wanted.

   A backend implementation has to satisfy: same method names, same argument
   order, same result envelope. Nothing else in the contract is load-bearing. */

export const DataError = Object.freeze({
  NOT_FOUND: 'not-found',
  NOT_PERSISTED: 'not-persisted',
  INVALID: 'invalid',
})

export function ok(data) {
  return { ok: true, data, error: null }
}

export function fail(error, data = null) {
  return { ok: false, data, error }
}

/* A collection is the unit a server would expose as an endpoint.

   list(scope)            → ok([record])        scope narrows, e.g. { listingId }
   get(id)                → ok(record) | fail(NOT_FOUND)
   create(draft, scope)   → ok(record) | fail(NOT_PERSISTED)
   update(id, patch)      → ok(record) | fail(NOT_FOUND | NOT_PERSISTED)
   remove(id)             → ok(null)   | fail(NOT_PERSISTED)

   NOT_PERSISTED is not hypothetical: storage is blocked in Safari private
   browsing and throws when the quota is full, so a write that looks like it
   worked may not have. Callers are expected to surface that rather than
   pretend the save succeeded. */
export function describeCollection(name) {
  return Object.freeze({
    name,
    methods: Object.freeze(['list', 'get', 'create', 'update', 'remove']),
  })
}
