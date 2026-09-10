# Grok, iOS

Five screens of the Grok iOS app: the Home Screen widget on the system
widget gallery ground, two pages of the in-app widget guide (the first and
the last step), the Voice Settings sheet over the 3D companion scene, and
the SuperGrok paywall. Rebuilt from Mobbin captures. Nine boards in three
rows, plus five more that park each capture under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 00 | `design-tokens` | The 61 tokens, as one `:root` block |
| 00b–00d | `evidence` | One row per token, with the measurement behind it |
| 01 | `widget` | The medium Home Screen widget on the gallery's grey |
| 02 | `widget-guide-add` | "Find Grok in the list, choose a widget size, then tap Add Widget.", dot 4 |
| 03 | `widget-guide-jiggle` | "From the Home Screen, touch and hold an empty area until the apps jiggle.", dot 1 |
| 04 | `voice-settings` | The Voice Settings sheet over the companion scene, recording |
| 05 | `supergrok` | The SuperGrok paywall: five features, two plans, the CTA |

## How close it lands

Mean absolute delta against the captures, in levels of 255, over the window
described below:

| Screen | Δ |
| --- | --- |
| 01 Widget | 0.26 |
| 02 Widget guide, step 4 | 0.90 |
| 03 Widget guide, step 1 | 0.89 |
| 04 Voice settings | 1.00 |
| 05 SuperGrok | 5.75 |

The spread is what the pixels are. On 01–04 most of the frame is a crop of
the capture (the two illustrations, the whole companion scene, the sheet's
blurred material) or a flat ground the census read to the level, and the
type on them is one nav title and two lines of body. 05 is the only screen
where most of what the window sees is type set by the platform face over an
inpainted hero: eighteen lines of it, white on black, where any sub-pixel
disagreement in a glyph edge costs 60–100 levels on that pixel. Split into
glyph and ground, the title band reads 66 on its glyph pixels and 3.8 on the
rest; the ground under every line of 05 is within 3–6 of the capture.

