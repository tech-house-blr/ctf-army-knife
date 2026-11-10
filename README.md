# A Swiss army Knife for CTFs

An all-in-one web app of tools for CTFs:

1. GPG/PGP Decoder
2. CyberChef
3. AperiSolve: image steganography analysis
4. Cryptogram Solver

## Quick start

### Docker

```bash
docker compose up --build
```

Open http://localhost:4000. The browser only talks to the web container, which
proxies `/api/*` to the API container. The first build takes a while because it
compiles CyberChef; after that it is cached until `vendor/`, `integration/` or
`scripts/` change.

### Local development

You need Node.js 24 and Python 3.12 or newer. No Docker needed.

```bash
npm run setup      # once: npm ci, the API virtualenv and its packages, CyberChef
npm run dev:all    # API on :8000 and web app on http://localhost:4000, in one terminal
```

`dev:all` labels each server's output and stops both on Ctrl+C. It reuses the
existing CyberChef build; run `npm run cyberchef:build` after changing
`integration/cyberchef/`. AperiSolve's CLI tools (binwalk, zsteg, steghide,
ExifTool...) are only installed in the API's Docker image, so locally those
analyzers report "not installed".

To run the servers separately: `npm run dev -w @ctf-army-knife/web` for the web
app, and `apps/api/.venv/bin/uvicorn ctf_api.main:app --reload --port 8000`
(from `apps/api`) for the API.

The web app proxies `/api/*` to `API_URL` (default `http://127.0.0.1:8000`),
so frontend code always calls same-origin paths like `fetch("/api/solve")`.

## Repository layout

```
apps/
  web/                    Next.js frontend (npm workspace)
    app/<tool-slug>/      one route per tool, kebab-case
    app/api/[...path]/    same-origin proxy to the API
    lib/tools/registry.ts the list of tools shown in the sidebar and dashboard
    lib/tools/<tool>/     client-side logic for a tool (e.g. gpg-decoder/)
  api/                    FastAPI backend
    ctf_api/main.py       wires tool routers together
    ctf_api/tools/<tool>/ server-side logic for a tool (e.g. cryptogram/)
    tests/
vendor/cyberchef/         pinned upstream CyberChef source (git subtree)
integration/cyberchef/    our theme, bridge and build patches for CyberChef
scripts/                  CyberChef build tooling; setup, dev:all and test:api helpers
tests/
  web/                    unit tests for client-side tool logic
  cyberchef/              CyberChef integration tests
  browser/                Playwright end-to-end tests
docs/                     longer-form documentation
```

## Adding a tool

1. Add an entry to `apps/web/lib/tools/registry.ts`. The sidebar and dashboard
   pick it up automatically.
2. Create the page at `apps/web/app/<slug>/page.tsx`.
3. Put the tool's logic in `apps/web/lib/tools/<slug>/` if it runs in the
   browser. If it needs the server, put it in `apps/api/ctf_api/tools/<name>/`
   with a `router.py`, register the router in `ctf_api/main.py`, and set
   `needsApi: true` in the registry. Call it from the page as `/api/...`.
4. Add tests under `tests/web/` or `apps/api/tests/`.

`npm run test:unit` fails if a registry entry has no page, or a page is missing
from the registry.

### Tools that run external programs

Anything that runs a CLI tool (steghide, binwalk, zsteg, ...) on user files must
go through `ctf_api/core/sandbox.py`, never `subprocess` directly:

```python
from ctf_api.core.sandbox import run_tool, save_upload, workspace

@router.post("/api/my-tool")
async def analyze(file: UploadFile):
    with workspace() as cwd:                      # private temp dir, always deleted
        image = cwd / "input"
        await save_upload(file, image)            # 413 above TOOL_MAX_UPLOAD_BYTES
        result = run_tool(["exiftool", image], cwd=cwd, timeout=20)
    return result.to_dict()                       # missing tool / timeout reported, not raised
```

`run_tool` runs without a shell, kills the whole process tree on timeout, caps
CPU, memory and file size, truncates output, and hides server environment
variables. Register new executables in `ctf_api/core/external_tools.py` and
install them in `apps/api/Dockerfile`. `GET /api/capabilities` reports which
ones a deployment has.

## Tests

```bash
npm run test:unit                 # client-side tool logic
npm run test:integration          # CyberChef build tooling
npm run lint
npm run test:browser              # Playwright; needs `npx playwright install`
npm run test:api                  # API, in its virtualenv (tool tests skip if a tool isn't installed)
```

## AperiSolve

`/aperisolve` takes an upload and runs every applicable analyzer in parallel,
streaming each result as it finishes: bit planes, colour remapping, PNG repair
(PCRT), file, ExifTool, binwalk, foremost, pngcheck, identify, steghide, zsteg
and strings, plus OutGuess with "Deep analysis". Generated images and extracted
archives are kept for 30 minutes (and within a 256 MiB total budget, oldest
first), then deleted. If the browser disconnects, the API kills that analysis's
running tools.

The analyzers are adapted from [AperiSolve](https://github.com/Zeecka/AperiSolve)
(MIT); see `apps/api/ctf_api/tools/aperisolve/NOTICE`. Not ported (yet): jsteg,
jpseek and OpenStego, which aren't packaged for Debian, and upstream's audio
spectrogram and PDF analyzers. Limits are set with `APERISOLVE_*` environment
variables in `ctf_api/tools/aperisolve/` (upload size, tool timeout, image size,
result TTL, stored-results budget, concurrent analyses). The web page reads the
upload limit from the API, but uploads above 25 MiB also need the proxy's
`API_MAX_BODY_BYTES` raised.

## CyberChef integration

CyberChef is built from a pinned upstream source subtree with a community theme,
and the Next.js server serves it. See
[setup, validation, deployment, and updates](docs/cyberchef.md).

## Branding and licences

The interface carries the Tech House BLR logo: the original brand images from
the Tech House website, trimmed and exported at their display sizes in
`apps/web/public/brand` (used by `apps/web/components/brand.tsx`), and the mark
as the favicon (`apps/web/app/icon.png`). The Tech House brand assets are
CC BY-NC-ND 4.0 and belong to Tech House BLR; they are not covered by this
repository's code licence, so don't reuse or modify them outside this project
without permission.

Fonts in `apps/web/public/fonts` are under the SIL Open Font License (see the
`OFL-*.txt` files beside them): IBM Plex Sans and Mono for the interface, and
BBH Hegarty, the Tech House display face, for names and titles.
