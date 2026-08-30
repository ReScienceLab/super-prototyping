# Canvases

One subfolder per board. Drop `.html` files into `mockups/canvases/<slug>/`
— no code change needed anywhere:

- Each folder becomes one tldraw page, named after the folder
  (`kebab-case` → `Title Case`), sorted numerically across folders.
- Each `.html` file in it becomes one shape on that page.
- Files sort numerically by name, so prefix them `00-`, `01-`, `02-` …
- Discovery lives in `canvas/src/canvasLibrary.ts` (`import.meta.glob`).

Switch boards with the page menu at the top-left of the canvas. Deep-link a
board with `?canvas=<slug>`, e.g. `http://127.0.0.1:5173/?canvas=notion-ios`.

## layout.json

Optional, one per folder. It groups the board's files into labelled rows
laid out top to bottom:

```json
{
  "name": "Notion iOS (example)",
  "rows": [
    { "title": "Foundations", "files": ["00-design-tokens"] },
    { "title": "Screens", "numbered": true,
      "files": [{ "file": "01-example-screen", "label": "Home" }] },
    { "title": "Source of truth — references", "numbered": true,
      "files": [{ "file": "ref-01-home", "label": "Home" }] }
  ]
}
```

- `name` overrides the page name. Without it the folder slug is humanized,
  which cannot express casing or punctuation — `notion-ios` becomes
  "Notion Ios". Set it when the humanized name reads wrong.
- `files` entries are file names **without** `.html`, either bare (the
  humanized file name becomes the caption) or `{ "file", "label" }`.
- `numbered: true` prefixes each caption with its 1-based position — never
  hand-number labels, position is computed.
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

- **Fully self-contained** — no external CSS, JS, fonts or images. Inline
  the token block in every file; embed images as `data:` URIs; icons are
  inline SVG.
- **The shape box is 478 × 980** (`CANVAS_FILE_DEFAULT_SIZE`). Overflow is
  silently clipped — check every fixed-height board after adding a row.
- iPhone frame is 393 × 852 pt at 1pt = 1px: 54px status bar,
  125 × 36 Dynamic Island, 139 × 5 home indicator.

`notion-ios/` and `raycast-ios/` are finished boards to work from: copy a
`00-design-tokens.html`, replace every value with one you measured, and build
your screens against it. Each folder's `README.md` records what the run
measured and where the replica knowingly differs from its source.
