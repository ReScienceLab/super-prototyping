# count-up

One enormous translucent numeral climbing to its target over the mesh
gradient, with a small label pinned at the optical centre.

1920x1080, 30 fps, 90 frames.

    npx remotion render count-up src/templates/count-up/out/count-up.mp4

## Reference

f1172-f1280, "74% -> 100% / Mind quality".
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **68 frames** from first to last count.
- **Ease-out quadratic.** Normalising nine sampled readings and solving
  `1-(1-t)^p` gives p = 2.75, 2.22, 2.19, 1.77 across the shot; mean 2.2,
  which is quadratic to within the 1-count quantisation of reading a number
  off a frame — so the code says `Easing.quad`, not a hand-rolled 2.2.
- **Veil 0.33.** Solved from a glyph stroke sampled against the ground beside
  it at full resolution; the numeral is white at a third alpha, not a tint.
- **No push-in with the count.** The numeral's rows sit at 0.225-0.757 of the
  frame from f1178 to f1234 without moving. It is meant to bleed off both side
  edges — see `reference` crop f1180.
- **One pop as the target lands.** Rows 0.531 h at f1234, 0.593 at f1238,
  0.615 from f1250: 16%, three quarters of it in the first four frames —
  ease-out cubic over 12, starting three frames after the count first reads
  100.
- **It arrives well out of focus.** A gradient-fitted sigma on the numeral
  band of the clip scaled to 1920, calibrated against known gaussian blurs of
  f1250 at that size (linear to 22 px; the ground's own gradients cap the
  reading at 24, above everything read here), gives 22 px at f1172, 16.5 at
  f1176, 11 at f1178-f1180, 7 at f1184, 5.5 at f1188, 3.2 at f1192, 1.5 at
  f1196 and the sharp frame's 1 from f1200. Ease-out quad over 30 frames is
  16.5, 11.9, 7.9, 4.8, 2.4, 0.9 at +4, +8, +12, +16, +20, +24. An earlier
  reading of 9.5 px at 2880 was the same estimator with a fixed contrast
  that the clip's numeral does not have; the crop of f1172 beside ours at
  6.3 px settled it by eye before the recalibration did by number.
- **The label is soft too**, less and for less long: 3.0 px at f1172, 2.7 at
  f1174, 2.1 at f1176, 1.15 at f1178, 1.05 and 0.85 at f1180 and f1182, 0.6
  at f1186, on the same calibration run on the label crop. The same curve
  over 20 frames.
- Label "Mind quality" at f1250: 0.0556 of the frame tall, 325 px wide at
  1920, strokes 0.106 em (weight 500). Ours was 0.037 tall and 238 wide.

## Props

| prop             | default        |
|------------------|----------------|
| from             | 74             |
| to               | 100            |
| suffix           | "%"            |
| label            | "Mind quality" |
| countFrames      | 68             |
| size             | 0.7            |
| pop              | 0.16           |
| popAt            | 62             |
| popFrames        | 12             |
| blur             | 24             |
| focusFrames      | 30             |
| labelBlur        | 3.3            |
| labelFocusFrames | 20             |
| veil             | 0.33           |
| gradient         | MESH           |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The label is this repo's string, at 5.6vh and -0.03em: the reference's face
is narrower than Inter, and 5.9vh (its height) would run 360 px wide against
its 325, 5.3vh (its width) would run short. 5.6 at -0.03em is 328 px wide and
5.3% tall, which splits it.

The reference defocuses the numeral out again from f1270 to f1282 and drops
it at f1283, and a small pink dot crosses the frame f1274-f1282, both on the
way into the next shot; the template holds sharp so a cut can land anywhere
after the pop.

`blur` and `labelBlur` are 8% over the readings (22 and 3.0): Chrome's
`blur(N)` measures as a gaussian of about N-2 on our own stills at 22 and 30,
and 3.1 for 3.3, recovered by dividing the numeral out of a ground-only render.

The ground is `MESH` as shared, and this shot is the one `MESH` is measured
on. A 4x4 census of f1250 used to come back far more contrasty than ours at the
same frame — `#7d0013` across the top-right three cells and `#c5001c`
bottom-left against our mid-tones — which was the shared blob set, fitted to
f1300 and wrong here. Both are gone: `MESH` is now the measured vertical ramp
with no blobs at all, and its band rests where this shot's band rests. The
knock-on showed in the numeral too: the same 0.33 veil read 1.65x the edge
contrast on the clip that it did here (the blur calibrations' slopes, 0.55
against 0.9 per px of sigma), because the ground behind the glyphs was too
light.
