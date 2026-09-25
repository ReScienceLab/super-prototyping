# Events Feed (iOS)

Seven boards rebuilt from an 8.2 s screen recording of an unnamed events-feed
concept: a token sheet, two evidence sheets, and four screens that are one
scrolling feed at four offsets. `PRD.md` is the product; this file is the
evidence.

```bash
python3 canvases/events-feed-ios/gen.py
```

regenerates every board in place, byte-identical, from anywhere. `gen.py` is
the only source of truth; the `NN-*.html` boards are its output. Edit the
generator and re-run, never the HTML.

There is no `icon.png`: the app names itself nowhere on any frame, so the
folder is named for what it is and shows no mark on the welcome page.

The verification harness is `scratch/check.sh` — one command that shoots all
four boards, cuts each to its capture's window, replays `probes.json` and
diffs. `scratch/` is gitignored at any depth, as is `assets/refs/`, so a fresh
checkout has neither the harness nor the frames it reads; the last section
says what to put back.

## The source is a video, and that changes the method

Every other folder here is measured from screenshots. This one has 493 frames
of 2560 × 1698 H.264 at 60 fps, and no frame holds a whole screen at high
resolution: the camera zooms and pans over a phone that never moves. Solving
the screen's edges per frame finds three static camera setups, and the run
uses all three:

| camera | frames | screen window | scale | what it settles |
|---|---|---|---|---|
| cam0 | 1–25 | the whole 956 pt screen | 1.4455 px/pt | every whole-screen placement |
| camA | 81–270 | screen pt 0…410 | 3.7818 px/pt | colour and type, top half |
| camB | 290–450 | screen pt 520…956 | 3.6114 px/pt | colour and type, bottom half |

Scale is `screen_inner_width_px / 440`, cross-checked against height
(636 / 440 = 1.4455 against 1379 / 956 = 1.4425, 0.2 % apart), which is also
what identifies the device as the 440 × 956 pt iPhone 17 Pro Max its own
simulator title bar names.

The three cameras agree where they overlap — the floating pill reads
850.2…902.1 pt on cam0 and 850.5…904.5 on camB; the home indicator
938.8…954.0 against 940.8…955.7 — and that agreement is what licenses mixing
them. `probes.json` carries the mixture: each probe names its own `pt`, so one
file replays measurements taken at three scales. Its `_head` note says which
boxes are screen pt and which are camB-relative (subtract 519.6).

**A frame is not a screenshot, and the floor is not zero.** Two frames of the
same static shot differ by mean Δ 1.14 (frames 5 and 6) to 1.69 (12 and 16),
and frames 3 and 20 by 4.58 as the camera drifts. Nothing measured here can be
better than that, and the deltas below should be read against it rather than
against another folder's screenshot-sourced numbers.

## How close it lands

Every board is rendered at `--scale 4`, cropped to the 440 × 956 phone, then
area-averaged down to its capture's exact pixel shape, and compared per pixel.
Units are mean |Δ| over R, G, B, in 0–255 levels.

| board | capture | window | whole board | art excluded | masked |
|---|---|---|---|---|---|
| 01 Feed, top | cam0 p1 | 636 × 1379 | 13.22 | **7.29** | 20.1 % |
| 02 Life Lately | camB b360 | 1589 × 1576 | 15.63 | **8.80** | 18.2 % |
| 03 Rooftop Jazz | camA a155 | 1664 × 1552 | 16.73 | **10.08** | 18.8 % |
| 04 Friendsgiving | camB b310 | 1589 × 1576 | 20.96 | **11.56** | 23.0 % |

The second number is the one the replica is accountable for: the first charges
it for the photographic regions it deliberately does not copy (next section).
`scratch/exart.py` computes both, masking every `scratch/regions-*.json` entry
whose name ends in `ART`.

The spread across the four is mostly how much photography each board holds and
at what scale it was measured. Board 01 is the whole screen at 1.4 px/pt, where
a 1 pt stroke is one and a half pixels and everything is soft; boards 02–04 are
half screens at 3.6–3.8 px/pt, where the same stroke is four pixels and the
compression's own blocking on the photo rims shows. Board 04 is worst because
Friendsgiving's four-tile stack is the largest run of substituted art on any
board.

The measured half:

```
colour probes: 11, mean Δmax 1.3, worst 5
box probes:    23, mean |dw| 0.82, mean |dh| 0.24
```

34 probes, every one naming the frame and the scale it came from. The single
worst colour probe is `fab-label` at Δ 5, the white "Create New Event" text
inside the dark pill at cam0's 1.4 px/pt — 11 pt type, three glyph rows of
pixels. The two worst box probes are both location pills, `card1-pill` at
−4.1 pt of width and `b-card4-pill` at −3.3: the pill's width is its text plus
padding, and the substituted face sets "Eko Hotel Rooftop" and "Tolu's Place"
a little narrow. Every other box is within 2.1.

