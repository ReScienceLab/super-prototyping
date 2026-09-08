# An inline svg is a vector asset

2026-09-08. The tab-bar icons on `apple-photos/01-all-photos` are inline `<svg>`, and the
inspector's Assets tab listed the eleven photos and not one of them. Now an inline vector is
listed, named, previewed and handed out the way a bitmap already was: one more asset kind,
`via: "svg"` beside `"img"` and `"css"`, on the pipeline that was there. No board is regenerated
and no HTML changes.

## What the boards hold

Measured over the 180 committed boards before deciding (`scratch/svg_census.py`):

| | |
|---|---|
| inline `<svg>` elements | 1,025, 237 distinct |
| committed `assets/icons/*.svg` | 36, in `apple-calendar`, `apple-photos`, `apple-settings` |
| distinct on-board vectors in those folders matched to a file by geometry | 32 of 32 |
| `<title>` or `aria-label` on any svg | 0 |
| nested svg, scripts, handlers, references outside the svg | 0 |
| elements inside svg subtrees | 2,767 of 16,803, a sixth of every layers list |

## What changed

- **Bytes cannot be the key, so geometry is.** Each generator's `icon()` writes `class`, `style`
  and `preserveAspectRatio` into the root tag, so a board's markup is never the file's bytes.
  `svgSignature.ts` reads the viewBox and every `path`/`rect`/`circle`/`ellipse`/`line`/
  `polygon`/`polyline`/`text`/`image`/`use` with its shape attributes, transform and reference,
  and a text's own string, in a fixed order, whitespace collapsed, and
  `svg:<fnv1a>` of that is the file's key. A row's key adds the root's computed colours after it,
  so a red and a black instance of one glyph, as on `raycast-ios/07-models-sheet`, are two rows
  that join to one file and each copy their own colour. It reads markup rather than a DOM so the
  build-time index and the frame's agent run one function: the agent splices in its
  `toString()`, which is why it is written with no reference outside its own body. The index adds
  the key beside the byte key it already had for every `.svg` under `assets/`. An svg that draws
  nothing, the one filter-only definitions block on `chatgpt-ios/16-memory-sheet`, is no asset.
- **The copy stands alone.** The agent strips what the generator and the agent itself injected,
  adds `xmlns` where a literal icon had none, writes the root's computed `fill` and `stroke` in
  where the markup left them to the cascade, and a child's where a stylesheet rule set it apart
  from its parent (apple-wallet's `.ds path`), and substitutes `currentColor` and every `var()` with
  the values the board resolved. That string is the preview, as an inert
  `<img src="data:image/svg+xml,…">` in the parent, never live DOM, which matters on a hosted
  canvas where a board is a pull request away; and it is what **Copy SVG** puts on the
  clipboard, for Figma or another `gen.py`.
- **A name comes from the file, else from context, else nowhere.** No board writes a title on an
  icon. With no file the agent takes an `aria-label` or `<title>` if one ever appears, else a class
  that is a word (`logo`, not a generator's `i` or `mk`), else the one short leaf of text beside
  the icon within two ancestors: the span under a tab icon, the label in a chip. A clock, a
  keyboard row, a whole composer or a screen of text is not a caption, and the icon reads
  `svg 27×27` in italics rather than take a wrong name. A guess is badged `label` the way a
  bitmap's is badged `alt`.
- **An icon is one layer.** Nodes inside an svg stay indexed, because the Tokens tab counts uses
  on `path` elements, but the layers list hides them, and a click on a path in the preview selects
  its svg.
- Rows and the selected view read the viewBox size and `svg`; the summary reads
  `Images N` and `Vectors M`; the vector row's thumb sits on the checkerboard, since a black
  glyph on the photos' dark ground is invisible.

## Not done

- **Moving the 205 literal glyphs into `assets/icons/` files.** Per-generator work in ten folders.
  The caption rule names the ones people point at most; a folder gets file names the day its
  generator is next touched, and the skill docs now say to keep icons as files.
- **Writing an extracted svg into the repo from the panel.** The browser cannot write into the
  checkout. Copy SVG covers a person; an agent-bridge op can return a board's assets when an agent
  needs it.
- **SVG as a data URI in `<img>` or CSS.** No board does it; if one did, the bitmap path already
  lists it as `image/svg+xml`.

## Checked

`tsc -b`, `oxlint`, `vitest` (the signature signs the file and the board's rewrite of it alike;
a moved point changes it and a colour does not; the model names, badges and sizes a vector; the
agent carries the function). Headless Chrome against the dev server: `apple-photos#01-all-photos`
lists its four tab icons and three status-bar glyphs as `assets/icons/<name>.svg`, every preview
loaded, the eleven photos unchanged; the selected view shows the vector with its size and Copy SVG,
and the clipboard holds the same standalone markup the preview draws; no `path` rows in the layers
list; a click on a path in the preview selects the svg. `raycast-ios/01-ask-anything` names the
composer chip's icon `Full Note` in italics and leaves the status bar, keyboard and composer icons
nameless; `chatgpt-ios`, whose icons float absolutely under `.phone`, names none after the screen's
text. The board's on-tab `tab-photos` and its copy, rendered at the same size, diff to nothing
beyond antialiasing in `refkit diff`.
