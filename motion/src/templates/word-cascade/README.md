# word-cascade

A sentence assembling itself a piece at a time, each piece arriving out of
focus and slightly low and settling.

1920x1080, 30 fps, 100 frames.

    npx remotion render word-cascade src/templates/word-cascade/out/word-cascade.mp4

## Reference

Three shots, same mechanic at three granularities: per word f20-f36 ("You've
got knowledge"), per letter f176-f242, per line f1330-f1400 ("Your digital
mind / is born").
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **4 frames between pieces, 8 frames per piece.**
- **The line re-centres as it grows.** The reference centres "You've" alone at
  f20 and "You've got" as a pair at f24 — the text shifts left. A piece that
  has not arrived yet therefore takes up *no space* and is not rendered at
  all; reserving the final width and fading pieces in gives a much deader
  shot.
- Entrance: 18 px of blur and 14 px of rise, ease-out cubic.

## Props

| prop        | default                 |
|-------------|-------------------------|
| text        | "You've got\nknowledge" |
| unit        | "word"                  |
| step        | 4                       |
| frames      | 8                       |
| at          | 6                       |
| blur        | 18                      |
| rise        | 14                      |
| accent      | ""                      |
| face        | "serif"                 |
| size        | 0.19                    |
| scaleFrom   | 0.9                     |
| color       | PAPER                   |
| accentColor | ORANGE                  |
| background  | COCOA                   |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

`unit` is what makes this one template instead of three — the three reference
shots are the same curve at letter, word and line granularity. Having built
one you would only ever change them together.
