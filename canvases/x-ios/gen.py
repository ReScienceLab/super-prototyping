"""X for iOS -- a professional account, then two settings flows, in twelve screens.

Regenerates the whole folder in place, byte-identically, from anywhere:

    python3 canvases/x-ios/gen.py
    refkit tokens canvases/x-ios

Every colour and every metric in here was read off twelve Mobbin captures at
exactly 3 capture px per design pt (1179 px across a 393 pt screen, 2556 down
an 852 pt one), and every one of them is stated with its evidence on the
00b/00c boards. Nothing was eyeballed. The artboards are output: never
hand-edit an .html, edit this file and re-run.

Four decisions the captures force.

THE FACE IS THE PLATFORM'S, NOT CHIRP. X ships Chirp on the web; iOS renders
SF Pro, and every size in the Type group below was fitted to a run's measured
ink width against SF Pro at 8x rather than assumed off the iOS ladder. The
fits land inside half a pixel -- 02 "Movie review" measures 157.67 and Heavy
25.5 draws 157.62 -- which is why several sizes are halves.

ONLY PICTURES ARE CROPPED. Six crops (crops.json): 03's and 07's heroes, 10's
live-event graphic, and the three facepiles under 10's news items, each cut as
one rectangle because the discs overlap. Four more pictures are the example
account's own -- its banner on two screens, its avatar on four and its post's
video thumbnail on one -- and they come from assets/ through pic(), not from a
capture. Everything else on these screens -- every rule, fill, chip, glyph and
run of type -- is rebuilt. Where interface sat on a cropped picture it is
patched out of the capture first (INPAINT below, a Coons fill from each box's
own four edges) and drawn again in CSS on top: 03's close disc, 10's "LIVE" and
event title, and on 03 and 07 the status bar.

TWENTY-EIGHT ICONS ARE VECTORS, NOT CROPS. Each one is drawn on X's own 24-unit
grid in assets/icons/, with a viewBox that is the glyph's ink box, and inlined
by icon() at the ink box measured off the capture, so the canvas's inspector
hands it back as a vector asset. Most are approximations of X's artwork; the
five bottom-nav glyphs are not. Those are traced off the artwork at half
coverage and redrawn as lines, arcs and cubics, and the Grok mark is traced
off grok-ios's own copy of it at 165 px rather than the nav's 70 px.

THREE DEFECTS BELONG TO THE SOURCE. Mobbin composites the Dynamic Island out,
drops the home indicator, and exports with square corners. All three are this
repo's frame and are drawn here regardless, so the diff window is trimmed --
see README.md.

ONE THING THE CAPTURES DO NOT DECIDE. 01, 02 and 08-12 show @Yilin0x rather
than the captures' demo persona: its banner, its avatar, its two-line bio,
location, website, join month and counts, its handle under four settings
titles, and one post, all read off twitterapi.io. Their deltas against the
captures are therefore not clone scores -- README.md says what is still
comparable on those boards, and what the swap costs.
"""
import base64, json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
# Unlike everything else under assets/, these are never inlined as data: URIs.
# manifest.json places them as image shapes of their own, one row per surface,
# so the canvas can compare avatar against avatar down the page.
BRAND_DIR = OUT / "assets" / "brand"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}
SCALE = 3.0                                       # capture px per design pt

NAME = "X iOS"
PAGE_NAME = "(example) " + NAME
# The account the boards show. The captures hold X's own demo persona, and the
# evidence rows below still quote it: they measure the captures, not the render.
USER, AT = "Yilin", "@Yilin0x"
# Its bio, location, join month and two counts, read off twitterapi.io on
# 2026-09-13 with the post below. The bio is two lines where the capture's
# "Ordinary guy" is one, so shift() drops everything under it by one line.
BIO = ("Building <a>@snapaction_ai</a> <a>snapaction.ai</a>\U0001F984"
       "Discord: <a>discord.gg/C2b7tNfhZC</a>")
