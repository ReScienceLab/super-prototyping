# depth-flythrough

A queue of spheres strung out along the z axis with the camera walking forward
past them — each one growing, swinging out to the left and off the frame.

1920x1080, 30 fps, 105 frames.

    npx remotion render depth-flythrough src/templates/depth-flythrough/out/depth-flythrough.mp4

## Reference

f1470-f1595, a receding row of orbs on the light ground with a chat bubble
beside the near ones. Measured off f1480, f1500, f1520 and f1545:

    python3 ../../tools/motionkit.py sheet <clip> --from 1470 --to 1595 --count 6 --cols 2

The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **The orbs sit on one straight line**, and it passes to the **left** of the
  camera. They converge on a vanishing point at about **x 0.56, y 0.50** and do
  not scatter at all. That line is the shot: it is the difference between a
  corridor and a handful of circles on a background. Screen x is the same
  perspective divide as the size — `vanish - offset * focal / z` — so the near
  end swings wide and the far end piles onto the vanishing point for free.
- The nearest orb sits at about **x 0.28** and is about **0.4 of the frame
  height** across; each one behind it is about **0.63** the size of the one in
  front, which is a uniform z spacing seen through a divide, not a ratio
  anybody picked.
- Centre-to-centre spacing down the chain is about **one near-orb radius**, so
  consecutive spheres overlap by half and the far tail packs into a smear.
- A bubble hangs to the **right** of its orb, about a near-orb radius clear,
  and is roughly one and a half orbs wide. Two on screen stack either side of
  the line — question above, answer below. **Never three:** past about 20px of
  type a bubble is litter rather than distance, so the label is culled while
  its orb is still drawn.
- Orbs leave **by the left edge**, not by swelling through the lens.

## Props

| prop       | default      |
|------------|--------------|
| labels     | five, every other orb bare |
| gap        | 0.63         |
| speed      | 0.032        |
| focal      | 2.2          |
| vanish     | 0.56         |
| offset     | 0.135        |
| near       | 0.55         |
| focus      | 2.6          |
| blur       | 3.4          |
| orb        | 210          |
| size       | 21           |
| color      | INK          |
| bubble     | "#ffffff"    |
| accent     | ORANGE       |
| background | BONE         |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**This template used to scatter the orbs.** Each one got a random x and y
inside a `wander` box, which is the obvious way to build a "crowd of spheres"
and is not what the film does — it piled them into a blob in the middle of the
frame with no depth in it at all. `wander` and its `seed` are gone; `vanish`
and `offset` replace them, and the chain is now a straight line in 3D drawn
through the same divide as the sizes.

The projection is that real divide, `focal / z`, not a lerp between two sizes.
A lerp makes the far orbs approach at the same rate as the near ones and the
shot goes flat; the divide gives the acceleration you can see in the reference
for free, because it is the arithmetic a camera does.

The row is as long as the shot needs, not as long as `labels` is: `count`
comes out of `duration * speed + far`, and labels repeat around it. A fixed row
runs out part-way through and the film walks into an empty room.

The bubble's scale is **clamped** at `k = 2.4` while the orb's is not. A sphere
1.4 frame heights across is a wash of colour off the left edge and reads fine;
a sentence at that scale is a grey smear across the whole frame.
