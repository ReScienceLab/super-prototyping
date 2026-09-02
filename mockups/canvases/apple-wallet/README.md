# Apple Wallet, iOS

Two Figma community files on one page, because they are the same app. The
Wallet app itself, [Apple Wallet · iOS][file], gives two screens in both
appearances; [Apple Wallet Templates][tfile] gives five pass templates. 15
boards, and 9 more that park each file's own PNG export under the replica of
it, so 24 in a working tree and 15 in a fresh clone.

Each half keeps its own token board and evidence boards, because they are two
measurements of two files: `--aw-` for the app, `--awt-` for the passes.
Neither file publishes a value the other one does.

## The app: two screens, both appearances

The file ships every screen twice, at 430pt and at 393pt, light and dark. This
repo's frame is 393 × 852, so the 393 pair is what was measured. All four
frames live under [`2:2129`][root], the file's "📱 Screens" board.

| Board | Figma node, light | Figma node, dark |
| --- | --- | --- |
| `01-cards` | [`2:2139`][n1] | [`2:2140`][d1] |
| `02-get-started` | [`2:2157`][n2] | [`2:2158`][d2] |

## The passes: five templates, light only

That file has **no dark appearance and no published variables**. Every colour
is a raw hex read out of the design context and confirmed against the export,
which is why the evidence column matters more there than in a run with a
variable table to quote.

Its frame is also **390 × 844 with a notch**, not this repo's usual
393 × 852 Dynamic Island frame, so the phone is 42pt-cornered and
`passes.py` draws the notch as one path.

| Board | Figma node | Frame name |
| --- | --- | --- |
| `03-boarding-pass` | [`0:66`][p1] | Wallet - Boarding Pass |
| `04-store-card` | [`0:57`][p2] | Wallet - Store Card |
| `05-key-a` | [`0:17`][p3] | Wallet - Key |
| `06-key-b` | [`0:10`][p4] | Wallet - Key |
| `07-key-c` | [`0:2`][p5] | Wallet - Key |

That page holds one more frame, `0:81`, a second "Wallet - Boarding Pass" that
is a Lock Screen instance rather than a pass template. It is not one of the
five and is not built.

## How close it lands

Mean absolute delta against each file's own 2× PNG export, whole frame,
phone crop, in levels of 255:

| Screen | light | dark |
| --- | --- | --- |
| Cards | 0.32 | 0.46 |
| Get Started | 0.23 | 0.37 |
| Boarding Pass | 1.09 | |
| Store Card | 1.78 | |
| Home Key | 1.12 | |
| Car Key | 0.59 | |
| Hotel Key | 1.86 | |

On the app screens what is left is JPEG noise inside the two photographic
passes and glyph antialiasing; no band on any of the four boards is more than
3.1 levels off. On the pass templates geometry is settled too, every string,
glyph and image box landing within half a point of the export, and what is
left is **photographic**. The two worst boards are the two with the most
photograph on them, and their residual is Figma's own downsampling: in the
palm-tree band the export's gradient energy is 8.15 against the board's 9.98,
because Figma resampled a larger original while the board draws its
716 × 450 asset 1:1. Alignment there is exact, the best integer shift
between the two being (0, 0), so no geometry change removes it.

## Three files, one folder

`gen.py` is a driver and holds no measurements. The two runs live in
`screens.py` and `passes.py`, each owning its own `TOKENS_SPEC`, its own
`assets/` subtree and its own builders, and knowing nothing about the other.
What `gen.py` does is join the two `:root` blocks into the one shared block
`refkit tokens` requires (77 tokens, two prefixes), name the boards across
both runs, and write `layout.json`.

Each app screen is one builder called twice: `fn()` is the light frame,
`fn(dark=True)` adds `.dark` to the phone, which redefines the four variables
the file redefines and nothing else. Four is the whole of dark here: page,
ink, separator, material. The Dynamic Island, the promo card and everything on
it are one value in both themes. The pass templates have no dark frame to
build.

In each module `TOKENS_SPEC` is the single source for its `:root` lines, its
`.dark` block where it has one, its token board and its evidence boards, so a
value cannot drift from the evidence behind it. The app's values came from the
file's published variables read with `get_variable_defs` on a light frame and
on a dark one, from its named type styles, and from node boxes; the PNG
exports confirmed them and settled the two values that are a translucent fill
over a ground. The passes file publishes no variables at all, so every value
there came off the design context and the export.

## What the app file said, and what the renders corrected

**The home indicator is not centred, and that is the file's bug.**
`.Wallet > Footer` is a 430pt instance dropped into the 393pt frame at x 0. The
Home Bar inside it kept that 430pt width while the indicator itself was
overridden to the 393pt value of 140, so it centres on 430 and lands at x 145 —
18.5pt right of the frame's own centre. Both exports show it there, so both
replicas put it there. `gen.py` reproduces it by construction (a 430pt footer
with `left:50%`) rather than by writing 145, so the cause stays visible.

