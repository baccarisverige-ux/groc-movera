# Map Sheet V2

This module is the isolated interaction system for the Movera map offer sheet.

## Dependency direction

- `core/` — pure deterministic state, gesture ownership and snap policy. No React, DOM, Motion, browser or map engine imports.
- `ports/` — dependency contracts used at runtime boundaries. No browser implementation.
- `application/` — use-cases and orchestration. May depend on core + ports, never adapters/UI.
- `adapters/` — browser, iOS, Motion, map and React bindings. Implements ports around external runtimes.
- `ui/` — presentation only. No low-level touch/pointer listeners and no direct Motion runtime access.
- `index.js` — the only public import boundary for code outside this feature.

## Migration status

- Phase 1: module boundaries and architecture CI.
- Phase 2: headless state machine, events, commands, gesture policy, snap engine and selectors.
- Phase 3: pure gesture ownership + scroll handoff, Gesture/Scroll ports, generic Pointer adapter, iOS touch adapter and iOS rubber-band scroll normalization.

The V2 runtime is still not wired into the current Map UI during Phase 3. Existing production Map behavior remains untouched until the later migration phase is validated.

## Gesture ownership contract

- Small travel remains a tap.
- Collapsed/middle vertical travel belongs to the sheet, including travel starting on offer content after the drag threshold is crossed.
- Expanded list vertical scrolling stays native.
- Expanded + list at top + downward pull starting on the first offer hands ownership back to the sheet.
- Horizontal travel never becomes a sheet/list vertical drag.
- iOS touchmove is claimable synchronously so Safari native scroll can be cancelled on the exact move where the controller decides the sheet owns the gesture.

## Future safety

Architecture CI rejects inward dependency leaks, direct DOM/Motion usage in the headless core, low-level gesture ownership in UI, legacy Map CSS coupling inside V2 adapters, and imports of private `map-sheet` internals from outside the feature.
