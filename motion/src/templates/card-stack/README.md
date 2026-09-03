# card-stack

A row of tall cards standing on the floor in perspective, coming up into place
one after another, holding, and the sharp one lifting out, with a line of type
in front of them.

1920x1080, 30 fps, 100 frames.

    npx remotion render card-stack src/templates/card-stack/out/card-stack.mp4

## Reference

f38-f81 — a fan of warm rectangles, most out of focus, one a little left of
centre sharp, "people want" over the top. (f82 onward is a different shot,
"Your profile?", on a lit ground.)
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

Measured on the sharp card's left edge and top edge, ink runs at lum>120 in a
strip at x 0.31-0.37 and a row at y 0.62-0.68:

- **The cards come up from below the frame, left to right.** The row's
  x-extent grows 0.24 -> 0.47 -> 0.70 -> 0.88 -> 1.0 of W at f40/42/44/46/48
  — about one card per 1.5 frames (`step`). The sharp card's top goes 0.540
  -> 0.468 -> 0.454 -> 0.449 -> 0.451 of H at f51/57/61/65/69, an ease-out
  that is at rest by f65 (`riseFrames` 24, `top` 0.45).
- **The row settles in from the right at the same time**, and then stops:
  the sharp card's left edge goes 0.345 -> 0.305 -> 0.289 -> 0.280 -> 0.278
  of W at f51/57/61/65/69 and its half-scale neighbour 0.731 -> 0.698 over
  the same frames — the far card moves half as far, which is what one
  `translateX` on the row does under perspective. A cubic ease-out through
  those four readings, started with the card's rise, is 31 frames and 0.172
  of W (`slideFrames`, `slide`); it outlasts the rise. Nothing moves
  f61-f69: the text box is 0.378-0.622 of W at both ends.
- **The sharp card lifts out at the end.** Top 0.451 -> 0.262 -> 0.069 of H
  at f69/73/77, gone by f80 — a quad ease-in over 12 frames. The text fades
  over f69-f78. Here the lift finishes 6 frames before the last frame.
- **Depth falls away on both sides of the sharp card.** At f57 it is
  0.305-0.608 of W wide (0.30), its left neighbour 0.13-0.29 (0.16), its
  right 0.61-0.72, the next 0.72-0.83, the last 0.90-1.0 (0.10): scales of
  1, 0.5, 0.5, 0.4, 0.35, which `z = -depth * sqrt(|i - focus|)` gives with
  `depth` equal to the perspective. Its sides are vertical (left edge
  0.288/0.290/0.291 of W at y 0.55/0.75/0.92) and its top edge rises 0.05 of
  H from x 0.34 to x 0.55, so it is turned with its right side nearer.
- **Tops are uneven, feet are off the frame.** Card tops at f61: 0.444,
  0.452, 0.454, 0.483, 0.500, 0.556 of H across the row; no card has a
  bottom edge in frame.
- **The text lands large and out of focus.** Blurred at f38-f46 (its box is
  0.14 of H tall at f40, 0.09 from f46), centre at 0.50 of H throughout, and
  its width eases 0.275 -> 0.244 -> 0.237 of W over f46/61/69: a scale from
  1.16. At rest it is 0.244 of W by 0.093 of H; `size` 0.1 gives 0.230 by
  0.094 (0.075 gave 0.172 by 0.072).
- Card faces, `swatch 57 --crop` on each: #885017 left of the sharp card,
  #a16836 right of it, #a07545 and #986e41 beyond, #8c5025 in the row at
  f80; the sharp card is #a4876a at its top and #bea894 at its foot
  (`vprof`), and every card is darker at the top than the foot.
- The ground: `vprof` f40 at x 0.80-0.95 is flat COCOA down to 0.63 of H,
  then #2a1706 #341d09 #45260e #5a3113 #6e3d19 #79431c at 0.67/0.74/0.81/
  0.89/0.96/1.0 — the same floor glow as word-cascade's.

## Props

| prop        | default                                                       |
|-------------|---------------------------------------------------------------|
| text        | "people want"                                                 |
| count       | 7                                                             |
| perspective | 1100                                                          |
| depth       | 1100                                                          |
| gapRatio    | 0.21                                                          |
| turn        | -26                                                           |
| top         | 0.45                                                          |
| slide       | 330                                                           |
| slideFrames | 31                                                            |
| riseFrames  | 24                                                            |
| step        | 1.5                                                           |
| leaveFrames | 12                                                            |
| focus       | 3                                                             |
| blur        | 7                                                             |
| cardWidth   | 640                                                           |
| cardHeight  | 1550                                                          |
| seed        | "shelf"                                                       |
| size        | 0.1                                                           |
| color       | PAPER                                                         |
| background  | radial-gradient(ellipse 200% 33% at 50% 100%, #75401c, COCOA) |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

Real 3D: one `perspective` on the parent and a `translateZ` per card, so
sizes, spacing and parallax are consequences of one number instead of three
curves hand-matched to each other.

**This template used to drift.** It slid the row 1224 px, linearly, for the
whole shot, with 272 px of z per card so every card was far and small and
the row's feet sat inside the frame. The reference row comes up, settles,
holds and loses its sharp card; the sharp card is the nearest thing in the
shot, not one of a receding fan. Both premises were built from memory and
neither survives the strip measurement above.

Still approximate: the reference's right side is denser than its left (four
cards in 0.4 of W against two), which one pitch cannot do, so the sharp card
sits at 0.336-0.631 of W here against 0.278-0.608; its top edge slants 0.01
of H over 0.21 of W against the reference's 0.05, because the perspective
origin sits at mid-height and the reference camera's is lower; and the
reference shot is 44 frames, so at 95 the row holds for about 45.
