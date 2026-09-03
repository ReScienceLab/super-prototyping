# Canvases

One subfolder per board. Drop `.html` files into `mockups/canvases/<slug>/`,
no code change needed anywhere:

- Each folder becomes one tldraw page, named after the folder
  (`kebab-case` → `Title Case`). Folders sort numerically, and the page menu
  is put in that same order, so a `00-` prefix is what puts a page on top.
- Each `.html` file in it becomes one shape on that page.
- Files sort numerically by name, so prefix them `00-`, `01-`, `02-` …
- Discovery lives in `canvas/src/canvasLibrary.ts` (`import.meta.glob`).

A folder is an unzipped Sketch file: `layout.json` plays `document.json` and
`meta.json`, `icon.png` plays `previews/preview.png`, `assets/` plays
`images/`, and the numbered boards are the pages. `probes.json`,
`crops.json` and `assets.json` are the measurement evidence. Commit them
with the boards. Everything a run makes on the way, grids, shots, montages,
candidate boards, goes in `<slug>/scratch/`. The root `.gitignore` ignores
`scratch/` at any depth, and `assets/refs/` too, which is where third-party
captures go. No folder needs a `.gitignore` of its own.

Switch boards with the page menu at the top-left of the canvas. Deep-link a
board with `?canvas=<slug>`, e.g. `http://127.0.0.1:5173/?canvas=notion-ios`.

## 00-welcome

The bare URL always opens `00-welcome` ("Start here"), whichever page was
last on screen. It carries the canvas's only clickable shapes, all
`canvas-link` (`canvas/src/CanvasLinkShapeUtil.tsx`): one card per other
folder, which opens that folder's page, in two rows (Apple's own apps, then
everything else), and a button that opens the repo.
They are shapes rather than links inside a board because boards render in a
sandboxed iframe, where a link cannot navigate anything.

The cards come from the folder list, so a new folder shows up as a card
with no edit here. This page's own board is also the one board that is not
phone-shaped; see below.

A card is the device and nothing else: the cover board is cropped to its
`coverBox` and fitted into one phone case the card draws itself, so folders
that each drew their phone a little differently come out at one size, and
the folder name and board count are the caption under it.

Drop the app's own icon in the folder as `icon.png` and the card wears it,
tilted, on the device's bottom-left corner, so a row of cards is readable as
apps before any of the covers are. 256 x 256, transparent outside the iOS
squircle; the ones here came from the App Store's own artwork
(`itunes.apple.com/lookup?id=<track id>`, `artworkUrl512`, masked) or, for
Apple's system apps, out of `apple-icons/assets/`. Each carries its source in
a PNG `Source` text chunk. A folder with no `icon.png` simply shows none.

## layout.json

Optional, one per folder. It groups the board's files into labelled rows
laid out top to bottom:

```json
{
  "name": "(example) Notion iOS",
  "rows": [
    { "title": "Foundations", "files": ["00-design-tokens"] },
    { "title": "Screens", "numbered": true,
      "files": [{ "file": "01-example-screen", "label": "Home" }],
      "links": [{ "label": "example.com", "url": "https://example.com" }] },
    { "title": "Source of truth: references", "numbered": true,
      "files": [{ "file": "ref-01-home", "label": "Home" }] }
  ]
}
```

- `name` overrides the page name. Without it the folder slug is humanized,
  which cannot express casing or punctuation. `notion-ios` becomes
  "Notion Ios". Set it when the humanized name reads wrong. A page is tied to
  its folder, not to its name, so changing it renames the page you already
  have open rather than starting a second one. Every folder shipped with the
  repo is an example and is named `(example) …`; a board of your own is not,
  which is how the two tell apart in the page menu.
- `cover` names the board that stands in for the folder on the welcome page,
  e.g. `"00-launch-light"`. Without one the card shows the first board that is
  not a `00-` sheet, which is the right guess for most folders and the wrong
  one where the front door is a `00-` board.
- `order` sorts the folder's card on the welcome page: lower first, default 0,
  and folders that say nothing keep slug order.