DY = 21.0
P = "x"          # token prefix: --x-ink, --x-accent, --x-t-body

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). The :root block and the evidence table are
# both generated from this list, so a value cannot drift from the evidence
# behind it, and a token cannot ship without one.
TOKENS = [
 ("Font", "font", '-apple-system,BlinkMacSystemFont,"SF Pro Text",'
                  '"SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif',
  "Every size in Type was fitted by ink width against SF Pro rendered at 8x "
  "and lands within 0.4px of the capture: 02 'Movie review' 157.67 measured "
  "against 157.62 drawn at Heavy 25.5. X's own Chirp is not on the device"),

 ("Surface", "ground", "#FFFFFF",
  "01 the empty band between its hairlines at 664.67 and 697.00, x 4-389 y "
  "668-694: #FFFFFF on 100% of the pixels; 01 the bio row's right half "
  "(x 200-389 y 355-438) the same"),
 ("Surface", "field", "#EFF3F4",
  "04 the search field's interior right of the placeholder (ends 189.7) and "
  "inside the 34pt box at y 260-294: flat #EFF3F4"),
 ("Surface", "spaces", "#7856FE",
  "02 the Spaces card, x 61.33-384.00 y 477.67-691.67, sampled between "
  "'Movie review' (ends 552) and the play row (from 612): flat #7856FE. 15 "
  "the three event tiles and the FAB read the same; 13's card in the sheet "
  "reads #7A55FE, two levels of red off it"),
 ("Surface", "spaces-2", "#6748D9",
  "15 the host card's body, x 8.82-384.00 y 68.00-158.17, clear of the "
  "avatar and the two description lines: flat #6748D9, a darker cut of "
  "--x-spaces than the 8.67pt band of --x-spaces above it"),
 ("Surface", "wash", "#E6D8FF",
  "15 the band behind the status bar, y 0-58.50 across the full width: flat "
  "#E6D8FF on every row, with the transition to the card at 58.67"),
 ("Surface", "banner", "#E9F5FC",
  "14 the confirmation banner, x 10.67-382.00 y 69.00-169.00, outside the "
  "check disc, the text and the share pill: flat #E9F5FC"),
 ("Surface", "veil", "rgba(0,0,0,.47)",
  "13/14 the calendar page under the sheet, against 15 undimmed: the white "
  "at (196, 350) goes #FFFFFF to #878787 and at (196, 300) #FDFFFF to "
  "#858887, both 0.5294 of their own value, so a black at .4706. Fitted as a "
  "line per channel over the white page, the host card and a tile\u2019s "
  "purple it is the same black three times (out = .551 in -5.4, .554 in -6.3, "
  ".506 in +6.3, every residual under 0.7). It reaches the status bar too, "
  "though not by this law: the band there is a flat #787294 on both, where "
  "the dimmed wash should be #797187. 13 levels of blue, and no input can "
  "explain them -- the fit wants a B of 280 going in. Over that one band the "
  "scrim behaves like rgba(0,0,27,.47); the boards ship the plain black"),
 ("Surface", "chip", "#ECE8FF",
  "02 the post's Host chip, x 61.33-102.00 y 451.00-469.33, outside the "
  "label ink (66.67-97.00): #ECE8FF"),
 ("Surface", "chip-card", "rgba(255,255,255,.30)",
  "02 the Host chip inside the card reads #AA94FA against the card's "
  "#7856FE: (170-120)/(255-120) = .370, (148-86)/(255-86) = .367, "
  "(250-254)/(255-254) rails at white, so .30 on the two channels that "
  "carry it once the chip's own antialiasing is dropped"),
 ("Surface", "pill-off", "#88898D",
  "04 the disabled Next button, x 18-375 y 754-806, outside the label ink "
  "(180.0-213.67): flat #88898D"),
 ("Surface", "disc-1", "rgba(0,0,0,.75)",
  "03 the close disc on the hero, d 28 at (18, 67.3): the disc reads about "
  "a quarter of the hero's own luminance right through it, and the hero "
  "under it is not flat, so it is a black at .75 rather than a fill"),
 ("Surface", "disc-7", "rgba(0,0,0,.57)",
  "02 the four header discs, d 30 centred at y 80.5 on x 32.3 / 280.7 / "
  "321.3 / 361.0: the banner shows through at about .43 of its own value"),
 ("Surface", "scrim", "rgba(0,0,0,.28)",
  "01 the sheet's avatar against the same photograph on 02: mean ratio "
  "0.699 / 0.727 / 0.742 per channel over the disc with the camera glyph "
  "masked out, so a black scrim at 1 - 0.72 = .28"),
 ("Surface", "backdrop", "#000000",
  "01 above the peek card, x 0-20 and x 373.33-393 at y 0-70: #000000"),
 ("Surface", "track-on", "#01BA7B",
  "11 all nine toggle tracks and 08's two, sampled left of the knob at "
  "x 337-350: #01BA7B on every one"),
 ("Surface", "track-off", "#E9E9E9",
  "12 the New followers track at y 372.33 and 09's location track at "
  "151.00, sampled right of the knob at x 366-380: #E9E9E9"),
 ("Surface", "nav", "linear-gradient(96deg,#FDFCFF 0%,#EFE8FF 38%,"
                    "#EAE0FF 62%,#EFE7FF 100%)",
  "02 the nav bar below 768.67 is a pale purple wash, lightest at the top "
  "left and deepest just left of centre. APPROXIMATION: four stops fitted "
  "to the row at y 790, not the two-axis gradient the capture holds. 02 no "
  "longer draws it: X tints the bar while a Space is live, and this canvas\u2019s "
  "own timeline has none, so the bar is --x-ground, the white 10 already "
  "shows. It still needs the fill 10 does without, because 02\u2019s video "
  "thumbnail runs under the bar and something has to cover it"),
 ("Surface", "nav-2", "linear-gradient(180deg,#E7DDFE 0%,#ECE3FF 100%)",
  "15 carries the same five glyphs over a wash of its own, and this one runs "
  "down rather than across. A single column reads it to a couple of levels "
  "either way, so it is averaged: rows meaned over x 60-100, clear of the dot "
  "and the glyphs, climb evenly from (231.8, 221.5, 254.4) at 775 to "
  "(236, 227, 255) at 848 -- one straight line across the whole 83.5pt band "
  "rather than a ramp that flattens partway. Solved on that pair, the ends "
  "are #E7DDFE and #ECE3FF"),

 ("Line", "hairline", "#D2D4D6",
  "01 the ten full-width rules at 306.00, 350.67, 441.33, 486.00, 530.67, "
  "575.33, 620.00, 664.67, 697.00, 741.67 read #D5D7D6, #D1D3D5 and "
  "#D1D2DB; one device pixel is 0.333pt, so the drawn rule is 0.33 tall"),
 ("Line", "hairline-2", "#C6C6C6",
  "10 the two rules between the news items, at 518.00 and 632.33: both "
  "#C6C6C6, and both inset to x 9.00-384.00 where the page's other two, at "
  "375.33 and 768.67, run the full 393 at --x-hairline"),
 ("Line", "border", "#D0D8DC",
  "06 both cards' 1pt borders, x 16.00-377.33 at y 234.67 and y 343.67: "
  "#D0D8DC at the same weight on both"),
 ("Line", "ring", "#BAC9D0",
  "04 an unchecked category ring core #BAC9D1; 07 a row chevron core "
  "#BAC8CF; 01 the location caret #BAC7CD and a row chevron #B8C8CD"),

 ("Ink", "ink", "#0F1419",
  "03 title core #0E1215, 04 a row label #06090D, 07 'Skip for now' "
  "#0D1113, 02 the bio #0E1012 and the 'Posts' tab #0D0F11. The same value "
  "fills the enabled button: #0E1419 on 03 and 06, #060B13 on 05"),
 ("Ink", "ink-2", "#536471",
  "03 body #56626C and legal note #55616A, 04 subtitle #5A6771 and "
  "placeholder #54636D, 06 card description #57626B, 02 handle #546069, "
  "meta #54616A, inactive tab #52606A and action row #58656D"),
 ("Ink", "accent", "#1D9BF0",
  "01 the three editable values read core #288ECD, 02 'View more' #298DCB, "
  "and 02's FAB disc samples #1E9BF0 flat at its centre"),
 ("Ink", "inv", "#FFFFFF",
  "02 'Movie review' on the card samples #FFFFFF at its brightest 6%, and "
  "the card's 'Sam Lee' #FFFEFF"),
 ("Ink", "ink-off", "#C6C7C9",
  "04 the disabled Next label, ink 180.0-213.67 y 774.67-785.67, on the "
  "#88898D pill: #C6C7C9"),
 ("Ink", "save-off", "#C5C5C5",
  "01 'Save', ink 338.67-377.00 y 88.0-99.0: #C5C5C5, a grey of its own "
  "rather than the disabled label on 04"),
 ("Ink", "chip-ink", "#291465",
  "02 the post's Host label, ink 66.67-97.00 y 454.67-465.67 on #ECE8FF"),

 ("Radius", "r-phone", "52px",
  "This repo's frame: a circular stand-in for the 55pt continuous display "
  "corner, the same in every canvas folder"),
 ("Radius", "r-pill", "26px",
  "03/04/05/06 the CTA is 52 tall and its ends are semicircles: the fill "
  "reaches full width only at y 780, half its height"),
 ("Radius", "r-field", "17px",
  "04 the search field is 34 tall (y 260-294) with semicircular ends"),
 ("Radius", "r-search", "19.5px",
  "10 the search pill, x 64.00-337.00 y 61.00-100.00: 39 tall with "
  "semicircular ends -- 19.5 fits every row down the curve, where 19 and 20 "
  "each miss by a pixel at the waist"),
 ("Radius", "r-card", "16px",
  "06 the two bordered cards and 02's Spaces card: the fill of the card at "
  "x 61.33-384.00 reaches its full width 16 down from y 477.67"),
 ("Radius", "r-play", "16.5px",
  "02 the white Play pill, x 70.67-356.67 y 646-679: 33 tall, ends "
  "semicircular. 14 the banner's share pill, x 21.67-371.00 y 124.67-157.00: "
  "32.33 tall, so 16.17 closes it and 16.5 is the nearest measured radius"),
 ("Radius", "r-chip", "4px",
  "02 both Host chips: the post's is 18.33 tall and the card's 15.33, and "
  "neither end is a semicircle -- the fill is square 4 in from each corner"),
 ("Radius", "r-sheet", "12px",
  "01 the sheet's top edge is at 69.0 and its white reaches x 1 only at "
  "76.33: 12 puts that corner at 76.20 and fits eleven columns across the "
  "curve at 0.17 rms, where the 70.33 first read off mid-width sits 1.24 out. "
  "Four more corners land on it: 13's card in the sheet fits 12.45, 15's host "
  "card 13.05 and its LIVE card 12.80, and 14's banner 10.85 -- one value at "
  "0.9 mean error rather than four radii a hair apart"),
 ("Radius", "r-modal", "36px",
  "13/14 the reminder sheet's top edge is at 356.00 and its white reaches "
  "x 1 only at 380.6; swept 30-42, 36 fits the thirteen columns across the "
  "curve at 0.46 rms and is three times the sheet radius 01 uses"),
 ("Radius", "r-tile", "20px",
  "15 the three event tiles, 80.67 square at x 8.83 with tops 264 / 419 / "
  "574. Swept the way r-modal is, down the first tile's left edge and below "
  "the blurred apex, 20.8 fits at 0.17 rms: iOS draws a squircle, and a "
  "circular corner fitted to one always runs a shade wide, so the token is "
  "the 20 that sweep rounds to"),
 ("Radius", "r-peek", "10px",
  "01 the page peeking above the sheet, x 20-373.33: opaque across its "
  "full width from 52.7, 10 below its top at 42.67"),

 ("Metrics", "w", "393px",
  "1179 capture px / 3 = 393pt, the iPhone 16 logical width"),
 ("Metrics", "h", "852px",
  "2556 capture px / 3 = 852pt, once Mobbin's 120px footer is dropped"),
 ("Metrics", "status", "54px",
  "This repo's frame: the status bar height the template sets"),
 ("Metrics", "dim", ".31",
  "08 the locations row while the location toggle is on. Its three parts "
  "each fade toward the page: the label #111417 to #B8B9B9 is alpha .302, "
  "'Select' #59656F to #CFD1D2 is .299, and the chevron #C0CCD2 to #ECEEF0 "
  "is .327 -- one opacity on the row, not three colours"),

 ("Type", "tr-text", "-0.035em",
  "SF Pro stands in for Chirp. Above 20px the platform serves SF Pro Display "
  "and the ink widths agree within 1% (03 title 230.67 vs 232.00, 02 "
  "'Movie review' 158.33 vs 157.33); below it serves SF Pro Text, which runs "
  "6-8% wide (02 'New Jersey, USA' 97.00 vs 111.67). Tracking closes the "
  "band, and nothing above 20px carries it. Swept -0.03 / -0.035 / -0.04: "
  "-0.035 puts the mean of the nineteen small-text ink widths on 0.998 of "
  "the capture's, and costs 1% on the seven whole-screen deltas against "
  "-0.04, which reads narrow"),
 ("Type", "t-time", "590 17px/22px var(--x-font)",
  "This repo's frame: the iOS status bar clock, not the app"),
 ("Type", "t-title", "800 26px/34px var(--x-font)",
  "03 'X for Professionals' 231.00, 04 'Select a category' 212.33, 06 "
  "'Select an account type' 278.33, 07 'Welcome to X for' 207.33 and "
  "'Professionals' 165.33; 07's two lines sit 34 apart"),
 ("Type", "t-space", "800 25.5px/31px var(--x-font)",
  "02 'Movie review' 157.67 measured, 157.62 drawn"),
 ("Type", "t-name", "800 22px/27px var(--x-font)",
  "02 the profile name 'Sam Lee' 86.33"),
 ("Type", "t-cal", "800 21.65px/28px var(--x-font)",
  "15 'Get these in your calendar' 269.00, cap 16.33. Above 20px, so no "
  "--x-tr-text: fitted between 21.25 drawn at 264.00 and 22.25 at 276.33"),
 ("Type", "t-space-2", "800 20.2px/23.67px var(--x-font)",
  "13 the card's title in the sheet, 'RWA-Investment: The Future of' 303.00 "
  "and 'Real Estate, Fractionally yours!' 296.00, fitting 20.17 and 20.18; "
  "cap 14.33 on both and the two baselines 23.67 apart. The one run on these "
  "boards that clears 20px by a fifth of a point, so it drops --x-tr-text "
  "while the rows below it keep it"),
 ("Type", "t-card", "700 19px/24px var(--x-font)",
  "06 'Business' 77.33 and 'Creator' 66.33"),
 ("Type", "t-field", "400 18.5px/24px var(--x-font)",
  "04 the placeholder 'Search categories' 136.33, 07 'Customize your "
  "profile' 168.67 and 'Explore Profile Spotlights' 188.33, 07 'Skip for "
  "now' 94.00, 01 'Cancel' 52.33"),
 ("Type", "t-sheet", "700 18.5px/24px var(--x-font)",
  "01 'Edit profile' 90.67, the same size as Cancel beside it and bold"),
 ("Type", "t-sect", "800 19.3px/24px var(--x-font)",
  "08 'Location' 73.67 and 'Personalization' 134.67, 11 'Related to you and "
  "your posts' 256.00 and 'In-app notifications from X' 234.33. The section "
  "head is a point larger than the title above it. Fitted against the render "
  "rather than against SF Pro at 8x: heavy is the one weight where the 8x fit "
  "and --x-tr-text do not cancel, and 18.5 off the 8x fit ships 4.3% narrow"),
 ("Type", "t-save", "700 17.5px/22px var(--x-font)",
  "01 'Save' 38.67 -- a size of its own, half a point under the title. "
  "08-12 'Done' 40.00, in --x-ink rather than the accent"),
 ("Type", "t-head", "800 18.25px/22px var(--x-font)",
  "08 'Explore settings' 132.00, 11 'Push notifications' 148.67, 10 "
  "\"Today's News\" 117.00. Fitted against the render for the same reason as "
  "t-sect: 17.5, which is what SF Pro at 8x asks for, ships 4.3% narrow"),
 ("Type", "t-event", "800 18px/20.33px var(--x-font)",
  "15 the eight title lines on the three event rows fit 18.10 / 17.94 / "
  "18.20 / 18.04 / 18.21 / 17.97 / 18.05 against ink widths of 190.33 / "
  "204.00 / 162.67 / 179.67 / 174.00 / 197.33 / 64.33, and 13's sheet title "
  "'Moby Media&rsquo;s Space' 165.67 fits 17.82. Their baselines are 20.33 "
  "apart, which is the line height. t-head at 18.25 ships 1.2% wide"),
 ("Type", "t-btn", "700 16.5px/21px var(--x-font)",
  "03 'Agree & Continue' 131.00 and 04/05/06 'Next' 33.67. 13's three sheet "
  "buttons fit 16.78 / 17.00 / 16.57 and 14's 'Reminder set' 16.80, all 1.7% "
  "over, and each label sits 20.33 below its own pill's top like 03-06's"),
 ("Type", "t-body", "400 16px/21px var(--x-font)",
  "03 body 337.00 on a 21.0 pitch, 04 subtitle 341.00 on 21, 06 subtitle "
  "276.00 on 21, 07 body 329.00 on 21.3, 02 the bio 84.33, 02 the post's "
  "Host label 30.33 (regular, not bold -- see the capture). The widest band "
  "on 13-15: 15's subtitle fits 16.05, its two card description lines 15.87 "
  "and 15.91, the three host names 16.00 / 15.82 / 15.83, the two times "
  "15.67 and 15.73, and 14's banner sentence 16.17"),
 ("Type", "t-date", "700 16px/21px var(--x-font)",
  "02 'Dec 10, 2025 - 11s' 130.00, bold on the card"),
 ("Type", "t-row", "700 15.5px/21px var(--x-font)",
  "04 row 1 194.67 and row 7 238.67, 01 every field label, 02 the five "
  "legible tabs 38.33 / 50.33 / 70.66 / 48.00 / 48.33 and the post head's "
  "'Sam Lee' 59.00. 13 the card's foot 'Dec 08 at 5:00 PM &middot; 226 "
  "going' 208.33 fits 15.28"),
 ("Type", "t-note", "400 15.5px/21px var(--x-font)",
  "03 the legal note 329.67 on a 20.67 pitch, 02 the handle 79.00 and the "
  "post head's '@SamLeexf - 2h' 103.67. 15 the three going counts fit 15.39 "
  "/ 15.58 / 15.58, and its 'LIVE' rides the same token 10's does -- two and "
  "a half points of that card show before the nav covers it"),
 ("Type", "t-pill", "700 15px/20px var(--x-font)",
  "02 'Play recording' 95.67. 13 the card's 'Moby Media' 82.33 and 15's "
  "'IG NEWMAN' 84.33 fit 15.20 and 15.19 at bold; the leading M caps at "
  "10.67, which this token redraws exactly. Heavy is the other reading the "
  "cap allows -- 14.89 -- but t-host at 14.5 would ship each 2.6% narrow, "
  "against 0.8% here, and t-row at 15.5 would ship each 3% wide"),
 ("Type", "t-desc", "400 14.5px/15.67px var(--x-font)",
  "06 the card descriptions 293.00 and 287.33, the two lines of the first "
  "15.67 apart"),
 ("Type", "t-meta", "400 13.5px/19px var(--x-font)",
  "02 'Entertainment & Recreation' 162.00 with 'New Jersey, USA' 97.00 "
  "beside it. The one run the tracking band does not reach: at 14.5px it "
  "still redrew 9% wide, and the cap height agrees -- 9.3 against 10.0"),
 ("Type", "t-tag", "800 13.5px/19px var(--x-font)",
  "14 'Share with a post' on the banner's blue pill, ink 142.67-249.33 so "
  "107.00 wide, fits 13.39 at heavy and 13.68 at bold; its leading S runs "
  "136.00-145.33, a cap of 9.67, which asks for 13.49. So t-meta's size at "
  "the weight the pill is set in -- 13.5 heavy redraws it 107.83"),
 ("Type", "t-host", "800 14.5px/18px var(--x-font)",
  "02 the Spaces card's 'Sam Lee' 57.33 -- heavy at 14.5, not the 22 of "
  "the profile name"),
 ("Type", "t-count", "400 14px/19px var(--x-font)",
  "02 'Following' 55.66 and 'Followers' 55.33, 'Joined November 2025' "
  "137.67, 'View more' 61.67 (cap 10.0), the card's 'Host' 26.67. 10 the "
  "three news meta lines, 237.67 / 239.00 / 241.67, and 08's two "
  "descriptions, 361.00 and 364.00 on the first line and 116.00 on 'and who "
  "you follow.' -- those two wrap on a 16.33 baseline pitch rather than this "
  "token's 19, so explore() places each line itself. 13 and 15 both carry a "
  "'Host' chip on a Spaces card, 27.00 wide against 02's 26.67, and both fit "
  "13.75"),
 ("Type", "t-badge", "400 12.5px/16px var(--x-font)",
  "10 the '5' in the notifications tab's badge, 6.00 wide and 9.00 tall "
  "inside a 16.00 disc"),
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
# Boxes (pt) patched out of a capture before it is cropped: the chrome that
# sat on a photograph and is drawn again in CSS. Each box is filled with a
# Coons patch from its own four edges, which is exact on the smooth grounds
# these sit on and continuous at the boundary by construction.
INPAINT = {
 "i1": ("p1", [(44, 16, 100, 42), (278, 20, 364, 38),    # clock, right cluster
               (14, 63, 52, 101)]),                      # the close disc
 "i5": ("p5", [(44, 16, 100, 42), (278, 20, 364, 38)]),
 "i10": ("p10", [(8, 303, 41, 319),                       # "LIVE"
                 (7, 326, 217, 349)]),                    # the event title
}


def _coons(a, box):
    import numpy as np                                        # noqa: local dep
    x0, y0, x1, y1 = [round(v * SCALE) for v in box]
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
    """A capture as an RGB image, patched first if it is one of i1/i5/i7."""
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
        box = tuple(round(v * SCALE) for v in (x0, y0, x1, y1))
        _source(ref, cache).crop(box).save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def _uri(cid):
    # no fallback: a crop named here and missing from assets/art/ is a bug, and
    # an empty src would ship a board that looks generated and is not
    return "data:image/png;base64," + base64.b64encode(
        (ART_DIR / (cid + ".png")).read_bytes()).decode()


def art(cid, style=""):
    """One <img>, at the box it was cut from and snapped to the capture's
    pixels: a crop placed at its raw pt box sits up to half a capture pixel
    from where it was taken."""
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a" src="%s" alt="" style="left:%.3fpx;top:%.3fpx;'
            'width:%.3fpx;height:%.3fpx%s">'
            % (_uri(cid), round(x0 * SCALE) / SCALE, round(y0 * SCALE) / SCALE,
               (round(x1 * SCALE) - round(x0 * SCALE)) / SCALE,
               (round(y1 * SCALE) - round(y0 * SCALE)) / SCALE,
               ";" + style if style else ""))


