# Stepwise, iOS

Two states of an iOS app called **Stepwise**, rebuilt from a 9.9 s screen
recording: the profile screen, and the "Pick your vibe" avatar sheet over it.
5 boards — the token board, two evidence boards and the two screens — plus 2
more that park the recording's own frames under each replica.

The recording is 2160 × 2160 at 30 fps, 297 frames. Two states hold still long
enough to measure: frames 1–23 are the profile, frames 43–223 are the sheet.
Frame 13 and frame 85 were picked by scoring frame-to-frame difference against
Laplacian variance rather than by eye.

| Board | Frame | Reference | px/pt |
| --- | --- | --- | --- |
| `01-profile` | 13 | `assets/refs/p1.png` 936 × 2029 | 2.381679 |
| `02-pick-your-vibe` | 85 | `assets/refs/p2.png` 1079 × 2339 | 2.745547 |

The camera zooms in from frame 24, at the same moment the sheet animates, so
there is no unzoomed sheet frame. The two references therefore sit at
different scales and each is normalised onto its own grid; every probe carries
its board's `pt`.

**The capture scale does not close to itself.** p1's phone rect is 936.07 ×
2017.70 px, which against 393 × 852 is 2.38185 px/pt across and 2.36819 down —
a 0.58% disagreement. That is under the skill's 1% recrop threshold and it is
a property of the artwork, not of the crop: no shipping iPhone has the 2.157
aspect this frame does (390 × 844 = 2.164 is the closest). Width is what both
references are normalised on, so vertical positions late in the screen carry
up to ~5 px of the source's own stretch.

## How close it lands

Mean absolute delta, whole frame, phone crop, in levels of 255, mine resampled
onto the reference's own pixel grid with the same 52 pt corner mask on both:

| Board | whole frame | less the excluded regions | what was excluded |
| --- | --- | --- | --- |
| `01-profile` | **7.24** | **3.38** (7.2% of the frame cut) | this repo's own artwork: the hero avatar, the app-stack tile glyph, the row-1 app-icon thumbnail |
| `02-pick-your-vibe` | **21.27** | **1.51** (56.3% of the frame cut) | the top 69.93 pt, which the recording does not contain; this repo's own artwork: the scrimmed hero avatar and the twelve grid faces |

**Read the second column, not the first.** Every face on these boards is
original art drawn for this repo rather than the source's illustration (see
*Substitutions*), so an avatar region diffs against a different picture. That
number measures the substitution, not the fidelity. On `02` the faces are more
than half the screen, which is why its whole-frame number is 21.27 and means
almost nothing.

Per region, the same metric:

| `01-profile` | Δ | | `02-pick-your-vibe` | Δ |
| --- | --- | --- | --- | --- |
| status bar | 1.40 | | above the sheet, below the avatar | 1.17 |
| name + dashed rule | 2.33 | | sheet foot | 0.88 |
| list under the fade | 3.26 | | sheet header | 2.43 |
| steps tile | 3.97 | | scrim beside the sheet | 6.64 |
| tab bar chip | 4.74 | | check badge | 23.06 |
| tab bar material | 5.81 | | *above the sheet (own-art avatar)* | *13.27* |
| Pro card | 6.60 | | *avatar grid (own art)* | *41.65* |
| settings list | 7.54 | | | |
| *apps tile (own-art icon)* | *9.62* | | | |
| shuffle badge | 16.14 | | | |
| *app-icon thumb (own art)* | *65.75* | | | |
| *hero avatar (own art)* | *72.54* | | | |

Italic rows are the substituted artwork and are excluded from every claim
above. Of the rest, three are worth naming:

- **`shuffle badge` 16.14** and the tab bar's two glyphs (`house` 17.85,
  `person` 16.47, measured on 32 × 32 pt boxes of their own) are small line
  glyphs redrawn from a run map at 2.38 px/pt. A 1.9 pt stroke that lands half
  a source pixel off scores in the teens over a box that is mostly stroke.
  Their ink boxes agree to within 1.7 pt (`refkit batch`: `shuffle` +0.4/−0.4,
  `house` +1.7/−0.4, `person` +0.4/+0.4).