- `coverBox` is the part of the cover board the card shows, `[x, y, w, h]` in
  board px. The default is the phone frame every folder here draws at the same
  place, `[46, 24, 393, 852]`, so a card crops to the mockup rather than
  framing it in artboard margin. Declare one for a phone drawn somewhere else,
  or for a cover that is not a phone at all: `[0, 0, 478, 980]`.
- `files` entries are file names **without** `.html`, either bare (the
  humanized file name becomes the caption) or `{ "file", "label" }`.
- `numbered: true` prefixes each caption with its 1-based position. Never
  hand-number labels, position is computed.
- `{ "file", "label", "w", "h" }` overrides the 478 x 980 artboard for a board
  that is not phone-shaped, a landscape banner say. A row is laid out at its
  first file's size, so give every file in the row the same one.
- `"links": [{ "label", "url" }]` puts buttons under the row that open an
  address in a new tab. A board renders in `<iframe srcDoc sandbox="">`, where
  a link can navigate nothing, so anything clickable has to be a shape out
  here rather than markup in the board.
- Every row starts at x = 0 with the same column pitch, so **item N of one
  row sits directly under item N of the row above**. That is what makes a
  reference row readable against the mockup row above it.
- Files not listed in any row still appear, in a fallback grid below.

After editing `layout.json`, press the **refresh** button in the top bar,
next to the `…` actions menu.
Shape creation is idempotent (it never moves a shape that already exists),
so reordering a row needs that force-relayout to take effect.

## Constraints on every artboard

Boards render inside `<iframe srcDoc sandbox="">`:

- **Fully self-contained.** No external CSS, JS, fonts or images. Inline
  the token block in every file; embed images as `data:` URIs; icons are
  inline SVG.
- **The shape box is 478 × 980** (`CANVAS_FILE_DEFAULT_SIZE`). The iframe
  clips anything past that box with no warning, so check every fixed-height
  board after adding a row. `00-welcome` is the one exception, a landscape
  2153 × 819 board. Its `gen.py` writes that size into `layout.json` as
  `w`/`h`, which is how any board declares a box of its own.
- iPhone frame is 393 × 852 pt at 1pt = 1px: 54px status bar,
  125 × 36 Dynamic Island, 139 × 5 home indicator.

Mockup HTML routinely has single lines of 100KB–2MB of embedded base64. To
splice a large blob into an existing artboard without pulling it through an
agent's context, locate the target line with `grep -n` on a distinguishing
class or attribute (never on the blob line itself), then read/replace that
one line with a short Python script
(`base64.b64encode(open(path,'rb').read())`) run from the shell. Never
`cat`/`echo` a blob into a tool call. Prefer real product assets (the actual
icon, the actual logo, a rasterized system symbol) over hand-drawn
approximations.

## Ship the generator with the boards

The clone workflow forbids hand-editing a generated artboard: you edit the
generator and re-run. That rule is dead on arrival if the generator lives in
a session scratch directory, because the scratch directory is deleted with
the session. The next person who needs to fix one board then has to either
hand-edit measured output (forbidden) or redo the whole run. `notion-ios`
and `raycast-ios` have exactly this problem: neither committed its
generator, so neither can be regenerated by its own rules.

So the convention: **a board folder ships its generator as `gen.py`, next
to its output, plus any asset JSON it reads** (base64 `data:` URIs for
bitmaps). `gen.py` resolves every path relative to `__file__`, so from
anywhere:

```bash
python3 mockups/canvases/<slug>/gen.py
```

regenerates the folder in place, byte-identical. A folder whose boards
cannot be regenerated is incomplete. A folder built from more than one source
may split the measurements across further modules that `gen.py` imports
(`apple-wallet` has two, one per Figma file), but the entry point stays
`gen.py`.

After it, `python3 tools/refkit.py thumbs mockups/canvases/<slug>` rewrites
`thumbs/`, one WebP per board at half size, and is committed with the boards.
The canvas draws a board from its thumbnail while the board is small on
screen (under half zoom, or off screen) and swaps the live document in only
once the board is drawn larger than that, so a page of thirty boards opens as
thirty small images rather than thirty documents (`docs/2026-09-03-board-
thumbnails.md`). A stale thumbnail shows the old board until it is rewritten.
A board with no thumbnail is always live, so a folder that skipped the step
still works; it just costs what it did before. Thumbnails of `ref-*` and
`w[0-9]-*` boards are ignored by git along with the boards.

