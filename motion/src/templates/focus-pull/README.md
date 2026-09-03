# focus-pull

A block of type holds sharp right of centre, then the camera pushes through
it: it swells, goes soft top line first, and is gone before the push ends.

1920x1080, 30 fps, 80 frames.

    npx remotion render focus-pull src/templates/focus-pull/out/focus-pull.mp4

## Reference

f1372-f1400, "Your / digital mind / is born" in one white block beside the
particle figure, held sharp until f1387 and pushed through over f1387-1400.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **One plane, one colour, one push.** The block scales about the frame
  centre by 1.11 / 1.19 / 1.30 / 1.38 / 1.49 at f1390 / 92 / 94 / 95 / 96,
  which is `1 + 0.65 * p^1.5` over 13 frames.
- The top two lines lose their bright core within two frames (luminance > 215
  gone at f1389); "is born" keeps its four frames longer (gone at f1394).
- The light rises to x2.0 the empty frame's at f1395, then falls 0.95 / 0.90 /
  0.75 / 0.48 / 0 over f1396-1400: an ease-in fade over the last five frames on
  top of the blur. f1400 is the bare gradient.
- The block is x 0.503-0.927, y 0.305-0.704 at f1380 (`extent`, both clips at
  1920): 0.424 wide, 0.399 tall, ink centre (0.715, 0.505). This render is
  0.412 x 0.400 at (0.717, 0.511) on frame 45.

## Props

| prop     | default                       |
|----------|-------------------------------|
| text     | "Your\ndigital mind\nis born" |
| at       | 53                            |
| frames   | 13                            |
| zoom     | 0.65                          |
| blur     | 60                            |
| lag      | 4                             |
| fade     | 5                             |
| x        | 0.715                         |
| y        | 0.505                         |
| size     | 0.18                          |
| leading  | 0.85                          |
| color    | PAPER                         |
| gradient | DIM                           |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**This used to be a two-plane rack focus** with a peach far plane and no
fade; the reference has one plane, one colour, and a push. `near`, `far`,
`breathe`, `offset`, `nearSize`, `farSize` and `farColor` are gone.

The push starts at 53 rather than the reference's 15 on the cut's clock, so
the block holds for most of the shot and the empty tail is what the cut lands
on; the reference carries the block in from the particle shot before f1372.

The face is narrower than the reference's: 0.18 matches the block's height
and width within 5%, but "Your" alone is 0.149 wide against 0.181 (f1380).

The ground was the shared `MESH`, which did not match this shot: f1400 means
#b53536 with its light at the right edge (brightest #f3dbdf at 0.94, 0.58);
frame 70 read #cf5a53 with the hard band through the centre (brightest #fdba94
at 0.54, 0.43). It now takes `DIM` — the same crimson ramp under a wide, dim
light and no hard edge — which is fitted to f1370 and is right for the shot's
contrast and for where it goes dark.

What `DIM` does not do is move. The light drifts right across this shot: the
middle-row peak is at 0.25 W at f1370, 0.55 W at f1390, and at the right edge
by f1400, where `DIM` holds it at 0.25 W throughout. It is a soft ambient wash
either way, and the type is what the shot is about.
The particle figure to the left of the block is not reproduced.
