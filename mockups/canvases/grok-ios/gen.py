"""Grok for iOS -- seven screens, the tokens behind them, and the captures.

Regenerates the whole folder in place, byte-identically, from anywhere:

    python3 mockups/canvases/grok-ios/gen.py
    refkit tokens mockups/canvases/grok-ios

Every colour and every metric in here was read off five Mobbin captures at
2.2417 capture px per design pt (881 px across a 393 pt screen, 1910 down an
852 pt one) and two native captures at exactly 3 px per pt (1290 x 2796, a
430 x 932 pt Pro Max screen), and every one of them is stated with its
evidence on the 00b-00f boards. Nothing was eyeballed. The artboards are output: never hand-edit an
.html, edit this file and re-run.

Four decisions the captures force.

TWO DEVICES. 01-05 are 393 x 852 boards like every other folder here; 06-07
were captured on a 430 x 932 device and are drawn at that size, which fills
the 478 x 980 artboard exactly with the 24px padding (the bezel rings fit, the
drop shadow is clipped). Their status bar and Dynamic Island are this repo's
template frame, not the captures' (the captures show 20:52, a muted bell and a
live-activity glyph in the island; none of that is the app), and they carry no
home indicator because the captures show none.

THE FACE IS SF PRO, AND IT IS THE PLATFORM'S. `refkit font` returns a weak
call for SF Pro on every title measured, so the boards set in the platform
stack with no stand-in corrections: FACE_DROP and XOFF are both 0 here, and
the line-box model below is the platform face's own.

TWO SCREENS ARE MOSTLY PHOTOGRAPH. 04 is a voice-settings sheet over a 3D
companion scene, and the sheet is a dark blur of that scene rather than a
fill; 05's paywall sits on a smoke-and-particles hero that reaches faintly
down the whole screen and shows through its translucent feature card. 05's
ground is cut from the capture (crops.json) after every piece of chrome and
type on it is patched out (INPAINT below, a Coons fill from each box's own
four edges), so the pixels are the capture's and the chrome on top is CSS;
its card is not patched: its 6.7% white material is un-applied inside the
card box and re-applied by the CSS card, which is exact by construction.
04's scene is the one asset the capture does not hold: above the sheet's
edge it is the patched capture (i4), below it a gpt-image-2 edit of that
frame (assets/art/04-scene.png, composed by scratch/scene4.py), and the
sheet itself is drawn, with its blur and tint fitted (see s04).

ICONS ARE CROPS, NOT DRAWINGS, WITH TWO SETS OF EXCEPTIONS. Thirty-one glyphs on
these screens are SF Symbols, the Grok mark or its app icon, and a hand-drawn
approximation of an SF Symbol is visibly not the symbol at any zoom. Each one
is cut from its capture at its measured ink box plus a point of ground
(crops.json, the `-ic-` ids) and put back at the same numbers, so it is the
capture's own pixels and scores zero by construction.

The exceptions are vectors in assets/icons/, each with a viewBox that is its
measured ink box in pt, inlined by icon() so the canvas's inspector hands it
back as a vector asset. The three side glyphs on 04 (focus, hanger, trash) are
traced stroke by stroke against the capture's coverage, by request. The four
marks on 07's chips are not traced at all: they are the published artwork of
Gmail, GitHub, Notion and Grok Bot, each placed on the box that fits the
capture's pixels, also by request (README, "Seven vector icons").

Three defects belong to the source, not to the replica: Mobbin composites the
Dynamic Island out (except on 04, where the app's own recording dot keeps it),
drops the home indicator, and exports with square corners. All three are drawn
here. The diff window is trimmed accordingly -- see README.md.
"""
import base64, json, re
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}
SCALE = 2.2417                                    # capture px per design pt
BIG = {"cp6", "cp7", "cp13", "cp14", "cp15"}     # the 402 x 874 captures


def scale_of(ref):
    return 3.0 if ref in BIG else SCALE

