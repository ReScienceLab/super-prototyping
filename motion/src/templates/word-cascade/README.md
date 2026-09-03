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
- **The line re-centres as it grows.** The reference centres "You've" alone at
  f20 and "You've got" as a pair at f24 — the text shifts left. A piece that
  has not arrived yet therefore takes up *no space* and is not rendered at
  all; reserving the final width and fading pieces in gives a much deader
  shot.
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
shots together with no dissolve, so the exit here ends on the empty ground
instead. The leading is right (47 px between the lines' ink against 44) but
the caps are 1.28x the reference's at equal line width — that is the face,
the documented substitution.
