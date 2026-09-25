"""Events Feed, iOS -- the boards, from one source of truth.

Rebuilt from an 8.2 s screen recording of an unnamed events-feed concept,
2560 x 1698 at 60 fps, showing one scrolling feed on an iPhone 17 Pro Max
simulator. The recording is the only source: there is no Mobbin entry, and the
app names itself nowhere on any frame, so the folder is named for what it is.

    python3 canvases/events-feed-ios/gen.py

regenerates every board in place, byte-identical, from anywhere.

WHAT THE CAPTURE IS, AND WHAT THAT COSTS. The camera zooms and pans over a
phone that never moves, so no one frame holds a whole screen at high
resolution. Solving the screen's edges per frame finds three static setups:

    cam0   frames 1-25     636 x 1379 px   1.4455 px/pt   whole screen
    camA   frames 81-270   1664 px wide    3.7818 px/pt   screen pt 0..410
    camB   frames 290-450  1589 px wide    3.6114 px/pt   screen pt 520..956

Scale is `screen_inner_width_px / 440`, cross-checked against height:
636/440 = 1.4455 against 1379/956 = 1.4425, 0.2 % apart, so the crop is square
and the device is the 440 x 956 pt iPhone 17 Pro Max its own simulator title
bar names.

cam0 is the only frame holding all 956 pt, so it settles every whole-screen
placement; camA and camB, where a 1 pt stroke is nearly four pixels, settle
colour and type. The three agree: the floating pill reads 850.2..902.1 pt on
cam0 and 850.5..904.5 on camB, the home indicator 938.8..954.0 against
940.8..955.7. That agreement is what licenses mixing them.

THE FRAME IS NOT THIS REPO'S USUAL ONE. Every other folder here draws a
393 x 852 phone inside the default 478 x 980 artboard. A 440 x 956 screen does
not fit that box, so every board declares w/h in layout.json (532 x 1004) and
the phone sits at the same 46/24 inset. The status bar is the template's,
unchanged, with SB_ICONS moved right by the 47 px width delta so the battery
keeps its right inset -- the one change the clone skill allows on a wider
frame. Nothing from the capture's own status bar is carried over, including
its 8:17 clock.

ONE FEED, FOUR WINDOWS. The source is a single scrolling list, so the boards
are scroll offsets of one document rather than four screens. `feed()` lays the
document out once at absolute tops derived from CARD, and each board clips it
at an offset the recording actually settles at. A correction to the card
rhythm is therefore made once, not four times. Every offset was solved by
locating one element in its own capture and subtracting:

    01  scroll 0.0     cam0 p1     the frame is the unscrolled feed
    02  scroll 257.8   camB b360   Life Lately footer at screen 539.8
    03  scroll 336.4   camA a155   Life Lately title at screen 234.3
    04  scroll 532.8   camB b310   Rooftop footer at screen 563.4

TEXT IS PLACED BY ITS INK, NOT BY ITS BOX. Every vertical measurement off a
capture is the top of the ink -- the cap line -- because that is the only
thing a pixel can show. CSS positions a line box instead, whose top sits above
the cap line by an amount that depends on the size and the line height.
`ink_top()` does that conversion from the font's own metrics, so each number
in CARD stays the measured one and no offset gets hand-tuned into place.

ARTWORK IS ORIGINAL, AND THAT IS A DELIBERATE DEPARTURE. The photo stacks, the
five story avatars and the header avatar are photographs belonging to whoever
made the recording. Other folders here crop such pixels out of the capture and
commit them; this one does not. `tile_art()` and `avatar_art()` draw original
abstract compositions from each region's *measured* dominant colours, so the
palette a card contributes to the screen is right while none of the source's
imagery is copied. The cost is stated plainly: those regions do not converge,
they are excluded from the fidelity claim, and README.md names them.

Artboards are output. Never hand-edit the .html -- edit this file and re-run.
"""
import base64
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent

NAME = "Events Feed"
PAGE_NAME = "(example) " + NAME
P = "e"          # token prefix: --e-ground, --e-ink, --e-t-title

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Every row names a frame and a scale. A row
# that cannot name one is not a token.
TOKENS = [
 ("Font", "font",
  'ui-rounded,"SF Pro Rounded","SF Pro Text",-apple-system,'
  'BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif',
  'refkit font on the exact 23.3 pt ink box of "Beach Party", camA: '
  "SF Pro Rounded 0.833, margin 0.062 over SF Compact Rounded"),

 ("Surface", "ground",   "#EAE8E9",
  "flat-fill census, 100.0 % of 75184 px, camA a155; identical on cam0 and camB, "
  "so the three cameras share one colour space and no conversion pass is needed"),
 ("Surface", "circle",   "#FDFDFD",
  "flat-fill census 99.8 %, inside the search circle, camA a155"),
 ("Surface", "pill",     "#F3EFF5",
  "flat-fill census 82.3 % of the location-pill interior, cam0 p1; camA a067 agrees"),
 ("Surface", "add",      "#F9EAF4",
  "flat-fill census 96.4 %, add-photo tile interior, camA a067"),
 ("Surface", "tile-rim", "#FDFCFC",
  "the rim each photo tile carries, brightest 2 % of its left rim, cam0 p1; the "
  "rim is 1.0 pt wide and camB never resolves it to white -- see README"),
 ("Surface", "fab",      "rgba(38,38,38,.64)",
  "the pill reads #6C6C6C over the #EAE8E9 ground and #5B5A5D over the blurred "
  "title behind it, cam0 p1; one alpha fits both, 0.64 on a neutral #262626"),
 ("Surface", "badge",    "#16151A",
  "per-pixel mode of the Your-story plus badge, cam0 p1"),

 ("Ink", "ink",          "#121014",
  'ink core darkest 2 %, "Beach Party", camA a067; "Life Lately" on a155 gives #120F14'),
 ("Ink", "ink-2",        "#737075",
  "ink core darkest 2 %, card subtitle, camA a067 and a155 agree to one level; "
  "the story labels read #706D71 on cam0"),
 ("Ink", "ink-3",        "#979399",
  'ink core darkest 2 %, "In 2 Days" meta row, camA a067'),
 ("Ink", "ink-foot",     "#59545E",
  "ink core darkest 2 %, footer glyph and label, camA a155"),
 ("Ink", "ink-search",   "#211F23",
  'ink core darkest 2 %, "What’s your next event?", camA a155'),
 ("Ink", "ink-pill",     "#211D23",
  'ink core darkest 2 %, "Takwa Bay Beach", camA a067'),
 ("Ink", "ink-kebab",    "#1E1C1D",
  "ink core darkest 2 %, the 3.5 x 13.8 pt kebab beside a card title, cam0 p1"),
 ("Ink", "ink-inv",      "#F7F5F6",
  "ink core brightest 2 %, the floating pill's label, cam0 p1"),

 ("Accent", "pin",       "#8543CF",
  "per-pixel mode of the 816 px pin window, camA a067; a 1 pt glyph has no flat core"),
 ("Accent", "dash",      "#9F5D80",
  "ink core darkest 3 % along the left dash run, camA a067; the edge run gives #AB6288"),
 ("Accent", "ring",      "#982E69",
  "four points around two story rings, cam0 p1: #932D6E #982F69 #9F2D66 #97386B, "
  "a 6-level spread, so the ring is one colour and not a gradient"),

 ("Radius", "r-pill",    "999px",  "by construction, not measured"),
 ("Radius", "r-add",     "28px",   "corner sweep of the dashed add tile, cam0 p1"),
 ("Radius", "r-tile",    "20px",   "corner sweep of a photo tile, camA a176"),
 ("Radius", "r-phone",   "52px",
  "circular stand-in for the continuous display corner, matching --crop-phone's mask"),

 ("Type", "t-title",     "700 24px/29px var(--e-font)",
  'ink 22.1 pt on "Beach Party" and 22.9 on "Life Lately", cam0 p1; cap+descender '
  "is 0.927 em, so 24 px. The 126.6 and 107.2 pt ink widths hold it"),
 ("Type", "t-sub",       "400 14px/19px var(--e-font)",
  "ink 13.2 pt ascender-to-descender on both subtitles, cam0 p1, so 14 px; "
  '"Weekend with family and friends" measures 200.6 pt wide'),
 ("Type", "t-meta",      "400 12px/16px var(--e-font)",
  'ink 11.1 pt on "In 2 Days" and on "Today · 26/08/2025", cam0 p1, so 12 px'),
 ("Type", "t-pill",      "600 12px/16px var(--e-font)",
  'ink 11.1 pt, "Takwa Bay Beach" 94.1 pt wide inside a 128.0 pt pill, cam0 p1'),
 ("Type", "t-foot",      "400 14.5px/19px var(--e-font)",
  'ink 10.4 pt cap-to-baseline on "Share Invite", 0.714 em; the "34" is 15.9 pt '
  "wide, 0.57 em a digit, which agrees"),
 ("Type", "t-search",    "400 17px/22px var(--e-font)",
  'ink 15.9 pt on "What’s your next event?", 174.3 pt wide, cam0 p1'),
 ("Type", "t-story",     "400 12px/16px var(--e-font)",
  'ink 11.1 pt, "Bryan" 29.1 pt wide, cam0 p1 -- the only frame holding the row'),
 ("Type", "t-fab",       "600 15px/20px var(--e-font)",
  '"Create New Event" spans 174.7..295.8 pt inside the pill, cam0 p1'),
 ("Type", "t-time",      "590 17px/22px var(--e-font)", "iOS status bar clock"),

 ("Metrics", "w",        "440px",
  "iPhone 17 Pro Max logical width; the simulator title bar names the device"),
 ("Metrics", "h",        "956px",
  "iPhone 17 Pro Max logical height; 1379/956 agrees with 636/440 to 0.2 %"),
 ("Metrics", "status",   "62px",
  "safe-area top, Pro Max; the island's ink runs 5.8..42.3 pt on camA a155"),
 ("Metrics", "gutter",   "21px",
  "the left ink edge four elements agree on, cam0 p1: title 21.4, footer 20.8, "
  "add tile 20.1, header avatar 20.8; the bell's right edge gives 20.8 as well"),
 ("Metrics", "hdr-btn",  "38.7px",
  "bbox of the search and bell circles, cam0 p1: 330.7..369.4 and 380.5..419.2"),
 ("Metrics", "avatar",   "34.6px",
  "bbox of the header avatar, cam0 p1: cols 20.8..54.7, rows 76.1..111.4"),
 ("Metrics", "story-d",  "72.6px",
  "outer diameter of a ringed story circle, cam0 p1 cols; the two unringed ones "
  "measure 60.9 and 61.6, so the ring adds 5.7 pt a side"),
 ("Metrics", "story-p",  "85.7px",
  "centre pitch of the five story circles, cam0 p1: 84.7 85.8 86.5 85.8"),
 ("Metrics", "tile-w",   "90.1px",
  "the tile box, rim included. Two stacks bbox at 327.9 pt across four tiles "
  "and 248.7 across three, so the pitch is 79.2 and the widest tile 90.3; a "
  "bbox also holds the 2.2 deg rotation's own margin, so the box is the value "
  "that puts my stack's bbox on the capture's through the same pipeline"),
 ("Metrics", "tile-p",   "79.2px",  "same solve; the tiles overlap by 13.1 pt"),
 ("Metrics", "tile-h",   "117.7px",
  "the tile box, rim included; the photo bbox reads 117.7 on camA a176, 116.9 "
  "on camB b310 and 117.4 on b360, and the box is again matched bbox to bbox"),
 ("Metrics", "add-w",    "99.6px",  "bbox of the dashed add tile, cam0 p1: 20.1..119.7"),
 ("Metrics", "add-h",    "122.4px", "bbox of the dashed add tile, cam0 p1: 365.3..487.7"),
 ("Metrics", "fab-w",    "201.3px", "bbox of the floating pill, cam0 p1: 119.7..321.0"),
 ("Metrics", "fab-h",    "51.9px",  "bbox of the floating pill, cam0 p1: 850.2..902.1"),
 ("Metrics", "fab-btm",  "54px",    "956 - 902.1 on cam0 p1; camB b310 gives 51.5"),
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
        out.append("  --e-%s:%s;" % (name, value))
    return "\n".join(x for x in out if x is not None) + "\n}"


TOKENS_CSS = _root()

# ------------------------------------------------------- ink-top geometry ----
# SF Pro Rounded shares SF Pro Text's vertical metrics: ascent 0.9556 em,
# descent 0.2444 em, cap height 0.7143 em. A line box of height `lh` centres
# that 1.2 em slug inside itself, so the cap line lands
#
#     (lh - 1.2*fs)/2 + (0.9556 - 0.7143)*fs
#
# below the box top. Everything measured off a capture is a cap line; this is
# what turns one into a CSS `top`, and it is why no offset here is hand-tuned.
_METRICS = {n: tuple(float(x) for x in v.split(" ")[1].replace("px", "").split("/"))
            for _, n, v, _ in TOKENS if n.startswith("t-")}


def ink_top(style, cap_y):
    """CSS top for a line of `style` whose cap line must land on `cap_y`."""
    fs, lh = _METRICS[style]
    return round(cap_y - ((lh - 1.2 * fs) / 2 + 0.2413 * fs), 2)


# ------------------------------------------------------------ phone frame ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--e-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{position:relative;flex:none;width:var(--e-w);height:var(--e-h);
  border-radius:var(--e-r-phone);overflow:hidden;background:var(--e-ground);color:var(--e-ink);
  transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:var(--e-w);height:var(--e-status);z-index:9}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--e-t-time)}
