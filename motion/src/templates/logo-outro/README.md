# logo-outro

The end card. The mark is already there, centred, when the shot opens; it
lifts to make room, the tagline lands under it a word at a time with a breath
at the comma, the call to action drops in last, and then it holds.

1920x1080, 30 fps, 95 frames.

    npx remotion render logo-outro src/templates/logo-outro/out/logo-outro.mp4

## Reference

f1921-f2052, the last four seconds, on this shot's clock f1930 is frame 0.
Measured off f1917-2052 (dark-row runs and darkest-percentile colours at
2880 wide; like-for-like checks with both clips at 1920).
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **Flat bone ground, no gradient at all** — 99.7% of the pixels in f1990 are
  one colour, which is the point of it after sixty seconds of gradient.
- The mark cuts in at f1921 with no entrance of its own; its centre sits on
  y 0.500 until f1953, then lifts to 0.392 over twenty frames, ease-out.
- The tagline lands with its centre on 0.523 and drifts up to 0.498 over
  sixteen frames: "Your" f1959, "mind," f1962, "now" f1981, "on" f1985,
  "demand" f1990. The CTA (box y 0.577-0.667) is in over f1999-2005 and
  nothing moves after that.
- Cap height of the mark is 0.052 of the frame (f1940, rows 0.467-0.519).
  The ink is #361f11 (mark, f1940) and #361e0f (tagline, f2040): one warm
  brown, not the palette's INK. CTA fill #f04a07 with #fefdf6 text (f2040).
- This render, frame 90 against f2040: mark centre 0.391 against 0.3925,
  tagline rows 0.477-0.526 against 0.474-0.521 and x 0.312-0.687 against
  0.317-0.681, CTA rows 0.576-0.669 against 0.576-0.668.

## Props

| prop        | default                    |
|-------------|----------------------------|
| mark        | "Motion"                   |
| tagline     | "Your mind, now on demand" |
| cta         | "Create yours now"         |
| liftAt      | 23                         |
| liftFrames  | 20                         |
| markY       | 0.392                      |
| taglineAt   | 29                         |
| wordStep    | 4                          |
| pause       | 15                         |
| wordFrames  | 6                          |
| settle      | 16                         |
| rise        | 27                         |
| taglineY    | 0.498                      |
| ctaAt       | 69                         |
| ctaFrames   | 6                          |
| ctaY        | 0.622                      |
| blur        | 14                         |
| markSize    | 0.071                      |
| taglineSize | 0.052                      |
| color       | "#361f11"                  |
| accent      | ORANGE                     |
| accentText  | PAPER                      |
| background  | BONE                       |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**The reference's wordmark is not reproduced.** The mark is whatever string
the caller passes and defaults to "Motion", set in the UI face; the tagline
and CTA copy are the repo's placeholder. Its width and height are therefore
not comparable to the reference's mark, which carries a descender (dark rows
0.067 of the frame against a 0.052 cap).

The mark cuts in nine frames before the previous shot's wash has finished in
the reference; here it is simply there at frame 0.