NAME = "Grok iOS"
PAGE_NAME = "(example) " + NAME
P = "k"          # token prefix: --k-sheet, --k-ink, --k-t-body

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). The :root block and the evidence table are
# both generated from this list, so a value cannot drift from the evidence
# behind it, and a token cannot ship without one.
TOKENS = [
 ("Font", "font", '-apple-system,BlinkMacSystemFont,"SF Pro Text",'
                  '"SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on 02 'Widget', 05 'SuperGrok' and 'Unlock the full power of "
  "Grok': SF Pro top on all three, weak call each time. The platform face"),

 ("Surface", "ground",   "#D5D5D5",
  "01 flat census left of the widget (x 0-20, y 100-240): #D5D5D5 100%"),
 ("Surface", "card",     "#FFFFFF",
  "01 widget body, col x68 y 80.7-94.5; 02 card interior, row y300 x 60-340; "
  "02 the drawn sheet x 221-311 y 339-352 #FFFFFF on 100% of the flats"),
 ("Surface", "well",     "#E5E5E5",
  "01 pill and both circles: row y125 x 39-172 and row y196 x 39-100 flat "
  "#E5E5E5; 02 the drawn widget's pill x 150-163 y 437-472 #E5E5E5 100%"),
 ("Surface", "dim",      "#CBCBCB",
  "02/03 the band above the sheet, y 0-58.9 flat #CBCBCB: the dimmed parent"),
 ("Surface", "sheet",    "#F6F6F6",
  "02/03 col x100 from 59.0 down and row y700 outside the card: #F6F6F6"),
 ("Surface", "illo-frame", "#AAAAAA",
  "02/03 the guide illustration's phone: frame col x 49.7 y 316-428 and "
  "island x 163-230 y 232-247 flat #AAAAAA on 100% of the flats"),
 ("Surface", "illo-screen", "#FAFAFA",
  "03 inside the drawn frame, x 132-257 y 258-272: #FAFAFA, five under the "
  "card, on 100% of the flats"),
 ("Surface", "illo-tile", "#DDDDDD",
  "03 tile core x 83-119 y 290-330: #DDDDDD on 99.5% of the flats"),
 ("Surface", "illo-scrim", "rgba(0,0,0,.12)",
  "02 the drawn screen under its sheet: #FAFAFA reads #DBDBDB at col x87 y "
  "218-278 and #DDDDDD at col x200 y 252-274, (250-219..221)/250 = .116-.124; "
  "the island still reads #A9A9A9, so the scrim lies under it"),
 ("Surface", "illo-grabber", "#CCCCCC",
  "02 sheet grabber x 183.8-209.2 y 302.4-306.0: mode #CCCCCC, flat #CDCDCD"),
 ("Surface", "night",    "#010101",
  "05 flat census x 20-372 at y 718-728 and y 822-838, above the CTA and "
  "below the footer: #010101 on 73% and 100% of the flats. The band between "
  "the feature card and the plan group is not flat (#171717-#1D1D1D, the "
  "smoke's tail) and stays in the crop"),
 ("Surface", "skip",     "#121212",
  "05 row y83 across the Skip pill 316.1-371.8 reads #111111, col x344 "
  "68-98.4 reads #141414; the mean"),
 ("Surface", "material", "rgba(255,255,255,.067)",
  "05 feature card censuses #131313 at y 203-213, 264-276 and 500-518 and "
  "#111111 at y 384-396, over a ground of #000000-#030303 outside it: "
  "(19-2)/253 = .067 white. At its top edge it reads #333033 with the smoke "
  "behind it, so a fill would be wrong and a material is right"),
 ("Surface", "disc",     "rgba(255,255,255,.17)",
  "05 icon discs solved against the patched frame i5 over a ring r 11-18.5 "
  "around each glyph: alpha .185/.183/.167/.165/.182 on the five rows"),
 ("Surface", "price",    "#131313",
  "05 census x 30-190 y 695-715, the blank of the Monthly side of the plan "
  "group: #131313 on 99.8% of the flats"),
 ("Surface", "plan-lo",  "#282828",
  "05 Yearly card, bottom-left blank x 212-228 y 700-712: #282828 on 99.8% "
  "of the flats. The card is a diagonal ramp, not a fill: its four corners "
  "census 45/52/40/45 mean level (TL/TR/BL/BR)"),
 ("Surface", "plan-hi",  "#333536",
  "05 Yearly card, top-right blank x 340-358 y 626-636: #333536 on 72% of "
  "the flats; the light end of the ramp, laid to top right in the builder"),
 ("Surface", "free-bg",  "#341A0E",
  "05 FREE badge interior, rows 643-648 x 134-140: #321B10 #371B10 #33170C"),
 ("Surface", "scrim-btn", "rgba(0,0,0,.32)",
  "04 X and grid buttons solved against the patched frame i4 over a ring r "
  "9-20: black at .325 (sd .02) and .320; the close disc on the sheet .28"),
 ("Surface", "glass",    "rgba(255,255,255,.09)",
  "04 side-stack discs solved against the patched frame i4 over a ring r "
  "10-14.5: white at .089 and .090 over sky, .037 over the cloud where the "
  "ground is too bright to resolve"),
 ("Surface", "grabber",  "rgba(255,255,255,.35)",
  "04 grabber #8B7467 over the patched sheet #412A1C at y 410-412: white at "
  ".39/.35/.33 per channel"),
 ("Surface", "sheet-v",  "rgba(0,0,0,.40)",
  "04 fitted through the drawn sheet at the 4px blur: at .40 the band under "
  "the sheet's edge (y 406-428) reads -0.2 signed and the body band (y "
  "606-740) +0.6; .35 leaves both +4, .45 both -5 (README)"),
 ("Surface", "side-ink", "#CDCECF",
  "04 ink of the three vector side glyphs: top 3% of each box 203-208 over grounds 163/180/194, so flat, not white at an alpha (.16-.49 would fit)"),
 ("Surface", "voice-pill", "#767676",
  "04 the voice pill reads #474747 flat through the sheet (x 300-370, y "
  "772-797, std 3.6): 71/.60 = 118 under the .40 tint"),
 ("Surface", "rec",      "#F09540",
  "04 the recording dot inside the island, x 215.0-220.8 y 26.8-32.6: "
  "#F09540 #F29442 #F09444"),
 ("Surface", "page",     "#FFFFFF",
  "06 flat census x 40-360 y 520-700, 07 x 100-300 y 200-300: #FFFFFF on "
  "100% of the flats"),
 ("Surface", "chip",     "#F5F5F5",
  "07 suggestion chips y 675-727, census x 20-60 y 680-690 above the bot "
  "glyph: #F5F5F5 on 100% of the flats"),
 ("Surface", "composer", "#FEFEFE",
  "07 composer interior census x 140-300 y 765-785, right of the placeholder "
  "and above the controls: #FEFDFE on 84% of the flats; the 2pt inside its "
  "edge reads #F9F9F9, the inset the line token carries"),
 ("Surface", "ctl",      "#F4F3F4",
  "07 the Auto pill x 59.3-134 y 789.3-822, census y 792-797 above its "
  "glyph: #F4F3F4 on 98% of the flats; the + and mic discs the same"),
 ("Surface", "btn",      "#000000",
  "06 Got it pill 20-382 x 730.7-784.7, census x 40-150 y 740-775: #000000 "
  "on 100% of the flats; 07 Speak pill, 14 CTA the same"),
 ("Surface", "scrim-sheet", "rgba(0,0,0,.19)",
  "14 the Terms page under the sheet: its white reads #CCCCCC on 100% of the "
  "flats (x 20-380 y 150-250) and the title's ink stays #000000; (255-204)/"
  "255 = .20, the pill under the glass reads #8E8E8E at .19 and #8B8B8B at "
  ".20, so .19"),
 ("Surface", "glass-sheet", "rgba(255,255,255,.5)",
  "14 the sheet over the scrimmed page: #E6E6E6 over #CCCCCC on 95% of "
  "the flats (x 60-340 y 840-855) is white at .51; over the black Got it "
  "pill it reads #8E8E8E, white at .56 with the pill's edges blurred in. "
  "At the 19px blur the flats read .48 -0.48, .5 +0.74, .52 +1.74, .55 "
  "+2.79 signed, and .5 is the alpha the blur was swept at over the pill"),
 ("Surface", "grabber-pro", "#A4A4A6",
  "14 grabber 172.3-229.7 x 451.3-455.0: #A4A4A6 on 78% of its flats"),
 ("Surface", "store-dim", "#BDBFBC",
  "15 the App Store page above the sheet, census x 100-300 y 20-50: #BDBFBC, "
  "green one and two levels over red and blue in the capture itself"),
 ("Surface", "store-disc", "#FAFAFA",
  "15 the close and share discs (d 45.4 at 15.3 and 341.3, y 77.3-122.7): "
  "interior mode #FAFAFA left of the X glyph (x 20-32 y 100-112), rim two "
  "capture px of #D7D7D7 at the sides, #EEEEEE at the top"),
 ("Surface", "store-pill", "#EEEEEF",
  "15 the Purchased pill 289-382 x 440-472, census x 300-382 y 440-448: "
  "#EEEEEF on 94% of the flats"),
 ("Surface", "card-blue", "#80BEFD",
  "14 the Grok Bot card 23.3-378.7 x 460.7-660.7: #80BEFD on a 20pt grid "
  "over its right half and lower two thirds (x 66-366 y 583-643), every "
  "cell within a level"),
 ("Surface", "card-pale", "#E8F3FE",
  "14 the pale shape in the card's top-left, cells x 46-106 y 463-513: "
  "#E8F3FE, #E8F2FE. Along row 481 it holds 243 to x 108 and falls to 189 "
  "by x 208, along column 88 it falls from 240 to 190 over y 521-537, and a "
  "darker ring runs 20-30pt outside it (162-167 at x 208 y 505, x 168 y "
  "541). Its ellipse, fade and ring are one fit to the card at 1pt, mean "
  "|d| 3.13 to 1.87 over the card outside its crops and title (README)"),

 ("Line", "material-line", "rgba(255,255,255,.16)",
  "05 card edge peaks #3B3B3B over one 0.9pt band at y 522.8-523.6 and "
  "#5C5A5D at 198.9-199.8 with smoke behind; .16 over #131313 is #393939"),
 ("Line", "price-line",  "#252525",
  "05 col x100 618.4-619.3 #252525 and 713.8-714.7 #222222: the plan group's "
  "1pt edge"),
 ("Line", "plan-line",   "rgba(255,255,255,.17)",
  "05 Yearly card edge peaks #505052 (row 623.5), #565658 (625), #535557 "
  "(row 660 right); .17 over the ramp's #333536 top is #565758"),
 ("Line", "composer-shadow", "rgba(0,0,0,.07)",
  "07 the halo under the composer: the page reads #F5F5F5 at y 833, a pt "
  "under the card's bottom edge (832.3), and climbs to #FDFDFD by y 848; "
  "beside the card (x 392-395, row 780) #FAFAFA-#FCFCFC. Swept with the "
  "line at #F9F9F9 over the composer band y 728-862: blur 6px reads 4.63, "
  "4.59, 4.63 at alpha .05, .07, .09 and blur 14px 4.45, 4.39, 4.51"),
 ("Line", "composer-line", "#F9F9F9",
  "07 the card's edge, row y 780: x 10.33 #DEDEDE, 10.67 #A9A9A9, 11.0 "
  "#DFDFDF, 11.33 #E0E0E0, 11.67 #EFEFEF, then the #F9F9F9 inset; the "
  "right edge x 390.3-391.3 #E0E0E0 #E0E0E0 #BABABA #C5C5C5, the top at "
  "737.33-737.67 #EFEFEF #E5E5E5 and the bottom at 832.0-832.3 #DBDBDB "
  "#E6E6E6: a line 2 capture px wide, darkest at the sides. Drawn at "
  ".67pt any grey is too dark, because the halo carries the edge: swept "
  "#A9A9A9 to #FFFFFF over the band y 728-862, #A9A9A9 5.25, #E4E4E4 "
  "4.59, #EEEEEE 4.48, #F6F6F6 4.40, #F9F9F9 4.39, #FFFFFF 4.41"),
 ("Line", "sheet-line", "rgba(0,0,0,.45)",
  "14 the sheet's outline, row y 600: x 7.33 #9A9A9A and 7.67 #696969 over "
  "a scrim of #C0C0C0 beside it, x 394.0 #696969 and 394.33 #9A9A9A on the "
  "right; two capture px of black at .45 mean over #C0C0C0 (.25 and .59), "
  "and the scrim beside it is #C0C0C0-#C4C4C4 against #CCCCCC away from "
  "it, the sheet's own soft shadow"),
 ("Line", "store-rule", "#E7E7E8",
  "15 the rules at y 278.67 and 366.67 x 20-402 and the three column "
  "separators at x 124.67, 229.67, 334.67 y 305.7-339.7: one capture px, "
  "#E7E7E8 on 100% of the pixels, no solve needed at 3 px/pt"),
 ("Line", "illo-card-shadow", "rgba(0,0,0,.24)",
  "02 the drawn widget card's halo: col x 176.8 climbs #FCFBFC to #E9E9E9 "
  "over the 21pt above its top edge, row y 455 #F9F9F9 to #E5E5E5 over the "
  "20.5pt left of it, row y 473 #E2E2E2 to #FEFEFE over 20pt to the right: "
  "22-29 levels at the edge. One box-shadow swept dy 0-8 / blur 14-44 / "
  "alpha .12-.30 over the 25pt above the card: minimum .85 at 4px 28px "
  ".24, 0 28px .18 costs .1, 4px 20px .18 costs 2.6"),
 ("Line", "row-line", "rgba(255,255,255,.10)",
  "04 the row cards are a 1pt line and no fill: coverage solve over x 230-300 "
  "of both rows' top and bottom edges (486.8, 537.7, 549.3, 600.3), white at "
  ".087-.114, and .06-.14 on their sides, mean .10; inside a row reads "
  "#42401C against #423F19 outside"),
 ("Line", "illo-sheet-shadow", "rgba(0,0,0,.12)",
  "02 above the drawn sheet's top edge 299.1, col x200: #DDDDDD to 274.6, "
  "#DADADA to 285.3, #D7D7D7 to 292.4, #D4D4D4 to 298.7, nine levels over "
  "46pt on top of the scrim. One box-shadow swept blur 12-56 / alpha "
  ".05-.20 over that band: minimum 1.51 at 24px / .12, 40px / .08 costs .2"),

 ("Ink", "ink",      "#000000",
  "01 'Grok' and icon core; 02/03 body ink core #010101; 05 CTA label"),
 ("Ink", "ink-inv",  "#FFFFFF",
  "05 title and feature titles ink core #FFFFFF; 04 title reads #FDF8F4 "
  "through the warm blur"),
 ("Ink", "mute",     "#A9A9A9",
  "05 feature subtitles #ACA9AB and #A5A4A5, 'Monthly' #A6A6A7, '/year' and "
  "'$25 /month' #ACACAC: one grey, four readings, the mean"),
 ("Ink", "skip-ink", "#BBBBBB",
  "05 'Skip' ink core #B8B8B8-#BBBBBB"),
 ("Ink", "foot",     "#838383",
  "05 footer line ink core, x 34.8-358.2 y 805-817"),
 ("Ink", "free-ink", "#E07D54",
  "05 FREE ink core (brightest 2%) inside x 135-180 y 645-662"),
 ("Ink", "dots",     "#C5C5C5",
  "02/03 page dots, mode of each 6.2pt disc: #C4C4C4-#C5C5C5"),
  ("Ink", "copy-mute",   "#7F7F7F",
  "06 body ink core on a grey-only window, 'review them.' x 200-245 y "
  "482-493: #7F7F7F; a window that takes in the black 'Terms of Service' "
  "span reads the span's pixels, not the grey"),
 ("Ink", "placeholder", "#7E7E7E",
  "07 'Ask Anything' ink core x 27-121 y 755-770"),
 ("Ink", "sheet-copy",  "#818181",
  "14 the three body lines under 'Introducing Grok Bot', a plus-darker "
  "grey: each ink pixel is the ground under it plus this minus white, "
  "against the capture's ground at its 97th percentile over x 60-330 every "
  "2pt of y 704-766 (228 at 704, 146 at 752). Line 1's core over 227 reads "
  "#5B5B5B and line 3's over 146 #0E0E0E. Swept over the copy (x 20-390 y "
  "700-770): #727272 9.30, #7C7C7C 8.52, #818181 8.32, #868686 8.37, "
  "#8C8C8C 8.50"),
 ("Ink", "store-mute",  "#8A8A8D",
  "15 'AI agents that do real work' (x 155-326 y 173-187), 'News', 'Version "
  "1.8.0', '1d ago' and the chevron: ink core #8A8A8D on each"),
 ("Ink", "store-val",   "#8E8E92",
  "15 '4.9' x 52-84 y 318-334 ink core #8E8E92; '18+', '#19', 'Years', "
  "'Productivity', 'X Corp' and the stars the same to a level"),
 ("Ink", "store-label", "#B1B1B4",
  "15 '3.3K RATINGS' x 30-107 y 295-303: ink core #B1B1B4"),
 ("Ink", "store-link",  "#0088FF",
  "15 'more' x 350-382 y 638-647 and the cloud glyph x 157-183 y 231-256: "
  "ink core #0088FF on both"),
 ("Ink", "store-pill-ink", "#CFCFD1",
  "15 'Purchased' x 302-369 y 451-461 on the #EEEEEF pill: ink core #CFCFD1"),
 ("Ink", "illo-label",  "#333333",
  "02 'Grok' beside the drawn app icon, x 98-124 y 321-330: ink core #333333"),
 ("Ink", "illo-sub",    "#5A5A5A",
  "02 'Quickly start a new chat with Grok.' x 104-289 y 388-398: ink core "
  "#5A5A5A; the title above it (x 174-219 y 361-377) and the pill's 'Grok' "
  "(x 192-227 y 450-465) core #000000 and #080808, the ink token"),

 ("Radius", "r-phone",  "52px",  "iPhone 14 Pro/15/16 display corner, this repo's stand-in"),
 ("Radius", "r-widget", "27px",
  "01 widget corner insets 21.3/12.4/8.4/2.1 at 0.7/3.7/6.7/15.7 down: r 27"),
 ("Radius", "r-card",   "26px",
  "02 card corner insets 16.2/12.2/8.6/5.1/2.4 at 2/4/7/11/16 down: r 26"),
 ("Radius", "r-sheet",  "30px",
  "02 sheet corner insets 20.5/13.8/8.5/4.5 at 2.1/5.1/9.1/14.1 down: r 30"),
 ("Radius", "r-illo", "53.5px",
  "03 frame outer arc, leftmost frame pixel 28.5/13.8/5.4pt in at 8/21.4/"
  "39.3pt down from 205.9: a 53.5pt circle; the inner arc (32.6/22.8/14.7 at "
  "7.4/16.3/34.1 down from 215.5) is 42.4, the stroke less"),
 ("Radius", "r-illo-tile", "14.3px",
  "03 tile corner insets 10.7/6.2/3.6/0.9pt at 0.2/2/4.7/9.1 down from "
  "278.4: r 14.3"),
 ("Radius", "r-illo-sheet", "26.8px",
  "02 drawn sheet corner: row y300, 1pt under the top edge at 299.1, white "
  "begins at 76.9 against a sheet edge of 55.9: the inset of a 26.8 radius"),
 ("Radius", "r-illo-card", "22px",
  "02 the widget card's left edge leaves its fitted line 23pt below the "
  "top-left corner and the top edge 25pt right of it, at a local scale of "
  ".80 down and 1.09 across: 22 in the card's own plane"),
 ("Radius", "r-sheet-v", "35px",
  "04 sheet corner insets 20.9/15.1/10.2/6.2/2.7 at 3.4/6.4/10.4/15.4/21.4 "
  "down from 403.6, left edge 8.5: r 35"),
 ("Radius", "r-row",    "13px",
  "04 row card corner: the top edge's 1pt line reaches full coverage 8.1pt "
  "in from the left edge (x 28.5 against 20.4), and r - sqrt(2r - 1) = 8.1 "
  "at r 13 (12 gives 7.2, 14 gives 8.8)"),
 ("Radius", "r-feat",   "32px",
  "05 feature card insets 14.9/10.5/6.9/3.8/1.7 at 5/8/12/17/23 down: r 32"),
 ("Radius", "r-price",  "18px",
  "05 plan group insets 10.9/7.3/4.2/1.7 at 1.6/3.6/6.6/10.6 down: r 18"),
 ("Radius", "r-plan",   "15px",
  "05 Yearly card insets 7.3/4.5/2.2/0.8 at 2.4/4.4/7.4/11.4 down: r 15"),
 ("Radius", "r-chip",   "22px",
  "07 chip corner: the first chip's left edge (x 11) reaches full coverage "
  "at y 697 and the top edge (675) at x 33, on a 52 tall chip whose ends are "
  "not full semicircles; circle fit on the arc r 22"),
 ("Radius", "r-composer", "28px",
  "07 composer corner insets 21.3/15.0/10.3/6.3/3.0/1.0 at 1/3/6/10/15/21 "
  "down from 737.3, left edge 10.3: r 28"),
 ("Radius", "r-sheet-pro", "37px",
  "14 the sheet's top-left corner, where its glass clears the scrim by 25 "
  "levels: insets 18.67/9.0/3.33 at 4.7/12.7/21.7 down from its top edge "
  "(outline 444.67-445.0, first white row 445.67) against a left edge of "
  "8.0. r 37 gives 18.95/9.1/3.3, 36 gives 18.2/8.6/3.0, 38 19.7/9.6/3.7"),
 ("Radius", "r-store",  "38px",
  "15 the App Store sheet's corner (top 62, left edge 0): insets 17.7/10.7/"
  "6.0/3.3/1.7/0.7 at 5.7/11.3/17/22.7/28.3/34 down; r 38 gives 17.3/10.4/"
  "6.4/3.5/1.6/0.5"),
 ("Radius", "r-card",   "18px",
  "14 the Grok Bot card's bottom-left corner (left edge 23.3, bottom 660.7): "
  "insets 7.3/3.7/2.0/0.7 at 3.3/6.7/10/13.3 up; r 18 gives 7.0/3.6/1.9/0.7"),
 ("Radius", "r-tip",    "14px",
  "07 tooltip corner insets 9.7/7.7/6.0/4.0/1.7 at 1/2/3/5/8 down from 773, "
  "left edge 215.3: r 14"),
 ("Radius", "r-pill",   "999px",
  "01 pill 61.6 tall, 05 Skip 31.4, FREE 27.7 and CTA 56: all fully round "
  "(CTA inset 19.5 at 1.5 down fits r 28)"),

 ("Type", "t-time",   "600 15px/20px var(--x-font)", "iOS status bar clock"),
 ("Type", "t-widget", "600 19.5px/24px var(--x-font)",
  "01 'Grok' 42.4 wide, G 14.3 tall with overshoot; 20px sets 43.3 x 15.0 and "
  "19.5px 42.2 x 14.6"),
 ("Type", "t-h",      "600 17px/22px var(--x-font)",
  "02 'Widget' 55.8 wide, 'Home Screen Widget' 166.4 wide, both 16.1 cap-to-"
  "descender: 17px; 05 CTA 'Upgrade to SuperGrok' 177.1 wide at the same"),
 ("Type", "t-body",   "400 17px/22px var(--x-font)",
  "02/03 body pitch 21.9, F cap to g descender 15.6, line 1 315.8 wide on "
  "both boards; 17px sets it 315.8"),
 ("Type", "t-feat",   "400 17.5px/22px var(--x-font)",
  "05 'Longer conversations in Chat' 224.8 wide and 'Skip' 32.6: 17px sets "
  "219.3 and 31.3, 17.5px 225.3 and 32.3. Same cap as t-body, wider set"),
 ("Type", "t-row",    "400 16.5px/21px var(--x-font)",
  "04 'Select Audio Device' 147.7 x 12.9, 'Microphone Selection' 161.0 x "
  "15.2: 17px sets 150.3/163.3, 16px 143.3/155.7, 16.5px 147.0/159.0"),
 ("Type", "t-sheet",  "600 16px/21px var(--x-font)",
  "04 'Voice Settings' V cap 11.6 and 108.4 wide: one size under the nav"),
 ("Type", "t-h1",     "500 40.5px/50px var(--x-font)",
  "05 'SuperGrok' 194.0 x 36.1 from S top to p foot with 10332 ink px; "
  "swept in the board: 42px regular with .5px tracking hits the width but "
  "sets 37.5 tall with 9116 ink px, 40.5px medium with .6px tracking sets "
  "194.0 x 36.1 with 10053 and halves the title band's delta (16.5 to 10.9)"),
 ("Type", "t-h2",     "600 20px/25px var(--x-font)",
  "05 'Unlock the full power of Grok' U cap 14.3, 263.2 wide"),
 ("Type", "t-sub",    "400 13.25px/18px var(--x-font)",
  "05 feature subtitles W cap 9.4, pitch 21.8 under the title; footer T cap "
  "9.4. Widths disagree on the size: 13px sets the two long subtitles 2.1% "
  "narrow (211.0 for 215.5, 230.2 for 235.5) and the footer 1.2% narrow, "
  "while '$25 /month' 67.8 x 12.5 is what 13px sets. 13.25px splits it"),
 ("Type", "t-plan",   "600 15px/20px var(--x-font)",
  "05 'Monthly' M cap 10.3, 'Yearly' Y cap 10.7"),
 ("Type", "t-unit",   "400 15.4px/20px var(--x-font)",
  "05 '/month' 11.2 tall (slash to h ascender), '/year' 13.8 (to y "
  "descender); '/month' runs 85.0-133.6 (48.6) and '/year' 270.7-305.0 "
  "(34.3), which 15px sets 47.3 and 33.5, 2.5% narrow"),
 ("Type", "t-price",  "700 20px/26px var(--x-font)",
  "05 '300' digits 14.7 tall, '30' 15.2, which reads as 21px bold, but "
  "'$300' runs 215.8-265.3 (49.5) and '$30' 42.1-80.9 (38.8), which 21px "
  "sets 52.2 and 40.6, 5% wide, and the whole string 17.0 tall against "
  "21px's 18.7. 20px carries the width"),
 ("Type", "t-free",   "700 12.5px/14px var(--x-font)",
  "05 FREE 29.4 x 8.9; 12px bold sets 28.7 x 8.3, 12.5px 29.7 x 8.7, 13px "
  "30.7 x 9.0"),
 ("Type", "t-title",  "600 21px/26px var(--x-font)",
  "06 'Updates to our Terms of Service and' 304.0 wide (x 49.3-353.3), its "
  "U cap 15.0 (y 379.0-394.0), cap tops 379.0 and 405.0: a 26 pitch; 21px "
  "semibold has a 15.05 cap"),
 ("Type", "t-copy",   "400 14px/19px var(--x-font)",
  "06 body: W cap 10.0, cap tops 444.7 / 463.7 / 482.7 (19 pitch), line 2 "
  "305.3 wide (48.0-353.3); 14px has a 10.03 cap"),
 ("Type", "t-link",   "400 16.75px/22px var(--x-font)",
  "06 'Sign out' 61.7 wide (170.0-231.7), S 12.0 tall with overshoot; 17px "
  "sets 63.0, 16.5px 61.1, 16.75px 62.1. The underline is one pt of ink "
  "1.7 under the baseline (y 817.67-818.67)"),
 ("Type", "t-btn",    "600 15.5px/20px var(--x-font)",
  "06 'Got it' 39.7 wide (181.3-221.0), G 11.7 tall with overshoot, the "
  "'o' 8.3 wide; 14 'Upgrade to Access' 138.7 wide (132.0-270.7), U 11.0 "
  "flat top to overshoot; 16px semibold sets 40.8 and 143.2, 15.5px 39.6 "
  "and 138.8"),
 ("Type", "t-hdr",    "600 22px/28px var(--x-font)",
  "07 'SuperGrok' 107.7 wide (x 53.3-161.0), 20.0 from S top to p foot, "
  "and its glyphs wider than medium's at the same height: S 12.7 against "
  "11.7, G 15.3 against 14.0, k 11.0 against 10.0 on the board at 500; "
  "semibold sets 106.7, with .12px tracking 107.7"),
 ("Type", "t-chip",   "500 14px/20px var(--x-font)",
  "07 'Build a Bot' 69.0 wide (58.0-127.0), 'Try Finance' 75.0 (198.0-273.0), "
  "caps 10.0-10.3; 14px medium sets 69.3 and 74.7"),
 ("Type", "t-ask",    "400 16px/21px var(--x-font)",
  "07 'Ask Anything' 93.0 x 14.3, A top to y foot (x 27.3-120.3); 17px "
  "(t-body) sets 98.3 x 15.7 on the board, 16px 92.5 x 14.8"),
 ("Type", "t-ctl",    "400 14px/18px var(--x-font)",
  "07 'Auto' in the model pill x 93.0-121.3 (28.3), cap 10.0: 14px regular"),
 ("Type", "t-speak",  "600 14.5px/18px var(--x-font)",
  "07 'Speak' 42.3 wide (328.7-371.0) on the black pill, S 11.0 with "
  "overshoot; 15px semibold sets 43.7, 14.5px 42.3, the same width the "
  "430pt capture gave"),
 ("Type", "t-sheet-h", "600 18.2px/22px var(--x-font)",
  "14 'Introducing Grok Bot' 174.3 wide (28.7-203.0), I cap 13.0 "
  "(679.67-692.67), 17.3 to the g foot; 18px sets 172.7 x 17.0 on the "
  "board, 18.2px 174.3"),
 ("Type", "t-sheet-copy", "400 15.25px/20px var(--x-font)",
  "14 sheet body cap tops 708.3 / 728.3 / 748.3 (20 pitch), line 1 'AI "
  "teammates you can give real work to. Bots can' 338.7 x 14.0 (x "
  "28.0-366.7); 15px sets 333.7 x 13.3 on the board, 15.25px 339.2"),
 ("Type", "t-card",   "500 36.5px/44px var(--x-font)",
  "14 'Grok Bot' on the card, 136.7 wide (155.3-292.0), cap 26.4 "
  "(547.3-573.7): 36px medium sets 135.0 on the board, 36.5px 136.9"),
 ("Type", "t-store-h", "700 21px/26px var(--x-font)",
  "15 'Also Included In' 154.7 x 15.7 (x 20.7-175.3), 'What's New', "
  "'Preview': 21px bold sets 155.0; 20.5px sets 151.3"),
 ("Type", "t-store-title", "600 21px/26px var(--x-font)",
  "15 'Grok Bot' beside the icon, 82.0 x 15.7 (x 155-237, G top to the k "
  "foot): the same height as the section heads but 21px bold sets 84.3, "
  "2.7% wide, and 21px semibold 82.2"),
 ("Type", "t-store-sub", "400 14px/19px var(--x-font)",
  "15 'AI agents that do real work' 171.3 wide (154.7-326.0); 14px sets "
  "171.5"),
 ("Type", "t-store-label", "600 11px/13px var(--x-font)",
  "15 '3.3K RATINGS' 76.0 wide (30.3-106.3), 'AGE RATING' 66.3, 'CHART' "
  "38.0, cap 8.0 (295.0-303.0): 11px semibold caps at 7.9"),
 ("Type", "t-store-val", "700 21px/25px var(--x-font)",
  "15 '4.9' 31.3 wide (52-83.3), '18+' 35.0, '#19' 32.3, digit tops 318.7: "
  "21px bold sets 31.5 / 35.2 / 32.0"),
 ("Type", "t-store-small", "400 11.5px/14px var(--x-font)",
  "15 'Years' 29.7 wide (161.7-191.3), 'Productivity' 66.3 (249-315.3): "
  "11.5px sets 29.5 / 66.0; 'News' under the bundle the same size"),
 ("Type", "t-store-bundle", "400 16px/19px var(--x-font)",
  "15 'Apps by SpaceXAI: AI,' cap tops 432.0 and 451.0 (19 pitch), A cap "
  "11.3: 16px has 11.5"),
 ("Type", "t-store-body", "400 14px/19px var(--x-font)",
  "15 'Version 1.8.0' cap 569.3, the three release-note lines at 598.3 / "
  "617.3 / 636.3 (19 pitch), V cap 10.0: 14px"),
 ("Type", "t-store-btn", "600 13px/16px var(--x-font)",
  "15 'Purchased' 66.7 wide (302.3-369.0), P cap 9.3: 13px semibold sets "
  "66.4 with a 9.3 cap"),
 ("Type", "t-illo-label", "500 11.5px/14px var(--x-font)",
  "02 'Grok' beside the app icon: ink 25.9 x 8.9; the stack sets 600 12px "
  "to 27.3 x 9.3 and 11.5px to 26.2 x 8.9. Weight and size swept over the "
  "word's box: 500 11.5px 7.9, 600 11.5px 13.4, 400 11.5px 10.1"),
 ("Type", "t-illo-title", "600 21.25px/26px var(--x-font)",
  "02 sheet title 'Grok': ink 44.6 x 16.1; 700 21px sets 46.3 x 15.7, 22px "
  "48.7 x 16.3, 600 22px 47.3 x 16.3. Swept over the word's box: 600 "
  "21.25px 7.9, 600 21px 8.7, 500 21.5px 9.1, 700 21px 11.2, 700 22px 16.7"),
 ("Type", "t-illo-sub", "400 11.25px/15px var(--x-font)",
  "02 'Quickly start a new chat with Grok.': ink 184.7 x 10.7; 400 11.5px "
  "sets 188.7 x 10.7, 12px 195.7 x 11.3. Swept over the line's box in .05 "
  "steps: 11.25px 11.3, 11.2px 11.8, 11.3px 13.4, 11.5px 19.8"),
 ("Type", "t-illo-pill", "600 15.5px/20px var(--x-font)",
  "02 'Grok' in the widget pill, unprojected into the card's plane: ink "
  "35.0 x 12.2; 600 16px sets 35.3 x 12.3, and projected back reads 34.8 "
  "x 13.8 against the capture's 34.3 x 15.2, a taller face. Swept over "
  "the word's box: 15.5px 27.9, 15px 28.3, 16px 34.7, 16.5px 40.1. Set in "
  "the card's flat coordinates, before its matrix3d"),

 ("Metrics", "w",         "393px",  "iPhone 14 Pro/15/16 logical width"),
 ("Metrics", "h",         "852px",  "iPhone 14 Pro/15/16 logical height"),
 ("Metrics", "status",    "54px",   "iOS status bar, Dynamic Island devices"),
 ("Metrics", "gutter",    "16px",
  "02 card x 16.1-376.8; 04 buttons x 16.3 and 333.2-377"),
 ("Metrics", "gutter-w",  "20px",
  "05 card x 20.5-372.3, plan group and CTA the same"),
 ("Metrics", "tap",       "44px",
  "02 back disc 44.1 x 43.7; 04 X and grid buttons 43-43.7"),
 ("Metrics", "sheet-top", "59px",   "02/03 sheet ground starts at 58.9"),
 ("Metrics", "sheet-top-v", "403.6px", "04 sheet edge, col x100"),
 ("Metrics", "widget",    "162.4px", "01 widget 24.1-186.5 both axes"),
 ("Metrics", "disc",      "40px",   "05 icon discs 40 x 39.8, left edge 40.3"),
 ("Metrics", "w-pro",     "402px",
  "iPhone 16 Pro logical width: cp6, cp7 and cp13-cp15 are 1206 x 2622 at 3 px/pt"),
 ("Metrics", "h-pro",     "874px",  "iPhone 16 Pro logical height"),
 ("Metrics", "sheet-v-blur", "4px",
  "04 sigma of the blur read off the voice pill's edge, the one sharp edge the capture holds under the sheet: across x 270-300 at y 776/784/792 the ramp from the ground (40) to the pill (74) is 10pt for 10-90%, down x 310/334/358 over y 755-775 it is 8pt, 3.1-3.9 sigma; blur(4px). A sweep cannot read it: it walks to 44px+ because blurring the generated scene away hides the scene's own error (sheet band 13.3 at 44px against 16.3 at 4px)"),
 ("Metrics", "illo-stroke", "10px",
  "03 the drawn frame's stroke: 10.0pt at the sides (x 45.8-55.8), 9.6 at "
  "the top (y 205.9-215.5); one border"),
 ("Metrics", "status-pro", "59px",
  "iOS status bar on the 402pt device: 07 clock and cluster ink y 25.7-39.3, "
  "x 44.7-366.7, no island on a screenshot; the band the template bar "
  "covers on 06-07 and 13-15, and where their scoring starts"),
 # ---- 08-12: the voice picker and the settings sheet ----
 ("Font", "mono", 'ui-monospace,"SF Mono",Menlo,monospace',
  "12 the version line: every glyph of 'VERSION 1.3.42 (BUILD 2776)' sets on "
  "one pitch, 6.95pt per character over 27 characters (187.4 wide); a "
  "monospaced face, the platform's"),
 ("Surface", "voice-sheet", "#EDEDEE",
  "08/09 the voice card's interior, col x196 405-700 and row y520 outside the "
  "orb: flat #EDEDEE once the export's cast is taken out (README, colour "
  "normalisation). Its 1pt edge reads #FCFAFC, card white"),
 ("Surface", "nav-well", "#C8C8C9",
  "08/09 the tints under the nav: the menu disc 17.8-60.7 x 63.1-106.9, the "
  "Ask pill from 130.3 x 69.4-99.8, the compose disc from 335.4 x 64.0-106.9, "
  "all flat #C8C8C9, three levels under dim"),
 ("Surface", "avatar",   "#F0F0F0",
  "10 the profile disc 32.1-91.9 x 180.2-240.4, flat #F0F0F0 around the glyph"),
 ("Surface", "toggle-off", "#C5C4C7",
  "11 'Open App in Voice Mode' track 300.3-362.7 x 283.0-310.7, flat #C5C4C7 "
  "beside its white knob 302.0-339.1 x 285.3-308.9"),
 ("Line", "card-line", "#EAEAEA",
  "10 the rule between rows, x 64.3-360.7 at y 373.9-374.8 and every 52 "
  "below: two capture pixels (0.9pt) of #EAEAEA between white rows, no "
  "solve needed; drawn 0.9pt tall so the same two pixels carry it"),
 ("Line", "voice-shadow", "rgba(0,0,0,.11)",
  "08/09 the ground beside the card reads 7-11 levels under dim, 3 above "
  "it. Swept as 0 4px 16px over the bands beside the card: .10 leaves them "
  "+0.6/+0.4, .11 +0.2/-0.0, .12 -0.5/-0.8, .14 -1.6/-2.1; 0 2px 10px and "
  "0 6px 24px score worse at every alpha"),
 ("Ink", "voice-sub", "#5E5E5E",
  "08/09 'Upbeat Female', 'Soothing Female' and 'Swipe to explore more "
  "voices' ink core #5E5E5E"),
 ("Ink", "dot-off",  "#A6A3A7",
  "08/09 the three inactive page dots, mode #A6A3A7 across y 707.1-713.4; the "
  "active one is ink"),
 ("Ink", "voice-btn", "#090709",
  "09 the Continue pill 46.5-347.2 x 746.1-796.5, 99.4% flat #090709: the "
  "capture's black, 9 levels above btn, which the same export reads on 07"),
 ("Ink", "section-ink", "#787878",
  "10/11/12 'General', 'Voice', 'Data & Information', 'Subscription' ink "
  "core #787878, three screens"),
 ("Ink", "sec-ink",  "#7C7C7C",
  "10 'English' core #7C7C7C, the email line #7B7B7B: one secondary ink. "
  "07's placeholder reads #7D7D7D off a 3 px/pt capture, kept apart because "
  "that is another device's export"),
 ("Ink", "danger",   "#BE484C",
  "12 'Sign Out', the label: its 20 most-covered pixels average #BE484C "
  "(darkest 2% by luminance #AE4E52). The glyph beside it cores at #E83B43, "
  "a brighter red no ink this dark could give, and is its own crop"),
 ("Ink", "version-ink", "#C2C2C2",
  "12 'VERSION 1.3.42 (BUILD 2776)' ink core #C3C1C3, the lightest type on "
  "the set"),
 ("Radius", "r-voice",  "37.5px",
  "08/09 the voice card's top corners: circle fit to its edge 37.5 (err "
  "4.2). Its bottom corners, fit 50.5 with a poor residual, arrive as pixels "
  "in the band crop"),
 ("Radius", "r-modal",  "39.5px",
  "10/11/12 the sheet's top corners, circle fit on the dim/sheet edge 39.5"),
 ("Radius", "r-group",  "25.5px",
  "10 the settings cards, fit 25.5 at x 16.1 / y 323.1 on the sheet"),
 ("Type", "t-nav",     "500 16px/22px var(--x-font)",
  "08/09 'Ask' 26.3 x 12.0, 'Imagine' 56.7 wide: 500 17px sets 28.5 / 59.8, "
  "16px 26.8 / 56.3"),
 ("Type", "t-voice",   "600 16.25px/21px var(--x-font)",
  "08/09 'Voice Selection' 115.5 wide, 'Ara' 24.5, 'Eve' 25.0, 09 'Continue' "
  "67.4: 600 17px (t-h) sets 120.4 / 25.9 / 26.3 / 70.5, 16.25px 115.1 / 24.8 "
  "/ 25.1 / 67.4"),
  ("Type", "t-mail",    "400 15.9px/20px var(--x-font)",
  "10 'alexsmith.mobbin+1@gmail.-' 207.4 wide, 'com' 29.4: 400 15px sets "
  "195.8 / 27.7, 15.9px 207.5 / 29.4. 'Alex Smith' above it is t-h: 83.0 "
  "against 17px semibold's 82.8"),
 ("Type", "t-section", "600 15px/20px var(--x-font)",
  "10/11/12 'General' 53.1 x 11.2 cap, 'Voice' 37.9, 'Data & Information' "
  "132.0, 'Subscription' 88.8: 600 15.5px sets 55.3 / 39.3 / 136.1 / 91.9, "
  "15px 53.5 / 38.0 / 131.7 / 88.9"),
 ("Type", "t-voice-sub", "400 16px/21px var(--x-font)",
  "08/09 'Upbeat Female' 108.4 x 14.7 (cap to descender), 'Soothing Female' "
  "120.4: 400 16px sets 108.6 / 120.2"),
 ("Type", "t-hint",    "400 14.25px/18px var(--x-font)",
  "08 'Swipe to explore more voices' 190.5 x 12.9: 400 14px sets 186.9, "
  "14.25px 190.2"),
 ("Type", "t-version", "400 11.65px/16px var(--x-mono)",
  "12 'VERSION 1.3.42 (BUILD 2776)' 186.9 x 11.6, parentheses to their "
  "full height: 12px sets 192.3 x 10.7, 11.65px 186.7; the face's parens "
  "are shorter than the capture's, so the width is what this fits"),
 ("Metrics", "row-s",  "52px",
  "10/11 settings rows: cap tops 343.0/394.3/446.5/498.3/550.9 (pitch "
  "51.3-52.6), a three-row card 156.1 tall, rules every 52.0"),
 ("Metrics", "sheet-blur", "19px",
  "14 the glass sheet's backdrop blur, swept with glass-sheet over the Got "
  "it pill seen through the sheet (x 40-360 y 764-784): at .5 white, 14px "
  "sits -6.63, 16px -3.76, 18px -0.92, 19px +0.17, 20px +1.57, 28px +11.9; "
  "the same band at .52/14px -2.47 and .55/14px +3.12"),
 ("Metrics", "sheet-top-s", "58.7px",
  "10/11/12 the sheet's edge, col x100: dim to 58.7, the header band from there"),
]


