# Deferred proposals

Two changes were identified during the stabilization phases, measured, and then
deliberately **not** made. They are recorded here so the reasoning survives, and
so neither gets rediscovered from scratch or slipped into an unrelated PR.

Both are deferred until the stabilization phases and the Phase 10 release gate
are complete. Neither is a bug; neither blocks release.

---

## 1. Route-level code splitting, and Host out of the Voyageur bundle

**Finding.** Host is roughly 26% of the shipped JavaScript, and a Voyageur who
never opens Host still downloads and parses all of it. The router resolves every
route eagerly, so there is no split point today — the entry bundle is the whole
app.

**Proposal.** Introduce route-level lazy boundaries, with Host as the first and
largest one. Collection pages and the Host onboarding flow are the other obvious
candidates.

**Why it is deferred.** This changes how the app loads, not how it behaves, but
that distinction is exactly what makes it risky to bundle with stabilization
work:

- It touches the custom router, which several stabilization phases now depend on
  (deterministic navigation signalling, modal history entries, scroll ownership).
- A lazy boundary introduces a loading state on routes that currently have none,
  which is a product decision about what the user sees mid-transition, not a
  refactor.
- Every Map and Search regression suite would need re-verification against the
  new load timing, which is precisely the kind of churn the stabilization plan
  exists to avoid.

**When to revisit.** After Phase 10 is green on main, as its own phase with its
own before/after bundle measurements and its own PR.

---

## 2. An honest UI signal when storage is not persistent

**Finding.** Phase 7 made `storageAdapter` absorb the two ways browser storage
fails — `QuotaExceededError` when full, `SecurityError` when the browser blocks
site data outright (Safari private browsing, Chrome with site data disabled).
Nothing throws into a user flow any more, and every write reports whether it
actually persisted. `isPersistent()` exposes the difference.

**What is already shipped.** The safe handling. A host onboarding draft, a
favourite or an auth session that cannot be saved now fails quietly instead of
exploding mid-flow.

**What is deferred.** Telling the user. Right now a save that did not persist
looks identical to one that did — the app is honest internally and silent
externally. `isPersistent()` is the hook a warning would hang from.

**Why it is deferred.** The remaining question is a product one, not a technical
one: which flows deserve a warning, how loud it should be, and what it says.
Getting that wrong is worse than saying nothing — a banner on every page load in
private browsing would be noise, while a silent failure on a nearly-complete
host listing is a genuine loss. That is a design decision, not a fix.

**When to revisit.** Whenever the persistence UX is specified. The adapter side
is ready; only the surface is missing.