.sb .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
.sb svg{position:absolute;display:block;fill:currentColor}
.home{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);
  width:139px;height:5px;border-radius:3px;background:currentColor;z-index:9}"""

# The template's status bar, unchanged, with every x shifted by the 47 px this
# frame is wider than the 393 pt one the icons were measured on, so the battery
# keeps its right inset. That is the only edit the clone skill allows here.
DX = 47

SB_ICONS = (
 '<svg style="left:%gpx;top:23.34px;width:19.33px;height:12px" viewBox="0 0 19.33 12">'
 '<rect x="0" y="7.67" width="3.33" height="4.33" rx="1.05"/>'
 '<rect x="5.33" y="5.33" width="3.33" height="6.67" rx="1.05"/>'
 '<rect x="10.67" y="2.67" width="3.33" height="9.33" rx="1.05"/>'
 '<rect x="16" y="0" width="3.33" height="12" rx="1.05"/></svg>'
 '<svg preserveAspectRatio="none" viewBox="335 22.008 19.114 13.796"'
 ' style="left:%gpx;top:23px;width:16.62px;height:12.3px">'
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
 '<svg style="left:%gpx;top:23px;width:27.3px;height:12.7px" viewBox="0 0 27.3 12.7">'
 '<rect x=".6" y=".6" width="24.1" height="11.5" rx="4" fill="none" stroke="currentColor"'
 ' stroke-opacity=".38"/><rect x="2" y="2" width="21.3" height="8.7" rx="2.6"/>'
 '<path d="M26.1 4.3c.9.7.9 3 0 3.7V4.3Z" fill-opacity=".38"/></svg>') % (
     282 + DX, 309 + DX, 333 + DX)

STATUSBAR = ('<div class="sb"><div class="island"></div><div class="time">9:41</div>'
             '%s</div>' % SB_ICONS)
HOME = '<div class="home"></div>'


# ----------------------------------------------------------------- icons ----
def icon(name, w, h, fill="currentColor"):
    """Inline assets/icons/<name>.svg at its measured ink box, in pt.

    The file's viewBox *is* that ink box, so the span and the artwork are 1:1
    and there is no scale to converge. The canvas's inspector names an inline
    <svg> from that folder by its geometry and hands it back as a vector asset;
    a path written as a literal here would get no name.
    """
    d = (OUT / "assets" / "icons" / (name + ".svg")).read_text(encoding="utf-8").strip()
    head, inner = d[:d.index(">")], d[d.index(">") + 1:d.rindex("</svg>")]
    keep = "".join(' %s="%s"' % (a, head.split(' %s="' % a)[1].split('"')[0])
                   for a in ("fill", "stroke", "stroke-width",
                             "stroke-linecap", "stroke-linejoin")
                   if ' %s="' % a in head)
    if ' fill="' not in head:
        keep += ' fill="%s"' % fill
    return ('<svg class="ic" viewBox="%s" style="width:%gpx;height:%gpx"%s>%s</svg>'
            % (head.split('viewBox="')[1].split('"')[0], w, h, keep, inner))


# ------------------------------------------------------------- the artwork ----
# ORIGINAL ART, NOT THE SOURCE'S PICTURES. Each row is one tile's measured
# dominant palette -- a three-colour median cut over the tile interior, done by
# scratch/palette.py -- and tile_art() composes an original abstract field from
# it. The palette is evidence; the composition is this repo's own. Nothing here
# reproduces a pixel of the recording.
PALETTES = {
 "ll": [("#332618", "#6E402A", "#97927C"), ("#6E453B", "#B7927C", "#D7BBA1"),
        ("#35351F", "#80622F", "#D4D9CE"), ("#65664E", "#6F9F9E", "#D2B284")],
 "rj": [("#204651", "#2E8E9A", "#51CEB6"), ("#5C3839", "#AC6A4D", "#E1BA93"),
        ("#24223C", "#45305F", "#9477B0")],
 "fg": [("#564A42", "#A8A197", "#D2D2CE"), ("#404D4A", "#97998B", "#BFD1CF"),
        ("#523F29", "#9B8560", "#CFC1A7"), ("#856C4E", "#B5BDAC", "#E3CCB0")],
}

# The header avatar and the five story avatars, same rule and same source.
FACES = [("#382017", "#735648", "#C7B6AD"), ("#371E15", "#745649", "#CAB8AE"),
         ("#520914", "#452C25", "#BC9A8A"), ("#423A31", "#448A94", "#6EA8AD"),
         ("#0F0A09", "#301E1C", "#664945"), ("#4F2B16", "#6F4F33", "#9A7D63")]


def tile_art(key, i, w, h):
    """An original abstract field in tile i's measured palette."""
    a, b, c = PALETTES[key][i]
    g = "t%s%d" % (key, i)
    return (
     '<svg class="art" viewBox="0 0 %g %g" preserveAspectRatio="xMidYMid slice">'
     '<defs><linearGradient id="%s" x1="0" y1="0" x2=".3" y2="1">'
     '<stop offset="0" stop-color="%s"/><stop offset=".58" stop-color="%s"/>'
     '<stop offset="1" stop-color="%s"/></linearGradient>'
     '<radialGradient id="%sr" cx=".72" cy=".24" r=".85">'
     '<stop offset="0" stop-color="%s" stop-opacity=".9"/>'
     '<stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient></defs>'
     '<rect width="%g" height="%g" fill="url(#%s)"/>'
     '<rect width="%g" height="%g" fill="url(#%sr)"/>'
     '<path d="M0 %g Q %g %g %g %g T %g %g V %g H0 Z" fill="%s" fill-opacity=".42"/>'
     '<path d="M0 %g Q %g %g %g %g T %g %g V %g H0 Z" fill="%s" fill-opacity=".26"/>'
     '<circle cx="%g" cy="%g" r="%g" fill="%s" fill-opacity=".30"/></svg>'
     % (w, h, g, a, b, c, g, c, c, w, h, g, w, h, g,
        h * .60, w * .26, h * .47, w * .50, h * .61, w, h * .58, h, a,
        h * .79, w * .30, h * .69, w * .56, h * .81, w, h * .77, h, c,
        w * .70, h * .26, w * .17, c))


