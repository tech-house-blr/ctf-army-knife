# A Swiss army Knife for CTFs

An all-in-one web app of tools for CTFs:

1. GPG/PGP Decoder
2. CyberChef
3. AperiSolve (planned)
4. Cryptogram Solver

## Quick start

### Docker

```bash
docker compose up --build
```

The web UI is on http://localhost:4000 and the API is on http://localhost:8000.
The first build takes a while because it compiles CyberChef.

### Local development

You need Node.js 24 and Python 3.12 or newer.

```bash
# Web app (also builds CyberChef the first time)
npm ci
npm run dev                      # http://localhost:4000

# API, needed by the cryptogram solver
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn ctf_api.main:app --reload --port 8000
```

## Repository layout

```
apps/
  web/                    Next.js frontend (npm workspace)
    app/<tool-slug>/      one route per tool, kebab-case
    lib/tools/registry.ts the list of tools shown in the sidebar and dashboard
    lib/tools/<tool>/     client-side logic for a tool (e.g. gpg-decoder/)
  api/                    FastAPI backend
    ctf_api/main.py       wires tool routers together
    ctf_api/tools/<tool>/ server-side logic for a tool (e.g. cryptogram/)
    tests/
vendor/cyberchef/         pinned upstream CyberChef source (git subtree)
integration/cyberchef/    our theme, bridge and build patches for CyberChef
scripts/                  CyberChef build tooling
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
   `needsApi: true` in the registry.
4. Add tests under `tests/web/` or `apps/api/tests/`.

## Tests

```bash
npm run test:unit                 # client-side tool logic
npm run test:integration          # CyberChef build tooling
npm run lint
npm run test:browser              # Playwright; needs `npx playwright install`
cd apps/api && pytest             # API
```

## CyberChef integration

CyberChef is built from a pinned upstream source subtree with a community theme,
and the Next.js server serves it. See
[setup, validation, deployment, and updates](docs/cyberchef.md).
