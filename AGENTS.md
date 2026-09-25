# super-prototyping: directory guide

This repo is two things at once: **an app and skills you use on other projects**,
and **a workspace whose own boards are their worked examples**. The
split matters for every change here. The app ships *code*; a user's project
holds only *data*.

Code, shipped to every install:

`skills/` holds `sp-clone-prototype`, `sp-new-ui-mock`, `sp-prototype-canvas`,
`sp-define-product`, `sp-brand-kit` and `sp-scene-video`.
`.claude/skills/` and `.agents/skills/` are symlinks to it, so this checkout
loads the same tree an install does.

`canvas/` is the tldraw viewer, built with Bun and Vite. Its server serves
every project under `~/Documents/Super Prototyping` (`PROTOTYPING_PROJECTS_DIR`
moves it) at `/p/<name>/`, and no folder anywhere else, with this repo's
`canvases` as the examples shown beside each project's own.
`docs/2026-09-23-projects-folder-only.md` says why. A
project's boards are its `canvases`, discovered as `*/*.html` one level
deep. Discovery is `boardIndex()` in `canvas/server/boards.ts`, served as JSON at
`/__sp/index.json` by `canvas/server/sp.ts` and written into `dist` by the
build — not an `import.meta.glob`, because a glob pattern is a build-time
literal and could only ever read one hard-coded directory. The same index
carries a project's documents, for now only the `PRD.md` at its root. Each
is a tab before the canvases, shown rendered or as editable text (`DOCS` in
`boards.ts`, `DocTab.tsx`). `sp start`
runs the built app, `dist/server.mjs`: the release's `canvas-dist.tgz`
fetched into `~/.cache/super-prototyping/<version>/` for an install, or this
checkout's own `canvas/dist` when `canvas/node_modules` exists. The canvas's
`dev` script mounts the same server under Vite, for working on the app. It opens
on the home page with no project, as the app does: this checkout's canvases are
the examples there, not a project of their own.

The hosted canvas is that build on Cloudflare Pages, and it lives at
`prototyping.rescience.com/demo/` now: the root is the download page, whose
repo is `ReScienceLab/super-prototyping-landing`, and its Worker passes
`/demo/*` through to the Pages deploy. Nothing here deploys it — the Pages
project builds this repo on its own — so the move is only the addresses in
this checkout. `docs/2026-09-23-landing-page.md` says why the page is a
separate repo and why the canvas is proxied rather than redirected.

`tools/` is a Python package, `super-prototyping-tools`. It installs `refkit`
(measure, shoot, diff, check tokens), `artgen` (the rare asset that has to be
drawn) and `sp` (start the canvas against a project's boards, and place
things on an open canvas with `sp canvas`) as commands on PATH. The skills invoke them by name, never by path: no agent
product exposes a skill's install root to a shell, so a path-based invocation would
need a different spelling per product.

`desktop/` is the desktop app, for macOS and Windows: Electron around that
same `dist/server.mjs`, forked as a utility process and shown in a window.
`main.ts` is the app,
`launch.ts` holds the helpers `bun test` checks. The app opens on the home page,
which is no project's and lists them all, and on a first launch
`canvas/src/Onboarding.tsx` asks over it which agent to work with. The app ships `canvases` whole, under the
tree it hands the server, which is where the examples come from under
`sp start` too. The
release workflow builds the app on a macOS runner and attaches a dmg per
architecture, signed and notarised, then on a Windows runner and attaches an
unsigned installer. The app updates itself with `electron-updater`, which
`bun build` inlines into `dist/main.mjs`, so it is a devDependency and the app
still ships no `node_modules`. The feed is the release itself: each job also
attaches the files an update is made from, and `latest-mac.yml` or `latest.yml`
last. `docs/2026-09-19-desktop-shell.md` says why Electron, and
what the app keeps in step with `sp`,
`docs/2026-09-21-windows-app-unsigned.md` why the installer is not signed, and
`docs/2026-09-21-auto-update.md` why the updater is this one.

The app is the only install. It ships `skills/`, `tools/` and the built
canvas, and on every launch links them into the machine through
`~/.local/share/super-prototyping/current` (`desktop/launch.ts`). The skills
go into each agent home that exists. `sp`, `refkit` and `artgen` go onto
`~/.local/bin` as links to `tools/bin/sp`, one shim that runs the bundled
toolkit with `uv run`. On Windows the links are junctions and the commands
are a `uv tool install` of the bundled toolkit instead. There are no
plugin manifests. An agent that has only the skills installs the app with
`skills/sp-prototype-canvas/scripts/install.sh`, or `install.ps1` on Windows.
The version the skills and `sp` read is `canvas/package.json`'s.
`scripts/bump-version.sh` moves every version in `.version-bump.json` at once;
run it with `--check` before releasing.

Data, this repo's own:

`canvases/<slug>/` is one folder per app canvas. The conventions and
the `layout.json` schema are in `skills/sp-prototype-canvas/references/layout.md`,
which is the copy that ships inside the app and therefore the one to edit;
`canvases/README.md` covers only what is true of this repo. Start a
new folder with `cp -r canvases/templates canvases/<slug>`.

Rules inside a canvas folder:

- `gen.py` is the only source of truth. The `NN-*.html` boards are its
  output. Edit the generator and re-run, never the HTML.
- Commit `layout.json`, `icon.png` and `assets/`. `gen.py` inlines the
  images in `assets/` as `data:` URIs.
- Commit `PRD.md`, the product the folder prototypes, to the `sp-define-product`
  skill's template. Its Screens table lists the folder's boards.
- Commit `probes.json` and `crops.json`. They are the measurement evidence
  behind the tokens.
- Commit `assets.json` where a folder has one (three do). It is a
  `name → data URI` map of pre-encoded images the generator inlines, not
  evidence. The canvas's inspector names a board's images by content, from
  `assets/` first and `assets.json` second, so a re-encoded image that
  matches neither falls back to its `alt`. It names an inline `<svg>` the
  same way from `assets/icons/`, by its geometry rather than its bytes, and
  hands it back as a vector asset.
- Never commit `ref-*.html` or `assets/refs/`. They hold third-party
  captures, the root `.gitignore` already excludes them, and the
  sp-clone-prototype skill rebuilds them. `spotify-ios` is the exception: its
  five `ref-*` boards are committed so the hosted canvas shows them. So is
  `grok-ios/ref-14-grok-bot-sheet.html`, a native screenshot kept under
  board 14 for comparison on request.
- Put everything else a run makes in `scratch/`. The root `.gitignore`
  ignores it at any depth. Do not use the repo root or a dot directory.
- Give every canvas folder a `README.md`: it carries the evidence, and
  `skills/sp-clone-prototype/references/documenting.md` says what has to be in
  it. Elsewhere, add a document only when someone would otherwise go looking
  for one. Do not give any folder a `.gitignore`, and note that `.github/`
  gets no README either: GitHub would show it instead of the root one, so its
  guide lives in `CONTRIBUTING.md`.

What to leave out:

- Inline a helper that has one call site. A name read once costs a jump and
  buys nothing.
- Do not add configuration, an extension point or generic machinery for a case
  that has not happened. The second real case is what shows the general
  version its shape.
- Do not write a fallback for a state that should be impossible. Let it fail
  loudly, so the state gets reported instead of absorbed.

A decision worth rereading goes in `docs/YYYY-MM-DD-slug.md`.
