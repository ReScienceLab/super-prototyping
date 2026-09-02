# word-swap

One word in a settled line is replaced in place. The outgoing word blurs and
lifts away, the incoming one blurs and lifts in behind it, and the line around
them never moves.

1920x1080, 30 fps, 75 frames.

    npx remotion render word-swap src/templates/word-swap/out/word-swap.mp4

## Reference

f1700-f1730, "So you never miss a moment" -> "the conversation".
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **14 frames**, starting f1718.
- Travel 34 px: out goes up, in comes up from below.
- The swapped-in word arrives **italic** in the display serif while the line
  around it stays roman, which is most of the reason the swap reads at all at
  this speed.

## Props

| prop       | default              |
|------------|----------------------|
| prefix     | "So you never miss " |
| before     | "a moment"           |
| after      | "the conversation"   |
| suffix     | ""                   |
| at         | 18                   |
| frames     | 14                   |
| rise       | 34                   |
| blur       | 16                   |
| italic     | true                 |
| size       | 0.105                |
| color      | PAPER                |
| afterColor | GRADIENT[7]          |
| gradient   | MESH                 |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The line holding still is the constraint. Both words are absolutely positioned
over a third, invisible copy of the longer of the two, which is what actually
holds the space open; measuring the two words and interpolating the gap gives
a line that breathes on every swap.
