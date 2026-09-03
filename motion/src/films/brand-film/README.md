# brand-film

Fourteen of the fifteen templates of the Delphi set, cut back into one
continuous piece.

1920x1080, 30 fps, 1147 frames (38.2 s).

    ./render.sh brand-film

`index.tsx` is a shot list and nothing else — no animation, no easing, no
colour, no copy. The only prop the cut overrides is `durationInFrames`, and
that single override is the composability claim the whole set was built to
make: a template that read its length from `useVideoConfig()` would time itself
against the film's 1147 frames while occupying 84 of them.

The joins are the film's, not the templates'. Every template opens settled
and settles again before its own last frame; where the source joins two shots
with a cross-dissolve, the cut overlaps them by that many frames and fades the
incoming shot in over the outgoing one's own tail, on the one curve the
fade-up already uses. No template knows it is being dissolved, and where the
source cuts, so does this. Seven of the thirteen joins dissolve; the numbers
and the fits are under *The joins* below.

## The cut

Source order, by the first frame of each template's reference range. The
lengths are the cut's own: most of these shots are *shorter* in the reference
than the template that replicates them needs to play its head and tail —
`word-swap` is 15 frames there and needs about 31 — so a cut at the source's
lengths would truncate half the set.

| from | shot               | frames | in over | reference   |                                      |
|-----:|--------------------|-------:|--------:|-------------|--------------------------------------|
|    0 | `word-cascade`     |     90 |         | f14-f38     | "You've got knowledge"               |
|   90 | `card-stack`       |     95 |         | f38-f80     | "people want"                        |
|  170 | `word-swap`        |     66 |      15 | f213-f228   | "Your notes?" -> "Your answers?"     |
|  236 | `bokeh-orbit`      |     80 |         | f268-f306   | "Chaos"                              |
|  306 | `text-marker`      |     78 |      10 | f1056-f1072 |                                      |
|  384 | `pill-expand`      |     84 |         | f1088-f1150 | 8 frames of paragraph, then the card |
|  468 | `count-up`         |     92 |         | f1172-f1280 | 74% -> 100%                          |
|  550 | `orb-bloom`        |     84 |      10 | f1283-f1340 | "piece by piece"                     |
|  626 | `particle-form`    |    100 |       8 | f1352-f1400 |                                      |
|  726 | `focus-pull`       |     72 |         | f1372-f1400 | "Your digital mind / is born"        |
|  788 | `depth-flythrough` |    105 |      10 | f1476-f1595 |                                      |
|  884 | `lens-reveal`      |     84 |       9 | f1640-f1700 | "whatever you want"                  |
|  953 | `word-grid`        |     84 |      15 | f1875-f1920 | "everything"                         |
| 1037 | `logo-outro`       |    110 |         | f1930-f2052 |                                      |

"In over" is how many of the shot's first frames overlap the previous shot's
last — a cross-dissolve, the incoming shot fading in on top. The start column
is derived in `index.tsx`, not typed: a hand-kept `from` is one edit away from
a one-frame overlap or hole, and neither is visible in a still. `meta.json` is
checked against the same sum at module load.

## The joins

The cut used to butt every shot against the next, on the claim that a
template which settles before its own last frame needs nothing at the seam.
Measured, that claim was the film's biggest fault. `ffmpeg`'s scene detector
at 0.2 finds one hard cut in the source (f1172, 0.87) and two soft events; it
found ten in ours, four of them scoring 1.00. Mean |dL| from one frame to the
next across each seam, on a 320x180 decode, ranked — "after" is the largest
single step inside the dissolve:

| join                                | frame | before | after | in over |
|-------------------------------------|------:|-------:|------:|--------:|
| `bokeh-orbit` -> `text-marker`      |   306 |  209.3 |  51.6 |      10 |
| `depth-flythrough` -> `lens-reveal` |   884 |  165.3 |  49.3 |       9 |
| `focus-pull` -> `depth-flythrough`  |   788 |  138.3 |  33.7 |      10 |
| `pill-expand` -> `count-up`         |   468 |  106.2 | 106.2 |         |
| `lens-reveal` -> `word-grid`        |   953 |   80.7 |  14.8 |      15 |
| `count-up` -> `orb-bloom`           |   550 |   68.7 |  24.3 |      10 |
| `orb-bloom` -> `particle-form`      |   626 |   38.0 |  11.1 |       8 |
| `card-stack` -> `word-swap`         |   170 |   29.5 |  14.0 |      15 |
| `word-cascade` -> `card-stack`      |    90 |    8.4 |   8.4 |         |
| `word-swap` -> `bokeh-orbit`        |   236 |    7.2 |   7.2 |         |
| `particle-form` -> `focus-pull`     |   726 |    6.9 |   6.9 |         |
| `word-grid` -> `logo-outro`         |  1037 |    0.7 |   0.7 |         |
| `text-marker` -> `pill-expand`      |   384 |    0.0 |   0.0 |         |

