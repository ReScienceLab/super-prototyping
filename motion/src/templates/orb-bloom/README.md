# orb-bloom

A single warm sphere swells out of the ground until it overruns the frame, with
a row of small chips landing across it and leaving again.

1920x1080, 30 fps, 90 frames.

    npx remotion render orb-bloom src/templates/orb-bloom/out/orb-bloom.mp4

## Reference

f1283-f1340, "piece by piece".
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **The shot is a hard cut off the end of the count-up at f1280**, and the
  sphere is already bigger than the frame on the first frame of it. What the
  reference shows is the back half of a bloom: the bright rim sweeping across
  and off, not a sphere growing from a dot.
- `to` has to be **at least 2.05**. The frame's diagonal is 2.04 frame heights,
  so anything smaller leaves the corners showing and reads as a ball on a
  background rather than as the shot; 1.4 clears the top and bottom only.
- Chips arrive **three frames apart** — f1284, f1286, f1291 — over about 14
  frames each, in a **flat row**, not staggered up and down.
- They hold that row for about forty frames and then **leave upward and
  outward at different rates over the last ten**, which is where the film cuts.

## Props

| prop        | default                        |
|-------------|--------------------------------|
| chips       | ["piece", "by", "piece"]       |
| from        | 0.1                            |
| to          | 2.05                           |
| bloomFrames | 62                             |
| blur        | 60                             |
| chipAt      | 10                             |
| chipStep    | 3                              |
| chipFrames  | 14                             |
| exitAt      | 66                             |
| exitFrames  | 12                             |
| exit        | 0.5                            |
| size        | 0.045                          |
| color       | PAPER                          |
| gradient    | { ...MESH, base: GRADIENT[3] } |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**The template plays the whole bloom; the reference only shows its back half.**
Starting at `from: 1.3` would match the cut frame for frame and give a template
whose first second is a wall of colour — no use to a film that wants to open on
this. `from: 0.1` is the head the shot does not have, and the two ends the shot
does pin down (`to`, and the chips' exit) are measured.

The bloom and the defocus run on one progress value, not two: the orb is
heavily blurred while it is small and resolves as it lands, which is what makes
it read as coming toward the camera rather than scaling up in place.
