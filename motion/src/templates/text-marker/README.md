# text-marker

A highlight or a strike-through wiping across one run of a paragraph, left to
right, the way a person draws it.

1920x1080, 30 fps, 90 frames.

    npx remotion render text-marker src/templates/text-marker/out/text-marker.mp4

## Reference

f1056-f1072 — a sliver at the left of the run on f1056, the full run covered
by f1072.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **16 frames**, and the run stays marked afterwards.
- Marker fill `#f6c0a6`, marked text `#ef4a06` (`ORANGE`), both off a crop
  census at f1064.
- The run recolours *with* the wipe, not at the end of it.

## Props

| prop          | default                         |
|---------------|---------------------------------|
| text          |                                 |
| mark          | "it's about mastering yourself" |
| variant       | "highlight"                     |
| at            | 12                              |
| frames        | 16                              |
| markColor     | "#f6c0a6"                       |
| markTextColor | ORANGE                          |
| size          | 0.038                           |
| color         | INK                             |
| background    | BONE                            |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The wipe is a `scaleX` from `transform-origin: left center`, not a width
animation: a width animation reflows the paragraph every frame and at 30 fps
you can watch the text twitch. `variant` covers both the highlight and the
strike, which are the same wipe with a different box height.
