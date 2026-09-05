# Comparing a render against its capture

The depth behind Phase 4 of `clone-prototype`, for once the side-by-side is
rendering and the obvious defects are gone. Subtracting the images to find
what a side-by-side hides, fitting the values no pixel holds, knowing when to
stop, and parallelising the looking without parallelising the editing.

## Subtract, do not squint

A side-by-side answers "is this the right colour". It is bad at "is this the
right colour in the wrong place", which is most of what is actually wrong.
Blend the two instead, the way a difference layer works: your render into
red, the reference into green and blue. Agreement goes grey, reference-only
ink goes red, yours goes cyan.

```bash
refkit blend mine/10-home.png refs/h2.png \
    --pt 3 --y0 760 --y1 852 --zoom 2 -o tab.png
```

Every element then reads at a glance:

- a red edge above a cyan edge is one element a point too low;
- a red halo all the way round is a glyph rendering small;
- an all-red word is a word you did not draw.

Six cover crops in the luma home run sat a couple of points off their boxes
and had each passed a side-by-side; the blend showed all six in one look.

### The offset probe

`blend` also shifts the reference against your render a capture pixel at a
time and prints the mean Δ per offset. A clean V centred on zero means the
band is placed right and whatever Δ is left is colour. A V centred on -1.0
means a one-point layout drift and no colour problem at all, so chasing it
through the tokens would have wasted the pass. That probe found a 17.6pt gap
that should have been 16.6, on all three of a screen's row breaks at once.

## Some values cannot be read off a pixel

A translucent bar over blurred content has no pixel that holds its fill or
its blur radius: every pixel is a mix of both, plus whatever is behind.
Sampling harder will not help. Fit instead. Put candidate values through the
generator, render, score the band against the capture, and walk a grid.

```bash
for blur in 12 20 28 40 56; do for alpha in .35 .50 .65; do
    sed -i '' "s/--x-hdr-blur:blur([0-9]*px)/--x-hdr-blur:blur(${blur}px)/" gen.py
    python3 gen.py && refkit shoot ... && score_the_band
done; done
```

Coarse grid, one refinement pass around the minimum, then stop. Luma's tab
bar went from `blur(24px)` at `.78` to `blur(40px)` at `.48` this way, 45.5
to 35.0 summed over three screens, with one clean minimum in each axis.
Record it: "swept, minimum at 40px/.48, and 24px/.78 costs 10 levels" is
evidence. "Looks about right" is not.

### A sweep that refuses to settle is telling you something

The same fit tells you when two things you assumed were one token are two.
Luma's tab bar and sticky header share a blur but not a fill: over the plain
page the header leaves the ground untouched while the bar takes it three
levels down. No single fill satisfies both, and the sweep says so.

## Normalise before you believe a gap

A mean Δ over an asset's box is not comparable between assets of different
ink density. A big sparse illustration is mostly empty pixels that agree
perfectly, so its mean is flattered; a 40px icon is nearly all ink, so its
mean is the ink's error with nothing to dilute it. Comparing the two
straight, as if the number meant the same thing on both, is how a scoring
artifact gets promoted to a finding.

Divide by the ink fraction and look again. In the run that generated one set
of characters and one set of icons, the whole-box means were 3.96 and 10.5,
and the obvious conclusion was that icons redraw badly. Ink-normalised they
were 5.55 and 17.41. The gap was real, and it was *wider* than the raw
numbers said. Either way the check is two lines and it decides whether the
next hour goes into a fix or into nothing.

The same rule applies to whole screens: a screen that is 70% flat page
ground and a screen that is dense type do not have comparable whole-frame
deltas, which is why the per-screen table in a folder README needs the
sentence explaining its own spread.

## Call it

Refinement has a floor, and you reach it long before the deltas reach zero.
Stop when any of these is true:

- the worst remaining bands are ones you cannot fix: the Dynamic Island the
  capture does not show, a watermark strip, a photograph you re-encoded;
- a full sweep of a parameter moves the number by less than a level;
- the blend is grey everywhere except sub-pixel fringing on glyph edges.

What counts as inside depends on the source, and on one substitution:

| Source | Expected mean absolute delta |
|---|---|
| Figma export, real type styles | 0.2-1.9 |
| Screen capture, faces you could name | 3-7 |
| Screen capture, a brand face you had to stand in for | 3-7 on chrome, 10-25 on the screens carrying prose |

A screen at 23 is not automatically broken. Before treating a number as a
defect, ask **where** the delta sits: `--regions` on a body-text screen that
scores 17 overall and 3 on its chrome is a face-width result, and no amount
of geometry work will move it. `claude-ios` reads 3.4-7.1 on its nine
chrome-led screens and 10.0-23.2 on the six carrying serif prose, from one
substitution, with the whole set structurally clean. Tuning positions to
chase that second column moves correct elements off their measured
coordinates.

Any screen inside its row of that table, with no structural defect left in
the blend, is a finished run. Write the numbers into the folder's README,
state the substitution beside them, and stop. Another pass costs a session
and buys a level.

## Fan out the looking, not the editing

Verification is per-screen, read-only and embarrassingly parallel; the
expensive resource is *attention on images*. Once the boards render, dispatch
one subagent per screen, up to about 8-10 before fan-in costs more than the
parallel looking saves. Each reviewer gets absolute paths to `mine/NN.png`,
its reference, `probes.json` and the regions file, tools Bash and Read only,
and returns `{"screen", "defects": [{"id", "severity", "claim", "probe",
"box_sanity", "mine", "ref"}], "clean": [...]}`. **A defect without a probe
is a rumour**: re-run every claimed probe yourself and discard what does not
reproduce, and reject any probe box missing its sanity line. Reviewers
report deltas, never token values and never fixes. The rumour rule pays:
"text leaks past the fade at y798" survived several turns until `refkit ink`
showed the reference holds the same 8.3 levels of ink there; the real
difference was the tail, 6.3 vs 1.0 at y800+. Ten screens verify in the
time of one.

**Only the looking parallelises.** You stay the single writer. Collect every
defect list, then make the fixes yourself in the one generator. Never let
subagents edit. Two agents in `gen.py` will clobber each other, and the
next regeneration silently reverts whatever an agent "fixed" in an artboard
directly.

Do **not** fan out Phase 1 or Phase 2. Token decisions need one eye and one
vocabulary; five agents sampling five screens independently return five
slightly different greys and a `--x-fill-4` that is two levels off
`--x-fill-3`.

