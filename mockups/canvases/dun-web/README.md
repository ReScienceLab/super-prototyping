# Dun web: the marketing page's feature section

A `clone-prototype` run over one landscape capture: the eight-card bento grid
on [Dun](https://dun.so)'s marketing page, where each pastel card carries a
handwritten label, a paragraph, and a piece of the product's own UI. One
replica board, six foundation boards, and the capture parked under it.

Open it with `?canvas=dun-web`.

| file | what it is |
|---|---|
| `00-design-tokens.html` | The contract. 94 tokens: two faces, 22 surfaces, 3 lines, 17 inks, 9 accents, 9 radii, 16 type shorthands, 16 metrics. Inlined byte-identically into every board. The sheet holds the colours and the radii. |
| `00b-type.html` | The 16 type shorthands set as specimens, and the 16 metrics. On its own board because the swatches and the specimens together overflow one 478 × 980 shape by 573px. |
| `00c`–`00f-evidence.html` | The measurement behind every one of the 94, four boards because the rows do not fit one shape either. `gen.py` fills an evidence board to a height rather than to a row count, and splits the table evenly across the boards it needs, so the last one is not a stub. |
| `01-feature-grid.html` | The replica, 1954 × 982, its own `w`/`h` in `layout.json`. |
| `ref-01-feature-grid.html` | The capture, same size, directly under it. Not checked in — see the last section. |
| `gen.py` | Emits all of the above plus `layout.json` and `icon.png`. Edit this, never the HTML. |
| `probes.json` | 90 probes: the machine half of the evidence table, replayed against the render by `refkit batch`. |
| `crops.json`, `assets/art/` | The eight pieces of the capture that are pixels rather than CSS. |
| `assets/icons/` | 17 line icons, inlined by `gen.py` so the canvas inspector can name each one. |

The capture is **1×** — a web page screenshot, not a device one — so capture px
and design px are the same number. There is no scale constant in `gen.py`, no
`--pt` on any probe, and `crops.json` holds plain page coordinates.

```bash
python3 mockups/canvases/dun-web/gen.py
```

regenerates the folder byte-identically. It needs either `assets/refs/`
absent or Pillow present: `cut()` and `app_icon()` import PIL, and with the
capture in place system `python3` stops at `ModuleNotFoundError: No module
named 'PIL'`. There is deliberately no fallback for it.

## How close it lands

Mean absolute delta against the capture, all three channels, no crop and no
alignment shift — `refkit blend` scores `dy 0` best, so the two are registered
as generated:

| region | box | Δ |
|---|---|---|
| whole frame | 1954 × 982 | **4.86** |
| Projects | 616,24 521 × 281 | 3.19 |
| Workspace | 75,24 520 × 582 | 3.60 |
| Tasks | 75,634 700 × 290 | 4.60 |
| Bulk actions | 797,634 700 × 290 | 7.45 |
| Subtasks | 1518,328 340 × 596 | 7.03 |
| Teams | 616,326 521 × 280 | 6.96 |
| Docs | 1157,24 340 × 582 | 8.99 |
| Comments | 1518,24 340 × 283 | 9.21 |

The spread is type density, not geometry. A Δ-block map puts every remaining
hot spot on a glyph: Docs is four headings and 19 lines of 8px body text in a
340px column, and Comments is two lines of 12px text across an otherwise empty
card, so on those two the substituted face is most of what a pixel can
disagree about.
Workspace and Projects, whose content is art and one paragraph, land at 3.2–3.6
with the same tokens.

## Substitutions and what they cost

**The body face is not identified.** `refkit font` on "Everything", the
largest string on the board, returns **no call** — SF Pro Rounded .665 against
SF Pro .629, and neither is close enough to promote. The real face is outside
the macOS candidate set. The board ships the repo's platform stack and the bill
arrives as width: across the 16 type probes the capture's ink width over mine
runs **0.895 to 1.167** (mine 12% wide on "Damia", 14% narrow on "Ctrl"),
median 0.99.

**Sizes are solved from cap height, not from width.** Every `--x-t-*` size
comes from the measured cap height at SF Pro's .714 cap ratio, then
cross-checked against the string's ink width; where the two disagree the cap
height wins, because the stand-in is not the real face. `--x-t-row` is the
widest disagreement: "Competitor Analysis Research" measures a 12px cap
(→ 16.8px) and 212px of ink (→ 14px), and it ships at 16px semibold. A width
that then overruns a measured container widens the container; the type is never
shrunk to make a width hold.

**The hand labels are SignPainter.** `refkit font` on "Workspace" rates every
candidate weak (Futura .383, Brush Script .341), so this is a look-alike rather
than a match. Its size is calibrated, not solved: SignPainter's ink was
measured against all eight reference labels (81/64/44/39/79/69/41/96 px wide)
and they ask for 23.7–26.4px, so the token is 25px.

## Four things a reader would otherwise take for measurement

**The row lists fade, and the tile does not fade with its contents.** Both
Subtasks and Bulk dim toward the bottom of their card, and the first model —
one opacity per row — is wrong: it moved Subtasks from 7.29 to 7.71. The tile
under a row keeps its white long after the row's ink has gone. Bulk row 3's
tile solves .77 against contents at .55; the last Subtasks row's solves .78 in
green and .77 in blue against contents at .38. So the tile is painted behind at
a fixed `--x-tile-fade: rgba(255,255,255,.78)` and the opacity goes on a
wrapper inside it. A checkbox belongs to the contents, not the tile: row 3's
solves .57, with the contents.

The estimator behind the five per-row numbers is worth writing down, because
two obvious versions of it are silently wrong. For each row, ground = the
median of the tile just above the glyphs, ink = the darkest 4% of the title
band, and α = (ground − ink) / (ground₁ − ink₁) **measured in the same x window
as row 1**. The right-edge fade cancels exactly in that ratio. Grounding on the
card's token colour instead does not cancel it (row 5 then reads .8 by tile and
.26 by ink), and comparing windows at different x folds the fade back in — the
Subtasks titles on rows 3 and 4 are indented to x 1761 where row 1's ends at
1783, which is what made two undimmed rows read .92 and .84. Validated against
my own render: .70 → 0.713, .11 → 0.114, 1.0 → 1.0.