def avatar_art(i, d):
    """The header and story avatars, same rule: original, in measured hues."""
    a, b, c = FACES[i]
    return ('<svg viewBox="0 0 %g %g" style="width:100%%;height:100%%;display:block">'
            '<defs><linearGradient id="av%d" x1="0" y1="0" x2=".55" y2="1">'
            '<stop offset="0" stop-color="%s"/><stop offset=".62" stop-color="%s"/>'
            '<stop offset="1" stop-color="%s"/></linearGradient></defs>'
            '<rect width="%g" height="%g" fill="url(#av%d)"/>'
            '<circle cx="%g" cy="%g" r="%g" fill="%s" fill-opacity=".55"/>'
            '<path d="M%g %g a%g %g 0 0 1 %g 0 Z" fill="%s" fill-opacity=".45"/></svg>'
            % (d, d, i, a, b, c, d, d, i,
               d * .50, d * .38, d * .16, c,
               d * .18, d * .90, d * .32, d * .32, d * .64, b))


# ----------------------------------------------------------------- feed ----
# The block model. Every offset is in pt from the card's own title cap line.
#
#   subtitle cap line   card1 +31.8   card2 +31.9   Rooftop +31.9   Friendsgiving +31.6
#   meta row top        card1 +56.7   card2 +55.8   Rooftop +57.6
#   media box top       card1 +97.0   card2 +89.0   Rooftop +97.3
#
# The meta row is taller where the card carries a location pill -- the pill
# boxes at 23.5 pt against a 16 pt text line -- and that 7.5 is most of the
# 8.1 between the two media tops above, which is the whole reason the two card
# shapes place their media at different offsets. One constant would have had to
# split the difference and be wrong on both. (The pill's 23.5 is its own bbox
# and lives in `.place`; the row is 23.5 too, so the pill fills it exactly.)
#
# The advance is a fit rather than a reading, and the fit is over three
# equations: the title cap lines the captures give at 571.4, 864.1 and 1162.6
# document pt, each reached by summing one more card block than the last. The
# other five numbers are pinned by a direct measurement: media_gap by the three
# media tops (16.9, 16.3, 17.3, taken to the tile *box*, which is a point
# outside the photo the probe sees), foot_gap by the two footer glyph rows the
# captures hold, card 1's at 505.7 on cam0 and card 2's at 797.9 on camB. Those
# two want 18.2 and 21.1, and foot_gap is their mean; the 2.9 between them is
# the same non-uniformity as everywhere else on this feed, and it is the one
# place a mean is taken over two readings rather than a fit over three.
#
# The three estimates are 62.60, 64.25 and 64.23, and the solve lands card 2 at
# +1.5, card 3 at -0.3 and card 4 at -0.4; `scratch/check.sh` reads those back
# off the render as +1.4, -0.6 and -0.8. Card 2 is the outlier because card 1
# is the only card whose media is the add tile rather than a photo stack; the
# source's own rhythm is not uniform either, its three footer-to-title gaps
# reading 63.6, 67.3 and 64.8. Giving each card its own pair would land all
# four exactly and would be eight numbers describing four gaps.
#
# Those three estimates once spread 3.6 pt rather than 1.6, and no reweighting
# closed them. The cause was not here: `--e-tile-w` and `--e-tile-h` were photo
# readings applied to a box that carries a border under `box-sizing:border-box`,
# so every stack rendered 4 pt short and every chain that crossed one drifted.
# A fit whose estimates will not converge is pointing at a wrong constant
# somewhere else.
CARD = {
 "sub":        31.8,
 "meta_top":   56.7,
 "pill_row":   23.5,   # bbox of the location pill, cam0 p1: 326.5..350.1
 "text_h":     16.0,   # the meta line box, --e-t-meta's line height
 "media_gap":  16.8,
 "foot_gap":   19.6,
 "advance":    64.1,   # footer cap line -> the next card's title cap line
}

