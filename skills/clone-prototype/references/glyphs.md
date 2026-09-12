# Glyphs: from a trace to artwork

Phase 3 of `clone-prototype` loads this file once you have traced the glyphs.
Read it when a board draws a traced glyph large enough to look at: a tab bar, a
search field, a toolbar, a 24 pt icon on a 402 pt frame.

## Why a trace is not the finish

Tracing a glyph off a capture gives you the right shape and the wrong object:
one `<path>` of hundreds of implicit linetos, no curves anywhere. The "circle"
in a magnifier is a 200-gon, and every edge carries the capture's antialiasing
as a wobble a few hundredths of a point deep. It measures well, and that is the
problem. `refkit diff` scores it at 0 while the edge looks ragged in the canvas
at 2× zoom, because a mean delta cannot see faceting that stays inside one
pixel.

A vector is a function fitted to a shape. A trace fits it with several hundred
degrees of freedom, and a designer fits it with a dozen. Redraw the glyphs that
show, and leave the rest: a 9 pt keyboard glyph is three pixels of edge, and
nobody will see its facets.

## Which of the two jobs this is

Look at the glyph before fitting anything. Most interface glyphs are a
composition of primitives, because that is how they were drawn in the first
place, and a few are a shape with no construction to recover.

| The glyph is… | Do this |
|---|---|
| a circle, a bar, a stadium, a rounded rectangle, a chevron, or those added and subtracted | build it from primitives and fit the dimensions |
| an outline nothing simpler explains: a rocket, a mascot, a leaf | `refkit refit` |

`apple-app-store` has six of the first kind and one of the second. The
magnifier is a stroked circle plus a round-capped bar. The mic is a stadium
over a U-shaped cradle over a stem and a foot. The Apps and Arcade sheets are
one rounded square under `rotate(45) scale(1 k)`, which is why their corners
are elliptical and why no `rx` will match them. Only the rocket needed a curve
fit.

## Building the glyph as a construction

Write the drawing with its dimensions as parameters, then let a fit find the
numbers. Reading them off the capture by hand converges slowly and stops at
whatever you can measure; a numeric fit compares every pixel of the glyph at
once.

```python
def d_magnifier(p):
    cx, cy, r, w, x0, y0, x1, y1 = p
    return ('<circle cx="%s" cy="%s" r="%s" %s/>' % (cx, cy, r, STROKE % w)
            + '<path d="M%s %sl%s %s" %s/>' % (x0, y0, x1, y1, STROKE % w))
```

The loop that fits it rasterises the candidate and the trace at 16×, takes ink
coverage as `1 - grey/255`, and minimises the mean absolute difference with
Nelder-Mead (`scipy.optimize.minimize`, `xatol=0.004`). It converges from a
rough eyeballed start in a few seconds per glyph. The number it lands on, the
mean disagreeing ink, is the one to report and to watch when you change the
construction.

Keep the fitted parameters in the script, as the starting values for the next
run. They are the record of what the glyph is, they make the run reproducible,
and a re-run from them is a no-op rather than a drift.

Three habits that save more time than they cost:

- **Read the glyph before guessing at it.** Print where the ink starts and
  stops along each row and column at 16×, in the glyph's own units. It settles
  questions no overlay answers: the Arcade joystick's shaft turned out to be a
  white slot cut out of the platform, with a clear gap above it, not a black
  shaft running into it.
- **Overlay, do not just score.** Write an RGB image with the trace in one
  channel and the redraw in another, so that agreeing ink renders blue,
  trace-only ink cyan, and redraw-only ink magenta. Every real correction here
  came from looking at one: the mic's cradle needed vertical sides above its
  arc, and the stacked sheets are bands of constant vertical depth rather than
  constant-width strokes.
- **Stop at sub-pixel.** These glyphs landed at 0.6% to 2.5% of the ink
  disagreeing, and the residual is the trace's own ragged edge. Chasing the
  last 0.3 pt at a chevron vertex changes nothing at 24 px.

## Fitting the outline: `refkit refit`

For the glyph with no construction, fit the contour itself:

```bash
refkit refit assets/icons/tab-games.svg            # report only
refkit refit --sigma 0.35 --tol 0.13 --corner 50 --span 1.0 --write \
    assets/icons/tab-games.svg
```

It resamples the contour, smooths the tracing jitter out of it, finds the
corners by turning angle, and fits each corner-to-corner run with the simplest
segment that fits within tolerance: a line, then a circular arc, then a cubic
Bézier, splitting a run no single cubic covers. It keeps the file's head line,
so the `viewBox` is byte-identical.

Sweep the smoothing rather than accepting the default. The setting to keep is
the knee, where the anchor count stops falling and the shape starts to deform.
On the App Store rocket, `--sigma 0.35 --tol 0.13 --corner 50 --span 1.0`
turned 2382 bytes with no curves into 1072 bytes and 40 anchors, with 0.9% of
the ink moving. More smoothing rounded off the fin tips.

`refit` has no record of its input beyond its output, so run it on a glyph
once. Re-running it on its own output fits the redraw and drifts.

## Two rules for both jobs

**The `viewBox` is placement, so it must not change.** A traced glyph's box is
its ink box in the capture's page points, and the generator places the file by
that box. Redraw inside it, and never re-tighten it around the new ink. A
`<g transform="translate(x0 y0)">` with local coordinates is the readable way.

**A 45° bar traces about √2 too thick.** The App Store magnifier's handle
traced at 2.34 against a 1.62 ring, at 45.6° and a perpendicular offset of
0.00. The tracer is measuring the diagonal's stair-stepping, not a heavier
stroke. So a construction gives the ring and the handle one weight, and the
fit confirms it. Any measurement taken off a diagonal edge is suspect the same
way.

## Where the redraw lives

The construction script belongs to the canvas folder, not the toolkit, because
one glyph's construction is not another's and the fitted parameters are
evidence about this app. Keep it beside `gen.py` in a `redraw/` folder with
its own README that records the numbers it found, what each glyph turned out
to be, and the settings you ran `refit` with. Name in the canvas folder's
README, in its assets section, which glyphs are traced and which are drawn.
The script needs `scipy` for the optimiser, which the toolkit does not ship.

`apple-app-store` is the worked case in this repo: seven glyphs went from
18280 bytes of traced points to 4936, with every ink box byte-identical.
