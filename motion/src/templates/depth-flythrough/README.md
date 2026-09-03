# depth-flythrough

A line of spheres receding to a vanishing point right of centre, the camera
creeping toward them, and a conversation pinned to the front sphere. When an
exchange is over the camera walks up one sphere.

1920x1080, 30 fps, 105 frames.

    npx remotion render depth-flythrough src/templates/depth-flythrough/out/depth-flythrough.mp4

## Reference

f1470-f1595, a receding row of pink-red orbs on the light ground with chat
bubbles beside the near one. Frame 0 here is f1489, once the shot has settled.
Measured per frame off f1474-1588 (front orb radius as the longest vertical
run of orb-coloured pixels, bubble boxes as fill-coloured rows and columns,
both clips at 1920):

    python3 ../../tools/motionkit.py sheet <clip> --from 1470 --to 1595 --count 8 --cols 4

The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **The camera barely moves.** The front orb is r 0.205 at f1489 and 0.237 at
  f1546: 16% in 57 frames, 0.0024 z per frame through a perspective divide.
  This template used to run at 0.032 and put an orb through the lens every
  20 frames; the reference never lets one past that way.
- **The conversation moves the shot.** Each exchange belongs to one orb. When
  it is done the camera either walks one slot (f1510-1518: the front orb
  grows x1.4, goes pale and is gone in 8 frames; the next lands at r 0.207,
  where the first started) or pushes in without passing anything (f1548-1549:
  r 0.239 -> 0.279, x1.17, in one frame, and stays).
- The chain converges on x 0.56; the front orb's centre is x 0.29 at f1489
  and each orb back is 0.63 the size of the one in front (f1508: r 0.21,
  0.13, 0.08).
- The sphere is not the shared Orb's orange: disc mean #df6f67 at f1504,
  pink-white upper left (#de9893) to deep red lower right (#cb2936) with an
  orange rim light (#ed5e42). `sphere` carries it.
- Bubbles: a one-line bubble is 88px tall at scale 1 (f1489), a two-line one
  127px (f1522, 133px at 1.05), line pitch 39px, glyph run 33px with a
  descender: 33px Inter at 1.2. Pale fill #fafafa with #3d251a text, accent
  #ef4a06 with #fff9e8 (f1504). Q2 wraps to two lines inside 786px at 1.05
  (f1522). A lone bubble is centred on y 0.5 (f1546); a pair is centred on the
  gap between them, 0.029 of the frame at f1504 and 0.049 at f1560, both at
  scale 1.
- Like-for-like on this render: orb r 0.209 / 0.217 / 0.243 / 0.286 / 0.327
  at frames 0 / 15 / 57 / 61 / 99 against 0.205 / 0.215 / 0.237 / 0.277 /
  0.311 at f1489 / 1504 / 1546 / 1550 / 1588; Q2 0.431 wide at frame 40
  against 0.429 at f1540; the reply's left edge 0.300 at frame 99 against
  0.300 at f1575.

## Props

| prop       | default                                                  |
|------------|----------------------------------------------------------|
| messages   | two exchanges, orb 0 at -20 / -12 and orb 1 at 28 / 60   |
| pushes     | walk at 21 (8 frames, 0.6), push at 58 (1 frame, 0.125)  |
| orbs       | 6                                                        |
| gap        | 0.6                                                      |
| speed      | 0.0024                                                   |
| vanish     | 0.56                                                     |
| offset     | 0.27                                                     |
| orb        | 445                                                      |
| sphere     | `radial-gradient(circle at 35% 35%, #e8a09b, ...)`       |
| soft       | 5                                                        |
| blur       | 6                                                        |
| frames     | 12                                                       |
| size       | 33                                                       |
| color      | "#3d251a"                                                |
| bubble     | "#fafafa"                                                |
| accent     | ORANGE                                                   |
| accentText | "#fff9e8"                                                |
| background | BONE                                                     |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**This template used to fly.** Orbs swelled through the lens and left by the
left edge every 20 frames, with a fixed 0.70 ink ratio on the labels; none of
that is in the reference, where no orb ever passes the camera. `labels`,
`focal`, `near` and `focus` are gone; `messages`, `pushes` and `sphere`
replace them.

The bubbles take their orb's scale. In the reference they grow more than the
orb through a push (Q2 0.409 -> 0.599 wide over f1522-1549, x1.46, while its
orb went r 0.216 -> 0.279, x1.29): they sit nearer the camera than it. Not
modelled; this render's Q2 is 0.535 wide at frame 61 against 0.601 at f1550.
The reference orb also settles back 4% over the six frames after its push
(r 0.279 -> 0.268 by f1555); not modelled.

The copy is the repo's placeholder. The reference's first pale bubble is a
three-line reply (0.144 of the frame tall at f1489); the placeholder's is one
line. The shot's own settle-in, f1470-1489, is not reproduced: a template
opens settled.

The shared Orb is the f1300 sphere and is overridden here through
`style.background`, not changed.