STORY_TOP   = 139.1    # ring outer top, bands rows
STORY_LABEL = 220.7    # story label cap line
STORY_LEFT  = 21.0     # ring outer left of the first circle
CARD1_TITLE = 269.8    # "Beach Party" cap line

CARDS = [
 {"key": None, "title": "Beach Party",
  "sub": "Weekend with family and friends",
  "meta": ["In 2 Days", "Aug 28"], "place": "Takwa Bay Beach",
  "tiles": 0, "counts": ("34", "6")},
 {"key": "ll", "title": "Life Lately",
  "sub": "A collection of little moments, memories, and everything in between",
  "meta": ["Today", "26/08/2025"], "place": None,
  "tiles": 4, "counts": ("20", "14")},
 {"key": "rj", "title": "Rooftop Jazz Night",
  "sub": "Sunset sets, cold drinks and good company",
  "meta": ["Next Fri", "Sep 05"], "place": "Eko Hotel Rooftop",
  "tiles": 3, "counts": ("58", "22")},
 {"key": "fg", "title": "Friendsgiving",
  "sub": "Bring a dish, bring a friend, bring your appetite",
  "meta": ["In 3 Weeks", "Sep 19"], "place": "Tolu’s Place",
  "tiles": 4, "counts": ("12", "9")},
 # The fifth card is a title and nothing else. The recording scrolls just far
 # enough to read "Ada & Kome" at the bottom edge of camB and no further, so
 # the feed draws exactly that and invents no card body.
 {"key": None, "title": "Ada & Kome", "sub": None},
]

STORIES = [("Your story", False), ("Bryan", True), ("Beach", True),
           ("Aesthetics", False), ("Food", True)]

