# Perplexity, iOS

The onboarding flow end to end — splash, email entry empty and filled, the
"check your email" pane and its two code states, the Pro paywall with and
without its purchase alert, and the home screen with and without the voice
tooltip — rebuilt from ten Mobbin captures, plus the token board, a type
specimen and two evidence boards. 14 boards committed, and 10 more that park
each capture under its replica; those are gitignored, so a fresh run produces
24 and a fresh clone shows 14.

| # | Board | What it shows |
| --- | --- | --- |
| 01 | `splash` | Painted splash, four sign-in pills |
| 02 | `email` | Continue with email, field empty, keyboard up |
| 03 | `email-typed` | Address typed, spell-check rule, button live |
| 04 | `check-email` | Check your email, envelope lockup |
| 05 | `enter-code` | Code field focused, caret, keyboard up |
| 06 | `code-loading` | Code entered, spinner, no caret |
| 07 | `paywall` | Perplexity Pro, serif hero, chip rows, two plans |
| 08 | `purchased` | The same paywall under a scrim, iOS alert on top |
| 09 | `home-tip` | Home with the voice tooltip |
| 10 | `home` | Home at rest |
| 00 | `design-tokens` | 69 tokens: font, surface, line, ink, accent, radius, type, metrics |
| 00b | `type` | The 15 type tokens as a specimen, two families |
| 00c–d | `evidence` | One row per token, with the probe behind it |

The captures are Mobbin's 1180 × 2676 PNGs: a 1179 × 2556 iPhone screen at @3x
with a 120px attribution strip under it. `SCALE` is 3.0 and the frame is this
repo's 393 × 852 pt.

## How close it lands

Mean absolute delta against the captures — all three channels, the whole
1180 × 2556 frame with nothing masked, in levels of 255:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Splash | 2.40 | 06 Code accepted | 2.97 |
| 02 Continue with email | 3.54 | 07 Perplexity Pro | 6.10 |
| 03 Address typed | 4.39 | 08 Purchase confirmed | 6.48 |
| 04 Check your email | 2.69 | 09 Home, voice tooltip | 4.25 |
| 05 Enter code | 3.75 | 10 Home | 3.56 |

Mean over the ten, 4.01. **The spread is the serif, and nothing else.** 07 and
08 are the two boards that carry the two-line didone headline, and its four
rows are their four worst bands — Δ 56.06, 38.34, 36.92 and 28.67 on 07 against
a whole-frame 6.10. Mask the 66.7pt those two lines occupy, 7.8% of the frame, and 07 falls to
**3.84**, between 02 and 03; 08 falls to 5.15, the rest of which is the fitted
alert vignette. Every other board's worst band is either the same sans
substitution at 9–25px or the phone corner, below.

Geometry is not what the numbers are scoring. Across the 11 box probes the
mean ink-box width error is **0.51pt** and the mean height error **0.75pt**;
the largest single miss is the 3.3pt the hero block is short, which is the
substitution itself. The 38 colour probes land at a mean worst-channel
distance of 3.0 levels, with one outlier at 52 (`flag`, below).

Three of the four worst bands on every light board are not the interface at
all — they are the 52px corner this repo rounds its artboards with, against a
capture that is a framebuffer and square to the pixel. On 04, `y 0..13.3`
scores 24.93 over the full width and **0.00** with the two corner columns
excluded; `y 826.7..840` goes 15.52 → 1.64 and `y 840..853.3` 28.10 → 2.72. The
`--pp-r-phone` evidence row says the same thing: nothing was measured there,
because there was nothing to measure.

## The type is three substitutions, and the two that matter behave differently

`refkit font` returns **no call** on both families. On the sans it picks SF Pro
Rounded at .636 on the 23px screen title — a weak score, because Perplexity
ships FK Grotesk Neue and no candidate set here contains it. On the serif it
picks New York at .350 and Georgia at .341, which is the ranking saying it has
nothing.

**The sans stands in as the platform sans**, and its cost is horizontal. The
real face carries a taller cap on the same body: p02's title sets an 18.0pt
'C' where 24px of SF sets 17.33, so the token is 24.9px, and p04's title
15.0pt where 20px sets 14.33, so 20.9px. The same correction, +4%, twice. The
keyboard needs more — `--pp-t-key` is 24.7px where 22px undershoots the z/x/c
glyphs by 11% on both axes, and `--pp-t-key-2` 16.2px where 14px sets '123' and
'space' 12% short. The chip labels go the other way, 14.4px where 15px sets
them 4% wide. Corrections run −4% to +16% and every one of them is on the
evidence board with the ink box it came from.

