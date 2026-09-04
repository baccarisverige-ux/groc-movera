# Map Sheet V2

This module is the isolated interaction system for the Movera map offer sheet.

## Dependency direction

- `core/` — pure deterministic state, gesture ownership and snap policy. No React, DOM, Motion, browser or map engine imports.
- `ports/` — runtime contracts only. No browser, React, Motion or Map implementation.
- `application/` — state-machine orchestration and user use-cases. Depends only on core + ports.
- `adapters/` — browser/iOS, Motion, map-camera and selection bindings. Implements ports around external runtimes.
- `ui/` — presentation only. No low-level touch/pointer listeners and no direct Motion runtime access.
- `index.js` — the only public import boundary for code outside this feature.

## Migration status

- Phase 1: module boundaries and architecture CI.
- Phase 2: headless state machine, events, commands, gesture policy, snap engine and selectors.
- Phase 3: pure gesture ownership + scroll handoff, Gesture/Scroll ports, Pointer adapter, iOS touch adapter and rubber-band normalization.
- Phase 4: Motion/Map/selection ports and adapters, application controller, command executor and atomic `focusListingOnMap` use-case.

The V2 runtime is still not wired into the production Map UI during Phase 4. Existing Map behavior remains untouched until the UI migration phase is validated.

## Runtime contract

- Core state owns `collapsed`, `middle`, `expanded` and interaction modes.
- The application controller is the only executor of core commands.
- Motion receives normalized progress and never reads Map DOM.
- Map camera receives a listing id plus semantic focus options and never owns sheet state.
- Listing selection is an independent port.
- `focusListingOnMap` is one transaction: select listing → snap sheet to middle → focus exact listing on map → complete state transition.
- A newer focus request supersedes the previous one so camera, selection and sheet cannot drift to different listings.

## Default listing focus contract

The migration adapter preserves the current Map intent: center horizontally, place the focused marker in the upper visible map area (`anchorY = 0.26`), add `0.65` zoom while clamping between `13.6` and `17`, and settle the sheet at `middle`.

## Future safety

Architecture CI rejects inward dependency leaks, React/DOM/Motion in the headless layers, application imports of adapters/UI, legacy Map CSS coupling inside adapters, direct legacy Map feature imports from V2, and imports of private `map-sheet` internals from outside the feature.
