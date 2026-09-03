# SnapAction, iOS

Six screens of SnapAction, rebuilt from the captures inside its Figma file,
plus the token board and the three evidence boards behind them. 11 boards,
and 6 more that park each capture under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 01 | `timeline` | The dated card feed, dark |
| 02 | `batch-select` | The same feed in selection mode, with the floating action bar |
| 03 | `agenda` | Day agenda, blurred header, FAB |
| 04 | `collection` | A saved collection: two photos, tag chips, tab bar |
| 05 | `resource-detail` | Flight detail, caught mid-scroll |
| 06 | `view-resource` | The light meeting sheet over a LinkedIn thread |
| 00 | `design-tokens` | 88 tokens |
| 00b-00d | `evidence` | The measurement behind every one of them |
| 00a | `product` | The app itself: App Store copy, icon, two QR codes |

Two device sizes, not one. Captures 01 and 02 are 1320 x 2868 for a 440 x 956
frame (iPhone 16 Pro Max, 3.359 px per design pt); 03 to 05 are 1290 x 2796
for 430 x 932 (15 Plus, 3.282). Capture 06 is not a device screenshot at all:
it is the Figma node's own partial render, covering design pt x 0 to 380.5 and
y 168.75 to 932 at 2.1656 px per pt. Each board draws the frame its capture
came from.

## How close it lands

Mean absolute delta against the captures, whole frame inside the phone's
rounded corners, in levels of 255:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Timeline | 1.54 | 04 Collection | 1.33 |
| 02 Batch select | 2.13 | 05 Resource detail | 1.29 |
| 03 Agenda | 2.34 | 06 View resource | 5.82 |

Five of the six beat every screenshot-sourced board in the repo, including
`duolingo-ios`' 1.32 to 2.93, and they do it without leaning on cropped
artwork the way Duolingo does: 01, 02, 03 and 05 are almost entirely type and
CSS. What made the difference was modelling the line box and then correcting
what the model still missed, per token. That is the section below.

06 is the outlier and it is not a defect. 77% of its error sits inside one
asset: the LinkedIn thread behind the sheet, whose source image in the Figma
file is 645 x 1398 for a 289 x 627 pt box. Figma renders it at 626 px and the
board renders it at 867 and then it comes back down to 626, and dense 11 px
type does not survive two resamples intact. Shifting it helps by 0.5 at best
(searched at quarter-pixel steps on both axes), pre-scaling it makes it worse,
and there is no higher-resolution original: `download_assets` returns the
upload itself. The panel that the generator actually draws scores 3.45.

`refkit batch` replays all 67 Phase-1 probes against the renders: **31 colour
probes at a mean Δmax of 0.1 and a worst case of 1**, 27 box probes at a mean
|dw| of 0.28pt and |dh| of 0.09pt on 01 to 05 and 0.60 / 0.20 on 06, and 9
edge scans at a mean |dx| of 0.12pt.

The colour mean is 0.1 rather than 0.0 because three tokens now hold the
value the app's own source states instead of the value the capture shows.
That is the section after next.

```bash
python3 tools/refkit.py batch mockups/canvases/snapaction-ios/probes.json --pt 3
python3 tools/refkit.py batch mockups/canvases/snapaction-ios/probes6.json
```

Both need `assets/refs/`, which is gitignored; `--against <dir>` adds the
replica column, where `<dir>` holds a render of each screen resampled to its
capture's exact size.

## Placing type by its ink, and the residual that is left

Every string on these boards is positioned by where its ink lands in the
capture, because that is the only thing a capture can tell you. Three
functions do it and each one earned its keep.

**`ct(ink, fs, lh)` turns an ink row into a line-box top**, as
`ink - ((lh - fs)/2 + K*fs)`, with `K = 0.115` solved off the renders rather
than taken from SF Pro's own metrics.

**One K is not enough, and the leftover does not follow the size.** After K
was solved, every call site was re-measured: where the capture puts a run's
ink row against where the render put it. The residual is stable per token and
has no relationship to font size. `t-code` at 13px wants its run 0.33pt
higher and `t-meta` at 12.65px wants its own 0.23pt lower, so no single K can
absorb both. Those fifteen numbers live in `FIT`'s `lift` slot and took the
five device screens from 10.17 to 8.88 summed.