Generators come in two lineages, and the only difference is the `page()`
helper's signature. The Figma-sourced runs, `apple-photos`, `apple-calendar`
and `apple-settings`, use `page(title, css, body)`. The screenshot-sourced
runs and `templates/` use `page(title, body, extra_css="")`. Copy whichever
matches your source. There is no shared library, and no `gen.py` imports
anything from another folder or from `tools/`, so copying one folder gets
you a complete generator.

This is safe for discovery: `import.meta.glob` in `canvasLibrary.ts`
matches only `*.html` (plus `layout.json`, `icon.png` and `thumbs/*.webp`),
so `gen.py` and its asset files sitting in the folder are invisible to the
canvas.

## Examples

- `luma-ios/`: a complete six-phase run and the model to copy. Its 35
  boards sit in four rows: Foundations (design tokens, four evidence boards,
  process, pipeline), 12 replica screens, a 4-board walkthrough of one page,
  and 12 source captures. Every reference sits column-for-column under its
  mockup. Per-screen mean absolute delta against the captures, top 56 pt
  excluded, is 3.47–4.50 levels (of 255) on the eight dark event screens and
  3.49–6.50 on the four light home screens, where four full-bleed cover
  photos carry most of what is left. Its `gen.py` regenerates everything.
  The `ref-*` capture boards are gitignored, so a fresh clone has 23.
- `apple-photos/`: three screens of the native Photos app plus a token
  board, measured from a Figma source rather than a screenshot, each replica
  sitting above the Figma render of the same screen. Every feature lands
  within a pixel of its reference in both Chromium and WebKit; its
  `README.md` records the two bugs that only the second engine showed.
- `apple-calendar/`: the largest Figma-sourced run, nine screens in both
  appearances. 41 boards in five rows: foundations (a token board and four
  evidence boards for 70 tokens), the nine light replicas, the nine dark ones,
  and the file's own PNG export of each, column-for-column underneath. One
  generator emits both appearances of a screen from one builder. Mean absolute
  delta against those exports is 0.42-1.56 levels (of 255); what is left is
  antialiasing, not geometry. Its `README.md` records the two defects that only
  measurement found, and `iconkit.py` shows how to get an SF Symbol out of a
  Figma file at all. The 18 `ref-*` boards are gitignored, so a fresh clone
  has 23.
- `apple-settings/`: the same method as `apple-calendar` at a size worth
  copying from. Three screens of iOS Settings in both appearances, 15 boards in
  five rows: a token board and two evidence boards for 37 tokens, the three
  light replicas, the three dark ones, and the file's own PNG export of each
  underneath. Nine of the tokens are all that dark changes. Mean absolute delta
  against those exports is 0.15-0.74 levels (of 255). Its `README.md` records
  what measurement found and the community file's own defects, including the
  two rows that render the literal word "Text" and are transcribed that way.
  The six `ref-*` boards are gitignored, so a fresh clone has 9.
- `apple-wallet/`: two Figma files on one page, because they are the same
  app. Two screens of the iOS Wallet app in both appearances, and five pass
  templates from a second file: a boarding pass, a store card and three key
  passes. 15 boards in five rows, a token board and two evidence boards per
  source file (38 tokens and 39, two prefixes in one shared `:root`), then the
  seven light replicas, the two dark ones, and the file's own PNG export of
  each underneath. Mean absolute delta against those exports is 0.23-1.86
  levels (of 255). `gen.py` is a driver: `screens.py` and `passes.py` hold the
  two runs and know nothing about each other. Its `README.md` records the
  community file's off-centre home indicator, the measured per-size
  `letter-spacing` that no earlier run needed, and the doubled QR layers. The
  passes are a 390 x 844 notched frame, so `--crop-phone` needs them at
  `--phone-size 390x844 --phone-radius 42`. The nine `ref-*` boards are
  gitignored, so a fresh clone has 15.
