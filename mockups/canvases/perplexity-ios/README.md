# Perplexity, iOS

The onboarding flow end to end — splash, email entry empty and filled, the
"check your email" pane and its two code states, the Pro paywall with and
without its purchase alert, and the home screen with and without the voice
tooltip — followed by the Dynamic Island in four Live Activity states, rebuilt
from fourteen Mobbin captures, plus the token board, a type specimen and two
evidence boards. 18 boards committed, and 14 more that park each capture under
its replica; those are gitignored, so a fresh run produces 32 and a fresh clone
shows 18.

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
| 11 | `island-voice` | Voice mode, the island compact |
| 12 | `island-voice-open` | Voice mode, the island expanded |
| 13 | `island-reasoning` | Reasoning, the island compact |
| 14 | `island-reasoning-open` | Reasoning, the island expanded |
| 00 | `design-tokens` | 77 tokens: font, surface, line, ink, accent, radius, type, metrics |
| 00b | `type` | The 16 type tokens as a specimen, two families |
| 00c–d | `evidence` | One row per token, with the probe behind it |

**The captures come at two scales.** The ten onboarding ones are Mobbin's
1180 × 2676 PNGs: a 1179 × 2556 iPhone screen at @3x with a 120px attribution
strip under it, so 3.0 capture px per pt. The four island ones are 881 × 2000,
an 881 × 1910 screen under a 90px strip, so **2.24173**, which the height agrees
with at 1910 / 852 = 2.2418. `scale()` reads which from the capture's number,
and every probe row on boards 11–14 carries its own `pt` so `refkit batch`
overrides the one on the command line. The frame is this repo's 393 × 852 pt
either way.

## How close it lands

Mean absolute delta against the captures — all three channels, the whole
frame with nothing masked, in levels of 255:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Splash | 2.40 | 08 Purchase confirmed | 5.66 |
| 02 Continue with email | 3.52 | 09 Home, voice tooltip | 4.25 |
| 03 Address typed | 4.38 | 10 Home | 3.57 |
| 04 Check your email | 2.68 | 11 Voice, compact | 1.48 |
| 05 Enter code | 3.72 | 12 Voice, expanded | 1.84 |
| 06 Code accepted | 2.96 | 13 Reasoning, compact | 1.52 |
| 07 Perplexity Pro | 6.10 | 14 Reasoning, expanded | 1.51 |

Mean over the fourteen, 3.26; over the ten onboarding screens, 3.92. **The
spread is the serif, and nothing else.** 07 and 08 are the two boards that carry
the two-line didone headline, and its four rows are their four worst bands —
Δ 56.06, 38.34, 36.92 and 28.67 on 07 against a whole-frame 6.10. Mask the
66.7pt those two lines occupy, 7.8% of the frame, and 07 falls to **3.84**,
between 02 and 03; 08 falls to 4.26, the rest of which is the fitted alert
vignette. Every other board's worst band is either the same sans substitution
at 9–25px or the phone corner, below.

Geometry is not what the numbers are scoring. Across the 22 box probes the
mean ink-box width error is **0.68pt** and the mean height error **0.54pt**.
The largest single miss is 4.4pt on `bar-14`, and it is not the bar: the
capture keeps a lit pixel 4pt past the progress head, part of the halo the
crop's `erase` deliberately leaves behind, where the redrawn head stops at its
own edge. The next is the 3.3pt the hero block is short, which is the
substitution itself. The 43 colour probes land at a mean worst-channel distance
of 2.9 levels, with one outlier at 52 (`flag`, below).

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

**p08's alert is the one place the sans needs no correction**, because it is
the only surface the app does not draw: iOS does, and the substitute is
standing in for the system face rather than for FK Grotesk. Its three runs are
the platform ladder unmodified — 17 semibold title, 13 regular message, 17
medium button — and at those sizes the ink widths land within 0.3%, 0.2% and
0.0% of the capture. Getting there meant undoing a guess. The first pass set
the title at 14px and reused `--pp-t-note`, 12px, for the message, which left
the title 14.6% narrow and 38.6% light; 17/700 was then tried against 17/600
and rejected on the region delta, 9.07 to 8.63. The alert also sits **0.67pt
right of the phone's centre line, and its three centred runs a further
0.33pt**, which is the substitute's side bearings on top of that. `ct()`
centres on the 393pt frame, so the offset rides as a 1px `text-indent` — one
declaration on the wrapper, because `text-indent` inherits.

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
other string on the fourteen screens is proportional.

## The Dynamic Island is four boards that break the status-bar rule

