# Substack, iOS

Seven screens of the Substack iOS home feed — the note feed, the *keep
reading* toast, a run of three notes, your own just-published post, an
archive resurfacing, people to follow, and the share-your-profile sheet —
rebuilt from Mobbin captures at 3×, plus the token board and the two evidence
boards behind them. 10 boards, and 7 more that park each capture under its
replica.

| # | Board | What it shows |
| --- | --- | --- |
| 00 | `design-tokens` | Every token, rendered |
| 00b–00c | `evidence` | One row per token, and what it was read off |
| 01 | `note` | A note in the feed, a publication tile row above it |
| 02 | `keep-reading` | An article card and the Keep reading toast |
| 03 | `notes` | Three notes, one with a badge |
| 04 | `just-published` | Your own post, above a scrolled tile row |
| 05 | `from-the-archives` | An archive resurfacing, and People to follow |
| 06 | `people-to-follow` | People to follow at the top, a quoted note under it |
| 07 | `share-your-profile` | The share sheet over the feed |

## How close it lands

Mean absolute delta against the captures, in levels of 255, over the score
window described below:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Note in the feed | 1.82 | 05 From the archives | 4.33 |
| 02 Keep reading toast | 3.38 | 06 People to follow | 2.97 |
| 03 Three notes | 2.96 | 07 Share your profile | 2.91 |
| 04 Just published | 3.55 | **Mean** | **3.13** |

The two worst are 05, whose tab bar sits over a row of orange Follow buttons
and whose link card is now drawn rather than pasted, and 04, whose note
attaches a document and draws two pages of it at a 2× downscale. The material
is the ceiling on both, and it is a stated approximation rather than a defect —
see below.

The number has gone up four times on purpose. The first pass scored 2.08 by
cropping eighteen logos and avatars straight out of the captures; the second
replaced the four cover photographs with the publishers' own files, at 0.28;
the third replaced screen 04's two document pages with theirs, at 0.25 — nearly
all of it on that one screen, 1.87 to 3.60. The fourth drew the type on the
four link cards instead of pasting it, at 0.29, and most of that is 02 and 05.
Every time the score rose because a crop cannot lose against the image it was
cut from. What the crops were buying was the score, not the replica — see
**The third case: fetch**.

Drawing the type paid for something the score does not see. Screen 06's card
sits under the tab bar, so its crop was a picture of that bar; with the card
drawn, `tabbar()` is the only tab bar on the boards and the glass over it is a
real `backdrop-filter` rather than a capture of one.

## The score window, and the three things Mobbin did to the export

The captures are not screenshots of the phone; they are Mobbin's export of
one, and the export differs from the device in three ways:

1. **The Dynamic Island is composited out** of the top 58pt.
2. **The corners are square**, where the display has a 52pt radius.
3. **Nothing is painted below 838pt** — no home indicator.

All three are properties of the export, not of the app, so the boards draw
the island, the corners and the indicator, and the score is taken on
**y 58..838 under a 52pt rounded mask** — the same window `chatgpt-ios` uses.
`scratch/win.py` cuts that window out of both sides and hands the pair to
`refkit diff`; every number in this README came out of it.

One more export difference is *inside* the window and is not excluded: the
compose button reads `#FF5800` on captures 1–5 and `#F44B00` on 6 and 7. That
split is already in the raw `p6.png` / `p7.png`, before any colour
conversion, so it is Mobbin's, not a second brand orange. The boards paint one
accent and eat about 0.07 of delta on those two screens.

## The crop rule

> Crop what the capture already contains; draw only what it does not. A crop
> scores 0 against its own source by construction.

`crops.json` is 22 boxes in design pt. `gen.py` cuts them out of
`assets/refs/cN.png` into `assets/art/<id>.png` and places each `<img>` back
at the same box, so an asset can never drift from where it was measured.
Everything else — header, tab bar, FAB, cards, buttons, rules, type, icons —
is CSS or inline SVG.

Two consequences worth stating, because both look like laziness and are not:

**An article card is cut in two.** Substack does not bake the title into the
cover — the cover ships clean — so the two halves are two different problems.
The photograph is fetched and drawn, with the card's ground under it and the
card's scrim over it. The type over it is set: the publication's 20pt logo out
of `assets/logos/`, its name in caps, and the post's own title and subtitle,
each run placed by the ink top `scratch/cardtype.py` read off the capture and
each string taken from the post the note links rather than from a reading of
the ink. `gen.py`'s `LINKCARDS` holds all four.

