# Grok, iOS

Nine screens of the Grok iOS app: the Home Screen widget on the system
widget gallery ground, two pages of the in-app widget guide (the first and
the last step), the Voice Settings sheet over the 3D companion scene, the
SuperGrok paywall, the Terms update interstitial, the SuperGrok home with
its composer and Speak tooltip, and the video maker as a sheet over the
dimmed page and again with the keyboard up. The first five are Mobbin
captures of a 393pt phone; the last four are native captures of a 430pt
one. Sixteen boards in three rows, plus nine more that park each capture
under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 00 | `design-tokens` | The 114 tokens, as one `:root` block |
| 00b–00g | `evidence` | One row per token, with the measurement behind it |
| 01 | `widget` | The medium Home Screen widget on the gallery's grey |
| 02 | `widget-guide-add` | "Find Grok in the list, choose a widget size, then tap Add Widget.", dot 4 |
| 03 | `widget-guide-jiggle` | "From the Home Screen, touch and hold an empty area until the apps jiggle.", dot 1 |
| 04 | `voice-settings` | The Voice Settings sheet over the companion scene, recording |
| 05 | `supergrok` | The SuperGrok paywall: five features, two plans, the CTA |
| 06 | `terms-update` | "Updates to our Terms of Service and Acceptable Use Policy", Got it, Sign out |
| 07 | `home` | SuperGrok home: three suggestion chips, the composer, the "Tap here to speak" tooltip |
| 08 | `video-sheet` | The video maker's "What's new" card over the dimmed Animate-your-photos page |
| 09 | `video-keyboard` | The video maker with the keyboard up: resolution chips, the field, the caret |

## How close it lands

Mean absolute delta against the captures, in levels of 255, over the window
described below:

| Screen | Δ |
| --- | --- |
| 01 Widget | 0.26 |
| 02 Widget guide, step 4 | 1.42 |
| 03 Widget guide, step 1 | 1.04 |
| 04 Voice settings | 9.46 |
| 05 SuperGrok | 5.75 |
| 06 Terms update | 0.84 |
| 07 Home | 0.75 |
| 08 Video sheet | 1.97 |
| 09 Video keyboard | 1.84 |