def _root():
    """One :root block, byte-identical in every board. No `}` inside it:
    refkit tokens reads it with a non-greedy regex."""
    out, seen = [":root{"], None
    for group, name, value, _ in TOKENS:
        if group != seen:
            out.append("" if seen else None)
            out.append("  /* %s */" % group)
            seen = group
        out.append("  --x-%s:%s;" % (name, value))
    return "\n".join(x for x in out if x is not None) + "\n}"


TOKENS_CSS = _root()

# ------------------------------------------------------------------ art ----
# Boxes (pt) patched out of a capture before it is cropped: everything on the
# photo and the sheet that the boards draw again in CSS. Each box is filled
# with a Coons patch from its own four edges, which is exact on the smooth
# grounds these sit on and continuous at the boundary by construction.
INPAINT = {
 "i4": ("cp4", [
    (40, 16, 105, 42), (278, 18, 366, 40),     # status bar clock and glyphs
    (130, 8, 263, 52),                         # Dynamic Island
    (14, 61, 62, 110), (331, 61, 380, 110),    # X and grid buttons
    (337, 121, 376, 158), (337, 174, 376, 213), (337, 227, 376, 265),
    (343, 288, 367, 304),                      # side stack and its chevron
    (176, 406, 217, 416),                      # grabber
    (138, 430, 255, 453), (325, 417, 372, 464),  # title, close disc
    (32, 502, 187, 522), (331, 498, 360, 526),   # row 1 label and icon
    (32, 565, 201, 588), (330, 560, 361, 590),   # row 2 label and icon
 ]),
 "i5": ("cp5", [
    (40, 16, 105, 42), (278, 18, 366, 40),     # status bar clock and glyphs
    (312, 64, 376, 102),                       # Skip
    (95, 103, 298, 147), (61, 151, 334, 178),  # title, subtitle
    (19, 617, 374, 716), (19, 729, 374, 788),  # plan group, CTA
    (30, 802, 364, 820),                       # footer
 ]),
 # 08/09: the band that carries the voice card's bottom corners and its
 # shadow, with the page dots and the hint / pill patched out; 10-12: the
 # header band (material, close disc, the fade below it) with its title out.
 "i8": ("cp8", [(172.0, 705.5, 222.0, 715.0), (100.0, 764.0, 294.0, 780.5)]),
 "i9": ("cp9", [(172.0, 705.5, 222.0, 715.0), (45.0, 744.5, 349.0, 798.0)]),
 "i10": ("cp10", [(162.5, 88.5, 230.5, 108.0)]),
 "i11": ("cp11", [(162.5, 88.5, 230.5, 108.0), (31.5, 140.5, 72.0, 154.5)]),
 "i12": ("cp12", [(162.5, 88.5, 230.5, 108.0)]),
}
# 05's feature card: un-apply the material inside it, then patch its 1pt
# edge, its four corner arcs, the icon discs and the nine lines of type.
CARD = (20.5, 199.0, 372.3, 523.8)
CARD_PATCH = ([(19.0, 197.5, 374.0, 201.0), (19.0, 522.0, 374.0, 525.5),
               (19.0, 197.5, 22.5, 525.5), (370.5, 197.5, 374.0, 525.5),
               (19.0, 197.5, 53.0, 233.0), (340.0, 197.5, 374.0, 233.0),
               (19.0, 490.0, 53.0, 525.5), (340.0, 490.0, 374.0, 525.5)]
              + [(39, cy - 21.5, 82, cy + 21.5)
                 for cy in (239.1, 299.1, 360.25, 422.45, 483.8)]
              + [(93, y0, 350, y1) for y0, y1 in
                 ((221, 242), (243, 260), (281, 302), (303, 320), (340, 361),
                  (362, 383), (402, 423), (424, 445), (475, 496))])