- `claude-ios/`: the largest screenshot-sourced run, and the one to read
  when the source is captures rather than a Figma file. Fifteen screens of the
  Claude iOS app across four flows, 33 boards in three rows: a token board and
  two evidence boards for 54 tokens, the fifteen replicas, and the Mobbin
  capture of each column-for-column underneath. Mean absolute delta against
  those captures is 3.4-6.9 levels (of 255) on the nine chrome-led screens and
  10.0-23.2 on the six carried by serif body text, where substituting Georgia
  for Anthropic's Tiempos sets about 11% wide. Its `README.md` records why: the
  two brand faces no closed-set matcher can return, the two colour spaces the
  captures arrived in, the voice gradient that needed a sampled ramp rather
  than two tokens, and the vibrancy veil under the composer, where the lines
  the composer hides are placed as a measured line count instead of invented
  prose. The 15 `ref-*` boards are gitignored, so a fresh clone has 18.
- `duolingo-ios/`: the run to read when the source screens are mostly
  illustration. Eight screens of the Duolingo iOS app, six of the learning
  path and two of the modal sheets, 13 boards in three rows: a token board,
  two evidence boards for 58 tokens, an art board that shows every crop and
  each screen with its chrome removed, a second art board for what
  regenerating that art costs, the eight replicas, and the Mobbin capture of
  each column-for-column underneath. Mean absolute delta against those
  captures is 1.32-2.93 levels (of 255), the best screenshot-sourced
  numbers in the repo, because all 128 illustrations are **crops of the
  captures at measured boxes** rather than redrawn art. Its `README.md`
  records the experiment behind that choice - the same crop redrawn by
  `gpt-image-2` scores 38.53 alone and 3.96 packed into a geometry-anchored
  grid, both against a crop's 0, which `00e-art-gen` shows - plus the
  stand-in face whose cap ratio is 0.762em rather than SF Pro's 0.714, the
  two different status bars in one capture set, and the `z-index` that
  painted over five text classes without an error. `assets/art/` and
  `assets/art-gen/` are committed; the eight `ref-*` boards are
  gitignored, so a fresh clone has 13.
- `spotify-ios/`: the run to read when the brand face is unavailable and the
  screens are mostly type. Five screens of the Spotify iOS app - the home
  feed at two scroll positions, two full-screen promo modals and the Spotify
  Codes sheet - in 8 boards across three rows: a token board, two evidence
  boards for 52 tokens, an art board for 19 crops, the five replicas, and the
  capture of each column-for-column underneath. Mean absolute delta is
  3.38-6.71 levels (of 255), and the spread *is* the type bill: every ink box
  on every screen lands within 1.8pt of its capture, so what the number scores
  is glyph shape, not placement. `refkit font` returns **no call** here -
  three probes pick three winners, all weak - because the real face is Spotify
  Mix, a Circular derivative in no candidate set. Its `README.md` records the
  width bill that picked SF Pro over the ranking's winner, and the two
  techniques that came out of paying it: **fitting type size on stroke mass
  rather than on width or height** (which found three weights that both fits
  had left wrong, at ratios of 0.891 to 1.193), and charging the leftover
  width as per-string tracking. It also records that PIL's width fit is 11.6%
  off the browser's on the same string. `assets/art/` is committed; the five
  `ref-*` boards are gitignored, so a fresh clone has 8.
