# mesh-gradient

The warm mesh ground almost every other shot in the set sits on: five drifting
radial blobs over a flat base, with a hard diagonal light band sliding across
them and easing to a stop.

1920x1080, 30 fps, 120 frames.

    npx remotion render mesh-gradient src/templates/mesh-gradient/out/mesh-gradient.mp4

## Reference

Throughout, but fitted on f1172-f1280 — the percentage shot, which holds still
long enough to fit a curve to.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **Band angle 35 deg**, constant. Luminance-weighted centroid per row gives
  dx/dy = +1.43 at f1180 and +1.43 again at f1260.
- **Band travel 33% of the frame width, leftward.** The centroid goes 172 ->
  130 -> 107 -> 96 -> 94 -> 92 (of 240) at f1172, 1180, 1190, 1200, 1210,
  1240.
- **40 frames, ease-out cubic.** Fitting `1-(1-t)^p` over those six readings
  gives p = 3.4, 2.8, 2.5.
- Base and stops: `swatch 1180 --grid 16x9` and `swatch 1300`, recorded per
  value in `lib/palette.ts`.

## Props

`GradientProps`, defined and documented in `src/lib/Gradient.tsx`:

| prop         | default                       |
|--------------|-------------------------------|
| base         | GRADIENT[2]                   |
| blobs        | five, see `MESH`              |
| bandAngle    | 35                            |
| bandWidth    | 0.62                          |
| bandTravel   | -0.33                         |
| bandFrames   | 40                            |
| bandOpacity  | 0.85                          |

The one template in the set with **no `durationInFrames`**: the band eases out
over `bandFrames` and the blobs drift on sines forever after, so there is no
length for a cut to stretch. Every other template takes the prop — see
`src/lib/README.md`.

## Deviations

This template is a three-line re-export of `lib/Gradient`. The folder exists
so the ground is scrubbable and renderable on its own, not only as somebody
else's backdrop.