**A crop is the one thing that cannot be measured wrong.** Cut at a box and
put back at the same box, it carries its own misregistration with it and the
error cancels; a third of a point out at the top of a note is a third of a
point out in both directions and invisible in the diff. Nothing drawn or
fetched gets that for free, which is why every fetched asset below had to be
re-fitted to the artwork rather than inheriting the box the crop used.

## The third case: fetch

A publication tile, an avatar and a post's cover photograph are not the app's
artwork. They belong to the publication, to the person and to the publisher,
and Substack still serves all three. So twenty-seven of them are not cropped:
`scratch/logos.py` and two agent passes pulled them into `assets/logos/`,
`assets/avatars/` and `assets/photos/`, and `gen.py` masks or places each one
here.

The route is the same for all of them. A publication homepage carries a
`logo_url`; a profile page at `substack.com/@handle` carries an `og:image`.
Both point at `substackcdn.com/image/fetch/<transforms>/<percent-encoded
original>` — **percent-decode the last path segment** and the S3 original is
behind it, up to 1904 px for a logo and 2477 for an avatar, against the 215 and
120 px the capture holds.

Three things had to be measured before any of it beat the crops it replaced.

**A tile is 72pt, not the 71.83 its edges average.** A bitmap gets whole device
pixels, so the size that matters is the one it lands on. `scratch/logofit.py`
cuts each of the eight identified flat tiles at 215 and at 216 device px and
differences both against the capture: 216 wins on every single logo, mean |d|
8.35 down to 5.55. A third of a pixel of scale is a third of a pixel of
misregistration everywhere inside the mask.

**Chrome floors an image box to a whole device pixel.** At 3× every tile's left
landed on .73 of one, so the browser dropped each tile a quarter point left of
where the pitch put it and its edge came out hard where the capture's is a
ramp. Snapping x, y and size to `round(v*3)/3` costs .09pt of position and buys
back a third of the tile row's error — `scratch/tilefit.py` before and after.
Every fetched asset is snapped the same way.

**A fetched circle has to be fitted to the artwork, not to the crop's box.**
`scratch/facefit.py` composites each avatar onto white over a sweep of offset
and diameter and differences it against the capture. It reads 40.00pt for a
note avatar and 102.00 for a people card — 306 device px, whole again — and it
finds three of the five note avatars a device pixel or three below the box
`crops.json` measured, which is why `note()` has an `ay`. It also sweeps the
crop scale: z = 1.00 wins on all nine, so the centre square is the right cut
and Substack applies no inset of its own.

**A cover is placed by measurement, not by rule.** Every one of the four is
drawn at 1083 device px across — the card's own 361pt gutter width, to the
pixel — but the row of the file the card's top corner lands on is 16 on one and
171 on another, so Substack keeps a crop per post and there is nothing to
derive. `scratch/wherefrom.py` template-matches a clean patch of the capture
into the file at every plausible size, high-passed so the card's own scrim
stops being most of the variance. `scratch/scrim.py` then pairs every pixel of
the capture with the pixel of the file under it and solves
`captured = photo*(1-a) + ground*a` for the coverage and the ground. Fitted
per card the four ramps land within 2pt of each other, so they are one ramp,
clear at the card's top corner and solid 180.85pt down; only the ground is per
card, and it is a colour Substack chose rather than one computed from the file
— card-5's file averages white and its card is navy.

What that costs is 0.28 of the seven-screen mean, and it is worth reading the
shape of it: over a cover the mean error is 1.3 to 2.2 levels while the *signed*
error is under half a level, so none of it is tone and none of it is placement.
All of it is detail finer than the eye reads at 1×, the difference between the
file the publisher uploaded and the bytes Substack's CDN handed the app. Where
the two can be told apart the closer one wins: card-7's cover is the 1080px
og:image rendition the post itself references, not the Unsplash master behind
it, and the master scores 0.6 worse.

