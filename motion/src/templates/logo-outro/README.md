# logo-outro

The end card. A mark, a line under it, a call to action, each arriving on the
same entrance one after another, and then it holds.

1920x1080, 30 fps, 95 frames.

    npx remotion render logo-outro src/templates/logo-outro/out/logo-outro.mp4

## Reference

f1990-f2052, the last two seconds.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **Flat bone ground, no gradient at all** — 99.7% of the pixels in f1990 are
  one colour, which is the point of it after sixty seconds of gradient.
- 10 frames between the three lines, 14 frames each.
- Everything has landed by frame 40 of 95; the rest of the shot is
  deliberately still, because a film must not end on something that is still
  settling.

## Props

| prop        | default                    |
|-------------|----------------------------|
| mark        | "Motion"                   |
| tagline     | "Your mind, now on demand" |
| cta         | "Create yours now"         |
| at          | 6                          |
| step        | 10                         |
| frames      | 14                         |
| blur        | 14                         |
| rise        | 16                         |
| scaleFrom   | 0.94                       |
| markSize    | 0.062                      |
| taglineSize | 0.03                       |
| color       | INK                        |
| accent      | ORANGE                     |
| accentText  | PAPER                      |
| background  | BONE                       |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**The reference's wordmark is not reproduced.** The mark is whatever string
the caller passes and defaults to "Motion"; what this template replicates is
the arrival.
