"""Grok for iOS -- nine screens, the tokens behind them, and the captures.

Regenerates the whole folder in place, byte-identically, from anywhere:

    python3 mockups/canvases/grok-ios/gen.py
    refkit tokens mockups/canvases/grok-ios

Every colour and every metric in here was read off five Mobbin captures at
2.2417 capture px per design pt (881 px across a 393 pt screen, 1910 down an
852 pt one) and four native captures at exactly 3 px per pt (1290 x 2796, a
430 x 932 pt Pro Max screen), and every one of them is stated with its
evidence on the 00b-00f boards. Nothing was eyeballed. The artboards are output: never hand-edit an
.html, edit this file and re-run.

Four decisions the captures force.

TWO DEVICES. 01-05 are 393 x 852 boards like every other folder here; 06-09
were captured on a 430 x 932 device and are drawn at that size, which fills
the 478 x 980 artboard exactly with the 24px padding (the bezel rings fit, the
drop shadow is clipped). Their status bar and Dynamic Island are this repo's
template frame, not the captures' (the captures show 20:52, a muted bell and a
live-activity glyph in the island; none of that is the app), and they carry no
home indicator because the captures show none. 08 and 09 are full-frame crops
with the capture's own status bar patched out under the template's.

THE FACE IS SF PRO, AND IT IS THE PLATFORM'S. `refkit font` returns a weak
call for SF Pro on every title measured, so the boards set in the platform
stack with no stand-in corrections: FACE_DROP and XOFF are both 0 here, and
the line-box model below is the platform face's own.

TWO SCREENS ARE MOSTLY PHOTOGRAPH. 04 is a voice-settings sheet over a 3D
companion scene, and the sheet is a dark blur of that scene rather than a
fill; 05's paywall sits on a smoke-and-particles hero that reaches faintly
down the whole screen and shows through its translucent feature card. Both
grounds are cut from the captures (crops.json) after every piece of chrome
and type on them is patched out (INPAINT below, a Coons fill from each box's
own four edges), so the pixels are the capture's and the chrome on top is CSS.
05's card is not patched: its 6.7% white material is un-applied inside the
card box and re-applied by the CSS card, which is exact by construction.

EVERY ICON IS A CROP, NOT A DRAWING. Thirty-one glyphs on these screens are SF
Symbols or the Grok mark, and a hand-drawn approximation of an SF Symbol is
visibly not the symbol at any zoom. Each one is cut from its capture at its
measured ink box plus a point of ground (crops.json, the `-ic-` ids) and put
back at the same numbers, so it is the capture's own pixels and scores zero
by construction. There is no assets/icons/ here for that reason.

Three defects belong to the source, not to the replica: Mobbin composites the
Dynamic Island out (except on 04, where the app's own recording dot keeps it),
drops the home indicator, and exports with square corners. All three are drawn
here. The diff window is trimmed accordingly -- see README.md.
"""
import base64, json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}
SCALE = 2.2417                                    # capture px per design pt
BIG = {"cp6", "cp7", "cp8", "cp9", "i8", "i9"}     # the 430 x 932 captures


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
  "01 widget body, col x68 y 80.7-94.5; 02 card interior, row y300 x 60-340"),
 ("Surface", "well",     "#E5E5E5",
  "01 pill and both circles: row y125 x 39-172 and row y196 x 39-100 flat "
  "#E5E5E5"),
 ("Surface", "dim",      "#CBCBCB",
  "02/03 the band above the sheet, y 0-58.9 flat #CBCBCB: the dimmed parent"),
 ("Surface", "sheet",    "#F6F6F6",
  "02/03 col x100 from 59.0 down and row y700 outside the card: #F6F6F6"),
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
 ("Surface", "rec",      "#F09540",
  "04 the recording dot inside the island, x 215.0-220.8 y 26.8-32.6: "
  "#F09540 #F29442 #F09444"),
 ("Surface", "page",     "#FFFFFF",
  "06 flat census x 20-410 y 560-760, 07 x 20-410 y 150-360, 09 x 20-410 y "
  "400-440: #FFFFFF on 100% of the flats"),
 ("Surface", "chip",     "#F5F5F5",
  "07 suggestion chips, row y 735 x 15-55 and row y 770 x 165-295: #F5F5F5"),
 ("Surface", "composer", "#FBFBFB",
  "07 composer interior census x 40-280 y 825-845: #FBFBFB"),
 ("Surface", "ctl",      "#F1F1F1",
  "07 the + disc (centre 37.2, 863.9), the Auto pill x 59.7-134.3 and the "
  "mic disc x 283-315.7: cores #F1F1F1"),
 ("Surface", "btn",      "#000000",
  "06 Got it pill y 787.7-841.7, 07 Speak pill and tooltip, 08 Try it now: "
  "#000000 on every flat"),

 ("Line", "material-line", "rgba(255,255,255,.16)",
  "05 card edge peaks #3B3B3B over one 0.9pt band at y 522.8-523.6 and "
  "#5C5A5D at 198.9-199.8 with smoke behind; .16 over #131313 is #393939"),
 ("Line", "price-line",  "#252525",
  "05 col x100 618.4-619.3 #252525 and 713.8-714.7 #222222: the plan group's "
  "1pt edge"),
 ("Line", "plan-line",   "rgba(255,255,255,.17)",
  "05 Yearly card edge peaks #505052 (row 623.5), #565658 (625), #535557 "
  "(row 660 right); .17 over the ramp's #333536 top is #565758"),
 ("Line", "composer-shadow", "rgba(0,0,0,.12)",
  "07 the halo round the composer: 13.3 levels at the side edges (x 10 and "
  "419, row 840), 8.7 at the top edge and 18 under the bottom, fading to the "
  "page over 36pt below (y 891-927) and 8 to the sides; one box-shadow, "
  "swept dy 6-12 / blur 32-52 / alpha .09-.14 over the band y 720-932: "
  "flat minimum 2.27-2.33 at 6-8px / 36px / .11-.12, 8px 36px .12 kept "
  "because it also matches the side-edge reading; .14 costs .1-.2 "
  "everywhere, blur 52 costs .15"),
 ("Line", "composer-line", "#FFFFFF",
  "07 col x 200 at y 793.3-794.3 reads #FFFFFF, one pt over the #FBFBFB "
  "card interior and above the #F8F8F8 halo outside it: a 1pt white edge"),

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
  "06 body ink core on the grey-only windows, x 35-150 of line 1 and x "
  "160-395 of line 2: #7F7F7F on both; a window that takes in the black "
  "'Terms of Service' span reads #777777, the span's pixels, not the grey"),
 ("Ink", "placeholder", "#7D7D7D",
  "07 'Ask Anything' ink core x 27-127 y 811-828"),
 ("Ink", "field-ink",   "#6A6A6B",
  "09 'Type to make video' ink core x 29-171 y 527-544"),
 ("Ink", "card-ink",    "#262627",
  "08 card title ink core x 90-340 y 578-628"),
 ("Ink", "para-ink",    "#53584E",
  "08 body ink core x 26-362 y 759-821: a green-grey, not the page grey"),
 ("Ink", "dim-inv",     "#CCCCCC",
  "08 'Continue' label under the sheet's scrim: white at .8, which is what "
  "the page ground reads there (#CCCCCC against #FFFFFF on 09); 07's "
  "watermark mark is the same value"),
 ("Ink", "new-ink",     "#FB630A",
  "08 NEW ink core x 43-72 y 687-697, an R-B > 90 mask against the #8B6D5A "
  "badge"),

 ("Radius", "r-phone",  "52px",  "iPhone 14 Pro/15/16 display corner, this repo's stand-in"),
 ("Radius", "r-widget", "27px",
  "01 widget corner insets 21.3/12.4/8.4/2.1 at 0.7/3.7/6.7/15.7 down: r 27"),
 ("Radius", "r-card",   "26px",
  "02 card corner insets 16.2/12.2/8.6/5.1/2.4 at 2/4/7/11/16 down: r 26"),
 ("Radius", "r-sheet",  "30px",
  "02 sheet corner insets 20.5/13.8/8.5/4.5 at 2.1/5.1/9.1/14.1 down: r 30"),
 ("Radius", "r-sheet-v", "35px",
  "04 sheet corner insets 20.9/15.1/10.2/6.2/2.7 at 3.4/6.4/10.4/15.4/21.4 "
  "down from 403.6, left edge 8.5: r 35"),
 ("Radius", "r-feat",   "32px",
  "05 feature card insets 14.9/10.5/6.9/3.8/1.7 at 5/8/12/17/23 down: r 32"),
 ("Radius", "r-price",  "18px",
  "05 plan group insets 10.9/7.3/4.2/1.7 at 1.6/3.6/6.6/10.6 down: r 18"),
 ("Radius", "r-plan",   "15px",
  "05 Yearly card insets 7.3/4.5/2.2/0.8 at 2.4/4.4/7.4/11.4 down: r 15"),
 ("Radius", "r-chip",   "24px",
  "07 chip corner insets 17.3/14.0/12.0/9.0/6.0/3.0/1.0 at 1/2/3/5/8/12/17 "
  "down from 727.3, left edge 11: r 24 on a 51.7 tall chip"),
 ("Radius", "r-composer", "20px",
  "07 composer corner insets 16.7/13.0/10.3/7.0/2.7 at 1/2/3/5/8 down from "
  "793.3, left edge 12.3: r 20"),
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
 ("Type", "t-title",  "600 22px/28px var(--x-font)",
  "06 'Updates to our Terms of Service and' 358.3 x 20.3 on a 28 pitch; 22px "
  "semibold sets 359.3 x 20.3"),
 ("Type", "t-copy",   "400 15px/20px var(--x-font)",
  "06 body line 1 359.3 x 13.7 on a 20 pitch; 15px sets 359.3 x 13.7"),
 ("Type", "t-link",   "400 17.5px/22px var(--x-font)",
  "06 'Sign out' 64.7 wide; 17px sets 63.0, 17.5px 64.9"),
 ("Type", "t-hdr",    "500 22px/28px var(--x-font)",
  "07-09 'SuperGrok' 104.0 x 20 (x 57-161, boxed clear of the mark's tail); "
  "22px medium sets 100.3 on the board and 103.9 with .45px tracking"),
 ("Type", "t-chip",   "500 15px/20px var(--x-font)",
  "07 'Create Bot' and 'Try Finance' at 15px medium to the tenth; 09 'Video' "
  "39.3 x 11.3 the same"),
 ("Type", "t-ctl",    "400 14px/18px var(--x-font)",
  "07 'Auto' in the model pill: 14px regular to the tenth"),
 ("Type", "t-speak",  "600 14.5px/18px var(--x-font)",
  "07 'Speak' 42.3 x 13.7 (bright threshold 160 keeps the pill edge out); "
  "15px semibold sets 43.7, 14.5px 42.3"),
 ("Type", "t-btn",    "600 16.5px/22px var(--x-font)",
  "08/09 'Continue' 69.0 wide and 08 'Try it now' 75.3; 17px semibold sets "
  "71.0 and 76.7, 16.5px 69.0 and 74.5"),
 ("Type", "t-card",   "400 22px/25px var(--x-font)",
  "08 'Add precise start and end' 241.7 x 19.7, 24.7 to the second line; "
  "22px regular"),
 ("Type", "t-h3",     "600 18.9px/24px var(--x-font)",
  "08 'Shape your scene, start to finish' 281.0 x 18.0; 19px semibold sets "
  "282.7 on the board, 18.9px 281.2"),
 ("Type", "t-para",   "400 16.15px/21px var(--x-font)",
  "08 'Choose your first and last frames, or create' 314.0 wide and "
  "'seamless loops. Every video now follows your' 330.7, on a 21.2 pitch; "
  "16px sets 311.3 and 327.7, .9% narrow on both, 16.15px closes it"),
 ("Type", "t-field",  "400 16.3px/22px var(--x-font)",
  "09 'Type to make video' 142.3 wide (x 29-171.3); 17px sets 146.7, 16.5px "
  "on the board 144.0, 16.3px 142.3"),
 ("Type", "t-opt",    "400 16px/20px var(--x-font)",
  "09 '720p' 35.7, '6s' 16.3, 'Auto' 32.0 wide; 16px sets 36.0, 16.7, 32.7"),
 ("Type", "t-key",    "400 22px/28px var(--x-font)",
  "09 'W' 18 x 16 on key rows 56 apart; 22px regular sets 19 x 15.7"),
 ("Type", "t-key-sm", "400 18px/22px var(--x-font)",
  "09 '123' 27.0 x 13.3 at 18px regular to the tenth; the '@' key is 17 x 17.7, "
  "which is the 22px t-key, and '#' 10.3 x 10.3 is a lighter glyph than either "
  "size of the face draws"),
 ("Type", "t-new",    "500 13px/16px var(--x-font)",
  "08 'NEW' 28.0 x 9.3; 13px medium sets 28.3 x 9.3"),

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
 ("Metrics", "w-max",     "430px",
  "iPhone Pro Max logical width: cp6-cp9 are 1290 x 2796 at 3 px/pt"),
 ("Metrics", "h-max",     "932px",  "iPhone Pro Max logical height"),
 ("Metrics", "status-max", "59px",
  "iOS status bar on the 430pt devices: clock ink 22.7-36, island 11.3-48; "
  "the height the template bar covers on 06-09"),
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
# 09's key caps: ink top of each row and the centre of each letter.
KEYS = [
    (652.3, "QWERTYUIOP", (24.9, 67.0, 109.4, 151.4, 194.4, 236.2, 278.2, 321.2, 363.2, 405.7)),
    (708.3, "ASDFGHJKL", (46.2, 88.2, 130.3, 173.7, 214.9, 257.0, 298.5, 342.5, 384.7)),
    (764.3, "ZXCVBNM", (88.0, 130.0, 173.2, 214.9, 257.5, 298.9, 342.0)),
]

