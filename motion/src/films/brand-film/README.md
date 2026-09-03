# brand-film

The fifteen templates of the Delphi set, cut back into one continuous piece.

1920x1080, 30 fps, 1296 frames (43.2 s).

    ./render.sh brand-film

`index.tsx` is a shot list and nothing else — no animation, no easing, no
colour, no copy. The only prop the cut overrides is `durationInFrames`, and
that single override is the composability claim the whole set was built to
make: a template that read its length from `useVideoConfig()` would time itself
against the film's 1296 frames while occupying 84 of them.

Nothing dissolves. Every template opens settled and settles again well before
its own last frame, so the shots butt straight together. A cross-fade anywhere
in here would be covering for a template that does not end.

## The cut

Source order, by the first frame of each template's reference range. The
lengths are the cut's own: most of these shots are *shorter* in the reference
than the template that replicates them needs to play its head and tail —
`word-swap` is 15 frames there and needs about 31 — so a cut at the source's
lengths would truncate half the set.

| from | shot               | frames | reference   |                                        |
|-----:|--------------------|-------:|-------------|----------------------------------------|
|    0 | `mesh-gradient`    |     72 | —           | the ground, before anything is on it   |
|   72 | `word-cascade`     |     90 | f14-f38     | "You've got knowledge"                 |
|  162 | `card-stack`       |     95 | f38-f80     | "people want"                          |
|  257 | `word-swap`        |     66 | f213-f228   | "Your notes?" -> "Your answers?"       |
|  323 | `bokeh-orbit`      |     80 | f268-f306   | "Chaos"                                |
|  403 | `text-marker`      |     78 | f1056-f1072 |                                        |
|  481 | `pill-expand`      |     84 | f1088-f1150 | same paragraph, now behind a card      |
|  565 | `count-up`         |     92 | f1172-f1280 | 74% -> 100%                            |
|  657 | `orb-bloom`        |     84 | f1283-f1340 | "piece by piece"                       |
|  741 | `particle-form`    |    100 | f1352-f1400 |                                        |
|  841 | `focus-pull`       |     72 | f1372-f1400 | "Your digital mind / is born"          |
|  913 | `depth-flythrough` |    105 | f1476-f1595 |                                        |
| 1018 | `lens-reveal`      |     84 | f1640-f1700 | "whatever you want"                    |
| 1102 | `word-grid`        |     84 | f1875-f1920 | "everything"                           |
| 1186 | `logo-outro`       |    110 | f1930-f2052 |                                        |

The start column is derived in `index.tsx`, not typed: a hand-kept `from` is
one edit away from a one-frame overlap or hole, and neither is visible in a
still. `meta.json` is checked against the same sum at module load.

## Comparing it against the source

`motionkit compare` is the wrong instrument here — it expects a frame-aligned
pair, and this is 43.2 s against the source's 68.4 s in a different shot order.
The comparison that means anything is per shot, and it is two measurements.

**One settled frame from each side, side by side.** Which frame is in the table
below; extract both at the same tile width and look at them together.

**Ink extent, in fractions of the frame.** Scale is exactly what the
side-by-side does not tell you: both clips fill their own frame, and one is
2880 wide and the other 1920.

    python3 tools/motionkit.py extent 7481_0.mp4 32
    python3 tools/motionkit.py extent src/films/brand-film/out/brand-film.mp4 135

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

So five of the fifteen shots are not in the table at all, and the reason is
written next to each rather than a number that means nothing.

### What it said

| shot               | ref f | ours |  ref w x h  | ours w x h  |  w   |  h   |
|--------------------|------:|-----:|-------------|-------------|-----:|-----:|
| `word-cascade`     |    32 |  135 | 0.515 0.457 | 0.501 0.494 | 0.97 | 1.08 |
| `bokeh-orbit`      |   295 |  363 | 0.416 0.207 | 0.372 0.219 | 0.89 | 1.06 |
| `text-marker`      |  1068 |  458 | 0.627 0.322 | 0.627 0.328 | 1.00 | 1.02 |
| `pill-expand`      |  1140 |  533 | 0.684 0.387 | 0.631 0.393 | 0.92 | 1.02 |
| `count-up`         |  1250 |  629 | 0.899 0.554 | 0.934 0.552 | 1.04 | 1.00 |
| `orb-bloom`        |  1310 |  687 | 0.720 0.959 | 0.765 0.915 | 1.06 | 0.95 |
| `focus-pull`       |  1380 |  881 | 0.417 0.431 | 0.420 0.443 | 1.01 | 1.03 |
| `depth-flythrough` |  1540 |  964 | 0.757 0.483 | 0.766 0.494 | 1.01 | 1.02 |
| `word-grid`        |  1910 | 1161 | 0.840 0.850 | 0.850 0.881 | 1.01 | 1.04 |
| `logo-outro`       |  2030 | 1263 | 0.299 0.378 | 0.310 0.372 | 1.04 | 0.98 |

`bokeh-orbit` is banded to `0.25,0.34,0.75,0.58` (the word, not the ring, whose
beads run off the frame edge in both) and `focus-pull` to `0.50,0.15,1.00,0.90`
(the block, on a frame where it is still sharp).

The two rows that are not 1.0 either way are both the instrument, not the
render. `bokeh-orbit`'s 0.89 is the blur inflating a small box: our word is
0.372 against the 0.378 the props were fitted to by the other method, which is
1.6%. `pill-expand`'s 0.92 is the paragraph left of the card, which is inside
the reference's box and outside ours by a few pixels of drift; the card itself
is 821 px wide in both, measured directly.

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
  None of it is here, which is most of the missing 25 seconds — this is the
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
