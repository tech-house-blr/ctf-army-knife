# Contributing to CTF Army Knife

Thanks for taking the time to help out. This project is a collection of CTF tools behind one self-hosted web app, and it's built to make adding your own tool straightforward. Code, bug fixes, docs and design work are all welcome.

By taking part, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Add a tool.** The most useful contribution. See [Adding a tool](README.md#adding-a-tool) — one registry entry, one page, and the sidebar and dashboard pick it up automatically.
- **Fix a bug or improve an existing tool.** Open an issue first if it's a behaviour change worth discussing.
- **Improve the docs.** Corrections, clearer wording, better examples.
- **Design and artwork.** The app needs a logo and icon of its own (see the note on brand assets below) — a great first contribution if you're a designer.

## Getting set up

See [Quick start](README.md#quick-start) in the README. In short:

```bash
npm run setup      # once: deps, the API virtualenv, CyberChef
npm run dev:all    # API on :8000 and web on http://localhost:4000
```

## Before you open a pull request

Run the checks that CI runs, so your PR goes green the first time:

```bash
npm run lint
npm run test:unit
npm run test:api   # if you touched the API
```

See [Tests](README.md#tests) for the full list. A few things CI enforces:

- `npm run test:unit` fails if a registry entry has no page, or a page isn't in the registry.
- `reuse lint` fails if any file has no declared licence (see below).
- Anything that runs an external CLI tool on user files **must** go through `ctf_api/core/sandbox.py`, never `subprocess` directly.

Keep pull requests focused — one change per PR is easier to review and merge.

## Licensing of contributions

By contributing, you agree that your contributions are licensed under **GPL-3.0-only**, the licence of the project as a whole. The repository follows the [REUSE specification](https://reuse.software), so **every new file needs a declared licence and copyright holder** — most are covered automatically by the catch-all rule in [`REUSE.toml`](REUSE.toml); add an entry there if yours shouldn't be.

For design and artwork specifically:

- **You keep your copyright.** Contributing a logo, icon or illustration doesn't sign it away — you remain free to use your work anywhere else, including in your portfolio and commercially.
- **The default licence is GPL-3.0-only**, the same as the rest of the project, so your work can ship with the app. If you'd rather contribute a visual asset under a different open licence (for example CC-BY-4.0), just say so in the issue or pull request and we'll record it in `REUSE.toml` before merging.
- **The Tech House BLR brand assets are off-limits for reuse.** The `apps/web/public/brand/techhouse-*` images and the favicons are CC BY-NC-ND 4.0 and belong to Tech House BLR; please don't modify them or base contributions on them. A logo for CTF Army Knife itself, distinct from the Tech House brand, is very welcome.

## Questions

Open an issue, or reach the maintainers through the [Tech House BLR](https://www.techhouseblr.com) links in the README footer.