- **`settings list` 7.54 and `Pro card` 6.60 are a type-width bill**, not
  layout. See *Substitutions*.
- **`check badge` 23.06** is a 27.7 pt green disc with a white tick. Both
  fills are exactly `#2DB150` and the box matches to 0.3 pt; what is left is
  the antialiased rim of a saturated disc in an h.264 frame, where the
  reference's own edge pixels swing 40 levels between frames.

The worst 20 px bands `refkit diff` reports on `01` are y 109–176 (the hero
avatar) and y 672–680 (a row label). The band report is a good way to find the
next thing to fix and a bad way to summarise: both of those are already
explained above.

### A caveat about `refkit diff --regions`

`--regions` does not score a region. It compares each region's **modal flat
fill** and returns before the whole-frame number, so it catches a wrong colour
and is blind to a wrong shape. On this folder every region but one reads 0 or
1 there while the means above run from 1.17 to 72.54. The per-region means in
the table come from a scratch script that applies `refkit diff`'s own formula
— mean over channels of `|mine − ref|`, masked where either input is
transparent — to each box; its whole-frame line reproduces `refkit diff`
exactly (7.24 and 21.27).

`--regions` still flags one box: **tab bar material**, mine `#FDFDFC` against
`#FEFCF8`, 4 levels apart on blue. The bar is a material, not a fill, so its
composite depends on what the faded list under it contributes; see *Fitted,
not read*.

## Substitutions, and what each costs

**Every avatar face is this repo's own original character art.** The source's
twelve faces are the designer's own illustrations. They are not reproduced,
traced, cropped or imitated here, and no "close variant" of one was drawn
either. What was measured and matched is the *design system* around them: the
flat black line on a white face, a 3-unit stroke on a 100-unit circle (2.78 pt
at the measured 92.7 pt circle), the ink box inside the circle, the circle
diameter, the pale ground `#FEFEFE`, the mono palette, and the grid pitch —
all of which `refkit batch` still probes (`avatar-fill`, `av-gap-row`,
`av-gap-col`, `hero`). The characters — face shapes, hair, accessories,
expressions — are invented, with a comparable spread of hairstyles and
accessories and no one-to-one correspondence with the source's set.

The cost is the two italic rows above, 72.54 and 41.65, and it is the whole
reason `02`'s frame number is meaningless. This is the honest trade and it is
stated here rather than hidden in a lower total.

**The "3 apps added" tile's icon is a generic app-icon stack**, three plain
rounded squares in the measured colours, where the capture shows a
third-party app mark. The row-1 app-icon thumbnail in the settings list is
likewise this repo's own footprint mark, not the app's Croc illustration.
Costs: `apps tile` 9.62 and `app-icon thumb` 65.75, both excluded.

**The typeface is a no call, and the stand-in has a width bill.**
`refkit font` on "Pick", the largest word on either screen, calls SF Pro at
0.912 with a margin of 0.061; at 15 pt the same test cannot separate SF Pro
(.78), SF Compact (.75) and SF Rounded (.75). The boards set the system stack.
Measured `refkit bbox` ref/mine on nine strings:

| String | pt | ref | mine | ref/mine |
| --- | --- | --- | --- | --- |
| "You're a Pro member" | 15, w600 | 144.0 | 148.6 | 0.969 |
| "VB" | 22, w700 | 27.7 | 28.1 | 0.986 |
| "About Stepwise" | 15, w500 | 106.6 | 109.2 | 0.976 |
| "Movement nudges" | 15, w500 | 125.5 | 127.6 | 0.984 |
| "App icon" | 15, w500 | 59.2 | 60.5 | 0.979 |
| "Manage subscription" | 13, w400 | 125.1 | 124.7 | 1.003 |
| "3 apps added" | 15, w600 | 95.7 | 95.3 | 1.004 |
| "10,000 steps" | 15, w600 | 91.5 | 91.5 | 1.000 |
| "Pick your vibe" | 27, w700 | 172.3 | 172.3 | 1.000 |

