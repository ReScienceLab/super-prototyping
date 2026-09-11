# Redrawing a traced glyph

A glyph traced off a capture is point soup: one `<path>` of hundreds of
implicit linetos, no curves, and edges that are visibly ragged at any zoom.
These two scripts turn one into artwork a designer could have drawn, which
means few anchors on real circles, arcs and Béziers.

Both read `../assets/icons/<name>.svg`, keep its `viewBox` byte for byte —
that box is the glyph's ink box in the capture's page points, and `gen.py`
places the file by it, so a changed box moves the glyph — and write their
overlays to `../scratch/compare/`.

## `design.py` — the glyph *is* a construction

Most of these glyphs are a few primitives: a circle and a round-capped bar,
a stadium over a U-shaped cradle, a rounded square under `rotate(45)` and a
vertical squash. Write that construction with its dimensions as parameters,
then fit the parameters: rasterise the candidate and the original at 16×,
and minimise the mean disagreeing ink with Nelder-Mead.

```bash
python3 redraw/design.py --write magnifier tab-search mic tab-today tab-apps tab-arcade
```

`SPEC` holds one entry per glyph: the builder, the starting parameters and
their names. The committed starting parameters are the fitted ones, so a
re-run reproduces the same file. Adding a glyph means reading it — `probe.py`
prints where the ink starts and stops along each row and column, in the
glyph's own points — and adding a builder.

## `refit.py` — the glyph is a shape

The rocket has no construction, so fit the outline itself: resample the
contour, smooth it, find the corners by turning angle, and fit each run
between two corners as a line, a circular arc or a cubic Bézier, splitting
until the worst deviation is under tolerance.

```bash
SIGMA=0.35 TOL=0.13 CORNER=50 SPAN=1.0 python3 redraw/refit.py --write tab-games
```

Those four are the anchor-count/fidelity knee for these glyphs: 2382 bytes
and no curves in, 1072 bytes and 40 anchors out, 0.9% of the ink disagreeing.
Looser smoothing rounds off the fin tips; tighter keeps the trace's wobble.

Unlike `design.py`, this one has no record of its input beyond its output, so
run it on a glyph once. The traced originals are in git history, at 7b188a5.

## How close these land

Mean disagreeing ink against the trace, over the glyph's ink box:

| Glyph | Δ |
| --- | --- |
| `tab-today` | 0.006 |
| `tab-games` | 0.009 |
| `mic` | 0.019 |
| `tab-search` | 0.020 |
| `tab-arcade` | 0.022 |
| `magnifier` | 0.022 |
| `tab-apps` | 0.025 |

The residual is the trace's own ragged edge and sub-pixel at 24 px. One
finding is worth keeping: a 45° bar traces about √2 thicker than its true
stroke (2.34 pt against the magnifier ring's 1.62), so the redraw gives the
ring and the handle one weight rather than copying the trace's.