**Chrome sets a glyph half a point low, and 15pt wants the correction too.**
Every text top here is written as its measured Figma coordinate minus 0.5: the
Wallet title, the promo headline, the promo body, the status-bar clock, and the
15pt GET label. `apple-settings` put the cutoff somewhere between 13pt (no
shift) and 17pt (shift) without a 15pt string to test it on. This board has
one, and it takes the shift: 19.5 / 16.5 / 3.5 gives the 0.23 above, and putting
all three back on their measured tops gives 0.48. Rects are never shifted.

**The status-bar clock was half a point low in three folders.** pt-18 over a
22pt line inside a 54pt bar puts its Figma top at 18.5, so it belongs at 18.
`apple-settings` and `apple-calendar` shipped it at 18.5; measuring it here
caught both, and both are fixed. Their delta tables moved with it.

**The footer material is a flat fill, not a `backdrop-filter`.** Figma's
Material Blur (BACKGROUND_BLUR, radius 50) composites flat in both exports
because nothing scrolls under the footer in either frame: invisible over white
in light, `#262627` in dark. An actual `blur(25px)` costs 3.5 levels in the
band, because it samples the bezel outside the phone's 52pt corners and smears
it back inside — damage the export does not have.

**A pass border cannot be an inset `box-shadow`.** An inset shadow paints above
the background and *below* child content, so the pass art covered it and the
white Apple pass lost its outline entirely, for 4 to 6 levels in two bands. It
is an `::after` overlay with a real 1pt border instead.

**The two promo hexes are not published variables.** `#C7BCA9` on the Get
Started card and `#B19F8E` on its bottom band are raw fills, and neither is
redefined in dark, so the entire card is byte-identical on both boards and only
the page around it inverts. Every other colour on either screen is a variable.

**Both action buttons are `label/primary` with a `bg/primary-base` glyph**,
which is exactly their inverse: black circle with a white glyph in light, white
circle with a black glyph in dark. One rule covers both.

**There is no `letter-spacing` anywhere, on purpose.** The type styles carry
tracking (+0.40 at 34pt, −0.43 at 17pt, −0.23 at 15pt) but SF Pro applies it
through its optical size axis and Figma's own export shows none of it added.
Same finding as `apple-photos`, `apple-calendar` and `apple-settings`. The
templates file below is the one that disagrees, and it disagrees because
Figma's own SF Pro is tracked wider there, not because the type styles are.

## What measurement found on the pass templates

**Figma's SF Pro is wider than Chrome's between 14pt and 22pt.** This is the
finding of the run, and no earlier folder in this repo needed it. Strings came
out consistently short: the coupon's 31-character message measured 237.5
against the export's 251.0. It is not a font substitution — SF Pro Text, SF
Pro Display, the Text/Display pair and every pinned `opsz` were swept, and
none reproduces the export at every size. It is **tracking**. The proof is a
per-glyph ink-run comparison of that same message: the run *widths* match
within ±0.5, so the outlines are identical, while the run *starts* drift
0.35–0.45 per glyph, so only the advances differ. So `TOKENS_SPEC` carries one
measured tracking token per size:

| size | tracking | solved off |
| --- | --- | --- |
| 12pt | 0 | already measures to the pixel |
| 14pt | .19px | the coupon's 14-digit barcode number, 111.5 vs 114.0 |
| 17pt | .45px | the 31-character message, 30 gaps, 13.5pt short |
| 20pt | .45px | Downtown San Francisco (21 gaps) and Beachfront Suites (16) |
| 22pt | .3px | SEP 23 - OCT 1, 13 gaps, 3.5pt short |
| 40pt | 0 | SFO and LGA already measure to the pixel |

Worth 0.4 to 1.1 levels a board: 1.56 / 2.46 / 2.11 / 0.97 / 2.93 before,
the table above after. Two consequences to keep in mind when editing:
`letter-spacing` also pads *after* the last glyph, so a right-aligned string
walks left by one gap and `ra()` pulls the box back by the same amount; and
the one centred string, the barcode number, needs a matching `text-indent`.

**"Hold Near Reader" is the file's only node with tracking of its own**,
`tracking-[0.18px]`. It measures .60 per character, which decomposes cleanly
into the .45 above plus the .18 the file states. That decomposition is the
independent check on the whole table.

**Both scannable passes stack two QR layers.** The boarding pass draws a
vector QR at 127.41, 433.88 (136.07 × 142) *and* a raster one at 138.97, 446
(113.05 × 118); the coupon draws its two 118 × 118 QRs 2pt apart. This looks
like a defect and is not optional: rendering the QR region with both layers
lands at 3.13, with the raster alone at 51.07 and the vector alone at 28.81.
The export has both, so the boards have both.

