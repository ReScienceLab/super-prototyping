# Glyphs: from a trace to artwork

Loaded from Phase 3 of `clone-prototype`, after the glyphs are traced. Read it
when a board draws a traced glyph large enough to look at: a tab bar, a search
field, a toolbar, a 24 pt icon on a 402 pt frame.

## Why a trace is not the finish

Tracing a glyph off a capture gives you the right shape and the wrong object:
one `<path>` of hundreds of implicit linetos, no curves anywhere. The "circle"
in a magnifier is a 200-gon, and every edge carries the capture's antialiasing
as a wobble a few hundredths of a point deep. It measures well — that is the
problem. `refkit diff` scores it at 0 while the edge is visibly ragged in the
canvas at 2× zoom, because a mean delta cannot see faceting that stays inside
one pixel.

A vector is a function fitted to a shape. A trace fits it with several hundred
degrees of freedom, and a designer fits it with a dozen. Redraw the ones that
show, and leave the rest: a 9 pt keyboard glyph is three pixels of edge and
nobody will ever see its facets.

## Which of the two jobs this is

Look at the glyph before fitting anything. Most interface glyphs are **a
composition of primitives** — that is how they were drawn in the first place —
and a few are **a shape**, with no construction to recover.

| The glyph is… | Do this |
|---|---|
| a circle, a bar, a stadium, a rounded rectangle, a chevron, or those added and subtracted | build it from primitives and fit the dimensions |
| an outline nothing simpler explains: a rocket, a mascot, a leaf | `refkit refit` |

`apple-app-store` is six and one. The magnifier is a stroked circle plus a
round-capped bar. The mic is a stadium over a U-shaped cradle over a stem and
a foot. The Apps and Arcade sheets are one rounded square under
`rotate(45) scale(1 k)` — which is *why* their corners are elliptical and no
`rx` will match them. Only the rocket had to be fitted as a curve.

## Building the glyph as a construction

Write the drawing with its dimensions as parameters, then let a fit find the
numbers. Reading them off the capture by hand converges slowly and stops at
whatever you can measure; a numeric fit sees the whole glyph at once.

```python
def d_magnifier(p):
    cx, cy, r, w, x0, y0, x1, y1 = p
    return ('<circle cx="%s" cy="%s" r="%s" %s/>' % (cx, cy, r, STROKE % w)
            + '<path d="M%s %sl%s %s" %s/>' % (x0, y0, x1, y1, STROKE % w))
```

The loop that fits it: rasterise the candidate and the trace at 16×, take ink
coverage as `1 - grey/255`, and minimise the mean absolute difference with
Nelder-Mead (`scipy.optimize.minimize`, `xatol=0.004`). It converges from a
rough eyeballed start in a few seconds per glyph, and the number it lands on —
mean disagreeing ink — is the thing to report and to watch when you change the
construction.

Keep the fitted parameters in the script, as the starting values for the next
run. They are the record of what the glyph *is*, they make the run reproducible,
and a re-run from them is a no-op rather than a drift.

Three things that pay for themselves:

- **Read the glyph before guessing at it.** Print where the ink starts and
  stops along each row and column at 16×, in the glyph's own units. It settles
  questions no overlay answers: the Arcade joystick's shaft turned out to be a
  white slot cut out of the platform, with a clear gap above it, not a black
  shaft running into it.
- **Overlay, do not just score.** Write an RGB image with the trace in one
  channel and the redraw in another: agreement goes blue, trace-only cyan,
  redraw-only magenta. Every real correction here came from looking at one —
  the mic's cradle needed vertical sides above its arc, the stacked sheets are
  bands of constant *vertical* depth rather than constant-width strokes.
- **Stop at sub-pixel.** These landed at 0.6% to 2.5% of the ink disagreeing,
  and the residual is the trace's own ragged edge. Chasing the last 0.3 pt at a
  chevron vertex buys nothing at 24 px.

## Fitting the outline: `refkit refit`

For the glyph with no construction, fit the contour itself:

```bash
refkit refit assets/icons/tab-games.svg            # report only
refkit refit --sigma 0.35 --tol 0.13 --corner 50 --span 1.0 --write \
    assets/icons/tab-games.svg
```

It resamples the contour, smooths the tracing jitter out of it, finds the
corners by turning angle, and fits each corner-to-corner run with the simplest
thing that holds: a line, then a circular arc, then a cubic Bézier, splitting
a run no single cubic covers. It keeps the file's head line, so the `viewBox`
is byte-identical.

Sweep the smoothing rather than accepting the default. The knee is where the
anchor count stops falling and the shape starts to go: on the App Store rocket
`--sigma 0.35 --tol 0.13 --corner 50 --span 1.0` gave 2382 bytes and no curves
in, 1072 bytes and 40 anchors out, with 0.9% of the ink moving. Looser rounded
off the fin tips.

`refit` has no record of its input beyond its output, so run it on a glyph
once. Re-running it on its own output fits the redraw and drifts.

## Two rules that hold either way

**The `viewBox` is placement, so it must not change.** A traced glyph's box is
its ink box in the capture's page points, and the generator places the file by
that box. Redraw inside it — a `<g transform="translate(x0 y0)">` and local
coordinates is the readable way — and never re-tighten it around the new ink.

**A 45° bar traces about √2 too thick.** The App Store magnifier's handle
traced at 2.34 against a 1.62 ring, at 45.6° and a perpendicular offset of
0.00: the tracer is measuring the diagonal's stair-stepping, not a heavier
stroke. So a construction gives the ring and the handle one weight, and the
fit confirms it. Any measurement taken off a diagonal edge is suspect the same
way.

## Where the redraw lives

The construction script is the canvas folder's, not the toolkit's: one glyph's
construction is not another's, and the fitted parameters are evidence about
this app. Keep it beside `gen.py` in a `redraw/` folder with its own README --
the numbers it found, what each glyph turned out to be, and the settings
`refit` was run at -- and name in the folder README's assets section which
glyphs are traced and which are drawn. It needs `scipy` for the optimiser,
which the toolkit does not ship.

`apple-app-store` is the worked case in this repo: seven glyphs, 18280 bytes of
point soup down to 4936, ink boxes byte-identical.
