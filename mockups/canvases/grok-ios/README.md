# Grok, iOS

Fifteen screens of the Grok iOS app: the Home Screen widget on the system
widget gallery ground, two pages of the in-app widget guide (the first and
the last step), the Voice Settings sheet over the 3D companion scene, the
SuperGrok paywall, the Terms update interstitial with its Got it pill and
again with a spinner in the pill, the Introducing Grok Bot sheet over the
Terms page, the App Store sheet for Grok Bot, the SuperGrok home with its
composer, the voice picker on two of its voices, and the Settings sheet at
three scroll positions. 01–05 and 08–12 are Mobbin captures of a 393pt
phone; 06, 07 and 13–15 are native captures of a 402pt one. Twenty-six
boards in three rows, plus fifteen more that park each capture under its
replica. The rows run in flow order, so 13–15 sit between 06 and 07: the
spinner and the two Grok Bot sheets follow the Terms update they come from.
A board's number is the capture it was built from and does not move.

| # | Board | What it shows |
| --- | --- | --- |
| 00 | `design-tokens` | The 167 tokens, as one `:root` block |
| 00a | `type-tokens` | The type ladder, one row per size |
| 00b–00j | `evidence` | One row per token, with the measurement behind it |
| 01 | `widget` | The medium Home Screen widget on the gallery's grey |
| 02 | `widget-guide-add` | "Find Grok in the list, choose a widget size, then tap Add Widget.", dot 4 |
| 03 | `widget-guide-jiggle` | "From the Home Screen, touch and hold an empty area until the apps jiggle.", dot 1 |
| 04 | `voice-settings` | The Voice Settings sheet over the companion scene, recording |
| 05 | `supergrok` | The SuperGrok paywall: five features, two plans, the CTA |
| 06 | `terms-update` | "Updates to our Terms of Service and Acceptable Use Policy", Got it, Sign out |
| 07 | `home` | SuperGrok home: the header, three suggestion chips, the composer with Auto and Speak |
| 08 | `voice-select-ara` | The voice picker on Ara, "Upbeat Female", dot 1, "Swipe to explore more voices" |
| 09 | `voice-select-eve` | The voice picker on Eve, "Soothing Female", dot 2, the Continue pill |
| 10 | `settings` | The Settings sheet: profile card, General, the top of Voice |
| 11 | `settings-voice` | Settings scrolled to Voice, Data & Information, Terms, Report, Subscription |
| 12 | `settings-bottom` | The bottom of Settings: Sign Out, the xAI mark, the version line |
| 13 | `terms-loading` | The Terms update with a spinner in the Got it pill |
| 14 | `grok-bot-sheet` | "Introducing Grok Bot" over the dimmed Terms page: the card, three lines, Upgrade to Access |
| 15 | `app-store` | The App Store sheet for Grok Bot: ratings, the bundle, What's New, previews |

## How close it lands

Mean absolute delta against the captures, in levels of 255, over the window
described below:

| Screen | Δ |
| --- | --- |
| 01 Widget | 0.27 |
| 02 Widget guide, step 4 | 1.41 |
| 03 Widget guide, step 1 | 1.04 |
| 04 Voice settings | 9.53 |
| 05 SuperGrok | 5.77 |
| 06 Terms update | 0.95 |
| 07 Home | 0.80 |
| 08 Voice selection, Ara | 0.75 |
| 09 Voice selection, Eve | 0.74 |
| 10 Settings | 1.50 |
| 11 Settings, Voice | 1.66 |
| 12 Settings, bottom | 1.06 |
| 13 Terms update, loading | 0.92 |
| 14 Introducing Grok Bot | 3.83 |
| 15 App Store, Grok Bot | 2.12 |