def pic(name, x, y, w, h, style=""):
    """One image from assets/, inlined. The three the example account
    brings -- its avatar, its banner and its post's video thumbnail -- are
    not cut from a capture, so they are not in crops.json and art() cannot
    place them. Each is stored at 3 px per pt, like every capture here."""
    uri = base64.b64encode((OUT / "assets" / (name + ".jpg")).read_bytes()).decode()
    return ('<img class="a" src="data:image/jpeg;base64,%s" alt="" style="left:'
            '%.2fpx;top:%.2fpx;width:%.2fpx;height:%.2fpx%s">'
            % (uri, x, y, w, h, ";" + style if style else ""))


ICON_DIR = OUT / "assets" / "icons"


def icon(name, x, y, w, h, colour="currentColor"):
    """One inline <svg> from assets/icons/<name>.svg. Its viewBox is the
    glyph's own ink box on the 24-unit grid, so preserveAspectRatio="none"
    lays that ink box exactly on the ink box measured off the capture, and
    the canvas's inspector still names it as a vector asset."""
    svg = (ICON_DIR / (name + ".svg")).read_text().strip()
    return svg.replace(
        '<svg xmlns="http://www.w3.org/2000/svg" ',
        '<svg class="ic" preserveAspectRatio="none" style="left:%gpx;top:%gpx;'
        'width:%gpx;height:%gpx;color:%s" ' % (x, y, w, h, colour), 1)


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
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-ground);color:var(--x-ink);transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:100%;height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--x-t-time)}
.sb .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
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


