# orb-bloom

A huge back-lit sphere slides in from the left over a flat peach ground while
a row of serif chips lands on it one at a time; the chips then leave straight
up.

1920x1080, 30 fps, 90 frames.

    npx remotion render orb-bloom src/templates/orb-bloom/out/orb-bloom.mp4

## Reference

f1283-f1340, "piece by piece".
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **The sphere does not bloom, it slides in from the left.** Its dark body's
  right edge is at 0.22 of the frame width on the cut (f1283), then 0.33,
  0.50, 0.63, 0.72, 0.80, 0.86, 0.90, 0.93 w at f1285, f1286, f1289, f1292,
  f1295, f1298, f1303, f1310, where it stays: an ease-out cubic over 27
  frames. At rest it is centred at (0.46 w, 0.54 h) with a radius of 0.95 h
  (circle fit through its top, right and bottom edges at f1310), so the
  corners of the frame are ground.
- **The ground is flat peach**, `#f0aa7b` at right-mid f1300 (std 0.7 across
  the cell); corners `#f1ab7e`, `#f1b37f`, `#ee9a6f`, `#d97f66`. Not a mesh.
- **Shading, f1310**, as a fraction of the height from the centre: lit from
  the lower left — `#d25829` at 0.40 toward 180°, `#cb4815` at 0.35-0.45
  toward 225°, `#bd3d24` at the centre, `#b22815` low right, `#830816` at the
  top of the x=0.6 w column, `#740210` at 0.60 toward 45°. A peach rim
  (`#f1b988` at 0.80 toward 180°, `#efac79` at 0.75 toward 135°, `#e5b485` at
  0.95 toward 0°) is wide on the left and upper left and a sliver on the
  right. A grid fit of a ring (centre offset, ramp start, ramp width) to
  twelve peach-fraction samples of f1310 puts the ring's centre 0.08 R right
  of the sphere's and level with it, ramping over 0.67-0.87 R (rss 0.25; an
  ellipse fits no better). The dark body ends at 0.93 w on the right.
- **Chips**: bullets 79 px across at 1920, "piece" 141 px wide, "by" 69,
  29 px between bullet and word, chip centres at 0.275, 0.509, 0.75 w on
  0.5 h. A bullet's mean colour by radius from its centre at 1920: `#f57873`,
  `#f58780` at 13 px, `#f69990` at 20, `#f7a79d` at 24, `#f8b2a6` at 28 (its
  palest ring), `#ee9d88` at 32, `#e79177` at 36, `#e68d6e` at 40, `#df825c`
  at 47, the body's `#d1592b` by 56. It is never white: 1312 px above luma
  225 in a 120 px crop, none with a channel minimum above 212.
- Chips land at **f1283, f1286, f1292**, about five frames each (white pixel
  count in each chip's band: 490, 1712, 2867, 4770 over f1285-f1289 for the
  first).
- From **f1316 they leave straight up**, no fade, no drift: the first is
  0.042, 0.138, 0.26, 0.353 h up at +10, +16, +20, +22 (ease-in cubic, 0.46 h
  at +24), "by" travels 1.39x that and the last chip 0.72x.

## Props

| prop        | default                  |
|-------------|--------------------------|
| chips       | ["piece", "by", "piece"] |
| x           | 0.46                     |
| y           | 0.54                     |
| radius      | 0.95                     |
| from        | 0.28                     |
| at          | 0                        |
| slideFrames | 27                       |
| chipAt      | 0                        |
| chipStep    | 4                        |
| chipFrames  | 6                        |
| exitAt      | 33                       |
| exitFrames  | 30                       |
| exit        | 0.9                      |
| size        | 0.077                    |
| color       | PAPER                    |
| background  | "#f0aa7b"                |

`durationInFrames` is optional on every template in this set and is what a cut
passes in; left out, the composition's own length is used so the template stays
scrubbable on its own. See `src/lib/README.md`.

## Deviations

The sphere is drawn here, not with the shared `Orb`: `Orb` is front-lit (its
highlight is a pale spot at upper left over an orange body), and this one is
back-lit from the lower left with a peach rim. Body: an ellipse 1 R by 1.5 R
centred at 20% 75% of the sphere's box, stops at 35/68/86/112/125% of R. Rim:
a circle of R centred at 54% 50%, transparent to 70%, peach by 88% — the fit
said 67-87%; 70-88% puts the dark body's right edge at 0.93 w as measured
(the earlier 80-92% at 56% 56% put it at 0.98 and read `#a84e43` where the
clip reads `#e5b385`; now `#eeb486`).

`from` is the sphere's geometric right edge on frame 0; the dark body ends
0.06 w inside it, at the 0.22 measured. The reference cuts in with the sphere
already moving, and so does the template.

The bullet is drawn on a 1.4em box pulled back to 0.96em by its margin, with
`closest-side` sizing, so the glow to 56 px is part of the gradient and the
word still sits 29 px off the 79 px disc. The first version used the
default farthest-corner size, which made every stop 1.41x too wide, and a
white stop the clip does not have.

The chips' exit is 0.9 h over 30 frames (0.46 h at +24 measured, same curve
carried on) so every chip is off the top by frame 63 with the sphere holding
after. The reference instead crossfades the ground to red from about f1326
and drops the sphere out of the bottom of the frame over f1336-f1340 into the
next shot; that is a transition, not this shot, and is not here.

Chip size matches the reference's width, not its height: "piece" is 141 px
wide and 63 tall there, and Instrument Serif at 0.077 sets it 141 wide and
~76 tall. The reference's serif runs shorter per width.
