# mesh-gradient

The warm ground the reference film puts under its opening shots: a crimson
vertical ramp with a hard diagonal light band sliding across it and easing to
a stop.

1920x1080, 30 fps, 120 frames.

    npx remotion render mesh-gradient src/templates/mesh-gradient/out/mesh-gradient.mp4

## Reference

Throughout, but fitted on f1172-f1280 — the percentage shot, which holds still
long enough to fit a curve to.
The source clip is not committed; see `src/lib/README.md` for what is measured,
what is substituted, and how to reproduce any number below.

- **Band angle 35 deg**, constant. Luminance-weighted centroid per row gives
  dx/dy = +1.43 at f1180 and +1.43 again at f1260.
- **It rests off centre, at 0.423 W**, not in the middle of the frame. Profile
  of the middle 24 rows, blurred hard enough to erase the numerals: the peak is
  at 0.425 / 0.424 / 0.420 W at f1220 / f1240 / f1260.
- **It is not symmetric.** Half-height edges at -0.345 W and +0.220 W of the
  peak on those same frames: a long tail reaching into the left of the frame, a
  hard edge on the right, and plain crimson ground again by 0.75 W.
- **It has a flat shoulder, and the two sides fall differently.** Normalised
  middle-row profile of f1220, sampled every 0.05 W:

      0.26 0.39 0.57 0.77 0.91 0.91 0.97 0.98 0.98 0.99 0.96 0.84 0.59 0.45
      0.36 0.24 0.11 0.04 0.00 0.00

  It holds 0.91-0.99 all the way from 0.20 W to 0.50 W, reaches the ground at
  -0.10 W and 0.90 W, and in units of those two distances the left is still at
  0.27 nine tenths of the way out while the right is under 0.10 by eight
  tenths. Three stops -- transparent, solid, transparent -- draw a triangle
  instead, which is a specular streak with a point on it and not a light.
- **Band travel 0.196 W, leftward**: the peak starts at 0.619 W at f1172.
- **40 frames, ease-out cubic.** Fitting `T(1-t)^3` to the offsets at f1176,
  f1180 and f1192 gives 36, 40 and 31 frames.
- **Band body #f7c2a2**, near enough constant over all eleven frames sampled
  (#f7bf9f at f1172 to #f7c7ab at f1260). That is GRADIENT[7] at full opacity,
  within 8/255 on R and 2 on G.
- **The ground off the band is one vertical ramp and nothing else.**
  `swatch --grid 16x9` at f1180, f1220 and f1260 reads #760010 #7f0011
  #8b0014 #960013 #9f0016 #ab0018 #b50018 #be001b #ca001c down the rows, the
  same in every column the band is not in, and identical on all three
  frames. There is no drifting blob anywhere in it: the only thing warmer
  than #ca001c is the band itself (#f4a574 body, #ffc4a1-#ffcdae hot spots
  inside it). Hence `blobs: []` and a `linear-gradient` for `base` —
  GRADIENT[0] to GRADIENT[2] over the top 83%, then on to #ca001c, which
  puts #a1 at mid-height against a measured #9f.

## Props

`GradientProps`, defined and documented in `src/lib/Gradient.tsx`:

| prop         | default                                                |
|--------------|--------------------------------------------------------|
| base         | linear-gradient(GRADIENT[0], GRADIENT[2] 83%, #ca001c) |
| blobs        | [] (none — see Reference)                              |
| bandAngle    | 35                                                     |
| bandRest     | -0.036                                                 |
| bandLeft     | 0.289                                                  |
| bandRight    | 0.266                                                  |
| bandTravel   | -0.109                                                 |
| bandFrames   | 40                                                     |
| bandOpacity  | 1                                                      |

`bandLeft` and `bandRight` are where the band reaches the ground, not its
half-height: `FALL_LEFT` and `FALL_RIGHT` in `lib/Gradient.tsx` shape what
happens in between, and with a shoulder on it the two stopped being the same
number.

Those band numbers are on the **gradient axis**, not on the frame; the
measurements above are fractions of frame width. One point of axis is 0.01803 W
at the middle row, and this render is the ruler for it — see `lib/Gradient.tsx`.
Re-measured after the conversion, it comes back at peak 0.423 W, edges -0.345
and +0.225, start 0.618 W, against the reference's 0.423 / -0.345 / +0.220 /
0.619. Re-measured again against the whole profile rather than three of its
points, the twenty samples above sit a mean 0.031 apart, worst 0.088; the
triangle they replaced sat a mean 0.059 apart, worst 0.21.

The one template in the set with **no `durationInFrames`**: the band eases out
over `bandFrames` and then holds, so there is no length for a cut to stretch.
Every other template takes the prop — see `src/lib/README.md`.

## Deviations

None left in this folder: `defaultProps` is `MESH` unchanged. It exists so the
ground is scrubbable and renderable on its own, which is how you check a change
to it without re-rendering nine other templates.

Three faults in the band were the lib's, and all three survived until the shots
were cut together, where a whole film of washed-pink frames made them obvious.
Each is now fixed in `lib/Gradient.tsx`, so every template that imports `MESH`
or `DIM` gets the fix:

- It rested at 50% of the frame and was symmetric about that, which lit the
  right side of every frame that should have gone back to crimson.
- It carried GRADIENT[7] at 0.85, which composites to #ec9c85 against a
  measured #f7c2a2. The hue was never wrong; the opacity was.
- It ramped straight to a point. Fixed last, and only visible once the first
  two were: with the peak, the floor and both half-height edges all matching to
  within 2%, the frame still read as a lens flare rather than a light, because
  the reference holds near full brightness across a third of the frame's width
  and a triangle of the same half-height is 0.29 down at the same place.

A fourth fault came out of fixing the third. `DIM`, the dimmer ground under
f1344-f1400, spreads `MESH`, so when the band stopped being a triangle its
`bandLeft` and `bandRight` changed meaning underneath it -- half-height widths
became ground-crossings -- and its band roughly doubled without anything in
that preset being edited. It is re-fitted, by a different method: this shot
never has an empty frame (the particle figure and the type block are in it
throughout, and even f1400 carries their bloom), so instead of the middle row
it bins every pixel by where it sits along the band's own axis and masks out
anything whitish, which leaves 83% of f1370 as ground. That fits to an rmse of
1.2 luma, against the 30-50 the inherited numbers were out by.

What `DIM` still does not have is the reference's second light. Past
t = -0.30 on that axis -- the bottom-left corner -- f1370 climbs to 140 while
the band's shoulder stays flat at 105, and the corner averages #bd6a6f where
ours reads #d0313c. Blue equal to green there means the light is neutral, and
every stop in GRADIENT is warm; backing it out of the base wants about #bbb1a8
at 0.6 alpha, a colour this palette does not contain. It is left out rather
than guessed at. Everywhere else the two grounds agree to 4 luma.

Scrubbed alone, none of these read as wrong -- there was nothing in frame
to be too pink *against*.

`MESH` also carried five drifting blobs, fitted to f1300, a shot no template
using this ground is on; under this band they put a pink wash (#e78876,
#db6e61 at our f50) and darkened corners where f1220 is plain crimson. They
started as this folder's local override and are now deleted from the lib.

The reading that put the band's body at #f4a574 (GRADIENT[5]) was a mean across
its width, not its centreline; both are true, and it is the centreline that a
CSS gradient stop takes.