def statusbar(colour, time="9:41"):
    return ('<div class="sb" style="color:%s"><div class="island"></div>'
            '<div class="time">%s</div>%s</div>' % (colour, time, SB_ICONS))


def home(colour):
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
TY = {"t-time": (17, 22), "t-title": (26, 34), "t-space": (25.5, 31),
      "t-name": (22, 27), "t-cal": (21.65, 28), "t-space-2": (20.2, 23.67),
      "t-card": (19, 24), "t-field": (18.5, 24),
      "t-sheet": (18.5, 24), "t-sect": (19.3, 24), "t-save": (17.5, 22),
      "t-head": (18.25, 22), "t-event": (18, 20.33), "t-btn": (16.5, 21),
      "t-body": (16, 21),
      "t-date": (16, 21), "t-row": (15.5, 21), "t-note": (15.5, 21),
      "t-pill": (15, 20), "t-desc": (14.5, 15.67),
      "t-meta": (13.5, 19), "t-tag": (13.5, 19), "t-host": (14.5, 18),
      "t-count": (14, 19), "t-badge": (12.5, 16)}


def boxtop(ink_top, tk):
    size, lh = TY[tk]
    return ink_top - (lh / 2 - 0.3455 * size)


def track(tk):
    """Below 20px the stand-in face is the wide optical cut. See --x-tr-text."""
    return ";letter-spacing:var(--x-tr-text)" if TY[tk][0] < 20 else ""


def tx(x, ink_top, s, tk="t-body", col=None, extra=""):
    """One run of type, positioned by the top of its ink."""
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;font:var(--x-%s)%s%s%s">%s</div>'
            % (x, boxtop(ink_top, tk), tk, track(tk),
               ";color:%s" % col if col else "", extra, s))


def txc(x, ink_top, w, s, tk, col=None):
    """Centred type. The width is the box it centres in, not the ink."""
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;text-align:center;'
            'font:var(--x-%s)%s%s">%s</div>'
            % (x, boxtop(ink_top, tk), w, tk, track(tk),
               ";color:%s" % col if col else "", s))


def box(x, y, w, h, style=""):
    return ('<div class="b" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;'
            'height:%.2fpx;%s"></div>' % (x, y, w, h, style))


def circle(x, y, d, style=""):
    return box(x, y, d, d, "border-radius:50%;" + style)


def rule(y, x=0.0, w=393.0, col="hairline"):
    """One device pixel at 3 capture px per pt."""
    return box(x, y, w, 0.33, "background:var(--x-%s)" % col)


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.t,.b,.a,.ic{position:absolute}
.a,.ic{display:block}
.ic{overflow:visible}
.t{white-space:nowrap}
.t a{color:var(--x-accent);text-decoration:none}"""


def screen(title, inner, sb="var(--x-ink)", hm="var(--x-ink)", bg=None):
    """One phone artboard. No board background: the phone floats on the canvas."""
    return page(NAME + " - " + title,
                '<div class="phone"%s>%s%s%s</div>'
                % (' style="background:%s"' % bg if bg else "",
                   statusbar(sb), inner, home(hm)),
                SCREEN_CSS)


def cta(label, x, w, on=True):
    """The 52pt pill at the foot of 03-06. Its label's ink top measures 774.0
    on 03 and 774.67 on 04: 774.33 is the box's own centre at t-btn."""
    return (box(x, 754, w, 52, "border-radius:var(--x-r-pill);background:%s"
                % ("var(--x-ink)" if on else "var(--x-pill-off)"))
            + txc(x, 774.33, w, label, "t-btn",
                  "var(--x-inv)" if on else "var(--x-ink-off)"))


def header():
    """04/05/06 share one: a back arrow left, the X mark centred."""
    return (icon("back", 11.67, 73.67, 17.33, 14.67, "var(--x-ink)")
            + icon("x-logo", 184.67, 68.67, 23.67, 23.67, "var(--x-ink)"))


# -------------------------------------------------------------------- 01 ----
# The edit-profile sheet over a dimmed page. Ten full-width rules bound eight
# rows and one empty 32.33pt band; the avatar is the same photograph as 02
# under a .28 black scrim, with a stroked camera and a sparkle on it.
# The Bio row is 90.67 tall in the capture for a one-line value, so the
# example account's two lines sit in it unchanged. Every value wraps at the
# field's own right edge, 383.33.
FIELDS = [(323.0, "Name", USER, "var(--x-accent)"),
          (361.7, "Bio", BIO, "var(--x-accent)"),
          (457.7, "Location", "London, UK", "var(--x-accent)"),
          (502.3, "Website", "rescience.com", "var(--x-accent)"),
          (547.0, "Birth date", "Add your date of birth", "var(--x-ink-2)")]
RULES6 = [306.00, 350.67, 441.33, 486.00, 530.67, 575.33, 620.00, 664.67,
          697.00, 741.67]


def s01():
    fields = "".join(tx(10.0, y, label, "t-row")
                     + tx(92.33, y, value, "t-body", col,
                          extra=";width:291px;white-space:normal")
                     for y, label, value, col in FIELDS)
    return screen("Edit profile",
        # the parent profile behind the sheet: the same banner at the peek's
        # scale, under the dim itself. The dim is fitted, not guessed -- the
        # capture's peek is 0.563 of the banner it shows on 02. The peek ends
        # where the sheet starts, 69.0: the crop this replaced ran to 70.33 and
        # carried 1.33 of the sheet's own white, which is where that number
        # came from and why the corner fit above disagrees with it
        pic("profile-banner", 20, 42.67, 353.33, 26.33,
              "object-fit:cover;object-position:top;"
              "border-radius:var(--x-r-peek) var(--x-r-peek) 0 0")
        + box(20, 42.67, 353.33, 26.33,
              "border-radius:var(--x-r-peek) var(--x-r-peek) 0 0;"
              "background:rgba(0,0,0,.44)")
        + box(0, 69.0, 393, 783.0,
              "border-radius:var(--x-r-sheet) var(--x-r-sheet) 0 0;"
              "background:var(--x-ground)")
        + tx(17.0, 86.67, "Cancel", "t-field")
        + tx(152.33, 86.33, "Edit profile", "t-sheet")
        + tx(338.67, 88.0, "Save", "t-save", "var(--x-save-off)")
        + pic("profile-banner", 0, 118.0, 393, 128, "object-fit:cover")
        + circle(9.28, 223.28, 70.1, "background:var(--x-inv)")
        + pic("profile-avatar", 12.67, 226.67, 63.33, 63.33, "border-radius:50%")
        + circle(12.67, 226.67, 63.33, "background:var(--x-scrim)")
        + icon("camera", 31.67, 248.0, 25.33, 23.0, "var(--x-inv)")
        + icon("sparkle", 47.0, 245.5, 9.33, 10.0, "var(--x-inv)")
        + "".join(rule(y) for y in RULES6)
        + fields
        + icon("chevron-down", 368.67, 460.0, 12.67, 7.33, "var(--x-ring)")
        + icon("chevron-down", 368.67, 549.34, 12.67, 7.33, "var(--x-ring)")
        + tx(10.0, 591.7, "Edit professional profile", "t-row")
        + icon("chevron-right", 371.67, 591.0, 7.33, 12.67, "var(--x-ring)")
        + tx(10.0, 636.3, "Edit expanded bio", "t-row")
        + icon("chevron-right", 371.67, 635.67, 7.33, 12.67, "var(--x-ring)")
        + tx(10.0, 713.33, "Tips", "t-row")
        + tx(334.67, 713.33, "Off", "t-body", "var(--x-ink-2)")
        + icon("chevron-right", 371.67, 713.33, 7.33, 12.67, "var(--x-ring)"),
        sb="var(--x-inv)", bg="var(--x-backdrop)")