## What is not the source's pixels

**The photo stacks, the five story avatars and the header avatar are original
art.** They are photographs belonging to whoever made the recording. Other
folders here crop such pixels out of the capture and commit them; this one does
not. `tile_art()` and `avatar_art()` in `gen.py` draw abstract gradient fields
from each region's *measured* dominant colours, so each card contributes the
right palette to the screen while none of the source's imagery is reproduced.

The consequence, stated plainly: those regions do not converge and never will.
They are the 18–23 % masked in the table above, and they are excluded from the
fidelity claim. The geometry around them is not excluded — the stack's bounding
box, its rims and its corner radii are probed like anything else, and
`card2-stack` measures 327.9 × 117.6 on the capture and renders 328.6 × 117.6,
and `b-rooftop-stack` 248.7 × 117.7 against 248.9 × 117.7.

Nothing else on any board is generated. There is no `crops.json` here, because
nothing is cropped.

**The status bar is the template's**, as the clone skill requires of every
iPhone board in this repo: `9:41`, a plain island, and the shared signal /
Wi-Fi / battery group, moved right by the 47 px frame delta so the battery
keeps its right inset. The capture's own 8:17 clock and its dotted signal
glyph are not carried over. This is the largest single non-art disagreement on
boards 01 and 03 — the region table reports the header's dominant colour as
`#000000` on mine (the island) against `#EAE8E9` on the capture — and it is
deliberate.

## What the source itself does

**The source draws no home indicator.** cam0's p1 covers screen pt 0…954 and
column scans through the bottom 20 pt find nothing but the blur band; the dark
row at 1347 px that first looked like one is the blurred "Eko Hotel Rooftop"
pill behind the glass. The boards keep the template's indicator as shared
chrome, so that is one more deliberate difference in the bottom 5 pt, and the
`home-indicator` probe was deleted rather than fitted to a thing that is not
there.

**The capture truncates a subtitle mid-word.** Life Lately's subtitle ends at
`…and everything in bet` with an ellipsis. The generator holds the full string
— `A collection of little moments, memories, and everything in between` — and
lets the browser cut it, in a container measured at 402 px. 402 and not the
398 the ink alone suggests: at 398 the browser drops the `t` and the board
disagrees with the capture by one glyph. The string is real; the cut is the
source's.

**A touch indicator sits over card 1's subtitle on p1.** A grey ring, the
simulator's. It is in the capture, not in the boards, and it costs a few levels
in that region.

**The fifth card is a title and nothing else.** camB's last usable frame reads
"Ada & Kome" at the very bottom edge and no further. The feed draws exactly
that and invents no card body.

## Things a reader would otherwise take for measurement

**Tracking is measured, not styled.** Every letter-spacing here is a width
solve, not a taste call. Four titles set 1.4 to 2.5 pt wide at `-.45`, which is
`-.15` a character across 11, 11, 13 and 18 characters, so the title tracks at
`-.6`. The body sizes come out at `-.25` the same way: the subtitle 7.6 pt over
31 characters, "Bryan" 1.3 over 5, the search placeholder 7.0 over 23.

**Text is placed by its ink.** Every vertical number off a capture is the top
of the ink — the cap line — because that is the only thing a pixel can show.
`ink_top()` converts a cap line to a CSS `top` from SF Pro Rounded's own
metrics (ascent 0.9556 em, descent 0.2444, cap 0.7143), so each number in
`CARD` stays the measured one and no offset is hand-tuned into place.

**One number in the card block is a fit; the rest are readings.** The block
model in `gen.py` is seven constants, all in pt from the card's own title cap
line, and six of them are pinned by something a pixel shows. The subtitle and
meta offsets are the cap lines themselves. `media_gap` is the three media tops
(16.9, 16.3, 17.3, taken to the tile *box*, a point outside the photo the probe
sees). `foot_gap` is the two footer glyph rows the captures hold, card 1's at
505.7 on cam0 and card 2's at 797.9 on camB, which want 18.2 and 21.1; it is
their mean, and the one place a mean is taken over two readings rather than a
fit over three. `pill_row` is the pill's own bbox, 326.5…350.1 on cam0 p1, and
`text_h` the meta line box.