`refkit batch probes.json --against scratch/cap --pt 2.2417` replays the 33
Phase-1 probes against the renders: 13 flat-fill probes at Δ 0–2, 9 box
probes at a mean |dw| of 0.39pt and |dh| of 0.24pt, and 4 edge scans all
landing on the capture's own edge to the pixel. The five grey-ink probes
read Δ 7–11 and that is the scoring, not the ink: the render is downscaled
with LANCZOS, whose ringing puts the brightest 8% of a grey glyph 7 levels
*above* the CSS colour (`mute` #A9A9A9 replays as #B0B0B0), while the
capture's blur keeps its brightest 8% a few levels *below* the true ink. At
3% and 15% the pattern is the same. The tokens are the capture's own core
values and were left alone.

## The diff window

The captures are 881 × 1910 for a 393 × 852 frame: **2.2417 px per design
pt**, checked on both axes. Renders come out at 3× with `--crop-phone` and
are downscaled to 881 × 1910 with Pillow LANCZOS, the masked corners
composited onto the capture's own pixels, before diffing
(`scratch/run.sh` is the whole chain and also prints the worst 40pt blocks).

Excluded, all three properties of Mobbin's export: the top 58pt, where
Mobbin composites the Dynamic Island out and the board draws it; the 52pt
corners; the bottom below 838pt, where the export has no home indicator. On
04 the capture does keep the island's contents, an orange recording dot at
x 215–221, and the board draws that dot (`rec`) inside its own island.

## What is a crop, what is drawn, what is fitted

**Every icon on the five screens is a crop of the capture**, not a drawing:
20 of them, each cut at its measured ink box grown by 1pt and placed
back at the same numbers (the `-ic-` ids in `crops.json`). That was asked
for explicitly, that the icons match the source exactly, and a crop is the
only asset that scores 0 by construction. It is also the only honest one:
most of these glyphs are SF Symbols, whose outlines may not be redistributed,
so a hand-drawn SVG would have been a near-copy of a licensed shape that was
still measurably wrong. The cost is that the canvas's inspector names them by
image content from `assets/art/`, not as vector assets, and `assets/icons/`
does not exist in this folder.

The pictures are crops too: the two guide illustrations, the companion scene
under 04, the voice sheet's material, and the smoke hero of 05
(`02-illo`, `03-illo`, `04-bg`, `04-sheet`, `05-bg`). The last three are **inpainted crops**, and a reader
should not take their pixels as the capture's where the type was: the
generator patches every box of type and chrome out of the frame before
cutting it (a Coons fill from each box's own four edges, edge profiles
smoothed over 9px) so that the CSS type lands on clean ground. `INPAINT` in
`gen.py` lists the boxes; on 04 that is the nav, the four side buttons, the
grabber, the title, the close disc and both row labels with their glyphs; on
05 the title, the subtitle, the plan group, the CTA and the footer. 05's
feature card is handled differently: its 6.7% white material is un-applied
inside the card box, its edge, corner arcs, five discs and nine lines of type
are patched, and the CSS card re-applies the material, so the card's pixels
under the type are solved rather than sampled.

Values no pixel holds, fitted rather than read:

- `material` .067, `disc` .17, `scrim-btn` .32, `glass` .09 and `grabber`
  .35 are alphas solved as (capture − patched frame) / (255 − patched frame)
  over rings that avoid the glyphs; the evidence rows carry each ring and the
  per-row spread.
- The Yearly card is a diagonal ramp, not a fill: its four corners census
  45/52/40/45 mean level, so it ships as `linear-gradient(to top right,
  plan-lo, plan-hi)` between the bottom-left and top-right censuses.
- `icon.png` is the App Store artwork under the system superellipse mask, the
  one asset that is not a crop of a screen.

## The typeface

`refkit font` puts SF Pro on top of every title measured, each a weak call,
and the boards ship the platform stack with no width correction. Sizes were
then fitted to measured widths in the real board rather than assumed from
the iOS ladder, and several are not on it:

- `t-feat` 17.5px and `t-row` 16.5px: the regular-weight strings on 05 and
  04 set 3% wider and 2% narrower than 17px does.
- `t-h1` is **500 at 40.5px with .6px of tracking**, not 400 at 42px. Both
  set 'SuperGrok' 194.0 wide; the regular is 37.5 tall with 9116 ink px
  against the capture's 36.1 and 10332, the medium is 36.1 and 10053, and
  swapping it halved the title band's delta (16.5 → 10.9).
- `t-price` 20px: the digits' cap height reads as 21px, the run width as
  20px, and the run wins (52.2 → 49.5 for '$300', the capture's 49.5).
- `t-sub` 13.25px: the two long feature subtitles want 13.3, the footer
  13.16 and '$25 /month' 13.0, so the token splits them and each lands within
  1.3pt.
- `t-unit` 15.4px for the '/month' and '/year' runs, 2.5% wider than 15px.

## What the source itself gets wrong

- 05's row titles wrap where the app wraps them, mid-phrase: "Longer Voice
  Mode &" / "Companion chats" and "Priority access during" / "peak times".
  Those are the app's line breaks, transcribed.
- 04's island carries the recording indicator because the capture was taken
  mid-session; the widget and guide captures have theirs composited out.
- The '$' on 05's prices is shorter than SF Pro's at any size that matches
  the digits: the price probe lands the width to 0.0 and the height 1.3 tall.

## Regenerating

`python3 gen.py` rewrites the nine boards from `TOKENS`, `crops.json` and
`assets/art/`. With `assets/refs/` present it also re-cuts the art, which
needs Pillow and numpy; without it (a fresh clone, since the captures are
gitignored) it uses the committed crops and needs nothing. The five `ref-*`
boards are gitignored too, so a fresh clone has nine.
