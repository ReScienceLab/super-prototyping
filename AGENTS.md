# super-prototyping: directory guide

This repo is two things at once: **a plugin you install into other projects**,
and **a workspace whose own boards are that plugin's worked examples**. The
split matters for every change here. The plugin ships *code*; a user's project
holds only *data*.

Code, shipped to every install:

`skills/` holds `clone-prototype`, `new-ui-mock` and `prototype-canvas`.
`.claude/skills/` and `.agents/skills/` are symlinks to it, so this checkout
loads the same tree an install does.

`canvas/` is the tldraw viewer, built with Bun and Vite. It discovers
`<boards dir>/*/*.html` one level deep, where the boards dir is
`PROTOTYPING_CANVASES_DIR` and falls back to this repo's `mockups/canvases`.
Discovery is the `prototyping-canvases` plugin in `canvas/vite.config.ts` —
a generated virtual module, not an `import.meta.glob`, because a glob pattern
is a build-time literal and could only ever read one hard-coded directory.

`tools/` is a Python package, `super-prototyping-tools`. It installs `refkit`
(measure, shoot, diff, check tokens), `artgen` (the rare asset that has to be
drawn) and `sp-canvas` (start the canvas against a project's boards) as
commands on PATH. The skills invoke them by name, never by path: no agent
product exposes its plugin root to a shell, so a path-based invocation would
need a different spelling per product.

`.claude-plugin/` and `.codex-plugin/` are the per-product manifests, and
`scripts/install-skills.sh` links the skills into products that read a skills
directory. `scripts/bump-version.sh` moves every version in `.version-bump.json`
at once; run it with `--check` before releasing.

Data, this repo's own:

`mockups/canvases/<slug>/` is one folder per app canvas. The conventions and
the `layout.json` schema are in `mockups/canvases/README.md`, and portably in
`skills/prototype-canvas/references/layout.md` — keep the two in step. Start a
new folder with `cp -r mockups/canvases/templates mockups/canvases/<slug>`.

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

A decision worth rereading goes in `docs/YYYY-MM-DD-slug.md`.
