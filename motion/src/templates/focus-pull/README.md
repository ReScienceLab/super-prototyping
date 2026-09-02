# focus-pull

Two planes of type, and the focus racks from one to the other while both stay
on screen.

1920x1080, 30 fps, 80 frames.

    npx remotion render focus-pull src/templates/focus-pull/out/focus-pull.mp4

## Reference

f1372-f1400, "Your digital mind" / "is born".
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **16 frames** for the rack.
- Neither plane's opacity changes. A plane going out of focus keeps all its
  light, it just stops being legible; fading it reads as a dissolve, not a
  rack.
- The near plane also scales about 6% as it goes soft. A real lens changes
  magnification as it racks, and without it the shot looks like a Gaussian
  blur being turned up on a still — which is exactly what it is.

## Props

| prop     | default              |
|----------|----------------------|
| near     | "Your\ndigital mind" |
| far      | "is born"            |
| at       | 22                   |
| frames   | 16                   |
| blur     | 14                   |
| breathe  | 0.06                 |
| offset   | 190                  |
| nearSize | 0.13                 |
| farSize  | 0.115                |
| color    | PAPER                |
| farColor | GRADIENT[7]          |
| gradient | MESH                 |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The cheapest way in the film to move attention without moving the camera or
cutting, which is why it is worth having on its own.
