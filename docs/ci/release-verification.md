# Release verification

What the release gate actually proves about a deployed Movera build, and the
one thing it does not.

## The gate

Every merge to `main` runs five workflows against the merged commit — not
against a pull request's merge preview:

| Workflow | Covers |
| --- | --- |
| Movera Quality Gate | Architecture contract, lint, unit, integration, build, bundle budget, cleanup audit; E2E + responsive + a11y on desktop/mobile × Chromium/WebKit; Android Chrome flows; Map regressions on four projects; Final Map UAT on five projects including Firefox; visual regression across the seven approved widths; Lighthouse budgets |
| Movera Production Parity | Chromium and WebKit against a build using the production `/groc-movera/` base path |
| Voyageur E2E UAT | The Voyageur journey |
| CodeQL Security | Static analysis |
| Deploy Movera Host to GitHub Pages | Publishes, pinned to the tested commit |

Pages deployment is `workflow_run`-triggered and gated on the Quality Gate
concluding `success`, deploying `github.event.workflow_run.head_sha`. There is
no push trigger and no `workflow_dispatch` bypass, so a commit cannot reach
production without having passed. `scripts/check-release-gates.mjs` enforces
all of that, plus the presence of every required npm script and browser
project, and fails the build if any of it is removed.

## Verifying a deployed build by hand

The deployed JS bundle hash will **not** match a local `npm run build`. That is
expected, not drift: the deploy step injects `VITE_GOOGLE_MAPS_API_KEY` from
secrets, and Vite inlines it, so the JS hash is key-dependent.

The CSS bundle is not affected by that variable, so it *is* directly
comparable, and it is the useful check:

```sh
# hash of the deployed CSS
curl -s https://baccarisverige-ux.github.io/groc-movera/ | grep -o 'index-[^.]*\.css'

# same file built from the commit under test
npm run build && ls dist/assets/ | grep '\.css$'
```

Matching CSS hashes mean the deployed styles are byte-identical to that
commit's source. To confirm the JS difference is only the injected key, build
twice — once with `VITE_GOOGLE_MAPS_API_KEY` unset and once with any dummy
value — and observe that the JS hash changes while the CSS hash does not.

Deep links return HTTP 404 while serving the SPA shell. That is GitHub Pages'
`404.html` fallback (the deploy copies `index.html` to `404.html`) and the
router resolves the route client-side. It is the intended design, not a fault.

## The gap: nothing tests the live origin

Production Parity is the closest thing, and it is genuinely close — real
browsers against a real production-base-path build. But it runs against a local
preview server. **No job loads
`https://baccarisverige-ux.github.io/groc-movera/` in a browser.** So the gate
proves the artifact is correct and that the correct artifact was published; it
does not prove the published origin serves it correctly to a browser — Pages
routing, caching headers, and the `404.html` fallback under a real user agent
are all unverified by automation.

That gap is small but real, and closing it has a genuine cost: a job depending
on a third-party origin can fail for reasons unrelated to the change under
test, which is exactly the kind of noise this program spent its time removing.
A live smoke would need to be strictly limited — boot, base path, one route —
and treated as informational rather than as a merge blocker.

**This is a proposal, not a decision.** It adds an external dependency to CI
and needs approval before anyone builds it.

### Status at the close of stabilization: unverified

A live browser smoke against the deployed origin **was attempted and did not
complete**. It is recorded here as **unverified — not passed, and not failed**.

All cases aborted at navigation with `ERR_CONNECTION_RESET`, and the cause was
the sandbox rather than the site: `curl` reached the same URL and returned 200,
and the agent proxy's own `recentRelayFailures` listed
`baccarisverige-ux.github.io:443` with tunnels closing mid-exchange. No
conclusion about the deployment can be drawn from that run in either
direction.

What *is* verified about the deployment is listed above — asset reachability
over HTTP, CSS byte-identity with the tested commit, and the `404.html`
fallback — none of which required a browser.

Anyone running a live check from a dev container will hit the same wall. Check
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` before believing a browser
failure against `github.io`; it is an environment artefact and says nothing
about the deployment.