# -------------------------------------------------------------------- 02 ----
# The finished profile. A banner to 131.33 with four translucent discs on it,
# the avatar breaking its edge, the meta block, six tabs, then the timeline.
DISCS = [("back", 32.3, 26.0, 75.67, 12.67, 10.66),
         ("search", 280.7, 273.33, 73.33, 14.67, 14.67),
         ("pencil", 321.3, 314.33, 73.67, 14.0, 14.0),
         ("share", 361.0, 354.33, 74.33, 13.34, 13.34)]
TABS = [("Posts", 16.0, "var(--x-ink)"), ("Replies", 80.0, "var(--x-ink-2)"),
        ("Highlights", 150.0, "var(--x-ink-2)"), ("Videos", 239.33, "var(--x-ink-2)"),
        ("Photos", 306.67, "var(--x-ink-2)"), ("Articles", 374.0, "var(--x-ink-2)")]
# Fitted, not thresholded: a razor tip or an arc's bulge crosses half coverage
# outside the last pixel a threshold keeps, so scratch/navfit.py slides each box
# against the window itself. The five land at 2.0-3.0 mean levels over the wash.
NAV = [("home-fill", 29.25, 782.37, 20.19, 21.07), ("search", 108.11, 783.08, 19.6, 19.82),
       ("grok", 185.23, 781.79, 23.5, 22.46), ("bell", 267.26, 783.34, 18.35, 19.99),
       ("mail", 344.28, 784.31, 20.07, 18.07)]


# ----------------------------------------------------------- 02's timeline ----
# Not the capture's. X's demo profile posts a Space recording; this board draws
# @Yilin0x's launch post instead, read off twitterapi.io on 2026-09-13:
# x.com/Yilin0x/status/2095791405545480331. It is set to X's rhythm rather than
# measured off a capture, and it is taller than the fold: the video thumbnail
# runs under the nav and the action row falls off the board entirely, which is
# what the phone shows for a post this long under an unscrolled profile header.
# So the board draws no action row, and 02 keeps none of the capture's. README
# carries what that costs against the capture.
POST = """Launching super-prototyping: clone any app's UI as plain HTML artboards \
on a <a>@tldraw</a> canvas.
Run /sp-clone-prototype on your screenshots; every color and metric traces to a \
measurement. No design tool, no build step.
<a>prototyping.rescience.com</a>
<a>github.com/ReScienceLab/s…</a>"""
# One run, not four. The capture's four boxes fix where the row starts and the
# two ink gaps inside it, 3.67 within a pair and 10.67 between them; the
# example account's three-digit counts set everything else. A margin is advance
# where a gap is ink, so 2.4 and 9.5 are what reproduce those two gaps exactly.
COUNTS = ('<b style="color:var(--x-ink)">364</b>'
          '<span style="margin-left:2.4px">Following</span>'
          '<b style="color:var(--x-ink);margin-left:9.5px">246</b>'
          '<span style="margin-left:2.4px">Followers</span>')
LINES = 7                            # what POST wraps to in 322pt at 15.5/21
MEDIA = 623 / 966                    # assets/post-media.jpg, the video's thumbnail


def post():
    """The post: head, text, and the video's thumbnail with its play button."""
    my = boxtop(455.33, "t-note") + LINES * 21 + 12     # the text's floor, and a gap
    mh = 322 * MEDIA
    return (pic("profile-avatar", 9.0, 433.67, 44.33, 44.33, "border-radius:50%")
            + tx(61.67, 434.33, USER + '<span style="font:var(--x-t-note);color:'
                 'var(--x-ink-2);margin-left:5.33px">%s · 9/4/26</span>' % AT, "t-row")
            + icon("x-logo", 365.67, 432.67, 16.67, 16.33, "var(--x-ink)")
            + tx(61.33, 455.33, POST, "t-note",
                 extra=";width:322px;white-space:pre-wrap")
            + '<img class="a" src="data:image/jpeg;base64,%s" alt="" style="left:'
              '61.33px;top:%.2fpx;width:322px;height:%.2fpx;border-radius:16px">'
              % (base64.b64encode((OUT / "assets" / "post-media.jpg").read_bytes()).decode(),
                 my, mh)
            + circle(198.33, my + mh / 2 - 24, 48, "background:rgba(0,0,0,.45)")
            + icon("play", 218.0, my + mh / 2 - 9.5, 13.67, 19.0, "var(--x-inv)"))


def shift(inner):
    """Everything the bio's second line pushes down. The numbers inside are
    still the capture's: the block moves, nothing in it is re-measured."""
    return ('<div class="b" style="left:0;top:%.2fpx;width:393px;height:852px">'
            '%s</div>' % (DY, inner))


def s02():
    return screen("Professional profile",
        pic("profile-banner", 0, 0, 393, 131.33, "object-fit:cover")
        + "".join(circle(cx - 15, 65.5, 30, "background:var(--x-disc-7)")
                  + icon(name, gx, gy, gw, gh, "var(--x-inv)")
                  for name, cx, gx, gy, gw, gh in DISCS)
        + circle(5.45, 106.3, 70.1, "background:var(--x-inv)")
        + pic("profile-avatar", 8.67, 109.5, 63.67, 63.67, "border-radius:50%")
        + tx(9.0, 188.0, USER, "t-name")
        + tx(9.67, 215.33, AT, "t-note", "var(--x-ink-2)")
        + tx(9.67, 249.0, BIO, "t-body", extra=";width:373.67px;white-space:normal")
        + shift(
            icon("briefcase", 10.33, 275.67, 13.0, 12.33, "var(--x-ink-2)")
            + tx(28.33, 277.33, "Entertainment &amp; Recreation", "t-meta",
                 "var(--x-ink-2)")
            + icon("pin", 206.67, 275.67, 11.0, 13.0, "var(--x-ink-2)")
            + tx(223.67, 277.33, "London, UK", "t-meta", "var(--x-ink-2)")
            + icon("calendar", 11.0, 302.33, 11.67, 11.67, "var(--x-ink-2)")
            + tx(27.33, 302.33, "Joined January 2023", "t-count", "var(--x-ink-2)")
            + icon("chevron-right", 170.67, 302.67, 6.33, 10.66, "var(--x-ink-2)")
            + tx(9.0, 328.0, "View more", "t-count", "var(--x-accent)")
            + tx(9.33, 356.33, COUNTS, "t-count", "var(--x-ink-2)")
            + "".join(tx(x, 393.33, label, "t-row", col) for label, x, col in TABS)
            + box(11.0, 418.33, 48, 3,
                  "border-radius:1.5px;background:var(--x-accent)")
            + rule(421.33)
            + post())
        + circle(328, 704, 56, "background:var(--x-accent);"
                               "box-shadow:0 4px 12px rgba(0,0,0,.18)")
        + icon("plus", 348.33, 724.33, 15.33, 15.33, "var(--x-inv)")
        + box(0, 768.67, 393, 83.33, "background:var(--x-ground)")
        + rule(768.67)
        + "".join(icon(n, x, y, w, h, "var(--x-ink)") for n, x, y, w, h in NAV)
        + circle(44.33, 778.33, 6, "background:var(--x-accent)"),
        sb="var(--x-inv)")


# -------------------------------------------------------------------- 03 ----
# The splash. A photographic hero to 395 with the close disc on it, the title
# at 416.67, three lines of body on a 21.0 pitch and two of legal note on
# 20.67, and the agree pill at 754.
def s03():
    return screen("Professional account splash",
        art("03-hero")
        + circle(18, 67.3, 28, "background:var(--x-disc-1)")
        + icon("close", 26.4, 75.1, 11.1, 11.1, "var(--x-inv)")
        + tx(18.0, 416.67, "X for Professionals", "t-title")
        + tx(18.33, 462.67, "Get access to the tools you need to better connect",
             "t-body", "var(--x-ink-2)")
        + tx(18.33, 483.67, "with your audience, grow your brand, and increase",
             "t-body", "var(--x-ink-2)")
        + tx(18.33, 504.67, "your profits.", "t-body", "var(--x-ink-2)")
        + tx(18.67, 546.67, 'By tapping "Agree &amp; continue", you are agreeing to',
             "t-note", "var(--x-ink-2)")
        + tx(18.67, 567.33, 'our <a>Professional Account policy.</a>',
             "t-note", "var(--x-ink-2)")
        + cta("Agree &amp; Continue", 18, 357))


# ----------------------------------------------------------------- 04-05 ----
# The category picker. Ten rows on a 45.33 pitch from an ink top of 310.67,
# each with a 20.67 ring at the right and no rule between them; picking row 1
# fills its ring and enables the button.
CATEGORIES = ["Entertainment &amp; Recreation", "Event Venue", "Dance &amp; Night Club",
              "Automotive", "Aviation", "Marine",
              "Beauty, Cosmetic &amp; Personal Care", "Commercial &amp; Industrial",
              "Education", "Financial Services"]


