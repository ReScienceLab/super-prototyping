# super-prototyping: directory guide

`canvas/` is the tldraw viewer, built with Bun and Vite. It discovers
`mockups/canvases/*/*.html` one level deep. There is no registry and no
build step per board.

`mockups/canvases/<slug>/` is one folder per app canvas. The conventions and
the `layout.json` schema are in `mockups/canvases/README.md`. Start a new
folder with `cp -r mockups/canvases/templates mockups/canvases/<slug>`.

`.agents/skills/` holds `clone-prototype`, `new-ui-mock` and
`prototype-canvas`. The entries in `.claude/skills/` are symlinks to them.

`tools/` holds `refkit.py`, which measures, shoots, diffs and checks tokens,
and `artgen.py`, for the rare asset that has to be drawn.

Rules inside a canvas folder:

- `gen.py` is the only source of truth. The `NN-*.html` boards are its
  output. Edit the generator and re-run, never the HTML.
- Commit `layout.json`, `icon.png` and `assets/`. `gen.py` inlines the
  images in `assets/` as `data:` URIs.
- Commit `probes.json`, `crops.json` and `assets.json`. They are the
  measurement evidence behind the tokens.
- Never commit `ref-*.html` or `assets/refs/`. They hold third-party
  captures, the root `.gitignore` already excludes them, and the
  clone-prototype skill rebuilds them. `spotify-ios` is the one exception:
  its five `ref-*` boards are committed so the hosted canvas shows them.
- Put everything else a run makes in `scratch/`. The root `.gitignore`
  ignores it at any depth. Do not use the repo root or a dot directory.
- Give every folder a `README.md`. Do not give any folder a `.gitignore`.
  The one exception is `.github/`: GitHub shows `.github/README.md` instead
  of the root README, so its guide lives in `CONTRIBUTING.md`.

A decision worth rereading goes in `docs/YYYY-MM-DD-slug.md`. Create `docs/`
with the first one.