For scale, the source's own dissolves peak at 44 per frame (f1467-f1477, dark
to bone) and 49 (f1586-f1595, bone to dark), and its one hard cut steps 103.
`pill-expand` -> `count-up` is that cut — f1172, luma 238 -> 136 against ours
240 -> 135 — and stays one. The five under 9 were already continuous: 8.4 is
about what one frame of `card-stack`'s push-in moves. The scene detector now
finds five events: the hard cut at 1.00, a pair at 0.26 / 0.20 at the
mid-point of the film's widest dissolve (`bokeh-orbit`'s 25 to
`text-marker`'s 235; the source's f1467 join has the same shape and peaks at
44 to our 52), and a pair at 0.24 / 0.22 that is not a join at all — see the
last item below.

**How the lengths were fitted.** Mean luma over a cross-fade of two stills is
linear in the fade's opacity, so the normalised luma across a source join *is*
its curve, and every (length, easing, start) was scored against it by rmse.
Four of the source's short dissolves — f667-f675, f822-f833, f1467-f1477,
f1586-f1595 — fit ease-in-out cubic best, at 8, 11, 10 and 9 frames, rmse
0.031 / 0.036 / 0.035 / 0.014; that is the curve `OpenFromBlack` already used,
so the film has one. Where the source joins two of these shots directly the
length is that join's (`depth-flythrough` in at f1467, out at f1586;
`orb-bloom` out at f1336; `count-up` out at f1274; `card-stack` out at f140;
`lens-reveal` out at f1776). Where it cuts to footage between them, the
nearest join of the same kind: `bokeh-orbit` -> `text-marker` has none in the
source, and takes f1467's 10.

**What the dissolves cover.** `card-stack`'s last 15 frames are its own
12-frame leave and 5 frames of the blurred field it leaves behind;
`lens-reveal`'s last 15 are a still; `count-up`'s last 10 hold the numeral;
`orb-bloom`'s last 8 hold the sphere; `depth-flythrough`'s last 9 are live
pills, and the source dissolves out of the same motion.

**Not fitted, and why:**

- *One curve for all seven.* `card-stack`'s fade-out fits ease-in-out quad
  over 14 (rmse 0.021) and the cubic over 15 at 0.048, worst gap 0.094; the
  footage-into-crimson join before `word-grid` (f1776-f1795) fits ease-out
  quad over 22 (0.035) and the cubic over 15 at 0.110, worst 0.19 — about 14
  luma at the worst frame. Both got the cubic. A per-join easing would be a
  second knob for two joins.
- *`count-up` -> `orb-bloom` fades where the source defocuses.* The source
  blurs the numeral out over f1274-f1283 (its mean luma rises 125 -> 150 as
  the blur spreads the type) and only then slides the sphere in, from f1283.
  Ours fades it over the same 10 frames, and `orb-bloom`'s slide runs under
  the last 10 frames of the numeral instead of after it. A `leaveFrames` on
  `count-up` is the faithful fix; it is a template change and was not made.
- *`depth-flythrough` -> `lens-reveal` lands three frames early.* The source
  has 45 frames of footage between its dissolve to dark (f1586-f1595) and
  `lens-reveal` (f1640); ours starts `lens-reveal`'s reveal (`at` 6) with the
  dissolve at 0.85 of the way. The template's `at` is its own and the film
  does not override it.
- *`word-cascade` -> `card-stack` stays a cut.* The source pushes `card-stack`
  in over `word-cascade`'s exit (f33-f40 under a shot starting f38); ours
  exits to the bare ground eight frames early and cuts, 8.4 at the seam.
- *The other scene-detector pair, f895-f896, is `lens-reveal`'s own reveal*,
  not a join: 20 / 44 / 66 luma per frame over f894-f896, where the source's
  reveal (f1678-f1689) steps 8-15 per frame for twelve frames. That is the
  template's `frames` 7 against a slower source, and it is left as found.