FEED_CSS = """.scroll{position:absolute;left:0;top:0;width:var(--e-w);height:var(--e-h);overflow:hidden}
.doc{position:absolute;left:0;width:var(--e-w)}
.ic{display:block;flex:none}

/* The header floats over the feed and blurs it, and it is a veil rather than
   a bar: on a155 the feed is scrolled so that card 1's pink add tile, a flat
   #F9EAF4, sits directly behind the whole header. That makes the header's own
   transparency readable off one column. Taking the mean of x 86..106 in four
   pt bands and solving each against the tile and the ground gives

       screen pt   40  48  56  64  72  |  96 104 112 120 128 136 140
       alpha      .89 .89 .89 .81 .79  | .55 .41 .27 .22 .10 .15 .08

   with 76..92 unusable because the search placeholder crosses it. So the
   header never closes: it holds .89 down past the search row, then ramps to
   nothing by about 148. A first pass painted the ground solid to 78 pt and
   the a155 diff showed it plainly -- the whole top of the capture is pink
   where mine was grey.

   Blur and veil are two elements, as at the bottom of the screen, because
   only the blur wants a mask: a single element's mask would multiply the
   veil's own alpha and fade it twice. */
.hdrblur{position:absolute;left:0;top:0;width:var(--e-w);height:148px;z-index:7;
  -webkit-backdrop-filter:blur(15px);backdrop-filter:blur(15px);
  -webkit-mask-image:linear-gradient(#000 0 38%,transparent);
  mask-image:linear-gradient(#000 0 38%,transparent)}
.hdrveil{position:absolute;left:0;top:0;width:var(--e-w);height:148px;z-index:7;
  background:linear-gradient(rgba(234,232,233,.89) 0 38%,rgba(234,232,233,.78) 51%,
    rgba(234,232,233,.50) 68%,rgba(234,232,233,.27) 76%,rgba(234,232,233,0))}
.hdr{position:absolute;left:0;top:0;width:var(--e-w);height:126px;z-index:8}
.hdr .av{position:absolute;left:20.8px;top:76.1px;width:var(--e-avatar);
  height:var(--e-avatar);border-radius:50%;overflow:hidden}
.hdr .q{position:absolute;left:64.3px;font:var(--e-t-search);
  letter-spacing:-.3px;color:var(--e-ink-search)}
.hdr .btn{position:absolute;top:74px;width:var(--e-hdr-btn);height:var(--e-hdr-btn);
  border-radius:50%;background:var(--e-circle);color:var(--e-ink-search);
  display:flex;align-items:center;justify-content:center}

/* story row */
.story{position:absolute;left:0;width:var(--e-w)}
.story .s{position:absolute;top:0;width:var(--e-story-d)}
.story .ring{position:relative;width:var(--e-story-d);height:var(--e-story-d);
  border-radius:50%;display:flex;align-items:center;justify-content:center}
.story .ring.on{background:var(--e-ring)}
.story .in{width:61.2px;height:61.2px;border-radius:50%;overflow:hidden;
  background:var(--e-ground)}
.story .ring.on .in{box-shadow:0 0 0 3.1px var(--e-ground)}
.story .add{position:absolute;right:-1px;bottom:-1px;width:19px;height:19px;
  border-radius:50%;background:var(--e-badge);border:2.4px solid var(--e-ground);
  display:flex;align-items:center;justify-content:center;color:#fff;
  font:600 13px/1 var(--e-font)}
.story em{position:absolute;left:-8px;right:-8px;font:var(--e-t-story);
  letter-spacing:-.25px;color:var(--e-ink-2);font-style:normal;
  white-space:nowrap;text-align:center}

/* card */
.card{position:absolute;left:0;width:var(--e-w)}
/* Tracking is measured, not styled. Four titles set 1.4 to 2.5 pt wide at
   -.45, which is -.15 a character across 11, 11, 13 and 18 of them, so the
   title tracks at -.6. The body sizes come out at -.25 the same way: the
   subtitle 7.6 over 31 characters, Bryan 1.3 over 5, and the search
   placeholder 7.0 over 23, which is -.3. */
.card h2{position:absolute;left:var(--e-gutter);font:var(--e-t-title);
  color:var(--e-ink);letter-spacing:-.6px;white-space:nowrap}
.card .kebab{position:absolute;left:403.3px;top:2.1px;color:var(--e-ink-kebab)}
/* 402 and not the 398 the ink alone suggests: the capture truncates Life
   Lately's subtitle after `in bet`, and at 398 the browser drops the t. A
   measured width and a measured truncation disagree by 4 pt here, and the
   copy is what wins -- the string is part of the replica. */
.card .sub{position:absolute;left:var(--e-gutter);width:402px;font:var(--e-t-sub);
  color:var(--e-ink-2);letter-spacing:-.25px;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.card .meta{position:absolute;left:var(--e-gutter);display:flex;align-items:center;
  font:var(--e-t-meta);color:var(--e-ink-3);white-space:nowrap}
.card .meta i{font-style:normal;padding:0 6.4px;font-size:14px;line-height:1}
.card .place{display:inline-flex;align-items:center;height:23.5px;
  padding:0 9px 0 8.8px;border-radius:var(--e-r-pill);background:var(--e-pill);
  color:var(--e-ink-pill);font:var(--e-t-pill);letter-spacing:-.25px;
  margin-left:2.6px}
.card .place .ic{margin-right:4.4px}

/* the dashed add-photo tile */
.add-tile{position:absolute;left:20.1px;width:var(--e-add-w);height:var(--e-add-h);
  border-radius:var(--e-r-add);background:var(--e-add);color:var(--e-dash);
  border:1.9px dashed var(--e-dash);display:flex;align-items:center;justify-content:center}

/* photo stack: overlapping tiles, each rimmed white and slightly tilted. The
   rim is 1 pt, not the 3 it looks like: at camB's 3.6 px to the pt the seam
   between two tiles peaks at #F6E7EA over 1.1 pt and the outer left rim at
   #EAEAEA over 0.9, so what reads as a white border is one point of rim plus
   the drop shadow under the tile beside it. The tile tokens are the photo
   extent plus that rim, and left is the photo's own 22.7 less the rim. */
.stack{position:absolute;left:23.1px;height:var(--e-tile-h)}
.stack .t{position:absolute;top:0;width:var(--e-tile-w);height:var(--e-tile-h);
  border-radius:var(--e-r-tile);overflow:hidden;background:var(--e-tile-rim);
  border:1px solid var(--e-tile-rim);box-shadow:0 2px 8px rgba(29,25,26,.12)}
.stack .art{width:100%;height:100%;display:block}

/* footer */
.foot{position:absolute;left:var(--e-gutter);display:flex;align-items:center;
  font:var(--e-t-foot);color:var(--e-ink-foot)}
.foot .g{display:flex;align-items:center}
.foot .g+.g{margin-left:21.4px}
.foot .g b{font-weight:400;margin-left:7.9px}

/* The feed blurs out at the bottom as well as the top, and this is the one
   thing the first pass missed outright. On p1 an empty column reads the flat
   #EAE8E9 ground down to 842.6, then climbs: #EDEAEB at 859, #EFEDEE at 887,
   #F3F0F1 at 912, #F6F4F5 at 947 and #FDFDFD at 951, which is white over the
   ground at an alpha running 0 to ~.85 across the last 116 pt. The blur rides
   the same band on its own element, because the two ramps are not the same
   ramp: the blur has already taken hold well above where the veil starts. Life
   Lately's footer at 796.8 is crisp and Rooftop's title at 863.5 is a set of
   soft grey shapes, so the blur fades in over exactly that span -- a 150 tall
   band whose mask is clear at its 806 top and opaque by 863. The radius is
   read off b360 rather than p1: at cam0's 1.4 px to the pt everything down
   there looks smeared, and a first pass at 10 px -- fitted to that -- left
   Friendsgiving's title at 905 illegible where the capture still reads it. */
.botblur{position:absolute;left:0;bottom:0;width:var(--e-w);height:150px;z-index:6;
  -webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);
  -webkit-mask-image:linear-gradient(transparent,#000 38%,#000);
  mask-image:linear-gradient(transparent,#000 38%,#000)}
.botveil{position:absolute;left:0;bottom:0;width:var(--e-w);height:116px;z-index:6;
  background:linear-gradient(transparent,rgba(255,255,255,.85))}

/* the floating action pill */
.fab{position:absolute;left:50%;transform:translateX(-50%);bottom:var(--e-fab-btm);
  width:var(--e-fab-w);height:var(--e-fab-h);display:flex;align-items:center;
  padding-left:29.1px;border-radius:var(--e-r-pill);background:var(--e-fab);
  -webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);
  color:var(--e-ink-inv);font:var(--e-t-fab);z-index:8;
  box-shadow:0 8px 24px rgba(29,25,26,.20)}
.fab .ic{margin-right:12.8px}"""