**The dark pills are a gradient rebuilt from a fit, and its dark end is not a
colour.** A least-squares plane over each pill's core, evaluated at the CSS
gradient line's two ends, gives Mark-as-done −5.1 → 78.5 on a 10.7° axis and
Save doc −2.1 → 78.2 on 13.0°. Both dark ends extrapolate **below black**, so
`--x-dark` is `#000000` and `--x-dark-2` is `#4E4E4E` — the ramp the capture
shows is steeper than any sRGB gradient over that box can be. Starting the
gradient line 6% before the box closes the last 0.2 levels of the four
gradient-only bands and is not worth a stop. The earlier `#0B0B0B`/`#434343`
pair came from averaging the cores rather than fitting the plane, which
flattened the ramp from both ends at once and cost 2.5 levels on those bands.

**The card radius is 36px, and one command reports 28.** A `refkit bbox` on a
corner crop reads the corner's chord, not its radius. The number that holds is
a circle fit to where the fill starts on each row of the Tasks card's
bottom-left corner: r 39.5 at rms 0.6, against 30.0 fitted the same way to my
own 28px corner, so the fit runs 2 levels of threshold wide and the reference is
37.5. A sweep over all 32 card corners bottoms out at 36 (2.798 against 3.790
at 28), and the same sweep confirms `r-panel`, `r-tile` and `r-cur` where they
already stood.

**Two rotated tiles on Tasks, whose contents do not turn with them.** The
foreground pill is `.56deg` (top edge 774.70 at x 160 → 779.55 at x 700, bottom
831.53 → 836.33, two independent fits on +0.0097 rad) and the stack behind it
`-1.04deg` (859.25 at x 200 → 850.88 at x 660). Every other tile, panel and
toolbar on the board is flat to a third of a pixel. The row's icon, id, title
and chip are set straight inside the rotated box, because that is what the
capture shows.

The right-edge fades on Subtasks and Bulk are card-coloured gradients over the
rows (transparent → `--x-c-subt` from card-local 246 to 521, and →
`--x-c-bulk` from 611 to 826), not opacity on the rows themselves, which is why
a row's own alpha has to be measured in a window the fade treats equally.

## What the source itself shows, and what its file format invented

Text hidden behind a toolbar is **not** reconstructed. The Docs panel's last
line runs under the floating toolbar and comes out as "nk B2C. We'll targ",
written as that tail alone and positioned so its ink starts where the
capture's does. The words in front of it are not recoverable from the pixels
and inventing them would be inventing a fact. The same holds for the Bulk row
the toolbar crosses.

Four things in the capture are webp artifacts and are deliberately **not**
reproduced:

- faint grid lines across the Comments card,
- a white glow along the Bulk actions rows,
- a white ring around both cursor label pills,
- ringing above and to the right of the Bulk toolbar's edge, which also biases
  any probe placed near it. The "row 4 tile at .11" reading that sent the fade
  model wrong came from a window at x 1360–1404 sitting inside that ringing;
  the clean window at x 1402–1492 gives .03, which matches its ink at .039.

**The capture's icons are soft.** At 12× every line glyph carries a visible
glow, and a 1.5px coloured stroke in a soft 1× capture never reaches its own
colour: the five stroke accents read 35 to 95 levels light in `refkit batch`
(`blue` 65, `orange` 60, `fuchsia` 94, `green` 35, `red` 55) and those rows are
expected to differ. What puts the whole set on the Tailwind palette is the one
*filled* glyph, the amber half-circle, whose darkest pixel is `#FFBF28` — Tailwind
amber-400 to the level, against the token's `#FBBF24` (Δ4). The two cursor
arrows are crops, so `cur-blue` and `cur-green` land at Δ2.

