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
- Numeral height 0.86 of the frame, and it is meant to bleed off both side
  edges — see `reference` crop f1180.

## Props

| prop        | default        |
|-------------|----------------|
| from        | 74             |
| to          | 100            |
| suffix      | "%"            |
| label       | "Mind quality" |
| countFrames | 68             |
| size        | 0.86           |
| scaleFrom   | 0.75           |
| veil        | 0.33           |
| gradient    | MESH           |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The label is this repo's string. The count and the push-in share one curve on
purpose, so the number stops growing on the same frame it stops counting.