**"Your busket is ready for pickup."** is the file's typo, transcribed as-is.

**The coupon's card is a point left of every other pass.** Its background path
and its strip image start at x 15, where the flight pass and the three keys
start at 16. The card's own children are *not* shifted — the logo, the company
name and the fields stay on the 16pt gutter. Both numbers are in the export.

**Fields are children of the frame, not of the card.** Card art (logo, company
name, app icon, info glyph, barcode) is placed card-relative; every `Field`
instance is placed in frame coordinates over the card. Reading a field box as
card-relative puts it 108pt low, which the export catches immediately.

**Chrome sets a glyph half a point low from 15pt up.** Every value, title and
company name is written at its measured Figma top minus 0.5; 12pt labels are
not shifted, and rects never are. Same finding as `apple-wallet`,
`apple-settings` and `apple-calendar`.

**Image fills in this file are stretched, not cover-cropped.** Each photograph
is pre-sized to the exact 2× of its slot, so `cover` and `fill` coincide and
the boards can use either. `logo-key-a` is the one non-square piece of art
(500 × 478) and the export shows its ink square, so logos are `contain`.

**The status bar's battery is one lifted group, not three rects.** Its 21 ×
10.333 shell is a 1pt stroke at 35%, so the ink runs half a point past the
viewBox on three sides and the SVG carries `overflow="visible"`. The lift also
needs `fill="none"` on that shell: it is a `<rect>` with a `stroke` and no
`fill` of its own, so it inherits the group's `currentColor` and paints a
solid 35% block behind the battery instead of a ring. With the fill on, the
outline reads 2pt thick and butts against the level; with it off, the export's
1pt ring and its half-point gap come back.

## Details worth not re-deriving

### The app

- **The pass stack pitch is the file's own arithmetic.** `card-height` 226 plus
  `card-between` −177 is 49, so each pass covers all but the top 49 of the one
  above it. Three passes therefore occupy 167 to 491, not 167 to 845.
- **Passes are inset 17, the promo card is inset 21.** The Cards frame lays its
  passes out at x 17 (359 wide in a 393 frame); the Get Started Section is
  `px-21`. Two different margins on two screens of the same app.
- **This file, `apple-settings` and `apple-calendar` draw the same Status Bar
  component.** The three glyph ink rects agree to three decimal places, and
  re-lifting `cellular` / `wifi` / `battery` from this file's own export
  produced files byte-identical to `apple-settings/assets/icons/`.
- **Two tokens are alpha over a ground, and stay that way.** `--aw-sep`
  (`separator/non-opaque`) renders `#B9B9BB` / `#909092` over the white Apple
  pass, and `--aw-blur` (`ui/background-blur`) renders `#FFFFFF` / `#262627`
  over the page. Both composites were sampled off the 2× exports to confirm the
  alpha; the block keeps the alpha, not the composite. The dark one lands one
  level off on blue (`#262628` vs `#262627`), which is Figma and Chrome rounding
  `40 × 0.941` in opposite directions.
- **The headline is three explicit lines.** "Boarding Passes" / "and Tickets" /
  "All in One Place" are hard breaks in the file, not a wrap that falls out of
  the 311pt width. The body copy under it is a real two-line wrap at 223pt.
- **Dark reuses the identical illustration art.** The dark frame's PNG is an
  md5 match for the light frame's, so one `assets/screens/images/` set serves both.

### The pass templates

- **The notch is solved, not exported.** The Display Shape node exports as a
  55 KB bitmap per board; the path in `passes.py` is 300 bytes. Black reaches
  x 82 at y 0 and x 87 from y 8.75 down, so the top fillets are r=5, the
  bottom corners r=22, and the flat bottom edge is at y 30.75.
- **The phone corner is a plain r=42 circle**, solved off the export: black
  reaches x 38.5 at y 0, 5.5 at y 20 and 1.5 at y 30.
- **The plane is one glyph rotated 45°.** A 34.17 × 34.38 symbol in a 48.587
  square box; its rotated bounding box measures 42.03 × 34.13, offset
  (+2.76, −0.02) from the glyph centre, which is what the export shows.
- **The footer app icon is the header logo again**, at 20pt instead of 32.
  Both passes that have one reuse the same art.
- **The chrome is byte-identical on all five frames**, down to the ellipsis
  at x 349.283, so `chrome()` takes no arguments but the clock.
- **The strip image is 358 × 127.358 at y 177.057**, not the 130 its Strip
  Image instance box states. Fitting it to the box, or to the measured ink
  edges of 176.8 × 128, both render *worse* (1.94 and 1.84 against 1.78):
  the residual there is resampling, and a geometry change chasing it makes
  the board wrong as well as no closer.