Weight is fitted on **ink mass**, not on the look of the render, because the
substitute is lighter than the original at matched size and a width fit leaves
the weight free:

| Token | Weight | What the alternatives cost |
| --- | --- | --- |
| `t-nav` | 400 | 500 carries 21% more lit pixels than the capture, 600 41% more |
| `t-btn` | 500 | the four pill labels mean 20.1 levels at 500, 41.7 at 400, 34.8 at 600 |
| `t-price` | 400 | 500 carries 17% more, 700 48% more |
| `t-field` | 350 | 400 over-inks p03 by 5.6% and p06 by 6.2% at identical width |

`t-field` at 350 is the one place a non-standard weight earns its keep: the
address and the code are the two strings the *user* typed, and they are set
lighter than anything the app draws itself.

**The serif is where the replica visibly differs.** The stack leads with
Bodoni 72 and Bodoni MT, then Didot, because the brand face sets about 27%
narrower than Georgia at equal ascender height and those are the two didones
that come closest. On p07 the headline is separable from the starfield behind
it only by luminance — above 190 of 255 nothing else in the card is lit — and
measured that way the capture gives ascender top 186.0, x-height top 194.8,
baselines 212.3 and 248.3, line 1 setting 42.3–351.0.

At 33px the substitute holds that set width to **0.4%** and pays for it
vertically: its ascender is **12.7% short** and its x-height **18.9% short**.
Buying the height back costs more than it returns — 37px retracked to the same
width lands the ascender within 2.5% and raises the headline band from 32.2 to
41.0, because the stand-in's strokes thicken faster than the original's
hairlines do. So the line is placed by its **baseline** rather than its top,
which is the one of the two the eye reads as where the line sits, and the
remaining error is the glyph shapes.

The home screen's headline is the same face and the opposite trade. Its
ascenders read 32px, but at 32px lines 1 and 2 set 6.9% wide; at 29.8px they
land within 0.9% and the headline band falls from 4.89 to 3.91. Three short
centred lines are checked on width, a two-line paragraph on where it sits, so
`--pp-t-home` is fitted on width and `--pp-t-hero` is not.

The third substitution has one string in it, and costs nothing worth
measuring. `--pp-mono` is `ui-monospace` because p07's "Save $49.00" has a
7.2pt glyph pitch that holds across the space and the decimal point; every
other string on the ten screens is proportional.

## The art is cropped, not generated

Three crops, listed in `crops.json`, cut from `assets/refs/pNN.png` at measured
pt boxes into `assets/art/<id>.png` and placed back at the same numbers, so an
asset cannot drift from where it was measured. **Nothing here is drawn by
`artgen`** — there is no generated art and therefore no generated-asset
manifest; the shipped Δ for each of the three is the board delta above.

- `p01-splash`, the painted desert on the splash, 0–435pt. It fades to the
  sheet's own `#1B181C` by y 432, which is where the box ends.
- `p07-hero`, the starburst-over-a-book paywall hero, 0–500pt, down to the
  first chip row at 500.5.
- `p10-news`, the wire photo in the news card, 33.7 × 35pt. Nothing is drawn
  over it, so it is cut whole.

The first two are **not raw pixels**. Everything the app draws over the artwork
— the status bar, the close and Restore buttons, the pro lockup, the serif
headline — is erased inside the crop and inpainted from the pixels around it,
then rebuilt live by the generator. `cut()`'s `erase` boxes say which
rectangles, and whether the whole rectangle went or only the glyph pixels in
it. That is why the headline can be re-typeset at all, and why the band around
it scores what it does rather than being pixel-perfect by construction.

Everything else vector is **traced, not cropped**: 20 SVGs in `assets/icons/`,
from the Apple and Google marks on the splash to the five tab glyphs. The
largest is `home-watermark.svg`, the ghosted Perplexity mark behind the home
screen, reconstructed from **37 measured path segments** — it is a redrawing
of a shape read off a capture, not that shape.

## What the captures themselves get wrong

These are defects in the source, not in the replica, and the boards inherit
them by choice:

