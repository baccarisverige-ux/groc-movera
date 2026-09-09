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

### Status: verified once, manually, on 2026-09-09

A live browser smoke against the deployed origin has now **completed and
passed**, against `4f2abb6`. This supersedes the earlier *unverified* status.

It was run by hand, not by CI. The proposal above is still a proposal.

What the run covered, in WebKit at 390×844 against
`https://baccarisverige-ux.github.io/groc-movera/`:

| check | result |
|---|---|
| navigation | HTTP 200, `page-home` mounted |
| deep routes under the base path | `/map`, `/favorites`, `/profile` all mounted |
| console errors / page errors / failed requests | 0 / 0 / 0 |

It also confirmed the origin serves the *current* styles rather than a cached
build: the selected category pill computed to 11 box-shadow layers and
`linear-gradient(rgb(228,228,228), rgb(227,227,227) 55%, rgb(226,226,226))`,
which is the rule introduced in that commit and exists in no earlier one.

#### The earlier failure was Chromium, not the site

The original attempt aborted at navigation with `ERR_CONNECTION_RESET`. That
reproduces exactly, and the cause is now identified: **the agent proxy's relay
cannot carry a Chromium TLS tunnel**, in this sandbox, to any host.
`recentRelayFailures` shows `ws_closed_mid_exchange` — "tunnel closed (code
1006) after 6s; ~1.8 kB sent, 39 B received" — not only for
`baccarisverige-ux.github.io:443` but simultaneously for `www.google.com`,
`accounts.google.com`, `redirector.gvt1.com` and `android.clients.google.com`,
i.e. Chromium's own background requests. Nothing about this repository is
involved.

**WebKit through the same proxy works.** That is the whole fix, and it is why
this check can be run at all now.

So: if a live browser check fails here, try WebKit before believing it, and
read `curl -sS "$HTTPS_PROXY/__agentproxy/status"`. A Chromium reset against
`github.io` from a dev container is an environment artefact and says nothing
about the deployment.

#### What this does and does not establish

It establishes that the published origin boots, routes under the base path, and
serves the tested styles, in a real browser, at one point in time.

It is a single manual run on one engine at one width. It is **not** a
substitute for the automated smoke proposed above, and it does not run on
future deploys. The reachability, byte-identity and `404.html` checks listed
earlier remain the automated part of this story.
