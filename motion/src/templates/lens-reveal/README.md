# lens-reveal

A tall oval aperture with a soft white rim pops open in the middle of a dark
frame, turns as it grows, and swallows the frame in seven frames. A caption
then lands inside it a word at a time.

1920x1080, 30 fps, 90 frames.

    npx remotion render lens-reveal src/templates/lens-reveal/out/lens-reveal.mp4

## Reference

f1632-f1700 — a white-rimmed oval over footage, portrait, turning as it opens,
off every edge by f1638; then a one-line caption. Off the largest bright
connected component per frame (rim luminance > 250) and the f1635-1638 crops.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **Seven frames**, f1632-1638, each x1.4-1.6 the last: the outer semi-axis is
  0.19 / 0.26 / 0.33 / 0.48 of the frame height at f1634-1637. A geometric
  ramp that quickens (`t^1.5` on the exponent), not an ease.
- Portrait, height/width 1.57 (f1634: 0.377 x 0.243; f1635: 0.523 x 0.332),
  and it turns as it opens: upright at f1634, top leaning right 25 deg at
  f1636, 40 at f1637, 55 at f1638.
- The rim is a soft white band about 0.15 of the oval's width, hard on the
  inside and feathered outward, #fefefe at its brightest (f1636).
- The dark ground has a **floor glow**: column means at f1630, x 0.30-0.40,
  are #deab7d / #c79870 / #a07a58 / #6c5036 / #402b18 at y 0.995 / 0.924 /
  0.852 / 0.78 / 0.708 and cocoa above 0.60; #997656 at the bottom corners,
  which puts the ellipse's horizontal radius at 1.04 widths. Same at f1626 and
  outside the oval at f1634.
- The footage is brown before the cut (mean #745036 at f1645, #90592f at
  f1660) and pink by f1685: centre #dfa49d, top corners #d9bab2 / #f2dfd6,
  bottom #d88171 / #de8d79.
- The caption is 0.271 of the frame wide at f1685 (`extent`, both clips at
  1920), its core #f5c4c5 on a #e4aba5 ground. This render is 0.269 wide at
  frames 25 and 60.

## Props

| prop       | default                                                 |
|------------|---------------------------------------------------------|
| caption    | "whatever you want"                                     |
| reveal     | `linear-gradient(180deg, #e5ccc4, #dfa49d 45%, ...)`    |
| at         | 6                                                       |
| frames     | 7                                                       |
| from       | 0.035                                                   |
| to         | 0.62                                                    |
| aspect     | 1.57                                                    |
| tilt       | 60                                                      |
| rim        | 0.15                                                    |
| rimColor   | "#fefefe"                                               |
| captionAt  | 13                                                      |
| wordStep   | 3                                                       |
| wordFrames | 4                                                       |
| size       | 0.078                                                   |
| color      | "#f5c4c5"                                               |
| background | `radial-gradient(ellipse 104% 37% at 50% 100%, ...)`    |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

**This used to be a 54-frame ease-in landscape oval** tipped 18 degrees
that grew to 1.15 widths; the reference is a seven-frame portrait pop that
turns. `captionFrames` is gone; `wordStep` and `wordFrames` replace it.

The rim is why this is not just a `clip-path` animation: the aperture is
drawn twice, as a blurred white oval one rim wider than it underneath, and as
the same ellipse in a `clipPath` on the content on top. Both take the same
radii, so the rim cannot drift off the edge it is tracing. It was a
`box-shadow` spread before; Chrome tiles a shadow blurred by hundreds of
pixels into a visible checkerboard.

The revealed layer is a static stand-in sampled at f1685, not the footage,
which goes brown to pink over f1670-1685. The reference's pre-pop shot with
its own caption is not here.

The caption's height is not matched: the reference line is 0.035 of the frame
tall for its 0.271 width and this face is 0.044 at the same width (`extent`).
The floor glow is applied here through `background`; the shared palette has
no such value.
