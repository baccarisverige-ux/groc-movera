# Map Sheet V2

This module is the isolated interaction system for the Movera map offer sheet.

## Dependency direction

- `core/` — pure deterministic state and policy. No React, DOM, Motion, browser or map engine imports.
- `ports/` — dependency contracts used by the application/core boundary. No runtime/browser implementation.
- `application/` — use-cases and orchestration. May depend on core + ports, never adapters/UI.
- `adapters/` — browser, iOS, Motion, map and React bindings. Implements ports around external runtimes.
- `ui/` — presentation only. No low-level touch/pointer listeners and no direct Motion runtime access.
- `index.js` — the only public import boundary for code outside this feature.

## Migration status

- Phase 1: boundaries and architecture guard complete.
- Phase 2: headless state machine, events, commands, gesture policy, normalized snap engine and selectors implemented behind the public boundary.
- Current production Map behavior is still untouched; no browser, Motion, React or Map adapter is wired to V2 yet.

## Core invariants

- Sheet progress is normalized from `0` (collapsed) to `1` (expanded), independent from viewport pixels.
- Settled positions are semantic: `collapsed`, `middle`, `expanded`.
- Gesture thresholds and snap decisions live in pure policy/engine code.
- State transitions emit commands; adapters execute them later.
- A new interaction can interrupt a running snap deterministically.

## Future safety

Architecture CI rejects inward dependency leaks, direct DOM/Motion usage in the headless core, low-level gesture ownership in UI, and imports of private `map-sheet` internals from outside the feature.