The spread is what the pixels are. On 01 most of the frame is a crop of the
capture or a flat ground the census read to the level, and the type on it is
one nav title and two lines of body. 04 is the one screen whose ground is
generated (the section below): its 9.46 is nearly all the companion's body
under the sheet, where the gpt-image-2 body is narrower than the blurred one
the capture shows (the worst 40pt blocks, 38 at x 140–160 y 559, are the
hoodie's edges), while the sheet's type, rows and discs on top of it sit at
the same numbers as before; as a crop of the capture the screen read 1.00.
02 and 03 carry the guide illustration, and it
is drawn, not cropped (the section below): as crops the two read 0.90 and
0.89, drawn they read 1.42 and 1.04, and on 02 the illustration's own box
reads 2.28, nearly all of it inside the perspective card, whose pill label
is set in a face the capture's is taller than. 05 is the only screen
where most of what the window sees is type set by the platform face over an
inpainted hero: eighteen lines of it, white on black, where any sub-pixel
disagreement in a glyph edge costs 60–100 levels on that pixel. Split into
glyph and ground, the title band reads 66 on its glyph pixels and 3.8 on the
rest; the ground under every line of 05 is within 3–6 of the capture.
06–09 are scored on their own pixel grid, 3 px per pt, where a glyph edge a
third of a point off costs less than it does through a 2.2417 downscale;
06 and 07 are white pages with a few lines of type, and 08 and 09 carry a
full-bleed inpainted crop with twenty to forty short strings of CSS type on
it. The worst 40pt block on each is a line of type (07's header, 08's card
title, 09's 480p chip), every one of them within 0.7pt of its measured box
in both axes and none of them a placement error a blend can see.

`refkit batch probes.json --against scratch/cap --pt 2.2417` replays the 86
Phase-1 probes against the renders (the 06–09 probes carry their own
`"pt": 3`): 43 colour probes at a mean Δ of 2.7, 31 box probes at a mean
|dw| of 0.33pt and |dh| of 0.24pt, and 12 edge scans. The worst colour probe
is 04's hoodie through the sheet at 11, the generated body against the
capture's; the pill under the same sheet lands within 2. The five scans through
real edges land on the capture's own edge to the pixel, and so do the two
through 02's drawn card edge and pill cap; the two through 02's fitted
shadows land 3 and 9pt off, because a scan reports the largest step and
inside a smooth ramp that step moves with one level of noise, so the value
behind those two tokens is the sweep in their evidence rows, not the scan.
The five grey-ink probes on 01–05 read Δ 7–11, and the two inks inside
02's drawn sheet read Δ 15 the other way (`illo-label` #333333 replays as
#242424), and that is the scoring, not the ink: the render is downscaled
with LANCZOS, whose ringing puts the brightest 8% of a grey glyph 7 levels
*above* the CSS colour (`mute` #A9A9A9 replays as #B0B0B0), while the
capture's blur keeps its brightest 8% a few levels *below* the true ink. At
3% and 15% the pattern is the same. The tokens are the capture's own core
values and were left alone. The same replay on 06–09, where nothing is
downscaled, reads every ink probe at Δ 0–2, and it caught one token: the
grey copy on 06 had been cored over a window that took in the black
'Terms of Service' span, which pulled the darkest 2% to #777777; on the
grey-only windows it is #7F7F7F, and that is what ships.

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

06–09 come from a 430 × 932 phone at exactly **3 px per pt** (1290 × 2796,
both axes), so their renders need no downscale: `refkit shoot --scale 3`
on the whole board, the phone found by its bezel ring and cut to
1290 × 2796, the 52pt corners masked and composited onto the capture
(`scratch/run6.sh`). The phone on these four boards is 430 × 932 with no
home indicator, because the captures show none, and it fills the 478 × 980
board with 24pt to spare on each side. Excluded: the top 59pt. Those four
captures do carry a real status bar and Dynamic Island, and the boards do
not replicate them: the ask was to use the template's status bar (9:41,
the template island and glyphs) rather than clone the capture's clock,
bell and right cluster, so the capture's own bar is patched out of the
08 and 09 crops and nothing above 59pt is compared.

## What is a crop, what is drawn, what is fitted

**Every icon on the nine screens is a crop of the capture**, not a drawing:
34 of them, each cut at its measured ink box grown by 1pt and placed
back at the same numbers (the `-ic-` ids in `crops.json`), and that
includes the three inside 02's drawn illustration, the app icon, the close
disc and the Grok mark in the widget's pill. That was asked
for explicitly, that the icons match the source exactly, and a crop is the
only asset that scores 0 by construction. It is also the only honest one:
most of these glyphs are SF Symbols, whose outlines may not be redistributed,
so a hand-drawn SVG would have been a near-copy of a licensed shape that was
still measurably wrong. The cost is that the canvas's inspector names them by
image content from `assets/art/`, not as vector assets, and `assets/icons/`
does not exist in this folder.

The pictures under the type are crops too, on three of the screens: the
smoke hero of 05 and the whole frame of 08 and of 09 (`05-bg`, `08-bg`,
`09-bg`). All three are **inpainted crops**, and a reader
should not take their pixels as the capture's where the type was: the
generator patches every box of type and chrome out of the frame before
cutting it (a Coons fill from each box's own four edges, edge profiles
smoothed over 9px) so that the CSS type lands on clean ground. `INPAINT` in
`gen.py` lists the boxes; on 04 (whose patched frame is the top of the
generated scene below) that is the nav, the four side buttons, the
grabber, the title, the close disc and both row labels with their glyphs; on
05 the title, the subtitle, the plan group, the CTA and the footer. 05's
feature card is handled differently: its 6.7% white material is un-applied
inside the card box, its edge, corner arcs, five discs and nine lines of type
are patched, and the CSS card re-applies the material, so the card's pixels
under the type are solved rather than sampled. On 08 and 09 the patched
boxes are the capture's status bar and island, the SuperGrok header, the
page title, the Continue label, Featured Templates, and then per screen:
08's card title, NEW, heading, three body lines and Try it now; 09's six
option labels, the placeholder (the caret stays, it is a 2pt bar the CSS
would only approximate), Video, the 26 letter keys and 123 / @ / #. What is
not patched stays as pixels: 08's sheet card and its badge, 09's keyboard
with its emoji, globe and mic glyphs and the faint 'A' predictive hint on
the space bar, and the blurred video thumbnails on both.

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
rather than inventing the rest. The '#' key on 09 is 10.3pt square where
the 22px key face draws a 17pt '@'; it is a lighter glyph than either key
size of SF Pro sets, and it ships at the 18px small-key size, the nearest
the face has.

Values no pixel holds, fitted rather than read:

- `material` .067, `disc` .17, `scrim-btn` .32, `glass` .09 and `grabber`
  .35 are alphas solved as (capture − patched frame) / (255 − patched frame)
  over rings that avoid the glyphs; the evidence rows carry each ring and the
  per-row spread.
- The Yearly card is a diagonal ramp, not a fill: its four corners census
  45/52/40/45 mean level, so it ships as `linear-gradient(to top right,
  plan-lo, plan-hi)` between the bottom-left and top-right censuses.
- 07's composer halo is one `box-shadow`, `0 8px 36px rgba(0,0,0,.12)`
  over a 1pt white edge. The capture reads 13.3 levels at the side edges,
  8.7 at the top and 18 under the bottom, fading over 36pt below; the
  offset, blur and alpha were swept (dy 6–12, blur 32–52, alpha .09–.14)
  over the band y 720–932 with the corners masked, and the minimum is flat
  between 6–8px / 36px / .11–.12 at 2.27–2.33, so the value that also
  matches the side-edge reading was kept. Alpha .14 costs .1–.2 on every
  sub-band and blur 52 costs .15.
- 08's dimming is a 20% black scrim: white reads #CCCCCC under it, the
  black button stays #000, and the 'Continue' label and the page ground
  both census to #CCCCCC, so `dim-inv` is one token for both.
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
- On the 3px/pt screens the fits are finer because the captures are: `t-hdr`
  is 22px medium **with .45px of tracking**, because 'SuperGrok' measures
  104.0 wide where the untracked face sets 100.3; `t-h3` 18.9px, `t-para`
  16.15px, `t-field` 16.3px, `t-speak` 14.5px and `t-btn` 16.5px each close
  a width the ladder size misses by 1–3pt. Two placement corrections are
  applied to every string on those screens, a left bearing of 0.7pt and a
  cap-top drop of 0.5pt, measured on the 06 title and body against the
  capture and confirmed on 07's header and chips.

## What the source itself gets wrong

- 05's row titles wrap where the app wraps them, mid-phrase: "Longer Voice
  Mode &" / "Companion chats" and "Priority access during" / "peak times".
  Those are the app's line breaks, transcribed.
- 04's island carries the recording indicator because the capture was taken
  mid-session; the widget and guide captures have theirs composited out.
  04 draws no home indicator: down x 196 the capture is grass at y 838–843.
- The '$' on 05's prices is shorter than SF Pro's at any size that matches
  the digits: the price probe lands the width to 0.0 and the height 1.3 tall.
- 06–09 are captures of a 430pt phone, not Mobbin exports, so they have
  square corners and a real status bar; the corners are masked and the bar
  is the template's by request.

## Regenerating

`python3 gen.py` rewrites the sixteen boards from `TOKENS`, `crops.json` and
`assets/art/`. With `assets/refs/` present it also re-cuts the art, which
needs Pillow and numpy; without it (a fresh clone, since the captures are
gitignored) it uses the committed crops and needs nothing. The nine `ref-*`
boards are gitignored too, so a fresh clone has sixteen.
