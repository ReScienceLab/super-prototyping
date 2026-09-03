# bokeh-orbit

A ring of out-of-focus beads turning around a word, the near half passing in
front of it, the whole thing pushed in from small and lifted out at the end.

1920x1080, 30 fps, 90 frames.

    npx remotion render bokeh-orbit src/templates/bokeh-orbit/out/bokeh-orbit.mp4

## Reference

f268-f306, "Chaos" on the dark ground.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

Bounding boxes of everything brighter than lum 110, and of the word alone:

- **It pops in small and pushes in.** f267 is empty ground; at f268 the ring
  is there, 0.30 of W across, with the word a soft blob inside it. The ring
  grows 0.30 -> 0.40 -> 0.49 -> 0.56 -> 0.63 -> 0.70 -> 0.75 -> 0.81 -> 0.83
  -> 0.85 -> 0.87 of W at f268/270/272/274/276/278/280/282/284/286/290, the
  word 0.258 -> 0.285 -> 0.307 -> 0.325 -> 0.378 at f274/276/278/280/295.
  Both fit one quad ease-out over 22 frames from 0.35-0.40 of rest size
  (`zoomFrom` 0.38, `zoomFrames` 22). There is no fade-up: the ring is at
  full strength on its first frame. The word is sharp from about f276.
- **The ring fits the frame side to side.** At f284 the beads sit on an
  ellipse centred on the frame, 0.385 of W (0.685 of H) across and about
  0.57 of H high: the left arc is at x 0.11 for y 0.32-0.52 and pulls in to
  0.17 at y 0.15 and 0.21 at y 0.85. Top and bottom run off the frame, left
  and right do not (`radius` 0.69, `tilt` 0.83). `radius: 0.9` ran the ring
  off all four sides.
- **The near side is the bottom.** Beads at the bottom of the frame are the
  big ones — lum>70 blobs at f280 have a median area of 282 px in the
  bottom third and 165 in the top — so the bottom half passes in front of
  the word.
- **The arcs are a band, not a line**: 0.06 of W thick at f284 against
  beads of 0.025-0.035, about two beads wide, and about 20 beads on each
  visible arc.
- **260 frames per turn** — slow enough that a 90-frame shot sees about a
  third of a rotation.
- The near half is roughly a third as defocused as the far half.
- Bead colour, a census of every pixel brighter than lum 120 outside the
  word at f284: #e4ccb4 and #ccb49c in the cores, #b49c84 and #9c846c
  around them, #9c6c54 where the halo meets the ground. Cream and tan. The
  median of that census is #ccb49c; bead opacity 0.35-0.85 rendered #b19e83
  and 0.5-1.0 renders #baa88b.
- **Exit: it lifts and fades.** The word's top goes 0.399 -> 0.388 -> 0.378
  -> 0.365 -> 0.350 of H at f295/300/301/302/303 and is gone by f305; the
  whole scene moves with it, -5, -10, -16, -21, -32, -43, -53, -75, -112
  px/frame at f298-f306 (0.23 of H by f306), a quad ease-in. Here the lift
  runs 9 frames and finishes 6 before the last one.
- The ground: `vprof` f295 at x 0.4-0.6 is flat COCOA to 0.72 of H, then
  #251506 #2b1908 #37200d #3f2611 #4a2c16 at 0.76/0.83/0.91/0.94/1.0 — the
  dim floor glow, the same ramp as word-swap's.

## Props

| prop        | default                                                                    |
|-------------|----------------------------------------------------------------------------|
| word        | "Chaos"                                                                    |
| count       | 64                                                                         |
| radius      | 0.69                                                                       |
| tilt        | 0.83                                                                       |
| period      | 260                                                                        |
| bead        | 0.13                                                                       |
| blur        | 34                                                                         |
| seed        | "chaos"                                                                    |
| zoomFrom    | 0.38                                                                       |
| zoomFrames  | 22                                                                         |
| leaveFrames | 9                                                                          |
| size        | 0.3                                                                        |
| color       | PAPER                                                                      |
| background  | radial-gradient(ellipse 105% 26% at 50% 100%, #4a2c15, #2f1c0a 60%, COCOA) |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The front/behind split is done by rendering the ring twice with the word
between the two passes. A single list sorted by depth is one stacking context
and cannot straddle the text however it sorts. Bead spacing, radius and size
all carry a seeded jitter: an even ring reads as a bead necklace, and the
reference ring is visibly broken and clumped.

This template used to say the ring was bigger than the frame and that the
top beads were the small ones; the first was a guess that ran the ring off
every edge, the second had the ring's near side at the top. Both are
reversed above with the numbers that reverse them.

The beads are the lib `Orb` with its `background` overridden; the lib's
orange is the f1300 sphere, not these. The reference beads also dim after
about f286 while the word stays; that is left alone.

The reference's push-in and lift are the shot's own entrance and exit; the
film cuts shots together with no dissolve, so the lift here ends on the
empty ground rather than under the next shot.