**A page of a document is a cover with the width taken out of the token set.**
The note on screen 04 attaches five pages and the feed lays the first two out in
a carousel 300pt tall. Height is the only thing the layout picks: each page keeps
its own 1241×1754, so 900 device px tall is 637 across and there is no round
number to read off an edge. `scratch/docfit.py` template-matches both files into
the capture at that size and finds them at corr 0.98 and 0.89 with their own
first row on the box, at x 16.00pt and x 236.33pt — an 8pt gap — so nothing is
cropped or centred, and the corner is the 12pt `--x-r-card` the cards already
use. A ±1.5px subpixel sweep says 0,0 wins decisively over every neighbour.

That one costs 0.25 of the mean and nearly all of it lands on screen 04: |d| 3.78
over the cover page and 8.94 over the contents page, against signed +0.09 and
+2.18. The shape says what it is — `scratch/doc-diff.png` is a symmetric edge
outline and nothing else, which is 4pt type resampled 2:1 rather than tone or
placement, and `scratch/doc-z.png` is the pair at 1× and they cannot be told
apart. Nor is there a better resample to find: `scratch/docrend.py` sweeps five
filters against every CDN rendition from `w_1456` down to `w_424` (all of which
resolve to the same 1241px native, since `c_limit` will not upscale),
`scratch/docmip.py` adds mipmap chains, and one pass let Chrome do the downscale
itself. Every one of them lands within 0.2 of Lanczos, and Chrome's cost 1.1MB
of board to get there.

The second page runs off the right edge of the screen, and the raster cuts it
rather than CSS: the phone has `overflow:hidden`, a board is one flat layer with
no wrapper to clip against, and the cut also keeps 470 device px of file out of a
`data:` URI that nothing would ever show. Only its left corners are rounded —
a radius on the right would round an edge that isn't there. Neither page is
lifted above the scroll wash the way a crop is, because the fade into the tab bar
is real here and a drawn page has none of its own to double.

What is left as a crop is what nobody could name or could not be had: seven
note avatars, three publications (`the-anthro`, `2e`, `ux-ai`), the half tile
the left edge of screen 04 cuts, and `photo-1`, whose note is a video and whose
capture holds a frame of it. The header avatar is a fourth case. `me`, `th-4` and
`share-7` are one portrait at the three sizes the app draws it, and the
account behind it is one the captures never name: screen 04's *Just published*
card gives only the post's title, screen 07's sheet is *Share your profile*
with no handle on it, and that title resolves to a different publication whose
avatar is a wordmark. Three crops, then, one per size. `me` is the one of the
three that moves: `th-4` and `share-7` each sit at the one box they were cut
from, so their corners carry the right background with them, but `me` is
placed on seven different headers — over white on the unscrolled ones and over
`hdrglass()` on the rest — so its corners have to go. `header()` rounds it in
CSS, which is worth about 0.03 on every screen.

## Liquid Glass is fitted, not solved

The floating tab bar is iOS 26's Liquid Glass, and it is not a linear alpha
blend. Two probes in `probes.json` say so directly:

| Read | over white (c3) | over the photo (c6) |
| --- | --- | --- |
| the pill's material | `#FEFEFE` | `#C4B9AA` |
| the selected tab's oval | `#ECECEC` | `#AB9E8B` |

The oval darkens its material by 18/255 over white and by 25 over a photo. It
is a scrim, not a fill — but a *single* black alpha cannot produce both: the
white read solves to `.071`, the photo read to about `.15`. Same story for the
material itself. The real effect keeps the chroma of what it covers and
darkens more over dark ground; CSS `backdrop-filter` does not.

What ships is the best pair a 2-D sweep found over all seven screens
(`scratch/glass.py`, 12 cells, `refkit diff` on each):

```
alpha   .42     .50     .58     .66
        18.43   17.16   16.10   15.41   (sat 2.2, seven-screen total)
```

(Run before the blur fit below, so the absolute totals have since moved; the
ordering is the finding.)

`rgba(255,255,255,.66)` with `saturate(3)`, and `--x-tint` at
`rgba(0,0,0,.075)`, which is the white-ground solve. Excluding screen 06 the
optimum moves to `.58`; 06 pulls it up on its own, and 06 is the screen whose
tab bar had to be repainted (below). The alpha is honest about being a fit.

