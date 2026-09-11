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
| Notifications onboarding | 4.44 |
| Permission alert | 3.75 |
| Today | 6.17 |
| Apple Account sheet | 3.62 |
| Games | 7.09 |
| Apps | 7.50 |
| Arcade | 4.88 |
| Search | 8.02 |
| Sign in to purchase | 4.49 |

Four things in those numbers are by design, not defects:

- **The captures have no Dynamic Island and no home indicator.** iOS leaves
  both out of a screenshot. The frame draws both, so y 11–48 in the middle and
  the bottom 16 pt of every white screen score as wrong. On Search they are
  the three worst bands on the board.
- **The status bar is the template's, not the capture's** (see below). When
  only its glyphs differed that cost 0.2 to 0.5 a screen.
- **The interface is rebuilt, not cut** (see below). With the chips, tab
  glyphs, keyboard, marks, p1's illustration and the type over the pictures
  still cropped from the captures, and the captures' clocks, person badge and
  p2's Focus island still in the status bar, the nine read 2.32–8.00. Rebuilt,
  they read 3.62–8.02. A crop scores 0 by construction, so that is the price
  of a board whose interface can be edited, and it is paid on purpose.
- **The floating tab bar is a blur over whatever the board placed under it.**
  `refkit diff --regions` flags the tab bar on Today, Arcade and Search, the
  three screens with content running under it, and nowhere else. The
  captures' glass is clearer than the template's blur: Today's third headline
  and the fifth and sixth Browse labels read through it there and not here.

`probes.json` replays the colour measurements behind the tokens against the
renders: 15 probes, mean Δ 0.2, worst 2. `regions.json` names the status bar,
island, content, tab bar and home indicator for `refkit diff --regions`.

## The status bar is the template's, byte for byte

`.sb`, `.sb .time`, `.sb .island`, `.sb svg`, `.home`, `SB_ICONS` and
`statusbar()` are copied from `templates/gen.py` unchanged. All nine screens
call `statusbar()` as the template does, so every clock reads 9:41 over the
template's plain island. The one change for this frame is a `.glyphs`
wrapper moved +6 pt, because the template is drawn for 393 and this frame is
402. The +6 puts the battery's right edge at 366.3, against 366.7 measured on
p6.

Nothing in the captures' own status bars is carried over, whether drawn or
cropped:

- the clocks (16:57, 16:58, 17:01);
- the person badge beside them;
- p2's mute bell and its expanded Focus island;
- iOS 26's filled battery and the dim no-service bars.

The status bar is shared chrome across every board in the repo, and a
per-capture copy is the drift the rule exists to stop.
`skills/clone-prototype/SKILL.md` says so.

## Where the pictures come from

Three sources, and one rule picks between them (it is also the comment above
`app_icon()`):

- **Interface is rebuilt.** The type, pills and badges, the keyboard, the
  sheets' marks and close buttons, the chips' and tabs' glyphs and p1's
  illustration are HTML and CSS. The glyphs have no published outline, so each
  was traced from the capture into an SVG in `assets/icons/` whose viewBox is
  its ink box in page points. The Arcade logo is the exception: it is SF's own
  Apple glyph, U+F8FF out of `SFNS.ttf`, kept as a path.
- **An app icon is the original.** `app_icon()` asks the iTunes lookup API
  for the track id in `icons.json`, downloads the 1024 px artwork, and masks it
  to the superellipse at 3× its placement size. That includes the icons set on
  artwork: ABC News, Disney Solitaire, Procreate, Meowdoku and Royal Match.
- **Only a picture is a crop**, from `crops.json` at its measured box: the
  Today cards' pictures, the Games, Apps and Arcade heroes and the Browse
  tiles' illustrations. The App Store's editors publish none of it anywhere
  else at full size. What the App Store sets over a picture is not the
  picture, though. The crop's `erase` list names it: a box for an icon or a
  pill, and a box plus a threshold for type. `cut()` inpaints it out of the
  crop with a harmonic fill before the board draws it again live. That covers
  the lockups' icons, names, subtitles and Get or price pills, Today's
  eyebrows, headlines and Ad badge, the Browse labels and the Arcade wordmark.

The one kind of picture cut whole is a **peek**. That means the 10–12 pt
slivers of the next card or row at the right edge of Games, Apps and Arcade,
and the 20 pt strip of the fourth Browse row below the tab bar. Too little
shows to name the app or read the label, so there is nothing to rebuild them
from.

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
the title drawn live over it. 136–383 is a photograph, so it is one crop. The
Arcade wordmark on it is not part of the photograph. The logo is the SF glyph
scaled to the capture's 12.7 × 15.7 ink, and "Arcade" is live at 500 20 px
with −0.05 px tracking, which lands its 62.7 pt ink exactly. `cut()` inpaints
both out first. Below that the ground is pure black, and the headline, offer
button and footnote are type again.

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

**The keyboard is rebuilt key by key.** p9's floating iOS 26 keyboard is a
panel from y 545.3 with r 28 top corners. Its keys are 42.3 tall on a 54 pitch,
and the letter keys are 33.3 wide on a 39.33 pitch from x 6.67, 26.33 and
65.67 for the three rows. Every glyph that is not a letter is traced into
`assets/icons/kb-*.svg`, among them shift, delete, return, globe, emoji and
mic.

## Assets

- `assets/art/`: 35 files, 18 crops and 17 app icons, about 4.6 MB.
  **Committed.** The boards are made of these, and a fresh clone without them
  renders empty frames. So, unlike its sibling `refs/`, this directory is not
  gitignored.
- `assets/icons/`: 36 SVGs, the traced glyphs and the Arcade logo.
  **Committed.**
- `assets/refs/`: the nine captures, `p1.png` to `p9.png`. **Gitignored**,
  along with the `ref-*.html` boards built from them. A fresh clone builds 14
  boards. `gen.py` only needs `refs/` again for a crop whose file is missing,
  so after changing a crop's box or `erase` list, delete its PNG.

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