def card_html(c, cap):
    """One card whose title cap line sits at `cap`. Returns (html, foot_cap)."""
    parts = ['<h2 style="top:%gpx">%s</h2>' % (ink_top("t-title", cap) - cap, c["title"]),
             '<span class="kebab">%s</span>' % icon("kebab", 3.5, 13.8)]

    if c["sub"] is None:                       # the fifth card: a title, no body
        return '<div class="card" style="top:%gpx">%s</div>' % (cap, "".join(parts)), None

    parts.append('<div class="sub" data-clip-ok style="top:%gpx">%s</div>'
                 % (ink_top("t-sub", cap + CARD["sub"]) - cap, c["sub"]))

    row_h = CARD["pill_row"] if c["place"] else CARD["text_h"]
    meta = '<i>&middot;</i>'.join("<span>%s</span>" % s for s in c["meta"])
    if c["place"]:
        meta += ('<i>&middot;</i><span class="place">%s%s</span>'
                 % (icon("pin", 11.5, 14, fill="var(--e-pin)"), c["place"]))
    parts.append('<div class="meta" style="top:%gpx;height:%gpx">%s</div>'
                 % (CARD["meta_top"], row_h, meta))

    media_top = CARD["meta_top"] + row_h + CARD["media_gap"]
    if c["tiles"] == 0:
        media_h = 122.4
        parts.append('<div class="add-tile" style="top:%gpx">%s</div>'
                     % (media_top, icon("plus", 16.6, 16.6)))
    else:
        media_h = 117.7
        n, tw, pitch = c["tiles"], 90.1, 79.2
        # The stacks lean a degree or two and alternate: a176 puts tile 1's left
        # edge 2.6 pt outside the box the two camB frames agree on, which is the
        # rotation showing, not a different layout.
        tilt = (-2.2, 1.1, -1.3, 2.0)
        parts.append('<div class="stack" style="top:%gpx;width:%gpx">%s</div>'
                     % (media_top, tw + (n - 1) * pitch, "".join(
                        '<div class="t" style="left:%gpx;transform:rotate(%gdeg);'
                        'z-index:%d">%s</div>'
                        % (i * pitch, tilt[i], i, tile_art(c["key"], i, tw, 117.7))
                        for i in range(n))))

    foot_cap = cap + media_top + media_h + CARD["foot_gap"]
    parts.append('<div class="foot" style="top:%gpx">'
                 '<span class="g">%s<b>%s</b></span>'
                 '<span class="g">%s<b>%s</b></span>'
                 '<span class="g">%s<b>Share Invite</b></span></div>'
                 % (ink_top("t-foot", foot_cap) - cap,
                    icon("bubble", 14.3, 14.5), c["counts"][0],
                    icon("people", 15.3, 11.4), c["counts"][1],
                    icon("share", 11.4, 14.3)))
    return '<div class="card" style="top:%gpx">%s</div>' % (cap, "".join(parts)), foot_cap


def feed():
    """The whole scrolling document, laid out once. Boards are windows on it."""
    row = "".join(
        '<div class="s" style="left:%gpx">'
        '<div class="ring%s"><div class="in">%s</div>%s</div>'
        '<em style="top:%gpx">%s</em></div>'
        % (STORY_LEFT + i * 85.7, " on" if ringed else "", avatar_art(i + 1, 61.2),
           '<span class="add">+</span>' if i == 0 else "",
           ink_top("t-story", STORY_LABEL) - STORY_TOP, label)
        for i, (label, ringed) in enumerate(STORIES))
    parts = ['<div class="story" style="top:%gpx">%s</div>' % (STORY_TOP, row)]

    cap = CARD1_TITLE
    for c in CARDS:
        html, foot_cap = card_html(c, cap)
        parts.append(html)
        if foot_cap is None:
            return "".join(parts), cap + 60
        cap = foot_cap + CARD["advance"]
    return "".join(parts), cap


FEED_HTML, FEED_H = feed()

HEADER = ('<div class="hdrblur"></div><div class="hdrveil"></div>'
          '<div class="hdr"><div class="av">%s</div>'
          '<div class="q" style="top:%gpx">What’s your next event?</div>'
          '<div class="btn" style="left:330.7px">%s</div>'
          '<div class="btn" style="left:380.5px">%s</div></div>'
          % (avatar_art(0, 34.6), ink_top("t-search", 87.2),
             icon("search", 17, 17), icon("bell", 17, 18)))

FAB = ('<div class="botblur"></div><div class="botveil"></div>'
       '<div class="fab">%sCreate New Event</div>'
       % icon("plus", 13, 13, fill="var(--e-ink-inv)"))


def screen(scroll):
    return ('%s<div class="scroll"><div class="doc" style="top:%gpx">%s</div></div>%s%s%s'
            % (STATUSBAR, -scroll, FEED_HTML, HEADER, FAB, HOME))


# ----------------------------------------------------------------- emit ----
def pg(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--e-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html, encoding="utf-8", newline="\n")
    print("%-22s %8d" % (name, len(html)))


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--e-ground);color:var(--e-ink)}
.sheet{width:532px;height:1004px;padding:22px;overflow:hidden}
h1{font:600 17px/22px var(--e-font);margin-bottom:2px}
header p{font:400 11px/15px var(--e-font);color:var(--e-ink-3);margin-bottom:13px}
h2{font:600 9px/12px var(--e-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--e-ink-3);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid rgba(29,25,26,.12)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--e-ink-3);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:46px;height:26px;background:var(--e-pill);border:1px solid rgba(29,25,26,.14)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--e-font);
  color:var(--e-ink-3);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid rgba(29,25,26,.08)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--e-ink-3);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 8.6px/12.4px ui-monospace,Menlo,monospace;color:var(--e-ink-2)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid rgba(29,25,26,.08);font:400 8.5px/11px var(--e-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace}
td.t{color:#8543CF;white-space:nowrap}
td.v{color:var(--e-ink-2);max-width:120px;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap}
td.e{color:var(--e-ink-3)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--e-%s)"></div>'
        '<b>--e-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    type_ = "".join(
        '<div class="tr"><span style="font:var(--e-%s)">Weekend with family</span>'
        '<em>--e-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--e-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return pg(NAME + " - Design Tokens",
              '<div class="sheet"><header><h1>%s &mdash; design tokens</h1>'
              '<p>%d tokens. Every value is measured on a named frame at a named '
              'scale, and the evidence boards carry the measurement behind each '
              'one.</p></header>'
              '<h2>Colour</h2><div class="grid">%s</div>'
              '<h2>Radius</h2><div class="rad">%s</div>'
              '<h2>Type &mdash; SF Pro Rounded</h2>%s'
              '<h2>Metrics</h2><div class="met">%s</div></div>'
              % (NAME, len(TOKENS), swatches, radii, type_, met), SHEET)


