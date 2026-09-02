# spatial-gallery

A wall of photo cards on a convex cylinder, flicked past the camera. 1080x864,
30 fps, 120 frames. Matches `reference/10291_0.mp4` frame for frame so the two
can be A/B'd.

    cd motion
    npx remotion render spatial-gallery src/templates/spatial-gallery/out/spatial-gallery.mp4

Source: `index.tsx` (component, defaults) and `motion.ts` (flick model). Pure
CSS 3D: one `perspective` container, `preserve-3d`, each card is
`translate3d(x,y,z) rotateY(yaw)`. No Three.js, no JS projection.

## Evidence

`reference/BRIEF.md` is the measured spec; `reference/motion.txt` is the
per-frame motion series it was fitted against. Both came out of
`tools/motionkit.py`, and the render can be checked back against them:

    python3 tools/motionkit.py flow motion/src/templates/spatial-gallery/out/spatial-gallery.mp4 --every 10
    #   peak 84.8 px/frame at f9   total 1706 x 570 px   axis 18.5 deg
    # reference: peak ~80 at f8-12, total 1630 x 582, axis 19.7 deg

The source clip itself is gitignored (see the repo `.gitignore`); the numbers
taken off it are not.

### What the geometry is

The cards sit on a **helix** around a vertical axis; the camera is outside it.
The near side is the convex cylinder the reference shows front and centre. The
rise per card is what tilts the pan axis 19.7 degrees below horizontal, and it
also puts the far side of the helix half a turn up and half a turn down: that
is where the dim, roughly half-scale rows above and below the main row come
from, and why they move the opposite way at about half speed. There are no
separate stacked rows. Far-side cards are yawed by an extra pi so the artwork
faces the camera.

Twelve cards per turn (2 pi * 409 / 214). The artwork cycle is independent of
that: the reference repeats ten photos, so the far-side card straight above the
frontal one is the sixth in the sequence, and the card one turn up is the
second. `cards.length` can be anything.

### Props

| prop           | default            | meaning                                                    |
|----------------|--------------------|------------------------------------------------------------|
| `cards`        | `DEFAULT_CARDS`    | `{ src?: string; background?: string }[]`, cycled along the helix; `cards[1]` is right of `cards[0]` at frame 0 |
| `motion`       | `REFERENCE_MOTION` | flick schedule, see below                                  |
| `tiltDeg`      | 19.7               | pan axis, degrees below horizontal                         |
| `cardWidth`    | 205                | px, frontal card                                           |
| `cardHeight`   | 260                | px                                                         |
| `cornerRadius` | 15                 | px                                                         |
| `pitch`        | 214                | centre-to-centre distance between neighbours along the helix |
| `radius`       | 409                | helix radius; cards per turn = 2 pi radius / pitch         |
| `perspective`  | 920                | camera distance to the frontal card                        |
| `falloff`      | 2                  | brightness = (perspective / distance to camera) ^ falloff  |
| `sheen`        | 0.5                | peak opacity of the diagonal grazing-angle highlight       |
| `shadow`       | 0.7                | drop shadow opacity                                        |
| `background`   | `#000`             |                                                            |

Cards render `src` with `object-fit: cover` when given, else `background` (any
CSS background — useful for procedural stand-ins). `DEFAULT_CARDS` is the
eleven photographs from the `apple-photos` artboard. Use `staticFile()` for
repo images: the public dir is `mockups/` in the worktree, per
`remotion.config.ts`.

### Motion

`Motion = { flicks: Flick[]; friction: number; drift: number }`,
`Flick = { onset, peak, rise, hold }`. Units are px per frame along the pan
axis, measured at the frontal card. Each flick ramps 0 to `peak` over `rise`
frames (smoothstep), holds `hold` frames, then multiplies by `friction` every
frame. `drift` is a constant creep added throughout. `travel(frame)` is the
prefix sum of per-frame velocities, so every frame is a pure function of its
index and renders identically on any worker in any order.

Reference fit: flick A `{ onset: 3, peak: 82, rise: 5, hold: 3 }`, flick B
`{ onset: 51, peak: 80, rise: 3, hold: 3 }`, friction 0.82, drift 1.5. Fitted
to card positions read off the reference at frames 30, 50, 60, 76, 100, 119
(rms 0.018 card pitches). Total: 7.94 cards past the camera.
