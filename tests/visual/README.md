# Visual regression baseline

`visual-regression.spec.js` diffs Movera's approved layout against golden PNGs
committed in `visual-regression.spec.js-snapshots/`. It is a gate: any pixel
difference fails CI.

This replaced a capture-only spec that wrote screenshots nobody read back, so
the job could not fail on a visual change — only on a crash.

## What is covered

Six states × three widths (320, 390, 1280):

| State | Route | Why |
| --- | --- | --- |
| Home | `/` | category rail, Welcome, collection sections |
| Search · destination | `/` + open | the approved Search transition at rest |
| Search · dates | `/` + open + pick | calendar layout inside the panel |
| Collection · Plage | `/plage` | the shared premium hero |
| Map · offer sheet | `/map` | map chrome, header offset, sheet at its collapsed snap |
| Profile | `/profile` | auth entry layout |

## Recording a baseline

Baselines are recorded **in CI only**, inside
`mcr.microsoft.com/playwright:v1.55.0-noble`. Fonts, browser build and
rasteriser all leak into a PNG, so a baseline generated on a laptop or in a dev
container will not match the runner and will fail for reasons that have nothing
to do with Movera.

To add a state, or to re-record after an **intentional, approved** design
change:

1. Delete the affected PNGs (or add the new test with no PNG).
2. Push. The visual job fails with `A snapshot doesn't exist at …` and uploads
   the rendered image in the `visual-playwright-report` artifact under
   `test-results/`.
3. Take the `-actual.png` files from that artifact, drop them into
   `visual-regression.spec.js-snapshots/` under the name the failure reports,
   and commit.
4. The next run compares and goes green.

Step 3 is deliberately manual. There is no job that overwrites baselines on its
own — that would turn every regression into a silently accepted new normal.

## Why the network is blocked

The spec aborts every request that is not the local preview server. Unsplash
photos, OSM tiles and Google's runtime all vary between runs, and the proxy in
front of CI can stall or reset them. Blocked, the app renders the bundled
fallbacks that `tests/e2e/critical-regressions.spec.js` already pins, so the
pixels depend only on Movera's own CSS and assets.

## Tolerance

`maxDiffPixels: 0`. A tolerance here would absorb exactly the small geometry
shifts a CSS cleanup can introduce, which is the thing this suite exists to
catch. If it ever proves flaky, fix the source of the flake rather than raising
the number.