def _coons(a, box, s=SCALE):
    import numpy as np                                        # noqa: local dep
    x0, y0, x1, y1 = [round(v * s) for v in box]
    h, w, band = y1 - y0, x1 - x0, 2

    def edge(v, k=9):                     # a smoothed profile: texture along an
        v = np.pad(v, ((k // 2, k // 2), (0, 0)), mode="edge")   # edge would
        return np.stack([np.convolve(v[:, c], np.ones(k) / k, "valid")  # streak
                         for c in range(3)], 1)                     # across
    top, bot = edge(a[y0 - band:y0, x0:x1].mean(0)), edge(a[y1:y1 + band, x0:x1].mean(0))
    lef, rig = edge(a[y0:y1, x0 - band:x0].mean(1)), edge(a[y0:y1, x1:x1 + band].mean(1))
    U, V = np.meshgrid((np.arange(w) + .5) / w, (np.arange(h) + .5) / h)
    U, V = U[..., None], V[..., None]
    a[y0:y1, x0:x1] = ((1 - V) * top + V * bot + (1 - U) * lef[:, None]
                       + U * rig[:, None]
                       - ((1 - U) * (1 - V) * top[0] + U * (1 - V) * top[-1]
                          + (1 - U) * V * bot[0] + U * V * bot[-1]))


def _source(ref, cache):
    """A capture as an RGB image, patched first if crops.json asks for i4/i5/i8-i12."""
    from PIL import Image                                     # noqa: local dep
    import numpy as np
    if ref in cache:
        return cache[ref]
    if ref not in INPAINT:
        cache[ref] = Image.open(REFS_DIR / (ref + ".png")).convert("RGB")
        return cache[ref]
    src, boxes = INPAINT[ref]
    a = np.asarray(Image.open(REFS_DIR / (src + ".png")).convert("RGB")).astype(float)
    for box in boxes:
        _coons(a, box, scale_of(src))
    if ref == "i5":
        x0, y0, x1, y1 = [round(v * SCALE) for v in CARD]
        a[y0:y1, x0:x1] = np.clip((a[y0:y1, x0:x1] - 255 * .067) / (1 - .067), 0, 255)
        for box in CARD_PATCH:
            _coons(a, box)
    cache[ref] = Image.fromarray(np.clip(a + .5, 0, 255).astype("uint8"))
    return cache[ref]


# The three glyphs on 04's voice sheet: white ink the capture shows over the
# sheet's own blurred ground, which is not on the board any more (see s04).
KEYED = {"04-ic-close", "04-ic-airplay", "04-ic-person"}


def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return
    ART_DIR.mkdir(parents=True, exist_ok=True)
    cache, n = {}, 0
    for cid, (ref, x0, y0, x1, y1) in CROPS.items():
        if not (REFS_DIR / (INPAINT.get(ref, (ref,))[0] + ".png")).exists():
            continue
        box = tuple(round(v * scale_of(ref)) for v in (x0, y0, x1, y1))
        im = _source(ref, cache).crop(box)
        if cid in KEYED:
            # A white glyph the capture shows through the voice sheet: its
            # ground is the sheet, which the board now draws, so the crop
            # keeps the glyph's coverage and drops the ground. Ground is the
            # median of the 1pt margin the box carries; coverage per pixel is
            # the largest channel's (p - g) / (255 - g), the ink white.
            import numpy as np
            from PIL import Image
            a = np.asarray(im.convert("RGB")).astype(float)
            m = np.concatenate([a[:2].reshape(-1, 3), a[-2:].reshape(-1, 3),
                                a[:, :2].reshape(-1, 3), a[:, -2:].reshape(-1, 3)])
            g = np.median(m, axis=0)
            cov = np.clip(((a - g) / (255 - g)).max(axis=2), 0, 1)
            out = np.empty(a.shape[:2] + (4,), dtype="uint8")
            out[..., :3] = 255
            out[..., 3] = np.round(cov * 255)
            im = Image.fromarray(out, "RGBA")
        im.save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def art(cid, style="", z=None, top=None):
    """One <img>, at the box it was measured from, snapped to the pixels
    cut() took: a crop placed at its pt box lands up to half a capture
    pixel from where it was cut, which reads as a one-pixel shift on every
    glyph. top moves a crop placed more than once (the chevron)."""
    ref, x0, y0, x1, y1 = CROPS[cid]
    s = scale_of(ref)
    w, h = round(x1 * s) - round(x0 * s), round(y1 * s) - round(y0 * s)
    x, y = round(x0 * s), round((top if top is not None else y0) * s)
    return ('<img class="a" src="%s" alt="" style="left:%.3fpx;top:%.3fpx;'
            'width:%.3fpx;height:%.3fpx%s%s">'
            % (_uri(cid), x / s, y / s, w / s, h / s,
               ";z-index:%d" % z if z else "", ";" + style if style else ""))


ICON_DIR = OUT / "assets" / "icons"


def icon(name, colour):
    """One inline <svg> from assets/icons/<name>.svg, at the ink box its
    viewBox holds (pt), so the drawing is 1:1 with the measurement and the
    canvas's inspector names it as a vector asset."""
    svg = (ICON_DIR / (name + ".svg")).read_text().strip()
    x, y, w, h = (float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split())
    return svg.replace('<svg xmlns="http://www.w3.org/2000/svg" ',
                       '<svg class="ic" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx;color:%s" '
                       % (x, y, w, h, colour), 1).replace("\n", "")


# ------------------------------------------------------------ phone frame ----
# Measured once, for every board. The bezel is this repo's own framing, not a
# property of the app being cloned, so it is the same in every folder.
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

# translateZ(0) composites the frame itself: Safari on iPhone clips composited
# children of a non-composited ancestor with a plain rectangle, so the screen
# painted square past the bezel's corners (docs/2026-09-03-phone-corners-safari.md).
PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-card);color:var(--x-ink);transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:100%;height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--x-t-time)}
.sb .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
.sb .rec{position:absolute;left:215px;top:26.8px;width:5.8px;height:5.8px;border-radius:50%;background:var(--x-rec)}
.sb svg{position:absolute;display:block;fill:currentColor}
/* iOS picks the indicator colour against the wallpaper: measure it per screen */
.home{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);
  width:139px;height:5px;border-radius:3px;background:currentColor;z-index:6}"""

# Cellular, wifi, battery at their measured status-bar positions, inheriting
# currentColor so one call recolours the whole bar.
SB_ICONS = (
 '<svg style="left:282px;top:23.34px;width:19.33px;height:12px" viewBox="0 0 19.33 12">'
 '<rect x="0" y="7.67" width="3.33" height="4.33" rx="1.05"/>'
 '<rect x="5.33" y="5.33" width="3.33" height="6.67" rx="1.05"/>'
 '<rect x="10.67" y="2.67" width="3.33" height="9.33" rx="1.05"/>'
 '<rect x="16" y="0" width="3.33" height="12" rx="1.05"/></svg>'
 '<svg preserveAspectRatio="none" viewBox="335 22.008 19.114 13.796"'
 ' style="left:309px;top:23px;width:16.62px;height:12.3px">'
 '<path d="M344.555 35.8042C344.738 35.8042 344.896 35.7212 345.219 35.4058L347.245'
 ' 33.4634C347.369 33.3389 347.403 33.1562 347.286 33.0068C346.747 32.3096 345.726'
 ' 31.7036 344.555 31.7036C343.352 31.7036 342.331 32.3345 341.791 33.0566C341.708'
 ' 33.1895 341.741 33.3389 341.874 33.4634L343.891 35.4058C344.215 35.7129 344.373'
 ' 35.8042 344.555 35.8042ZM339.7 31.2886C339.882 31.4629 340.106 31.438 340.272'
 ' 31.2554C341.268 30.1514 342.895 29.3462 344.555 29.3545C346.232 29.3462 347.859'
 ' 30.1763 348.872 31.2803C349.021 31.4546 349.229 31.4463 349.411 31.2803L350.698'
 ' 30.002C350.831 29.8691 350.848 29.6865 350.723 29.5371C349.47 28.0015 347.145'
 ' 26.8477 344.555 26.8477C341.966 26.8477 339.641 28.0015 338.388 29.5371C338.263'
 ' 29.6865 338.272 29.8525 338.413 30.002L339.7 31.2886ZM336.255 27.8189C336.421'
 ' 27.9766 336.653 27.9766 336.811 27.8106C338.853 25.644 341.542 24.4985 344.555'
 ' 24.4985C347.585 24.4985 350.291 25.6523 352.317 27.8189C352.466 27.9683 352.69'
 ' 27.96 352.856 27.8022L354.002 26.6567C354.151 26.5073 354.143 26.3247 354.027'
 ' 26.1836C352.076 23.7764 348.407 22.0083 344.555 22.0083C340.712 22.0083 337.027'
 ' 23.7764 335.084 26.1836C334.968 26.3247 334.968 26.5073 335.109 26.6567L336.255'
 ' 27.8189Z"/></svg>'
 '<svg style="left:333px;top:23px;width:27.3px;height:12.7px" viewBox="0 0 27.3 12.7">'
 '<rect x=".6" y=".6" width="24.1" height="11.5" rx="4" fill="none" stroke="currentColor"'
 ' stroke-opacity=".38"/><rect x="2" y="2" width="21.3" height="8.7" rx="2.6"/>'
 '<path d="M26.1 4.3c.9.7.9 3 0 3.7V4.3Z" fill-opacity=".38"/></svg>')


def statusbar(colour="var(--x-ink)", time="9:41", rec=False, dx=0):
    """The template bar. dx shifts the right cluster (and widens the clock's
    centring box by the same) for the 402pt boards."""
    return ('<div class="sb" style="color:%s"><div class="island"></div>%s'
            '<div class="time"%s>%s</div><div style="position:absolute;left:%dpx;top:0">%s</div></div>'
            % (colour, '<div class="rec"></div>' if rec else "",
               ' style="width:%.1fpx"' % (142.4 + dx) if dx else "", time, dx, SB_ICONS))


def home(colour="var(--x-ink)"):
    return '<div class="home" style="color:%s"></div>' % colour


# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print(name, len(html))


# ------------------------------------------------------- the line box ----
# Every string on these boards is placed by the top of its ink, because that
# is what refkit measures. Chrome puts the cap top of a line at
#   lh/2 - 0.3455*size
# below the box top -- half-leading (lh - 1.162*size)/2 plus the gap between
# the ascent (0.952em) and the cap height (0.7165em) of the platform face.
TY = {"t-time": (15, 20), "t-widget": (19.5, 24), "t-h": (17, 22), "t-body": (17, 22),
      "t-feat": (17.5, 22), "t-row": (16.5, 21), "t-sheet": (16, 21), "t-h1": (40.5, 50),
      "t-h2": (20, 25), "t-sub": (13.25, 18), "t-plan": (15, 20), "t-unit": (15.4, 20),
      "t-price": (20, 26), "t-free": (12.5, 14), "t-title": (21, 26), "t-copy": (14, 19),
      "t-link": (16.75, 22), "t-hdr": (22, 28), "t-chip": (14, 20), "t-ctl": (14, 18),
      "t-btn": (15.5, 20), "t-sheet-h": (18.2, 22), "t-sheet-copy": (15.25, 20), "t-card": (36.5, 44),
      "t-store-h": (21, 26), "t-store-title": (21, 26), "t-store-sub": (14, 19), "t-store-label": (11, 13),
      "t-store-val": (21, 25), "t-store-small": (11.5, 14), "t-store-bundle": (16, 19),
      "t-store-body": (14, 19), "t-store-btn": (13, 16), "t-ask": (16, 21),
      "t-speak": (14.5, 18), "t-nav": (16, 22), "t-voice": (16.25, 21), "t-mail": (15.9, 20),
      "t-section": (15, 20), "t-voice-sub": (16, 21), "t-hint": (14.25, 18),
      "t-version": (11.65, 16), "t-illo-label": (11.5, 14),
      "t-illo-title": (21.25, 26), "t-illo-sub": (11.25, 15), "t-illo-pill": (15.5, 20)}


def boxtop(ink_top, tk):
    size, lh = TY[tk]
    return ink_top - (lh / 2 - 0.3455 * size)


def tx(x, ink_top, s, tk="t-body", col=None, w=None, extra="", attrs=""):
    """One run of type, positioned by the top of its ink."""
    return ('<div class="t"%s style="left:%.2fpx;top:%.2fpx;font:var(--x-%s)%s%s%s">%s</div>'
            % (attrs, x, boxtop(ink_top, tk), tk,
               ";color:%s" % col if col else "",
               ";width:%.1fpx" % w if w else "", extra, s))


def txc(ink_top, s, tk="t-body", col=None, x=0.0, w=393.0, extra="", attrs=""):
    """Centred type. The width is the box it centres in, not the ink."""
    return tx(x, ink_top, s, tk, col, w, ";text-align:center" + extra, attrs)


def box(x, y, w, h, style="", cls="b", inner="", attrs=""):
    return ('<div class="%s"%s style="left:%.1fpx;top:%.1fpx;width:%.1fpx;'
            'height:%.1fpx;%s">%s</div>' % (cls, attrs, x, y, w, h, style, inner))


def circle(x, y, d, style=""):
    return box(x, y, d, d, "border-radius:50%;" + style)


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.t,.b,.a,.ic{position:absolute}
.a,.ic{display:block}
.ic{overflow:visible}
.t{white-space:nowrap}
.u{font:var(--x-t-unit)}
.k{color:var(--x-ink)}
s{text-decoration:line-through}"""