INPAINT = {
 "i8": ("cp8", [
    (34, 20, 86, 38), (87, 20.5, 104.5, 38),    # status bar clock and bell
    (128, 10, 319, 49), (312, 19.5, 403, 38),  # Dynamic Island, right cluster
    (51.5, 72.5, 163, 97.5),                   # SuperGrok
    (131, 223, 299, 244),                      # Animate your photos
    (178.5, 269.5, 252, 287),                  # Continue
    (7, 339, 168, 359.5),                      # Featured Templates
    (91, 578.5, 339, 603.5), (116, 603.5, 314, 628.5),   # card title
    (42.5, 686.5, 73, 698.5),                  # NEW
    (26.5, 728.5, 312, 751),                   # Shape your scene
    (26.5, 759, 345, 778.5), (26.5, 780.5, 361.5, 800), (26.5, 801.5, 215, 821),
    (175.5, 858, 255.5, 878.5),                # Try it now
 ]),
 "i9": ("cp9", [
    (34, 20, 86, 38), (87, 20.5, 104.5, 38),    # status bar clock and bell
    (128, 10, 319, 49), (312, 19.5, 403, 38),  # Dynamic Island, right cluster
    (51.5, 72.5, 163, 97.5),                   # SuperGrok
    (131, 223, 299, 244),                      # Animate your photos
    (178.5, 269.5, 252, 287),                  # Continue
    (7, 339, 168, 359.5),                      # Featured Templates
    (22.5, 466.5, 59.5, 484), (84.5, 466.5, 124, 484), (146, 466.5, 194, 484),
    (232, 466.5, 252, 482), (306.5, 467, 342, 482), (392.5, 466.5, 414, 482),
    (29.5, 524, 174, 549),                     # placeholder; the caret stays
    (147.5, 570, 190.5, 585.5),                # Video
    (15, 820, 46, 837.5), (337, 818, 358, 839.5), (393.5, 821, 407.5, 835.5),
 ] + [(cx - 11, top - 2, cx + 11, top + 20)
      for top, row, cs in KEYS for cx in cs]),
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
    """A capture as an RGB image, patched first if crops.json asks for i4/i5/i8/i9."""
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
        _source(ref, cache).crop(box).save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def art(cid, style="", z=None):
    """One <img>, at the box it was measured from."""
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx%s%s">'
            % (_uri(cid), x0, y0, x1 - x0, y1 - y0,
               ";z-index:%d" % z if z else "", ";" + style if style else ""))


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
    centring box by the same) for the 430pt boards."""
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
      "t-price": (20, 26), "t-free": (12.5, 14), "t-title": (22, 28), "t-copy": (15, 20),
      "t-link": (17.5, 22), "t-hdr": (22, 28), "t-chip": (15, 20), "t-ctl": (14, 18),
      "t-speak": (14.5, 18), "t-btn": (16.5, 22), "t-card": (22, 25), "t-h3": (18.9, 24),
      "t-para": (16.15, 21), "t-field": (16.3, 22), "t-opt": (16, 20), "t-key": (22, 28),
      "t-key-sm": (18, 22), "t-new": (13, 16)}


def boxtop(ink_top, tk):
    size, lh = TY[tk]
    return ink_top - (lh / 2 - 0.3455 * size)


def tx(x, ink_top, s, tk="t-body", col=None, w=None, extra=""):
    """One run of type, positioned by the top of its ink."""
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;font:var(--x-%s)%s%s%s">%s</div>'
            % (x, boxtop(ink_top, tk), tk,
               ";color:%s" % col if col else "",
               ";width:%.1fpx" % w if w else "", extra, s))


def txc(ink_top, s, tk="t-body", col=None, x=0.0, w=393.0, extra=""):
    """Centred type. The width is the box it centres in, not the ink."""
    return tx(x, ink_top, s, tk, col, w, ";text-align:center" + extra)


def box(x, y, w, h, style="", cls="b", inner=""):
    return ('<div class="%s" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;'
            'height:%.1fpx;%s">%s</div>' % (cls, x, y, w, h, style, inner))


def circle(x, y, d, style=""):
    return box(x, y, d, d, "border-radius:50%;" + style)


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.t,.b,.a{position:absolute}
.a{display:block}
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
COMPOSER_SH = "0 8px 36px var(--x-composer-shadow)"


def screen(title, inner, sb="var(--x-ink)", hm="var(--x-ink)", bg=None, rec=False, big=False):
    """One phone artboard. No board background: the phone floats on the canvas.
    big: the 430 x 932 device, template status bar over the content, no home
    indicator (the captures show none)."""
    style = ("width:var(--x-w-max);height:var(--x-h-max);" if big else "") + \
            ("background:%s" % bg if bg else "")
    return page(NAME + " - " + title,
                '<div class="phone"%s>%s%s%s</div>'
                % (' style="%s"' % style if style else "",
                   statusbar(sb, rec=rec, dx=37 if big else 0), inner,
                   "" if big else home(hm)),
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
def guide(n, title, l1, l2, active):
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
        + art("%02d-illo" % n)
        + txc(548.6, l1, "t-body", x=16.1, w=360.7)
        + txc(570.5, l2, "t-body", x=16.1, w=360.7)
        + dots,
        bg="var(--x-dim)")


def s02():
    return guide(2, "Widget guide, step 4",
                 "Find Grok in the list, choose a widget size,",
                 "then tap Add Widget.", 3)


def s03():
    return guide(3, "Widget guide, step 1",
                 "From the Home Screen, touch and hold an",
                 "empty area until the apps jiggle.", 0)


# -------------------------------------------------------------------- 04 ----
# Voice settings over the companion scene. The photo and the sheet's blurred
# material are the capture's own pixels (04-bg, 04-sheet); the two row cards
# stay in the crop, being a few levels of material over a photo that has no
# flat ground to read them against. Everything with an edge is drawn.
def s04():
    inv = "var(--x-ink-inv)"
    side = ""
    for cy, name in ((139.9, "focus"), (192.9, "hanger"), (245.9, "trash")):
        side += circle(340.0, cy - 16, 32, "background:var(--x-glass)") + art("04-ic-" + name)
    return screen("Voice settings",
        art("04-bg")
        + circle(16.3, 63.4, 44, "background:var(--x-scrim-btn)") + art("04-ic-x")
        + circle(333.2, 63.4, 44, "background:var(--x-scrim-btn)") + art("04-ic-grid")
        + side + art("04-ic-chevron")
        + art("04-sheet", "border-radius:var(--x-r-sheet-v) var(--x-r-sheet-v) 0 0")
        + box(179.3, 408.6, 34.3, 4.9, "border-radius:var(--x-r-pill);background:var(--x-grabber)")
        + txc(434.9, "Voice Settings", "t-sheet", inv)
        + circle(327.5, 419.4, 42, "background:var(--x-scrim-btn)") + art("04-ic-close")
        + tx(34.8, 506.2, "Select Audio Device", "t-row", inv) + art("04-ic-airplay")
        + tx(34.7, 568.3, "Microphone Selection", "t-row", inv) + art("04-ic-person"),
        sb=inv, hm=inv, bg="#000", rec=True)


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
# 1.3 for a leading F) and 0.5pt above the line-box model above (.3-1.0 on
# twenty strings), so the 430pt boards place through these two.
BEAR, DROP = 0.7, 0.5


def txb(x, ink_top, s, tk="t-body", col=None, w=None, extra=""):
    return tx(x - BEAR, ink_top + DROP, s, tk, col, w, extra)


def txcb(ink_top, s, tk="t-body", col=None, x=0.0, w=430.0, extra=""):
    return txc(ink_top + DROP, s, tk, col, x, w, extra)


# -------------------------------------------------------------------- 06 ----
# The terms notice: a white page, the mark cut from the capture, two title
# lines on a 28 pitch, two body lines on 20 with the two policy names in
# black, a 54pt black pill and an underlined link.
def s06():
    mute = "var(--x-copy-mute)"
    return screen("Terms update",
        art("06-ic-mark")
        + txcb(412.7, "Updates to our Terms of Service and", "t-title")
        + txcb(440.7, "Acceptable Use Policy", "t-title")
        + txcb(481.7, 'We&rsquo;re updating our <span class="k">Terms of Service</span> and '
              '<span class="k">Acceptable', "t-copy", mute)
        + txcb(501.7, '<span class="k">Use Policy</span>. Now&rsquo;s a great chance to review them.',
              "t-copy", mute)
        + box(20.0, 787.7, 390.0, 54.0, "border-radius:var(--x-r-pill);background:var(--x-btn)")
        + txcb(808.0, "Got it", "t-h", "var(--x-ink-inv)", 20.0, 390.0)
        + txcb(861.0, "Sign out", "t-link",
               extra=";text-decoration:underline;text-decoration-thickness:1.7px;text-underline-offset:1px"),
        bg="var(--x-page)", big=True)


# -------------------------------------------------------------------- 07 ----
# The SuperGrok home: header mark and wordmark, the grey watermark mark, three
# suggestion chips (the third runs off the screen; only 'Try C' is visible,
# and Gmail, GitHub and Notion in its icon trio make it Connectors), the
# composer card with a 1pt white edge over a soft halo, and the coach-mark
# tooltip with its tail over the Speak pill.
def s07():
    inv = "var(--x-ink-inv)"
    chip = "border-radius:var(--x-r-chip);background:var(--x-chip);" + CHIP_SH
    ctl = "background:var(--x-ctl)"
    return screen("SuperGrok home",
        art("07-ic-mark") + txb(53.3, 75.0, "SuperGrok", "t-hdr", extra=";letter-spacing:.45px")
        + art("07-ic-watermark")
        + box(11.0, 727.3, 139.0, 53.4, chip) + art("07-ic-bot") + txb(59.7, 750.0, "Create Bot", "t-chip")
        + box(158.0, 727.3, 145.3, 53.4, chip) + art("07-ic-bank") + txb(206.7, 749.3, "Try Finance", "t-chip")
        + box(311.3, 727.3, 118.7, 53.4, chip + ";border-radius:var(--x-r-chip) 0 0 var(--x-r-chip)")
        + art("07-ic-trio") + txb(392.0, 750.0, "Try C", "t-chip")
        + box(12.3, 793.3, 405.4, 96.7, "border-radius:var(--x-r-composer);background:var(--x-composer);"
              "box-shadow:0 0 0 1px var(--x-composer-line)," + COMPOSER_SH)
        + txb(27.7, 811.0, "Ask Anything", "t-body", "var(--x-placeholder)")
        + circle(20.9, 847.5, 32.7, ctl) + art("07-ic-plus")
        + box(59.7, 847.3, 74.6, 32.7, "border-radius:var(--x-r-pill);" + ctl)
        + art("07-ic-auto") + txb(93.0, 858.7, "Auto", "t-ctl")
        + circle(283.0, 847.3, 32.7, ctl) + art("07-ic-mic")
        + box(321.7, 847.3, 87.3, 32.7, "border-radius:var(--x-r-pill);background:var(--x-btn)")
        + art("07-ic-wave") + txb(356.7, 858.0, "Speak", "t-speak", inv)
        + box(215.3, 773.0, 193.7, 62.3, "border-radius:var(--x-r-tip);background:var(--x-btn)")
        + box(371.6, 835.3, 18.8, 9.4, "background:var(--x-btn);clip-path:polygon(0 0,100% 0,50% 100%)")
        + txb(230.0, 787.0, "Tap here to speak", "t-body", inv)
        + txb(230.0, 809.0, "with Grok", "t-body", inv)
        + art("07-ic-close"),
        bg="var(--x-page)", big=True)


# ----------------------------------------------------------------- 08-09 ----
# The video composer. Both are the capture with every string patched out
# (i8/i9): the hero photos, the tiles, the sheet, the card, the segmented
# control, the keys and the caret are its pixels, and the type is set again
# on top. 08 sits under a 20% black scrim, so its white label (Continue) is
# #CCCCCC and its black ones (the hero title, Featured Templates) still #000.
def video_top(label_ink):
    return (txb(53.3, 75.0, "SuperGrok", "t-hdr", extra=";letter-spacing:.45px")
            + txcb(225.3, "Animate your photos", "t-h")
            + txcb(271.7, "Continue", "t-btn", label_ink, 163.7, 102.7)
            + txb(8.7, 341.3, "Featured Templates", "t-h"))


def s08():
    para = "var(--x-para-ink)"
    return screen("Video sheet",
        art("08-bg") + video_top("var(--x-dim-inv)")
        + txcb(581.3, "Add precise start and end", "t-card", "var(--x-card-ink)", 23.3, 383.4)
        + txcb(606.0, "frames to your video", "t-card", "var(--x-card-ink)", 23.3, 383.4)
        + txcb(687.7, "NEW", "t-new", "var(--x-new-ink)", 31.0, 52.7)
        + txb(28.0, 730.7, "Shape your scene, start to finish", "t-h3")
        + txb(28.3, 761.3, "Choose your first and last frames, or create", "t-para", para)
        + txb(28.3, 782.7, "seamless loops. Every video now follows your", "t-para", para)
        + txb(28.3, 803.7, "instructions more closely.", "t-para", para)
        + txcb(860.3, "Try it now", "t-btn", "var(--x-ink-inv)", 27.3, 375.3),
        bg="var(--x-dim-inv)", big=True)


def s09():
    keys = "".join(txcb(top, ch, "t-key", x=cx - 15, w=30)
                   for top, row, cs in KEYS for ch, cx in zip(row, cs))
    return screen("Video keyboard",
        art("09-bg") + video_top("var(--x-ink-inv)")
        + txb(24.0, 468.7, "480p", "t-opt") + txb(86.3, 468.3, "720p", "t-opt")
        + txb(147.4, 468.3, "1080p", "t-opt") + txb(233.7, 468.3, "6s", "t-opt")
        + txb(308.3, 468.7, "Auto", "t-opt") + txb(394.0, 468.3, "On", "t-opt")
        + txb(29.0, 527.7, "Type to make video", "t-field", "var(--x-field-ink)")
        + txb(149.3, 572.0, "Video", "t-chip")
        + keys
        + txcb(822.0, "123", "t-key-sm", x=10.35, w=40.0)
        + txcb(820.0, "@", "t-key", x=332.5, w=30.0)
        + txcb(823.0, "#", "t-key-sm", x=385.5, w=30.0),
        bg="var(--x-page)", big=True)


SCREENS = [
    ("01-widget", "Home Screen widget", s01),
    ("02-widget-guide-add", "Widget guide, step 4", s02),
    ("03-widget-guide-jiggle", "Widget guide, step 1", s03),
    ("04-voice-settings", "Voice settings", s04),
    ("05-supergrok", "SuperGrok paywall", s05),
    ("06-terms-update", "Terms update", s06),
    ("07-home", "SuperGrok home", s07),
    ("08-video-sheet", "Video sheet", s08),
    ("09-video-keyboard", "Video keyboard", s09),
]


# ------------------------------------------------------ tokens + evidence ----
SHEET = """body{padding:0;background:#FFF;color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px 20px 12px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-foot);margin-bottom:6px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-foot);margin:7px 0 4px}
.grid{column-count:2;column-gap:12px}
.sw{display:flex;align-items:center;gap:5px;height:12px;break-inside:avoid;white-space:nowrap}
.sw .chip{width:16px;height:9px;flex:none;border-radius:3px;border:1px solid var(--x-well);background-color:#888}
.sw b{font:600 7.5px/12px ui-monospace,Menlo,monospace}
.sw i{font:400 7.5px/12px ui-monospace,Menlo,monospace;color:var(--x-foot);font-style:normal}
.foot{display:flex;gap:28px;align-items:flex-start;margin-top:6px}
.foot h2{margin-top:0}
.rad{display:flex;gap:6px;flex-wrap:wrap;width:250px}
.rb{width:36px;height:22px;background:var(--x-sheet);border:1px solid var(--x-well)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-foot);font-style:normal;text-align:center}
.ty{column-count:3;column-gap:12px}
.tr{break-inside:avoid;border-bottom:1px solid var(--x-well)}
.tr span{display:block;white-space:nowrap;overflow:hidden;line-height:1.05}
.tr em{display:block;font:400 8px/10px ui-monospace,Menlo,monospace;
  color:var(--x-foot);font-style:normal;white-space:nowrap}
.met{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink);white-space:nowrap}
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
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Grok</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Five Mobbin captures, 881 &times; 1910 after the footer trim, '
                '2.2417 px per pt, and four native 1290 &times; 2796 captures of a '
                '430 &times; 932 device at 3 px per pt. One face (SF Pro, the platform&rsquo;s), one type '
                'ladder on 12/13/15/16/17/20/21/39, three apps&rsquo; worth of surface: '
                'the widget gallery and guide on light greys, the voice sheet and '
                'paywall on black and blurred photograph, the home and video composer '
                'on white. Translucent surfaces are '
                'materials, not fills, because the ground under them is not flat.</p>'
                '</header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2>'
                '<div class="rad">%s</div></div>'
                '<div><h2>Metrics</h2><div class="met">%s</div></div></div>'
                '<h2>Type</h2><div class="ty">%s</div></div>'
                % (NAME, swatches, radii, met, type_), SHEET)