Mobbin shoots a Live Activity on a bare grey field: no wallpaper, no home
indicator, nothing on the screen but the island. `--pp-ground` `#D5D5D5` is
that field, flat at 213,213,213 across all 393 × 852 outside the island on all
four captures, which is why these boards score what they do — below the status
bar and with the artboard's corner columns excluded, 11 and 13 come in at
**0.01** and 12 and 14 at 0.95 and 0.38.

**The status bar comes from the template, and nothing of the capture's own is
carried over — including an expanded island or a Live Activity.** These four
are the one place that bends, because the Live Activity *is* the subject of the
board. `statusbar()` still supplies the 9:41 clock and the signal group
unchanged, and the island is drawn over the template's plain one. The bill
lands in the top 54pt: the band around the island scores 19.23, 33.05, 19.98
and 32.84 against whole-board deltas of 1.48 to 1.84, almost all of it the
clock, which the capture sets at 35.7–65.6 where the template sets 54.9–87.0.
On p11 alone the template's fourth cellular bar shows past the pill at
298.0–301.1: the compact pill is 205.5 wide on p11 and 211.3 on p13, and only
the wider one covers it.

The island geometry itself is exact. The compact pill measures 205.2 × 37.0 at
91.0, 11.2 in both, and the expanded island 370.7 wide and 132.9 tall at
11.2, 11.2. It takes two probes rather than one box: `--crop-phone`'s 52pt
corner mask paints the artboard's own corners black, and a dark threshold over
the whole frame counts those as ink, so `isl-x-12` reads a band across the
island's middle and `isl-y-12` a column down it, both of which the mask and the
drop shadow miss.

**`--pp-r-island` is 43.75px**, fitted as a circle against the capture's edge
at 0.317pt mean absolute error — under a capture pixel. Apple's superellipse
and a plain radius are not separable at this size, so the board draws the
radius. The shadow under the panel is CSS rather than crop: the falloff below
it fits a Gaussian with σ ≈ 16.5pt, and CSS's blur radius is 2σ, hence
`0 12px 33px rgba(0,0,0,.38)`.

**The glow under the compact glyph is a fitted linear falloff, not a gradient
preset.** On p11 and p13 the lit glyph at the pill's right throws a cyan wash
that the pill clips. Sampled clear of the glyph it holds R:G:B 33:64:69 and
39:72:77, which normalise to the same colour, so the two boards share
`--pp-glow` `#85EDFF` and differ only in alpha. Modelled as
α = A·max(0, 1 − d/R) and fitted by least squares over the annulus below each
glyph, where the pill is otherwise black, both give R ≈ 16.5pt with A 0.41 on
p11 and 0.73 on p13. The first pass used `radial-gradient(circle closest-side)`
in a 41px box, R 20.5, which matched its own model and fell far slower than the
capture; the refit took the `glow` probe from Δ 18 to Δ 6.

The expanded island is the only place on these four that is cropped. `cut()`
takes `p12-island` and `p14-island` at the island's own box, `[11.15, 11.15,
381.85, 144.53]`, not at the frame — so the board's own 43.75pt corner clips
the picture and the shadow underneath is CSS. What is cropped is the starfield
and the glass waveform or orbit rendered on it, which the capture is the only
source for; the lockup, the status label and p14's whole progress row are
erased out of the crop and drawn live. Two new traces go with them,
`voice-wave.svg` and `atom.svg`.

## The art is cropped, not generated

Five crops, listed in `crops.json`, cut from `assets/refs/pNN.png` at measured
pt boxes into `assets/art/<id>.png` and placed back at the same numbers, so an
asset cannot drift from where it was measured. **Nothing here is drawn by
`artgen`** — there is no generated art and therefore no generated-asset
manifest; the shipped Δ for each of the five is the board delta above.

- `p01-splash`, the painted desert on the splash, 0–435pt. It fades to the
  sheet's own `#1B181C` by y 432, which is where the box ends.
- `p07-hero`, the starburst-over-a-book paywall hero, 0–500pt, down to the
  first chip row at 500.5.
- `p10-news`, the wire photo in the news card, 33.7 × 35pt. Nothing is drawn
  over it, so it is cut whole.
- `p12-island` and `p14-island`, the starfield inside the expanded island and
  the glass waveform or orbit on it, cut at the island box. Above.

All but `p10-news` are **not raw pixels**. Everything the app draws over the
artwork — the status bar, the close and Restore buttons, the pro lockup, the
serif headline, the island's lockup and progress row — is erased inside the
crop and inpainted from the pixels around it, then rebuilt live by the
generator. `cut()`'s `erase` boxes say which rectangles, and whether the whole
rectangle went or only the glyph pixels in it. That is why the headline can be
re-typeset at all, and why the band around it scores what it does rather than
being pixel-perfect by construction.