# The one thing here that is decoration rather than measurement: the halo
# under 02's back disc reads #F2F2F2 four levels under the #F6F6F6 sheet just
# above it and #EFEFEF eleven levels under it 8-19pt below, which is what
# this shadow puts back.
SH = "box-shadow:0 5px 16px rgba(0,0,0,.07)"
# 07's chips: col x30 reads #F5F5F5 to 780.7 and #F2F2F2 from there to 782.3,
# with no halo at the sides (row 752 goes straight from the chip to #FFFFFF).
CHIP_SH = "box-shadow:0 1.6px 0 #F2F2F2"
COMPOSER_SH = "0 4px 14px var(--x-composer-shadow)"


def screen(title, inner, sb="var(--x-ink)", hm="var(--x-ink)", bg=None, rec=False, big=False,
           under=""):
    """One phone artboard. No board background: the phone floats on the canvas.
    big: the 402 x 874 device, template status bar over the content, no home
    indicator (the captures show none); hm None hides it on a 393pt screen.
    under: content the status bar sits on top of (14's dimmed page)."""
    style = ("width:var(--x-w-pro);height:var(--x-h-pro);" if big else "") + \
            ("background:%s" % bg if bg else "")
    return page(NAME + " - " + title,
                '<div class="phone"%s>%s%s%s%s</div>'
                % (' style="%s"' % style if style else "", under,
                   statusbar(sb, rec=rec, dx=9 if big else 0), inner,
                   "" if big or hm is None else home(hm)),
                SCREEN_CSS)


