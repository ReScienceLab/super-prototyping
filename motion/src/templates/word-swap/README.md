# word-swap

A settled line opens a gap, the word beside it changes on a single frame, and a
sphere drops into the space that just appeared.

1920x1080, 30 fps, 75 frames.

    npx remotion render word-swap src/templates/word-swap/out/word-swap.mp4

## Reference

f213-f228, "Your time?" -> "Your (orb) inbox?".
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

Sampled at one frame per tile, because the part that matters is one frame wide:

    python3 tools/motionkit.py sheet <clip> --from 213 --to 228 --count 16

- f213-f214 settled; **f215-f220** the gap opens, the line staying centred so
  both words travel outward by the same amount; **f220 -> f221** the word
  changes, on one frame, with no crossfade, blur or rise; **f222-f228** the
  sphere fades up in the gap.
- Gap about 0.22 of the frame height, sphere about 0.19 — the sphere clears
  both words, but only just.

## Props

| prop       | default    |
|------------|------------|
| prefix     | "Your"     |
| before     | "notes?"   |
| after      | "answers?" |
| at         | 18         |
| gapFrames  | 6          |
| gap        | 0.22       |
| orbFrames  | 7          |
| orb        | 0.19       |
| size       | 0.115      |
| color      | PAPER      |
| background | COCOA      |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**This template used to be the wrong effect.** It crossfaded the two words past
each other, blurred and lifting, over a line held still — a plausible thing to
build from memory, and not what the film does. Measuring the shot at one frame
per tile is what showed the cut. It is kept here because the mistake is the
argument for the rule: a crossfade reads as two words dissolving into one
another, and a cut on the frame the gap finishes opening reads as the line
making room for a different word.

`orb: 0` leaves the gap empty, which is the same mechanic without the sphere.
