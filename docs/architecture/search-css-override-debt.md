# Search CSS override debt

What Phase 8b removed, what it could not remove, and why.

## Result

`searchTransition-stability.css` went from **114 `!important` declarations to
62** — 52 removed, 46%. Every removal was verified against the golden visual
gate (49 comparisons across 7 states × 7 approved widths) plus the behavioural
Search suites, and each landed as its own commit.

| Category | Properties | Result |
| --- | --- | --- |
| Paint | background, background-color, box-shadow, border-color, color, filter | **removed** (18) |
| Motion | transition, transition-duration, transition-timing-function, transition-delay, will-change | **removed** (15) |
| Typography | font-size, font-weight, letter-spacing, line-height | **removed** (5) |
| Scroll lock | overflow, overscroll-behavior, touch-action, pointer-events | **removed** (14) |
| Spacing | margin-top, padding, padding-bottom, gap | **load-bearing** |
| Geometry | height, max-height, min-height, --st-panel-height, top, left, width, transform, transform-origin, flex, border-radius, opacity, display | **load-bearing** |

The removed categories were redundant for a simple reason:
`searchTransition-stability.css` is imported *after* `searchTransition.css`
(both from `SearchTransitionHost.jsx`), so at equal specificity it already wins.
The `!important` was carrying no weight it did not already have.

## Why spacing and geometry could not follow

They are not competing with `searchTransition.css`. They are competing with a
*different stylesheet that loads later still*.

`src/main.jsx` imports `src/styles/search-popup-continuity.css`. That file
carries **240 `!important` declarations** and targets Movera's Search selectors
**71 times**, at higher specificity. For example:

```css
/* src/styles/search-popup-continuity.css */
.movera-st .movera-st__recent-block { margin-top: 9px !important }
```

against

```css
/* src/features/search/searchTransition-stability.css */
.movera-st__screen--destination .movera-st__recent-block { margin-top: 7px !important }
```

Drop the `!important` from the second and the first wins — the approved spacing
changes. The gate caught exactly this: removing the spacing category failed
`Search · destination` at every width, and removing geometry failed it at five.

So those declarations are not debt. They are the mechanism by which the panel's
approved layout survives a stylesheet that would otherwise overrule it.

## The real finding

The audit threshold counts `!important` in two files —
`searchTransition.css` (3) and `searchTransition-stability.css` (62 after this
work) — and compares the total against 35. That framing understates the
problem in one direction and overstates it in another.

Understates: Search styling is spread across **at least nine** stylesheets.
`search-popup-continuity.css` alone has 240 overrides, more than double what
the audit measures, and it is not counted at all. `searchStepFit.css` (35),
`search-close-sync.css` (67), `search-hit-target-fix.css` (22),
`searchExactFit.css` (18) and others add more.

Overstates: the 62 that remain are not removable by tidying. They are load
bearing *because* of the files the audit does not count. Chasing the number to
35 by deleting them would change the approved design.

The structural fix is to consolidate the Search CSS so one layer is genuinely
last and the competition disappears — after which most of the remaining 62
would become removable. That is a restructuring of how Search styles load, not
a cleanup, so it is **not** done here and needs approval before anyone starts.

## Method, for whoever continues this

1. Generate a local exploratory reference from the current build. Keep it
   **outside the repo** — this dev container cannot reproduce CI pixels, and a
   locally recorded golden would be wrong in a way that only surfaces later.
2. Remove one category at a time.
3. Rebuild, then run the visual suite, `search-panel-placement.spec.js` and
   `search-uat-cleanup.spec.js`. For behavioural categories add
   `search-modal-focus-regressions.spec.js` and a mobile WebKit pass.
4. Keep the removal only if everything stays green. Otherwise revert it and
   record why it is load-bearing.
5. Push and let the pinned CI container deliver the verdict. Local green is a
   hint; CI green is the acceptance.

Never lower `maxDiffPixels`, and never change the approved design to make a
removal possible.
