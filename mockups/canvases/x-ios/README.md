# X, iOS

Seven screens of switching an X account to a professional one — the
*X for Professionals* splash, the category list before and after a category is
picked, the account-type cards, the welcome page with its four setup rows, the
Edit profile sheet, and the finished professional profile — rebuilt from Mobbin
captures at exactly 3 capture px per design pt, plus the token board, the type
board and three evidence boards behind them. 12 boards, and 7 more that park
each capture under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 00 | `design-tokens` | All 52 tokens, as one `:root` block |
| 00a | `type-tokens` | The type ladder, one row per size |
| 00b–00d | `evidence` | One row per token, and what it was read off |
| 01 | `professional-splash` | The hero, the pitch, the legal note, Agree & Continue |
| 02 | `select-category` | The search field and ten category rows, Next disabled |
| 03 | `category-selected` | Entertainment & Recreation checked, Next enabled |
| 04 | `select-account-type` | The Business and Creator cards |
| 05 | `welcome` | "Welcome to X for Professionals" and four setup rows |
| 06 | `edit-profile` | The Edit profile sheet over the profile it edits |
| 07 | `profile` | The finished profile: header, tabs, two posts, a Space |

`gen.py` is the only source of truth; the `NN-*.html` boards are its output.
Regenerate from anywhere, byte-identically:

```bash
python3 mockups/canvases/x-ios/gen.py
refkit tokens mockups/canvases/x-ios
```

## How close it lands

Mean absolute delta against the captures, in levels of 255, over the whole
393 × 852 frame minus the three regions in **The score window** below:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Professional splash | 3.33 | 05 Welcome | 5.90 |
| 02 Select a category | 4.67 | 06 Edit profile | 3.24 |
| 03 Category selected | 5.18 | 07 Professional profile | 5.21 |
| 04 Select account type | 4.46 | **Mean** | **4.57** |

The spread is type density, not geometry. All forty-two of the worst 40 px
bands `refkit diff` reports across the seven screens carry a line of text, and
forty of their worst rows sample the same flat colour on both sides — white
against white, one of them `#FFFFFF` against `#FEFEFE`. The other two are
`#0F1419` against `#0E1419` inside 01's button and `#7856FE` against itself
inside 07's Space card. What the number scores is glyph fringing on a face the
device does not have (below). The screens that score lowest are the ones with
the least type on them: 06 is a sheet of short labels over a lot of
white, and half of 01 is a photograph. The ones that score highest carry the
most words per point of height: 05 sets two title lines, a three-line body and
four row labels, and 07 is a header, a meta block, six tabs, two posts and a
Space card.

03 is the exception worth naming, and it is the source's, not the board's: see
**What the captures get wrong**.

## The score window, and the three things Mobbin did to the export

The captures are Mobbin's export of a phone, not a screenshot of one, and the
export differs from the device in three ways:

1. **The Dynamic Island is composited out** of the top of the frame.
2. **The corners are square**, where the display has a 52 pt radius.
3. **Nothing is painted below 838 pt** — no home indicator.

All three are properties of the export, not of the app, so the boards draw the
island, the indicator and the corners like every other canvas here, and
`scratch/run.py` composites those three regions from the render onto a copy of
the capture before the diff — the island at x 134–259 y 11–47, the indicator at
x 127–266 y 839–846, and the masked corner pixels, which are 0.7% of the frame.
That is the whole of the trim, it is stated in one place, and every number in
this README came out of it.

## The face: Chirp, and what standing SF Pro in for it costs

X sets Chirp on the web and ships it in the app. It is not a system face and no
closed-set matcher can return it, so every board here is SF Pro — and a
substitution shows up as *width* before it shows up as anything else. So none
of the type sizes were read off the iOS ladder. Each one was fitted to a
measured run's ink width, which is why several of them are halves:
`--x-t-space` is 25.5px because 07's "Movie review" measures 157.67 pt on the
capture and draws 157.62 at Heavy 25.5.

That fit leaves one systematic gap, and it has a cause. The platform serves
**SF Pro Display at 20px and up** and **SF Pro Text below it**, and only the
Text cut is drawn wide against Chirp:

| | capture | drawn | ratio |
| --- | --- | --- | --- |
| 01 title, 26px | 230.67 | 232.00 | 0.994 |
| 07 "Movie review", 25.5px | 158.33 | 157.33 | 1.006 |
| 07 "New Jersey, USA", 14.5px *before* | 97.00 | 111.67 | 0.869 |

One token closes it. `--x-tr-text: -0.035em` is applied by `track()` to every
run whose size is under 20px and to nothing at or above it. Swept at −0.03 /
−0.035 / −0.04: −0.035 puts the mean of the small-text ink widths on 0.998 of
the capture's and costs about 1% on the whole-screen deltas against −0.04,
which reads narrow.