Everything else vector is **traced, not cropped**: 22 SVGs in `assets/icons/`,
from the Apple and Google marks on the splash to the five tab glyphs. The
largest is `home-watermark.svg`, the ghosted Perplexity mark behind the home
screen, reconstructed from **37 measured path segments** — it is a redrawing
of a shape read off a capture, not that shape.

**A trace must be given more of the capture than the glyph.** potrace closes
any ink that reaches the edge of its raster along that edge, so cropping to the
ink box and tracing that hands back a glyph with its apexes planed flat: the
search ring lost its crown, the globe its pole, ten of the fourteen traced
glyphs something. `scratch/trace.py` pads the crop by 2pt and writes the ink
box it then measures, rather than the box it was asked for — the guess only has
to name the glyph, and the fourteen it was given were out by up to 0.9pt each,
`kbd-globe` by 6.6 on the width. The old boxes cost 0.098 on the keyboard and
0.025 on the tab bar, and a glyph missing a third of its outline in a canvas
someone zooms into.

## What the captures themselves get wrong

These are defects in the source, not in the replica, and the boards inherit
them by choice:

- **Two chip labels are never shown in full.** On p07 the first chip row is
  cut mid-"File analysis" at the right edge; on p08, scrolled further, it
  reads "Pro user" and row 2 reads "Access to the latest mo". Neither capture
  shows either tail. **"Pro user support" and "Access to the latest models"
  are inferred**, and they are the only two strings on the fourteen boards
  that were not transcribed from pixels.
- **p06's code field has no caret.** The blink was off in that frame, not the
  field unfocused — p05, the same field one state earlier, has one at 152.0.
  `code_field()` takes the caret as an optional argument for exactly this.
- **p09's home indicator was caught mid-fade.** Measured over the bar, that
  capture carries 34.75 of ink where p10 carries 94.18 for the same pixels.
  The board draws the indicator solid, like every other board, which is the
  whole of 09's worst band (`y 840..853.3`, Δ 45.09); every other board's
  indicator matches its capture within 2%.
- **p09 and p10 caught the voice glyph on different animation frames** — mean
  |Δ| 11.81 between the two captures over that 25 × 24pt box, peaking at 214.
  Both boards render the same traced icon, so one of them is wrong and there
  is no way to be right on both.

## Where else the replica knowingly differs

- **`--pp-flag` is the one colour probe that fails, at Δ 52.** The
  spell-check rule under "mobbin" is not a line: R−G peaks at 190 every 12
  capture px and troughs at 20, a 4pt dot pitch. The capture's JPEG never
  renders a dot solid, so the probe's estimator reads a blend of dot and gap
  where the token holds the dot's own colour. The token is right and the
  probe cannot see it.
- **The brand mark carries less ink at small sizes than the capture does.**
  `perplexity-mark.svg` is the official file, a filled `fill-rule="evenodd"`
  path with thin bars, and its ink box matches the capture exactly at all four
  sizes the folder places it. Its mass does not. Ref over mine runs 0.993 at
  p01's 51.7 × 59, 1.175 at p12's 17.8 × 19.6, 1.191 at p14's 14.3 × 15.6 and
  1.354 at p11's 20.1 × 21.9 — the worst of the four at a size larger than two
  of them, so the error is not monotonic in size and no single correction fits
  it. A 0.5pt stroke on the compact mark does bring its mass within 2% and
  takes that 26 × 25pt window from Δ 31.4 to 22.6, but at three placements
  that is three fitted numbers thickening a brand file which is exact wherever
  it is drawn large. It ships unthickened, and it is most of what is left of
  the compact pill's Δ 5.43.
- **The glow's own residual is ±0.05 alpha**, because the capture's wash is
  slightly wider horizontally than a circle. A second fitted axis would take
  that out and buy nothing the board delta can see.
- **p08's alert is not glass.** It is iOS glass in the capture, but the blur
  is wide enough that nothing of the hero's *shape* survives it: the fill
  reads 239 at the centre, 230 at r 55 and 208 at r 126 whatever is behind it.
  It ships as the radial vignette it reads as, which is a fitted material, not
  a measured one. What the blur does keep is the hero's chroma, as a tilt no
  radial gradient can hold: top edge to bottom, the capture's fill falls 4.6
  levels in R, 8.9 in G and 11.3 in B, so it is blue-grey at the title and
  warm grey at the OK. That tilt is the whole of the `alert` probe's Δ 11.
  Fitting a second, vertical layer over the vignette removes 1.1 of the 4.2
  levels of fill residual and moves the board 0.009, which is not worth six
  more fitted numbers. The scrim under it *is* measured — chip fill
  `#252527 → #18181A` and sky `#0868BA → #054379`, both a factor of 0.645.
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