The spread is what the pixels are. On 01 most of the frame is a crop of the
capture or a flat ground the census read to the level, and the type on it is
one nav title and two lines of body. 04 is the one screen whose ground is
generated (the section below): its 9.53 is nearly all the companion's body
under the sheet, where the gpt-image-2 body is narrower than the blurred one
the capture shows (the worst 40pt blocks, 38 at x 140–160 y 559, are the
hoodie's edges), while the sheet's type, rows and discs on top of it sit at
the same numbers as before; as a crop of the capture the screen read 1.00.
02 and 03 carry the guide illustration, and it is drawn, not cropped (the
section below): as crops the two read 0.90 and 0.89, drawn they read 1.42
and 1.04, and on 02 the illustration's own box reads 2.28, nearly all of it
inside the perspective card, whose pill label is set in a face the capture's
is taller than. 05 is the only screen where most of what the window sees is
type set by the platform face over an inpainted hero: eighteen lines of it,
white on black, where any sub-pixel disagreement in a glyph edge costs
60–100 levels on that pixel. Split into glyph and ground, the title band
reads 66 on its glyph pixels and 3.8 on the rest; the ground under every
line of 05 is within 3–6 of the capture. 06, 07 and 13–15 are scored on
their own pixel grid, 3 px per pt, where a glyph edge a third of a point off
costs less than it does through a 2.2417 downscale. 06, 07 and 13 are white
pages with a few lines of type, and the worst 40pt block on each is type
within a point of its measured box: 'Sign out' at 17.5 on 06 and 20.3 on 13,
06's title at 17.4, 07's header at 19.7. 14 is 13's page under a scrim and a
glass sheet, and its worst blocks are that same title under the scrim at
14.7–16.2; the Grok Bot card, fitted below, reads 2.55 over its box and is no
longer among them. 15's worst blocks are lines of
type at 20–22, the release notes among them, over crops of the icon, the
stars, the bundle and the previews. 08–12 go back through the downscale. The
two voice screens are a flat dimmed ground, a flat card, and one crop each
for the orb and the band under it, so what is left is glyph fringing on
'Imagine' and on the card title, 13 and 12 in their 40pt blocks with the
offset probe at 0. The three settings screens are white cards of 17px type
on a grey sheet; their worst blocks are the profile card's name and email at
18 (offset probe at 0 again) and dense row labels at 10–11, and none is a
placement a blend can see.

`refkit batch probes.json --against scratch/cap --pt 2.2417` replays the 138
Phase-1 probes against the renders (the probes on 06, 07 and 13–15 carry
their own `"pt": 3`): 70 colour probes at a mean Δ of 2.6, 53 box probes at
a mean |dw| of 0.35pt and |dh| of 0.22pt, and 15 edge scans. The worst
colour probe is 12's 'Sign Out' at 20: the token is the label's own
most-covered pixels, #BE484C, and the render's core comes back more
saturated (#B93A3F against the capture's #AE4E52) through the same
resampling that darkens every grey ink below. Next is 04's hoodie through
the sheet at 11, the generated body against the capture's; the pill under
the same sheet lands within 2. The seven scans through real edges land on
the capture's own edge to the pixel, the settings sheet's edge at 58.7, 14's
sheet outline and 15's rule among them, and so do the two through 02's drawn
card edge and pill cap; the two through 02's fitted shadows land 3 and 9pt
off, because a scan reports the largest step and inside a smooth ramp that
step moves with one level of noise, so the value behind those two tokens is
the sweep in their evidence rows, not the scan. 07's composer line lands 2pt
high, 736 against 738, for the same reason: with the line at #F9F9F9 the
largest step in the render is the halo's. The five grey-ink probes on 01–05
read Δ 7–11, the four on 08–12 (the voice sub-line, the section, secondary
and version inks) 6–11, and the two inks inside 02's drawn sheet read Δ 15
the other way (`illo-label` #333333 replays as #242424), and that is the
scoring, not the ink: the render is downscaled with LANCZOS, whose ringing
puts the brightest 8% of a grey glyph 7 levels *above* the CSS colour
(`mute` #A9A9A9 replays as #B0B0B0), while the capture's blur keeps its
brightest 8% a few levels *below* the true ink. At 3% and 15% the pattern is
the same. The tokens are the capture's own core values and were left alone.
The same replay on the five native screens, where nothing is downscaled,
reads every ink probe at Δ 0 and every fill within 3, the largest 14's scrim
(#CFCFCF against #CCCCCC) and the pill through the glass (#929292 against
#959595). The grey copy on 06 is cored on a grey-only window, because a
window that takes in the black 'Terms of Service' span reads the span's
pixels, not the grey.

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

06, 07 and 13–15 come from a 402 × 874 phone at exactly **3 px per pt**
(1206 × 2622, both axes), so their renders need no downscale:
`refkit shoot --scale 3` on the whole board, the phone cut at its offset
inside the bezel ring (147, 72 px, asserted on the ring's colour) to 1206 ×
2622, the 52pt corners masked and composited onto the capture
(`scratch/run13.sh`). The phone on these boards is 402 × 874 with no home
indicator, because the captures show none, and it sits on the 478 × 980
board with 38pt to spare on each side. Excluded: the top 59pt. These
captures do carry a real status bar and Dynamic Island, and the boards do
not replicate them: the ask was to use the template's status bar (9:41, the
template island and glyphs) rather than clone the capture's clock, bell and
right cluster, so nothing above 59pt is compared. 06 and 07 were first built
from 1290 × 2796 captures of a 430pt phone; on request they were rebuilt
from 402pt ones, and every number on them here is the 402pt one.

08–12 are Mobbin exports again, 881 or 882 × 2000 with a 90px Mobbin footer,
cropped to 881 × 1910 (the 882-wide ones lose their last column), scored
through the same 2.2417 downscale as 01–05. Three of them, cp8, cp9 and
cp12, carry a colour cast the other seven captures do not: at every grey
the red and blue channels sit 3 above the green, so the voice screens'
dimmed ground read #CDCACE where 02's identical ground reads #CBCBCB, and
12's sheet read #F8F6F9 where 11's reads #F6F6F6. A per-channel monotone
lookup, fitted on the elements 12 shares with 11 (the sheet, the cards, the
rule, the row ink, the section ink, the chevron), is applied to those three
captures before anything is sampled or cut, and that is what
`assets/refs/cp8.png`, `cp9.png` and `cp12.png` hold; the originals are in
`scratch/orig/` and the table in `scratch/lut12.npy`. After it the voice
ground reads #CBCBCB, `dim`, and 12 matches 11 within a level everywhere
the two overlap.

## What is a crop, what is drawn, what is fitted

**Every icon but seven is a crop of the capture**, not a drawing: 64 of
them, each cut at its measured ink box grown by 1pt and placed back at the
same numbers (the `-ic-` ids in `crops.json`), and that includes the three
inside 02's drawn illustration, the app icon, the close disc and the Grok
mark in the widget's pill. That was asked for explicitly, that the icons
match the source exactly, and a crop is the only asset that scores 0 by
construction. It is also the only honest one: most of these glyphs are SF
Symbols, whose outlines may not be redistributed, so a hand-drawn SVG would
have been a near-copy of a licensed shape that was still measurably wrong.
The cost is that the canvas's inspector names them by image content from
`assets/art/`, not as vector assets. The seven exceptions are the three side
glyphs on 04 and the four marks on 07's chips (the section below). Three of the crops are keyed: the close,
AirPlay and microphone glyphs on 04's voice sheet were cut with the sheet's
blurred ground in their 1pt margin, and now that the sheet is drawn rather
than cropped, `cut()` keeps each one's coverage (the largest channel's (p −
g) / (255 − g) against the median of its margin) as white on alpha, so the
glyph is still the capture's and the ground under it is the board's.

`scratch/icons.py` is the check that they are: it finds every placed crop
and inline SVG in the boards (107 placements, the chevron counted each time
it is set) and scores each one's window against the capture, with a shift
search of ±4 capture pixels. Every placement lands within one capture pixel
of the capture's own glyph. A crop's shape is the capture's by construction;
the seven vectors' are measured, in the section below.
`art()` places each crop on the pixels `cut()` took rather than at the pt
box: a box like 291.5pt on a 3px/pt capture is not a pixel edge, and a crop
set there was resampled by half a pixel on the way back. On 06, 07 and
13–15, where the render shares the capture's grid, that snap makes every
icon an exact copy, Δ 0.0 over its ink at offset 0 (on the first, 430pt 07
the mic, the Auto rocket and the bank glyph read 14–26 before it). On the
Mobbin screens the render is shot at 3px/pt and downscaled to 2.2417, two
grids that share no edge, so a crop's ink reads Δ 5–25 through that chain at
whatever sub-pixel phase it lands on; the montages in `scratch/icons/` show
the three columns, capture, render and difference, and the difference is a
one-pixel ring on every edge and nothing inside it.

### Seven vector icons

The focus, hanger and trash glyphs in 04's side discs were asked for as
vectors, so each is an SVG in `assets/icons/04-<name>.svg` whose `viewBox`
is its measured ink box in pt (`345.2 129.3 19.8 19.8`, `343.8 180.6 22.1
18.9`, `347 233.6 16.7 18.5`), inlined by `icon()` at the same numbers so
the drawing is 1:1 with the measurement and the inspector names it as a
vector asset. They were traced against the capture's coverage, not by eye:
each box's local ground is a 15px median (a stroke is 3-4px), coverage is
(p − g) / (205 − g), and the row and column sums of that map, the ink area,
a ±4px offset probe and a polar profile for the focus ring were compared
between the render and the capture on every pass. What that settled:

- The ink is a flat `#CDCECF` (`--x-side-ink`), not white at an alpha: the
  top 3% of each box reads 203-208 over grounds of 163, 180 and 194, and
  white would need .16-.49 to fit the three.
- The strokes differ per glyph. Focus is 1.7 with a 3.05 dot and four L
  brackets whose corner radius is 2.6, the L and not an arc because both
  polar profiles dip at the diagonal; the ring's centreline is at r 9.0 in
  both. Trash is 1.6 with a 1.4 lid. The hanger is 1.3 with a 2.3 bar, read
  through the blue channel because its ground is a cloud within 10 levels of
  the ink in luminance; its tail is the left leg, and the right leg stops
  short of the stem.
- Ink area, in pt², after the last pass: focus 85.8 capture against 90.6,
  trash 100.9 against 102.4, hanger 87.6 against 96.2; the offset probe is at
  0 on all three. The 20pt boxes read 6.5, 4.0 and 6.0 mean Δ, nearly all of
  it the generated scene under the glass discs, so the crops' 0 there is
  not a number a vector can reach and 04's whole-frame Δ moves from 9.51 to
  9.52.

The four marks on 07's chips are vectors for the opposite reason: they were
asked for as the original icons, so nothing in them is traced.
`assets/icons/07-{gmail,github,notion,bot}.svg` each carry the publisher's own
artwork, the original's children untouched under one `translate ... scale`,
inside a viewBox that is the box the artwork was fitted to. They replace two
crops, `07-ic-bot` and `07-ic-trio`, now gone from `crops.json` and
`assets/art/`.

The boxes were fitted, not chosen (`scratch/fit_icons.py`): each source is
rendered with the engine the boards are shot with, and a search over uniform
scale and integer-pixel offset about its own ink box takes the lowest coverage
delta against the capture's pixels. The winners, in pt:

| mark | box | mean Δ | source |
| --- | --- | --- | --- |
| Grok Bot | 28.333 691.667 18.667 × 18.667 | 10.80 | asvg.app, the logomark |
| Gmail | 317.333 696.333 13 × 9.667 | 5.03 | Wikimedia Commons, Gmail icon (2020) |
| GitHub | 333 695 12.667 × 12.333 | 18.92 | Iconify `logos/github-icon` |
| Notion | 348.333 694.667 12.333 × 13 | 11.95 | Iconify `logos/notion-icon` |

- The Δ is the board against the capture's own crop of that box grown by 1pt,
  and `scratch/marks.py` runs the same ±4 capture-pixel search the crops get:
  all four land at offset 0, and a ±12% sweep of the size finds the fitted box
  is the best one. A crop scores 0 by construction and published artwork
  cannot: GitHub's 18.92 is the largest because the app's invertocat is a
  little heavier than the published one at 12.7pt, where every edge is two or
  three capture pixels of antialiasing. Two sources were rejected on the same
  measurement: Iconify's `logos/google-gmail` draws the 2020 M as a gradient
  where the capture has it flat, and `simple-icons:notion` draws the N solid
  where the capture has it outlined.
- The three connector marks sit in white avatar circles, d 21.667pt at a
  15.5pt pitch, centres x 324.5 / 340 / 355.5 and y 701, painted right to left
  so each circle cuts the mark behind it, the way the capture shows them. A fit
  that does not model those circles reads the clipping as shape error, which is
  what `scratch/fit_trio.py` is for; the whole 134 × 43 px window of the old
  crop now reads 11.33.
- A viewBox is an ink box, so the ink has to land on it. `scratch/make_icons.py`
  takes each source's ink box off a 400px raster, and that put three of the
  four up to one capture pixel off the box they were fitted to. The correction
  is carried in the `translate`, never the viewBox (`scratch/tune.py` sweeps it
  in the board itself, in sixths of a point, against the capture): with it the
  rendered ink box is the viewBox on all four, and 07's two windows move from
  17.92 and 25.72 to 10.80 and 11.33.
- The marks keep their publishers' colours; only the Grok ball follows
  `--x-ink`, through the `currentColor` its logomark already uses. That ball is
  also wider than the crop it replaces -- 18.667pt against the 18.04 `07-ic-bot`
  was cut at -- so the vector puts back a sliver the crop had lost.

The pictures under the type are crops too: the smoke hero of 05 (`05-bg`),
the band that carries the voice card's bottom corners and shadow on 08 and
09 (`08-band`, `09-band`, y 700–852) and the header band of the settings
sheet on 10, 11 and 12 (`10-hdr`, `11-hdr`, `12-hdr`, y 54–150). All are
**inpainted crops**, and a reader should not take their pixels as the
capture's where the type was: the generator patches every box of type and
chrome out of the frame before cutting it (a Coons fill from each box's own
four edges, edge profiles smoothed over 9px) so that the CSS type lands on
clean ground. `INPAINT` in `gen.py` lists the boxes; on 04 (whose patched
frame is the top of the generated scene below) that is the nav, the four
side buttons, the grabber, the title, the close disc and both row labels
with their glyphs; on 05 the title, the subtitle, the plan group, the CTA
and the footer. 05's feature card is handled differently: its 6.7% white
material is un-applied inside the card box, its edge, corner arcs, five
discs and nine lines of type are patched, and the CSS card re-applies the
material, so the card's pixels under the type are solved rather than
sampled. On 08 and 09 the patched boxes are the four page dots and the swipe
hint (08) or the Continue pill (09), all drawn again; on 10–12 the
'Settings' title, and on 11 the 'Voice' label that the header's fade runs
through, set again over the crop. What is not patched stays as pixels: the
header material, the close disc and the fade under it on all three settings
screens, 11's ghost of 'NSFW Preferences' scrolling out under that fade, and
12's 'Shared Conversations' row, which sits under the same fade with an ink
of #1C1B1C and would be a flat CSS grey over a gradient the CSS does not
have. Nothing on 13–15 is inpainted: 13's spinner, 14's badge and 15's app
icon, stars, bundle artwork and two preview screenshots are crops cut as
they stand.

**The companion scene on 04 is generated, and the sheet over it is drawn.**
The capture holds the scene only above the sheet's edge at 403.6; below it
every pixel is the scene blurred and dimmed under the Voice Settings sheet,
and a crop of that (`04-bg` and `04-sheet`, the first version, 1.00) is a
screenshot of the sheet rather than a replica of it. On request the ground
was regenerated and the sheet rebuilt in code. `assets/art/04-scene.png` is
the patched capture above the sheet's edge (i4, so the head, the sky and
the buttons' ground are the capture's pixels) and a gpt-image-2 edit below
it, composed by `scratch/scene4.py` with a 6px blend at the seam. The edit
was made with `POST /v1/images/edits`, the frame as the image and its
sheet box as the mask, the prompt carrying the body's proportions read off
the capture through the blur (down x 130–210: red hoodie y 450–615, dark
shorts 630–670, orange legs 690–730, ground from 750). Nine candidates were
scored through the drawn sheet at the fitted material (mean |Δ| over the
sheet's box, x 8.5–393 y 404–838): three unmasked edits recomposed the
shot and moved the head (13.3–19.6, a seam step of 26 levels), two masked
edits without the proportions kept the head but ended the body at 635
(15.6 and 14.7, seam steps of 16 and 20), the two with the proportions
scored 16.3 and 14.7 with seam steps of 6 and 20, and two more asking for a
wider hoodie recomposed the body (19.7 and 21.0). The 16.3 with the 6-level
seam is the one shipped; the sub-bands are the band under the sheet's edge
at 8.8, the rows at 19.3, the body at 12.5 and the ground at 12.4 (+11.5
signed: the generated grass is lighter than the real one). Quality is
`medium`: every `high` request was cut at 60 s by the connection, four
times, sandboxed and not. The three faint voice-mode controls the capture
shows at the bottom left under the sheet (x 33, 89, 145, y 786, 3.6 levels
above the ground) are not drawn; the voice pill at the right is, a
`#767676` pill under the blur at its measured box (288.5–379.6 ×
767.4–801.3), so that it reads the capture's `#474747` through the tint.

The sheet is a `backdrop-filter: blur(4px)` over a `.40` black tint, a
grabber, a title, a close disc and two row cards that are a 1pt white line
at `.10` and no fill (radius 13, solved from where the line reaches full
coverage). Neither the blur nor the tint has a pixel to sample, and the
usual sweep cannot find them here either: with the scene generated, a sweep
walks to 44px and beyond because blurring the scene away hides the scene's
own error (13.3 over the sheet at 44px against 16.3 at 4px), and the pill
edge in the render, the one sharp edge the capture holds under the sheet,
says the blur is 3–4pt of sigma. So the blur is read off that edge, the
tint is the alpha at which the two bands the scene fits best (under the
sheet's edge and over the body) balance in sign at that blur, .40, and the
evidence rows carry both.

**The guide illustration on 02 and 03 is drawn**, the one picture that is
not a crop or a generation. It was cut from the capture at first (0.90 and 0.89), and it
was redrawn on request so that the boards hold it as code rather than as a
screenshot. 03's is a phone: a 301.6 × 330 frame with a 10pt stroke and a
53.5 corner, a 87 × 25 island, ten 52.2pt tiles on a 65 pitch at a 14.3
radius, four side buttons, all fading out through a mask whose stops are
the frame column's own fade profile (opacity 1 to .04 over 44pt, read at
8px steps). Frame, screen and tile greys are flat-fill censuses on 100%,
100% and 99.5% of their flats. 02 puts the add-widget sheet over the same
phone: a 12% scrim on the screen (the screen's #FAFAFA reads #DBDBDB and
#DDDDDD under it, the island still reads #A9A9A9, so the scrim lies under
the island), a white sheet at a 26.8 corner with a fitted halo, a 25.4 × 3.6
grabber, the label, title and sub-line at swept sizes, two blurred grey
blobs where the capture has the next widgets' ghosts, and the widget card
itself, a flat 130 × 90.9 rectangle seen in perspective. Its four edges were
fitted as lines to the capture (top `y = .1355x + 436.67`, bottom
`y = .0908x + 641.72`, left `x = -.0402y + 212.67`, right
`x = .0364y + 459.80` in the crop's own pixels), the corners they meet at
fix a homography, and the card ships as one CSS `matrix3d` with the pill
and its label as flat children the browser projects. The flat aspect of the
card is the one number the capture does not settle: the pill's caps
unproject to circles at any aspect from 1.1 to 1.4, so the aspect was
chosen to make the pill's 'Grok' set at SF Pro's own width-to-ink-height
ratio of 2.86, and the pill and ink boxes are the capture's edges
unprojected through that same matrix. The two shadows are fitted, not
read: the card's `0 4px 28px rgba(0,0,0,.24)` swept over dy 0–8 / blur
14–44 / alpha .12–.30 (minimum .85 over the 25pt above the card; 0 28px .18
costs .1, 4px 20px .18 costs 2.6), and the sheet's `0 0 24px rgba(0,0,0,.12)`
swept over blur 12–56 / alpha .05–.20 (minimum 1.51 over the 46pt above its
edge; 40px .08 costs .2). The remaining gap on 02 is the pill's 'Grok': the
capture's face sets it 34.3 × 15.2pt in projection where SF Pro at the same
width sets 13.4 tall, a taller face, and no size of SF Pro holds both the
width and the height.

Two strings on 07 are not fully knowable from the capture. The third
suggestion chip runs off the screen with only 'Try C' visible; its icon
trio is Gmail, GitHub and Notion, which makes the chip Connectors, and the
board sets exactly the visible 'Try C' with the chip clipped at the frame
rather than inventing the rest. One string on 10 is: the Dictation row's
label is cut by the frame, and the board sets it whole and lets the phone
clip it (the Source section).

Values no pixel holds, fitted rather than read:

- `material` .067, `disc` .17, `scrim-btn` .32, `glass` .09 and `grabber`
  .35 are alphas solved as (capture − patched frame) / (255 − patched frame)
  over rings that avoid the glyphs; the evidence rows carry each ring and the
  per-row spread.
- The Yearly card is a diagonal ramp, not a fill: its four corners census
  45/52/40/45 mean level, so it ships as `linear-gradient(to top right,
  plan-lo, plan-hi)` between the bottom-left and top-right censuses.
- 07's composer edge is a .67pt `#F9F9F9` line under one `box-shadow`,
  `0 4px 14px rgba(0,0,0,.07)`. The capture's edge is two capture px wide and
  darkest at the sides (#A9A9A9 at x 10.67), but drawn at .67pt any grey is
  too dark: swept from #A9A9A9 to #FFFFFF over the band y 728–862, the line
  reads 5.25 at #A9A9A9, 4.59 at #E4E4E4, 4.39 at #F9F9F9 and 4.41 at white,
  so the halo carries the edge. With the line there, the halo at blur 6 and
  14px by alpha .05–.09 lands 4.39–4.63, 14px at .07 the lowest.
- The voice card's shadow on 08 and 09 is `0 4px 16px rgba(0,0,0,.11)`
  over a 1pt white inset edge: the ground beside the card reads 7–11 levels
  under `dim` and 3 above it. Three geometries and five alphas were swept
  against the 7.5pt bands beside the card and the 23pt above it; .11 leaves
  them +0.2 / −0.0 / +0.5 signed, .10 is +0.6 / +0.4, .14 costs 1.6–2.1,
  and the other two geometries score worse at every alpha.
- 14's scrim is black at .19 and the sheet over it white at .5 through a
  `backdrop-filter: blur(19px)`. The page's white reads #CCCCCC under the
  scrim, (255 − 204)/255 = .20, and the Got it pill under the glass reads
  #8E8E8E at .19 and #8B8B8B at .20, so .19. The sheet's flats read white at
  .51 and the black pill through it .56 with its edges blurred in, so the
  blur was swept at .5 over the pill's band (x 40–360 y 764–784): 14px −6.63
  signed, 18px −0.92, 19px +0.17, 20px +1.57, 28px +11.9. At 19px the flats
  read −0.48 at .48 and +0.74 at .5.
- 14's sheet starts at 445.3: its outline reads 444.67–445.0 at x 200 and its
  first white row 445.67, and the corner's insets give `r-sheet-pro` 37. It
  carries a 1pt white inset line at top and bottom and a 4px white glow under
  the top edge; over the band y 436–470 the glow is worth .46 and the bottom
  line .02 over the screen.
- 14's body copy is iOS's plus-darker vibrancy, not a flat grey: each ink
  pixel is the ground under it plus `sheet-copy` minus white, so line 1 reads
  #5B5B5B over the sheet's white and line 3 near black over the blurred Got it
  pill. Chromium has no plus-darker, so each line is filled through
  `background-clip: text` with a vertical ramp of that sum, the ground taken
  from the capture every 2pt of y 704–766 at its 97th percentile over x
  60–330. The grey sweep is in the evidence row; blurs of 15 and 23px or glass
  at .44 and .56 score the copy worse than 19px at .5 does.
- 14's card is `card-blue` lightening to #6EB5FC over its top 110px, with a
  pale ellipse (`card-pale`) in its top-left and a thin ring of #0A84FF at .18
  outside it. The capture's pale shape holds 243 across its left and fades out
  over some 60pt to the right, but falls off within 12pt along its bottom, and
  its darker ring runs 20–30pt outside that edge rather than on it. So the
  ellipse fades along its own width (full to 221.7px, clear by 301.5px) under
  `blur(6.3px)`, and the ring is the same ellipse grown by 33.4 with a 12.7px
  border under `blur(2.7px)`, both rotated 17.9°. All of it is one
  least-squares fit of that construction to the card at 1pt, outside the bot
  glyph, its title and the badge: mean |d| 3.13 at the start, 1.87 fitted. The
  bottom-left glow fell to .03 in the fit and was dropped. In the browser the
  card reads 2.55 against 4.26 before, and ring alphas .10 and .26 read 2.60
  and 2.57.
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
- On the 3px/pt screens the fits are finer because the captures are, each a
  width on the board against a width on the capture: `t-hdr` is 22px
  semibold **with .12px of tracking**, because 'SuperGrok' measures 107.7
  wide where the untracked face sets 106.7 and its S, G and k are a point
  wider than medium's; `t-link` 16.75px ('Sign out' 61.7, 17px sets 63.0),
  `t-btn` 15.5px semibold ('Got it' 39.7 and 'Upgrade to Access' 138.7 at
  one size), `t-ask` 16px, `t-speak` 14.5px, `t-sheet-h` 18.2px,
  `t-sheet-copy` 15.25px, `t-card` 36.5px medium ('Grok Bot' 136.7 on the
  card, 36px sets 135.0) and, on 15, `t-store-title` 21px semibold where the
  section heads are 21px bold ('Grok Bot' 82.0, bold sets 84.3). A left
  bearing of 0.7pt is applied to every string on those screens, measured on
  the 06 title and body and confirmed on 07's header and chips; the 430pt
  boards also dropped every cap top 0.5pt, and on the 402pt captures ten
  strings landed 0.3–0.7pt low with it, so the drop is 0.
- On 08–12 the fits are by width again, each on a string the render was
  measured against: `t-voice` 16.25px semibold for the voice title, the two
  names and 'Continue' (17px sets all four 4% wide), `t-nav` 16px medium for
  'Ask' and 'Imagine', `t-mail` 15.9px for the email, `t-section` 15px
  semibold for the group labels, `t-hint` 14.25px for the swipe hint and
  `t-version` 11.65px of the platform's monospace face, whose parentheses
  are shorter than the capture's (10.3 against 11.6 tall at the matched
  width). 'Alex Smith' is `t-h` and every row label `t-body`, both on the
  ladder, and every string above lands within 0.9pt of its measured width.

## What the source itself gets wrong

- 05's row titles wrap where the app wraps them, mid-phrase: "Longer Voice
  Mode &" / "Companion chats" and "Priority access during" / "peak times".
  Those are the app's line breaks, transcribed.
- 04's island carries the recording indicator because the capture was taken
  mid-session; the widget and guide captures have theirs composited out.
  04 draws no home indicator: down x 196 the capture is grass at y 838–843.
- The '$' on 05's prices is shorter than SF Pro's at any size that matches
  the digits: the price probe lands the width to 0.0 and the height 1.3 tall.
- 06, 07 and 13–15 are captures of a 402pt phone, not Mobbin exports, so
  they have square corners and a real status bar; the corners are masked and
  the bar is the template's by request.
- 10's email is 'alexsmith.mobbin+1@gmail.-' over 'com': the app hyphenates
  it inside the domain, and the board sets both lines where they are.
- 10's last row, Dictation, is cut by the frame at 852 with 2.6pt of its cap
  and the top of its glyph showing; the board draws the row at its full 52
  and lets the phone clip it rather than moving it.
- Three of the five Mobbin exports of the second batch carry a colour cast
  the first batch does not (the diff window section); it was taken out
  before sampling, and the tokens are the corrected values.

## Regenerating

`python3 gen.py` rewrites the twenty-six boards from `TOKENS`, `crops.json`
and `assets/art/`. With `assets/refs/` present it also re-cuts the art,
which needs Pillow and numpy; without it (a fresh clone, since the captures
are gitignored) it uses the committed crops and needs nothing. Re-cutting
from fresh captures also needs the colour pass described under the diff
window on cp8, cp9 and cp12. Fourteen of the fifteen `ref-*` boards are
gitignored too. `ref-14-grok-bot-sheet` is committed, a native screenshot
under board 14 so the hosted canvas can compare the two, so a fresh clone
has twenty-seven.