- `snapaction-ios/`: the run to read when the screens are almost entirely
  type. Six screens of SnapAction, five dark and one light sheet, rebuilt from
  the captures inside its Figma file. 11 boards in four rows: a landscape
  product banner with its two links, a token board, three evidence boards for
  88 tokens, the six replicas, and the capture of each column-for-column
  underneath. Mean absolute delta against those captures is 1.29-2.34 levels
  (of 255) on the five device screens, better than any other
  screenshot-sourced run here and reached without cropped artwork carrying
  it. Its `README.md` records how: `ct()` models the line box, and the
  residual one constant still misses is measured per token and does not follow
  the size, so `t-code` at 13px wants its run 0.33pt higher while `t-meta` at
  12.65px wants its own 0.23pt lower. It also records the `font:` shorthand
  that silently resets `font-variant-numeric`, the probe showing Chrome does
  not snap text to whole pixels, the token that a coverage solve dissolved back
  into `--x-line`, and the Lanczos ringing that made four ink probes read 14 to
  22 levels off with nothing wrong on the board. The sixth screen sits at 5.82
  because 77% of its error is one 645px source asset resampled twice, and no
  higher-resolution original exists. It is also the one run whose source app
  could be read afterwards, so its README carries the only measurement-against-
  ground-truth audit in the repo: 17 of 28 sampled colours are a named
  `DSPalette` token to the level, three more are composites whose arithmetic
  lands exactly, five are system material the app has no token for, and the
  measured type sizes beat the source's own nominal point sizes 13 times out of
  14. The one real error it caught was a corner radius, where a circular fit
  read 14.5 against a specified 18 continuous and CSS 18px turned out to be
  both truer and better. The six `ref-*` boards are gitignored, so a fresh
  clone has 10.
- `chatgpt-ios/`: the largest screenshot-sourced run in the repo, and the one
  to read for a long flow. Twenty-five screens of the ChatGPT iOS app - cold
  start through account creation and onboarding, the signed-in home and its
  composer, two full-screen announcements, the sidebar in three states and a
  project's two tabs. 29 boards in three rows: a token board and three
  evidence boards for 67 tokens, the 25 replicas, and the Mobbin capture of
  each column-for-column underneath. Mean absolute delta against those
  captures is 0.03-4.38 levels (of 255), mean 2.22. Its `README.md` records
  the four separate type ladders the app carries - the app's whole-pixel
  sizes, the OAuth web view's fractional ones and its own darker ink and
  lighter grey, the announcement sheets, the project screens - and the two
  methods that found the nine defects a whole-frame delta hid: a worst-40pt-
  block report, and a threshold-free stroke-coverage solve that settled two
  close icons drawn as one. It also records why the residue on the two
  type-heavy boards is irreducible (OpenAI Sans is a `refkit font` no call and
  the stand-in's cap-height-to-width ratio is higher, so matching a width
  leaves the caps tall), that ink mass decides a font weight on dark text and
  is worthless on grey, and that a blur which monotonically improves a band is
  hiding a content defect rather than an antialiasing one. The 25 `ref-*`
  boards are gitignored, so a fresh clone has 29.
- `templates/`: the starting point, not a finished board. The four boards
  every run produces (design tokens, evidence, one phone screen, one parked
  reference) with placeholder values, generated from one list of tokens so
  the `:root` block and the evidence table cannot drift apart. It carries
  the parts that are the same on every board and nothing else: the 393 x 852
  frame, the 52pt corners and bezel, the 54pt status bar with its island and
  three glyphs, the home indicator. Seven more boards drop that same screen
  into a photoreal shell from a Figma community mockup, for when a mock has to
  be shown to someone outside the team: three iPhone 17 Pro colourways and four
  iPhone 16 Pro ones, each stating on its face which phone it is and how its
  393 x 852 window relates to the real one. `shellbuild.py` rebuilds a shell
  from an export. Copy the folder to start.
- `apple-icons/`: a different kind of board, an asset board. The 43 native
  iOS 26 app icons in both the default and the dark appearance, embedded as
  the shipped art rather than redrawn, tiled five across with no chrome.
  Reach for it when a mockup needs a real system icon instead of an
  approximation.
- `notion-ios/` and `raycast-ios/`: finished boards, but their generators
  were never committed (see above), so treat their HTML as read-only. Each
  folder's `README.md` records what the run measured and where the replica
  knowingly differs from its source.

To start a new board, copy the `templates/` folder and run its generator:

```bash
cp -r mockups/canvases/templates mockups/canvases/<slug>
python3 mockups/canvases/<slug>/gen.py
python3 tools/refkit.py thumbs mockups/canvases/<slug>
```

That hands you the four boards a run always produces, wired together and
already passing `refkit tokens`. Then replace every placeholder with a value
you measured.