# -------------------------------------------------------------------- 01 ----
# The small widget on the gallery's grey. Widget 24.1-186.5 both axes; the
# pill 37.5-173.0 x 94.5-156.1; two 62.5 x 63.8 wells at 164.6 down.
def s01():
    return screen("Home Screen widget",
        box(24.1, 80.3, 162.4, 162.4, "border-radius:var(--x-r-widget);background:var(--x-card)")
        + box(37.5, 94.5, 135.5, 61.6, "border-radius:var(--x-r-pill);background:var(--x-well)")
        + art("01-ic-mark") + tx(99.0, 118.6, "Grok", "t-widget")
        + box(37.5, 164.6, 62.5, 63.8, "border-radius:var(--x-r-pill);background:var(--x-well)")
        + box(110.5, 164.6, 62.5, 63.8, "border-radius:var(--x-r-pill);background:var(--x-well)")
        + art("01-ic-compose") + art("01-ic-wave"),
        bg="var(--x-ground)")


# ----------------------------------------------------------------- 02-03 ----
# The widget guide: a sheet from 58.9 with a 30pt corner, a white card at
# 16.1-376.8 x 137.0-665.4, the phone illustration cropped, two body lines on
# a 21.9 pitch at 548.6 and 570.5, and four page dots on a 16 pitch centred at
# y 641.45 with the active one a 12pt sparkle cut from the capture.
# The guide illustration is a drawing of a phone, and it is drawn: a frame
# with one border, a pill, ten rounded squares, four side buttons, all
# fading out through a mask whose stops are the capture's own fade profile
# (the frame column reads 170/172/176/182/186/194/205/217/226/235/245/249/251
# at 8px steps from y 470.9, i.e. opacity 1 -> .04 over 44pt). Origin 43,205.
ILLO_MASK = ("-webkit-mask-image:linear-gradient(#000 265.9px,rgba(0,0,0,.93) 273px,"
             "rgba(0,0,0,.81) 280.1px,rgba(0,0,0,.59) 287.3px,rgba(0,0,0,.34) 294.4px,"
             "rgba(0,0,0,.12) 301.6px,rgba(0,0,0,.05) 308.7px,rgba(0,0,0,.04) 310px)")
ILLO_TILES = [(x, y) for y in (73.4, 139.0, 204.5) for x in (30.1, 95.0, 159.9, 225.1)][:10]


def illo_phone(inner="", scrim=False):
    fr = "background:var(--x-illo-frame)"
    body = (box(2.8, 0.9, 301.6, 330.0,
                "box-sizing:border-box;border:var(--x-illo-stroke) solid var(--x-illo-frame);"
                "border-radius:var(--x-r-illo);background:var(--x-illo-screen)")
            + "".join(box(x, y, 52.2, 52.2, "border-radius:var(--x-r-illo-tile);"
                          "background:var(--x-illo-tile)") for x, y in ILLO_TILES)
            + (box(12.8, 10.9, 281.6, 320.0, "border-radius:43.5px 43.5px 0 0;"
                   "background:var(--x-illo-scrim)") if scrim else "")
            + box(110.0, 21.6, 87.0, 25.0, "border-radius:12.5px;" + fr)
            + box(1.0, 130.9, 1.8, 28.3, fr) + box(1.0, 180.9, 1.8, 46.6, fr)
            + box(1.0, 239.8, 1.8, 45.3, fr) + box(304.4, 197.6, 1.9, 73.2, fr)
            + inner)
    return box(43.0, 205.0, 307.0, 310.0, "overflow:hidden;" + ILLO_MASK, inner=body,
               attrs=" data-clip-ok")


# 02's widget card is a flat 130 x 90.9 rectangle seen in perspective. Its
# four edges were fitted to the capture (top y = .1355x + 436.67, bottom
# y = .0908x + 641.72, left x = -.0402y + 212.67, right x = .0364y + 459.80
# in capture px of the illustration crop) and the corners they meet at,
# (86.6,206.5) (213.3,223.7) (216.3,305.9) (83.1,293.8) in pt from the
# illustration's origin, fix the homography below. The flat aspect is the
# one that makes the pill's 'Grok' set at the platform face's own aspect
# (2.86 wide per ink height); the pill's caps unproject to circles at any
# aspect from 1.1 to 1.4, so they cannot decide it. The pill and its label
# are the capture's edges unprojected through the same matrix: pill u
# .0707-.9388, v .1124-.7353; ink u .480-.749, v .358-.492.
ILLO_CARD = ("transform-origin:0 0;transform:matrix3d(1.08765,0.250679,0,0.000530578,"
             "-0.084579,0.797395,0,-0.000553983,0,0,1,0,86.5763,206.522,0,1)")


def illo_sheet():
    """02: the add-widget sheet drawn over the phone, origin 43,205."""
    sheet = "border-radius:var(--x-r-illo-sheet) var(--x-r-illo-sheet) 0 0;"
    ghost = "background:var(--x-well);filter:blur(1.5px)"
    pill = box(9.19, 10.22, 112.85, 56.63, "border-radius:var(--x-r-pill);"
               "background:var(--x-well)",
               inner=tx(53.21, 22.35, "Grok", "t-illo-pill", col="var(--x-ink)"))
    return (box(12.8, 10.9, 281.6, 319.1, "overflow:hidden;border-radius:43.5px 43.5px 0 0",
                inner=box(0, 83.2, 281.6, 236.0, sheet + "box-shadow:0 0 24px var(--x-illo-sheet-shadow)"))
            + box(12.8, 94.1, 281.6, 236.0, sheet + "background:var(--x-card)")
            + box(140.8, 97.4, 25.4, 3.6, "border-radius:1.8px;background:var(--x-illo-grabber)")
            + tx(55.1, 116.2, "Grok", "t-illo-label", col="var(--x-illo-label)")
            + txc(155.9, "Grok", "t-illo-title", col="var(--x-ink)", x=12.8, w=281.6)
            + txc(182.7, "Quickly start a new chat with Grok.", "t-illo-sub",
                  col="var(--x-illo-sub)", x=12.8, w=281.6)
            + circle(100.6, 283.5, 42.0, ghost) + circle(165.3, 287.5, 31.3, ghost)
            + box(0, 0, 130.0, 90.91, ILLO_CARD + ";border-radius:var(--x-r-illo-card);"
                  "background:var(--x-card);box-shadow:0 4px 28px var(--x-illo-card-shadow)",
                  inner=pill))


def guide(n, title, l1, l2, active, illo):
    dots = ""
    for i in range(4):
        cx = 172.5 + 16 * i
        dots += (art("%02d-ic-sparkle" % n) if i == active
                 else circle(cx - 3.1, 638.35, 6.2, "background:var(--x-dots)"))
    return screen(title,
        box(0, 58.9, 393, 793.1, "border-radius:var(--x-r-sheet) var(--x-r-sheet) 0 0;"
            "background:var(--x-sheet)")
        + circle(16.1, 75.2, 44, "background:var(--x-card);" + SH) + art("02-ic-back")
        + txc(91.5, "Widget", "t-h")
        + box(16.1, 137.0, 360.7, 528.4, "border-radius:var(--x-r-card);background:var(--x-card)")
        + txc(161.5, "Home Screen Widget", "t-h", x=16.1, w=360.7)
        + illo
        + txc(548.6, l1, "t-body", x=16.1, w=360.7)
        + txc(570.5, l2, "t-body", x=16.1, w=360.7)
        + dots,
        bg="var(--x-dim)")


def s02():
    return guide(2, "Widget guide, step 4",
                 "Find Grok in the list, choose a widget size,",
                 "then tap Add Widget.", 3,
                 illo_phone(illo_sheet(), scrim=True) + art("02-ic-app")
                 + art("02-ic-close") + art("02-ic-mark"))


def s03():
    return guide(3, "Widget guide, step 1",
                 "From the Home Screen, touch and hold an",
                 "empty area until the apps jiggle.", 0, illo_phone())


# -------------------------------------------------------------------- 04 ----
# Voice settings over the companion scene. The scene (04-scene) is the one
# picture here the capture does not contain: under the sheet it is blurred
# and dimmed, so the asset is the capture above the sheet's edge (the patched
# frame i4) and, below it, a gpt-image-2 edit of that frame with the sheet's
# box masked out and the body's measured proportions in the prompt
# (scratch/scene4.py composes it; README.md has the candidates and scores).
# The sheet is drawn over it: a 4px backdrop blur read off the voice pill's
# edge, a .40 black tint fitted through it, two row cards that are a 1pt line
# and no fill, and under the blur the voice pill where the capture shows it.
# The capture shows no home indicator on this screen (x 196, y 842 is grass).
def s04():
    inv = "var(--x-ink-inv)"
    side = ""
    for cy, name in ((139.9, "focus"), (192.9, "hanger"), (245.9, "trash")):
        side += circle(340.0, cy - 16, 32, "background:var(--x-glass)") + icon("04-" + name, "var(--x-side-ink)")
    row = "border-radius:var(--x-r-row);border:1px solid var(--x-row-line)"
    return screen("Voice settings",
        art("04-scene")
        + box(288.5, 767.4, 91.1, 33.9, "border-radius:var(--x-r-pill);background:var(--x-voice-pill)")
        + circle(16.3, 63.4, 44, "background:var(--x-scrim-btn)") + art("04-ic-x")
        + circle(333.2, 63.4, 44, "background:var(--x-scrim-btn)") + art("04-ic-grid")
        + side + art("04-ic-chevron")
        + box(8.5, 403.6, 384.5, 448.4, "border-radius:var(--x-r-sheet-v) var(--x-r-sheet-v) 0 0;"
              "backdrop-filter:blur(var(--x-sheet-v-blur));background:var(--x-sheet-v)")
        + box(20.4, 486.8, 352.8, 50.9, row) + box(20.4, 549.3, 352.8, 51.0, row)
        + box(179.3, 408.6, 34.3, 4.9, "border-radius:var(--x-r-pill);background:var(--x-grabber)")
        + txc(434.9, "Voice Settings", "t-sheet", inv)
        + circle(327.5, 419.4, 42, "background:var(--x-scrim-btn)") + art("04-ic-close")
        + tx(34.8, 506.2, "Select Audio Device", "t-row", inv) + art("04-ic-airplay")
        + tx(34.7, 568.3, "Microphone Selection", "t-row", inv) + art("04-ic-person"),
        sb=inv, hm=None, bg="#000", rec=True)


# -------------------------------------------------------------------- 05 ----
# The SuperGrok paywall. The smoke hero is the capture (05-bg) with the type
# and the cards patched out; the feature card is a 6.7% white material with a
# .16 edge, its five rows placed by ink top, the icons in 40pt discs centred
# on each row's text block. The regular-weight strings on this screen set 3%
# wider than 17px does (t-feat); the semibold ones sit on the nominal sizes.
FEATURES = [
 ("rocket",  223.5, "Longer conversations in Chat", 245.3, "With Grok 4.1 - Fast &amp; Expert mode"),
 ("imagine", 284.1, "Make more images &amp; videos", 305.1, "With Imagine 1.0 - longer, 720p videos"),
 ("wave5s",  343.0, "Longer Voice Mode &amp;", 364.5, "Companion chats"),
 ("star",    405.4, "Priority access during", 426.9, "peak times"),
 ("cube",    477.7, "Early access to new features", None, None),
]
DISC_Y = (239.1, 299.1, 360.25, 422.45, 483.8)


def s05():
    inv, mute = "var(--x-ink-inv)", "var(--x-mute)"
    rows = ""
    for (name, t1, s1, t2, s2), cy in zip(FEATURES, DISC_Y):
        rows += (circle(40.3, cy - 20, 40, "background:var(--x-disc)") + art("05-ic-" + name)
                 + tx(95.1, t1, s1, "t-feat", inv))
        if t2:
            rows += tx(95.1, t2, s2, "t-feat" if s2 in ("Companion chats", "peak times") else "t-sub",
                       inv if s2 in ("Companion chats", "peak times") else mute)
    return screen("SuperGrok paywall",
        art("05-bg")
        + box(315.6, 67.6, 56.7, 31.4, "border-radius:var(--x-r-pill);background:var(--x-skip)")
        + txc(77.0, "Skip", "t-feat", "var(--x-skip-ink)", 315.6, 56.7)
        + txc(107.0, "SuperGrok", "t-h1", inv, extra=";letter-spacing:.6px")
        + txc(156.1, "Unlock the full power of Grok", "t-h2", inv)
        + box(20.5, 199.0, 351.8, 324.8, "border-radius:var(--x-r-feat);background:var(--x-material);"
              "border:1px solid var(--x-material-line)")
        + rows
        + box(20.5, 618.4, 352.3, 96.6, "border-radius:var(--x-r-price);background:var(--x-price);"
              "border:1px solid var(--x-price-line)")
        + tx(42.0, 647.3, "Monthly", "t-plan", mute)
        + tx(41.9, 672.7, '<s>$30</s> <span class="u">/month</span>', "t-price", mute)
        + box(129.8, 640.1, 55.3, 27.7, "border-radius:var(--x-r-pill);background:var(--x-free-bg)")
        + txc(647.7, "FREE", "t-free", "var(--x-free-ink)", 129.8, 55.3)
        + box(197.0, 622.6, 172.0, 88.3, "border-radius:var(--x-r-plan);background:linear-gradient(to top right,var(--x-plan-lo),var(--x-plan-hi));"
              "border:1px solid var(--x-plan-line)")
        + tx(215.1, 638.4, "Yearly", "t-plan", inv)
        + tx(214.6, 661.1, '$300 <span class="u" style="color:var(--x-mute)">/year</span>', "t-price", inv)
        + tx(214.6, 684.7, "$25 /month", "t-sub", mute)
        + box(20.0, 730.5, 353.0, 56.0, "border-radius:var(--x-r-pill);background:var(--x-card)")
        + txc(753.0, "Upgrade to SuperGrok", "t-h", "var(--x-ink)", 20.0, 353.0)
        + txc(805.6, "Terms of Service &middot; Privacy Policy &middot; Restore Purchases",
              "t-sub", "var(--x-foot)"),
        sb=inv, hm=inv, bg="var(--x-night)")


