# particle-form

A few hundred bright dots drift in from everywhere and gather into a shape,
densest at its edge.

1920x1080, 30 fps, 120 frames.

    npx remotion render particle-form src/templates/particle-form/out/particle-form.mp4

## Reference

f1330-f1400, beside "Your digital mind / is born" — a standing figure
assembling itself out of white specks.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **34 frames of travel per particle, spread over 46** — the last particle
  leaves as the first ones are landing.
- Dense along the silhouette, sparse through the middle, which is what tells
  you it is a shape made of dots and not a cloud (`rim`).
- A particle in flight is soft and dim and resolves as it lands, so the shape
  sharpens into existence rather than sliding into place fully formed.

## Props

| prop      | default                        |
|-----------|--------------------------------|
| count     | 520                            |
| seed      | "born"                         |
| travel    | 34                             |
| spread    | 46                             |
| scatter   | 0.42                           |
| scale     | 0.84                           |
| aspect    | 0.5                            |
| harmonics | 0.22                           |
| rim       | 0.45                           |
| dot       | 6                              |
| x         | 0.27                           |
| y         | 0.52                           |
| color     | PAPER                          |
| gradient  | { ...MESH, base: GRADIENT[2] } |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**The target shape is a stand-in.** The reference forms a human silhouette;
this forms a seeded organic outline that `harmonics`, `aspect` and `seed`
reshape. The mechanic the template exists for is scatter -> gather -> hold;
tracing the reference's silhouette would mean shipping a point list and would
not make the motion any more faithful.
