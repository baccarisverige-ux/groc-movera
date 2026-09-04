# Map Sheet V2

This module is the isolated interaction system for the Movera map offer sheet.

## Dependency direction

- `core/` — pure deterministic state and policy. No React, DOM, Motion, browser or map engine imports.
- `ports/` — dependency contracts used by the application/core boundary. No runtime/browser implementation.
- `application/` — use-cases and orchestration. May depend on core + ports, never adapters/UI.
- `adapters/` — browser, iOS, Motion, map and React bindings. Implements ports around external runtimes.
- `ui/` — presentation only. No low-level touch/pointer listeners and no direct Motion runtime access.
- `index.js` — the only public import boundary for code outside this feature.

## Migration rule

Phase 1 creates boundaries only. Existing Map behavior remains untouched until later phases are individually validated.

## Future safety

Architecture CI rejects inward dependency leaks, direct DOM/Motion usage in the headless core, low-level gesture ownership in UI, and imports of private `map-sheet` internals from outside the feature.
