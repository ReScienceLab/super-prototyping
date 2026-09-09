# Release notes

Written for the person deciding whether to update, so it says what changed for
someone using the plugin, not what changed in the tree. One `## v<version>`
section per release: `.github/workflows/release.yml` reads the section matching
the version being tagged and makes it the GitHub Release body.

Update with `/plugin update super-prototyping` (Claude Code), or the equivalent
for your product, which README's install table lists. Then move the toolkit with
the `uv tool install` line in the README. The plugin and the
toolkit carry the same version; `sp-canvas start` says so when they drift.

## Unreleased

Everything below is on `main` and reaches no install until a version is cut.

### The canvas

- **An inspector panel.** Select a board and read its layers: the image behind
  a layer, its measured colours, and the icons and inline SVGs named as vector
  assets rather than as anonymous shapes.
- **Every board has an address.** `?canvas=<slug>` opens a page and
  `?canvas=<slug>#<file>` opens one board of it in the inspector, with the
  camera on it. That is the link to give when pointing at one screen.
- **Comments that live in the repo.** A board can be commented on and its
  status set, both stored beside the boards as `comments.json`, so a review
  survives the browser it was written in. The hosted canvas can be commented on
  too.
- **The dev server watches the boards directly** (#52, #53). Rewriting a board
  reloads the page onto the new HTML instead of needing the server restarted,
  a board folder added or removed re-indexes on its own, and writes under
  `scratch/` and `assets/refs/` no longer interrupt a generator or a clone run.
- Fixes: the status badge keeps its corner in a built canvas, the rail's
  collapse handle sits on its divider, a pan is a pan wherever the cursor is,
  and a malformed board link fails as a board that does not exist.

### Install

- **A 6.7 MB install**, against 151 MB, by declaring the marketplace with
  `sparsePaths` in `~/.claude/settings.json`. The README has the recipe.
- **Codex installs as a plugin**, not only as symlinked skills. It always
  could — Codex falls back to the Claude manifest — but nothing said so:
  `codex plugin marketplace add ReScienceLab/super-prototyping` then
  `codex plugin add super-prototyping@super-prototyping`. The repo now also
  ships the catalogue Codex prefers, so it reads a manifest meant for it.
- **Six products install it with their own command**, each from a manifest
  written for it: Claude Code, Codex, WorkBuddy/CodeBuddy
  (`.codebuddy-plugin/plugin.json`), Hermes (a root `plugin.json` in the
  portable Agent Plugins v1 format), Pi (`pi install git:…`, which reads
  `skills/` with no manifest at all), and `npx skills add` for Trae and the
  rest. One skills tree behind all of them.
- **`install-skills.sh` covers the products that have no install command.** It
  now links into CodeBuddy, Trae and Trae CN as well as Codex, Hermes and Pi,
  and it says which of them it found.
- **The plugin and the toolkit say when they have drifted.** `sp-canvas start`
  prints the `uv tool install` line that moves the toolkit to the plugin's
  version, and `sp-canvas --version` and `sp-canvas root -v` answer "which
  release is this".

### Releasing

- Releases are made by dispatching **Release** with a version: it runs the
  gates, bumps every manifest, and opens the release PR; merging that PR tags
  `super-prototyping--v<version>` and cuts the GitHub Release from this file.
- **Validate** runs the manifests, the canvas (lint, test, build) and the
  toolkit tests on every pull request.
- The procedure, including what the version number means and what to do when a
  step fails, is "Cutting a release" in `CONTRIBUTING.md`. This file is the log
  it publishes from.

## v1.0.0

2026-09-05, the release that packaged this repo as a plugin. The plugin ships
code and a project keeps only its own boards, so installing it does not drop
this repo's example canvases into your project. Installing is two halves: your
product's own plugin command for the skills and the canvas, and one
`uv tool install` for `refkit`, `artgen` and `sp-canvas`. `sp-canvas` starts
the canvas against whichever boards directory it is pointed at, and the canvas
keys its saved state per project, so two projects do not share a camera or a
comment. Declaring the marketplace with `sparsePaths` installs only the
directories you name, for anyone who wants the canvas and the toolkit without
the worked examples.

Tagged after the fact, at `0286f19`, where that work ended. Nine pull requests
landed on `main` between then and the tag being cut, so this tag holds the
packaging and not the canvas work that followed it.
