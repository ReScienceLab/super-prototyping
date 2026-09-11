"""Emit mockups/canvases/app-store-ios/ from nine iPhone 16 Pro captures.

Nine App Store screens: the notification onboarding pane and its system
permission alert, the five tab roots (Today, Games, Apps, Arcade, Search),
the Apple Account sheet, and the sign-in sheet with the keyboard up.

The captures are 1206 x 2622, which is an iPhone 16 Pro at exactly @3x, so
SCALE is 3.0 and the frame here is the real 402 x 874 pt rather than this
repo's usual 393 x 852. That makes `refkit shoot --scale 3` land on the
capture's own pixel grid with no downscale between render and diff.

    python3 mockups/canvases/app-store-ios/gen.py

Artboards are output. Edit this file, never the HTML.
"""
import base64
import io
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
ICON_DIR = OUT / "assets" / "icons"
SCALE = 3.0                                      # capture px per design pt

NAME = "App Store"
PAGE_NAME = NAME
P = "as"          # token prefix: --as-bg, --as-ink, --as-t-row

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Values are written with the placeholder
# prefix --x- throughout this file and rewritten to P on the way out.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on the 34pt large title: SF Compact .744 / SF Pro .709, no "
  "call between the cuts; the family is SF, so the platform stack is right"),

 ("Surface", "bg",       "#FFFFFF",  "page ground, p6 col 100 y 782-790 and row 34 x 367-400, 100% flat"),
 ("Surface", "fill",     "#EEEEEF",  "Get/Open pill, p6 row 600 x 308-382, one run"),
 ("Surface", "fill-2",   "#EBEBEB",  "selected tab capsule, p6 row 820 x 162.5-239.3, one run"),
 ("Surface", "chip",     "#FFFFFF",  "category chip, p6 col 100 y 126-163 pure white between two shadow ramps"),
 ("Surface", "circle",   "#F9F9FA",  "account button disc, p6 row 82 x 342-357 and 367-386"),
 ("Surface", "tint",     "#EDF6FF",
  "the promoted row's card, p8 row 214 x 30-380, 99.9% flat"),
 ("Surface", "badge",    "#86C0FD",
  "the Ad badge, p8 94-115 x 260-270, 99.7% flat with white ink"),
 ("Surface", "sky",
  "linear-gradient(#023254,#034B72 41%,#04608A 72%,#056792 85%,#1A719E)",
  "p7 rows 0-136 are a smooth vertical ramp - row means #023254 at 0, #034B72 "
  "at 56, #04608A at 98, #056792 at 116, #18709D at 134, per-row sd under 7 "
  "everywhere the title ink is not"),
 ("Surface", "scrim",    "rgba(0,0,0,.20)",
  "p1 and p4 read #CCCCCC above the sheet where the page is white, and p2, which "
  "stacks a second scrim for its alert, reads #A3A3A3: 255 x .8 = 204, 204 x .8 = 163"),
 ("Surface", "group",    "#F2F2F6",  "p4 sheet ground, col 201 y 62-167 and row 100 x 330-341, flat"),
 ("Surface", "haze",     "#F9FAFA",
  "p9's page behind its sheet, blurred to one tone: #C7C8C8 under --x-scrim, row 32 x 285-293"),
 ("Surface", "disc",     "#FAFAFB",  "p9 close button, col 38 y 84.7-98.0"),
 ("Surface", "disc-2",   "#F5F5F9",  "p4 close button over --x-group, row 100 x 342.0-361.7 and 365.7-386.0"),
 ("Surface", "back",     "#E0E0E0",
  "p2 the sheet the pane is stacked on, #B3B3B3 at row 66 x 34.3-367.7 under the alert's --x-scrim"),
 ("Surface", "alert",    "rgba(255,255,255,.60)",  "p2 alert glass over the dimmed pane"),
 ("Surface", "alert-btn","rgba(0,0,0,.12)",
  "p2 alert buttons #C8C8C8 at col 127 y 524.7-542.0 against the glass's #E6E6E6 below them"),
 ("Surface", "kbd",      "#E2E3E7",
  "p9 keyboard panel, col 201 y 552-874 and the 6pt gaps between keys, flat"),
 ("Surface", "glass-pill", "rgba(255,255,255,.41)",
  "Get pill set over artwork: p6 #888791 over #303448, p5 #DCBCB1 over #C08E7D, "
  "p3 card 2 #BE73D0 over #9416B1; white at .40-.44 on every channel"),
 ("Surface", "glass-price", "rgba(255,255,255,.12)",
  "p3 card 1 price pill #6C8E12 over the band's #587B00, .12 on red and .14 on green"),

 ("Line", "hairline",    "#DFDFDF",  "app-icon rim, p6 col 50 y 569.3-570.3 and 630.3-631.3, both 1pt"),
 ("Line", "border",      "#B0AFB0",  "tab-bar pill rim, p6 row 822 x 20.7-21.0 and 381.0-381.3"),
 ("Line", "sep",         "#E7E7E8",  "p4 row separator, col 201 y 217.0-218.0, all three samples"),
 ("Line", "kbd-sep",     "#D3D4DA",  "p9 Passwords bar dividers, 1pt at x 30.5 and 371.5, y 559-583"),

 ("Ink", "ink",          "#000000",  "large title core, p6 x 22-100 y 75-98 --only ink"),
 ("Ink", "ink-2",        "#8A8A8E",  "card subtitle core, p6 'All-day coverage on ABC News' --only ink"),
 ("Ink", "ink-3",        "#BFBFBF",  "inactive cellular bars, p6 row 34 x 288-307, four solid runs"),
 ("Ink", "ink-inv",      "#FFFFFF",  "Arcade hero copy, p7"),
 ("Ink", "ink-dim",     "#707172",
  "p7 footnote over pure black, the brightest 5% of its ink"),
 ("Ink", "ink-note",    "#85858B",  "p4 footnote core, both lines --only ink"),
 ("Ink", "ink-ph",      "#BCBCC1",  "p9 'Email or Phone Number' core over --x-group"),
 ("Ink", "ink-chev",    "#C5C5C7",  "p4 'App Updates' chevron core, 361.0-367.7 x 349.0-360.3"),
 ("Ink", "ink-alert",   "#838383",  "p2 alert message core, lines 1 and 2, as it lands on the glass"),
 ("Ink", "ink-kbd",    "#494A4B",  "p9 'Passwords' core, ink 171.0-250.7 x 564.3-577.3, and its key glyph"),
 ("Ink", "ink-hint",    "#CDCED0",  "p9 the space bar's 'A' hint, darkest sample of 187.0-196.0 x 787.3-801.0"),
 ("Ink", "ink-off",     "#E5E6E9",  "p9 the return key's chevron, darkest sample of 345.7-352.3 x 772.0-788.0"),
 ("Ink", "ink-glass",   "rgba(255,255,255,.70)",
  "lockup subtitles over artwork: p6 core #BFC4D1 over #2F3E6A, p5 .70; p7 'Arcade' "
  "#CCD2D7 over #536D81 at .69-.70, and its Apple logo .72"),
 ("Ink", "ink-glass-2", "rgba(255,255,255,.55)",
  "p3 'Brain Puzzle Games' #C795D8 over #9114AE (.49-.55), p5 'In-App Purchases' .59, "
  "p3 '$12.99' .46-.50 over its own pill"),
 ("Ink", "ink-promo",   "#FFFF7D",
  "p3 card 1 yellow: 'GET STARTED' core #FFFF85, its subtitle and 'Sketch. Paint. Create.' #FFFF76"),

 ("Accent", "accent",    "#0082F7",  "selected tab glyph, p6 x 196-206 y 807-812, 308px 100% flat"),
 ("Accent", "accent-2",  "#0088FE",  "Get/Open label, p6 row 600, seven runs inside the pill"),
 ("Accent", "accent-3",  "#007AFF",  "p7 Accept Offer fill, x 70-140 y 480-512, 100% flat"),

 ("Radius", "r-card",    "26px",
  "p4 card 1 spans 179.0-257.3 at x 20 against 167-269 at x 201; an inset of 12.0 "
  "four points in from the edge solves r 25.8"),
 ("Radius", "r-sheet",   "38px",
  "sheet top edge 17.3 down at x 6, 16.0 at x 7 and 4.7 at x 20; all three solve r 37.7"),
 ("Radius", "r-alert",   "34px",     "p2 alert, col 50 (9 in from the left edge) meets the glass at y 355.0; r 34 predicts 354.96"),
 ("Radius", "r-chip",    "18.5px",   "half the 37pt chip height; p6 row 130 left edge 26.7 solves 19.7 -> 20"),
 ("Radius", "r-pill",    "999px",    "by construction, not measured"),
 ("Radius", "r-key",     "6px",
  "p9 'w' key's top-left edge 2.7 in at 1pt down, 1.7 at 2 and 1.0 at 3: r 6 predicts 2.7, 1.5, .8"),
 ("Radius", "r-kbd",     "28px",
  "p9 keyboard panel from its top at 545.3: 16.7 in at 548, 6.7 at 555, 3.3 at 560; r 28 predicts 16.1, 6.8, 3.4"),
 ("Radius", "r-phone",   "62px",     "circular stand-in for the 16 Pro display corner"),

 ("Type", "t-title",     "700 34px/41px var(--x-font)",
  "cap 24.3 at y 72.0 on p3 'T', p5 'G' 24.7, p8 'S' 24.7; 24.3/.7147 = 34.0"),
 ("Type", "t-section",   "700 21px/26px var(--x-font)",
  "p6 'Must-Have Apps' ink 162.7 wide; the same string at 22px renders 170.0, and the 'M' cap 14.7 against 15.3 agrees on the same 0.95"),
 ("Type", "t-group",     "700 16px/20px var(--x-font)",
  "p8 'Suggested' with its chevron 94.0 wide and 'Browse' 67.7; at t-section they render 121.3 and 87.3, both 0.775 of it"),
 ("Type", "t-row",       "400 16px/18px var(--x-font)",
  "p6 'YouTube' ink 60.3 wide by 11.7 tall; at 17px it renders 63.7 by 12.3, and both ratios land on 0.95"),
 ("Type", "t-sub",       "400 12px/21px var(--x-font)",
  "p6 'Videos, Music and Live Streams' ink 178.3 wide by a 'V' cap of 8.7; at 14px the same string renders 203.7 by 10.3; "
  "p3 'Sketch. Paint. Create.' 120.3, 'Brain Puzzle Games' 110.7 and card 1's 207.7 subtitle all render exactly at it"),
 ("Type", "t-chip",      "600 14px/19px var(--x-font)",
  "p6 'Entertainment' ink 92.0 by 11.0; at 15px it renders 100.3 by 12.0"),
 ("Type", "tr-tight",    "-0.2px",
  "the chip, eyebrow and row subtitle each render 2-3 wide at the size their cap height asks for; one tracking value closes all three"),
 ("Type", "t-cta",       "600 15px/20px var(--x-font)",
  "p6 'Open' inside the 74 x 32 pill at x 308-382"),
 ("Type", "t-iap",       "400 8px/11px var(--x-font)",
  "p6 'In-App Purchases' ink 310.0-379.0, 69.0 wide by a cap of 7.3, cap top 700.3"),
 ("Type", "t-lock",      "600 14px/18px var(--x-font)",
  "lockup titles set over artwork: p6 'ABC News: Live Breaking Ne...' ink 201.0, p5 'Disney "
  "Solitaire' 102.7, p3 'Procreate' 64.0, 'Meowdoku!' 75.3, 'Royal Match' 79.7; 14px renders "
  "202.0/103.0/64.0/75.3/80.3"),
 ("Type", "t-lock-sub",  "400 11px/14px var(--x-font)",
  "p6 'Live headlines & daily alerts' ink 144.3 and p5 'Play a Magic Puzzle Card Game' "
  "163.7; 11px renders both to the third"),
 ("Type", "t-price",     "700 15px/20px var(--x-font)",
  "p3 '$12.99' ink 49.0 by 12.7; 15px renders 49.3 by 12.7"),
 ("Type", "t-tile",      "600 16px/19.33px var(--x-font)",
  "p8 'Top Downloaded' ink 124.3 and 'Apps' 38.0 on a 19.33 pitch; 16px renders 124.7 and 38.0"),
 ("Type", "t-wordmark",  "500 20px/24px var(--x-font)",
  "p7 'Arcade' ink 176.67-239.33 = 62.7 by a cap of 15.0; 20px renders 63.0 by 15.0 - see --x-tr-wordmark"),
 ("Type", "tr-wordmark", "-0.05px",
  "closes the 20px 'Arcade' from 63.0 to the 62.7 measured with the logo erased out of the box; -.45 rendered 60.7"),

 ("Type", "t-head",      "600 21px/26px var(--x-font)",
  "p6 '9/11: 25 Years Later' ink 177.0 by 19.0; the width wants 19.5px and the height 21.2, and only tracking reconciles them - see --x-tr-head"),
 ("Type", "t-headsub",   "400 22px/26px var(--x-font)",
  "p6 'All-day coverage on ABC News' ink 283.0, cap tops 24.0 below the head"),
 ("Type", "t-eyebrow",   "700 11px/16px var(--x-font)",
  "p6 'TONIGHT 8:00 PM' ink 97.7 by 8.3; at 12px it renders 113.0 by 9.0"),
 ("Type", "tr-head",     "-0.5px",
  "tracking that closes the 21px head from 186.3 rendered to the 177.0 measured"),
 ("Type", "t-ssub",      "400 14px/18px var(--x-font)",
  "p5 'These favorites are always a great choice' ink 264.3 wide, cap top 560.3"),
 ("Type", "t-ph",        "400 16px/20px var(--x-font)",
  "p8 'Games, Apps, Stories, and More' ink 54.7-292.3, cap top 130.7"),
 ("Type", "t-ad",        "600 10px/13px var(--x-font)",
  "p8 'Ad' white on the 25 x 16 badge at 92.0-117.0 x 257.0-273.0"),
 ("Type", "t-tab",       "500 10px/12px var(--x-font)",
  "p6 tab labels, cap top 832.3, 'Arcade' cap 7.3, 'Games' 7.7"),
 ("Type", "t-hero",      "700 26px/32px var(--x-font)",
  "p7 'Ads. Just Fun.' ink 168.3 wide by a cap of 19.3; at 28px it renders "
  "180.0 wide, and the two cap tops are 396 and 428"),
 ("Type", "t-btn",       "600 16.5px/22px var(--x-font)",
  "p7 'Accept Offer' ink 98.3 wide by 15.0 tall, centred on the 281.4 pill; "
  "at 17px it renders 101.3 by 15.7 and both ratios land on the same 0.97"),
 ("Type", "t-foot",      "400 12px/16px var(--x-font)",
  "p7 '1 month free, then $6.99/month.' ink 180.7 wide by 11.3 tall; at 15px "
  "it renders 219.0 by 14.3"),
 ("Type", "t-areye",     "600 12px/16px var(--x-font)",
  "p7 row eyebrow 'Apple Arcade' ink 76.7 wide, its 'A' cap 702.3-711.0 = 8.7; p3 'GET "
  "STARTED' 81.7 and 'OUR FAVORITES' 95.0 render 81.7 and 95.3 at it"),
 ("Type", "t-pane",      "700 27px/32px var(--x-font)",
  "p1 headline ink 253.0 and 159.3 wide on a 32 pitch; at 28px the two lines render "
  "262.7 and 165.7, both .96; p3 '5 Tips for Procreate' 243.0 by 24.7 renders exactly at it"),
 ("Type", "t-lede",      "400 21px/26px var(--x-font)",
  "p1 message, four forced lines 260.0/329.0/216.0/163.0 wide; at 20px all four "
  "render 1.04 narrow and 1.05 short"),
 ("Type", "t-go",        "600 16px/22px var(--x-font)",
  "p1 'Continue' ink 66.7 and p9 'Sign In' 50.0; at 17px they render 70.7 and 52.7, .94-.95"),
 ("Type", "t-link",      "600 16px/22px var(--x-font)",
  "p1 'Not Now' ink 63.3 by a cap of 12.0; at 17px it renders 66.7 by 12.3"),
 ("Type", "t-body",      "400 16px/22px var(--x-font)",
  "p4 rows 170.7/193.7/93.7/135.3 wide, p9 field 169.0 and link 127.3; at 17px "
  "all six render .95 of that, the same .95 --x-t-row found"),
 ("Type", "t-sheet",     "600 17px/22px var(--x-font)",
  "p4 'Apple Account' ink 113.0 by 15.7; at 18px it renders 122.3 by 16.7"),
 ("Type", "t-note",      "400 12px/14px var(--x-font)",
  "p4 footnote ink 291.0 and 166.3 wide by 11.3, pitch 14; at 13px it renders .934 of both"),
 ("Type", "t-signin",    "700 21px/28px var(--x-font)",
  "p9 'Sign In to Complete Purchase' ink 287.3 by 20.0; at 22px it renders 299.7 by 20.7"),
 ("Type", "t-alert",     "600 17px/22px var(--x-font)",
  "p2 alert title ink 248.0 and 134.0 wide on a 22 pitch; 17px renders 248.7 and 134.7"),
 ("Type", "t-alert-msg", "400 15px/20px var(--x-font)",
  "p2 alert message ink 216.3/248.7/173.7 wide on a 20 pitch; 15px renders 216.7/248.7/174.0"),
 ("Type", "t-alert-btn", "500 17px/22px var(--x-font)",
  "p2 'Don’t Allow' to 'Allow' ink 83.7-296.0; 17px renders 84.0-296.0"),
 ("Type", "t-key",       "400 25px/35px var(--x-font)",
  "p9 letter keys: 'w' x-height 613.3-626.0 and 17.0 wide, 'm' 17.7 wide, 'k' 662.3-680.0; at 24/42 they rendered 3 low and 12.3 tall"),
 ("Type", "t-key-sm",    "400 18px/40px var(--x-font)",
  "p9 '123' ink 15.0-42.3 x 774.0-787.3; at 17/42 it rendered 25.7 wide and 1.3 low"),
 ("Type", "t-key-at",    "400 21px/38px var(--x-font)",
  "p9 '@' ink 217.3-234.3 x 772.0-789.7; at the letters' 24px it rendered 19.0 wide"),
 ("Type", "t-pw",        "400 17px/22px var(--x-font)",
  "p9 'Passwords' ink 171.0-250.7, cap 564.3-577.3"),
 ("Type", "t-time",      "590 17px/22px var(--x-font)",
  "p6 clock ink 43.3-87.3, y 26.3-39.0; the template status bar sets this"),

 ("Metrics", "w",        "402px",    "iPhone 16 Pro logical width, 1206 capture px / 3"),
 ("Metrics", "h",        "874px",    "iPhone 16 Pro logical height, 2622 / 3"),
 ("Metrics", "status",   "62px",     "clock ink top 26.3 to the large-title cap top 72.0"),
 ("Metrics", "gutter",   "20px",     "p6 title ink 20.7, hero card 20.0, app icon 20.0, Get pill right 382.0"),
 ("Metrics", "icon",     "62px",     "p6 app icon, col 50 y 569.3-631.3 and row 600 x 20.0-82.0"),
 ("Metrics", "bar-w",    "361px",    "tab-bar pill, p6 row 822 x 20.5-381.5"),
 ("Metrics", "bar-h",    "62.7px",   "tab-bar pill, x=100 edges 790.5/853.2 after the r=31.35 stadium solve"),
 ("Metrics", "bar-top",  "790.5px",  "same solve; x=30 predicts 799.1 against 799.3 measured"),
 ("Metrics", "tab-pitch","68.7px",   "tab ink centres 63.6/132.3/201.0/269.7/338.4 on p6"),
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