# At 3 px/pt Chrome sets a left-anchored string 0.7pt right of its box (the
# face's left bearing: .6-1.0 on every string measured against the capture,
# 1.3 for a leading F), so the 402pt boards place through it. The line-box
# model above holds to the tenth on this device: ten strings on 06, 07, 14
# and 15 landed 0.3-0.7 low with a 0.5 drop, so there is none.
BEAR, DROP = 0.7, 0.0


def txb(x, ink_top, s, tk="t-body", col=None, w=None, extra="", attrs=""):
    return tx(x - BEAR, ink_top + DROP, s, tk, col, w, extra, attrs)


def txcb(ink_top, s, tk="t-body", col=None, x=0.0, w=402.0, extra="", attrs=""):
    return txc(ink_top + DROP, s, tk, col, x, w, extra, attrs)


# -------------------------------------------------------------- 06, 13 ----
# The terms notice: a white page, the mark cut from the capture, two title
# lines on a 26 pitch, three body lines on 19 with the two policy names in
# black, a 54pt black pill and an underlined link. 13 is the same page a
# beat after 'Sign out' was tapped: the pill's label is its spinner.
def terms(label):
    mute = "var(--x-copy-mute)"
    return (art("06-ic-mark")
        + txcb(379.0, "Updates to our Terms of Service", "t-title")
        + txcb(405.0, "and Acceptable Use Policy", "t-title")
        + txcb(444.7, 'We&rsquo;re updating our <span class="k">Terms of Service</span> and',
               "t-copy", mute)
        + txcb(463.7, '<span class="k">Acceptable Use Policy</span>. Now&rsquo;s a great chance to',
               "t-copy", mute)
        + txcb(482.7, "review them.", "t-copy", mute)
        + box(20.0, 730.7, 362.0, 54.0, "border-radius:var(--x-r-pill);background:var(--x-btn)")
        + label
        + txcb(804.2, "Sign out", "t-link",
               extra=";text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:1.7px"))


GOT_IT = txcb(751.8, "Got it", "t-btn", "var(--x-ink-inv)", 20.0, 362.0)


def s06():
    return screen("Terms update", terms(GOT_IT), bg="var(--x-page)", big=True)


def s13():
    return screen("Terms update, signing out", terms(art("13-spinner")),
                  bg="var(--x-page)", big=True)


# -------------------------------------------------------------------- 07 ----
# The SuperGrok home: header mark and wordmark, the grey watermark mark, three
# suggestion chips (the third runs off the screen; only 'Try C' is visible,
# and Gmail, GitHub and Notion in its icon trio make it Connectors), and the
# composer card with a thin grey edge over a soft halo.
def s07():
    inv = "var(--x-ink-inv)"
    chip = "border-radius:var(--x-r-chip);background:var(--x-chip);" + CHIP_SH
    ctl = "background:var(--x-ctl)"
    return screen("SuperGrok home",
        art("07-ic-mark") + txb(53.3, 78.3, "SuperGrok", "t-hdr", extra=";letter-spacing:.12px")
        + art("07-ic-watermark")
        + box(11.0, 675.0, 132.7, 52.0, chip) + icon("07-bot", "var(--x-ink)")
        + txb(58.0, 696.0, "Build a Bot", "t-chip")
        + box(151.3, 675.0, 138.0, 52.0, chip) + art("07-ic-bank") + txb(198.0, 696.0, "Try Finance", "t-chip")
        + box(297.0, 675.0, 105.0, 52.0, chip + ";border-radius:var(--x-r-chip) 0 0 var(--x-r-chip)")
        # the three connector avatars, painted right to left so each white
        # circle cuts the mark behind it, the way the capture shows them
        + "".join(circle(cx - 10.83, 690.17, 21.67, "background:var(--x-card)")
                  + icon("07-" + n, "var(--x-ink)")
                  for cx, n in ((355.5, "notion"), (340.0, "github"), (324.5, "gmail")))
        + txb(374.3, 696.0, "Try C", "t-chip")
        + box(10.3, 737.3, 381.3, 95.3, "border-radius:var(--x-r-composer);background:var(--x-composer);"
              "box-shadow:0 0 0 .67px var(--x-composer-line)," + COMPOSER_SH)
        + txb(27.0, 754.7, "Ask Anything", "t-ask", "var(--x-placeholder)")
        + circle(21.0, 789.3, 32.7, ctl) + art("07-ic-plus")
        + box(59.3, 789.3, 74.7, 32.7, "border-radius:var(--x-r-pill);" + ctl)
        + art("07-ic-auto") + txb(93.0, 800.7, "Auto", "t-ctl")
        + circle(255.3, 789.3, 32.7, ctl) + art("07-ic-mic")
        + box(293.7, 789.5, 87.6, 32.3, "border-radius:var(--x-r-pill);background:var(--x-btn)")
        + art("07-ic-wave") + txb(328.7, 800.2, "Speak", "t-speak", inv),
        bg="var(--x-page)", big=True)


# -------------------------------------------------------------------- 14 ----
# 'Introducing Grok Bot': the terms page under a scrim, a glass sheet with a
# dark outline, the blue card (blue lightening toward its top, a pale tilted
# ellipse in its top-left that fades out along its own width, and a thin
# darker ring 33pt outside it; the bot glyph and the NEW badge are crops), a
# heading, three body lines and the CTA pill.
CARD_CSS = ("border-radius:var(--x-r-card);background:linear-gradient(#6EB5FC,var(--x-card-blue) 110px);"
            "overflow:hidden;transform:translateZ(0)")
# Both ellipses are one least-squares fit of this exact construction to the
# card at 1pt (README): the pale one, then the ring as the same ellipse grown
# by 33.4 with a 12.7px border, both rotated about their shared centre.
WASH = ('<div style="position:absolute;left:-13.4px;top:-568.2px;width:331.6px;height:652.4px;'
        'border-radius:50%;transform:rotate(17.9deg);filter:blur(6.3px);'
        'background:linear-gradient(90deg,var(--x-card-pale) 221.7px,rgba(232,243,254,0) 301.5px)"></div>'
        '<div style="position:absolute;left:-46.8px;top:-601.6px;width:398.4px;height:719.2px;'
        'border-radius:50%;transform:rotate(17.9deg);filter:blur(2.7px);'
        'border:12.7px solid rgba(10,132,255,.18)"></div>')


def s14():
    inv = "var(--x-ink-inv)"
    sheet = ("border-radius:var(--x-r-sheet-pro);background:var(--x-glass-sheet);"
             "backdrop-filter:blur(var(--x-sheet-blur));-webkit-backdrop-filter:blur(var(--x-sheet-blur));"
             "box-shadow:0 0 0 .67px var(--x-sheet-line),0 0 24px rgba(0,0,0,.15),"
             "inset 0 1px 0 #FFF,inset 0 -1px 0 #FFF,inset 0 4px 4px -2px rgba(255,255,255,.5)")
    # The body copy is iOS's plus-darker grey: each ink pixel is the ground under it
    # plus the grey minus white, so the lines over the blurred Got it pill go near
    # black. The ground is the capture's, every 2pt from y 704 (README); CSS has no
    # plus-darker outside WebKit, so each line is filled with that ramp instead.
    ground = (228, 227, 227, 226, 225, 223, 222, 220, 217, 214, 208, 202, 195, 186, 179, 174,
              169, 164, 160, 157, 154, 152, 150, 148, 146, 146, 146, 146, 147, 147, 148, 151)
    grey = int(next(v for _, n, v, _ in TOKENS if n == "sheet-copy")[1:3], 16)
    copy = ""
    for top, line in ((708.3, "AI teammates you can give real work to. Bots can"),
                      (728.3, "sign in to your tools, use them just like you do,"),
                      (748.3, "and come back with finished work.")):
        b = boxtop(top, "t-sheet-copy")
        ramp = ",".join("#%02X%02X%02X %.2fpx" % ((max(0, g + grey - 255),) * 3 + (704 + 2 * i - b,))
                        for i, g in enumerate(ground))
        copy += txb(27.7, top, line, "t-sheet-copy",
                    extra=";background:linear-gradient(%s);-webkit-background-clip:text;"
                          "background-clip:text;-webkit-text-fill-color:transparent" % ramp)
    return screen("Introducing Grok Bot",
        box(8.0, 445.3, 386.0, 420.7, sheet)
        + box(172.3, 451.3, 57.3, 3.7, "border-radius:2px;background:var(--x-grabber-pro)")
        + box(23.3, 460.7, 355.3, 200.0, CARD_CSS, inner=WASH, attrs=" data-clip-ok")
        + art("14-ic-bot") + art("14-badge")
        + txb(155.3, 547.3, "Grok Bot", "t-card", inv)
        + txb(27.7, 679.7, "Introducing Grok Bot", "t-sheet-h")
        + copy
        + box(27.3, 786.0, 347.3, 47.3, "border-radius:var(--x-r-pill);background:var(--x-btn)")
        + txcb(804.0, "Upgrade to Access", "t-btn", inv, 27.3, 347.3),
        bg="var(--x-page)", big=True,
        under=terms(GOT_IT) + box(0, 0, 402, 874, "background:var(--x-scrim-sheet)"))


# -------------------------------------------------------------------- 15 ----
# The App Store product sheet for Grok Bot over the dimmed store: two glyph
# discs, the app icon (a crop), title, subtitle, the cloud, the four-column
# facts strip between two rules, the bundle row with its Purchased pill,
# What's New with the version line and three release notes, and the two
# preview cards (crops) running off the bottom.
def s15():
    mute, val = "var(--x-store-mute)", "var(--x-store-val)"
    disc = "background:var(--x-store-disc);box-shadow:inset 0 0 0 .67px #D7D7D7"
    rule = "background:var(--x-store-rule)"
    clip = ' data-clip-ok'
    cols = (68.3, 177.2, 282.2, 387.2)
    return screen("App Store, Grok Bot",
        box(0, 62.0, 402, 812, "border-radius:var(--x-r-store) var(--x-r-store) 0 0;"
            "background:var(--x-card);box-shadow:0 -2px 16px rgba(0,0,0,.12)")
        + circle(15.3, 77.3, 45.4, disc) + art("15-ic-close")
        + circle(341.3, 77.3, 45.4, disc) + art("15-ic-share")
        + art("15-icon")
        + txb(155.0, 146.7, "Grok Bot", "t-store-title")
        + txb(154.7, 173.7, "AI agents that do real work", "t-store-sub", mute)
        + art("15-ic-cloud")
        + box(20, 278.67, 382, 1, rule) + box(20, 366.67, 382, 1, rule)
        + "".join(box(x, 305.7, 1, 34, rule) for x in (124.67, 229.67, 334.67))
        + "".join(txcb(295.0, t, "t-store-label", "var(--x-store-label)", cx - 70, 140,
                       extra=";letter-spacing:.1px", **({"attrs": clip} if cx > 350 else {}))
                  for cx, t in zip(cols, ("3.3K RATINGS", "AGE RATING", "CHART", "DEVELOPER")))
        + "".join(txcb(318.7, t, "t-store-val", val, cx - 40, 80)
                  for cx, t in zip(cols, ("4.9", "18+", "#19")))
        + art("15-ic-dev") + art("15-stars")
        + txcb(344.7, "Years", "t-store-small", val, cols[1] - 40, 80)
        + txcb(344.7, "Productivity", "t-store-small", val, cols[2] - 40, 80)
        + txb(366.7, 344.7, "X Corp", "t-store-small", val, attrs=clip)
        + txb(20.7, 392.3, "Also Included In", "t-store-h")
        + art("15-bundle")
        + txb(92.3, 432.0, "Apps by SpaceXAI: AI,", "t-store-bundle")
        + txb(92.3, 451.0, "news, videos, social me&hellip;", "t-store-bundle")
        + txb(92.3, 471.7, "News", "t-store-small", mute)
        + box(289.0, 440.0, 93.0, 32.0, "border-radius:var(--x-r-pill);background:var(--x-store-pill)")
        + txb(302.3, 451.7, "Purchased", "t-store-btn", "var(--x-store-pill-ink)")
        + txb(20.7, 533.3, "What&rsquo;s New", "t-store-h") + art("15-ic-chevron")
        + txb(20.7, 569.3, "Version 1.8.0", "t-store-body", mute)
        + txb(281.3, 569.3, "1d ago", "t-store-body", mute, w=100, extra=";text-align:right")
        + txb(21.0, 598.3, "- Added select-and-copy on message text", "t-store-body")
        + txb(21.0, 617.3, "- Added a confirm step when sharing a bot as a", "t-store-body")
        + txb(21.0, 636.3, "template", "t-store-body")
        + txb(281.3, 636.3, "more", "t-store-body", "var(--x-store-link)", w=100, extra=";text-align:right")
        + txb(21.3, 694.0, "Preview", "t-store-h")
        + art("15-preview-1") + art("15-preview-2"),
        bg="var(--x-store-dim)", big=True)