def category(title, picked):
    rows = ""
    for n, label in enumerate(CATEGORIES):
        rows += tx(18.0, 310.67 + n * 45.33, label, "t-row")
        if n == picked:
            rows += (circle(352.0, 305.33, 21.67, "background:var(--x-accent)")
                     + icon("check", 355.0, 308.0, 16.0, 17.0, "var(--x-inv)"))
        else:
            rows += circle(352.67, 306.33 + n * 45.33, 20.67,
                           "border:1.5px solid var(--x-ring)")
    return screen(title,
        header()
        + tx(18.0, 125.33, "Select a category", "t-title")
        + tx(18.0, 171.33, "Choose the category to display on your profile. Pick",
             "t-body", "var(--x-ink-2)")
        + tx(18.0, 192.33, "the one that best describes your account. This will be",
             "t-body", "var(--x-ink-2)")
        + tx(18.0, 213.33, "shown on your public profile.", "t-body", "var(--x-ink-2)")
        + box(18, 260, 357, 34,
              "border-radius:var(--x-r-field);background:var(--x-field)")
        + icon("search", 29.3, 268, 17, 17, "var(--x-ink-2)")
        + tx(53.33, 270.0, "Search categories", "t-field", "var(--x-ink-2)")
        + rows + cta("Next", 18, 357, on=picked is not None))


def s04():
    return category("Select a category", None)


def s05():
    return category("Category selected", 0)


# -------------------------------------------------------------------- 06 ----
# Two bordered cards, the first 93.33 tall with two description lines on a
# 15.67 pitch and the second 77.67 with one. Checked card first.
def s06():
    return screen("Select an account type",
        header()
        + tx(30.0, 125.67, "Select an account type", "t-title")
        + tx(30.67, 171.33, "Choose the one that best aligns with your",
             "t-body", "var(--x-ink-2)")
        + tx(30.67, 192.33, "profession. Don’t worry, you can change this later.",
             "t-body", "var(--x-ink-2)")
        + box(16, 234.67, 361.33, 93.33,
              "border-radius:var(--x-r-card);border:1px solid var(--x-border)")
        + tx(33.0, 254.0, "Business", "t-card")
        + tx(32.67, 283.0, "Best fit for brands, retail shops, service providers,",
             "t-desc", "var(--x-ink-2)")
        + tx(32.67, 298.67, "and organizations", "t-desc", "var(--x-ink-2)")
        + circle(338.5, 252.33, 20.67, "background:var(--x-accent)")
        + icon("check", 341.36, 254.88, 15.26, 16.22, "var(--x-inv)")
        + box(16, 343.67, 361.33, 77.67,
              "border-radius:var(--x-r-card);border:1px solid var(--x-border)")
        + tx(32.67, 363.33, "Creator", "t-card")
        + tx(33.0, 391.67, "Best fit for public figures, artists, and influencers",
             "t-desc", "var(--x-ink-2)")
        + circle(338.67, 360.5, 20.67, "border:1.5px solid var(--x-ring)")
        + cta("Next", 29.33, 333.67))


# -------------------------------------------------------------------- 07 ----
# The welcome. Hero to 198, a two-line title on a 34 pitch, two body lines,
# then four rows on a 45.7 pitch: glyph, label, chevron, no rule.
WELCOME = [("profile-card", "Customize your profile", 369.33, 370.33, 371.67),
           ("spotlight", "Explore Profile Spotlights", 415.33, 415.66, 417.0),
           ("topics", "Pick Topics to follow", 459.66, 460.99, 462.33),
           ("people", "Make more connections", 505.32, 506.66, 507.66)]


def s07():
    rows = "".join(
        icon(name, 39.67, iy, 16.67, 15.67, "var(--x-ink)")
        + tx(91.0, ty, label, "t-field")
        + icon("chevron-right", 362.67, cy, 7.33, 12.33, "var(--x-ring)")
        for name, label, iy, ty, cy in WELCOME)
    return screen("Welcome",
        art("07-hero")
        + tx(18.33, 220.33, "Welcome to X for", "t-title")
        + tx(18.33, 254.33, "Professionals", "t-title")
        + tx(19.0, 300.0, "Now you can access more tools to better connect",
             "t-body", "var(--x-ink-2)")
        + tx(19.0, 321.33, "with your customers and grow your brand.",
             "t-body", "var(--x-ink-2)")
        + rows
        + tx(149.67, 786.0, "Skip for now", "t-field",
             extra=";text-decoration:underline"))


# ----------------------------------------------------------------- 08-12 ----
# Settings. Four boards share a header -- the title centred over the account's
# handle, "Done" at the right in --x-ink rather than the accent -- and a
# switch: a 51x31 track at x 333, a 27pt knob 2 in from the end it rests
# against, and no shadow on either state.
def settings_head(title, back):
    return ((icon("back", 11.67, 73.67, 17.33, 14.67, "var(--x-ink)") if back else "")
            + txc(0, 66.67, 393, title, "t-head")
            + txc(0, 86.67, 393, AT, "t-meta", "var(--x-ink-2)")
            + tx(336.67, 75.0, "Done", "t-save"))


def toggle(y, on):
    return (box(333, y, 51, 31, "border-radius:15.5px;background:var(--x-track-%s)"
                % ("on" if on else "off"))
            + circle(355 if on else 335, y + 2, 27, "background:var(--x-inv)"))


# ----------------------------------------------------------------- 08-09 ----
# Explore settings, the two states of one switch. Each toggle row carries a
# two-line description whose baselines sit 16.33 apart, not the 19 its size
# carries elsewhere, so both lines are placed here and nothing wraps.
# The counter-intuitive half: while the location switch is ON the picker under
# it is dimmed, and turning the switch off is what hands the picker back.
def explore(title, on):
    picker = (tx(10.0, 251.33, "Explore locations", "t-row")
              + tx(311.33, 251.67, "Select", "t-body", "var(--x-ink-2)")
              + icon("chevron-right", 371.67, 251.33, 7.33, 12.67, "var(--x-ring)"))
    return screen(title,
        settings_head("Explore settings", False)
        + tx(10.0, 113.33, "Location", "t-sect")
        + tx(9.33, 160.33, "Show content in your current location", "t-row")
        + toggle(151.0, on)
        + tx(9.33, 191.33, "When this is on, you’ll see what’s happening around "
             "you right", "t-count", "var(--x-ink-2)")
        + tx(9.33, 207.67, "now.", "t-count", "var(--x-ink-2)")
        + ('<div class="b" style="left:0;top:0;width:393px;height:852px;'
           'opacity:var(--x-dim)">%s</div>' % picker if on else picker)
        + rule(286.0)
        + tx(10.0, 307.67, "Personalization", "t-sect")
        + tx(9.33, 354.67, "Trends for you", "t-row")
        + toggle(345.67, True)
        + tx(9.33, 385.33, "You can personalize the trends for you based on your "
             "location", "t-count", "var(--x-ink-2)")
        + tx(9.33, 401.67, "and who you follow.", "t-count", "var(--x-ink-2)"))


def s08():
    return explore("Explore settings", True)


def s09():
    return explore("Explore location off", False)


# -------------------------------------------------------------------- 10 ----
# Explore. Avatar, search pill and gear across the top, five category tabs
# under them, a live event graphic, then news items -- a headline over a
# facepile and a line of meta. The page is white the whole way down: the nav
# is a rule and five glyphs, with no band under them.
TABS_10 = [("For You", 9.67, "var(--x-ink)"), ("Trending", 79.33, "var(--x-ink-2)"),
           ("News", 160.33, "var(--x-ink-2)"), ("Sports", 216.67, "var(--x-ink-2)"),
           ("Entertainment", 282.67, "var(--x-ink-2)")]
# (the headline's lines as (ink top, x, text), then the meta's ink top, x and
# text). Each facepile sits 24.67 under its headline's ink.
NEWS = [([(445.00, 9.33, "Troll 2 Brings Bigger Monsters to Netflix Worldwide")],
         478.00, 83.67, "18 hours ago · Entertainment · 507 posts"),
        ([(541.67, 10.00, "Freen Sarocha Shines at Longchamp Spring/Summer"),
          (559.33, 9.67, "2026 Preview in Bangkok")],
         592.33, 83.67, "21 hours ago · Entertainment · 86K posts"),
        ([(655.67, 9.33, "42 Years Since MTV's Thriller Video Premiere")],
         688.67, 83.33, "Trending now · Entertainment · 310 posts")]
# 10's Home is the outline, not 02's filled one, and its Search is the bold
# active cut rather than the thin one 04 and 02 use. The other three are 02's.
NAV_10 = [("home", 29.33, 782.33, 20.00, 21.00),
          ("search-bold", 107.67, 782.67, 20.67, 20.67)] + NAV[2:]