- *Two long holds are the source's.* `lens-reveal` holds 70 static frames
  after its reveal; the source holds a near-still (under 1 luma per frame)
  from f1695 to f1775, 80 frames. `particle-form` holds its figure for 84
  frames where the source's particles drift for 48 (f1352-f1400, 2-13 per
  frame) and then hold 30 on bare ground; the template holds by design (its
  README says why) and was left.

## Comparing it against the source

`motionkit compare` is the wrong instrument here — it expects a frame-aligned
pair, and this is 38.2 s against the source's 68.4 s in a different shot order.
The comparison that means anything is per shot, and it is two measurements.

**One settled frame from each side, side by side.** Which frame is in the table
below; extract both at the same tile width and look at them together.

**Ink extent, in fractions of the frame.** Scale is exactly what the
side-by-side does not tell you: both clips fill their own frame, and one is
2880 wide and the other 1920.

    python3 tools/motionkit.py extent 7481_0.mp4 32
    python3 tools/motionkit.py extent src/films/brand-film/out/brand-film.mp4 63

`extent` subtracts a wide Gaussian from the frame and boxes what survives, so
type and hard chrome register and gradients and bokeh do not. Measured at the
same `--width` (960 by default), the two fractions are the same measurement and
their ratio is how far off our scale is.

It is a blunt instrument, and knowing where it is blunt is most of what makes
its numbers usable:

- The Gaussian it subtracts is 24 px wide at 960, so a small box of type comes
  back larger than it is -- `bokeh-orbit`'s word measures 0.416 by extent and
  0.378 by a bbox of everything over luma 110, on the same frame.
- Film grain is high-frequency, so on the reference it reads as ink; our
  renders have none. That floors nothing but it does inflate the reference's
  box wherever the shot is otherwise empty.
- A smooth gradient has no ink in the middle and plenty at the frame's own
  edges, so a shot that is mostly ground measures the frame.
- Its 2nd/98th percentile trim, which is there so one stray bead does not set
  the box, clips the outer dots of anything sparse.

So five of the fourteen shots are not in the table at all, and the reason is
written next to each rather than a number that means nothing.

### What it said

| shot               | ref f | ours |  ref w x h  | ours w x h  |  w   |  h   |
|--------------------|------:|-----:|-------------|-------------|-----:|-----:|
| `word-cascade`     |    32 |   63 | 0.515 0.457 | 0.501 0.494 | 0.97 | 1.08 |
| `bokeh-orbit`      |   295 |  276 | 0.416 0.207 | 0.372 0.219 | 0.89 | 1.06 |
| `text-marker`      |  1068 |  361 | 0.627 0.322 | 0.626 0.328 | 1.00 | 1.02 |
| `count-up`         |  1250 |  532 | 0.899 0.554 | 0.934 0.552 | 1.04 | 1.00 |
| `orb-bloom`        |  1310 |  580 | 0.720 0.959 | 0.765 0.918 | 1.06 | 0.96 |
| `focus-pull`       |  1380 |  766 | 0.417 0.431 | 0.420 0.443 | 1.01 | 1.03 |
| `depth-flythrough` |  1540 |  839 | 0.757 0.483 | 0.766 0.494 | 1.01 | 1.02 |
| `word-grid`        |  1910 | 1012 | 0.840 0.850 | 0.850 0.881 | 1.01 | 1.04 |
| `logo-outro`       |  2030 | 1114 | 0.299 0.378 | 0.310 0.372 | 1.04 | 0.98 |

`bokeh-orbit` is banded to `0.25,0.34,0.75,0.58` (the word, not the ring, whose
beads run off the frame edge in both) and `focus-pull` to `0.50,0.15,1.00,0.90`
(the block, on a frame where it is still sharp).

The one row that is not 1.0 either way is the instrument, not the render:
`bokeh-orbit`'s 0.89 is the blur inflating a small box, and our word is 0.372
against the 0.378 the props were fitted to by the other method, which is 1.6%.

Not measured, and why:

- `mesh-gradient` and `particle-form`'s and `focus-pull`'s grounds have no ink
  in them at all -- extent boxes the frame's own edges and reports 1.0 by
  construction.
- `card-stack` is eight overlapping soft-edged cards on a soft ground; the
  percentile trim eats the outer two.
- `particle-form` is 133 sparse dots, which is the case the trim was written
  against.
- `lens-reveal` reveals live footage in the reference and a rendered stand-in
  here, so the two frames are not the same picture.