EV_ROWS = 24


def evidence_boards():
    pages = [TOKENS[i:i + EV_ROWS] for i in range(0, len(TOKENS), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--e-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages))
        yield ("00%s-evidence" % "bcdefgh"[i],
               pg(NAME + " - Evidence" + of,
                  '<div class="sheet"><header><h1>Evidence%s</h1>'
                  '<p>One row per token. A token with no evidence is a guess. The '
                  'frame names are the captures in assets/refs/, which this folder '
                  'does not commit.</p></header>'
                  '<table class="ev">%s</table></div>' % (of, rows), SHEET))


# --------------------------------------------------------------- screens ----
# One feed, four windows. Each offset was solved by locating one element in the
# capture named beside it and subtracting from that element's document position.
SCREENS = [
 ("01-feed-top",      "Feed, top",     0.0),
 ("02-life-lately",   "Life Lately",   257.8),
 ("03-rooftop",       "Rooftop Jazz",  336.4),
 ("04-friendsgiving", "Friendsgiving", 532.8),
]


# ------------------------------------------------- Phase 5: the reference ----
REF_CSS = """.rboard{width:484px;height:956px;background:#151311;border-radius:20px;
  padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rboard h1{font:600 14px/18px var(--e-font);letter-spacing:-.1px}
.rboard p{font:400 9.5px/13.5px ui-monospace,Menlo,monospace;
  color:rgba(255,255,255,.5);margin-top:2px}
.rboard .shot{margin-top:9px;display:flex;justify-content:center}
.rboard img{max-height:868px;max-width:440px;width:auto;display:block;border-radius:6px}
.rboard .near{color:#F1CD8A}"""

# (screen, label, capture, scale, note). The captures are frames of the
# recording cut to the screen at the geometry in the header comment. They are
# not committed -- assets/refs/ is gitignored, as the skill requires -- so
# ref_boards() falls back to a placeholder in a fresh checkout.
REFS = [
 ("01-feed-top", "Feed, top", "p1.png", "cam0 &middot; 1.4455 px/pt",
  "whole screen &mdash; the only frame holding all 956 pt"),
 ("02-life-lately", "Life Lately", "b360.png", "camB &middot; 3.6114 px/pt",
  "screen pt 520..956 &mdash; the camera holds no more at this zoom"),
 ("03-rooftop", "Rooftop Jazz", "a155.png", "camA &middot; 3.7818 px/pt",
  "screen pt 0..410, and a tap indicator sits over the subtitle"),
 ("04-friendsgiving", "Friendsgiving", "b310.png", "camB &middot; 3.6114 px/pt",
  "screen pt 520..956"),
]

MISSING = ('<svg xmlns="http://www.w3.org/2000/svg" width="440" height="700">'
           '<rect width="440" height="700" fill="#221F1C"/>'
           '<text x="220" y="350" fill="#6E665D" text-anchor="middle"'
           ' font-family="monospace" font-size="13">%s is not in this checkout'
           '</text></svg>')


def ref_boards():
    for name, label, shot, scale, note in REFS:
        p = OUT / "assets" / "refs" / shot
        if p.exists():
            uri = "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
        else:
            uri = ("data:image/svg+xml;base64,"
                   + base64.b64encode((MISSING % shot).encode()).decode())
        whole = note.startswith("whole")
        yield "ref-" + name, pg(
            NAME + " - reference: " + label,
            '<div class="rboard"><h1>%s &mdash; reference</h1>'
            '<p>%s &middot; screen recording &middot; %s<br>'
            '<span%s>%s</span></p><div class="shot"><img src="%s" alt="%s"></div></div>'
            % (label, name, scale, "" if whole else ' class="near"', note, uri, label),
            REF_CSS)


# ------------------------------------------------------------------ run ----
write("00-design-tokens", token_board())
for _name, _html in evidence_boards():
    write(_name, _html)
for _name, _label, _scroll in SCREENS:
    write(_name, pg(NAME + " - " + _label,
                    '<div class="phone">%s</div>' % screen(_scroll), FEED_CSS))
for _name, _html in ref_boards():
    write(_name, _html)

# Every board declares 532 x 1004: a 440 x 956 screen does not fit the default
# 478 x 980 artboard, and a row is laid out at its first file's size.
WH = {"w": 532, "h": 1004}
LAYOUT = {
 "name": PAGE_NAME,
 "order": 3,
 "cover": "01-feed-top",
 "coverBox": [46, 24, 440, 956],
 "ground": "#d9d6d7",
 "rows": [
  {"title": "Foundations",
   "files": [dict(file="00-design-tokens", label="Design tokens", **WH)]
            + [dict(file=n, label="Evidence", **WH) for n, _ in evidence_boards()]},
  {"title": "Screens: one feed, four scroll offsets", "numbered": True,
   "files": [dict(file=n, label=l, **WH) for n, l, _ in SCREENS]},
  {"title": "Source of truth: captures", "numbered": True,
   "files": [dict(file="ref-" + n, label=l, **WH) for n, l, _, _, _ in REFS]},
 ],
}
(OUT / "layout.json").write_text(json.dumps(LAYOUT, indent=2) + "\n",
                                 encoding="utf-8", newline="\n")
print("\nlayout.json  %d rows;  feed document %d pt;  deepest scroll %.1f"
      % (len(LAYOUT["rows"]), round(FEED_H), SCREENS[-1][2]))
