# text-marker

A highlight or a strike-through wiping across one run of a paragraph, left to
right, the way a person draws it.

1920x1080, 30 fps, 90 frames.

    npx remotion render text-marker src/templates/text-marker/out/text-marker.mp4

## Reference

f1056-f1072 — a sliver at the left of the run on f1057, the full run covered
by f1070.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **14 frames, ease-in-out.** The fill's column span on the marked line reads
  0% f1057, 4.5% f1058, 12.8% f1060, 39.4% f1061, 54.7% f1063, 76.1% f1064,
  93.1% f1067, 100% f1070: slow off the left, fast through the middle, slow
  into the right edge. `Easing.inOut(Easing.quad)` has 13% and 55% at those
  two points; the default ease-out cubic would have 40% and 88%. The run stays
  marked afterwards.
- Marker fill `#f0bead`, a crop census at f1064, f1075 and f1080 (`#efbead` at
  f1086). Marked text `#ef4a06` (`ORANGE`): the run's saturated pixels read
  `#d54a25`-`#de481c` at f1075, which is ORANGE under the fill's antialiasing.
- The run recolours *with* the wipe, not at the end of it.
- Curly apostrophes: the reference sets "isn’t" and "it’s", and the marked
  run has to match the text verbatim.

## Props

| prop          | default                         |
|---------------|---------------------------------|
| text          |                                 |
| mark          | "it’s about mastering yourself" |
| variant       | "highlight"                     |
| at            | 12                              |
| frames        | 14                              |
| markColor     | "#f0bead"                       |
| markTextColor | ORANGE                          |
| size          | 0.052                           |
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

The orange copy of the run is a block pinned to the inline's box and centred
in it, not `top: 0`: as a block it carries its own 1.5 line box, and pinned to
the top its glyphs sat half a leading below the ink copy's, so the dark ink
showed under the orange and the run read bold (film f458 against reference
f1068).

The reference's fill shimmers faintly while it holds (a few levels frame to
frame); the template's fill is flat.