## The brand sheet, and the two accounts it turns on

`assets/brand/` is 151 pictures Perplexity published, in fourteen rows, and
`manifest.json` is the source of record: every file carries the page it came
from. None of it is a screenshot taken here, and nothing in it is an archive
copy — the provenance is `theirs` throughout.

Perplexity publishes a real brand kit, which is most of why the identity rows
are as deep as they are: **<https://live.standards.site/perplexity/>**,
"Perplexity (2026)", linked only from the footer of `perplexity.ai/hub` and
organised 01 Logos, 02 Typography, 03 Color, 04 Art Direction, 05 Brand in
Use. There is no `/press`, `/press-kit`, `/newsroom`, `/brand` or
`/legal/trademark` on perplexity.ai itself, and no press-photography page
anywhere, which is why there is no `press/` group and no Press photography
row. Five marks come from that site's `Perplexity Logo Nov 2025.zip` rather
than from its pages: it serves `logo-symbol` as white on transparent, which is
a blank card on a light sheet.

Two accounts had to be settled by evidence rather than by handle:

- **TikTok is `@perplexityapp`, not `@perplexity_ai`.** The second has two
  hundred times the followers — 186,240 against 965 — and looks like the real
  one. It is unverified, has an empty bio and a `commerceUser` flag, and posts
  localised ad creative. `@perplexityapp` is verified, and its bio, "Curiosity
  changes everything.", is byte-identical to the bio of the verified Instagram
  account. That cross-surface match is the proof; the follower count is not.
  The right account has posted exactly once, so the TikTok row is two pictures
  where every other social row is seven or eight.
- **YouTube is `@perplexity-ai`, not `@perplexity_ai`.** The underscore
  channel exists, has 37 subscribers and is dormant. The hyphen one has 75.6K
  subscribers, 382 videos and `pplx.ai` as its channel link.

The accounts and ids behind the rest: X `@perplexity_ai` (id
1599587232175849472, verified), Instagram `@perplexity` (id 60416752048,
verified), LinkedIn `/company/perplexity-ai` (id 88007673), App Store id
1668000334 / `ai.perplexity.app`, Google Play `ai.perplexity.app.android`,
Microsoft Store `9P9XG917PWCJ`, and Google Ads advertiser "Perplexity AI,
Inc." `AR03373525716690796545`.

`perplexity.ai` fronts every page with Cloudflare, so nothing here came off it
by `curl`: the hub articles and their `og:image` cards were read through a
browser, and each article slug was checked against a deliberately bogus one on
the same host, which returns the site's generic title.

## Regenerating

```bash
python3 mockups/canvases/perplexity-ios/gen.py
refkit tokens mockups/canvases/perplexity-ios
```

`gen.py` emits every `.html` and `layout.json`, byte-identically, from
anywhere. Never hand-edit the artboards.

`cut()` refreshes `assets/art/` from `assets/refs/`, which is gitignored —
without the refs the generator still rebuilds every board from the committed
art. To restore the refs, copy Mobbin's downloads to `assets/refs/pNN.png`
unchanged: no resize, no crop, the whole file including the attribution strip,
which every probe box is measured against. `01`–`10` are the onboarding flow in
order at 1180 × 2676, `01` the splash and `10` the bare home screen; `11`–`14`
are the Live Activity captures at 881 × 2000, voice compact and expanded then
reasoning compact and expanded.

To re-measure, `scratch/it.py` shoots each screen at its own capture's scale —
3× for the ten, padding 1179 → 1180 afterwards (pad, not resize: a one-column
LANCZOS upscale rings and darkens every glyph core by ~13 levels), and 2.24173
for the island four, where 393pt lands on 881px exactly and nothing needs
padding. `scratch/dd.py` diffs each against its capture with Mobbin's strip cut
off. Both take substring filters, e.g. `python3 scratch/dd.py 07 08`, and both
want `PYTHONPATH=.` from this folder so they can import `scale()` from the
generator. They also invoke `tools/refkit.py` out of this checkout rather than
the `refkit` on PATH: a float `--scale` is a fix on this branch, and an older
install rejects 2.24173.

`refkit batch probes.json --against scratch/mine --pt 3` re-runs all 67 probes
and prints the table the numbers above come from. The fourteen island rows
carry their own `pt` and override that 3.
