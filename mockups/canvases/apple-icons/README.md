# Apple icons, an asset board

The 43 native app icons Apple ships with iOS 26 and macOS Tahoe 26, in both
the default and the dark appearance, tiled five across on nothing at all.
This is not a `clone-prototype` run: nothing here was sampled off a capture,
because the icons are the real art rather than a redraw of it.

Open it with `?canvas=apple-icons`.

| file | what it is |
|---|---|
| `00-icon-set.html` | The default set at 80pt, five across, plus the shared `:root` block. |
| `01-icon-set-dark.html` | The dark set, same tile. |
| `assets/` | Default source art. Nothing loads it at runtime. |
| `assets-dark/` | Dark source art. Same file names, same 264 square. |

The art lives in this folder rather than in `mockups/assets/` because it is
this board's own material, not shared across boards. The canvas globs
`mockups/canvases/*/*.html`, one level deep, so a nested `assets/` is invisible
to it.

## Where the art comes from

Figma Community, *macOS Tahoe 26 / iOS 26 / iPadOS 26 Wallpaper + iOS 26 app
icon*, file `KdGn8IPLn6hJb9rhFlDNUk`. The file carries three appearance sets.
Node `5:2` is the default, node `5:89` is dark, and node `13:137` holds tinted,
which is not pulled in.

Both sets are 43 PNGs at 264 square, RGBA. The squircle mask is already cut
into every file, corners transparent, so an `<img>` is the entire icon
implementation. No `border-radius`, no clip path, and therefore no radius
token. The artboards inline them as `data:` URIs, downscaled to 160 square on
the way in, which is 2× the 80pt they render at.

The two sets came out of Figma by different routes, and the difference matters
if you ever refresh them:

- `assets/` was pulled node by node, 43 exports, each already transparent.
- `assets-dark/` is one export of the whole `5:89` group, sliced on its
  lattice. A group export is flattened onto Figma's page grey, `#F5F5F5`, so
  the tiles arrive opaque with the corners filled in. Since both appearance
  sets share the same 264 square mask, the alpha from `assets/` recovers the
  true colour by un-compositing, `colour = (tile - grey*(1-a)) / a`. That is
  exact wherever `a > 0`, including the antialiased rim, which is why there is
  no light halo. The slicer asserts that every pixel the mask calls empty is
  still page grey in the export, so a misaligned cut fails loudly rather than
  shipping shifted icons.

## The tiling

Five columns of 80 with a 12 gutter, centred by the 15pt remainder. That is
the whole layout, and those four numbers are most of the token block.

Five is what fills a 478 × 980 artboard. 43 icons make nine rows, and the tile
stands 88% as tall as the board; six columns drops that to 65%, seven to 49%.
The last row carries three icons, because 43 is prime and no column count
divides it evenly.

Neither board paints a background. There is no `--a-bg` token, no white
behind the light set and no black behind the dark one: the icons sit on
whatever the canvas is. That is also why `canvas/src/CanvasFileShapeUtil.tsx`
no longer fills the shape box with `#ecedf3` before the iframe paints. Every
other board sets its own `body` background, so nothing else changed. The one
colour left is `--a-credit`, a mid grey that reads either way.

`refkit tokens` requires one `:root` shared byte for byte across a folder,
which with no ground to vary is simply the same block in both files.

The order is the nodes' reading order, transcribed off their own x/y rather
than sorted, and both sets use the same arrangement. It is nearly alphabetical
but not quite: Camera lands after Contacts, Games after Home, Keynote between
Maps and Measure, Music after News, Safari after Shortcuts, TV after Stocks.
The nodes' own 7-across shape is not kept, because seven columns leaves the
artboard half empty.

There are no captions. Each `<img>` carries the name in `alt` and `title`, so
hovering names it.

## Regenerating

```bash
python3 mockups/canvases/apple-icons/gen.py
```

Rebuilds both boards and `layout.json` from `assets/` and `assets-dark/`,
byte-identical. The boards are output: edit `gen.py`, never the HTML.

## Attribution

The app icons are Apple's, and Apple, iOS, macOS, and the app names shown are
trademarks of Apple Inc. They are checked in here as prototyping reference
material for an unaffiliated design study. This board is not an Apple product
and is not endorsed by Apple. The repo's Apache-2.0 licence covers its own
code, not this artwork.

The other two boards in this repo deliberately leave their third-party
captures out for exactly this reason. This one includes the art because the
art *is* the board. If you are cutting a distribution, delete
`mockups/canvases/apple-icons/` and all of it goes at once.
