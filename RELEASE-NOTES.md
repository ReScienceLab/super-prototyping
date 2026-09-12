# Release notes

Written for the person deciding whether to update, so it says what changed for
someone using the plugin, not what changed in the tree. One `## v<version>`
section per release: `.github/workflows/release.yml` reads the section matching
the version being tagged and makes it the GitHub Release body.

A pull request that changes what a user sees adds its line to `## Unreleased`
as part of the change. Leaving it until the release means writing it from
memory, which is how a release ends up summarising commits rather than itself.
A `## v<version>` section is finished once its tag exists: the GitHub Release
was cut from that text, so editing the file afterwards changes nothing anyone
has been shown.

Update with `/plugin update super-prototyping` (Claude Code), or the equivalent
for your product, which README's install table lists. Then move the toolkit with
the `uv tool install` line in the README. The plugin and the
toolkit carry the same version; `sp-canvas start` says so when they drift.

## Unreleased

Everything below is on `main` and reaches no install until a version is cut.

### The canvas

- **A board is a web page with an address.** The button in the corner of the
  inspector's preview opens the board it is showing as an ordinary document at
  `/board/<slug>/<file>.html`, and the top bar opens every board of a page in
  one scrolling document at `sheet.html?canvas=<slug>`, laid out in
  `layout.json`'s rows with the canvas's own captions. This is where to read
  type at the size it ships at rather than at whatever the canvas is zoomed to.
  They are real addresses rather than the `blob:` URLs the first version handed
  out, so a page can be linked, copied, reloaded, and read by the browser
  extensions that refuse a generated page outright. The sheet is its own entry
  in the build too, so reading a board no longer downloads tldraw to do it.
- **Export to Figma is a button that says so.** The top bar's external-link
  arrow is now a chip with Figma's mark, and the sheet it opens walks through
  the route that works: install the html.to.design extension, capture the page
  with it, then paste into a file. The extension is what the route turns on,
  because the Figma plugin's own servers cannot reach localhost. The sheet
  leaves the Foundations row out, because a token sheet is evidence behind the
  screens rather than a screen to import beside them.

### The toolkit and the skills

- **`refkit refit` turns a traced contour back into a drawing.** A glyph traced
  off a capture has the right shape and the wrong object: hundreds of implicit
  linetos, visibly faceted where a board draws it large, while every delta
  reads 0, because a mean delta cannot see faceting that stays inside a pixel.
  `refit` resamples the contour, finds its corners by turning angle and fits
  each run as a line, an arc or a cubic, leaving the file's `viewBox`
  byte-identical.
- **`clone-prototype` says when a glyph has to be redrawn, and how far to take
  it.** The half that cannot ship as code is now `references/glyphs.md`: most
  interface glyphs are a composition of primitives, because that is how they
  were drawn, so the drawing is written with its dimensions as parameters and
  the parameters are fitted against the trace, and the reference says how to
  find what the glyph actually is and where to stop. Two pitfalls join the
  list, both of which cost a run here: shipping a trace on a board that draws
  it large, and measuring a stroke off a diagonal edge, where a 45° bar traces
  about √2 thicker than it is.

### Example canvases

- **The `notion-ios` example canvas gains nine screens and a generator.** The
  four-screen flow for adding a data source to a database, and the five-screen
  flow for adding an account, both measured against native @3x captures. The
  folder's boards were hand-written HTML before, so a token could not be
  changed in one place; `gen.py` is now the only source of truth for all
  sixteen. Two tokens moved with the re-measurement: the sheet inset is 68
  rather than 71, and the type stack names SF Pro's Text cut outright, since
  `-apple-system` resolves to the Display cut and renders about 4% narrow.
- **And three more: the Plus & Notion AI purchase sheet.** Monthly selected,
  yearly selected, and the StoreKit "You're all set" alert over the dimmed
  sheet with the subscribe button spinning. The sheet is Apple's paywall
  rather than one of the app's own, so its metrics sit in a board-local block
  after the shared tokens. The cat and the sparkle strokes on the feature card
  are the folder's first `artgen` assets: `gpt-image-2` redraws of the
  capture's crops, keyed and scored in `art-gen.json`.
- **`apple-app-store`, nine iOS 26 App Store screens.** Native iPhone 16 Pro
  captures rebuilt as one `gen.py`, with a token board and two evidence boards
  behind 80 tokens. The app icons are the originals from the iTunes lookup API
  and the editorial art is a crop at its measured box, including an Arcade hero
  that ends at the photograph's own fade and is filled, where the headline
  covered it, from EA's published key art registered onto the page. The status
  bar is `templates/gen.py`'s byte for byte, moved as a group for the wider
  frame, which is now what the skill asks for. It is the head of Apple's own
  row on the welcome page.
- **`grok-ios`, fifteen Grok iOS screens.** The widget and its guide, the
  paywall, the Terms update and its sign-out, the Grok Bot sheets, the home
  with its composer, the voice picker and the Settings sheet at three scroll
  positions, in the order the app walks them. Every icon is a crop of the
  capture but seven: the three side glyphs on 04, and the four marks on 07's
  chips, which are the publishers' own SVGs placed on a box fitted against the
  capture rather than anything traced or redrawn.

## v1.1.1

2026-09-09, one fix.

- **A two-finger pan over a board pans the canvas.** It used to send the browser
  back a page instead, because a wheel event inside a board's iframe never
  reaches the canvas and so never gets stopped. Every board now stops the
  browser's overscroll in its own document, which is the only place that can.

## v1.1.0

2026-09-09. The canvas became something a review can point at, and the plugin
became something six products can install and one workflow can release.

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