## Assets

`assets/` holds what the two files exported, so the boards rebuild offline.
One subtree per source file, because the two frames are not the same phone:
`cellular`, `wifi` and `battery` appear under both and are different files.

- `screens/icons/` — 5 SF Symbols, each one's `viewBox` **is** its ink
  box. Lifted with `apple-calendar/iconkit.py`, which explains why a
  whole-node export is the only one that outlines them.
- `screens/images/` — the two pass photographs, the near-white Apple pass
  and the promo illustration, all at 3× of the slot they render in. JPEG
  q92 for the two photographs, PNG for the illustration (it has alpha) and the
  Apple pass; 258 KB in total, against roughly a megabyte if all four were PNG.
- `passes/icons/` — 12 SVGs. The SF Symbols were lifted the same way; the
  card backgrounds, the two QRs and the Hold Near Reader mark are whole-node
  exports. Each one's `viewBox` is its ink box in frame coordinates, which is
  what makes a left/top/width/height place it exactly.
- `passes/images/` — 5 logos at 3× of their 32pt slot, the 3 key
  photographs and the coupon strip as JPEG at 2× of the comparison scale
  (a 916px PNG of palm trees costs 1.4 MB), and the raster QR.
- `refs/` — the 9 PNG exports at 2×, 786 × 1704 for the app
  screens and 780 × 1688 for the passes. **Gitignored**, along with the
  `ref-*.html` boards built from them: they are whole Apple screens, not
  component art.

The artwork is Apple's, reproduced from the community files for design
reference. It is not licensed for redistribution as product artwork.

## Regenerating

```bash
python3 mockups/canvases/apple-wallet/gen.py
```

Rebuilds all 24 boards and `layout.json` from `assets/`, byte-identical. The
boards are output: edit `screens.py` or `passes.py`, never the HTML. Without
`assets/refs/` it skips the 9 reference boards and builds the other 15.

Verify with:

```bash
python3 tools/refkit.py tokens mockups/canvases/apple-wallet
python3 tools/refkit.py shoot mockups/canvases/apple-wallet/*.html \
    -o shots --scale 2 --check-overflow
python3 tools/refkit.py shoot mockups/canvases/apple-wallet/[0d][12]*.html \
    -o mine --scale 2 --crop-phone
python3 tools/refkit.py shoot mockups/canvases/apple-wallet/0[3-7]*.html \
    -o mine --scale 2 --crop-phone --phone-size 390x844 --phone-radius 42
```

The last command's `--phone-size` and `--phone-radius` are not optional: the
pass templates are a different phone from the app screens, and the default
393 × 852 / 52pt crop would cut them wrong.

[file]: https://www.figma.com/design/NOU4nWNs63L4QX6YCBSejL/Apple-Wallet-%C2%B7-iOS--Community-
[root]: https://www.figma.com/design/NOU4nWNs63L4QX6YCBSejL/Apple-Wallet-%C2%B7-iOS--Community-?node-id=2-2129
[n1]: https://www.figma.com/design/NOU4nWNs63L4QX6YCBSejL/Apple-Wallet-%C2%B7-iOS--Community-?node-id=2-2139
[d1]: https://www.figma.com/design/NOU4nWNs63L4QX6YCBSejL/Apple-Wallet-%C2%B7-iOS--Community-?node-id=2-2140
[n2]: https://www.figma.com/design/NOU4nWNs63L4QX6YCBSejL/Apple-Wallet-%C2%B7-iOS--Community-?node-id=2-2157
[d2]: https://www.figma.com/design/NOU4nWNs63L4QX6YCBSejL/Apple-Wallet-%C2%B7-iOS--Community-?node-id=2-2158
[tfile]: https://www.figma.com/design/JJU4hc5PIkYLVhsGVNZYI2/Apple-Wallet-Templates--Community-
[p1]: https://www.figma.com/design/JJU4hc5PIkYLVhsGVNZYI2/Apple-Wallet-Templates--Community-?node-id=0-66
[p2]: https://www.figma.com/design/JJU4hc5PIkYLVhsGVNZYI2/Apple-Wallet-Templates--Community-?node-id=0-57
[p3]: https://www.figma.com/design/JJU4hc5PIkYLVhsGVNZYI2/Apple-Wallet-Templates--Community-?node-id=0-17
[p4]: https://www.figma.com/design/JJU4hc5PIkYLVhsGVNZYI2/Apple-Wallet-Templates--Community-?node-id=0-10
[p5]: https://www.figma.com/design/JJU4hc5PIkYLVhsGVNZYI2/Apple-Wallet-Templates--Community-?node-id=0-2
