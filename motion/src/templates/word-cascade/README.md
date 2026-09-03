# word-cascade

A sentence assembling itself a piece at a time, each piece arriving out of
focus and slightly low and settling — then the whole block shrinking and
blurring away at the end.

1920x1080, 30 fps, 100 frames.

    npx remotion render word-cascade src/templates/word-cascade/out/word-cascade.mp4

## Reference

Three shots, same mechanic at three granularities: per word f14-f38 ("You've
got knowledge"), per letter f188-f212 ("Gone"), per line f1789-f1870 ("So you
never miss the conversation / that could change").
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **4 frames between pieces, 8 frames per piece.**
- **The line does not re-centre as it grows; the block lifts.** Ink over luma
  140 at 960 wide: "You've" alone has its left edge at 0.263 of W from f17,
  and that edge is still at 0.254-0.263 at f31 with "got" beside it (right
  edge 0.732 from f21). The finished line's width is reserved from the first
  word, so every unit is laid out from frame 0 and an unarrived one is merely
  invisible. What moves is the whole block, once, upward: its top runs
  0.400 -> 0.294 of H over f18-f31, decelerating — 0.26 / 0.41 / 0.49 / 0.58
  / 0.68 / 0.75 / 0.82 / 0.88 / 0.91 / 0.92 / 0.96 / 0.98 / 1.00 of the way
  at f19-f31. The block starts centred on its first line and lifts to centred
  on the whole; ease-out cubic over 16 frames fits that to rmse 0.033
  (ease-out quad over 12: 0.046). The lift starts one frame after the first
  word shows ink (f17), four after it starts arriving — `liftAt` 10 with `at`
  6. This README used to say the opposite, that the reference re-centred
  "You've" alone at f20 and the pair at f24, and the template laid out only
  the arrived units on that basis. It was never measured. What that did was
  re-centre the flex row in a single frame each time a unit joined: 163 px
  sideways at f10 and 150 px up at f14, both between one frame and the next.
  Measured after the change, the left edge holds 0.263 from f11 and the block
  top moves in steps of 0.026, 0.023, 0.018, 0.017, 0.013 ... 0.002 of H over
  f10-f23; the reference's largest step is 0.028.
- Entrance: 18 px of blur and 14 px of rise, ease-out cubic.
- **No push-in.** The block's width is 0.518 of W at every frame from f25 to
  f31 (`extent`); `scaleFrom` is 1. It used to be 0.9.
- **Exit over 7 frames.** From f33 the block shrinks, blurs and fades:
  0.987, 0.977, 0.956, 0.926, 0.890, 0.832, 0.756 of its settled width at
  f33-f39, gone at f40 — an ease-in cubic to about 0.6 with the opacity on
  the same curve. Here it runs at the end of the shot and finishes 8 frames
  before the last one, so a cut lands on the empty ground.
- **Word gap 0.105em.** 0.024 of W ink to ink between "You've" and "got" at
  f32; 0.26em rendered 0.044 and 0.17em 0.033 (the e and the g carry 0.009
  of W of side bearing between them), 0.105em renders 0.025. The words
  themselves are narrower in our face — "You've" 0.292 of W against 0.316,
  "knowledge" 0.506 against 0.518.
- **The ground is lit from the floor.** `vprof` f33 at x 0.0-0.1: flat COCOA
  down to 0.63 of H, then #2a1807 #351d0a #44250e #593114 #643617 at
  0.70/0.78/0.85/0.93/1.0; #75401c at the bottom centre and #623616 at the
  bottom corners (9x18 grid). One ramp, brightest at the bottom centre, only
  a little dimmer at the corners: a wide flat radial ellipse.

## Props

| prop        | default                                                       |
|-------------|---------------------------------------------------------------|
| text        | "You've got\nknowledge"                                       |
| unit        | "word"                                                        |
| step        | 4                                                             |
| frames      | 8                                                             |
| at          | 6                                                             |
| liftAt      | 10                                                            |
| liftFrames  | 16                                                            |
| blur        | 18                                                            |
| rise        | 14                                                            |
| accent      | ""                                                            |
| face        | "serif"                                                       |
| size        | 0.247                                                         |
| scaleFrom   | 1                                                             |
| leaveFrames | 7                                                             |
| color       | PAPER                                                         |
| accentColor | ORANGE                                                        |
| background  | radial-gradient(ellipse 200% 33% at 50% 100%, #75401c, COCOA) |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

`unit` is what makes this one template instead of three — the three reference
shots are the same curve at letter, word and line granularity. Having built
one you would only ever change them together.

The reference exits at f40 and the next shot pushes in over it; the film cuts
these two together, so the exit here ends on the empty ground instead. The
leading is right (47 px between the lines' ink against 44) but the caps are
1.28x the reference's at equal line width — that is the face, the documented
substitution. The lift inherits it: half a line box is 0.106 of H in the
reference and 0.144 here, because the line box is the face's em and ours is
the bigger em at the same line width.
