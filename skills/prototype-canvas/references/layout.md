# Board folders, layout.json, and the artboard constraints

One subfolder per board under the boards directory (`./mockups/canvases` by
default, or wherever `PROTOTYPING_CANVASES_DIR` points). Drop `.html` files in
and nothing else needs changing:

- Each folder becomes one tldraw page, named after the folder
  (`kebab-case` → `Title Case`). Folders sort numerically, so a `00-` prefix
  puts a page on top. `order` in `layout.json` moves a folder without
  renaming it.
- Each `.html` file in it becomes one shape on that page.
- Files sort numerically by name, so prefix them `00-`, `01-`, `02-` …
- Discovery is the `prototyping-canvases` plugin in the app's
  `vite.config.ts`, which scans the boards directory and generates the index.

Two things the scanner will not do. A folder or file whose name contains `#`
or `?` is skipped with a warning: both are URL punctuation, no encoding
survives the round trip, and such a board would silently render blank. And a
symlink in the boards directory is followed, which is how you point the canvas
at boards living somewhere else — but it also reaches outside the directory
the dev server is otherwise confined to, so only link at something you trust.

A folder is an unzipped Sketch file: `layout.json` plays `document.json` and
`meta.json`, `icon.png` plays `previews/preview.png`, `assets/` plays
`images/`, and the numbered boards are the pages. `probes.json`, `crops.json`
and `assets.json` are the measurement evidence — commit them with the boards.
Everything a run makes on the way (grids, shots, montages, candidate boards)
goes in `<slug>/scratch/`, which should be gitignored at any depth, along with
`assets/refs/` where third-party captures go.

Drop the app's own icon in the folder as `icon.png` and the welcome card wears
it, tilted, on the device's bottom-left corner. 256 × 256, transparent outside
the iOS squircle. A folder with no `icon.png` simply shows none.

## layout.json

Optional, one per folder. It groups the board's files into labelled rows laid
out top to bottom:

```json
{
  "name": "Notion iOS",
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
  which cannot express casing or punctuation: `notion-ios` becomes
  "Notion Ios". Set it when the humanized name reads wrong. A page is tied to
  its folder, not to its name, so changing it renames the page you already
  have open rather than starting a second one.
- `cover` names the board that stands in for the folder on the welcome page,
  e.g. `"00-launch-light"`. Without one the card shows the first board that is
  not a `00-` sheet — the right guess for most folders, and the wrong one
  where the front door is a `00-` board.
- `order` sorts the folder in the page menu and on the welcome page: lower
  first, default 0, and folders that say nothing keep slug order. The welcome
  page stays on top whatever it says.
- `coverBox` is the part of the cover board the card shows, `[x, y, w, h]` in
  board px. The default is the phone frame at `[46, 24, 393, 852]`, so a card
  crops to the mockup rather than framing it in artboard margin. Declare one
  for a phone drawn somewhere else, or a cover that is not a phone at all:
  `[0, 0, 478, 980]`.
- `files` entries are file names **without** `.html`, either bare (the
  humanized file name becomes the caption) or `{ "file", "label" }`.
- `numbered: true` prefixes each caption with its 1-based position. Never
  hand-number labels; position is computed.
- `{ "file", "label", "w", "h" }` overrides the 478 × 980 artboard for a board
  that is not phone-shaped, a landscape banner say. A row is laid out at its
  first file's size, so give every file in the row the same one.
- `"links": [{ "label", "url" }]` puts buttons under the row that open an
  address in a new tab. A board renders in `<iframe srcDoc sandbox="">`, where
  a link can navigate nothing, so anything clickable has to be a shape out
  here rather than markup in the board.
- Every row starts at x = 0 with the same column pitch, so **item N of one row
  sits directly under item N of the row above**. That is what makes a
  reference row readable against the mockup row above it.
- Files not listed in any row still appear, in a fallback grid below.

After editing `layout.json`, press the **refresh** button in the top bar, next
to the `…` actions menu. Shape creation is idempotent (it never moves a shape
that already exists), so reordering a row needs that force-relayout to take
effect.

## Constraints on every artboard

Boards render inside `<iframe srcDoc sandbox="">`:

- **Fully self-contained.** No external CSS, JS, fonts or images. Inline the
  token block in every file; embed images as `data:` URIs; icons are inline
  SVG. A sandboxed iframe has no shared stylesheet, so the `:root` block is
  copied byte-identically into every board rather than imported.
- **The shape box is 478 × 980** (`CANVAS_FILE_DEFAULT_SIZE`). The iframe
  clips anything past that box with no warning, so check every fixed-height
  board after adding a row. A board that needs another size declares `w`/`h`
  in `layout.json`.
- iPhone frame is 393 × 852 pt at 1pt = 1px: 54px status bar, 125 × 36
  Dynamic Island, 139 × 5 home indicator.

Mockup HTML routinely has single lines of 100 kB–2 MB of embedded base64. To
splice a large blob into an existing artboard without pulling it through an
agent's context, locate the target line with `grep -n` on a distinguishing
class or attribute (never on the blob line itself), then read/replace that one
line with a short Python script
(`base64.b64encode(open(path,'rb').read())`) run from the shell. Never
`cat`/`echo` a blob into a tool call. Prefer real product assets (the actual
icon, the actual logo, a rasterized system symbol) over hand-drawn
approximations.

## Ship the generator with the boards

The clone workflow forbids hand-editing a generated artboard: you edit the
generator and re-run. That rule is dead on arrival if the generator lives in a
session scratch directory, because the scratch directory is deleted with the
session. The next person who needs to fix one board then has to either
hand-edit measured output (forbidden) or redo the whole run.

So the convention: **a board folder ships its generator as `gen.py`, next to
its output, plus any asset JSON it reads** (base64 `data:` URIs for bitmaps).
`gen.py` resolves every path relative to `__file__`, so from anywhere:

```bash
python3 mockups/canvases/<slug>/gen.py
```

regenerates the folder in place, byte-identical. A folder whose boards cannot
be regenerated is incomplete. A folder built from more than one source may
split the measurements across further modules that `gen.py` imports, but the
entry point stays `gen.py`.

No `gen.py` imports anything from another folder or from the toolkit, so
copying one folder gets you a complete generator.

This is safe for discovery: the canvas indexes only `*.html` (plus
`layout.json` and `icon.png`), so `gen.py` and its asset files sitting in the
folder are invisible to it.