# -------------------------------------------------------------- 08, 09 ----
# The voice picker: a card on the dimmed home, its bottom corners and shadow
# cropped (08-band / 09-band, the dots and the hint or pill patched out and
# drawn again), everything above y700 CSS around the orb and the ghost line.
def voice(stem, orb, ghost, band, name, sub, foot):
    return screen("Voice selection, " + name,
        circle(17.8, 63.1, 43.5, "background:var(--x-nav-well)")
        + box(130.3, 69.4, 50.7, 30.4, "border-radius:var(--x-r-pill);background:var(--x-nav-well)")
        + circle(335.4, 64.0, 43.0, "background:var(--x-nav-well)")
        + art("08-ic-menu") + art("08-ic-compose")
        + tx(142.0, 78.9, "Ask", "t-nav") + tx(194.0, 78.9, "Imagine", "t-nav")
        + box(8.0, 403.6, 377.4, 440.9,
              "border-radius:var(--x-r-voice);background:var(--x-voice-sheet);"
              "box-shadow:inset 0 0 0 1px var(--x-card),0 4px 16px var(--x-voice-shadow)")
        + txc(434.8, "Voice Selection", "t-voice")
        + art(orb) + txc(607.5, name, "t-voice") + txc(631.3, sub, "t-voice-sub", "var(--x-voice-sub)")
        + art(ghost) + art(band)
        + "".join(circle(cx - 3.15, 707.1, 6.3, "background:var(--x-%s)"
                         % ("ink" if k == (0 if stem == "08" else 1) else "dot-off"))
                  for k, cx in enumerate((176.7, 190.1, 203.65, 217.05)))
        + foot,
        bg="var(--x-dim)")


def s08():
    return voice("08", "08-orb", "08-ghost", "08-band", "Ara", "Upbeat Female",
                 txc(766.3, "Swipe to explore more voices", "t-hint", "var(--x-voice-sub)"))


def s09():
    return voice("09", "09-orb", "09-ghost", "09-band", "Eve", "Soothing Female",
                 box(46.5, 746.1, 300.7, 50.4, "border-radius:var(--x-r-pill);background:var(--x-voice-btn)")
                 + txc(765.1, "Continue", "t-voice", "var(--x-ink-inv)", x=46.5, w=300.7))


# ---------------------------------------------------------- 10, 11, 12 ----
# The settings sheet, three scroll states of one list. Cards are CSS at
# their measured tops; rows are 52 (row-s); every glyph is a crop at its own
# box; the header band (material, close disc, the fade under it) is a crop
# with its title patched out. A row's label None means the crop above
# carries that row (12's first row sits under the header).
def group(top, items, label=None, label_top=None):
    n = len(items)
    out = box(16.1, top, 361.3, 52.0 * n, "border-radius:var(--x-r-group);background:var(--x-card)")
    if label:
        out += tx(32.5, label_top if label_top else top - 24.85, label, "t-section", "var(--x-section-ink)")
    for k, (text, ic, trail, col) in enumerate(items):
        y = top + 52.0 * k
        if k:
            out += box(64.3, y - 1.1, 296.4, 0.9, "background:var(--x-card-line)")
        if text is None:
            continue
        out += tx(64.3, y + 19.9, text, "t-body", col) + art(ic)
        if trail == "chev":
            out += art("10-ic-chevron", top=y + 18.9)
        elif trail == "toggle":
            out += box(300.3, y + 12.0, 62.4, 27.7, "border-radius:var(--x-r-pill);background:var(--x-toggle-off)") \
                 + box(302.0, y + 14.3, 37.1, 23.6, "border-radius:var(--x-r-pill);background:var(--x-card)")
        elif trail:
            out += tx(200.0, y + 19.9, trail, "t-body", "var(--x-sec-ink)", w=138.9, extra=";text-align:right") \
                 + art("10-ic-chevron", top=y + 18.9)
    return out


def settings(title, inner, hdr, after=""):
    """after: what sits over the header crop, a label it patched out."""
    return screen(title,
        box(0, 58.7, 393, 852 - 58.7, "border-radius:var(--x-r-modal) var(--x-r-modal) 0 0;background:var(--x-sheet)")
        + inner + art(hdr) + txc(91.5, "Settings", "t-h") + after,
        bg="var(--x-dim)")


def s10():
    sec = "var(--x-sec-ink)"
    return settings("Settings",
        box(16.1, 164.3, 361.3, 92.3, "border-radius:var(--x-r-group);background:var(--x-card)")
        + circle(32.1, 180.2, 60.0, "background:var(--x-avatar)") + art("10-ic-person")
        + tx(104.5, 183.0, "Alex Smith", "t-h")
        + tx(104.5, 204.8, "alexsmith.mobbin+1@gmail.-", "t-mail", sec)
        + tx(104.5, 226.2, "com", "t-mail", sec)
        + art("10-ic-chevron", top=203.3)
        + group(323.1, [("Appearance", "10-ic-appearance", "chev", None),
                        ("Customize Grok", "10-ic-customize", "chev", None),
                        ("Haptics", "10-ic-haptics", "chev", None),
                        ("Widget", "10-ic-widget", "chev", None),
                        ("App Language", "10-ic-language", "English", None)], "General")
        + group(618.0, [("Kids Mode", "10-ic-kids", "chev", None),
                        ("NSFW Preferences", "10-ic-nsfw", "chev", None)])
        + group(777.7, [("Companions", "10-ic-companions", "chev", None),
                        ("Dictation", "10-ic-dictation", "chev", None)], "Voice"),
        "10-hdr")


def s11():
    return settings("Settings, Voice",
        group(167.0, [("Companions", "11-ic-companions", "chev", None),
                      ("Dictation", "11-ic-dictation", "chev", None),
                      ("Open App in Voice Mode", "11-ic-voicemode", "toggle", None)])
        + group(378.4, [("Shared Conversations", "11-ic-shared", "chev", None),
                        ("Data Controls", "11-ic-data", "chev", None),
                        ("Recently Deleted", "11-ic-deleted", "chev", None)], "Data &amp; Information")
        + group(569.3, [("Terms of Use", "11-ic-terms", "chev", None),
                        ("Privacy Policy", "11-ic-privacy", "chev", None)])
        + group(708.1, [("Report a Problem", "11-ic-report", "chev", None)])
        + group(816.0, [("SuperGrok", "11-ic-supergrok", "chev", None)], "Subscription"),
        "11-hdr", tx(32.5, 142.4, "Voice", "t-section", "var(--x-section-ink)"))


def s12():
    return settings("Settings, bottom",
        group(107.8, [(None, None, None, None),
                      ("Data Controls", "12-ic-data", "chev", None),
                      ("Recently Deleted", "12-ic-deleted", "chev", None)])
        + group(299.0, [("Terms of Use", "12-ic-terms", "chev", None),
                        ("Privacy Policy", "12-ic-privacy", "chev", None)])
        + group(437.7, [("Report a Problem", "12-ic-report", "chev", None)])
        + group(545.7, [("SuperGrok", "12-ic-supergrok", "chev", None)], "Subscription")
        + group(632.2, [("Sign Out", "12-ic-signout", None, "var(--x-danger)")])
        + art("12-xai")
        + txc(772.5, "VERSION 1.3.42 (BUILD 2776)", "t-version", "var(--x-version-ink)"),
        "12-hdr")


SCREENS = [
    ("01-widget", "Home Screen widget", s01),
    ("02-widget-guide-add", "Widget guide, step 4", s02),
    ("03-widget-guide-jiggle", "Widget guide, step 1", s03),
    ("04-voice-settings", "Voice settings", s04),
    ("05-supergrok", "SuperGrok paywall", s05),
    ("06-terms-update", "Terms update", s06),
    ("13-terms-loading", "Terms update, signing out", s13),
    ("14-grok-bot-sheet", "Introducing Grok Bot", s14),
    ("15-app-store", "App Store, Grok Bot", s15),
    ("07-home", "SuperGrok home", s07),
    ("08-voice-select-ara", "Voice selection, Ara", s08),
    ("09-voice-select-eve", "Voice selection, Eve", s09),
    ("10-settings", "Settings", s10),
    ("11-settings-voice", "Settings, scrolled to Voice", s11),
    ("12-settings-bottom", "Settings, bottom", s12),
]


# ------------------------------------------------------ tokens + evidence ----
SHEET = """body{padding:0;background:#FFF;color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:14px 20px 8px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 10.5px/13.5px var(--x-font);color:var(--x-foot);margin-bottom:4px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-foot);margin:5px 0 3px}
.grid{column-count:2;column-gap:12px}
.sw{display:flex;align-items:center;gap:5px;height:10.2px;break-inside:avoid;white-space:nowrap}
.sw .chip{width:16px;height:9px;flex:none;border-radius:3px;border:1px solid var(--x-well);background-color:#888}
.sw b{font:600 7.5px/10.5px ui-monospace,Menlo,monospace}
.sw i{font:400 7.5px/10.5px ui-monospace,Menlo,monospace;color:var(--x-foot);font-style:normal}
.foot{display:flex;gap:28px;align-items:flex-start;margin-top:4px}
.foot h2{margin-top:0}
.rad{display:flex;gap:6px;flex-wrap:wrap;width:250px}
.rb{width:36px;height:22px;background:var(--x-sheet);border:1px solid var(--x-well)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-foot);font-style:normal;text-align:center}
.ty{column-count:3;column-gap:12px}
.tr{break-inside:avoid;border-bottom:1px solid var(--x-well)}
.tr span{display:block;white-space:nowrap;overflow:hidden;line-height:1}
.tr em{display:block;font:400 7px/9px ui-monospace,Menlo,monospace;
  color:var(--x-foot);font-style:normal;white-space:nowrap}
.met{font:400 8px/9.5px ui-monospace,Menlo,monospace;color:var(--x-ink);white-space:nowrap}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-well);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:#0A60FF}
td.v{color:var(--x-ink);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-foot)}"""


def _of(group):
    return [x for x in TOKENS if x[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Ten Mobbin captures at 2.2417 px per pt, five native 1206 &times; '
                '2622 captures at 3 px per pt. One face (SF Pro), one type ladder, '
                'surfaces from white and light grey to black and a blurred photograph. '
                'Translucent surfaces are materials, not fills: the ground under them '
                'is not flat.</p>'
                '</header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2>'
                '<div class="rad">%s</div></div>'
                '<div><h2>Metrics</h2><div class="met">%s</div></div></div></div>'
                % (NAME, swatches, radii, met), SHEET)


def type_board():
    # the type ladder outgrew the token board at 46 rows, so it has its own
    rows = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Grok</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    return page(NAME + " - Type Tokens",
                '<div class="sheet"><header><h1>%s type</h1>'
                '<p>Every size is fitted to a measured width on the board, so several '
                'are off the iOS ladder. The evidence rows carry the widths.</p>'
                '</header><div class="ty">%s</div></div>' % (NAME, rows), SHEET)


EV_LINES = 56     # a page of 60 estimated lines fits the board, 62 does not


def evidence_boards():
    # a row wraps its evidence at about 62 characters, so a page breaks by
    # lines rather than by rows: 22 rows ran from 52 lines to 73
    pages, page_, lines = [], [], 0
    for row in TOKENS:
        n = -(-len(row[3]) // 62)
        if page_ and lines + n > EV_LINES:
            pages.append(page_)
            page_, lines = [], 0
        page_.append(row)
        lines += n
    pages.append(page_)
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--x-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield ("00%s-evidence" % "bcdefghijk"[i],
               page(NAME + " - Evidence" + of,
                    '<div class="sheet"><header><h1>Evidence%s</h1>'
                    '<p>One row per token. A token with no evidence is a guess.</p>'
                    '</header><table class="ev">%s</table></div>' % (of, rows), SHEET))


# ----------------------------------------------------------- references ----
REF_CSS = """body{padding:24px}
.phone img{position:absolute;left:0;top:0;width:100%;height:100%;display:block}"""


def ref_boards():
    for stem, label, _ in SCREENS:
        ref = "cp%d" % int(stem[:2])          # the capture of this board, not of its place in the row
        f = REFS_DIR / (ref + ".png")
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        big = ' style="width:var(--x-w-pro);height:var(--x-h-pro)"' if ref in BIG else ""
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone"%s><img src="%s" alt="%s"></div>' % (big, uri, label),
                    REF_CSS))


# ----------------------------------------------------------------- main ----
def layout(names):
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"},
                       {"file": "00a-type-tokens", "label": "Type tokens"}]
                      + [{"file": n, "label": "Evidence"}
                         for n, _ in evidence_boards()]},
            {"title": "Screens", "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _ in SCREENS]}]
    refs = [{"file": "ref-" + s, "label": l}
            for s, l, _ in SCREENS if "ref-" + s in names]
    if refs:
        rows.append({"title": "Source of truth: the captures",
                     "numbered": True, "files": refs})
    return {"name": PAGE_NAME, "cover": "05-supergrok", "rows": rows}


def main():
    cut()
    files = dict([("00-design-tokens", token_board()), ("00a-type-tokens", type_board())]
                 + list(evidence_boards())
                 + [(s, fn()) for s, _, fn in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    (OUT / "layout.json").write_text(json.dumps(layout(files), indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(layout(files)["rows"])))


if __name__ == "__main__":
    main()
