# CyberChef in CTF Army Knife

The `/cyberchef` page hosts the full upstream application in an iframe, including
its editors, operations, workers, and browser storage. It uses the existing
Next.js server on port 4000. The Python backend is not involved.

## First source import

The upstream source is pinned in `integration/cyberchef/upstream.json`. It must
be imported into Git before this integration can build. The import needs GitHub
access; it deliberately does not download arbitrary `latest` code at startup.

1. Review and commit the integration changes so the working tree is clean.
2. Run `npm run cyberchef:import` with Node 24 and Git (including `git subtree`).
3. Review the generated `integration/cyberchef/upstream-files.json` and commit it.

The import verifies the tag's exact commit before adding a squashed subtree at
`vendor/cyberchef`. A normal clone subsequently contains the complete source;
contributors do not need submodules or a second GitHub repository. Do not put
placeholder source files in that directory.

## Development and production

```powershell
npm ci
npm run cyberchef:setup
npm run dev
```

`setup` copies the pinned source into `.cache/cyberchef/work`, applies the tracked
source customizations, and installs CyberChef's separately locked dependencies.
`dev` and `build` run `cyberchef:build` automatically. A matching distribution is
verified and reused; a stale or damaged one is rebuilt. A missing import fails
with an actionable error. Nothing falls back to the public CyberChef website.

The first build is substantial. Allow several minutes, several GB of disk space,
and at least 8 GB of available build memory. The build uses an 8 GB Node heap
unless `NODE_OPTIONS` is already configured. Builds require package registry
access unless dependencies have already been installed. Production startup does
not install dependencies, compile CyberChef, or fetch assets.

```powershell
npm run test:integration
npm run lint
npm run cyberchef:test-upstream
npm run build
npx playwright install chromium firefox
npm run test:browser
npm run start
```

`cyberchef:verify` compares the staged distribution with its full SHA-256 asset
inventory. It also verifies source provenance, customization inputs, and catalog
metadata. Build-time operation names and categories must match before and after
production compilation; the original source inventory must remain unchanged.

## Theme, links, and data

The tracked CSS and bridge under `integration/cyberchef` are copied into upstream
source **before compilation**, so changes also reach the downloadable application.
The community theme is the default. Users can still select an upstream theme.
Change these integration files, not the generated public assets or cache.

The application shell stays compact: a shared tool rail, a short CyberChef
header, copy-link and standalone-workspace actions, and a small status footer.
Amber accents and dark panels match the existing tools. The four-pane workspace
keeps the full upstream operation catalog.

To test against an already-running server, set `PLAYWRIGHT_BASE_URL` to its URL
before `npm run test:browser`. Otherwise Playwright starts the production server
on port 4000 itself.

The build also applies `webpack-compat.cjs` to normalize resource paths for
Windows and POSIX. This keeps dependency JavaScript out of Babel unless upstream
explicitly includes it, routes bitmap fonts to asset loaders, and limits global
JavaScript shims to JavaScript files. Installed dependencies survive source-only
customization changes; an upstream lockfile change still triggers `npm ci`.

Recipe links use `/cyberchef#recipe=…&input=…`; CyberChef's hash syntax is retained.
The frame uses `/tools/cyberchef/<build-id>/index.html`. A small validated
same-origin bridge synchronizes fragments without moving the frame away from its
asset directory. Input in a shared fragment is visible to anyone receiving that
link. Recipes and settings use the upstream browser-local storage behavior and
survive asset version changes on the same origin.

Ordinary transformations execute in the browser. Operations explicitly performing
network requests retain their upstream behavior, need connectivity, and may be
limited by CORS or other browser policies. Do not describe those operations as
offline. The integration adds no analytics or input-upload endpoint.

## Deployment and rollback

Deploy the complete Next.js build **and** `apps/web/public/tools/cyberchef`, including its
manifest and every versioned asset, from the same build job. A standalone Next.js
package also needs the public directory copied into its runtime image. Configure
any reverse proxy to preserve static asset paths, WASM MIME types, and same-origin
framing. Do not apply a global `frame-ancestors 'none'` or restrictive iframe
sandbox to CyberChef. Serve production over HTTPS for clipboard APIs.

The versioned asset directories default to Next.js's conservative public-file
caching. Do not cache `manifest.json` as immutable. Roll back the complete prior
deployment artifact, not just its React bundle. Review application/server errors
and browser test traces for startup or resource failures; do not log recipe
fragments or input to diagnose them.

## Updating upstream

Use a clean branch and choose a release explicitly. Resolve and review its commit,
then use `git subtree pull --prefix=vendor/cyberchef
https://github.com/gchq/CyberChef.git <reviewed-tag> --squash`. Update the pin and
run `npm run cyberchef:baseline` from that pristine reviewed import. This checks
every source file against the pinned Git blobs before writing the inventory;
the pinned commit must be available locally after the subtree fetch. Do not accept
an inventory generated from arbitrary local modifications. Keep upstream import changes separate from theme
changes. The builder intentionally stops if its exact source patch anchors drift.
Review those anchors, then run the full validation commands above.

## Release checklist

CI covers source/integrity helpers, bridge message validation, known-answer
recipes, compression/Unicode round trips, catalog parity, sharing, history,
file loading, downloads, recovery, sidebar navigation, and narrow viewports.
The upstream operation suite provides wider engine coverage.

Before releasing a new upstream version, also manually exercise the following
in Chromium and Firefox. These are release gates, not claims of automated coverage:

- OCR with a local image; confirm its worker, language data, and WASM load locally.
- Disassembly, Argon2/WASM, AES with known vectors, XOR, Magic, and image output.
- Drag/reorder/disable operations, breakpoints, stepping, Auto Bake, multiple
  inputs, recipe JSON export/import, and saved-recipe persistence after reload.
- An intentional network operation against an endpoint you control, including
  its browser CORS failure state.
- Malformed recipe links and missing lazy-loaded chunks; ensure errors are
  visible and a subsequent valid recipe/reload works.
- Direct workspace links and the downloadable ZIP from a local HTTP server.

Preserve upstream copyright, Apache-2.0, third-party notices, and modification
notices in both the hosted and downloadable distributions. A full catalog is
parity with the pinned release, not a guarantee about every possible input.
