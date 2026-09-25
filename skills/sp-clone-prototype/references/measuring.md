# Measuring a reference: colour, metrics, type

The techniques behind Phase 1. Read this once the grid is on the image and
you are ready to turn regions into numbers.

Every command takes `--pt <scale>`; see the note in the first table.

### Four kinds of colour region, four techniques

**Pass `--pt <scale>` to every region command.** Then the design pt you read
off the grid is the pt you type and the pt that ends up in the CSS, and the
answers come back in pt too. No mental arithmetic between the capture and
the stylesheet, which is where transcription errors get in.

| What | Technique | Command |
|---|---|---|
| Large flat fill (page bg, card, sheet) | flat-neighbour census; a pixel equal to all four neighbours is a real fill, not an antialiased edge | `refkit sample IMG x0 y0 x1 y1 --pt 3` → read **flat fills** |
| Small element (badge, dot, chip, glyph) | mode of the core; no flat interior exists at this size | same command on a core-only crop → read **all pixels**, take the top entry |
| Text ink | mean of the darkest few percent; the mode of any text region returns its *background* | same command → read **ink core** |
| 1pt hairline, divider, card border | coverage solve; a 1pt rule never reaches its true colour in a downscaled capture | `refkit hairline IMG x0 y0 x1 y1 --bg FFFFFF --scale 0.7634` |
| Gradient, wash, glow | stop list along one axis; a wash has no flat interior to census and no single value to hold | `refkit scan IMG col 110 545 852 --pt 3` → read the runs as CSS stops |

The coverage solve sums the ink deficit across the band and divides by the
capture scale, recovering the full-coverage colour a naive pick reports far
too light. **Use the scale of the image you are sampling.** A 3× crop of a
0.7634 strip is `0.7634 × 3 = 2.29`.

**A gradient is not a colour, and two flat tokens will not fake it.** Walk
one column through it with `scan`, take the runs as stops, and write them
into the generator as a `linear-gradient` with explicit px positions. A
second axis is a second scan, layered as a masked overlay rather than folded
into the first. Claude's voice screens are a vertical ramp down x = 110 plus
a horizontal white veil masked in over 100px; sampled as two flat tokens,
those screens sat 28-38 levels off across their lower half, and the ramp took
the best of them to 3.61 whole-frame. Keep the ramp's two endpoints as
tokens, because that is what an evidence row can hold, but the stops belong
in the builder.

A solve that lands within ~2 of the page background means the rule is
invisible at this resolution, which usually means the real UI has **no
divider there**, not that the divider is `#FAFAFA`. Check a native capture
before inventing one.

### Metrics come off the same grid

Read gutters, row heights, insets, corner radii and type sizes off the red
labels. Three commands turn "about 64" into a number you can defend:

```bash
refkit bands IMG 30 120 60 780 --pt 3 --thr 170   # ink bands + the pitch between them
refkit bbox  IMG 16 690 380 810 --pt 3            # an element's exact box
refkit bbox  IMG 16 690 380 810 --pt 3 --grow     # ...grown to the ink it touches
refkit scan  IMG col 196 380 410 --pt 3           # colour runs -> the exact edge
```

**Use `--grow` for anything you are going to crop.** Plain `bbox` thresholds
luminance, so it stops at the first low-contrast edge and reports a confident
number for the rest: pale skin on white is under any threshold that does not
also take the page. `--grow` asks the other question, how far does the thing
I am pointing at go, by labelling the ink in a padded window and keeping only
the components the box already sits on. It prints the ground it inferred and
which window sides the answer ran into; a side listed there means the
component escaped `--pad` and probably merged with a neighbour, so widen the
seed or shrink the padding rather than believing it.

`bands` prints a pitch column: a list whose rows land on 62.7 / 62.3 / 64.0 /
61.7 / 64.7 is a **64pt row**, and the spread is glyph height, not layout.
`scan` collapses a row or column into colour runs, so a sheet edge reads as
`#B3B3B3 .. 396.0` then `#F5F5F5 from 397.0`, to the pixel, in one line.

Expect a small vocabulary of repeated numbers (16/20/26 gutters, 44 tap
targets, 8/10/12/14 radii). If every measurement is unique, you are reading
antialiasing, not layout.

### Measure the type face too

`--n-font` is the one token people guess. Do not. The whole board inherits it.

```bash
refkit bands IMG 40 410 420 470 --axis cols --minfrac .01   # where the words break
refkit font  IMG 17.3 139 78.7 152 Libraries --pt 3 \
             --fonts ./brand-fonts                          # rank the candidates
```

Box exactly one word, the biggest on the screen, a title rather than a tab
label, and confirm on a second screen before it becomes a token. Read the
**verdict** line rather than the top row: a "no call" means the ranking
cannot separate the top faces, and promoting its winner invents a fact.

A no call has a bill and it arrives in Phase 3: the stand-in you pick almost
never sets to the same width as the face it replaces. Measure that ratio now,
with `refkit bbox` on one string in both, and put it in the evidence table.

[`typeface.md`](typeface.md) covers the three verdicts,
brand faces outside the candidate set, why a width matched in PIL is 6% wrong
on the board, and what a stand-in's width ratio predicts about Phase 4.