Only `advance`, the footer cap line to the next card's title cap line, is
fitted, over the three title cap lines the captures give at 571.4, 864.1 and
1162.6 document pt, each reached by summing one more card block than the last.
It lands at 64.1, and the residuals against the capture are card 2 +1.4,
Rooftop −0.6, Friendsgiving −0.8, with the two footer rows at +1.4 and +0.3.
The source's own rhythm is not uniform either — its three footer-to-title gaps
read 63.6, 67.3 and 64.8 — so giving each card its own pair would land all
four exactly and would be eight numbers describing four gaps.

The meta row is taller where a card carries a location pill, 23.5 pt against a
16 pt text line, and that 7.5 is most of the 8.1 between the two media tops the
two card shapes produce. That is the whole reason the shapes place their media
at different offsets; one constant would have had to split the difference and
be wrong on both.

**A fit whose estimates will not converge is pointing at a wrong constant
somewhere else.** The three chain estimates for that advance spread 3.6 pt
apart at one point in the run, and no reweighting closed them. The cause was
the tile geometry below.

**The photo tiles carry a 1 pt rim, not the 3 they look like.** At camB's
3.6 px/pt the seam between two tiles peaks at `#F6E7EA` over 1.1 pt and the
outer left rim at `#EAEAEA` over 0.9, and neither ever resolves to white. What
reads as a thick white border is one point of rim plus the drop shadow of the
tile beside it, and `--e-tile-rim` is `#FDFCFC` because that is the brightest
2 % of the left rim on cam0's whole-screen frame.

The rim is also where a silent defect lived. `--e-tile-w` and `--e-tile-h` were
`--dark 200` bbox readings of the *photo*, applied to a box that then carried a
border, and `box-sizing:border-box` is set globally in `BASE`, so the border ate
into them: the photo rendered 113.5 tall against the capture's 117.6 and the
whole stack came up 3.4 pt short. Widening the box by the rim overshot the other
way, because a bbox of a rotated tile includes the rotation's own margin —
2.2° on a 92 × 120 tile is 2.3 pt per side. The tokens are now set by matching
my bbox to the capture's through the identical pipeline, 90.1 × 117.7 with a
1 px rim, and the stack probes land within 0.7 pt.

**Both glass bands are fitted materials.** Neither a blur radius nor a veil
ramp can be read off a single pixel, so both were solved against a flat
backdrop:

- *The header.* On a155 the feed happens to be scrolled so that card 1's pink
  add tile — a flat `#F9EAF4` — sits directly behind the whole header. Solving
  the mean of x 86…106 in 4 pt bands against that fill and the ground gives
  alpha `.89 .89 .89 .81 .79` at screen pt 40…72 and `.55 .41 .27 .22 .10` at
  96…128, with 76…92 unusable because the search placeholder crosses it. The
  header therefore never closes: it holds .89 past the search row and ramps to
  nothing by about 148. A first pass painted solid ground to 78 pt, which the
  a155 diff showed as grey where the capture is pink.
- *The bottom.* A p1 column scan at x = 560 px on empty ground reads a flat
  `#EAE8E9` down to pt 842.6, then 843 → `#EDEAEB`, 887 → `#EFEDEE`, 912 →
  `#F3F0F1`, 947 → `#F6F4F5`, 951 → `#FDFDFD`: white over ground rising from 0
  to about .85 across the last 116 pt. The blur behind it is a separate,
  taller element, because Life Lately's footer at 796.8 is crisp while
  Rooftop's title at 863.5 is soft.

Both are drawn as a masked `backdrop-filter` plus an unmasked veil, two
elements rather than one, because a single element's mask would multiply the
veil's own alpha and fade it twice.

The bottom blur radius is read off b360, not p1. At cam0's 1.4 px/pt everything down
there looks smeared, and a first pass fitted to that at `blur(10px)` left
"Friendsgiving" illegible at screen 905 where the capture still reads it.

**The frame is not this repo's usual one.** Every other folder draws a
393 × 852 phone inside the default 478 × 980 artboard. A 440 × 956 screen does
not fit, so every board declares 532 × 1004 in `layout.json` and the phone sits
at the same 46 / 24 inset.

## Rebuilding the captures

`assets/refs/` is gitignored, as third-party captures are everywhere in this
repo, so a fresh checkout cannot run `scratch/check.sh` until the frames are
back. What it needs, from the recording:

| file | camera | size | screen window |
|---|---|---|---|
| `p1.png` | cam0 | 636 × 1379 | pt 0…954 |
| `a067`, `a155`, `a176`, `a192`, `a214` `.png` | camA | 1664 × 1552 | pt 0…410 |
| `b310.png`, `b360.png` | camB | 1589 × 1576 | pt 519.6…956 |

The four boards are checked against `p1`, `b360`, `a155` and `b310`; the other
camA frames are the second opinions the token evidence cites.