`scratch/width.py` measures one run per token on both images. After the
tracking, the 24 runs land at a **mean width ratio of 0.997, and no run is more
than 3.1% out**. One run the tracking band could not reach is 07's meta line,
which still redrew 9% wide at 14.5px with its cap height agreeing; that is why
`--x-t-meta` is 13.5px and every other small size is not.

**What is left is height, and it is not fixable by moving anything.** The same
24 runs have a mean ink-height ratio of 0.9685: SF Pro sets about 3% taller
than Chirp at a width that matches. That is the fringing the delta table
scores, and chasing it by nudging baselines would move correct elements off
their measured coordinates. The line-box constant `boxtop()` uses, K = 0.3455,
was re-solved against ink *bottoms* rather than tops to check exactly this:
"04 Business" lands 268.0 against 268.0 and "06 Edit profile" 103.0 against
103.0, so the +1.0 pt seen at the tops is the taller cap and not a placement
error. K was left alone.

## What is cropped, and what is drawn

> Crop what the capture already contains; draw only what it does not.

`crops.json` is **six boxes**, and all six are photographs: the two heroes on
01 and 05, the profile banner on 06 and on 07, the strip of the page peeking
above the sheet on 06, and one avatar that serves five places at five diameters
across two screens. Everything else — every rule, fill, chip, pill, glyph and
run of type — is rebuilt.

Where interface sat *on* a photograph it is patched out of the capture before
the crop is taken. `gen.py`'s `INPAINT` names eleven boxes across p1, p5 and
p7 — the status bar clock and its right-hand cluster on all three, 01's close
disc, and 07's four header discs — and `cut()` fills each with a Coons patch
from that box's own four edges, which is exact on the smooth grounds these sit
on and continuous at the boundary by construction. The chrome is then drawn
again in CSS on top.

**Thirty icons are vectors, not crops.** Each is drawn on X's own 24-unit grid
in `assets/icons/`, and `scratch/mkicons.py` sets each file's `viewBox` to the
glyph's own ink box, so `icon()` maps that box straight onto the ink box
measured off the capture and the canvas's inspector still hands the glyph back
as a vector asset. One consequence is worth knowing before editing any of
them: because the `viewBox` is computed from the path's bounding box, *moving
one part of a glyph moves every other part relative to its placement box*.

## Approximations

Four things on these boards are fitted rather than measured, and a reader would
otherwise take them for measurement:

- **The icons are approximations of X's artwork, not the artwork.** The nav's
  Grok mark especially: it is a gapped ring plus a waisted dart, fitted to a
  radial profile (the band sits at r 7.3–9.3 pt) and a 3°-step angular scan
  (the gaps are empty at 126–135° and 306–312°) of a 24 × 22.7 pt ink box. It
  is not X's curve. The reply, repost and views glyphs are drawn to their
  measured ink boxes and their interiors are approximate too.
- **The nav gradient.** `--x-nav` is four stops fitted to one row of the wash;
  the capture holds a two-axis gradient that no stop list along one axis
  reproduces.
- **07's last two action glyphs are drawn in full.** The compose FAB covers
  about half of the bookmark and the share glyph in the capture, so only their
  x positions could be measured; their tops and heights are the action row's.
- **`--x-chip-card`, `--x-scrim` and the two black discs are solved alphas**,
  not sampled fills. Each one's evidence row on the 00b–00d boards carries the
  arithmetic.

## What the captures get wrong

**Two captures of the same button disagree by 8 levels.** The enabled *Next*
pill samples a flat `#060B13` on p3 and a flat `#0E1419` on p1 and p4, with the
page ground identical `#FFFFFF` on all three, so it is not a colour cast on the
export. The boards paint one `--x-ink` and eat the difference, which is worth
7.11 over that 357 × 52 pt band and 0.51 on screen 03's whole-frame number —
the entire gap between 03 and 02, which are otherwise the same screen with one
checkmark and one pill fill between them. Matching it would mean claiming X has
two different black buttons.

Beyond that, the three export differences in **The score window** above are the
source's too, not the app's.

## Replaying the measurements

`probes.json` is 27 of Phase 1's measurements in the shape `refkit batch`
replays — the flat-fill censuses, the ink cores, the two coverage solves for
the 1 pt rules, the structural edges and the fitted type widths, each with the
note that says why its window is where it is.

```bash
python3 mockups/canvases/x-ios/scratch/run.py       # regenerate, shoot, composite
refkit batch mockups/canvases/x-ios/probes.json --pt 3 \
    --against mockups/canvases/x-ios/scratch/shot
```

The 17 colour probes come back at a mean Δmax of 2.8 levels and a worst of 9;
the 8 box probes at a mean |dw| of 0.95 pt and a mean |dh| of 0.20 pt. The two
scan probes land within 0.3 pt of their edge.

`assets/refs/` and the seven `ref-*.html` boards hold third-party captures and
are gitignored, so a fresh clone has 12 boards; `gen.py` rebuilds the reference
boards whenever the captures are present. Everything a run makes otherwise
lives in `scratch/`.
