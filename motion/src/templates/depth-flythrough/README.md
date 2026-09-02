# depth-flythrough

A queue of spheres strung out along the z axis with the camera walking forward
through them — each one growing, sharpening, passing and gone.

1920x1080, 30 fps, 105 frames.

    npx remotion render depth-flythrough src/templates/depth-flythrough/out/depth-flythrough.mp4

## Reference

f1900-f1975, a receding row of orbs on the light ground with a chat bubble
beside each.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- The camera dollies; it does not cut. The row reads as one continuous space
  for the whole shot.
- Near orbs large and crisp, far ones small and soft: defocus is a function of
  distance from the focal plane, not of index.

## Props

| prop       | default      |
|------------|--------------|
| labels     | five, one per orb |
| gap        | 2.4          |
| speed      | 0.075        |
| focal      | 2.5          |
| focus      | 3.0          |
| blur       | 3.4          |
| orb        | 118          |
| wander     | 0.14         |
| seed       | "flythrough" |
| size       | 15           |
| color      | INK          |
| bubble     | "#ffffff"    |
| accent     | ORANGE       |
| background | BONE         |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The projection is the real perspective divide, `focal / (z - camera)`, not a
lerp between two sizes. A lerp makes the far orbs approach at the same rate as
the near ones and the shot goes flat; the divide gives the acceleration you
can see in the reference for free, because it is the arithmetic a camera does.
