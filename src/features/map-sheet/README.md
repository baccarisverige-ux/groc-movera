# Map Sheet V2

This module is the isolated interaction system for the Movera map offer sheet.

## Dependency direction

- `core/` — pure deterministic state, gesture ownership and snap policy. No React, DOM, Motion, browser or map engine imports.
- `ports/` — runtime contracts only. No browser, React, Motion or Map implementation.
- `application/` — state-machine orchestration and user use-cases. Depends only on core + ports.
- `adapters/browser/` — Pointer/iOS event translation and iOS scroll normalization.
- `adapters/motion|map|state/` — outbound adapters around external runtimes; no Map DOM ownership.
- `adapters/react/` — the inbound composition boundary that connects React to the application controller and ports.
- `ui/` — presentation-only destination for the final view boundary. No low-level touch/pointer ownership.
- `index.js` — the only public import boundary for code outside this feature.

## Migration status

- Phase 1: module boundaries and architecture CI.
- Phase 2: headless state machine, events, commands, gesture policy, snap engine and selectors.
- Phase 3: pure gesture ownership + scroll handoff, Gesture/Scroll ports, Pointer adapter, iOS touch adapter and rubber-band normalization.
- Phase 4: Motion/Map/selection ports and adapters, application controller, command executor and atomic `focusListingOnMap` use-case.
- Phase 5: production Map offer sheet bridge is wired to the V2 controller/runtime while preserving the existing markup, CSS classes and public `MapPage` contract. Programmatic open/close, manual drag, list handoff and map focus now use the same semantic state machine.

Legacy Map gesture/motion files remain in the repository only as rollback material during Phase 5. They are no longer imported by `MapOfferSheet` and are scheduled for deletion in Phase 6 after the migrated UI passes the complete browser/WebKit gate.

## Runtime contract

- Core state owns `collapsed`, `middle`, `expanded` and interaction modes.
- Manual release resolves to one of those semantic snap positions; the sheet does not free-stop between them.
- Collapsed/middle vertical gestures can start on offer content and belong to the sheet after the drag threshold.
- When expanded, native list scrolling wins until the list is at its top edge and a downward pull starts on the first offer; only then does ownership hand back to the sheet.
- Horizontal rails are never converted into vertical sheet drags.
- Small finger travel stays a tap and must not break `Voir sur la carte`.
- The application controller is the only executor of core commands.
- Motion receives normalized progress and never reads Map DOM.
- Map camera receives a listing id plus semantic focus options and never owns sheet state.
- Listing selection is an independent port.
- `focusListingOnMap` is one transaction: select listing → snap sheet to middle → focus exact listing on map → complete state transition.
- A newer focus request supersedes the previous one so camera, selection and sheet cannot drift to different listings.

## Default listing focus contract

The migration adapter preserves the current Map intent: center horizontally, place the focused marker in the upper visible map area (`anchorY = 0.26`), add `0.65` zoom while clamping between `13.6` and `17`, and settle the sheet at `middle`.

## Future safety

Architecture CI rejects inward dependency leaks, React/DOM/Motion in the headless layers, application imports of adapters/UI, legacy Map CSS coupling inside adapters, direct legacy Map feature imports from V2, and imports of private `map-sheet` internals from outside the feature. During Phase 5 it also verifies that the production `MapOfferSheet` enters V2 only through the public `features/map-sheet/index.js` boundary and no longer imports the retired Map gesture/motion runtime.
