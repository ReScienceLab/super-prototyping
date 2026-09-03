# word-swap

A settled line opens a gap, the word beside it changes on a single frame while
the gap is still opening, and a sphere grows into the space.

1920x1080, 30 fps, 75 frames.

    npx remotion render word-swap src/templates/word-swap/out/word-swap.mp4

## Reference

f213-f250, "Your time?" -> "Your (orb) inbox?".
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

Sampled at one frame per tile, because the part that matters is one frame wide:

    python3 tools/motionkit.py sheet <clip> --from 213 --to 228 --count 16

Inner edges of the two words as fractions of W (ink runs at lum>150 in a row
at y 0.47-0.53):

- **f213-f214 settled**: "Your" 0.328-0.422, "time?" from 0.440. The line is
  not centred (its centre is 0.437), because it will not be centred when it
  is done either — the gap is.
- **f215-f220 the outgoing word accelerates**: 0.440 -> 0.446 -> 0.454 ->
  0.465 -> 0.481 -> 0.505, a quad ease-in over 6 frames.
- **f220 -> f221 the word changes, on one frame**, no crossfade, blur or
  rise. "inbox?" starts at 0.540 — halfway along its total travel — and
  decelerates: 0.568 -> 0.597 -> 0.613 -> 0.625 at f222/225/228/232, at rest
  about 0.640. A cubic ease-out over 20 frames.
- **"Your" moves too, but a third as far**: 0.422 -> 0.409 (f221) -> 0.385
  -> 0.375 -> 0.370 at f225/228/232; 0.062 of W against the right word's
  0.200. Splitting the opening 0.23/0.77 with the same two eases (0.3 of the
  way at the cut on the left, 0.5 on the right) reproduces every reading
  above to within 0.008 of W, including the off-centre start.
- **Gap 0.28 of W = 0.50 of H** at rest (0.360 to 0.640), centred on the
  sphere at 0.500.
- **Sphere 0.256 of H** (0.144 of W at f250), and it grows from a quarter of
  that: bbox 0.042 -> 0.069 -> 0.082 -> 0.091 -> 0.099 -> 0.110 -> 0.126 ->
  0.135 -> 0.140 -> 0.144 of W at f222/223/224/225/226/228/232/236/240/250,
  a 26-frame ease-out from 0.25.
- Sphere colour, sampled at f228: #6b3817 centre, #5d3618 top, #744320
  sides, #904d27 bottom — a dark matte ball lit from the floor.
- "Your" is 0.095 of W wide at f213; `size` 0.115 gave 0.104, 0.105 gives it.
- The ground: `vprof` f228 at x 0.4-0.6 is flat COCOA to 0.72 of H, then
  #251506 #2b1908 #37200d #3f2611 #4a2c15 at 0.76/0.83/0.91/0.94/1.0, with
  #37210d at the bottom corners — the dim floor glow, about a third of the
  one under word-cascade.

## Props

| prop         | default                                                                    |
|--------------|----------------------------------------------------------------------------|
| prefix       | "Your"                                                                     |
| before       | "notes?"                                                                   |
| after        | "answers?"                                                                 |
| at           | 18                                                                         |
| gapFrames    | 6                                                                          |
| settleFrames | 20                                                                         |
| gap          | 0.5                                                                        |
| orbFrames    | 26                                                                         |
| orb          | 0.25                                                                       |
| size         | 0.105                                                                      |
| color        | PAPER                                                                      |
| background   | radial-gradient(ellipse 105% 26% at 50% 100%, #4a2c15, #2f1c0a 60%, COCOA) |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**This template used to be the wrong effect, twice.** First it crossfaded the
two words past each other, blurred and lifting, over a line held still — a
plausible thing to build from memory, and not what the film does. Then it
had the cut, but on the frame the gap finished opening, with both words
travelling outward equally from a centred line, a 0.22 gap and a 0.19
sphere that faded up in 7 frames — none of which is in the numbers above.
The cut lands a third of the way into the opening: the outgoing word is
thrown, the incoming one is caught, and the sphere pops in at a quarter size
and grows for 26 frames. It is kept here because the mistakes are the
argument for the rule: measure, at one frame per tile.

The sphere is the lib `Orb` with its `background` overridden; the lib's
orange highlight is the f1300 sphere, not this one.

`orb: 0` leaves the gap empty, which is the same mechanic without the sphere.