**The left bearing is one number for the whole board.** `LSB = 0.06` of the
size, because CSS takes the box left and every Phase-1 x is where the ink
starts. The same pass that found the vertical residual measured each run's
left edge too; every token came back inside a third of a point, and sweeping
the per-token corrections in moved no frame by more than 0.03. Grouping the
same measurements by the run's leading glyph instead was no better: the four
glyphs with five or more call sites all sit within 0.016 of 0.06. Swept
directly, LSB is a clean minimum on all five screens at once:

| LSB | 0.030 | 0.045 | **0.060** | 0.075 | 0.090 |
| --- | --- | --- | --- | --- | --- |
| 01 to 05, summed | 12.64 | 9.63 | **8.88** | 10.26 | 12.83 |

(06 places its type by line-box top straight off the Figma node, so it has no
`tl`/`tr` call site and no bearing to get wrong.)

Both sweeps in this section were run before the corner radius was corrected,
so their 8.88 is the same five screens the table at the top now scores at
8.63. The type placement did not change; the base under it did.

The one exception is a leading "1" in tabular figures, which sits centred in
the tabular advance and so starts one more bearing in. `LSB_TAB1` is that
term, measured at +1.3pt on five 21.5px runs.

## What the file said, and what the renders corrected

**The `font:` shorthand resets `font-variant`.** The captures set two tokens
in tabular figures: "17:10" measures exactly as wide as "14:00", and on 02's
overdue date line every advance after the 1 runs about 1.2pt short of what
proportional SF Pro gives. A `.t{font-variant-numeric:tabular-nums}`
rule fixed nothing, silently, because every run sets `font:` inline and the
shorthand clears the property. It has to be in the same inline string, which
is what `FIT`'s `css` slot is for. Worth 0.28 across the set, and no other
token wants it: t-time costs 0.35, t-day 0.26, t-p5-row 0.24.

**Chrome does not snap text to whole pixels.** The residuals above are all
around a third of a point, which looks exactly like a rounding floor, so it
was worth ruling out. A probe page rendering one run at eight declared tops
0.0 to 0.7px apart returns ink tops of 24.33 / 64.33 / 104.67 / 144.67 /
184.67 / 225.00 / 265.00 / 305.00: the ink tracks the fractional declaration,
and the 1/3 pt granularity is the 3x raster, not the layout.

**`line-3` was never a real token.** 02's two header pills looked like they
carried a lighter outline than the cards. Solving it properly, by summing the
ink deficit across the band and calibrating the resampler's leak off a render
of a known value, puts the reference at 43 levels on the top edge and 43.2 on
the bottom. That is `#2B2B2B`, one level from `--x-line`'s `#2A2A2A` and
inside the solve's error. The whole-frame delta could not tell: it reads 16.17
for every value from `#2A2A2A` to `#363636`. The measurement decided it, the
metric could not, and the token is gone.

**LANCZOS rings, and it corrupted four probes.** 06 is the only capture the
render has to be scaled *down* to reach. Lanczos overshoots at high-contrast
edges, so the darkest few percent of black-on-white type came back at
`#000514` where the token is `#111827`, and the four 06 ink probes each read
14 to 22 levels off with nothing wrong on the board. A plain area average
matches the reference exactly and scores 0.13 better. 01 to 05 are the other
direction and stay on Lanczos.

**iOS sets U+202F before AM/PM**, not a normal space. 05's two flight rows
are the only place it shows.

**Two of refkit's tools do not work on a dark UI.** `bands --thr` selects ink
*below* a luminance threshold, and `hairline` solves for a rule darker than
its ground, so on white-on-black they return the background and `#000000`
respectively. The bands here come from a max-based profile and the rules from
`scan`.

## What the app's own source settled

SnapAction's iOS source arrived after the board was finished, which makes it
a clean test. Every value on the five dark screens had been sampled out of a
capture with no sight of the code behind it.

**Colour: 17 of the 28 sampled values are a named token, exactly.** Same hex,
all three channels, no rounding:

| sampled | `DesignPalette.swift`, dark side |
| --- | --- |
| `--x-bg` `#000000` | `DSPalette.canvas` |
| `--x-card` `#191919` | `DSPalette.card` |
| `--x-chip` `#232323` | `DSPalette.well`, and `track`, one value in two roles |
| `--x-blue-bg` `#1E2A47` | `DSPalette.actionBlueFill` |
| `--x-green-bg` `#173626` | `DSPalette.successFill` |
| `--x-amber-bg` `#3C2A18` | `DSPalette.pendingFill` |
| `--x-line` `#2A2A2A` | `DSPalette.hairline` |
| `--x-line-2` `#4E4E4E` | `DSPalette.dash` |
| `--x-ink` `#F7F6F2` | `DSPalette.display` |
| `--x-ink-2` `#DEDCD6` | `DSPalette.textPrimary` |
| `--x-ink-4` `#8A8781` | `DSPalette.textTertiary` |
| `--x-blue` `#6E92FF` | `DSPalette.actionBlue`, `link` and `pinned`, one value in three |
| `--x-blue-2` `#4A74FF` | `DSPalette.accent` |
| `--x-green` `#5BD68A` | `DSPalette.success` |
| `--x-green-2` `#8FDCA8` | `DSTypeBadge` article text |
| `--x-amber` `#F0A468` | `DSPalette.pending` |
| `--x-red` `#FF7A6E` | `DSPalette.alert` |

**Three more are composites the source explains, and the arithmetic lands.**
`cardSurface(isSelected:)` paints `DSPalette.accent` at `DSOpacity.fillSubtle`,
which is 0.10, over `DSPalette.card`; that blend is `#1E2230` on every channel
and `--x-card-sel` was sampled at `#1E2230`. `UIColor.separator` in dark mode
is (84, 84, 88) at 0.60, and over the black canvas that is `#323235`, which is
`--x-hair` to the level. The same separator over `--x-detail` gives `#3E3E41`
against a measured `#3D3D41`.

**Three were one level under, and the source wins.** `--x-art-bg` `#1F2E24`
became `#1E2F24`, the article badge fill. `--x-ink-3` `#A8A6A0` became
`#A9A6A0`, `DSPalette.textSecondary`. `--x-ink-5` `#8D8D93` became `#8E8E93`,
which is `UIColor.systemGray` and not a design token at all. Two of the three
are a brightest-percentile read on antialiased light-on-dark ink, which sits
just inside the true value by construction.

**The remaining five have no token anywhere, and the source says so.**
`DesignPalette.swift` opens by calling the surviving `systemBackground`-family
fills migration debt, and that is exactly what is left: `--x-detail` is
`UIColor.secondarySystemBackground`, `--x-scroll` is the system scroll
indicator, and `--x-white`, `--x-ink-btn` and `--x-line-4` are Liquid Glass.
`DesignGlass.swift` confirms the last three: the FAB and the filter button are
`.glassProminent`, a material, so the capture is the only source they have.

**Type: the measured fit beats the nominal point size, 13 times out of 14.**
`DesignTypography.swift` builds its ramp out of semantic fonts, so at the
default content size the sizes resolve: `.subheadline` 15, `.footnote` 13,
`.caption` 12, `.title3` 20, `.title2` 22, `.headline` 17. Pairing each `t-*`
token with its nearest ramp entry by size, 19 of the 22 land on an entry whose
weight is identical too, and seven land on its size to the pixel. That leaves
fourteen, plus `t-time`, which is the status bar clock and not an app token.
Setting each of the fourteen to its nominal size, one at a time against the
same base, changed the six-board sum like this:

| token | fit | nominal | cost | | token | fit | nominal | cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t-date` | 14 | 15 | +1.77 | | `t-tab` | 10.6 | 11 | +0.18 |
| `t-title` | 14.95 | 15 | +1.06 | | `t-btn` | 16 | 15 | +0.15 |
| `t-big` | 21.5 | 22 | +0.90 | | `t-chip` | 11.3 | 11 | +0.05 |
| `t-meta` | 12.65 | 13 | +0.75 | | `t-p5` | 16.8 | 17 | +0.03 |
| `t-p5-row` | 15.05 | 15 | +0.36 | | `t-tag` | 12.2 | 12 | +0.03 |
| `t-place` | 12.5 | 13 | +0.24 | | `t-code` | 13 | 12 | +0.02 |
| | | | | | `t-tag-2` | 12.2 | 12 | +0.01 |
| | | | | | `t-code-2` | 12.5 | **12** | **-0.02** |

So `t-code-2` moved to 12, which is `Font.dsMetaInteractive` exactly, and the
other thirteen kept their fits. The fits are absorbing something real: iOS
tracks SF Pro at its own size-dependent table and Chrome does not, and where
the gap is large the token is probably a different role than the ramp entry it
most resembles. Either way the render decides, and it prefers the measurement.

**Radius: the source found a real error.** `--x-r-card` had been fitted as a
circular 14.5px on four card corners. The source says `DSRadius.card = 18`
with `style: .continuous`, and CSS `border-radius: 18px` is not just more
honest, it is better: 1.58 / 2.28 / 2.38 / 1.35 goes to 1.54 / 2.13 / 2.34 /
1.33 on the four screens with cards. The 05 detail card is the same constant
and its own fit had already landed on 18, so `--x-r-detail` was folded into
`--x-r-card` and one token is gone. `--x-r-pill` stays a capsule: the source
asks for `DSTimeCard.actionChipRadius = 8` continuous, whose shoulder runs
1.53 x 8 = 12.2pt in from each corner and so overruns a 20.3pt chip, and
setting 8px costs 0.04.

**Geometry and copy: nothing to correct.** `DSCard.homeGutter` is 18 and
`--x-gutter` is 18. `DSCard.gap` is 12 and the gap between 01's first two
cards measures 12.0. `DSTimeCard.tile` is 24 and `--x-tile` is 24.
`DSTimeCard.dateHeaderGlyph` is 15 and `--x-cal` is 15. `DSStroke.selection`
is 2 and `--x-blue-2` was scanned off a 2pt border. Every string on the boards
is a real entry in `en.lproj/Localizable.strings`, format strings included:
`"Register · %1$@ left"`, `"All day · %1$d days"`, `"Expires %1$@"`,
`"%1$d mins"`, `"overdue"`, and the separator is U+00B7, which is what
`&middot;` emits.

Net effect on the five dark screens: 8.88 to 8.63.

## The one board that is not a replica

`00a-product` is not measured against anything, because there is nothing to
measure it against: SnapAction is ReScience Lab's own app, and this board is
the product rather than a copy of it. The copy and the icon are the App Store
listing's, the facts come from the iTunes lookup, and the two QR codes are
built from the URLs and decoded back to prove they carry them.

Its foot is the exception. `snapaction.ai` ships its palette as `oklch()`
custom properties, and converting them to sRGB says the site and the app do
not share one: the site's `--app-blue` is `#0071F4` where `DSPalette.accent`
is `#4A74FF`, and its `--surface-dark` is `#101214` where the app's canvas is
true black. That is a real drift between a product and the page selling it,
and it is the sort of thing the rest of this folder exists to find.

## Assets

`assets/` holds what the boards embed, so they rebuild offline.

- `art/`: 80 PNGs. 74 are crops of a capture at the box named in
  `crops.json`, cut by `gen.py` and placed back by `art()` at the same
  numbers, so an asset cannot drift from where it was measured. Three are
  06's, and they are not crops: capture 06 stops at x 380.5 and y 168.75, so
  the thread, the avatar and the app icon come from the Figma node's own
  exported assets and are committed as-is. The last three are `00a`'s: the
  App Store icon at 264px, and two QR codes generated with `segno` and
  decoded back with Vision to check they carry the URLs printed under them.
  **Committed**: without it the boards have no artwork.
- `refs/`: the 6 captures. **Gitignored**, along with the `ref-*.html` boards
  built from them: they are whole app screens, not component art.

Nothing on these boards is generated. Chrome is CSS: cards, pills, chips,
rules, the tab bar, the action bar, the status bar clock, every glyph that is
not a photograph.

## Regenerating

```bash
python3 mockups/canvases/snapaction-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical. The boards are
output: edit `gen.py`, never the HTML. With `assets/refs/` present it also
re-cuts `assets/art/` from `crops.json` and emits the 6 reference boards;
without it, it uses the committed art and skips them.

Verify with:

```bash
python3 tools/refkit.py tokens mockups/canvases/snapaction-ios
python3 tools/refkit.py shoot mockups/canvases/snapaction-ios/*.html \
    -o shots --scale 1 --check-overflow
```