- `pill-expand` boxes the paragraph *behind* the card rather than the card. It
  read 0.92, and 0.89 once its pair was corrected: this template's offsets run
  from `at`, the frame the pill arrives, and the cut opens it on eight frames
  of bare ground, so film frame 456 is f1080 and not f1088. Neither number is
  about the card. On a frame with the paragraph and no card the two clips read
  0.646 and 0.627 W; the card itself, masked on `min(rgb) > 246`, is 409 px of
  960 in the reference against ours at 410, and tracks within 3 px at every
  sample of its twenty-five-frame open. What f1140 adds over the paragraph is
  0.02 W of blur residual each side -- extent subtracting a 24 px Gaussian
  from a backdrop already blurred 5.8 px, where the reference's carries grain
  and ours does not.
- `word-swap` is on a different word in each clip at any given frame, so a
  whole-line box measures the word list. Banding it to the orb only moved the
  problem -- the orb is a soft gradient with no ink edge, and the band read
  type in one clip and orb in the other, which is where an earlier pass's
  alarming 0.75 came from. Measured directly instead, by masking on warm
  saturated pixels: the reference's orb grows 0.042 / 0.092 / 0.110 / 0.127 /
  0.138 W at f222/225/228/233/238 and settles at 0.142 by f243; ours settles
  at 0.1375. Three percent.

### What it caught

Twelve of the fifteen had been authored too small -- between 1.3x and 2.4x --
and every one of them looked fine on its own. That is the finding worth keeping
from this exercise: a template scrubbed alone has no scale, because it fills
its own frame whatever size its contents are. Cutting the set together and
measuring the result is what made it visible. The corrected defaults are in
each template's `README.md` prop table, and every number in them came off a
frame named above.

Three more things only the cut could show, all of them in the shared ground:

- The band rested at the centre of the frame and was symmetric about it, so
  the right side of every shot stayed pink where the reference goes back to
  crimson; it carried GRADIENT[7] at 0.85 where the measurement says 1.0; and
  it ramped straight to a point, where the reference holds near full across a
  third of the frame. Scrubbed alone none of the three reads as wrong, because
  there is nothing in frame to be too pink against.
- `MESH` carried five drifting blobs fitted to f1300, a shot no template using
  that ground is on. Deleted.
- `DIM` spreads `MESH`, so when the band's shape changed its two width props
  changed meaning underneath it and its band silently doubled -- 150 luma
  across the left half of `particle-form` and `focus-pull` against the
  reference's 105. Re-fitted; see `templates/mesh-gradient/README.md`.

And three faults were in the comparison rather than in the film, which is worth
recording because each one first read as a template being wrong:

- The side-by-side holds the reference's last frame when our shot runs longer,
  so seven of the fifteen panels were being compared against a frozen tail or a
  frame from the next shot. Fixed by deriving each shot's start from the cut.
- `depth-flythrough` is the one shot that runs the reference's own length on
  the reference's own clock, and it was paired as if it did not: f1540 against
  our frame 74 instead of our frame 51. It read 0.70, then 1.25, and it is
  1.01.
- Three eyeball readings reversed under measurement -- `bokeh-orbit`'s ring
  "far too big" (11% narrow), `orb-bloom`'s bloom "far too bright" (they match
  at matched rest frames), `word-swap`'s type "26% bigger" (the two clips are
  on different words).

Three cut ranges in the table above were also wrong and are corrected:
`card-stack` f38-95 to f38-80, `depth-flythrough` from f1470 to f1476, and
`bokeh-orbit` f268-312 to f268-306.

## What is not reproduced

- **The live footage and product UI.** The reference cuts to both repeatedly.
  None of it is here, which is most of the missing 30 seconds — this is the
  film's animated spine, not the film.
- **The wordmark and the ad copy.** Templates carry this repo's own placeholder
  strings; `logo-outro` sets the mark to "Motion". See `src/lib/README.md`.
- **The display face.** The reference is almost certainly PP Editorial New,
  which is not redistributable. Instrument Serif stands in, and has no weight
  above 400 — the reference's "Chaos" and "You've got knowledge" are heavier
  than anything we can set. `src/lib/fonts.ts` carries the note.
- **The lens.** No grain, no chromatic aberration, no defocus on anything but
  the two templates that animate defocus. Our render is sharper than the source
  everywhere, and cleaning that up in post would be imitating a camera rather
  than replicating a motion.