- **Two chip labels are never shown in full.** On p07 the first chip row is
  cut mid-"File analysis" at the right edge; on p08, scrolled further, it
  reads "Pro user" and row 2 reads "Access to the latest mo". Neither capture
  shows either tail. **"Pro user support" and "Access to the latest models"
  are inferred**, and they are the only two strings on the ten boards that
  were not transcribed from pixels.
- **p06's code field has no caret.** The blink was off in that frame, not the
  field unfocused — p05, the same field one state earlier, has one at 152.0.
  `code_field()` takes the caret as an optional argument for exactly this.
- **p09's home indicator was caught mid-fade.** Measured over the bar, that
  capture carries 34.75 of ink where p10 carries 94.18 for the same pixels.
  The board draws the indicator solid, like every other board, which is the
  whole of 09's worst band (`y 840..853.3`, Δ 45.09); every other board's
  indicator matches its capture within 2%.
- **p09 and p10 caught the voice glyph on different animation frames** — mean
  |Δ| 11.22 between the two captures over that 26 × 24pt box, peaking at 202.
  Both boards render the same traced icon, so one of them is wrong and there
  is no way to be right on both.

## Where else the replica knowingly differs

- **`--pp-flag` is the one colour probe that fails, at Δ 52.** The
  spell-check rule under "mobbin" is not a line: R−G peaks at 190 every 12
  capture px and troughs at 20, a 4pt dot pitch. The capture's JPEG never
  renders a dot solid, so the probe's estimator reads a blend of dot and gap
  where the token holds the dot's own colour. The token is right and the
  probe cannot see it.
- **p08's alert is not glass.** It is iOS glass in the capture, but the blur
  is wide enough that nothing of the hero survives it: the fill reads 239 at
  the centre, 230 at r 55 and 208 at r 126 whatever is behind it. It ships as
  the radial vignette it reads as, which is a fitted material, not a measured
  one. The scrim under it *is* measured — chip fill `#252527 → #18181A` and
  sky `#0868BA → #054379`, both a factor of 0.645.
- **The loading spinner's gradient is an approximation.** One frame of a
  rotating sweep, fitted to the arc the capture happens to hold.
- **The active tab glyph is two-toned in the capture and one colour in the
  trace.** Its ink runs from 94 to 596 in summed RGB across 1169 pixels; the
  SVG carries a single `currentColor`.
- **There are two inks, not one, and both are tokens.** Everything the app
  draws sits at `--pp-ink` `#142C2F` — p02's title reads 18,45,48, p04's
  19,45,48, p10's "Ask anything" 20,44,47. Everything the *user* typed, plus
  both labels and the Apple mark on p01's light pills, is pure black: the
  darkest 2% of p03's address averages 0.7,0,0 and p06's code 0,0,0. Hence
  `--pp-ink-max`. Painting those strings black raised two board deltas
  slightly — 01 by 0.5 in one band, 03 by 0.03 overall — and was kept anyway,
  because the measurement is not ambiguous and the lighter ink had only been
  compensating for the substitute over-covering.
- **The two marks on p01's light pills disagree with their labels by 1.67pt.**
  Apple sits 7.67pt clear of its label, Google 6.00, so no single flex gap
  seats both. The gap is fitted to the labels, which carry the ink, and the
  difference rides as a relative offset on each mark.

## Regenerating

```bash
python3 mockups/canvases/perplexity-ios/gen.py
refkit tokens mockups/canvases/perplexity-ios
```

`gen.py` emits every `.html` and `layout.json`, byte-identically, from
anywhere. Never hand-edit the artboards.

`cut()` refreshes `assets/art/` from `assets/refs/`, which is gitignored —
without the refs the generator still rebuilds every board from the committed
art. To restore the refs, copy Mobbin's ten `onboarding-NN.png` downloads to
`assets/refs/pNN.png` unchanged: no resize, no crop, the whole 1180 × 2676
file including the attribution strip, which every probe box is measured
against. `01` is the splash and `10` the bare home screen, in flow order.

To re-measure, `scratch/it.py` shoots the ten screens at 3× and pads 1179 → 1180
(pad, not resize — a one-column LANCZOS upscale rings and darkens every glyph
core by ~13 levels), and `scratch/dd.py` diffs each against its capture with
Mobbin's strip cut off. Both take substring filters, e.g. `python3
scratch/dd.py 07 08`. `refkit batch probes.json --against scratch/mine --pt 3`
re-runs all 51 probes and prints the table the numbers above come from.
