# Reference analysis: 10291_0.mp4 — "spatial gallery" card wall

Measured by me (the dispatching agent) from the source video. These are facts, not guesses.
Do not re-derive them; do verify your build against them.

## Source
`/Users/yilin/Downloads/10291_0.mp4` — 1080x864, 30fps, **120 frames = 4.000s**, h264.

## What it is
A wall of photo cards laid out on a **convex cylinder** (camera outside, looking at the outside
of the cylinder). The card nearest the optical centre is frontal, largest and brightest; cards to
either side rotate away about the vertical axis, shrink with perspective, and darken sharply.
Background is pure black (#000). A small white visionOS pinch-cursor glyph sits near
(238, 474) at frame 0 — it is part of the source recording; reproducing it is OPTIONAL.

## Geometry, measured off frame 0
- Centre card (the woman in red): x 446..651, y 306..566 -> **205 x 260 px**, aspect ~0.79 (call it 3:4).
- Corner radius ~14-16 px. Soft drop shadow.
- Horizontal gap to the next card: ~9 px, so **column pitch ~214 px** at the frontal position.
- The card immediately to the right renders 152 px wide at nearly the same height (256 px),
  i.e. strongly foreshortened about the Y axis while barely shrinking vertically. That is the
  cylinder signature — match it.
- Multiple rows above and below, offset horizontally row to row (brick stagger, not a square grid).
- Cards at grazing angles pick up a **diagonal specular sheen** (a glossy-panel highlight);
  opacity of that sheen scales with |yaw|. Visible on the cards at ~(500,180) and ~(620,650) in f000.
- Brightness falls off steeply with distance from the optical centre. It is NOT a plain radial
  vignette — cards one step off centre are already noticeably dim. Model it as a falloff on
  depth/eccentricity, per card.

## Motion — the important part
Full per-frame series is in `motion.txt` (phase correlation on half-res frames; **multiply dx,dy by 2**
for source pixels). Read it. Summary:

The camera pans along a **fixed diagonal axis, 19.7 degrees below horizontal**
(dy/dx is a constant ~0.368 through both flicks). Content moves right and down.

It is **two discrete momentum flicks with a hold between them** — not one continuous move:

| phase   | frames  | behaviour                                                          |
|---------|---------|--------------------------------------------------------------------|
| flick A | 3..30   | onset f3, ramps to peak ~80 source px/frame at f8-f12, decays out   |
| hold    | 30..50  | at rest, ~2 source px/frame residual drift only                     |
| flick B | 51..76  | onset f51, peak ~78 source px/frame at f54-f56, decays out          |
| rest    | 76..119 | at rest, same small residual drift                                  |

- Peak speed ~80 source px/frame = 2400 px/s.
- Decay is friction-like: velocity multiplied by roughly **0.85 per frame** at 30fps
  (fit over flick B: 41 -> 2 half-res px over 16 frames). Tune to match the series.
- Total travel over the 4 s: **1630 px horizontal, 582 px vertical** (source px).
  At a 214 px column pitch that is ~7.6 columns traversed.
- Note the raw dx values wobble (e.g. f6=25, f7=16, f8=38) — that is motion blur and integer
  quantisation in my correlation, not real. Fit the envelope, not every sample.

## Files you have
- `f000.png`, `f060.png` — full-resolution reference frames.
- `sheet.png` — 4x3 contact sheet, every 10th frame.
- `frames/f000.png`..`f119.png` — all 120 frames at half res (540x432).
- `motion.txt` — the per-frame motion series.