So the stand-in sets **1.4–3.2% wide on the black weights at 15–22 pt** and
within 0.4% on the 13 pt grey text and the 27 pt title. Nothing was widened to
hide it: no container here is tight enough to reflow, so the bill is paid in
levels, in `settings list` and `Pro card`. It is the single largest remaining
interface residual and it cannot be fixed without naming the face.

**The Pro pill's word is set at 19 px, not at a cap-matched size.** The
source's black "Pro" core measures 29.6 × 14.1 pt (`--dark` 40 through 128 all
agree). A cap match wants 19.98 px, which sets the string 31.4 wide against
the source's 29.6; 19 px sets it 29.8 wide and leaves the cap 0.9 pt short.
Width is the error that shows at this size, so width is what was matched. The
pill region went 18.57 → 11.85 on that change.

## Fitted, not read

Four things on these boards were solved or fitted rather than measured
directly. A reader should not mistake them for measurements.

- **The tab bar is a material.** It reads `#FEFCF9` over the `#F5F1EC` below
  it, and `rgba(255,255,255,.85)` solves that to within 3 levels. The token
  keeps the alpha, not the composite, because the faded list text shows
  through it. The residual 4 levels of blue that `--regions` flags is the
  difference between the source's blur and a flat veil.
- **The tab bar's shadow is fitted**, not solved. Its falloff is inside the
  compression noise floor of this recording.
- **The list's scroll fade bottoms out at 0.06, not at 0.** Sampled in 10 pt
  bands down x 26–96, the card's coverage over the `#F4F0EB` ground runs 1.00
  at y 758, .58 at 780, .26 at 800 and settles near .06 from y 818 to the foot
  of the screen. "Privacy Policy" is still legible under it. An earlier pass
  shipped a .18 floor and the band cost 2 levels.
- **The hatch stroke inside the tab bar's person glyph is 0.4 pt, chosen from
  a bracket.** A profile-integral lower bound gives 0.27 pt and an FWHM upper
  bound gives 0.71 pt; no single edge in this capture resolves it. 0.4 was
  picked inside that bracket and the glyph went 29.30 → 15.99.

## What the recording does not contain

- **The top 69.93 pt of `02` is off the top of the video.** The board draws a
  status bar there; the reference is padded with the flat dimmed ground. It is
  cut from the delta, and no probe reads it.
- **`refkit hairline` could not solve the list divider or the dashed rule
  under the name.** Both solve within ~2 levels of their ground at this
  resolution, which normally means there is no rule. There visibly is one in
  both cases, so the tokens (`--sw-hairline` `#F1F1F1`, `--sw-dash` `#AEAAA5`)
  come from a `scan` across the run instead, and the dash reads 9 levels light
  in `refkit batch`. That is the one colour on these boards that is a
  judgement call.
- **Three rows of the settings list sit under the scroll fade.** The hand
  glyph, the bell's full lower extent and the fourth divider are all inside
  the faded band, so their ink boxes are read at reduced contrast: `bell` is
  the worst box probe in the set at +0.9 pt wide.
- **The picker holds twelve faces, not fifteen.** The sheet's bottom edge is
  in frame and the last row is complete. Whether it scrolls past twelve is not
  knowable from this recording.
- **The second tab is never shown.** Its glyph is a person and the profile is
  already in view, so the pair is most likely Home and Profile — but the Home
  screen is not in the recording and nothing here draws it.

## Details worth not re-deriving

- **The source uses three different card radii** on one screen: 20.5 on the
  two tiles, 23.5 on the Pro card, 25.5 on the settings list. They were
  measured separately because the first guess — one radius — did not fit any
  of them. They are three tokens, not one.