def s10():
    news = "".join(
        "".join(tx(x, y, s, "t-row") for y, x, s in lines)
        + art("10-pile-%d" % n)
        + tx(mx, my, meta, "t-count", "var(--x-ink-2)")
        for n, (lines, my, mx, meta) in enumerate(NEWS, 1))
    return screen("Explore",
        art("10-hero")
        + tx(10.33, 306.0, "LIVE", "t-note", "var(--x-inv)")
        + tx(9.33, 329.33, "AWS re:Invent 2025", "t-name", "var(--x-inv)")
        + pic("profile-avatar", 16, 64, 32, 32, "border-radius:50%")
        + box(64, 61, 273, 39,
              "border-radius:var(--x-r-search);background:var(--x-field)")
        + icon("search", 166.67, 73.67, 14.0, 14.0, "var(--x-ink-2)")
        + tx(186.33, 74.67, "Search", "t-field", "var(--x-ink-2)")
        + icon("gear", 354.67, 70.67, 20.67, 20.67, "var(--x-ink)")
        + "".join(tx(x, 119.67, label, "t-row", col) for label, x, col in TABS_10)
        + box(5.0, 144.0, 60.33, 3.33,
              "border-radius:1.5px;background:var(--x-accent)")
        + rule(375.33)
        + tx(9.33, 391.33, "Today's News", "t-head")
        + news
        + rule(518.0, 9.0, 375.0, "hairline-2")
        + rule(632.33, 9.0, 375.0, "hairline-2")
        # the fourth item's headline, one word of it above the fold
        + tx(9.67, 752.67, "Costco", "t-row")
        + circle(328, 704, 56, "background:var(--x-accent);"
                               "box-shadow:0 4px 12px rgba(0,0,0,.18)")
        + icon("plus", 348.33, 724.33, 15.33, 15.33, "var(--x-inv)")
        + rule(768.67)
        + "".join(icon(n, x, y, w, h, "var(--x-ink)") for n, x, y, w, h in NAV_10)
        + circle(44.33, 778.33, 6, "background:var(--x-accent)")
        + circle(280.33, 777.33, 16, "background:var(--x-accent)")
        + txc(280.33, 780.67, 16, "5", "t-badge", "var(--x-inv)"))


# ----------------------------------------------------------------- 11-12 ----
# Push notifications, fourteen rows in two sections. Five open a screen of
# their own -- a chevron, and all but Posts an "On" beside it -- and nine
# carry a switch. 12 is 11 with one of them off.
# (label ink top, label, whether "On" sits before the chevron). All at x 10.
PUSH_ROWS = [(159.67, "Posts", False), (203.00, "Mentions and replies", True),
             (247.67, "Reposts", True), (291.00, "Likes", True),
             (471.00, "Message reactions", True)]
# (label ink top, label x, label, the track's own top)
PUSH_TOGGLES = [(336.67, 10.00, "Photo tags", 327.00),
                (381.67, 10.00, "New followers", 372.33),
                (427.00, 10.00, "Direct Messages", 417.33),
                (516.33, 9.67, "Contact joins X", 507.00),
                (619.67, 10.00, "Recommendations from your network", 609.67),
                (665.00, 10.00, "Recommendations", 655.00),
                (710.33, 9.33, "Topics", 700.33),
                (756.00, 10.00, "Broadcasts &amp; Spaces", 745.67),
                (801.00, 10.00, "News / Sports", 791.67)]


def push(title, off):
    """11 has every switch on; 12 turns one off, named here."""
    rows = "".join(
        tx(10.0, y, label, "t-row")
        + (tx(333.67, y + 0.33, "On", "t-body", "var(--x-ink-2)") if on else "")
        + icon("chevron-right", 371.67, y + 0.5, 7.33, 12.67, "var(--x-ring)")
        for y, label, on in PUSH_ROWS)
    return screen(title,
        settings_head("Push notifications", True)
        + tx(10.0, 113.67, "Related to you and your posts", "t-sect")
        + rows
        + "".join(tx(x, y, label, "t-row") + toggle(ty, label != off)
                  for y, x, label, ty in PUSH_TOGGLES)
        + rule(551.0)
        + tx(10.0, 572.67, "In-app notifications from X", "t-sect")
        + rule(835.67))


def s11():
    return push("Push notifications", None)


def s12():
    return push("New followers off", "New followers")


# ----------------------------------------------------------------- 13-15 ----
# Turning on a reminder. 15 is the page all three are built on: a purple wash
# behind the status bar, the host's card under it, a heading, three event rows
# each with a bell at the right, the Spaces button and a LIVE card sliding
# under the nav -- which is 02's five glyphs over a wash that runs down rather
# than across. 13 lifts a sheet over that page for the second of those events,
# and 14 is 13 a tap later: a confirmation banner at the top and the first
# button set. The page under the sheet is 15 unchanged beneath --x-veil, to
# the pixel: card, heading and page top all sit at the same y on all three,
# and the veil is one black over every one of them bar the status band, which
# --x-veil's row measures and these two ship 13 levels short of.

# (tile top, the host's name and its x, the title's lines as (x, text), the
# time as (x, ink top, text), the going count the same way, whether the bell
# is already set). A name's ink sits 4.00 under its own tile and the title
# lines run on 20.33, so only the two runs below them carry their own tops:
# row 3 has one title line fewer and everything under it rides up.
EVENTS = [
 (264, ("Kash", 102.00),
  [(101.67, "NUAI 101 with Will Gray"), (102.00, "(CEO) and Charlie Nelson"),
   (102.00, "(Executive Director)")],
  (101.33, 357.00, "Today at 2:00 PM"), (101.33, 381.00, "414 going"), False),
 (419, ("Moby Media", 102.00),
  [(101.67, "RWA-Investment: The"), (101.67, "Future of Real Estate,"),
   (101.67, "Fractionally yours! \U0001F399\uFE0F")],
  (101.33, 512.00, "Today at 5:00 PM"), (101.67, 535.67, "225 going"), True),
 (574, ("Tom Dante", 101.33),
  [(101.00, "Stories from 25 years as"), (101.33, "a trader")],
  (102.00, 646.67, "Dec 14, 2025 at 3:00 PM"),
  (101.67, 670.33, "26K going"), False),
]


def calendar():
    """15's page, which is also what 13 and 14 dim. The LIVE card at the foot
    shows two and a half points of itself before the nav covers the rest."""
    rows = "".join(
        box(8.83, top, 80.67, 80.67,
            "border-radius:var(--x-r-tile);background:var(--x-spaces)")
        + art("15-tile-%d" % n, "border-radius:50%")
        + circle(339.67, top, 44.33,
                 "background:var(--x-inv);border:1px solid var(--x-border)"
                 if on else "background:var(--x-ink)")
        + icon("bell-check" if on else "bell-plus", 354.67, top + 14.0,
               14.67 if on else 15.67, 16.67,
               "var(--x-ink)" if on else "var(--x-inv)")
        + tx(nx, top + 4.0, name, "t-body", "var(--x-ink-2)")
        + "".join(tx(x, top + 26.33 + 20.33 * i, s, "t-event")
                  for i, (x, s) in enumerate(lines))
        + tx(tx_, ty, time, "t-body", "var(--x-spaces)")
        + tx(gx, gy, going, "t-note", "var(--x-ink-2)")
        for n, (top, (name, nx), lines, (tx_, ty, time), (gx, gy, going), on)
        in enumerate(EVENTS, 1))
    return (box(0, 0, 393, 58.5, "background:var(--x-wash)")
            + box(8.82, 59, 375.18, 9, "background:var(--x-spaces)")
            + box(8.82, 68, 375.18, 90.33,
                  "border-radius:0 0 var(--x-r-sheet) var(--x-r-sheet);"
                  "background:var(--x-spaces-2)")
            + art("15-avatar", "border-radius:50%")
            + tx(44.0, 86.33, "IG NEWMAN", "t-pill", "var(--x-inv)")
            + box(132.67, 84.0, 36.67, 16.0,
                  "border-radius:var(--x-r-chip);background:var(--x-chip-card)")
            + tx(137.67, 87.33, "Host", "t-count", "var(--x-inv)")
            + tx(19.0, 114.0, "Evangelist,President Rock of Ages", "t-body",
                 "var(--x-inv)")
            + tx(19.0, 131.67, "Empowerment Foundation", "t-body", "var(--x-inv)")
            + tx(9.67, 195.0, "Get these in your calendar", "t-cal")
            + tx(10.0, 222.0, "People you follow will be tuning in", "t-body",
                 "var(--x-ink-2)")
            + rows
            + circle(327, 704, 58, "background:var(--x-spaces);"
                                   "box-shadow:0 4px 12px rgba(0,0,0,.18)")
            + icon("spaces", 346, 720, 21, 22, "var(--x-inv)")
            + box(8.82, 744.33, 375.18, 66,
                  "border-radius:var(--x-r-sheet) var(--x-r-sheet) 0 0;"
                  "background:var(--x-spaces)")
            + tx(41.0, 766.0, "LIVE", "t-note", "var(--x-inv)")
            + box(0, 768.5, 393, 83.5, "background:var(--x-nav-2)")
            + "".join(icon(n, x, y, w, h, "var(--x-ink)") for n, x, y, w, h in NAV)
            + circle(44.33, 778.33, 6, "background:var(--x-accent)"))


def s15():
    return screen("Spaces in your calendar", calendar())


def pill(y, on=False):
    """One of the sheet's three 52pt buttons, at x 16 and 361 wide."""
    return box(16, y, 361, 52, "border-radius:var(--x-r-pill);" + (
        "background:var(--x-ink)" if on else "border:1px solid var(--x-border)"))


