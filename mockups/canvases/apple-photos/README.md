# Apple Photos, iOS

Three screens of the iOS Photos app rebuilt from the Figma community file
[Apple Photos · iOS][file], plus the token board they share.

| Board | Figma node |
| --- | --- |
| `01-all-photos` | [`2009:1153`][n1153] |
| `02-whats-new` | [`2009:1192`][n1192] |
| `03-notifications` | [`2009:1160`][n1160] |

## What makes this one different

The other boards in this repo were traced from screen captures: sample a
colour, measure a band, guess the token behind it. This one had the design
file, so nothing was sampled. Every number in the CSS is a Figma variable, a
type style, or an auto-layout value read straight off the node:

- `--ap-tile` is `app-photos/photo-grid` = 129.6699981689453, not "about 130".
  Three of those plus two 2px gutters overrun 393 by 0.01, and Figma overruns
  by the same 0.01.
- `--ap-title-top` / `--ap-title-bottom` are the file's own
  `app-photos/whats-new-title-top` and `-bottom`.
- The status bar comes from the component's padding rather than from pixels.
  Its two halves are both `flex-1` with `pt-18 pb-13`, so they end up at
  *different* heights: the icon row is 20pt tall, giving a 51pt side that
  centres at y 1.5, while the time is a 22pt line box, giving a 53pt side that
  centres at y 0.5. That 1pt difference is invisible until you diff it.

The Figma renders in the third row are the check, not the source. They settled
three things the file states ambiguously:

1. **The bottom sheet overflows its own frame.** `Bottom Sheet` is `h-[68px]`
   but holds a 58pt black block plus a 20pt sheet graphic and never clips, so
   the graphic paints y 58–78 while the next section still starts at 68. The
   board reproduces the overflow rather than tidying it up.
2. **The alert screen redraws its status bar above the scrim.** Everything else
   dims to 0.8 (white 255 → 204, the blue button → `#0062CB`); the time and the
   signal icons stay pure white.
3. **Tracking is already in the font.** The type styles carry it (+0.4 at 34pt,
   −0.43 at 17, −0.23 at 15, −0.08 at 13) but SF Pro applies it through its
   optical size axis, so Figma's export shows none of it on top. Setting
   `letter-spacing` in CSS double-counted: it made the 34pt title 8px too wide
   and the 17pt alert title 11px too narrow. There is deliberately no
   `letter-spacing` anywhere in these boards.

## Two things a Chrome-only check missed

The boards are viewed in whatever browser opens the canvas, so verifying in one
engine is not verifying.

- **Nothing is left to automatic wrapping.** Every line of listing and alert
  copy is hard-set with `<br>` at Figma's own break, and the elements that hold
  it are `white-space:nowrap`. Left to wrap on their own these lines were
  landing inside their boxes by 1.2pt (the alert title) and 2.2pt (the Shared
  Library description) -- under a pixel of margin at the tightest, so a
  renderer that measures a hair wider pushes the alert title onto a third line
  and shoves its buttons out of the 176pt box.
- **`--ap-material` is the flattened colour, not a live blur.** WebKit drops
  `backdrop-filter` here, which left a 70%-white panel with the listing
  underneath still perfectly legible through it. The material over the dimmed
  backdrop resolves to `#F0F0F0`, which is exactly what Figma exports, so the
  board paints that and asks no engine for a blur. The cost is the faint ghost
  of the text behind, worth about 4 levels of grey on average.

Against the renders every feature now lands within one pixel in **both**
Chromium and WebKit, antialiasing included: the grid, the tab bar, the sheet
lip, the button, the alert box and its 0.33pt dividers, and all eleven lines of
listing copy break at the same words.

## Assets

`assets/` holds what Figma exported, so the boards can be rebuilt without
going back online.

- `photos/` — the eleven grid fills, centre-cropped square and resized to 260px
  so a 2× shot of a 129.67pt tile stays sharp. Named in reading order.
- `icons/` — the ten SF Symbols and the sheet graphic. Figma draws SF Symbols
  as private-use text glyphs, so the per-layer SVG exports come back as loose
  fragments with no symbols in them at all. These were lifted out of whole-node
  SVG exports, which outline the text, then measured in a browser so each
  file's `viewBox` **is** its ink box. That is why the boards can size a glyph
  and let the aspect ratio look after itself.

The artwork is Apple's, reproduced from the community file for design
reference. It is not licensed for redistribution as product artwork.

## Regenerating

```bash
python3 mockups/canvases/apple-photos/gen.py
```

Rebuilds every board and `layout.json` from `assets/`, byte-identical. The
boards are output: edit `gen.py`, never the HTML.

## Reference boards

`ref-01`…`ref-03` are gitignored, and so are the `assets/refs/` PNGs behind
them: they are whole Apple screens, not the component art the rest of
`assets/` holds. They wrap the 393×852 Figma PNG in the same phone frame so it
lines up with the replica above it. Re-export those three nodes at 1× into
`assets/refs/` and `gen.py` picks them up; without them it prints what it
skipped and builds the other four boards.

[file]: https://www.figma.com/design/XdPVmryWB1QwjI2hK0ozgp/Apple-Photos-%C2%B7-iOS--Community-
[n1153]: https://www.figma.com/design/XdPVmryWB1QwjI2hK0ozgp/Apple-Photos-%C2%B7-iOS--Community-?node-id=2009-1153
[n1192]: https://www.figma.com/design/XdPVmryWB1QwjI2hK0ozgp/Apple-Photos-%C2%B7-iOS--Community-?node-id=2009-1192
[n1160]: https://www.figma.com/design/XdPVmryWB1QwjI2hK0ozgp/Apple-Photos-%C2%B7-iOS--Community-?node-id=2009-1160