- **The status bar is not the template's.** Measured on p1: the clock ink runs
  38.2–70.5 × 20.2–32.8, the signal bars 287.6–307.3 × 19.7–32.8, the wifi arc
  314.5–331.7 × 19.7–32.3 and the battery 339.3–366.5 × 20.2–33.2. Against
  `templates/gen.py` that is a clock centred on 54.35 rather than 71.2, and a
  right-hand cluster 5.9 pt further right and 3.1 pt higher. Two CSS rules put
  the shared `statusbar()` on those boxes rather than forking it; all five
  boxes then match within 0.8 pt and the band went 7.57 → 1.47.
- **The status bar reads 9:41 with a crescent-moon Focus glyph**, not the
  usual trio alone. `moon.svg`'s `viewBox` is its ink box, so the placement
  box and the ink box are the same 13.4 × 13.4.
- **There is no Dynamic Island.** `statusbar()` is called with `island=False`
  on both screens; the source draws none.
- **The scrim is `rgba(0,0,0,.20)`**, solved twice: `#C3BFBC` over `#F4F0EB`
  and `#CDCACE` over `#FEFEFE` both give .20.
- **The phone's bottom-left corner is not a 52 pt round-rect.** The
  "scrim beside the sheet" region was narrowed to y 300–780 to keep the corner
  out of it: the recording's device corner and the 52 pt mask do not describe
  the same curve, and scoring the corner measures the mockup's corner radius
  rather than anything on the screen. The 6.64 that is left is scrim-edge
  antialiasing.

## Assets

- `icons/` — 25 inline SVGs, each one's `viewBox` **is** its ink box in page
  points, inlined by `icon()` in `gen.py`. Twelve are the original avatar
  faces; `appstack.svg` and `appicon.svg` are the two substituted marks; the
  other eleven (`house`, `person`, `shuffle`, `footprints`, `moon`, `walk`,
  `info`, `bell`, `hand`, `check`, `chevron`) are interface glyphs redrawn
  from run maps of the reference and probed like any other measurement.
- `refs/` — the two normalised frames. **Gitignored**, along with the
  `ref-*.html` boards built from them: they are whole screens of a
  third-party app. The root `.gitignore` already excludes both, and `gen.py`
  skips the two reference boards when they are absent.
- **No `crops.json`.** Nothing on these boards is a crop of the capture.
  Every pixel is either rebuilt from measurement or original art, which is
  also why there is no generated-asset manifest: nothing here came out of an
  image model.

`probes.json` holds 64 probes — 18 colour samples, 12 edge runs and 34 boxes.
Against the current boards: **0 errors, colour mean Δmax 2.6 (worst 14, the
grey secondary ink), box mean |dw| 0.50 and |dh| 0.24.**

## Regenerating

```bash
python3 canvases/stepwise-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical. The boards are output:
edit `gen.py`, never the HTML.

Verify with:

```bash
refkit tokens canvases/stepwise-ios
refkit shoot canvases/stepwise-ios/[01]*.html \
    -o canvases/stepwise-ios/scratch/mine --scale 3 --crop-phone --check-overflow
uv run canvases/stepwise-ios/scratch/fit.py
refkit batch canvases/stepwise-ios/probes.json \
    --against canvases/stepwise-ios/scratch/mine
```

The third line is the one that is easy to drop. `refkit batch` applies one
`--pt` to the reference and to the render alike, and every probe's `pt` is its
reference's scale (2.381679 or 2.745547), not the shoot's 3×. `fit.py`
resamples each shot onto its reference's own grid, masks the phone's 52 pt
corners out of both, and writes the pair back into `scratch/mine` as
`cap-*.png`, which is what each probe's `mine` names. Point `--against` at the
raw 3× shots instead and twelve probes error and the rest read nonsense.
Without `assets/refs/` there is nothing to compare against and only the first
two commands apply.

The artwork of the source app is its designer's. Nothing of it is reproduced
here; the boards are a measurement exercise in interface, and every
illustration on them is this repo's own.
