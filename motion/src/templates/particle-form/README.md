# particle-form

A figure made of a hundred-odd white dots fades up in place beside the type,
head and shoulders, densest at its edge.

1920x1080, 30 fps, 120 frames.

    npx remotion render particle-form src/templates/particle-form/out/particle-form.mp4

## Reference

f1340-f1400, beside "Your digital mind / is born" — a bust in white specks,
left of the type.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **The figure does not gather, it fades up in place.** Nothing in its region
  is above luma 150 until f1344; then 133 dots come up together — mean dot
  luma 169 at f1346, 183 at f1348, 210 at f1349, 227 at f1352, 250 at f1356,
  on a ground of 105 (alpha 0.43, 0.52, 0.70, 0.81, 0.97) — while their
  centroid sits still, 0.278 -> 0.270 w across the fade. 12 frames, ease-out
  quad (0.31, 0.56, 0.66, 0.89, 1 at those frames; cubic overshoots the
  middle).
- **It is a bust.** Bbox x 0.176-0.363, y 0.266-0.809 at f1352 and
  0.250-0.802 at f1370, centroid (0.274, 0.488). In twelve equal bands of
  f1370's bbox, top to bottom, the x extent of the dots as a fraction of the
  0.55 h figure — 0.30, 0.31, 0.35, 0.32, 0.23, 0.21, 0.30, 0.45, 0.59, 0.57,
  0.18, 0.05 — and how many of the 133 dots sit in each: 13, 15, 14, 8, 8,
  10, 14, 17, 15, 15, 3, 1. Head, neck, shoulders, a ragged underside.
  `WIDTH` and `DENSITY` in the code.
- **Evenly spaced, not scattered.** Nearest-neighbour distance between dot
  centroids p10/25/50/75 of 16/19/22/24 px at f1352 (18/22/25/28 at f1370).
  A uniform random draw with the counts above gives 6/9/14/20 and clumps; a
  jittered two-row lattice across each band gives 13/17/21/25.
- **Dots of very mixed size.** Diameters p10/p50/p90/max of 5.0/10.8/21.5/
  31.1 px at f1352; a log-uniform draw over 4.5-30 gives 5.4/11.6/24.8/30.
- Pure white (`#ffffff` at f1370) with a halo: around a dot the ground (106)
  reads 159, 140, 132, 125, 121 at 1.4, 2.7, 4, 5.3, 6.7 px past its edge.
- The ground's band does not move: a 4x4 census of f1352, f1370 and f1390 is
  the same to a few levels everywhere the figure and type are not.

## Props

| prop       | default                                         |
|------------|-------------------------------------------------|
| count      | 133                                             |
| seed       | "born"                                          |
| at         | 4                                               |
| fadeFrames | 12                                              |
| scale      | 0.55                                            |
| dotMin     | 4.5                                             |
| dotMax     | 30                                              |
| x          | 0.27                                            |
| y          | 0.53                                            |
| color      | "#ffffff"                                       |
| gradient   | { ...MESH, base: GRADIENT[2], bandTravel: 0 }   |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The silhouette is twelve band widths and twelve counts, not a traced point
list: dot j of n in a band sits at the j-th of n slots across the band's
width, on the upper or lower half-row by parity, jittered in both by `seed`.
It reads as a bust at the size the shot uses it; it is not a portrait. By the
same blob census ours has 117 dots (the clip 133; the rest sit under
neighbours), diameters p10/50/90 of 5.5/11/26 against 5.8/12/24, band widths
within 0.015 h of the table, bbox x 0.173-0.361. The first version drew the
dots uniformly at random down a smooth profile and read as an hourglass with
a clumped head.

The ground under the figure used to be `MESH`, and was not the clip's. Around
the figure the clip's ground is a flat luma 89-109 at f1370; ours at the same
nine points ran 30 to 173, the shared band's hot flank crossing the head and
its ground crimson under the shoulders. Against 173 the head's halos merge
above luma 150, so a fixed-threshold census read it as one blob though its dots
are 20 px apart.

This shot has no band in it at all: the middle-row profile at f1370 peaks at
0.25 W and luma 151, against the band's 0.423 W and 206, and at f1352 and f1400
the peak wanders to 0.00 with no ridge to find. It now takes `DIM` from
`lib/Gradient.tsx` — the same crimson ramp under a wider, dimmer, further-left
light — instead of `MESH` with the slide switched off.

After it lands the reference pushes in slowly (centroid x 0.277 at f1350 ->
0.172 at f1388, median dot 10 -> 14.5 px) and defocuses out into the next
shot. Neither is here: the template holds the figure so a cut can land
anywhere after frame 16.

The reference plays this over the focus-pull type; this template is the dots
and the ground only.