**The blur radius is small.** A 5× zoom of 05's tab bar shows the orange
Follow buttons keeping crisp vertical edges through the material — the
capture is barely blurred. `blur(16px)` smeared them into a gradient;
`blur(4px)` scores 15.16 against 16's 15.22 and 24's 15.35, and looks right.

**06's tab bar was the last baked one, and drawing its card removed it.**
Screen 06's link card sits under the bar, so cropping the card cropped the bar
with it, and the board had to repaint the band with the photo's own colour
before CSS glass could go over it without compositing the bar twice. With the
card's type set instead, the crop is gone and so are the two repaint boxes:
`tabbar()`, `fab()` and the scroll edge are the only bottom chrome on all
seven boards, and every one of them is a real `backdrop-filter` over real
content.

## The scroll edge is two different effects

iOS fades content into the tab bar, and the direction depends on the ground.

- **`wash()`**, white, on five screens: a ramp from α0 at y726 to α.89 at 838,
  held flat past it. White on white leaves no trace in the gutters, so it has
  to be read off something dark, and the only dark thing under it is the foot
  of 07's link card — which stopped being a crop when the card's type was
  drawn. Its ground is now a flat `#212524` the generator itself puts down, so
  `scratch/washfit.py` solves `ground*(1-a) + 255a = ref` a row at a time down
  the card's left gutter: nothing until 726, then .044 by 740, .091 by 750,
  .181 by 760 and .284 by 768, the last row before the foot. Below the card the
  screen is white again and the ramp is invisible, so the two stops that close
  it are still c1's ink, .84 by 832 and .89 by 838.
- **`fade()`**, black, on 05 and 06, where the ground under the bar is a
  photograph: six stops from α0 at y730 to α.26 at 820.

Crops that dip below the wash's top are lifted above it by `art()`, or the wash
would fog art the capture shows sharp.

## Type is placed by its ink, not its box

A capture reports where ink starts; CSS positions a line box. `tx(x,
ink_top, …)` takes the **ink top** and solves back to the box:

```
box_top = ink_top − line_height/2 + k(text) · font_size
```

`k` is the tallest ink class in the string — `.382` for `ij`, `.372` for
ascenders, `.353` for round caps, `.341` for flat caps, `.297` for `t`, `.170`
for x-height and punctuation — plus `.012` at weight ≥ 600. Every call site is
then a number read straight off the capture, and `scratch/shift.py`
cross-correlates each band ±4pt in ⅓pt steps to catch the ones that are not.

**A note's name is not a fixed distance below its avatar.** The avatar is a
crop on its measured box; the name beside it drifts up to ⅔pt against that
box, screen to screen. `note(..., dy=)` moves the two type rows and never the
crop, and `scratch/sh1.py` on the avatar box is what proves the crop was right
before the type moves. Eleven such shifts, each ⅓ or ⅔pt, took the seven-screen
total from 15.13 to 14.55 — more than the blur fit and the plus glyph together.

Run `scratch/shift.py <n> 64 320` to find them: the x-restriction is what
separates a note's type from the avatar it sits beside. A band whose best
offset is the full −4pt is a *content* mismatch, one of the stand-ins below,
and moving it makes the board wrong to make a number smaller.

**Semibold needs negative tracking.** SF Pro at 600 sets wider than Substack's
face: a bold body line drifts up to 1.33pt over ~350pt while a regular line
drifts 0.00. `b{letter-spacing:-.03px}` was swept (0 → 16.18, −.02 → 15.62,
−.03 → **15.54**, −.04 → 15.75, −.06 → 16.30) and takes screen 04 alone from
2.44 to 1.80.

## Details worth not re-deriving

- **The tab-bar icons are traced, not sourced.** Substack draws its own five,
  and a generic icon set gets all five wrong. What `scratch/icon.py` reads off
  c1 — the ink span of every ⅓pt row, board against capture — is: the inbox is
  a trapezoid over a box, the bell's skirt flares and its clapper is a
  detached smile, the home's door is that same smile rather than a bar, the
  chat bubble is nearly an oval (6.33pt corners on a 19pt box) with a fat
  curled tail, and the search handle is an outline — two strokes round a tip,
  not one.
- **The compose button's plus is 15.7pt across on a 2.7pt stroke**, measured
  off the ref's own profile (vertical bar x339.4..342.1 at y719, arms
  332.9..348.7). The obvious 20.8/3.2 reading of a 24pt icon box is 5pt too
  long and cost 0.14 across the seven screens.
