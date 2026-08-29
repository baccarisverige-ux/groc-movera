# Movera Host — Phase 17 Performance Budget

## Bundle budgets

- Initial entry JavaScript (largest `dist/assets/index-*.js` entry): **<= 210 KiB raw**.
- Total JavaScript across all emitted chunks: **<= 340 KiB raw**.
- Total CSS: **<= 90 KiB raw**.
- Heavy guest/host features must be route-split; Home remains in the initial route.

## Runtime budgets

- Map pointer/wheel bursts must be coalesced through `requestAnimationFrame`.
- 120 synthetic wheel interactions may produce **<= 30 committed viewport updates** in one burst.
- Repeated Map -> Home -> Map navigation must not accumulate map DOM instances or lifecycle listeners.
- Map route must remain responsive after repeated marker selection and zoom operations.

## Media policy

- Non-critical listing/gallery images use `loading="lazy"`.
- Responsive media must remain bounded by viewport CSS.
- No speculative preload for non-critical route media.

## React/lifecycle policy

- Heavy feature groups are lazy-loaded at the route boundary.
- Effects that register global/document listeners must return cleanup functions.
- Memoization is used only where it stabilizes hot-path callbacks or derived state.

## Phase 17 release gate

PASS only when CI proves all of the following:

1. Bundle budgets are within limits.
2. Lint/build are clean.
3. Map interaction burst remains within the update budget.
4. Repeated navigation leaves no duplicate map instance and no obvious listener accumulation.
5. Lazy route chunks are emitted for heavy features.
