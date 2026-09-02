# lens-reveal

A tilted oval aperture with a bright rim opens out of nothing and swallows the
frame, with a caption inside it.

1920x1080, 30 fps, 90 frames.

    npx remotion render lens-reveal src/templates/lens-reveal/out/lens-reveal.mp4

## Reference

f1610-f1660 — a white lens shape over a portrait, tipped about 18 deg off
horizontal, growing until its rim runs off every edge.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **54 frames**, from about 6% of the frame width to 115% of it.
- **Ease-in**, which is the one place in the set that does not use the film's
  ease-out. An aperture that opens fast and creeps to a halt spends five
  sixths of the shot as a full-frame wash with no lens in it; the reference
  holds a readable oval for most of the move and lets it accelerate off every
  edge at the end.

## Props

| prop          | default                                        |
|---------------|------------------------------------------------|
| caption       | "whatever you want"                            |
| reveal        | `linear-gradient(150deg, ${GRADIENT[4]}, ${... |
| frames        | 54                                             |
| from          | 0.06                                           |
| to            | 1.15                                           |
| aspect        | 0.62                                           |
| tilt          | -18                                            |
| rim           | 40                                             |
| rimColor      | "rgba(255,255,255,0.9)"                        |
| captionAt     | 34                                             |
| captionFrames | 16                                             |
| size          | 0.055                                          |
| color         | PAPER                                          |
| background    | COCOA                                          |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The rim is why this is not just a `clip-path` animation: the aperture is drawn
twice, as an oval carrying the rim in a large `box-shadow` spread and as the
same ellipse in a `clipPath` on the content. Both take the same progress, so
the rim cannot drift off the edge it is tracing. The revealed layer is a
gradient, not the reference's footage.