EV_ROWS = 22


def evidence_boards():
    pages = [TOKENS[i:i + EV_ROWS] for i in range(0, len(TOKENS), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--x-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield ("00%s-evidence" % "bcdefgh"[i],
               page(NAME + " - Evidence" + of,
                    '<div class="sheet"><header><h1>Evidence%s</h1>'
                    '<p>One row per token. A token with no evidence is a guess.</p>'
                    '</header><table class="ev">%s</table></div>' % (of, rows), SHEET))


# ----------------------------------------------------------- references ----
REF_CSS = """body{padding:24px}
.phone img{position:absolute;left:0;top:0;width:100%;height:100%;display:block}"""


def ref_boards():
    for i, (stem, label, _) in enumerate(SCREENS, 1):
        f = REFS_DIR / ("cp%d.png" % i)
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        big = ' style="width:var(--x-w-max);height:var(--x-h-max)"' if "cp%d" % i in BIG else ""
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone"%s><img src="%s" alt="%s"></div>' % (big, uri, label),
                    REF_CSS))


# ----------------------------------------------------------------- main ----
def layout(names):
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
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
    files = dict([("00-design-tokens", token_board())]
                 + list(evidence_boards())
                 + [(s, fn()) for s, _, fn in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    (OUT / "layout.json").write_text(json.dumps(layout(files), indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(layout(files)["rows"])))


if __name__ == "__main__":
    main()
