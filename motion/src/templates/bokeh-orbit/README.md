# bokeh-orbit

A ring of out-of-focus spheres turning around a word, the near half passing in
front of it.

1920x1080, 30 fps, 90 frames.

    npx remotion render bokeh-orbit src/templates/bokeh-orbit/out/bokeh-orbit.mp4

## Reference

f268-f312, "Chaos" on the dark ground.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- Ring tilted about 0.85 (0 is edge-on, 1 face-on): the beads at the top of
  the circle are visibly smaller and softer than the ones at the bottom.
- **260 frames per turn** — slow enough that a 90-frame shot sees about a
  third of a rotation.
- The near half is roughly a third as defocused as the far half.
- **The ring is bigger than the frame.** At f280 the beads run off the left and
  right edges and off the top, so what is on screen is an arc, not a circle. A
  ring that fits inside the frame reads as a necklace hung around the word,
  which is what `radius: 0.42` gave before it was measured.

## Props

| prop       | default |
|------------|---------|
| word       | "Chaos" |
| count      | 48      |
| radius     | 0.9     |
| tilt       | 0.85    |
| period     | 260     |
| bead       | 0.13    |
| blur       | 34      |
| seed       | "chaos" |
| fadeFrames | 18      |
| size       | 0.3     |
| color      | PAPER   |
| background | COCOA   |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The front/behind split is done by rendering the ring twice with the word
between the two passes. A single list sorted by depth is one stacking context
and cannot straddle the text however it sorts. Bead spacing and size both
carry a seeded jitter: an even ring reads as a bead necklace, and the
reference ring is visibly broken and clumped.
