# Reference analysis: 10291_0.mp4 — "spatial gallery" card wall

Measured off the source video, not guessed at. Build against these, and check a render
against them; every number below is reproducible with the commands at the bottom.

## Source
`reference/10291_0.mp4` — 1080x864, 30fps, **120 frames = 4.000s**, h264. Not committed
(see .gitignore): a third-party clip stays out of the repo, its measurements go in.

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
Full per-frame series is in `motion.txt`, in source pixels (see the commands below). Read it.
Summary:

The camera pans along a **fixed diagonal axis, 19.6 degrees below horizontal**
(dy/dx is a constant ~0.357 through both flicks). Content moves right and down.

It is **two discrete momentum flicks with a hold between them** — not one continuous move:

| phase   | frames  | behaviour                                                          |
|---------|---------|--------------------------------------------------------------------|
| flick A | 3..30   | onset f3, ramps to peak 83.5 px/frame at f9, decays out             |
| hold    | 30..50  | at rest, ~2 px/frame residual drift only                            |
| flick B | 51..76  | onset f51, peak ~80 px/frame at f54-f56, decays out                 |
| rest    | 76..119 | at rest, same small residual drift                                  |

- Peak speed 83.5 px/frame = 2505 px/s.
- Decay is friction-like: velocity multiplied by roughly **0.85 per frame** at 30fps
  (fit over flick B: 82 -> 4 px over 16 frames). Tune to match the series.
- Total travel over the 4 s: **1630 px horizontal, 582 px vertical** (source px).
  At a 214 px column pitch that is ~7.6 columns traversed.
- Note the raw dx values wobble (e.g. f6=50, f7=32, f8=76) — that is motion blur and the
  correlation's 2px quantisation, not real. Fit the envelope, not every sample.

## Files
`motion.txt`, this file, and the clip itself. Everything else the analysis used — extracted
frames, a contact sheet — is regenerated on demand rather than committed:

```sh
cd motion/src/templates/spatial-gallery
kit=../../../../tools/motionkit.py
python3 $kit probe   reference/10291_0.mp4              # dimensions, fps, frame count
python3 $kit flow    reference/10291_0.mp4 --out reference/motion.txt
python3 $kit sheet   reference/10291_0.mp4              # labelled contact sheet
python3 $kit compare reference/10291_0.mp4 out/spatial-gallery.mp4
```
