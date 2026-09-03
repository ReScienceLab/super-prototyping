# card-stack

A row of tall cards standing edge-on in perspective, drifting past the camera,
with a line of type in front of them.

1920x1080, 30 fps, 100 frames.

    npx remotion render card-stack src/templates/card-stack/out/card-stack.mp4

## Reference

f38-f95 — a fan of warm rectangles receding, most out of focus, one near the
middle sharp, "people want" over the top.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- Cards turned 26 deg off the camera, 200 px of z between neighbours.
- One card in focus and the defocus growing linearly either side of it, which
  is what puts the whole row at one apparent depth.
- The row keeps moving for the entire shot — a fan that eases to a stop stops
  being a camera move and becomes a slideshow — so the drift is linear over
  the shot length, not an eased 40 frames.

## Props

| prop        | default       |
|-------------|---------------|
| text        | "people want" |
| count       | 8             |
| perspective | 1100          |
| depth       | 272           |
| gapRatio    | 0.08          |
| turn        | -26           |
| slide       | 1224          |
| slideFrames | 0             |
| focus       | 3             |
| blur        | 7             |
| cardWidth   | 625           |
| cardHeight  | 1550          |
| seed        | "shelf"       |
| size        | 0.075         |
| color       | PAPER         |
| background  | COCOA         |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

Real 3D: one `perspective` on the parent and a `translateZ` per card, so
sizes, spacing and parallax are consequences of one number instead of three
curves hand-matched to each other.