# ------------------------------------------------------------ phone frame ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-bg);color:var(--x-ink);
  transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--x-t-time)}
.sb .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
.sb svg{position:absolute;display:block;fill:currentColor}
/* the one change for a 402pt frame: the template's glyphs, moved as a group */
.sb .glyphs{position:absolute;left:6px;top:0}
/* iOS picks the indicator colour against the wallpaper: measure it per screen */
.home{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);
  width:139px;height:5px;border-radius:3px;background:currentColor;z-index:6}"""

# The status bar is templates/gen.py's, byte for byte: the .sb rules, SB_ICONS,
# statusbar() and its 9:41 clock. The template is drawn for a 393pt frame and
# this one is 402, so the glyphs sit in a .glyphs wrapper moved +6, which puts
# the battery's right edge at 366.3 against the 366.7 measured on p6. Nothing
# the captures' own status bars show is carried over: not their clocks, not the
# person badge, not p2's bell or its expanded Focus island, not iOS 26's filled
# battery or the no-service bars.
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

def statusbar(colour="var(--x-ink)", time="9:41", island=True):
    """island=False for the shell boards: the art draws its own camera housing."""
    return ('<div class="sb" style="color:%s">%s<div class="time">%s</div><div class="glyphs">%s</div></div>'
            % (colour, '<div class="island"></div>' if island else "", time, SB_ICONS))


def home(colour="var(--x-ink)"):
    return '<div class="home" style="color:%s"></div>' % colour


# --------------------------------------------------------------- assets ----
# Three sources, and the rule that picks between them:
#
#   interface        -> rebuilt: HTML and CSS, glyphs as SVG in assets/icons/
#   an app icon      -> the original, 1024px from the iTunes lookup API
#   editorial art    -> a crop of the capture at its own measured box
#
# Anything the system draws is rebuilt, never cut: the keyboard, the sheets'
# marks and close buttons, the chips' and tabs' glyphs, p1's illustration. The
# glyphs have no published outline, so each was traced from the capture into a
# path whose viewBox is its ink box in page points. An app icon has a canonical
# original that Apple serves. Only editorial art (a Today card's picture, a
# game hero, a Browse tile's illustration) is composed by the App Store's
# editors and published nowhere else at full size, so for that the capture is
# the only source there is - and even then only the picture: the type, icons,
# pills and badges the App Store sets over it are rebuilt, and cut() inpaints
# them out of the crop so they are not drawn twice. The one exception is a
# peek, a 10-12pt sliver of the next card or row at the right edge, too little
# of anything to name the app or the words it belongs to.
#
# Icons and crops land in assets/, which is committed; assets/refs/ is not, so
# the crops have to survive as files rather than as a recipe.

ICON_PX = 3          # icons are cut at 3x their placement size, like the capture


def _load(name, default):
    f = OUT / name
    return json.loads(f.read_text()) if f.exists() else default


APP_IDS = _load("icons.json", {})       # slug -> App Store trackId
CROPS = _load("crops.json", {})         # id -> {"img", "box", "kind"}


def _squircle(size, n=5.0, ss=4):
    """iOS icon mask: the superellipse |x|^n + |y|^n = 1, supersampled ss x."""
    from PIL import Image
    big = size * ss
    m = Image.new("L", (big, big), 0)
    px = m.load()
    half = big / 2.0
    for y in range(big):
        v = abs((y + 0.5 - half) / half) ** n
        if v >= 1.0:
            continue
        dx = half * (1.0 - v) ** (1.0 / n)
        for x in range(int(half - dx), int(half + dx) + 1):
            px[x, y] = 255
    return m.resize((size, size), Image.LANCZOS)


def app_icon(slug, size):
    """The original icon, squircle-masked, cached under assets/art/."""
    dst = ART_DIR / ("icon-%s.png" % slug)
    if not dst.exists():
        import subprocess
        from PIL import Image
        ART_DIR.mkdir(parents=True, exist_ok=True)
        raw = subprocess.run(
            ["curl", "-s", "https://itunes.apple.com/lookup?id=%d&country=us"
             % APP_IDS[slug]], capture_output=True, text=True).stdout
        url = json.loads(raw)["results"][0]["artworkUrl512"]
        url = url.rsplit("/", 1)[0] + "/1024x1024bb.png"
        tmp = ART_DIR / ("." + slug + ".tmp.png")
        subprocess.run(["curl", "-sL", url, "-o", str(tmp)], check=True)
        px = size * ICON_PX
        im = Image.open(tmp).convert("RGB").resize((px, px), Image.LANCZOS)
        im.putalpha(_squircle(px))
        im.save(dst)
        tmp.unlink()
    return _uri(dst)


def cut(cid):
    """A crop of the capture at its measured box, cached under assets/art/.

    `erase` lists the interface the App Store draws over the artwork, in page
    pt, so the board can rebuild it live rather than ship it inside a picture.
    [x0, y0, x1, y1] clears the whole box (an icon, a pill); [x0, y0, x1, y1,
    sign, T] clears only the glyph pixels in it, those lighter (sign 1) or
    darker (-1) than the blurred ground by T levels, grown by 1pt to take the
    antialiased rim. _inpaint fills both from the pixels around them, and a
    `guide` gives that fill real texture inside its boxes (see _guided)."""
    c = CROPS[cid]
    dst = ART_DIR / (cid + ".png")
    if not dst.exists():
        import numpy as np
        from PIL import Image, ImageFilter
        ART_DIR.mkdir(parents=True, exist_ok=True)
        src = Image.open(REFS_DIR / (c["img"] + ".png")).convert("RGB")
        box = tuple(round(v * SCALE) for v in c["box"])
        im = src.crop(box)
        if c.get("erase"):
            a = np.asarray(im).astype(float)
            lum = a.mean(2)
            hp = lum - np.asarray(Image.fromarray(lum.astype(np.uint8))
                                  .filter(ImageFilter.GaussianBlur(10))).astype(float)
            m = np.zeros(lum.shape, bool)
            for e in c["erase"]:
                X0, Y0, X1, Y1 = (max(int(round((v - o) * SCALE)), 0)
                                  for v, o in zip(e[:4], c["box"][:2] * 2))
                if len(e) == 4:
                    m[Y0:Y1, X0:X1] = True
                else:
                    g = np.zeros(lum.shape, bool)
                    g[Y0:Y1, X0:X1] = hp[Y0:Y1, X0:X1] * e[4] > e[5]
                    m |= _grow(g, int(SCALE))
            out = _inpaint(a, m)
            if c.get("guide"):
                out = _guided(a, m, out, c)
            im = Image.fromarray(np.clip(np.round(out), 0, 255).astype(np.uint8))
        im.save(dst)
    return _uri(dst)


def _grow(m, n):
    """Dilate a mask by n pixels, 4-connected."""
    import numpy as np
    for _ in range(n):
        p = np.pad(m, 1)
        m = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m


def _inpaint(a, m, sweeps=60):
    """Harmonic fill of the pixels under m from the ones around them: solved on
    a half-size copy first, then relaxed at this size. It is the smoothest
    surface that meets the boundary, so it carries no texture and invents no
    detail - which is the point, since what it fills sits under live UI."""
    import numpy as np
    if not m.any():
        return a
    H, W = m.shape
    if min(H, W) > 16:
        h, w = (H + 1) // 2, (W + 1) // 2
        k = np.pad(~m, ((0, 2 * h - H), (0, 2 * w - W))).astype(float)
        s = np.pad(a, ((0, 2 * h - H), (0, 2 * w - W), (0, 0))) * k[..., None]
        n = k.reshape(h, 2, w, 2).sum((1, 3))
        low = s.reshape(h, 2, w, 2, 3).sum((1, 3)) / np.maximum(n, 1)[..., None]
        low = _inpaint(low, n == 0, sweeps)
        a = np.where(m[..., None], low.repeat(2, 0).repeat(2, 1)[:H, :W], a)
    elif (~m).any():
        a = np.where(m[..., None], a[~m].mean(0), a)
    for _ in range(sweeps):
        p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
        a = np.where(m[..., None], (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4, a)
    return a


def _guided(a, m, out, c, eps=6.0):
    """The erased pixels again, where the picture survives outside the App Store.

    A harmonic fill smears what a glyph covered, which shows once a glyph is
    wide or the picture under it has edges. `guide` names a published copy of
    the artwork and the affine from page pt to its pixels, registered on the
    features the two share. That copy is not the App Store's cut: its grade,
    fade and some layers differ. So the fill carries the log ratio of capture
    to guide across the hole, smooth as before, and multiplies the guide's own
    pixels back in. Only inside `boxes`, where the two agree; the harmonic fill
    stands everywhere else."""
    import subprocess
    import numpy as np
    from PIL import Image
    g = c["guide"]
    src = REFS_DIR / g["file"]
    if not src.exists():
        subprocess.run(["curl", "-sL", g["url"], "-o", str(src)], check=True)
    big = Image.open(src).convert("RGB")
    (p, q, r), (s, t, u) = g["affine"]
    k = SCALE / np.hypot(p, s)            # down to the crop's px per pt first,
    small = big.resize((round(big.width * k), round(big.height * k)), Image.LANCZOS)
    kx, ky = small.width / big.width, small.height / big.height
    x0, y0 = c["box"][:2]                 # so the affine only has to place it
    data = (kx * p / SCALE, kx * q / SCALE, kx * (p * x0 + q * y0 + r),
            ky * s / SCALE, ky * t / SCALE, ky * (s * x0 + t * y0 + u))
    gd = np.asarray(small.transform((m.shape[1], m.shape[0]), Image.AFFINE, data,
                                    resample=Image.BICUBIC)).astype(float)
    lg = np.log(gd + eps)
    fill = np.exp(lg + _inpaint(np.log(a + eps) - lg, m)) - eps
    w = np.zeros(m.shape, bool)
    for b in g["boxes"]:
        X0, Y0, X1, Y1 = (max(int(round((v - o) * SCALE)), 0)
                          for v, o in zip(b, c["box"][:2] * 2))
        w[Y0:Y1, X0:X1] = True
    return np.where((m & w)[..., None], fill, out)


def _uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def art(cid, x, y, w, h, cls="", extra=""):
    """Place a crop back at the numbers it was measured at."""
    return ('<img class="%s" alt="%s" src="%s" style="left:%gpx;top:%gpx;'
            'width:%gpx;height:%gpx%s">' % (cls, cid, cut(cid), x, y, w, h, extra))


def icon(name, x, y, w, h, extra=""):
    """Inline assets/icons/<name>.svg at a measured box. Each file's viewBox is
    its ink box in the capture's own coordinates, so the box it was measured at
    places it, and the canvas inspector names the inline <svg> by its geometry."""
    svg = (ICON_DIR / (name + ".svg")).read_text().strip()
    return svg.replace("<svg ", '<svg preserveAspectRatio="none" style="left:%gpx;top:%gpx;'
                       'width:%gpx;height:%gpx%s" ' % (x, y, w, h, extra), 1)


def icon_at(name, extra="", dx=0, dy=0):
    """icon() at the box its own viewBox records, shifted by (dx, dy) when the
    parent is not at the page origin: pass minus the parent's page offset."""
    vb = (ICON_DIR / (name + ".svg")).read_text().split('viewBox="', 1)[1].split('"', 1)[0]
    x, y, w, h = (float(v) for v in vb.split())
    return icon(name, round(x + dx, 2), round(y + dy, 2), w, h, extra)


# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print("%-28s %7d" % (name, len(html)))


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:var(--x-t-note);color:var(--x-ink-3);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-3);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-border)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px;flex-wrap:wrap}
.rb{width:44px;height:26px;background:var(--x-bg);border:1px solid var(--x-border)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-3);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid var(--x-hairline)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-3);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-hairline);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace}
td.t{color:var(--x-accent);white-space:nowrap}
td.v{color:var(--x-ink-2);max-width:120px;word-break:break-all}
td.e{color:var(--x-ink-3)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


COLOUR_GROUPS = ("Surface", "Line", "Ink", "Accent")


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in COLOUR_GROUPS for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>iPhone 16 Pro, 402 &times; 874 pt. Captures are @3x, so '
                'SCALE = 3.0 and every number below is a direct read.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, met), SHEET)


# 33 type specimens do not fit under the colours on one 980 px sheet
def type_board():
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Grumpy wizards</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    return page(NAME + " - Type",
                '<div class="sheet"><header><h1>Type</h1>'
                '<p>Each size fitted by rendering the string against the '
                'capture\'s ink box. Chrome\'s SF sets N pt at about 0.95 N px.'
                '</p></header>%s</div>' % type_, SHEET)


# Rows wrap, so a page is filled to a height, not a count. A line of evidence
# holds about 44 characters and a line of value 20; a row is 11 px a line plus
# 6 of padding and rule, and the sheet holds 860 px of table under its header.
EV_H = 860


def evidence_pages():
    pages, h = [[]], 0
    for t in TOKENS:
        rh = 6 + 11 * max(-(-len(t[3]) // 44), -(-len(t[2]) // 20))
        if h + rh > EV_H:
            pages.append([])
            h = 0
        pages[-1].append(t)
        h += rh
    return pages


def evidence_boards():
    pages = evidence_pages()
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--x-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield page(NAME + " - Evidence" + of,
                   '<div class="sheet"><header><h1>Evidence%s</h1>'
                   '<p>One row per token. A token with no evidence is a guess.</p>'
                   '</header><table class="ev">%s</table></div>' % (of, rows), SHEET)


def foundation_boards():
    """(file, label, html) for the Foundations row, lettered in order after 00."""
    boards = ([("design-tokens", "Design tokens", token_board()),
               ("type", "Type", type_board())]
              + [("evidence", "Evidence", b) for b in evidence_boards()])
    for i, (slug, label, html) in enumerate(boards):
        yield "00%s-%s" % ("abcdefghij"[i] if i else "", slug), label, html


# --------------------------------------------------------------- screens ----
# Every App Store root screen is the same three pieces of chrome around a
# scroller: the large title with the account disc, the floating tab bar, and
# nothing else. The tab bar is one 361 x 62.7 stadium at y 790.5 on all five.
TAB_CENTRES = [63.6, 132.3, 201.0, 269.7, 338.4]      # p6 tab ink centres
BAR_L, BAR_T = 20.5, 790.5
TABS = [                                # slug, label, icon ink box w, h, x, y
    ("today",  "Today",  19.3, 24.3, 54.0, 803.0),
    ("games",  "Games",  24.3, 24.3, 120.0, 802.7),
    ("apps",   "Apps",   23.7, 23.0, 189.3, 803.7),
    ("arcade", "Arcade", 27.3, 25.0, 256.0, 802.7),
    ("search", "Search", 22.3, 22.3, 327.3, 804.0),
]

SCREEN_CSS = """.scroll{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-h)}
.scroll img{position:absolute;display:block}

h1.big{position:absolute;left:20px;top:62.6px;font:var(--x-t-title);letter-spacing:.37px}
.acct{position:absolute;left:342px;top:62px;width:44px;height:44px;border-radius:22px;
  background:var(--x-circle);box-shadow:inset 0 0 0 .5px rgba(0,0,0,.10)}
.acct svg{position:absolute;left:12.7px;top:12.3px;width:18.3px;height:19.3px;
  display:block;fill:currentColor}

/* floating tab bar: one stadium, five tabs, the selected one on a capsule */
.bar{position:absolute;left:20.5px;top:790.5px;width:var(--x-bar-w);height:var(--x-bar-h);
  border-radius:31.35px;z-index:5;background:rgba(255,255,255,.60);
  -webkit-backdrop-filter:blur(26px) saturate(180%);backdrop-filter:blur(26px) saturate(180%);
  box-shadow:inset 0 0 0 .5px rgba(0,0,0,.14),0 4px 16px rgba(0,0,0,.05)}
.bar .cap{position:absolute;top:4.5px;width:77px;height:54px;border-radius:27px;
  background:var(--x-fill-2)}
.bar svg{position:absolute;display:block}
.bar b{position:absolute;top:39.4px;width:80px;margin-left:-40px;text-align:center;
  font:var(--x-t-tab);letter-spacing:.06px}
.bar .t{color:var(--x-ink)}
.bar .t.on{color:var(--x-accent)}"""


def tabbar(active):
    out = []
    for i, (slug, label, w, h, ix, iy) in enumerate(TABS):
        c = TAB_CENTRES[i] - BAR_L
        on = " on" if i == active else ""
        if on:
            out.append('<div class="cap" style="left:%gpx"></div>' % (c - 38.5))
        out.append('<div class="t%s">%s<b style="left:%gpx">%s</b></div>'
                   % (on, icon_at("tab-" + slug, dx=-BAR_L, dy=-BAR_T), c, label))
    return '<div class="bar">%s</div>' % "".join(out)


PERSON = ('<svg viewBox="0 0 18.3 19.3"><circle cx="9.15" cy="5.4" r="5.4"/>'
          '<path d="M9.15 11.6C4.1 11.6 0 14.9 0 17.9c0 1 .5 1.4 1.6 1.4h15.1'
          'c1.1 0 1.6-.4 1.6-1.4 0-3-4.1-6.3-9.15-6.3Z"/></svg>')


def bigtitle(text):
    return ('<h1 class="big">%s</h1><div class="acct">%s</div>' % (text, PERSON))


# -- category chip row -------------------------------------------------------
# p6: pill 1 spans 20-159 and pill 2 167-367 at y 126-163, so the gap is 8 and
# both pills are 37 tall on a 18.5 radius. The icons are App Store glyphs, not
# emoji, traced from the capture into assets/icons/chip-*.svg in their own flat
# colours.
CHIP_CSS = """.chips{position:absolute;left:0;height:37px}
.chip svg{position:absolute;display:block}
.chip{position:absolute;top:0;height:37px;border-radius:var(--x-r-chip);
  background:var(--x-chip);box-shadow:0 1px 3px rgba(0,0,0,.05),0 4px 10px rgba(0,0,0,.05)}
.chip span{position:absolute;top:7.8px;letter-spacing:var(--x-tr-tight);font:var(--x-t-chip);white-space:nowrap}"""


def chips(items, top=126):
    """items: (icon, label, pill left, pill width, label left).

    The icon goes back exactly where it was traced from: its viewBox is in page
    coordinates, so subtracting the pill's own origin gives its offset inside
    the pill. Only the label offset is measured per chip, because the gap from
    the icon's ink to the first letter is set by the icon and not by the pill.
    `top` is 126 under a large title and 603 on p7, where the row sits below
    the promotion instead of above the content."""
    out = []
    for name, label, x, w, tx in items:
        out.append('<div class="chip" style="left:%gpx;width:%gpx">%s'
                   '<span style="left:%gpx">%s</span></div>'
                   % (x, w, icon_at(name, dx=-x, dy=-top), tx, label))
    return '<div class="chips" style="top:%gpx">%s</div>' % (top, "".join(out))


# -- editorial card ----------------------------------------------------------
# p6: eyebrow cap 186.0, head cap 202.7, sub cap 226.7 (24 apart), card top
# 257.0, card 20-382 x 257-490. The photograph and the glass strip along its
# bottom stay a crop - the pixels behind that strip are not in the capture, so
# it cannot be rebuilt without inventing them. The lockup set on the strip is
# not part of the picture, though: see lockups below.
CARD_CSS = """.eyebrow{position:absolute;left:20px;top:181.8px;font:var(--x-t-eyebrow);
  letter-spacing:var(--x-tr-tight);
  color:var(--x-accent)}
.chead{position:absolute;left:20px;top:196.9px;font:var(--x-t-head);
  letter-spacing:var(--x-tr-head);white-space:nowrap}
.csub{position:absolute;left:20px;top:220.7px;font:var(--x-t-headsub);
  letter-spacing:-.44px;color:var(--x-ink-2);white-space:nowrap}
.card{border-radius:18px}"""


# -- app list row ------------------------------------------------------------
# p6: icon 62 at x 20, first icon top 569.3, pitch 78. The CTA pill is 74 x 32
# at x 308, vertically centred on the icon when the row has no purchase note.
ROW_CSS = """.arow{position:absolute;left:0;width:var(--x-w);height:62px}
.arow>img{left:20px;top:0;width:62px;height:62px}
.arow .rim{position:absolute;left:20px;top:0;width:62px;height:62px;
  border-radius:13.87px;box-shadow:inset 0 0 0 .5px var(--x-hairline)}
.arow .txt{position:absolute;left:92px;top:1.7px;width:216px;height:62px;
  display:flex;flex-direction:column;justify-content:center}
.arow .txt b{font:var(--x-t-row);font-weight:400}
.arow .txt i{font:var(--x-t-sub);font-style:normal;color:var(--x-ink-2);
  white-space:nowrap}
.arow .cta{position:absolute;left:308px;top:15px;width:74px;height:32px;border-radius:16px;
  background:var(--x-fill);font:var(--x-t-cta);color:var(--x-accent-2);
  display:flex;align-items:center;justify-content:center}
.arow .iap{position:absolute;left:308px;width:74px;text-align:center;white-space:nowrap;
  font:var(--x-t-iap);color:var(--x-ink-2)}"""

ROW_TOP, ROW_PITCH = 569.3, 78.0


def app_row(i, slug, title, sub, cta, iap=False, top0=ROW_TOP):
    """i is the row index; the pitch is 78 on every screen that has these rows,
    and only the first icon's top moves (569.3 on p6, 586.3 on p5)."""
    top = top0 + i * ROW_PITCH
    note = '<div class="iap" style="top:50.8px">In-App Purchases</div>' if iap else ""
    return ('<div class="arow" style="top:%gpx">'
            '<img alt="icon-%s" src="%s"><div class="rim"></div>'
            '<div class="txt"><b>%s</b><i>%s</i></div>'
            '<div class="cta">%s</div>%s</div>'
            % (top, slug, app_icon(slug, 62), title, sub, cta, note))


# -- lockups set over artwork ------------------------------------------------
# p6, p5 and p3 set an app lockup - icon, name, subtitle, pill - on top of an
# editorial picture. None of it is the picture: the icon is the original from
# iTunes, the type is live, the pill is glass, and cut() inpaints all of it out
# of the crop first. Each line is placed from its measured ink top-left less
# the offset that same string's ink shows in a 30px line box at its fitted
# size, so the render lands on the capture's ink rather than on a guess at SF's
# side bearings. Text centred in a pill needs no offset: a 32px line box puts
# the 15px cap top 10.4 down, and p6, p5 and p3 measure 10.4, 10.7 and 10.7.
LOCK_CSS = """.lk{position:absolute;white-space:nowrap;color:var(--x-ink-inv)}
.lk.t{font:var(--x-t-lock);line-height:30px}
.lk.s{font:var(--x-t-lock-sub);line-height:30px;color:var(--x-ink-glass)}
.lk.s2{font:var(--x-t-sub);line-height:30px}
.lk.e{font:var(--x-t-areye);line-height:30px}
.lk.h{font:var(--x-t-pane);line-height:30px}
.lk.n{font:var(--x-t-iap);line-height:30px}
.lk.promo{color:var(--x-ink-promo)}
.lk.dim{color:var(--x-ink-glass-2)}
.lk.grey{color:var(--x-ink-2)}
.lk.dark{color:var(--x-ink)}
.gpill{position:absolute;height:32px;border-radius:16px;background:var(--x-glass-pill);
  font:var(--x-t-cta);line-height:32px;text-align:center;color:var(--x-ink-inv)}
.gpill.price{background:var(--x-glass-price);font:var(--x-t-price);line-height:32px;
  color:var(--x-ink-glass-2)}
.gpill.solid{background:var(--x-fill);color:var(--x-accent-2)}
/* p3 card 2's Ad badge: 25 x 16 at 40, 697.8; its top edge is 3.7 in at .1pt down
   and 1.0 in at 1.5, which r 4.5 predicts - not p8's r 8 badge */
.adb{position:absolute;width:25px;height:16px;border-radius:4.5px;background:var(--x-badge);
  font:var(--x-t-ad);line-height:16px;text-align:center;color:var(--x-ink-inv)}"""


def lk(cls, ink, off, text):
    """A line of type whose ink top-left measured `ink`; `off` is where the fit
    sheet found that string's ink inside its own 30px line box."""
    return ('<div class="lk %s" style="left:%gpx;top:%gpx">%s</div>'
            % (cls, round(ink[0] - off[0], 2), round(ink[1] - off[1], 2), text))


def lock_icon(slug, x, y, size):
    return ('<img alt="icon-%s" src="%s" style="left:%gpx;top:%gpx;width:%dpx;height:%dpx">'
            % (slug, app_icon(slug, size), x, y, size, size))


def gpill(x, y, w, text, cls=""):
    return ('<div class="gpill%s" style="left:%gpx;top:%gpx;width:%gpx">%s</div>'
            % (" " + cls if cls else "", x, y, w, text))


SECTION_CSS = """.sect{position:absolute;left:20px;font:var(--x-t-section)}
.sect svg{display:inline-block;width:7.3px;height:15px;margin-left:8.4px;
  vertical-align:-1.5px;fill:none;stroke:var(--x-ink-3);stroke-width:2.6;
  stroke-linecap:round;stroke-linejoin:round}
.sect.sm{font:var(--x-t-group)}
.sect.sm svg{width:5.7px;height:11.6px;margin-left:6.5px;vertical-align:-1.2px}"""

CHEV = '<svg viewBox="0 0 7.3 15"><path d="M1 1.6 5.7 7.5 1 13.4"/></svg>'

SSUB_CSS = """.ssub{position:absolute;left:20px;font:var(--x-t-ssub);
  color:var(--x-ink-2);white-space:nowrap}"""


def section(title, cap_top, chev=True, small=False):
    """cap_top is the measured cap height top of the heading ink.

    The chevron is an inline <svg> inside the text div, so it changes the line
    box, so the constants are fitted by render rather than derived: 5.89 with
    the chevron on p6, 5.55 without it on p7, 4.5 for p8's smaller headings."""
    off = 4.5 if small else 5.89 if chev else 5.55
    return '<div class="sect%s" style="top:%gpx">%s%s</div>' % (
        " sm" if small else "", cap_top - off, title, CHEV if chev else "")


def screen(label, css, body, tab=None, dark=False):
    ink = "var(--x-ink-inv)" if dark else "var(--x-ink)"
    return page(NAME + " - " + label,
                '<div class="phone">%s<div class="scroll">%s</div>%s%s</div>'
                % (statusbar(ink), body,
                   "" if tab is None else tabbar(tab), home(ink)),
                SCREEN_CSS + "\n" + css)


def s06_apps():
    rows = "".join([
        app_row(0, "youtube", "YouTube", "Videos, Music and Live Streams", "Open"),
        app_row(1, "tinder", "Tinder Dating App: Date<br>&amp; Chat",
                "Meet New People &amp; Date Singles", "Get", iap=True),
        app_row(2, "duolingo", "Duolingo: Language<br>Lessons",
                "Languages, Math, Music &amp; Chess", "Get", iap=True),
    ])
    body = (bigtitle("Apps")
            + chips([("chip-entertainment", "Entertainment", 20, 139, 34.3),
                     ("chip-visionpro", "Apple Vision Pro Apps", 167, 200, 41.7),
                     ("chip-chat", "", 375, 200, 44)])
            + '<div class="eyebrow">TONIGHT 8:00 PM</div>'
            + '<div class="chead">9/11: 25 Years Later</div>'
            + '<div class="csub">All-day coverage on ABC News</div>'
            + art("p6-hero", 20, 257, 362, 233, "card")
            + lock_icon("abc-news", 33.67, 441.17, 36)
            + lk("t", (78.67, 446.67), (.67, 9.67), "ABC News: Live Breaking Ne&hellip;")
            + lk("s", (79.0, 463.33), (1.0, 11.0), "Live headlines &amp; daily alerts")
            + gpill(294, 443.3, 74, "Get")
            + art("p6-peek-card", 390, 180, 12, 312, "", ";border-radius:18px 0 0 18px")
            + section("Must-Have Apps", 537.0)
            + rows
            + art("p6-peek-rows", 390, 560, 12, 230))
    return screen("Apps", CHIP_CSS + "\n" + CARD_CSS + "\n" + ROW_CSS + "\n" + SECTION_CSS
                  + "\n" + LOCK_CSS, body, tab=2)


def s05_games():
    rows = "".join([
        app_row(0, "roblox", "Roblox", "Play Millions of Games", "Get", True, 586.3),
        app_row(1, "sword-staff", "Sword x Staff", "A Third Way RPG", "Get", True, 586.3),
        app_row(2, "monopoly-go", "MONOPOLY GO!", "Roll, Build, Dream, &amp; Scheme!",
                "Get", True, 586.3),
    ])
    body = (bigtitle("Games")
            + chips([("chip-action", "Action", 20, 95, 40.7),
                     ("chip-racing", "Racing", 123, 97.7, 40.3),
                     ("chip-strategy", "Strategy", 228.7, 103.3, 37.3),
                     ("chip-puzzle", "Puzzle", 340, 100, 46.3)])
            + '<div class="eyebrow">HAPPENING NOW</div>'
            + '<div class="chead">Disney Solitaire</div>'
            + '<div class="csub">Cook with Remy and Linguini!</div>'
            + art("p5-hero", 20, 257, 362, 233, "card")
            + lock_icon("disney-solitaire", 34, 437.67, 36)
            + lk("t", (79.33, 443.33), (1.33, 9.67), "Disney Solitaire")
            + lk("s", (79.0, 459.67), (1.0, 11.0), "Play a Magic Puzzle Card Game")
            + gpill(294, 440, 74, "Get")
            + lk("n dim", (295.67, 478), (.67, 12.0), "In-App Purchases")
            + art("p5-peek-card", 392, 176, 10, 326, "", ";border-radius:18px 0 0 18px")
            + section("What We&rsquo;re Playing", 537.0)
            + '<div class="ssub" style="top:%gpx">These favorites are always a great '
              'choice</div>' % (560.3 - 6.16)
            + rows
            + art("p5-peek-rows", 392, 560, 10, 240)
            + section("Must-Play Games", 851.0))
    return screen("Games", CHIP_CSS + "\n" + CARD_CSS + "\n" + ROW_CSS + "\n"
                  + SECTION_CSS + "\n" + SSUB_CSS + "\n" + LOCK_CSS, body, tab=1)


# -- search ------------------------------------------------------------------
# p8: the field is a 370 x 42 stadium at 16, 116 - a 16 gutter, not the 20 the
# rest of the screen uses - and r 21 solves both edge insets, 28.0 at 2 down
# and 23.3 at 5. The promoted first result sits on a #EDF6FF card and swaps the
# grey Get pill for a white one.
SEARCH_CSS = """.field{position:absolute;left:16px;top:116px;width:370px;height:42px;
  border-radius:21px;background:var(--x-fill)}
.field svg{position:absolute;display:block;color:var(--x-ink)}
.field span{position:absolute;left:38px;top:10.3px;letter-spacing:.19px;
  font:var(--x-t-ph);
  color:var(--x-ink-2)}
.tint{position:absolute;left:16px;top:210px;width:370px;height:72px;
  border-radius:18px;background:var(--x-tint)}
.ad{position:absolute;left:92px;top:257px;width:25px;height:16px;border-radius:8px;
  background:var(--x-badge);color:var(--x-ink-inv);font:var(--x-t-ad);
  display:flex;align-items:center;justify-content:center}
.upd{position:absolute;left:304px;top:230px;width:78px;height:32px;border-radius:16px;
  background:var(--x-bg);font:var(--x-t-cta);color:var(--x-accent-2);
  display:flex;align-items:center;justify-content:center}
.tile{border-radius:12px}
.tl{position:absolute;font:var(--x-t-tile);color:var(--x-ink-inv);white-space:nowrap}"""

# The tile pictures are crops, their labels are not. Ink is 12.67 in from the
# tile, the first line's ink top 56.33 down with a 19.33 pitch after it (t1
# 570.33 and 589.67, t3 678.67 and 698.67), and a one-line label takes the
# second line. Tiles 5 and 6 are under the tab bar, where the glass refracts
# them: 'Photo & Video' reads through it, and so does 'Media', then 'Rea' 21pt
# further on - the room ' & ' takes, with the '&' behind the joystick glyph.
TILE_LABELS = [("Top Downloaded<br>Apps", 20, 514.0), ("Top Downloaded<br>Games", 206, 514.0),
               ("Top-Selling<br>Apps", 20, 622.6), ("Top-Selling<br>Games", 206, 622.6),
               ("Photo &amp; Video", 20, 731.6), ("Media &amp; Reading", 206, 731.6)]


def s08_search():
    tiles = "".join(art("p8-tile-%d" % (i + 1), x, y, 176, 99.5, "tile")
                    for i, (x, y) in enumerate([(20, 514.0), (206, 514.0),
                                                (20, 622.6), (206, 622.6),
                                                (20, 731.6), (206, 731.6)]))
    # the fourth row's tops are under the tab bar; only the strip below it shows
    tiles += (art("p8-tile-7", 20, 853.3333, 176, 20.6667)
              + art("p8-tile-8", 206, 853.3333, 176, 20.6667))
    tiles += "".join('<div class="tl" style="left:%gpx;top:%gpx">%s</div>'
                     % (x + 12, round(y + 52.33 + (0 if "<br>" in t else 19.33), 2), t)
                     for t, x, y in TILE_LABELS)
    body = (bigtitle("Search")
            + '<div class="field">%s%s<span>Games, Apps, Stories, and More</span></div>'
              % (icon_at("magnifier", dx=-16, dy=-116), icon_at("mic", dx=-16, dy=-116))
            + section("Suggested", 181.7, small=True)
            + '<div class="tint"></div>'
            # the promoted row: three lines of text, so it is not the 62-box row
            + '<div class="arow" style="top:215.3px">'
              '<img alt="icon-claude" src="%s"><div class="rim"></div>'
              '<div class="txt" style="top:-10.7px"><b>Claude by Anthropic</b>'
              '<i>AI assistant for life and work</i></div></div>' % app_icon("claude", 62)
            + '<div class="ad">Ad</div><div class="upd">Update</div>'
            + app_row(0, "nail-salon", "Nail Salon Games for Kids<br>2-5",
                      "Acrylic manicure painting 2+", "Get", True, 297.0)
            + app_row(0, "preschool", "Preschool Games for<br>Toddler 2+",
                      "Kindergarten game for kids 3-5", "Get", True, 379.0)
            + section("Browse", 486.3, small=True)
            + tiles)
    return screen("Search", ROW_CSS + "\n" + SECTION_CSS + "\n" + SEARCH_CSS,
                  body, tab=4)


# (file stem, label, builder). The capture behind stem NN is refs/pN.png.
# -- p7, the Arcade promotion ------------------------------------------------
# Three grounds, and each one is rebuilt from what the capture can actually
# support. Rows 0-136 are a smooth vertical ramp (per-row sd under 7), so they
# become a CSS gradient with the status bar, title and account disc drawn live
# over them. From 136 the sky becomes a photograph, and 136-424 is a crop that
# brings the photograph's own fade to black with it: the ground reads pure
# #000000 from 424 down. Two things on it are not the photograph. One is the
# Arcade wordmark: the logo is SF's own Apple glyph, U+F8FF out of SFNS.ttf at
# the wordmark's 20px, kept as a path so it does not depend on the viewer's
# fonts, and 'Arcade' beside it is live. The other is the headline's first
# line. cut() erases both and fills what they covered from EA's key art (the
# crop's guide), then the headline, the offer button and the footnote are
# drawn on top. White content starts at 584.0.
ARCADE_CSS = """.a7{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-h);
  background:#000}
.a7 .sky{position:absolute;left:0;top:0;width:var(--x-w);height:136px;background:var(--x-sky)}
.a7 svg{position:absolute;display:block}
.a7 .wm{position:absolute;left:176px;top:356.33px;font:var(--x-t-wordmark);line-height:30px;
  letter-spacing:var(--x-tr-wordmark);color:var(--x-ink-glass)}
.a7 .sheet7{position:absolute;left:0;top:584px;width:var(--x-w);height:290px;
  background:var(--x-bg)}

h1.big{color:var(--x-ink-inv)}
/* the account disc is glass, not a tint: it reads #0D709F over a #03527B
   sky, which is +10 red but +30 green and +36 blue, so a white overlay
   cannot produce it. This is the colour and alpha that do. */
.acct{background:rgba(36,182,243,.30);box-shadow:none;color:var(--x-ink-inv)}

.hl{position:absolute;left:0;top:387.5px;width:var(--x-w);text-align:center;
  font:var(--x-t-hero);letter-spacing:.16px;color:var(--x-ink-inv)}
.offer{position:absolute;left:60.3px;top:474.3px;width:281.4px;height:45.4px;
  border-radius:22.7px;background:var(--x-accent-3);color:var(--x-ink-inv);
  font:var(--x-t-btn);display:flex;align-items:center;justify-content:center}
.foot{position:absolute;left:0;top:536.65px;width:var(--x-w);text-align:center;
  font:var(--x-t-foot);color:var(--x-ink-dim)}

/* the ranked row: the same 62pt icon and Get pill as every other screen, with
   a rank digit at 99.7 and a three-line text column at 123.3. The four tops
   are fitted against the render: the strut formula put the whole column 2.7 to
   3.0 high, which is more than the eyebrow's own line box can explain. */
.a7r .e{position:absolute;left:123.3px;top:2.8px;font:var(--x-t-areye);
  letter-spacing:var(--x-tr-tight)}
.a7r .rk{position:absolute;left:98.7px;top:21.7px;font:var(--x-t-row)}
.a7r b{position:absolute;left:122.9px;top:21.1px;font:var(--x-t-row);font-weight:400}
.a7r i{position:absolute;left:123px;top:39px;font:var(--x-t-sub);font-style:normal;
  color:var(--x-ink-2);white-space:nowrap}"""

A7_ROW_TOP, A7_PITCH = 696.0, 78.0


def arcade_row(i, slug, rank, title=None, sub=None, cta=None):
    """Row 3's icon top is 852, so its title would land at 876 - off the frame
    and off the capture. It gets the icon and the eyebrow it actually shows,
    and nothing invented below them."""
    top = A7_ROW_TOP + i * A7_PITCH
    out = ['<div class="arow a7r" style="top:%gpx">'
           '<img alt="icon-%s" src="%s"><div class="rim"></div>'
           '<div class="e">Apple Arcade</div><div class="rk">%d</div>'
           % (top, slug, app_icon(slug, 62), rank)]
    if title:
        out.append("<b>%s</b>" % title)
    if sub:
        out.append("<i>%s</i>" % sub)
    if cta:
        out.append('<div class="cta">%s</div>' % cta)
    return "".join(out) + "</div>"


def s07_arcade():
    body = ('<div class="a7"><div class="sky"></div>'
            + art("p7-hero", 0, 136, 402, 288)
            # 'Arcade' ink 178.67, 364 less its 30px-box offset .67, 7.67
            + icon_at("arcade-apple", ";color:var(--x-ink-glass)") + '<div class="wm">Arcade</div>'
            + '<div class="sheet7"></div></div>'
            + bigtitle("Arcade")
            + '<div class="hl">No In-App Purchases. No<br>Ads. Just Fun.</div>'
            + '<div class="offer">Accept Offer</div>'
            + '<div class="foot">1 month free, then $6.99/month.</div>'
            + chips([("chip-all", "All Games", 20, 118.7, 40.3),
                     ("chip-action-dark", "Action", 147, 95, 40.3),
                     ("chip-adventure", "Adventure", 250.3, 120.4, 40),
                     ("chip-board", "", 379, 118.7, 40)], top=603)
            + section("Top Arcade Games", 663.0, chev=False)
            + arcade_row(0, "block-blast-plus", 1, "Block Blast!+",
                         "Block Puzzle &amp; Brain Training", "Get")
            + arcade_row(1, "solitaire-plus", 2, "Solitaire by MobilityWare+",
                         None, "Get")
            + arcade_row(2, "nfl-retro-bowl", 3)
            + art("p7-peek-rows", 392, 690, 10, 184))
    return screen("Arcade", CHIP_CSS + "\n" + ROW_CSS + "\n" + SECTION_CSS + "\n"
                  + ARCADE_CSS, body, tab=3, dark=True)


# -- p3, Today ---------------------------------------------------------------
# Three editorial cards under the chrome and nothing else. Cards 1 and 2 are
# pictures with type and a lockup set over them, and only the pictures are
# crops: the eyebrow, headline and subtitle, the original icons, the price and
# Get pills and the Ad badge are live, and cut() inpaints them out first. Card
# 3 is white with only type and a row on it, so it is built outright. Its
# headline sits under the tab bar, where the glass blurs it, 20 below its
# eyebrow as card 1's is; the card runs off the bottom of the frame, which is
# what the capture shows.
# The shadow is solved rather than styled. Measured out from card 1's left edge
# the ground reads #E6E6E6 at 1pt, #ECECEC at 6, #F3F3F3 at 12 and #F8F8F8 at 18,
# and the same four values come back above the card, so the offset is zero on
# both axes. Treating the blur as a Gaussian of sd = radius/2, that profile fits
# sd 15 at alpha .21 to within a level everywhere, and it predicts the #E0E0E0
# the 16pt gap between two cards actually shows.
TODAY_CSS = """.tcard{border-radius:20px;box-shadow:0 0 30px rgba(0,0,0,.21)}
.c3{position:absolute;left:20px;top:751.67px;width:362px;height:160px;background:var(--x-bg)}"""


def s03_today():
    card1 = (art("p3-card1", 20, 116, 362, 446, "tcard")
             + lk("e promo", (40.67, 400), (.67, 10.67), "GET STARTED")
             + lk("h", (41.67, 420), (1.67, 5.0), "5 Tips for Procreate")
             + lk("s2 promo", (40.67, 455.67), (.67, 10.33),
                  "Get more out of the digital art studio.")
             + lock_icon("procreate", 40, 498.67, 48)
             + lk("t", (99.33, 509.33), (1.33, 10.33), "Procreate")
             + lk("s2 promo", (98.67, 527.67), (.67, 10.33), "Sketch. Paint. Create.")
             + gpill(286, 507, 76, "$12.99", "price"))
    card2 = (art("p3-card2", 20, 578, 362, 158.7, "tcard")
             + lock_icon("meowdoku", 161, 589.33, 80)
             + lk("t", (41.33, 682), (1.33, 10.0), "Meowdoku!")
             + '<div class="adb" style="left:40px;top:697.8px">Ad</div>'
             + lk("s2 dim", (70, 701), (1.0, 10.33), "Brain Puzzle Games")
             + gpill(288, 681, 74, "Get")
             + lk("n", (289.67, 719), (.67, 12.0), "In-App Purchases"))
    card3 = ('<div class="tcard c3"></div>'
             + lk("e grey", (40.67, 774.67), (.67, 10.67), "OUR FAVORITES")
             + lk("h dark", (41.67, 794.67), (1.67, 5.0), "Essential iPhone Games")
             + lock_icon("royal-match", 40, 852.67, 48)
             + lk("t dark", (99.33, 853), (1.33, 10.0), "Royal Match")
             + lk("s2 grey", (99.0, 870.33), (1.0, 10.5), "King Robert&rsquo;s Match-3 Puzzles")
             + gpill(288, 849.67, 74, "Get", "solid"))
    return screen("Today", LOCK_CSS + "\n" + TODAY_CSS,
                  bigtitle("Today") + card1 + card2 + card3, tab=0)


# -- sheets ------------------------------------------------------------------
# p1, p4 and p9 are one presentation: a full-width sheet from y 62 with 38pt
# top corners, and the page behind it dimmed by --x-scrim. The status bar sits
# under that scrim rather than over it. That is not how iOS layers it, but the
# pixels cannot tell the difference: black ink stays black, and the grey bars
# land on #999999 exactly as translucent ink would. So the template bar is
# reused as it is.
#
# The page behind p1 and p4 is Today. Only its account disc shows, in the gap
# under the sheet's right corner, but it is drawn whole.
SHEET_TOP = 62

SHEET_CSS = """.dim{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-h);
  background:var(--x-scrim);z-index:7}
.sheet{position:absolute;left:0;width:var(--x-w);overflow:hidden;z-index:8;background:var(--x-bg);
  border-radius:var(--x-r-sheet) var(--x-r-sheet) var(--x-r-phone) var(--x-r-phone)}
.sheet>div{position:absolute;left:0;width:var(--x-w);height:var(--x-h)}
.sheet img,.sheet>div>svg,.close svg{position:absolute;display:block}
.tx{position:absolute;white-space:nowrap}
.mid{left:0;width:var(--x-w);text-align:center}
.close{position:absolute;top:78px;width:44px;height:44px;border-radius:22px;
  box-shadow:inset 0 0 0 .5px rgba(0,0,0,.18),inset 0 2px 2px -1px #fff,inset 0 -2px 2px -1px #fff}.go{position:absolute;height:53px;border-radius:26.5px;background:var(--x-accent-2);
  color:var(--x-ink-inv);font:var(--x-t-go);display:flex;align-items:center;justify-content:center;
  box-shadow:inset 0 1.5px 1.5px -.5px #0CD3FF,inset 0 -1.5px 1.5px -.5px #0CD3FF}"""


def sheet(top, body):
    """The inner div sits at -top, so everything inside is written in the
    capture's own page coordinates."""
    return ('<div class="sheet" style="top:%gpx;height:%gpx"><div style="top:%gpx">%s</div></div>'
            % (top, 874 - top, -top, body))


def sheet_screen(label, css, body, top=SHEET_TOP, ground="", behind="",
                 back="", above=""):
    """behind: under the scrim. back: over it, under the sheet. above: over all."""
    return page(NAME + " - " + label,
                '<div class="phone"%s>%s%s<div class="dim"></div>%s%s%s%s</div>'
                % (' style="background:%s"' % ground if ground else "",
                   statusbar(), behind, back, sheet(top, body), above, home()),
                SCREEN_CSS + "\n" + SHEET_CSS + "\n" + css)


def close(left, glyph, disc):
    """The xmark is traced per sheet, so its file already records where it sits."""
    return ('<div class="close" style="left:%gpx;background:%s">%s</div>'
            % (left, disc, icon_at(glyph, ";color:var(--x-ink)", dx=-left, dy=-78)))


# -- p1's illustration -------------------------------------------------------
# A lock screen's lower half with one notification on it. It is drawn, not cut:
# every part is a flat fill or a vertical ramp, and the three glyphs are
# assets/icons/. Measured on p1, in page coordinates:
#   ground   #FEFEFE at y 70 to #EDEDED at 418, flat across the row
#   phone    x 67.0-335.3, bottom 379.5 on a 47 corner; flat across every row,
#            down x=70 254 at 84, 244 at 150, 226 at 200, 207 from 236, 203 at 378
#   card     82.2-319.95 x 210.9-266.4, r 19, #FEFEFE; its shadow fits
#            0 9.5 17 at alpha .12 to a mean 0.8 levels over 90 samples
#   icon     91.5, 220.5, 36.3 square; #1FB6F6 to #1963EE
#   lines    #DBDBDD from 137.33: 67 x 11.33 at 220.6, 163.5 x 5.8 at 238.65 and 251.0
#   buttons  35.6 discs of #C4C4C4 centred 116.35 and 285.35 on 323.0, glyphs #F5F5F5
#   home     153.3-248.7 x 367.5-371.2, #F1F1F1
# On p2 the box is 72-425, and the drawing sits 7.85 lower at the same size:
# centred in a box 4.3 shorter.
ILLO_CSS = """.illo{position:absolute;left:0;width:var(--x-w);color:#F5F5F5;
  background:linear-gradient(#FEFEFE 8px,#EDEDED 356px)}
.illo>div,.illo>svg{position:absolute;display:block}
.illo .dev{left:67px;width:268.3px;height:317.5px;border-radius:0 0 47px 47px;
  background:linear-gradient(#FEFEFE 22px,#FBFBFB 58px,#F4F4F4 88px,#F2F2F2 98px,
    #EAEAEA 118px,#E2E2E2 138px,#CFCFCF 174px,#CFCFCF 238px,#CBCBCB 316px)}
.illo .nt{left:82.2px;width:237.75px;height:55.5px;border-radius:19px;background:#FEFEFE;
  box-shadow:0 9.5px 17px rgba(0,0,0,.12)}
.illo .ln{left:137.33px;width:163.5px;height:5.8px;border-radius:2px;background:#DBDBDD}
.illo .ln.t{width:67px;height:11.33px;border-radius:3.3px}
.illo .ctl{width:35.6px;height:35.6px;border-radius:50%;background:#C4C4C4}
.illo .hb{left:153.3px;width:95.4px;height:3.7px;border-radius:1.85px;background:#F1F1F1}"""


def notify_illo(top, h):
    o = (h - 357.3) / 2 - SHEET_TOP     # page y on p1 -> y inside this box

    def at(cls, y, left=None):
        return '<div class="%s" style="%stop:%gpx"></div>' % (
            cls, "" if left is None else "left:%gpx;" % left, round(y + o, 2))
    return ('<div class="illo" style="top:%gpx;height:%gpx">' % (top, h)
            + at("dev", 62) + at("nt", 210.9)
            + icon("app-store", 91.5, round(220.5 + o, 2), 36.3, 36.3)
            + at("ln t", 220.6) + at("ln", 238.65) + at("ln", 251.0)
            + at("ctl", 305.2, 98.55) + at("ctl", 305.2, 267.55)
            + icon("flashlight", 113.25, round(315.1 + o, 2), 6.4, 15.1)
            + icon("camera", 277.35, round(316.3 + o, 2), 15.65, 12.1)
            + at("hb", 367.5) + "</div>")


PANE_CSS = """.pane{font:var(--x-t-pane)}
.lede{font:var(--x-t-lede);color:var(--x-ink-2)}
.link{font:var(--x-t-link);color:var(--x-accent-2)}
""" + ILLO_CSS


def notify_pane(illo_top=SHEET_TOP, illo_h=357.3, dy=0):
    """p1's pane. p2 shows the same pane pushed to y 72 under its alert, and
    there the illustration is 353 tall rather than 357.3 and the copy under it
    sits 5.6 lower, while the button and the link do not move at all."""
    return (notify_illo(illo_top, illo_h)
            + '<div class="tx mid pane" style="top:%gpx">Stay Up to Date with<br>'
              'Notifications</div>' % (451.35 + dy)
            + '<div class="tx mid lede" style="top:%gpx">Get notified about billing and<br>'
              'product updates, pre-orders, special<br>offers, and personalized<br>'
              'recommendations</div>' % (521.4 + dy)
            + '<div class="go" style="left:37.33px;top:717.33px;width:327.33px;padding-bottom:2px">Continue</div>'
            + '<div class="tx mid link" style="top:797.55px">Not Now</div>')


def s01_notify():
    return sheet_screen("Notifications onboarding", PANE_CSS, notify_pane(),
                        behind=bigtitle("Today"))


# p2: the system alert over p1's pane. The pane is pushed back to y 72 and the
# sheet it was presented from shows above it as a narrower card, 16-386 on a 34
# radius; a second scrim dims all of that, and the alert is glass over the lot.
ALERT_CSS = PANE_CSS + """
.dim.two{z-index:9}
.backcard{position:absolute;left:16.5px;top:62px;width:369px;height:812px;z-index:8;
  border-radius:34px;background:var(--x-back)}
.alert{position:absolute;left:41px;top:344px;width:320px;height:213.67px;z-index:10;
  border-radius:var(--x-r-alert);background:var(--x-alert);
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -1px 0 rgba(255,255,255,.6),
    0 4px 30px rgba(0,0,0,.12)}
.alert h2{position:absolute;left:30.5px;top:20.8px;font:var(--x-t-alert);white-space:nowrap}
.alert p{position:absolute;left:30.1px;top:70.25px;font:var(--x-t-alert-msg);
  color:var(--x-ink-alert);white-space:nowrap}
.alert b{position:absolute;top:150px;width:140px;height:48px;border-radius:24px;
  background:var(--x-alert-btn);font:var(--x-t-alert-btn);
  display:flex;align-items:center;justify-content:center}"""


def s02_alert():
    alert =('<div class="alert"><h2>“App Store” Would Like to Send<br>You Notifications</h2>'
             '<p>Notifications may include alerts,<br>sounds, and icon badges. These can<br>'
             'be configured in Settings.</p>'
             '<b style="left:16px">Don’t Allow</b><b style="left:164px">Allow</b></div>')
    return sheet_screen("Permission alert", ALERT_CSS,
                        notify_pane(72, 353, 5.6), top=72,
                        behind=bigtitle("Today"), back='<div class="backcard"></div>',
                        above='<div class="dim two"></div>' + alert)


# p4: a grouped list on --x-group. Cards are 16-386 on --x-r-card; rows are 51
# tall and the separator is inset 16 on both sides.
ACCOUNT_CSS = """.sheet{background:var(--x-group)}
.acard{position:absolute;left:16px;width:370px;border-radius:var(--x-r-card);background:var(--x-bg)}
.sep{position:absolute;left:32px;top:217px;width:338px;height:1px;background:var(--x-sep)}
.body{font:var(--x-t-body)}
.blue{color:var(--x-accent-2)}
.shead{font:var(--x-t-sheet)}
.note{font:var(--x-t-note);color:var(--x-ink-note)}"""


def s04_account():
    body = (icon_at("mark-account")
            + '<div class="tx shead" style="left:52px;top:89.1px">Apple Account</div>'
            + close(342, "xmark-p4", "var(--x-disc-2)")
            + '<div class="acard" style="top:167px;height:102px"></div><div class="sep"></div>'
            + '<div class="tx body blue" style="left:32px;top:181.2px">Apple Account Sign In...</div>'
            + '<div class="tx body blue" style="left:32px;top:232.2px">Create New Apple Account</div>'
            + '<div class="tx note" style="left:32px;top:276.5px">An Apple Account is the login '
              'you use for just about<br>everything you do with Apple.</div>'
            + '<div class="acard" style="top:329px;height:51px"></div>'
            + '<div class="tx body" style="left:32px;top:343.2px">App Updates</div>'
            + icon_at("chevron", ";color:var(--x-ink-chev)")
            + '<div class="acard" style="top:415px;height:51px"></div>'
            + icon_at("gear", ";color:var(--x-accent-2)")
            + '<div class="tx body blue" style="left:71px;top:429.2px">App Store Settings</div>')
    return sheet_screen("Apple Account sheet", ACCOUNT_CSS, body,
                        behind=bigtitle("Today"))


# p9: iOS 26's floating keyboard, rebuilt key by key rather than cut out. The
# panel's top edge is 545.3 and its bottom corners are the display's own. Keys
# are 42.3 tall on a 54 pitch, and letter keys 33.3 wide on a 39.33 pitch from
# x 6.67 (row 1), 26.33 (row 2) and 65.67 (row 3); the rest were read off their
# own edges. Every glyph that is not a letter was traced from the capture into
# assets/icons/kb-*.svg, so each file's viewBox is where it sits.
KBD_ROWS = [(598.67, 6.67, "qwertyuiop"), (652.33, 26.33, "asdfghjkl"), (706.33, 65.67, "zxcvbnm")]
KBD_PITCH, KBD_KEY, KBD_H = 39.333, 33.33, 42.33
KBD_CSS = """.kb>div{position:absolute}
.kb>svg{position:absolute;display:block}
.kb .panel{left:0;top:545.33px;width:var(--x-w);height:328.67px;background:var(--x-kbd);
  border-radius:var(--x-r-kbd) var(--x-r-kbd) 0 0;
  box-shadow:inset 0 .67px 0 #fff,0 -.34px 0 rgba(0,0,0,.14)}
.kb .ksep{top:559px;width:1px;height:24px;background:var(--x-kbd-sep)}
.kb .pw{left:169.33px;top:559.67px;font:var(--x-t-pw);color:var(--x-ink-kbd);white-space:nowrap}
.kb .k{height:42.33px;border-radius:var(--x-r-key);background:var(--x-bg);
  font:var(--x-t-key);text-align:center;color:var(--x-ink)}
.kb .k.l{text-indent:2px}
.kb .k.s{font:var(--x-t-key-sm)}
.kb .k.at{font:var(--x-t-key-at)}"""


def keyboard():
    def key(x, y, w, label="", cls="k"):
        return '<div class="%s" style="left:%gpx;top:%gpx;width:%gpx">%s</div>' % (cls, x, y, w, label)
    out = ['<div class="kb"><div class="panel"></div>',
           '<div class="ksep" style="left:30px"></div><div class="ksep" style="left:371px"></div>',
           '<div class="pw">Passwords</div>']
    for y, x0, letters in KBD_ROWS:
        # SF's letters sit about 1pt right of their key's centre on the capture
        out += [key(round(x0 + i * KBD_PITCH, 2), y, KBD_KEY, c, "k l") for i, c in enumerate(letters)]
    y3, y4 = 706.33, 760.33
    out += [key(6.67, y3, 45.33), key(350, y3, 45.67),
            key(6.67, y4, 43.33, "123", "k s"), key(56, y4, 43.33), key(105.33, y4, 92.67),
            key(204, y4, 43.33, "@", "k at"), key(253.33, y4, 43.33, "."), key(302.67, y4, 93)]
    ink = ";color:var(--x-ink)"
    out += [icon_at("kb-key", ";color:var(--x-ink-kbd)"), icon_at("kb-shift", ink),
            icon_at("kb-delete", ink), icon_at("kb-emoji", ink),
            icon_at("kb-space-a", ";color:var(--x-ink-hint)"), icon_at("kb-return", ";color:var(--x-ink-off)"),
            icon_at("kb-globe", ink), icon_at("kb-mic", ink)]
    return "".join(out) + "</div>"


SIGNIN_CSS = KBD_CSS + """
.body{font:var(--x-t-body)}
.stitle{font:var(--x-t-signin)}
.field{position:absolute;left:38px;top:328.33px;width:326px;height:52px;border-radius:26px;
  background:var(--x-group)}
.ph{color:var(--x-ink-ph)}
.blue{color:var(--x-accent-2)}"""


def s09_signin():
    body = (close(16, "xmark", "var(--x-disc)")
            + icon_at("mark-signin")
            + '<div class="tx stitle" style="left:38px;top:271.05px">Sign In to Complete Purchase</div>'
            + '<div class="field"></div>'
            + '<div class="tx body ph" style="left:54.3px;top:342.9px">Email or Phone Number</div>'
            + '<div class="tx body blue" style="left:38.3px;top:400.6px">Forgot password?</div>'
            + '<div class="go" style="left:38px;top:445px;width:326px">Sign In</div>'
            + keyboard())
    return sheet_screen("Sign in to purchase", SIGNIN_CSS, body,
                        ground="var(--x-haze)")


SCREENS = [
    ("01-notify-onboard",  "Notifications onboarding", s01_notify),
    ("02-notify-alert",    "Permission alert",         s02_alert),
    ("03-today",           "Today",                    s03_today),
    ("04-account-sheet",   "Apple Account sheet",      s04_account),
    ("05-games",           "Games",                    s05_games),
    ("06-apps",            "Apps",                     s06_apps),
    ("07-arcade",          "Arcade",                   s07_arcade),
    ("08-search",          "Search",                   s08_search),
    ("09-signin-sheet",    "Sign in to purchase",      s09_signin),
]


# ------------------------------------------------- Phase 5: the reference ----
# Each capture, unretouched, on its own board directly under its mockup. The
# board embeds a half-scale JPEG: nine full-res PNGs would be 25 MB of base64
# for boards nobody samples. Sampling always reads assets/refs/pN.png.
REF_CSS = """body{padding:24px}
.phone img{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-h);display:block}"""

def ref_uri(path):
    from PIL import Image
    im = Image.open(path).convert("RGB")
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=88, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def ref_boards():
    for i, (stem, label, _) in enumerate(SCREENS, start=1):
        f = REFS_DIR / ("p%d.png" % i)
        if not f.exists():
            continue
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone"><img src="%s" alt="%s"></div>'
                    % (ref_uri(f), label), REF_CSS))


# ----------------------------------------------------------------- main ----
def layout(names, foundations):
    rows = [{"title": "Foundations",
             "files": [{"file": n, "label": l} for n, l, _ in foundations]},
            {"title": "Screens", "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _ in SCREENS]}]
    # Same order as the row above: the canvas lays every row out from x = 0 at
    # one pitch, so item N here lands column-for-column under item N up there.
    refs = [{"file": "ref-" + s, "label": l}
            for s, l, _ in SCREENS if "ref-" + s in names]
    if refs:
        rows.append({"title": "Source of truth: iPhone 16 Pro captures",
                     "numbered": True, "files": refs})
    return {"name": PAGE_NAME, "rows": rows}


def main():
    foundations = list(foundation_boards())
    files = dict([(n, html) for n, _, html in foundations]
                 + [(s, fn()) for s, _, fn in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    rows = layout(files, foundations)
    (OUT / "layout.json").write_text(json.dumps(rows, indent=2) + "\n")
    print("%-28s %7d rows" % ("layout.json", len(rows["rows"])))


if __name__ == "__main__":
    main()
