# orb-bloom

A single warm sphere swells out of the ground until it overruns the frame,
with a row of small chips landing across it as it arrives.

1920x1080, 30 fps, 90 frames.

    npx remotion render orb-bloom src/templates/orb-bloom/out/orb-bloom.mp4

## Reference

f1450-f1520, "piece by piece".
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **62 frames**, from about 0.1 of the frame height to about 1.4 of it — it is
  meant to overrun the top and bottom edges.
- Chips at 6-frame intervals from f10, 14 frames each.

## Props

| prop        | default                        |
|-------------|--------------------------------|
| chips       | ["piece", "by", "piece"]       |
| from        | 0.1                            |
| to          | 1.4                            |
| bloomFrames | 62                             |
| blur        | 60                             |
| chipAt      | 10                             |
| chipStep    | 6                              |
| chipFrames  | 14                             |
| size        | 0.036                          |
| color       | PAPER                          |
| gradient    | { ...MESH, base: GRADIENT[3] } |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The bloom and the defocus run on one progress value, not two: the orb is
heavily blurred while it is small and resolves as it lands, which is what
makes it read as coming toward the camera rather than scaling up in place.