- **A people-card name keeps the badge's slot whether or not the badge is in
  it.** An unticked name sits 2pt left of centre on every card of c5 and c6,
  so `people()` centres in 137pt when unticked and 141 when ticked.
- **The label column on a people card is the button's 141pt, not the card's
  165.** That is what breaks c5's second subtitle after "System" instead of
  after "Design".
- **The just-published card is 71pt tall, not 81.67.** c4 puts its lower
  border at 207.33 and a soft drop shadow — 226 a point below it, back to 253
  by 223 — in the 11pt between there and the tile row.
- **`--x-border` is the shadow's neighbour, not a clean hairline.** The card's
  0.6pt top edge spreads over four subpixel rows (240/224/229/242 on a
  `#FDFDFD` ground), about 27 pt-units of darkness — `#D2D2D2` at 0.6pt on its
  own. The token keeps `#DDDDDD`, which is what the card scores best at once
  the drop shadow is in the picture too.
- **`--x-ink-2` is a census mode, not a percentile.** No 10.5–14px regular
  stem reaches its own fill at 3×; the darkest 2% of the c7 help line is
  `#727272` where the mode over the whole line is `#787878`. The probe reports
  the floor, so `--against` compares floor to floor.

## Where the replica had to reason past the capture

Every one of these is marked on the parked reference board too, in amber, so
no near-match can pass as exact.

- **01 and 02** — the tab pill covers a note. Its shape is legible; its name,
  date and body are not. Both are stand-ins (02 keeps the date).
- **03** — Francisco's note. All the pill leaves of its first line is the left
  stroke and crossbar of a capital A in the 5pt gutter, ink top 787.0. "A note
  I keep coming back to, from an old issue:" is fitted to that A and nothing
  else.
- **04** — the first tile label is clipped by the viewport; "Strategic Thi" is
  what the capture shows.
- **05** — the two people-card names sit under the tab bar. Stand-ins.
- **06** — only 31pt of the third people card is on screen. "Bestfolios Notes"
  / "Curated portfolios" is fitted to the one thing the capture shows of it:
  ink starting at x389.33, i.e. 106.34pt of 13/700 centred on 442.5.
- **07** — the note under the pill keeps the name *winnie*; its counts are
  stand-ins.

## Assets

`assets/art/` is 22 crops, cut by `gen.py` from `assets/refs/` at the boxes in
`crops.json`, plus the 28 tile, chip, circle, cover and page cuts it derives
from the three folders below. All of it is inlined as `data:` URIs, so the
boards render offline in the canvas's `sandbox=""` iframe. Every icon is
inline SVG.

`assets/logos/` is twelve publication logos, `assets/avatars/` is nine avatars
and `assets/photos/` is the four cover photographs and the two document pages,
each the publisher's own file off Substack at full resolution. A logo is cut
twice, at 72pt for a tile row and 20pt for the chip on a link card; nine are
worn on tiles, four on cards, one of them on both. Each folder's `SOURCES.md`
names every file and the page it came from, with the original's URL wherever
that page still serves the same file — `scratch/logosources.py` re-resolves and
differences all twelve logos, and two publications have changed their logo
since the capture.

`assets/refs/` holds the seven captures twice — `pN.png` as they came from
Mobbin, `cN.png` converted from the untagged Display P3 they exported in to
sRGB (`scratch/srgb.py`). **Every colour in `probes.json` is read off `cN`**;
reading the raw file puts every hue about 8% out. Both `assets/refs/` and the
`ref-*.html` boards built from them are gitignored: they are whole app
screens, not component art.

The captures are Mobbin's, watermark intact, reproduced for design reference;
the artwork is Substack's and its writers'.

## Regenerating

```bash
python3 mockups/canvases/substack-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical. The boards are
output: edit `gen.py`, never the HTML. Without `assets/refs/` it skips the
seven reference boards and the crop step and builds the other ten.

Verify with:

```bash
refkit tokens mockups/canvases/substack-ios
refkit batch mockups/canvases/substack-ios/probes.json --pt 3
python3 mockups/canvases/substack-ios/scratch/win.py      # the score table
```