def reminder(title, first, banner=""):
    """13 and 14. They differ in the first of the three buttons and in 14's
    banner, which is the one thing the veil does not reach."""
    return screen(title,
        calendar()
        + box(0, 0, 393, 852, "background:var(--x-veil)")
        + banner
        + box(0, 356, 393, 496, "border-radius:var(--x-r-modal) "
              "var(--x-r-modal) 0 0;background:var(--x-ground)")
        + box(179.0, 361.67, 34.67, 5.0,
              "border-radius:2.5px;background:var(--x-field)")
        + txc(0, 381.67, 393, "Moby Media&rsquo;s Space", "t-event")
        + icon("close", 357.67, 380.33, 14.67, 15.0, "var(--x-ink)")
        + box(16, 425.67, 361, 168.33,
              "border-radius:var(--x-r-sheet);background:var(--x-spaces)")
        + art("13-avatar", "border-radius:50%")
        + tx(50.0, 443.0, "Moby Media", "t-pill", "var(--x-inv)")
        + icon("verified", 138.67, 439.67, 17.33, 17.0, "var(--x-inv)")
        + box(161.33, 440.33, 36.67, 16.0,
              "border-radius:var(--x-r-chip);background:var(--x-chip-card)")
        + tx(166.33, 443.67, "Host", "t-count", "var(--x-inv)")
        + "".join(circle(x, 451.67, 2.67, "background:var(--x-inv)")
                  for x in (348.0, 352.67, 357.33))
        + tx(26.0, 475.33, "RWA-Investment: The Future of", "t-space-2",
             "var(--x-inv)")
        + tx(26.0, 499.0, "Real Estate, Fractionally yours! \U0001F399\uFE0F",
             "t-space-2", "var(--x-inv)")
        + icon("calendar", 27.0, 561.0, 14.0, 14.0, "var(--x-inv)")
        + tx(48.0, 562.67, "Dec 08 at 5:00 PM &middot; 226 going", "t-row",
             "var(--x-inv)")
        + first
        + pill(682) + txc(16, 702.33, 361, "Add to calendar", "t-btn")
        + pill(746) + txc(16, 766.33, 361, "Share", "t-btn"))


def s13():
    return reminder("Set a reminder",
        pill(618, True)
        + txc(16, 638.33, 361, "Set reminder", "t-btn", "var(--x-inv)"))


def s14():
    # the banner's shadow is the one number on these three boards that is not
    # measured: the capture fades #62737B to the dimmed ground over 6.5pt
    # below y 169, which is about a 3pt drop at an 8pt blur and .16 black
    banner = (box(10.67, 69, 371.33, 100,
                  "border-radius:var(--x-r-sheet);background:var(--x-banner);"
                  "box-shadow:0 3px 8px rgba(0,0,0,.16)")
              + circle(23.33, 90.33, 21.33, "background:var(--x-accent)")
              + icon("check-bold", 29.73, 97.73, 8.33, 7.33, "var(--x-inv)")
              + tx(58.0, 93.33,
                   "All set. You&rsquo;ll get a notification when it starts.",
                   "t-body")
              + box(21.67, 124.67, 349.33, 32.33,
                    "border-radius:var(--x-r-play);background:var(--x-accent)")
              + txc(21.67, 135.67, 349.33, "Share with a post", "t-tag",
                    "var(--x-inv)"))
    return reminder("Reminder set",
        pill(618)
        + circle(131.33, 633.33, 21.33, "background:var(--x-ink)")
        + icon("check-bold", 137.4, 640.4, 8.67, 8.0, "var(--x-inv)")
        + tx(163.0, 638.33, "Reminder set", "t-btn"),
        banner)


# (stem, canvas label, board, capture). The capture number is Mobbin's export
# order, which the deck no longer follows: the profile pair leads it.
SCREENS = [
    ("01-edit-profile", "Edit profile", s01, 6),
    ("02-profile", "Professional profile", s02, 7),
    ("03-professional-splash", "X for Professionals", s03, 1),
    ("04-select-category", "Select a category", s04, 2),
    ("05-category-selected", "Category selected", s05, 3),
    ("06-select-account-type", "Select an account type", s06, 4),
    ("07-welcome", "Welcome", s07, 5),
    ("08-explore-settings", "Explore settings", s08, 8),
    ("09-explore-location-off", "Explore location off", s09, 9),
    ("10-explore", "Explore", s10, 10),
    ("11-push-notifications", "Push notifications", s11, 11),
    ("12-new-followers-off", "New followers off", s12, 12),
    ("13-set-a-reminder", "Set a reminder", s13, 13),
    ("14-reminder-set", "Reminder set", s14, 14),
    ("15-calendar", "Spaces in your calendar", s15, 15),
]


# ------------------------------------------------------ tokens + evidence ----
SHEET = """body{padding:0;background:#FFF;color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:14px 20px 8px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 10.5px/13.5px var(--x-font);color:var(--x-ink-2);margin-bottom:4px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-2);margin:5px 0 3px}
.grid{column-count:2;column-gap:12px}
.sw{display:flex;align-items:center;gap:5px;height:10.2px;break-inside:avoid;white-space:nowrap}
.sw .chip{width:16px;height:9px;flex:none;border-radius:3px;border:1px solid var(--x-border);background-color:#888}
.sw b{font:600 7.5px/10.5px ui-monospace,Menlo,monospace}
.sw i{font:400 7.5px/10.5px ui-monospace,Menlo,monospace;color:var(--x-ink-2);font-style:normal}
.foot{display:flex;gap:28px;align-items:flex-start;margin-top:4px}
.foot h2{margin-top:0}
.rad{display:flex;gap:6px;flex-wrap:wrap;width:250px}
.rb{width:36px;height:22px;background:var(--x-field);border:1px solid var(--x-border)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-2);font-style:normal;text-align:center}
.ty{column-count:3;column-gap:12px}
.tr{break-inside:avoid;border-bottom:1px solid var(--x-border)}
.tr span{display:block;white-space:nowrap;overflow:hidden;line-height:1}
.tr em{display:block;font:400 7px/9px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2);font-style:normal;white-space:nowrap}
.met{font:400 8px/9.5px ui-monospace,Menlo,monospace;color:var(--x-ink);white-space:nowrap}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-border);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:#0A60FF}
td.v{color:var(--x-ink);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-ink-2)}"""


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
                '<p>Fifteen Mobbin captures at exactly 3 px per pt. One face (SF Pro), '
                'one type ladder fitted by ink width, and a palette that is almost '
                'entirely white, two greys and one blue &mdash; plus the switch '
                'green the settings screens turn on and off, and the purples '
                'Spaces brings: a nav wash on 02, a second one under 13-15, two '
                'card fills and the veil 13 and 14 dim the page with. Five of '
                'these have no screen left to sit on: they were read off the '
                'Spaces card and the post&rsquo;s Host chip that p7 shows and '
                'that board 02, which carries the example account&rsquo;s own '
                'timeline, does not draw.</p>'
                '</header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2>'
                '<div class="rad">%s</div></div>'
                '<div><h2>Metrics</h2><div class="met">%s</div></div></div></div>'
                % (NAME, swatches, radii, met), SHEET)


def type_board():
    # --x-tr-text is in this group and is not a font: it is the tracking track()
    # puts on every run under 20px, so each such specimen wears it and says so
    rows = "".join(
        '<div class="tr"><span style="font:var(--x-%s)%s">%s</span>'
        '<em>--x-%s &middot; %s%s</em></div>'
        % (n, track(n), USER, n, v.split(" var")[0],
           " + --x-tr-text" if track(n) else "")
        for _, n, v, _ in _of("Type") if n in TY)
    return page(NAME + " - Type Tokens",
                '<div class="sheet"><header><h1>%s type</h1>'
                '<p>Every size is fitted to a measured ink width, so several are off '
                'the iOS ladder. The evidence rows carry the widths.</p>'
                '</header><div class="ty">%s</div></div>' % (NAME, rows), SHEET)


EV_LINES = 56     # a page of 60 estimated lines fits the board, 62 does not


def evidence_boards():
    # a row wraps its evidence at about 62 characters, so a page breaks by
    # lines rather than by rows
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
    for stem, label, _, cap in SCREENS:
        f = REFS_DIR / ("p%d.png" % cap)
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone"><img src="%s" alt="%s"></div>' % (uri, label),
                    REF_CSS))


# ----------------------------------------------------------------- main ----
def layout():
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"},
                       {"file": "00a-type-tokens", "label": "Type tokens"}]
                      + [{"file": n, "label": "Evidence"}
                         for n, _ in evidence_boards()]},
            {"title": "Screens", "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _, _ in SCREENS]}]
    # declared even though ref-*.html is gitignored: the canvas skips a row
    # entry whose file is absent and drops the row when none of them resolve,
    # so this one file is the same on a clean checkout as it is beside the
    # captures -- which is what makes `python3 gen.py` a no-op either way
    rows.append({"title": "Source of truth: the captures", "numbered": True,
                 "files": [{"file": "ref-" + s, "label": l}
                           for s, l, _, _ in SCREENS]})
    rows += json.loads((BRAND_DIR / "manifest.json").read_text())
    return {"name": PAGE_NAME, "cover": "02-profile", "rows": rows}


def main():
    cut()
    files = dict([("00-design-tokens", token_board()), ("00a-type-tokens", type_board())]
                 + list(evidence_boards())
                 + [(s, fn()) for s, _, fn, _ in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    (OUT / "layout.json").write_text(json.dumps(layout(), indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(layout()["rows"])))


if __name__ == "__main__":
    main()
