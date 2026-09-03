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
|  162 | `card-stack`       |     95 | f38-f95     | "people want"                          |
|  257 | `word-swap`        |     66 | f213-f228   | "Your notes?" -> "Your answers?"       |
|  323 | `bokeh-orbit`      |     80 | f268-f312   | "Chaos"                                |
|  403 | `text-marker`      |     78 | f1056-f1072 |                                        |
|  481 | `pill-expand`      |     84 | f1088-f1150 | same paragraph, now behind a card      |
|  565 | `count-up`         |     92 | f1172-f1280 | 74% -> 100%                            |
|  657 | `orb-bloom`        |     84 | f1283-f1340 | "piece by piece"                       |
|  741 | `particle-form`    |    100 | f1352-f1400 |                                        |
|  841 | `focus-pull`       |     72 | f1372-f1400 | "Your digital mind / is born"          |
|  913 | `depth-flythrough` |    105 | f1470-f1595 |                                        |
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

### What it said

| shot               | ref f | ours |  ref w x h  | ours w x h  |  w   |  h   |
|--------------------|------:|-----:|-------------|-------------|-----:|-----:|
| `mesh-gradient`    |  1220 |   50 | no ink      | no ink      |    — |    — |
| `word-cascade`     |    32 |  135 | 0.515 0.457 | 0.505 0.493 | 0.98 | 1.08 |
| `card-stack`       |    72 |  228 | 0.823 0.872 | 0.811 0.837 | 0.99 | 0.96 |
| `word-swap`        |   225 |  303 | 0.432 0.178 | 0.409 0.231 | 0.95 | 1.30 |
| `bokeh-orbit`      |   295 |  379 | 0.408 0.270 | 0.366 0.276 | 0.90 | 1.02 |
| `text-marker`      |  1068 |  458 | 0.627 0.322 | 0.625 0.337 | 1.00 | 1.05 |
| `pill-expand`      |  1130 |  540 | 0.697 0.376 | 0.630 0.298 | 0.90 | 0.79 |
| `count-up`         |  1250 |  629 | 0.899 0.554 | 0.876 0.504 | 0.97 | 0.91 |
| `orb-bloom`        |  1310 |  716 | 0.720 0.959 | 0.619 0.069 | 0.86 |    * |
| `particle-form`    |  1390 |  811 | 0.911 0.593 | 0.188 0.552 |    * | 0.93 |
| `focus-pull`       |  1395 |  891 | 0.978 0.711 | 0.701 0.702 |    * | 0.99 |
| `depth-flythrough` |  1540 |  987 | 0.757 0.483 | 0.528 0.435 | 0.70 | 0.90 |
| `lens-reveal`      |  1685 | 1077 | 0.773 0.893 | 0.950 0.965 |    * |    * |
| `word-grid`        |  1910 | 1161 | 0.840 0.850 | 0.802 0.741 | 0.95 | 0.87 |
| `logo-outro`       |  2030 | 1263 | 0.299 0.378 | 0.267 0.472 | 0.89 | 1.25 |

`bokeh-orbit` is measured inside `--band 0.15,0.35,0.85,0.65`. Whole-frame it
reads 1.06, because the bead ring reaches the same corners in both; the type
inside the ring was 2.4x too small and the band is the only way to see that.

`mesh-gradient` has no ink on either side, which is the right answer for a
shot that is nothing but low frequency. It is not a failed measurement.

`*` marks a pair where the reference frame carries content our shot does not,
so the ratio is not a scale error: the reference plays `particle-form` and
`focus-pull` *simultaneously* and we play them in sequence; `lens-reveal`
reveals live footage; `orb-bloom`'s reference frame has a tall column beside
the chip row.

### What it caught

Twelve of the fifteen had been authored too small — between 1.3x and 2.4x —
and every one of them looked fine on its own. That is the finding worth keeping
from this exercise: a template scrubbed alone has no scale, because it fills
its own frame whatever size its contents are. Cutting the set together and
measuring the result is what made it visible. The corrected defaults are in
each template's `README.md` prop table, and every number in them came off a
frame named above.

`depth-flythrough`'s 0.70 is the one deliberate remainder: it was rewritten
from measurement in an earlier pass and its cards read at the reference's
apparent depth, which is the thing that shot is about; matching its ink box
would mean pulling the row closer than the perspective says it is.

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