Two icons differ from the capture on purpose:

- the **briefcase** carries a small clasp stub in the capture that lucide's
  `briefcase` does not have; the replica is lucide's handle-and-rounded-rect
  and the clasp is not reproduced,
- the **megaphone** is authored on lucide's 24-grid rather than taken from it.
  lucide's `megaphone` is a different shape; the capture's is a horn with a
  hinged handle under it and a speaker arc at its right.

## Reading probes.json

`refkit batch probes.json --against scratch/shots` after a shoot. 55 colour
probes at mean Δmax 7.9, almost all 0–3; 29 box probes at mean |dw| 2.07 and
|dh| 0.93. The rows that do not close, and why:

- the five stroke accents, above.
- `dark` Δ11. A flat census inside a ramp reports whichever level happens to
  repeat most, so it carries ~10 levels of slop; the window's means are 14.6
  against 19.0, and those 4.4 are the part of the reference's ramp that runs
  below black.
- `doc-body` Δ28, the 8px body text: an ink percentile over the thinnest type
  on the board is a glyph-coverage measurement, not a colour one.
- `o-bulk-3` Δ12 and `o-subt-5` Δ13, ink cores under a faded row, same reason.
- `row-pitch` and `bulk-pitch` print **differs**. `bands` collapses to its
  first band, and the substituted face's ink band is 5px taller on Subtasks
  and 2px on Bulk. The pitch, which is what the token says, matches: 85 and 66.

Four scans were narrowed after the first pass, because `batch` compares a
scan's **largest** colour step and a range holding two comparable edges flips
which one that is between the capture and the render. `ring` now takes the
Workspace card's right edge alone (588–602), `gap` the Projects card's left
edge (608–622), `hairline` the X button's left outline (928–942) and `h` the
Tasks card's bottom (900–940). All four then agree to a pixel. A probe window
is wrong far more often than a measurement is, which is why every entry carries
its own sanity note: `panel-bot` had to move twice to get clear of both the You
pill and the 36px card corner, and it read `#1BB944` — the cursor green — until
it did.

## Assets: all cropped, none generated

Eight boxes in `crops.json`, cut from the capture by `cut()` and placed back by
`art()` at the same numbers, so an asset cannot drift from where it was
measured:

- the three workspace marks (60px discs on the panel's own near-white ramp, so
  each square crop carries two levels of that ramp back with it),
- the Projects folder and the three note cards fanned behind it — one crop, not
  four, because the cards overlap and the fan angles are not measurable off
  169px of art,
- two photographs, the Damia and task avatars: a drawn stand-in for a face is
  the substitution a reader always notices,
- the two collaborator arrows. Their pills are CSS, but an arrow is four sharp
  vertices and at 1× every one of them is antialiased below any threshold —
  fitting the edges put the James apex 4px above where the ink starts. Each box
  is the ink grown to its ringing fringe, so the crop carries the one pixel of
  overshoot the capture has and the render must not invent.

Nothing here is generated artwork. `icon.png` is the one place the folder
upscales rather than crops: the Dun mark exists in the capture only at 60px, so
the sticker is a 4.27× LANCZOS upscale of the crop under a supersampled circle
alpha (the crop is the mark's own bbox — the disc spans x 0..59 across its
middle rows and 21..38 at the top). It is soft at 256 and there is no sharper
source; redrawing the loop would make the sticker the one thing in this folder
that is not the reference's own pixels.

## Two defects that produced no error message

- **`preserveAspectRatio`.** A square `viewBox` on a non-square span binds one
  axis only under the default `xMidYMid meet`, so the 16 × 4 ellipsis rendered
  at a quarter size and a size loop would have converged on the wrong axis
  forever. Fixed by measuring each icon's own ink box on the 24-grid
  (`GRID_INK`, read off a 10× render of the whole set) and setting
  `preserveAspectRatio="none"` with both axes given.
- **Pillow's variable-font axis order.** `SFNS.ttf`'s axes are
  `[Width, Optical Size, GRAD, Weight]`, and Optical Size must equal the pixel
  size. `set_variation_by_axes([wght])` — or the same values in the wrong
  order — returns absurd, quantized advances with no complaint, which silently
  corrupts every width measurement taken through it.

## The reference board is not checked in

Phase 5 parks the capture in `ref-01-feature-grid.html` and `layout.json` keeps
a third row for it, so the reference sits column-for-column under the replica.
The file itself is gitignored: it embeds a third-party page capture this repo
does not redistribute. Put your own capture at `assets/refs/01.png` and re-run
`gen.py` to rebuild it; without it the generator emits everything else and
leaves that board alone.

## Attribution

Dun is a product of its owner and the name and logo are its trademarks. This
board is an unaffiliated design study, kept as a record of the measurement
workflow. It is not a Dun product, not endorsed by Dun, and the replica HTML is
not meant to be shipped as a user-facing interface.
