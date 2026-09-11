# App Store, iOS

Nine screens of the iOS 26 App Store on an iPhone 16 Pro, rebuilt from nine
native screenshots (1206 × 2622, 3×, so a 402 × 874 pt frame). 23 boards in
three rows: a token board, a type board and three evidence boards for 80
tokens, the nine replicas, and the capture of each column-for-column
underneath.

| Board | Capture | What it is |
| --- | --- | --- |
| `01-notify-onboard` | `p1` | Notifications onboarding sheet over Today |
| `02-notify-alert` | `p2` | The system permission alert over that sheet |
| `03-today` | `p3` | Today, three editorial cards |
| `04-account-sheet` | `p4` | Apple Account sheet, a grouped list |
| `05-games` | `p5` | Games |
| `06-apps` | `p6` | Apps |
| `07-arcade` | `p7` | Arcade, the one-month offer |
| `08-search` | `p8` | Search, with the Browse tiles |
| `09-signin-sheet` | `p9` | Sign in to complete a purchase, keyboard up |

## How close it lands

Mean absolute delta against the captures, whole frame, phone crop, in levels
of 255:

| Screen | Δ |
| --- | --- |
| Notifications onboarding | 4.26 |
| Permission alert | 2.32 |
| Today | 5.30 |
| Apple Account sheet | 3.65 |
| Games | 6.92 |
| Apps | 7.21 |
| Arcade | 4.85 |
| Search | 8.00 |
| Sign in to purchase | 3.46 |

Three things in those numbers are by design, not defects:

- **The captures have no Dynamic Island and no home indicator.** iOS leaves
  both out of a screenshot. The frame draws both, so y 11–48 in the middle and
  the bottom 16 pt of every white screen score as wrong. On Search they are
  the three worst bands on the board.
- **The status bar is the template's, not the capture's** (see below), which
  costs 0.2 to 0.5 a screen: the nine went from 2.14–7.49 to 2.32–8.00 when
  the redrawn glyphs were put back to the template's.
- **The floating tab bar is a blur over whatever the board placed under it.**
  `refkit diff --regions` flags the tab bar on Today, Arcade and Search, the
  three screens with content running under it, and nowhere else.

`probes.json` replays the colour measurements behind the tokens against the
renders: 15 probes, mean Δ 0.2, worst 2. `regions.json` names the status bar,
island, content, tab bar and home indicator for `refkit diff --regions`.

## The status bar is the template's, byte for byte

`.sb`, `.sb .time`, `.sb .island`, `.sb svg`, `.home` and `SB_ICONS` are
copied from `templates/gen.py` unchanged, and a check that compares the two
files passes on all six. The one change for this frame is a `.glyphs`
wrapper moved +6 pt, because the template is drawn for 393 and this frame is
402. The +6 puts the battery's right edge at 366.3, against 366.7 measured on
p6.

The captures do show different glyphs. iOS 26 fills the battery, the phone had
no service so all four bars are dim, and every glyph sits about 3 pt lower on
this taller status bar. None of that is redrawn. The status bar is shared
chrome across every board in the repo, and a per-capture redraw is the drift
the rule exists to stop. `skills/clone-prototype/SKILL.md` says so.

Two things are drawn because the template has no reason to ship them:

- **The person badge beside the clock**, on all nine captures, placed at the
  capture's 9 pt gap to the right of the template clock.
- **p2's expanded island**, a Focus activity. It is a crop, and p2's clock
  moves left to the capture's own centre, 53.6, to clear it. The bell beside
  the clock is a crop too, and the cellular bars are left out because the island
  covers them.

## Where the pictures come from

Two sources, and one rule picks between them (it is also the comment above
`app_icon()`):

- **An app icon is the original.** `app_icon()` asks the iTunes lookup API
  for the track id in `icons.json`, downloads the 1024 px artwork, and masks it
  to the superellipse at 3× its placement size. Nothing is gained by reading an
  icon out of a 62 pt crop when Apple serves the file.
- **Editorial art is a crop of the capture** at its measured box, from
  `crops.json`: the Today cards, the game and Arcade heroes, the chips, the
  Browse tiles, p1's illustration and p9's keyboard. The App Store's editors
  publish none of it anywhere else at full size.

The five tab glyphs are SF Symbols with no published outline, so they are
crops turned into stencils (`kind: "mask"`). Alpha is how far each pixel falls
below the crop's 98th-percentile ground. The stencil then takes the tab
colour, so the selected blue and the unselected black come from one crop.

## What measurement found

**The sheets dim the status bar too.** p1, p4 and p9 are a full-width sheet
from y 62 with 38 pt top corners over a black 20% scrim. The page reads
`#CCCCCC` above the sheet, and the status bar is drawn *under* the scrim.
That is not how iOS layers it, but the pixels cannot tell: black ink stays
black under 20% black.

**p2 is three layers deep.** The pane is pushed back to y 72, the sheet it came
from shows above it as a narrower card (16.5–385.5, r 34), a second scrim takes
the white to `#A3A3A3` (255 × .8 × .8), and the alert is glass on top. The
pane under the alert is not the same geometry as p1: the illustration is 353
tall rather than 357.3, and the copy sits 5.6 lower, while the button and the
link do not move.

**p7 has three grounds, each rebuilt from what it supports.** Rows 0–136 are
a smooth vertical ramp, per-row sd under 7, so they are a CSS gradient with
the title drawn live over it. 136–383 is a photograph under the Arcade
wordmark, so it is one crop. Below that the ground is pure black, and the
headline, offer button and footnote are type again.

**Today's card shadow is solved, not styled.** The ground reads `#E6E6E6`
at 1 pt from the card edge, `#ECECEC` at 6, `#F3F3F3` at 12 and `#F8F8F8` at
18, above the card as well as beside it. That fits a zero-offset Gaussian of
sd 15 at alpha .21 to within a level, and it predicts the `#E0E0E0` the 16 pt
gap between two cards shows.

**Search's headings are a size smaller.** "Suggested" and "Browse" are 0.775
of the section headings on Games and Apps, chevron included (`t-group`,
700 16 px). At `t-section` they rendered 121.3 and 87.3 wide against 94.0 and
67.7; at `t-group`, 95.0 and 68.0. The fourth row of Browse tiles sits under
the tab bar, and only its bottom 20 pt shows below the bar. That strip is a
crop.

**Chrome's SF sets a capture's N pt at about 0.95 N px.** Every type token
was fitted by rendering the string and matching its ink box against the
capture, not by reading a point size off it. Each type row on the evidence
boards names the string and the render it was fitted against.

**The keyboard is a crop.** p9's floating iOS 26 keyboard is system chrome,
like the status bar, and thirty keys rebuilt add nothing the crop does not
already carry.

## Assets

- `assets/art/`: 59 files, 47 crops and 12 app icons, about 5 MB. **Committed.**
  The boards are made of these, and a fresh clone without them renders empty
  frames. So, unlike its sibling `refs/`, this directory is not gitignored.
- `assets/refs/`: the nine captures, `p1.png` to `p9.png`. **Gitignored**,
  along with the `ref-*.html` boards built from them. A fresh clone builds 14
  boards; `gen.py` only needs `refs/` again for a crop whose file is missing.

The artwork is Apple's and its developers', reproduced for design reference.
It is not licensed for redistribution as product artwork.

## Regenerating

```bash
python3 mockups/canvases/app-store-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical, without `scratch/`.
The boards are output: edit `gen.py`, never the HTML.

Verify with:

```bash
refkit tokens mockups/canvases/app-store-ios
refkit batch mockups/canvases/app-store-ios/probes.json --against <renders> --pt 3
```
