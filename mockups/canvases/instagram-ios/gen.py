"""Instagram for iOS: fourteen screens, rebuilt from Mobbin captures.

Eight are one account's profile. Six are the feed: the Following/Favorites
switcher open over the home feed, the two feeds it opens, and the two
fullscreen reels views. A fifteenth is the profile layout carrying a live
account instead of a capture.

    python3 mockups/canvases/instagram-ios/gen.py

regenerates every board in place, byte-identical, from anywhere. Boards are
output; never hand-edit the .html.

What is measured and what is not. Every colour, baseline, box and pitch in
here came off assets/refs/cNN.png -- the fourteen captures at 1179 x 2556, three
capture pixels per design point -- and the measurement that justifies it is in
probes.json, replayable with `refkit batch`. The one thing not measured here
is the iOS status bar: it is this repo's shared chrome, copied unchanged from
templates/gen.py, clock and all. The captures carry no home indicator (Mobbin
strips it), so neither do these boards.

What is cropped and what is rebuilt. Only photography and editorial art are
cropped: the boxes in crops.json, cut out of the captures and placed back by
art() at the same numbers, so an asset cannot drift from where it was measured.
Everything else is live -- type, buttons, rings, the tab bar, the grid's
play/carousel/pin badges and the reels view counts. Interface set on a
photograph is listed in that crop's `erase`, inpainted out of it and redrawn on
top: on the feed boards that is every line of type over a post. A ring, an
outlined pill and an opaque badge are not erased, because the live element
covers its own pixels one to one and the erase would take the video out of the
hole it leaves.

Where the icons come from. 34 of the 44 SVGs in assets/icons are Meta's own
IGDS drawings, lifted out of the IGDS*Icon.react modules in the JS the
logged-out instagram.com shell loads, except threads-note, which only
threads.com carries; the other 10 are traced or drawn from the captures,
because they only appear behind the login wall. icon() sets preserveAspectRatio="none", so
each file's viewBox is the glyph's ink box, never a module's design grid --
see the folder README.

Board 15 is the exception to all of that. It has no capture behind it: it is
the geometry boards 01, 06 and 07 were measured at, filled with what the
profile API returns for one live account, so it carries no delta, no probe and
no crop. Its pictures are that API's own files, in assets/photo.

The scroll model. Boards 03-05 are board 01 scrolled by exactly 208.33 pt:
the mutuals row, the buttons and the highlights all move by that one number,
and the nav is opaque, so nothing above the mutuals survives. Board 02 is the
same account scrolled far enough that the tab bar sticks under the nav; its
first grid row is board 01's second, which is why boards 01 and 02 share the
crops ig-t4..ig-t6.
"""
import base64, json, re
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
ICON_DIR = OUT / "assets" / "icons"
PHOTO_DIR = OUT / "assets" / "photo"

NAME = "Instagram"
PAGE_NAME = "(example) " + NAME
P = "ig"         # token prefix: --ig-bg, --ig-ink, --ig-t-body

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Written with the placeholder prefix --x-
# throughout and rewritten to P on the way out, so the CSS below stays
# readable. Boxes in the evidence are design pt on the captures.
# The avatar's story ring is an angular sweep, not a linear one: sampled every
# 30 degrees at mid-stroke (r 48.5 on c01's d 99.7 ring) the two halves do not
# mirror about any axis, which a linear gradient on a circle always does. These
# are those twelve samples, straight off the capture, closing back on the first.
STORY = ("conic-gradient(#E731A3 0deg,#D52BBD 30deg,#D32CCB 60deg,#E433A1 90deg,"
         "#EB335A 120deg,#E95F20 150deg,#EEA837 180deg,#F7CE43 210deg,"
         "#F4D243 240deg,#F0A63B 270deg,#EE6329 300deg,#EB3260 330deg,#E731A3 360deg)")

# The widgets draw their own story ring, and it is not the app's: it runs
# magenta at 12 o'clock where the app's runs pink, and it turns through gold at
# 90 degrees where the app's is still violet. Same method as STORY, 24 samples
# 15 degrees apart, but averaged over the five rings c17 carries at two sizes
# (scratch/wring.py); no sample spreads more than 3.2 levels across the five.
WSTORY = ("conic-gradient(#C328BA 0deg,#CD55B2 15deg,#D576A5 30deg,#DF9299 45deg,"
          "#E7A981 60deg,#EFC16B 75deg,#FAD54A 90deg,#F9C943 105deg,#F6BD3E 120deg,"
          "#F3AD3C 135deg,#F29F38 150deg,#F09131 165deg,#EF8132 180deg,#EE773C 195deg,"
          "#EE6B4A 210deg,#E9624F 225deg,#EE555F 240deg,#EC4566 255deg,#EC346B 270deg,"
          "#E63579 285deg,#DD3588 300deg,#D33595 315deg,#D133A2 330deg,#CC2FB3 345deg,"
          "#C328BA 360deg)")

# The ramp board 19's four shortcut glyphs are stroked in. It is an SVG paint
# and not a CSS background, so unlike STORY it is no token: grad() lays it over
# each glyph's own box and probes.json carries the fit. Twelve stops, solved
# against the four glyphs at once (scratch/wglyphchk.py).
RAMP = [(.436, "#F6D144"), (.484, "#F4BD40"), (.532, "#EF8B3E"), (.580, "#EB5953"),
        (.628, "#EA4279"), (.676, "#EA3986"), (.724, "#EA36B6"), (.772, "#E334CF"),
        (.820, "#C42DE4"), (.868, "#9124F1"), (.916, "#7423F4"), (.964, "#6B23F4")]

# The feed switcher's ground is a heavy blur of the story rail behind it, and
# nothing of that rail survives under it to blur: ring 2's photograph is wholly
# covered and ring 3's left half with it. So it ships as gradients, one per cell
# of a 5 x 4 lattice over the popover -- cells 29.7 x 30.0 pt, each reaching its
# neighbours' centres. Their colours are the least-squares fit of that stack to
# c09's own pixels inside the popover, the glyphs and the rounded corners masked
# out (scratch/popfit.py): mean |d| 4.68 of 255 over the 75.5% that is ground.
POP = ("radial-gradient(20% 25% at 10% 12.5%,#F1C1B6 0%,#F1C1B600 100%),"
       "radial-gradient(20% 25% at 30% 12.5%,#F0BCB6 0%,#F0BCB600 100%),"
       "radial-gradient(20% 25% at 50% 12.5%,#F8EEFF 0%,#F8EEFF00 100%),"
       "radial-gradient(20% 25% at 70% 12.5%,#F9DBEA 0%,#F9DBEA00 100%),"
       "radial-gradient(20% 25% at 90% 12.5%,#F4AEFC 0%,#F4AEFC00 100%),"
       "radial-gradient(20% 25% at 10% 37.5%,#ECC9D1 0%,#ECC9D100 100%),"
       "radial-gradient(20% 25% at 30% 37.5%,#EAC5C8 0%,#EAC5C800 100%),"
       "radial-gradient(20% 25% at 50% 37.5%,#F5D7E2 0%,#F5D7E200 100%),"
       "radial-gradient(20% 25% at 70% 37.5%,#F7C5C5 0%,#F7C5C500 100%),"
       "radial-gradient(20% 25% at 90% 37.5%,#F7C3DF 0%,#F7C3DF00 100%),"
       "radial-gradient(20% 25% at 10% 62.5%,#F0C7B5 0%,#F0C7B500 100%),"
       "radial-gradient(20% 25% at 30% 62.5%,#F0C3B3 0%,#F0C3B300 100%),"
       "radial-gradient(20% 25% at 50% 62.5%,#F6E9F7 0%,#F6E9F700 100%),"
       "radial-gradient(20% 25% at 70% 62.5%,#F9F0C7 0%,#F9F0C700 100%),"
       "radial-gradient(20% 25% at 90% 62.5%,#FCDCA6 0%,#FCDCA600 100%),"
       "radial-gradient(20% 25% at 10% 87.5%,#EFF3EC 0%,#EFF3EC00 100%),"
       "radial-gradient(20% 25% at 30% 87.5%,#ECF3F6 0%,#ECF3F600 100%),"
       "radial-gradient(20% 25% at 50% 87.5%,#EEF4FA 0%,#EEF4FA00 100%),"
       "radial-gradient(20% 25% at 70% 87.5%,#E9F0FC 0%,#E9F0FC00 100%),"
       "radial-gradient(20% 25% at 90% 87.5%,#F1F6ED 0%,#F1F6ED00 100%),"
       "#F5D7BE")

TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on the c01 nav title: SF Pro, score 0.922, margin 0.104 over the runner-up"),

 ("Surface", "bg",   "#FFFFFF",
  "flat census of c01 200-300 x 302-312, the ground between the Threads and mutuals rows: 100% flat"),
 ("Surface", "fill", "#F1F2F6",
  "flat census of the c01 Message button at 240-330 x 375-395: 89.4% flat, no channel under 241"),
 ("Surface", "bar-dark", "#0D1116",
  "flat census of the c13 fullscreen tab bar at 60-340 x 810-845: 100% flat"),
 ("Surface", "toast", "#6C666D",
  "c13 toast, four windows inside the box: 95.3% flat at its left margin; the alpha solve against the video above and below returns .92-1.00 per channel, so it ships opaque"),
 ("Surface", "badge", "#212329",
  "c09 story badge's dark disc, 69.5-74 x 180-193 inside the plus's arms: 64.1% flat"),
 ("Surface", "home", "#D5D5D5",
  "flat census of c19 20-373 x 600-800, the empty home screen below the four widgets: 100% flat"),
 ("Surface", "wtile", "#F5F5F5",
  "flat census of the c20 shortcut tile at 46-75 x 155-220, left of its glyph: 99.7% flat"),
 ("Surface", "blank", "#D3D7DA",
  "flat census of c16's blank avatar at 52-62 x 152-168, inside the disc and clear of the silhouette: 93.0% flat"),
 ("Surface", "scrim", "#383C41",
  "c12 mute badge's disc at 358-374 x 686-702, inside the glyph's arms; opaque, not a white at alpha"),
 ("Surface", "pop", POP,
  "20 radial gradients on a 5 x 4 lattice, least-squares fitted to the c09 popover's own ground at 122.3-270.7 x 110.7-230.7: mean |d| 4.68 over its 75.5% that is not glyph or corner"),

 ("Line", "hairline", "#DADADA",
  "c06 tab-bar divider at y 346.0, one device pixel tall and the full width: 72.3% flat"),
 ("Line", "ring",     "#DDDEE2",
  "c01 highlight 1's ring at 9 o'clock, 3.3pt of stroke over 12pt of height: 56.1% flat"),
 ("Line", "nav-line",  "#EFEFEF",
  "c10 and c11 divider under the feed nav at y 113.0-113.33, one device pixel tall and the full width"),
 ("Line", "track",     "#2E3137",
  "c13 progress bar right of the played head, 200-380 x 767.3-768.3"),
 ("Line", "played",    "#A4AAB1",
  "c13 progress bar left of the played head, 5-40 x 767.3-768.3"),

 ("Ink", "ink",     "#0E0F13",
  "flat census of the c01 active-tab underline, 29-69 x 559-561: the only solid fill of this colour in the set"),
 ("Ink", "ink-2",   "#6E7074",
  "modal ink of c06's 'Follow this account to see their photos'; --only ink reads #696C6E, iOS stem-darkening"),
 ("Ink", "ink-inv", "#FFFFFF",
  "label core on the accent fill, c01 Follow"),
 ("Ink", "ink-w",   "#000000",
  "ink core of the c16 widget title Messages at 43-113 x 104-118; the widgets set their type on pure black, not on the app's --x-ink"),
 ("Ink", "ink-w2",  "#89898A",
  "ink core of the c20 placeholder at 89-237 x 113-127; c17's Your story label at 49-106 x 213-225 reads #8A8A8A"),

 ("Accent", "accent",   "#4A5DF6",
  "flat census of the c01 Follow button at 60-150 x 375-395: 94.6% flat"),
 ("Accent", "accent-2", "#465DFF",
  "flat census of the c11 Add favorites button at 140-250 x 545-575: 94.9% flat; a second blue, not c01's"),
 ("Accent", "notif",    "#EB3437",
  "modal of the c09 header notification dot, ink box 370.0-378.0 x 72.33-80.33"),
 ("Accent", "link",     "#3846C7",
  "modal ink of c01's youtube.com URL; --only ink reads #3543B4, iOS stem-darkening"),
 ("Accent", "verified", "#3F96F4",
  "flat census of the c01 verified disc, 156-163 x 81-88 inside the tick's arms: 42.9% flat"),
 ("Accent", "sub",      "#7339F5",
  "modal of the filled crown on c08 highlight 1, ink box 12.67-24.0 x 484.33-492.67"),
 ("Accent", "story",    STORY,
  "24-sample sweep of the c01 avatar ring at r 48.5, kept every 30 deg; conic, because the halves do not mirror"),
 ("Accent", "story-w",  WSTORY,
  "the widget story ring: 24 samples 15 degrees apart, averaged over the five rings on c17, spread <= 3.2 levels"),

 ("Radius", "r-btn",   "8px",
  "refkit bbox on the c01 Follow button corner, 16-194 x 369-401"),
 ("Radius", "r-cta",   "12px",
  "c11 Add favorites: insets 7.00/5.00/2.66/1.33/0.33/0.00 at d 1/2/4/6/9/12 against r 12's 7.20/5.37/3.06/1.61/0.38/0.00"),
 ("Radius", "r-toast", "16px",
  "c13 toast corner: inset 14.33 at d 0.5 and 9.00 at d 1.5"),
 ("Radius", "r-pop",   "20px",
  "c09 popover corner: insets 16.0/11.33/7.67/3.67/0.67 at d 1/2/4/8/14 fit r 20 within 0.3"),
 ("Radius", "r-tile",  "9px",      "c20 shortcut tile, left-inset solve at eight depths: err 0.26 at r 9"),
 ("Radius", "r-thumb", "6.67px",   "c18 reel thumbnail, left-inset solve: err 0.21 at r 6.67"),
 ("Radius", "r-field", "21px",     "c20 search field, 44.0 tall and fully rounded: r is half its height"),
 ("Radius", "r-widget", "27.8px",  "every widget corner, left-inset solve at eight depths on c16 and c19: err 0.18 at r 27.8"),
 ("Radius", "r-phone", "52px",
  "circular stand-in for the 55pt continuous display corner"),

 ("Type", "t-nav",   "700 20px/24px var(--x-font)",
  "c01 'instagram' ink 53.3-146.0, w 92.67, baseline 91.5; 700 20px sets 93.33"),
 ("Type", "t-stat",  "600 16px/20px var(--x-font)",
  "c01 '8,283' w 43.33 and '698M' w 43.33, baseline 180.67; 600 16px sets 43.67 and 43.33"),
 ("Type", "t-body",  "400 14px/18px var(--x-font)",
  "c01 'posts/followers/following' w 34.0/57.0/56.67 and the bio w 218.67; 400 14px sets all four to within 0.7"),
 ("Type", "t-bodys", "600 14px/18px var(--x-font)",
  "c01 'Instagram' w 66.0 and '5 others' w 54.0; 600 14px sets 66.67 and 54.67"),
 ("Type", "t-menu",  "400 16px/20px var(--x-font)",
  "c09 popover rows 'Following' w 66.0 and 'Favorites' w 63.0; 400 16px sets 66.33 and 63.67"),
 ("Type", "t-h2",    "700 22px/26px var(--x-font)",
  "c11 headline 'Choose the accounts you' w 256.7 and 'can\u2019t miss out on' w 171.7; 700 22px sets 257.0 and 172.0"),
 ("Type", "t-cap",   "400 12px/15px var(--x-font)",
  "c01 highlight labels 'CFO Podcast' w 72.67 and 'IG Tips' w 38.0; 400 12px sets both exactly"),
 ("Type", "t-caps",  "600 12px/15px var(--x-font)",
  "c03 reels view count '31.2M' w 33.33 in white on the tile; 600 12px is the only fit under 0.5"),
 ("Type", "t-title", "700 24px/29px var(--x-font)",
  "c06 'This account is private' w 250.33, baseline 625.2; 700 24px sets 249.67"),
 ("Type", "t-note",  "400 15px/18px var(--x-font)",
  "c06 'Follow this account to see their photos' w 262.67 and 'and videos.' w 77.33; 400 15px sets both"),
 ("Type", "t-wtitle", "600 15px/18px var(--x-font)",
  "every widget title: six strings rendered at six specs, ink widths against the captures, 600 15px wins at mean |d| 0.50"),
 ("Type", "t-time",  "590 17px/22px var(--x-font)",
  "iOS status bar clock, this repo's shared chrome"),

 ("Metrics", "w",      "393px",    "iPhone 15/16 logical width; 1179 capture px at 3.0 px/pt"),
 ("Metrics", "h",      "852px",    "iPhone 15/16 logical height; 2556 capture px at 3.0 px/pt"),
 ("Metrics", "status", "54px",     "iOS status bar, Dynamic Island devices"),
 ("Metrics", "gutter", "16px",     "c01 bio and button row both start at x 16.0"),
 ("Metrics", "col",    "123px",    "c01 name/stats column; the ring ends 108.67 and the name ink starts 124.67"),
 ("Metrics", "avatar", "86px",     "c01 and c06 profile photos are both d 86; only c01 carries the d 100 ring"),
 ("Metrics", "btn",    "32px",     "c01 button row bbox y 369.0-401.0"),
 ("Metrics", "hl",     "64px",     "c01 highlight circle 14.0-78.0; its photo is d 50.67 at a 6.67 inset"),
 ("Metrics", "tile",   "130.33px", "c02 grid tile, refkit scan across the gutter at y 400"),
 ("Metrics", "pitch",  "131.33px", "c02 column pitch: tile 130.33 plus a 1.0 gutter"),
 ("Metrics", "row",    "174.67px", "c02 grid row pitch, 3:4 tiles"),
 ("Metrics", "reel",   "232.67px", "c03 reels row pitch, 9:16 tiles"),
 ("Metrics", "rail",   "104.67px", "c09 story rail pitch: ring centres at 52.5 / 156.8 / 261.5 / 366.4"),
 ("Metrics", "w-med",   "344.67px", "medium widget, c16 and c18: x 24.0 to 368.67"),
 ("Metrics", "w-small", "162.67px", "small widget, c16 and c19: square, x 24.0 to 186.67 and 206.0 to 368.67"),
 ("Metrics", "w-inset", "18px",     "widget content inset: every title box lands at the widget left plus 18.0 (+-0.33)"),
 ("Metrics", "w-pitch", "79px",     "medium widget 4-column pitch, c17 and c18: cells 71.67 on a 7.33 gutter"),
 ("Metrics", "w-pitchs", "67px",    "small widget 2-column pitch, c17: cells 59.67 on the same 7.33 gutter"),
 ("Metrics", "tab",    "78px",     "c09 and c13 bottom nav pitch: glyph centres 40.67 to 352.67"),
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

# translateZ(0) composites the frame itself. Safari on iPhone clips composited children (blur,
# backdrop-filter) of a non-composited ancestor with a plain rectangle, so the screen painted
# square past the bezel's corners; a composited frame clips them with its own rounded mask.
PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-bg);color:var(--x-ink);transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:6}
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


def statusbar(colour="var(--x-ink)", time="9:41", island=True):
    """island=False for the shell boards: the art draws its own camera housing."""
    return ('<div class="sb" style="color:%s">%s<div class="time">%s</div>%s</div>'
            % (colour, '<div class="island"></div>' if island else "", time, SB_ICONS))


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


SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-ink-2);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-2);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-ring)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2);font-style:normal;word-break:break-all;
  max-height:33px;overflow:hidden}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-fill);border:1px solid var(--x-ring)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-2);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid var(--x-hairline)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-2);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2);
  column-count:2}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-hairline);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-accent)}
td.v{color:var(--x-ink-2);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-ink-2)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_boards():
    """The contract, on two boards. The 28 swatches and the type ladder each
    want most of a 478 x 980 sheet on their own, so colour and radius go on 00
    and type and metrics on 00a. Splitting beats shrinking: a token whose value
    is clipped out of its caption is a token nobody can check."""
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i data-clip-ok>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Grumpy wizards</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    head = ('<div class="sheet"><header><h1>%s</h1>'
            '<p>Sampled off nineteen iPhone 16 Pro captures at 3.0 capture px per '
            'design pt. Every value has a row on the evidence board.</p></header>')
    yield ("00-design-tokens",
           page(NAME + " - Design Tokens 1/2",
                head % (NAME + " \u00b7 colour")
                + '<h2>Colour</h2><div class="grid">%s</div>'
                  '<h2>Radius</h2><div class="rad">%s</div></div>'
                  % (swatches, radii), SHEET))
    yield ("00a-design-tokens",
           page(NAME + " - Design Tokens 2/2",
                head % (NAME + " \u00b7 type and metrics")
                + '<h2>Type</h2>%s'
                  '<h2>Metrics</h2><div class="met">%s</div></div>'
                  % (type_, met), SHEET))


EV_ROWS = 18   # rows that fit the 478 x 980 box; the table splits past this


def evidence_boards():
    """The evidence table, split across as many boards as it needs. It is the
    deliverable of Phase 1: trim the board count, never the rows."""
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


# ------------------------------------------------------------------ art ----
# Photography comes out of the captures at the box it was measured at and goes
# back at the same numbers, so an asset cannot drift from where it was
# measured. Interface set on a photograph -- the grid's badges, the reels view
# counts -- is listed in that crop's `erase`, inpainted out here and redrawn
# live on top. The cut is cached in assets/art, which is committed, so a fresh
# clone rebuilds every board from the cache without the captures.
CROPS = json.loads((OUT / "crops.json").read_text())
SCALE = 3.0                        # capture px per design pt


def _crop(cid):
    """crops.json holds a plain box as a list and an erased one as an object."""
    c = CROPS[cid]
    return {"img": c[0], "box": c[1:]} if isinstance(c, list) else c


def cut(cid):
    c = _crop(cid)
    dst = ART_DIR / (cid + ".png")
    if not dst.exists():
        import numpy as np
        from PIL import Image
        ART_DIR.mkdir(parents=True, exist_ok=True)
        src = Image.open(REFS_DIR / (c["img"] + ".png")).convert("RGB")
        im = src.crop(tuple(round(v * SCALE) for v in c["box"]))
        if c.get("erase"):
            a = np.asarray(im).astype(float)
            m = np.zeros(a.shape[:2], bool)
            for e in c["erase"]:
                X0, Y0, X1, Y1 = (max(int(round((v - o) * SCALE)), 0)
                                  for v, o in zip(e, c["box"][:2] * 2))
                m[Y0:Y1, X0:X1] = True
            a = np.clip(np.round(_inpaint(a, m)), 0, 255).astype("uint8")
            im = Image.fromarray(a)
        im.save(dst)
    return _uri(dst)


def _inpaint(a, m, sweeps=60):
    """Harmonic fill of the pixels under m from the ones around them: solve it
    on a half-size image first, or 60 sweeps cannot cross a 50px badge."""
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
        a = np.where(m[..., None],
                     (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4, a)
    return a


def _uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def art(cid, dy=0.0, cls=""):
    """Put a crop back at the numbers it was measured at, dy down the page."""
    x0, y0, x1, y1 = _crop(cid)["box"]
    return ('<img class="a %s" alt="%s" src="%s" style="left:%gpx;top:%gpx;'
            'width:%gpx;height:%gpx">'
            % (cls, cid, cut(cid), x0, round(y0 + dy, 2),
               round(x1 - x0, 2), round(y1 - y0, 2)))


def icon(name, x, y, w, h, extra=""):
    """Inline assets/icons/<name>.svg at a measured box, 1:1 with its viewBox."""
    svg = (ICON_DIR / (name + ".svg")).read_text().strip()
    return svg.replace("<svg ", '<svg preserveAspectRatio="none" style="left:%gpx;top:%gpx;'
                       'width:%gpx;height:%gpx%s" ' % (x, y, w, h, extra), 1)


def brand(name, x, y, d):
    """A profile picture that is a brand mark: the original file, never a crop.

    The instagram and nytcooking avatars are the 1080 and 720px squares their
    profile API serves, Lanczos-resampled to 516 -- twice the 258 px an 86pt
    circle needs at 3x, and small enough to inline -- and masked to the circle
    iOS masks them to. Both register against the capture at scale 1.000 with no
    offset, so what is left is the capture's own encoding: about 6 levels on the
    Instagram mark, 14 on NYT Cooking's red. agnezmo's live picture is a
    different photograph now, so that one stays a crop.
    """
    return ('<img class="a rnd" alt="%s avatar" src="%s" style="left:%gpx;top:%gpx;'
            'width:%gpx;height:%gpx">'
            % (name, _uri(OUT / "assets" / "brand" / (name + ".png")), x, y, d, d))


def photo(name, x, y, w, h, cls=""):
    """A picture board 09 has no capture to cut from, so it is the original file.

    The profile API serves the avatar at 1080 and each grid thumbnail at its
    post's own aspect, and assets/photo holds them Lanczos-resampled to the box
    they are placed at, times 3: 516 square for the d 86 circle, 391 x 521 for a
    130.33 x 173.67 tile. A tall post does not fit that tile, so `.ph` crops it
    on the centre the way the grid does rather than squashing it.
    """
    return ('<img class="a ph %s" alt="%s" src="%s" style="left:%gpx;top:%gpx;'
            'width:%gpx;height:%gpx">'
            % (cls, name, _uri(PHOTO_DIR / (name + ".png")), x, y, w, h))


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.t{position:absolute;white-space:nowrap}
.t b{font-weight:600}
.c{transform:translateX(-50%)}
.a{position:absolute;display:block}
.ph{object-fit:cover}
.rnd{border-radius:50%}
svg{position:absolute;display:block}
/* A gradient disc masked to an annulus, so what shows in the hole is whatever
   is behind it: the page ground on a profile, the video on a feed post. */
.ring{position:absolute;border-radius:50%;background:var(--x-story)}
.hair{border:.33px solid var(--x-ring)}
.arc{clip-path:circle(39.8px at 39.8px 39.8px)}
.btn{position:absolute;height:var(--x-btn);border-radius:var(--x-r-btn);background:var(--x-fill)}
.btn.acc{background:var(--x-accent)}
.hl{position:absolute;width:var(--x-hl);height:var(--x-hl);border-radius:50%;
  border:3.33px solid var(--x-ring)}
.st{position:absolute;left:var(--x-col);display:flex;gap:36px}
.st b{display:block;font:var(--x-t-stat)}
.st i{display:block;font:var(--x-t-body);font-style:normal;margin-top:-.93px}
/* one layer, so c06 can take the whole tab bar to half opacity in one place */
.tb{position:absolute;inset:0;color:var(--x-ink-2)}
.tb .und{position:absolute;height:2px;background:var(--x-ink)}
.div{position:absolute;left:0;width:var(--x-w);height:.33px;background:var(--x-hairline);inset:auto}
.t i{font-style:normal;color:var(--x-ink-2)}
.bar{position:absolute;left:0;bottom:0;width:var(--x-w)}
.pill{position:absolute;width:70px;height:32px;border-radius:var(--x-r-btn);
  border:1px solid rgba(255,255,255,.5)}
.cta{position:absolute;height:44px;border-radius:var(--x-r-cta);background:var(--x-accent-2)}
.pop{position:absolute;border-radius:var(--x-r-pop);background:var(--x-pop);
  box-shadow:0 2px 10px rgba(0,0,0,.16),inset 0 0 0 .67px rgba(255,255,255,.4),
    inset 0 .67px 0 rgba(255,255,255,.55),inset .67px 0 0 rgba(255,255,255,.55)}
.toast{position:absolute;border-radius:var(--x-r-toast);background:var(--x-toast)}
.prog{position:absolute;left:0;top:767px;width:var(--x-w);height:1.67px;background:var(--x-track)}
.prog i{position:absolute;left:0;top:0;height:1.67px;background:var(--x-played)}
/* the home screen boards 16-20 sit on, and the two fills they draw on it */
.hs{position:absolute;inset:0;background:var(--x-home)}
.w{position:absolute;background:var(--x-bg);border-radius:var(--x-r-widget)}
.tl{position:absolute;background:var(--x-wtile)}
.thumb{border-radius:var(--x-r-thumb)}"""

TY = {"nav": (20, 24), "stat": (16, 20), "body": (14, 18), "bodys": (14, 18),
      "cap": (12, 15), "caps": (12, 15), "title": (24, 29), "note": (15, 18),
      "menu": (16, 20), "h2": (22, 26), "wtitle": (15, 18)}


def tx(s, x, base, ty="body", colour=None, mid=False):
    """One line of type, placed by the baseline it was measured on.

    A CSS line box puts the baseline (lh - 1.1627 fs) / 2 + 0.9508 fs below its
    own top -- half the leading, then SF Pro's ascender metric -- so the top
    this needs is the measurement minus that. mid=True centres the line on x.
    """
    fs, lh = TY[ty]
    return ('<div class="t%s" style="left:%gpx;top:%gpx;font:var(--x-t-%s)%s">%s</div>'
            % (" c" if mid else "", x,
               round(base - (lh - 1.1627 * fs) / 2 - 0.9508 * fs, 2), ty,
               ";color:" + colour if colour else "", s))


def nav(title, vx=None, bell=False):
    """The nav bar. Its title is 20/700 at left 51 on a baseline of 91.5 on all
    four accounts; only the verified badge moves, because it follows the title."""
    out = [icon("chevron-left", 22, 74, 11, 20), tx(title, 51, 91.5, "nav")]
    if vx:
        out.append(icon("verified", vx, 78.3, 11.33, 11.67, ";color:var(--x-verified)"))
    if bell:
        out.append(icon("bell", 307, 73, 20, 22))
    return "".join(out) + icon("more", 357.5, 82.33, 15.33, 3.33)


def ring(x=9, y=122.67, d=100, s=4, bg=None):
    """The story ring, at the five geometries the captures carry: d 100 stroke
    4 on a profile, d 93 stroke 3.6 on c09's story rail, d 40.33 stroke 2.5 on
    a feed post's header, and d 71.67 and d 59.67 stroke 2.67 in the widgets --
    which paint it in their own ramp, so those pass bg."""
    m = "radial-gradient(closest-side,#0000 calc(100%% - %gpx),#000 0)" % s
    return ('<div class="ring" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx;%s'
            '-webkit-mask:%s;mask:%s"></div>'
            % (x, y, d, d, "background:%s;" % bg if bg else "", m, m))


def disc(x, y, d, bg):
    """A plain circle: the knockout a badge is punched into the art with, and
    the ground a badge sits on."""
    return ('<div class="a rnd" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx;'
            'background:%s"></div>' % (x, y, d, d, bg))


def clipok(html):
    """Mark a clip the capture itself makes: the fourth story ring and its
    label run off the right edge of c09, and c12's next post begins far enough
    down that only the top of its header is on screen."""
    return html.replace(">", " data-clip-ok>", 1)


def stats(top, cells):
    """Three cells left-aligned in a flex row at gap 36, each as wide as the
    wider of its number and its label: measured on c06, where the three cells
    land at 124.0 / 204.33 / 296.33 for widths of 43.67 / 57.33 / 57.0."""
    return ('<div class="st" style="top:%gpx">%s</div>'
            % (top, "".join("<div><b>%s</b><i>%s</i></div>" % c for c in cells)))


def btn(x, w, top, label=None, acc=False):
    """A 32pt pill whose label sits on a baseline 21.2 below the button's top."""
    out = ['<div class="btn%s" style="left:%gpx;top:%gpx;width:%gpx"></div>'
           % (" acc" if acc else "", x, top, w)]
    if label:
        out.append(tx(label, round(x + w / 2, 2), top + 21.2, "bodys",
                      "var(--x-ink-inv)" if acc else None, mid=True))
    return "".join(out)


def highlights(top, base, items, pre, dy=0.0):
    """Five d 64 rings at pitch 82 from x 14, each holding a d 50.67 photo. An
    item carries its own label centre only where the source does not centre the
    label on its circle -- see the README on c08's fifth highlight."""
    out = []
    for i, item in enumerate(items):
        label, cx = item if isinstance(item, tuple) else (item, 46.0 + 82 * i)
        out.append('<div class="hl" style="left:%gpx;top:%gpx"></div>' % (14 + 82 * i, top))
        out.append(art("%s-hl%d" % (pre, i + 1), dy, "rnd"))
        out.append(tx(label, cx, base, "cap", mid=True))
    return "".join(out)


# Each tab glyph's measured ink box, and the centres the row is laid out on.
# Two, four and five tabs are three different rows, not one rule with a pitch.
# Every tab is two glyphs, not one colour. The active grid is nine solid squares
# where the inactive one is an outlined table; active reels and tagged are their
# outlines filled in; active reposts is the same two arrows at 3 pt. The base name
# is the inactive glyph, -on the active one.
TAB = {"grid": (18, 22), "grid-on": (18, 22),
       "reels": (22, 22), "reels-on": (22, 22),
       "reposts": (18, 23.33), "reposts-on": (19, 23.33),
       "tagged": (22, 22.67), "tagged-on": (22, 22.67), "crown": (22, 17)}
TAB_CX = {2: (98.0, 294.67), 4: (49.0, 147.0, 245.0, 343.67),
          5: (39.0, 117.0, 195.0, 273.0, 352.67)}


def tabs(d, names, active, ux, uw, op=None):
    """The tab bar, keyed on the y of its divider: glyph centres at d - 21.67,
    the 2pt underline sitting on the divider, and the grid starting at d + 1."""
    out = []
    for i, n in enumerate(names):
        n += "-on" if i == active else ""
        w, h = TAB[n]
        out.append(icon("tab-" + n, round(TAB_CX[len(names)][i] - w / 2, 2),
                        round(d - 21.67 - h / 2, 2), w, h,
                        ";color:var(--x-ink)" if i == active else ""))
    out.append('<div class="und" style="left:%gpx;top:%gpx;width:%gpx"></div>'
               % (ux, d - 2, uw))
    # The divider stays outside the wrapper: on c06 the glyphs and the underline
    # are at half opacity and the divider still reads its full #DADADA.
    return ('<div class="tb"%s>%s</div><div class="tb div" style="top:%gpx"></div>'
            % (' style="opacity:%g"' % op if op else "", "".join(out), d))


def grid(ids, badges=(), dy=0.0):
    """Tiles at their own measured boxes, each badge inset 7.67 from its tile's
    top right. The badge was inpainted out of the photograph by cut()."""
    out = []
    for i, cid in enumerate(ids):
        out.append(art(cid, dy))
        kind = badges[i] if i < len(badges) else None
        if kind:
            _, y0, x1, _ = _crop(cid)["box"]
            out.append(icon("badge-" + kind, round(x1 - 24.0, 2), round(y0 + dy + 7.67, 2),
                            16.33, 15.67 if kind == "pin" else 16.33))
    return "".join(out)


def counts(ids, vals):
    """A reels tile's view count: the eye 8.33 in from the tile's left edge and
    19.0 up from its foot, the number on a baseline 10.94 up from the same foot."""
    out = []
    for cid, v in zip(ids, vals):
        x0, _, _, y1 = _crop(cid)["box"]
        out.append(icon("eye", round(x0 + 8.33, 2), round(y1 - 19.0, 2), 11.33, 7.67))
        out.append(tx(v, round(x0 + 25.0, 2), round(y1 - 10.94, 2), "caps",
                      "var(--x-ink-inv)"))
    return "".join(out)


def mutuals(dy=0.0):
    """Three 32pt avatars at pitch 25.33, overlapping. The white notch each one
    cuts in its neighbour is already in the crop, so they only have to go back
    in order, and the two lines of type name the accounts and count the rest."""
    return ("".join(art("ig-mut%d" % i, dy, "rnd") for i in (1, 2, 3))
            + tx("Followed by <b>archdigest</b>, <b>designmilk</b> and", 106.3, 329.0 + dy)
            + tx("<b>5 others</b>", 106.3, 347.33 + dy))


def threads(base, handle, note_x=None, title=None, tail=None):
    """The Threads row: the glyph and the handle, and on two of the four
    accounts a second glyph and the title of a thread after it."""
    out = [icon("threads", 17.33, base - 12.5, 13.33, 15.33),
           tx(handle, 35.0, base, "bodys")]
    if note_x:
        out.append(icon("threads-note", note_x, base - 11.4, 14.67, 13.33))
        out.append(tx(title[1], title[0], base, "bodys"))
        if tail:
            out.append(tx(tail[1], tail[0], base, "bodys"))
    return "".join(out)


# ----------------------------------------------------------------- feed ----
def feed_nav(title, favs=False, line=True):
    """The feed's own nav bar, where the profile's nav() has a back chevron at
    26.0 x 71.0, a 24/700 title at 51.67 on a baseline of 89.87 and, on
    Favorites, the list glyph at the right. c12 is the same bar without the
    divider: its video starts where the divider would be."""
    out = [icon("chevron-left", 26, 71, 11, 20), tx(title, 51.67, 89.87, "title")]
    if favs:
        out.append(icon("nav-favs", 352.33, 69.33, 22, 22.34))
    if line:
        out.append('<div class="div" style="top:113px;background:var(--x-nav-line)"></div>')
    return "".join(out)


# The five bottom-nav glyphs at their measured ink boxes. Centres are 78pt
# apart from 40.67, and the row is the same on the white c09 and the dark
# c13/c14 -- the active tab is a different drawing, not a different colour.
BOTTOM = (("nav-home", 29.67, 782.33, 22, 22),
          ("nav-reels", 107.67, 782.33, 22, 22),
          ("nav-direct", 185.33, 783.33, 22.67, 20.34),
          ("nav-search", 263.67, 782.33, 22, 22),
          ("nav-profile", 341, 781.67, 23.33, 23.33))


def bottom(top, active, ground="var(--x-bg)", colour=None):
    out = ['<div class="bar" style="top:%gpx;background:%s"></div>' % (top, ground)]
    for i, (name, x, y, w, h) in enumerate(BOTTOM):
        out.append(icon(name + "-on" if i == active else name, x, y, w, h,
                        ";color:" + colour if colour else ""))
    return "".join(out)


def post_head(cy, base, name, av, dy=0.0, story=None, vx=None, sub=None,
              follow=None, colour=None):
    """One post's header, hung off the centre its avatar sits on.

    `story` is the top of the d 40.33 ring, where the account has a story; the
    d 32 avatar goes inside it either way, and the two are not quite concentric
    on any of the three captures, so the ring keeps its own number. the name sits at 53 on its own measured baseline; the
    overflow dots centre on the avatar, 1.35 above it. `sub` is the second line
    -- a suggestion reason, or a reel's audio credit -- as (x, baseline, text),
    and `follow` the left edge of the 70 x 32 outlined pill.
    """
    out = [ring(6.67, round(story + dy, 2), 40.33, 2.5)] if story else []
    out += [art(av, dy, "rnd"), tx(name, 53, base + dy, "bodys", colour),
            icon("more", 363.67, round(cy - 1.35 + dy, 2), 14.67, 2.67,
                 ";color:" + colour if colour else "")]
    if vx:
        out.append(icon("verified", vx, round(base + dy - 10.51, 2), 11.33, 11.33,
                        ";color:" + (colour or "var(--x-verified)")))
    if sub:
        out.append(tx(sub[2], sub[0], sub[1] + dy, "cap", colour))
    if follow:
        out.append('<div class="pill" style="left:%gpx;top:%gpx"></div>'
                   % (follow, round(cy - 16 + dy, 2)))
        out.append(tx("Follow", follow + 35, round(cy + 4.34 + dy, 2), "bodys",
                      colour, mid=True))
    return "".join(out)


# Heart, comment, repost, share and save, with the offset from the row's top
# that each one's ink box sits at: the five glyphs are five heights.
ACT = (("act-heart", 23.33, 20.33, 0.0), ("act-comment", 21, 21, -0.33),
       ("act-repost", 18, 22.67, -1.33), ("nav-direct", 22, 20.33, 0.0),
       ("act-save", 18, 20, 0.0))


def actions(top, cells, colour=None):
    """The action row. A cell is the glyph's left and, where the post carries
    one, its count as (ink left, text); counts sit on a baseline 15.17 below the
    row's top. The x of every cell is measured, because each count's own width
    pushes the next glyph along."""
    out = []
    for (name, w, h, dy), (x, count) in zip(ACT, cells):
        out.append(icon(name, x, round(top + dy, 2), w, h,
                        ";color:" + colour if colour else ""))
        if count:
            out.append(tx(count[1], count[0], top + 15.17, "bodys", colour))
    return "".join(out)


def caption(x, base, name, tail, tx_, tbase, time):
    """The caption -- the account in 600 on the same baseline as the rest -- and
    the relative time under it. `more` is the only word in another colour."""
    return (tx("<b>%s</b> %s <i>more</i>" % (name, tail), x, base)
            + tx(time, tx_, tbase, "cap", "var(--x-ink-2)"))


IG_STATS = [("8,283", "posts"), ("698M", "followers"), ("293", "following")]
IG_HL = ["Meta AI ✍️", "CFO Podcast", "IG Tips \U0001f4dd",
         "✨✨✨", "Halloween…"]
IG_TABS = ["grid", "reels", "reposts", "tagged"]


def ig_scrolled(dy):
    """Everything boards 03-05 share with board 01, moved by one number: the
    three captures are the same screen scrolled 208.33pt, and the nav is opaque,
    so nothing above the mutuals row survives the scroll."""
    return (mutuals(dy)
            + btn(16, 178, 369 + dy) + tx("Following", 64.67, 390.2 + dy, "bodys")
            + icon("chevron-down", 135.33, 382 + dy, 10, 6)
            + btn(199, 178, 369 + dy, "Message")
            + highlights(419 + dy, 498.33 + dy, IG_HL, "ig", dy))


def s01():
    return (statusbar() + nav("instagram", 153.7)
            + ring() + brand("instagram", 16, 129.67, 86)
            + tx("Instagram", 123, 150, "bodys")
            + stats(164.76, IG_STATS)
            + tx("Discover what’s new on Instagram \U0001f50e✨", 16, 241)
            + icon("link", 16.67, 251.33, 17.33, 17.33, ";color:var(--x-link)")
            + tx("www.youtube.com/watch?v=e3GBHkiMSi8", 39.5, 264.33, "body",
                 "var(--x-link)")
            + threads(294.5, "instagram", 113.33,
                      (131.5, "What’s Good on Instagram ✨"))
            + mutuals()
            + btn(16, 178, 369, "Follow", acc=True) + btn(199, 178, 369, "Message")
            + highlights(419, 498.33, IG_HL, "ig")
            + tabs(561, IG_TABS, 0, 29, 40)
            + grid(["ig-t1", "ig-t2", "ig-t3"], ["play"] * 3)
            + grid(["ig-t4", "ig-t5", "ig-t6"], ["play"] * 3, 579.34))


def s02():
    """The same account scrolled far enough that the tab bar sticks under the
    nav. None of the header is left, and this board's first grid row is board
    01's second, which is why the two share ig-t4 to ig-t6."""
    return (statusbar() + nav("instagram", 153.0, bell=True)
            + tabs(156.33, IG_TABS, 0, 29, 40)
            + grid(["ig-t%d" % i for i in range(4, 16)],
                   ["play"] * 5 + ["carousel"] + ["play"] * 6))


def s03():
    ids = ["ig-r%d" % i for i in range(1, 10)]
    return (statusbar() + nav("instagram", 153.0, bell=True) + ig_scrolled(-208.33)
            + tabs(352.67, IG_TABS, 1, 115, 64) + grid(ids)
            + counts(ids[:6], ["31.2M", "28.5M", "68.7M", "77.2M", "50.9M", "202M"]))


def s04():
    return (statusbar() + nav("instagram", 153.0, bell=True) + ig_scrolled(-208.33)
            + tabs(352.67, IG_TABS, 2, 213, 64)
            + grid(["ig-p%d" % i for i in range(1, 10)]))


def s05():
    return (statusbar() + nav("instagram", 153.0, bell=True) + ig_scrolled(-208.33)
            + tabs(352.67, IG_TABS, 3, 311.33, 64)
            + grid(["ig-g%d" % i for i in range(1, 10)]))


def s06():
    """A private account: no story ring, no bio, two tabs at half opacity. The
    whole name and stats column sits 10.16pt higher than c01's, because it
    centres on the d 86 photograph rather than on the d 100 ring."""
    return (statusbar() + nav("suck_upon")
            + art("pv-avatar", cls="rnd")
            + tx("Towlee", 123, 139.84, "bodys")
            + stats(154.6, [("2,648", "posts"), ("261", "followers"), ("614", "following")])
            + threads(242.0, "suck_upon")
            + btn(16, 361, 258, "Follow", acc=True)
            + tabs(346, ["grid", "tagged"], 0, 78, 40, op=0.5)
            + '<div class="a rnd" style="left:152.3px;top:498px;width:88px;height:88px;'
              'border:1.67px solid var(--x-ink)"></div>'
            + icon("lock", 176, 515.33, 40.67, 50.67)
            + tx("This account is private", 196.33, 625.2, "title", mid=True)
            + tx("Follow this account to see their photos", 196.67, 662.4, "note",
                 "var(--x-ink-2)", mid=True)
            + tx("and videos.", 196, 680.33, "note", "var(--x-ink-2)", mid=True))


def s07():
    return (statusbar() + nav("nytcooking", 163.0)
            + ring() + brand("nytcooking", 16, 129.67, 86)
            + tx("NYT Cooking", 123, 150, "bodys")
            + stats(164.42, [("13.7K", "posts"), ("4.6M", "followers"), ("157", "following")])
            + tx("Recipes and advice from New York Times Cooking.", 16, 241)
            + tx("Tap the link for more! ⬇️", 16, 259)
            + icon("link", 16.67, 269, 17.33, 17.33, ";color:var(--x-link)")
            + tx("nytimes.com/cooking-instagram", 39.5, 282, "body", "var(--x-link)")
            + threads(312.33, "nytcooking")
            + btn(15.67, 105.33, 328, "Follow", acc=True)
            + btn(125.67, 104.67, 328, "Message") + btn(235.33, 104.67, 328, "Shop")
            + btn(345, 32, 328) + icon("chevron-down", 356, 341, 10, 6)
            + highlights(378, 457, ["Melissa", "Eric", "Priya", "Claire", "Vaughn"], "nyt")
            + tabs(520, IG_TABS, 0, 17, 64)
            + grid(["nyt-t%d" % i for i in range(1, 7)],
                   ["pin", "pin", None, None, "play", "play"]))


def s08():
    """Five tabs, four lines of bio and a subscription crown on the first
    highlight. Its fifth highlight label is the one thing on these eight
    screens that does not centre on its own circle: see the README."""
    return (statusbar() + nav("agnezmo", 145.0)
            + ring() + art("agz-avatar", cls="rnd")
            + tx("AGNEZ MO", 123, 150, "bodys")
            + stats(164.76, [("3,232", "posts"), ("31.9M", "followers"),
                             ("3,630", "following")])
            + tx("Artist", 16, 241, "body", "var(--x-ink-2)")
            + tx("AMO", 16, 259)
            + tx("@thaiteaangel", 16, 277.33, "body", "var(--x-link)")
            + tx("Official booking: booking@agnezmo.com", 16, 295.33)
            + icon("link", 16.67, 305, 17.33, 17.33, ";color:var(--x-link)")
            + tx("linktr.ee/agnezmo", 39.5, 318, "body", "var(--x-link)")
            + threads(348.33, "agnezmo", 107.67, (126.5, "Life is Life-ing"),
                      (231.8, "1 more"))
            + btn(15.67, 105.33, 364, "Follow", acc=True)
            + btn(125.67, 104.67, 364, "Message") + btn(235.33, 104.67, 364, "Subscribe")
            + btn(345, 32, 364) + icon("chevron-down", 356, 377, 10, 6)
            + icon("crown-fill", 12.67, 484.33, 11.33, 8.33, ";color:var(--x-sub)")
            + highlights(414, 493, [("Exclusive", 52.9), "GOLD GAL…", "Red Carpet",
                                    "GRAPHIC N…", ("F Yo Love", 364.0)], "agz")
            + tabs(556, ["grid", "crown", "reels", "reposts", "tagged"], 0, 19, 40)
            + grid(["agz-t%d" % i for i in range(1, 7)],
                   ["pin", "pin", "pin", "play", "carousel", "carousel"]))


# The grid's three columns and the pitch its rows repeat at, off c01 and c02.
GRID_COLS = ((0.0, 130.33), (131.33, 261.67), (262.67, 393.0))


def s15():
    """@yilin0xx, live off the profile API rather than off a capture.

    Every row the account does not have is absent and the rows below it move
    up: no verified badge, no Threads row (has_onboarded_to_text_post_app is
    false), no link row (external_url is empty), no highlights
    (highlight_reel_count is 0), no mutuals.

    The geometry is still the measured one. The header is c06's, which is where
    the column sits when there is no story ring; the 15.67pt from the last line
    of bio to the buttons is c07's and c08's, which agree on it; the 88pt from
    the buttons to the tab divider is c06's, the only capture with no
    highlights row in between; and the grid is the captures' own 130.33 x
    173.67 tiles at pitch 174.66, its last row cut off by the phone's foot
    exactly as c02's is. Nine of the twelve posts are above that foot.
    """
    tiles = []
    for i, kind in enumerate(["carousel"] + ["play"] * 7 + ["carousel"]):
        x0, x1 = GRID_COLS[i % 3]
        y = round(335.51 + 174.66 * (i // 3), 2)
        tiles.append(photo("yl-t%d" % (i + 1), x0, y, x1 - x0, min(173.67, 852 - y)))
        tiles.append(icon("badge-" + kind, round(x1 - 24.0, 2), round(y + 7.67, 2),
                          16.33, 16.33))
    return (statusbar() + nav("yilin0xx")
            + photo("yl-avatar", 16, 119.67, 86, 86, "rnd")
            + tx("Yilin小林", 123, 139.84, "bodys")
            + stats(154.6, [("12", "posts"), ("51", "followers"), ("116", "following")])
            + tx("An observer full of curiosity about the world.", 16, 230.84)
            + btn(16, 178, 246.51, "Follow", acc=True)
            + btn(199, 178, 246.51, "Message")
            + tabs(334.51, IG_TABS, 0, 29, 40)
            + "".join(tiles))


def s09():
    """The home feed with the Following/Favorites switcher open over it.

    The popover covers the rail it is a blur of -- story 2's photograph whole
    and story 3's left half -- so its ground is POP, the mesh sampled through
    it, rather than a backdrop-filter with nothing real left to blur. The four
    photographs are still cropped at their full boxes, because the opaque
    popover is what covers the pixels it contaminated.

    Story labels 2 and 3 carry only the glyphs the capture shows, "d" and
    "forbu…": the popover eats the rest of both usernames, and the rest of
    a username is not something a measurement can supply.
    """
    rail = [art("f09-s1", 0, "rnd hair"),
            disc(65, 171, 30.6, "var(--x-bg)"),
            disc(68.3, 174.3, 24, "var(--x-badge)"),
            icon("plus-bold", 74.3, 180.3, 12, 12, ";color:var(--x-ink-inv)")]
    # Centres 104.67 apart from 52.5; ring 4 runs off the screen edge.
    for i, cx in ((2, 156.8), (3, 261.5), (4, 366.4)):
        r = ring(round(cx - 46.5, 2), 112, 93, 3.6)
        rail.append(clipok(r) if i == 4 else r)
        rail.append(art("f09-s%d" % i, 0, "rnd arc" if i == 4 else "rnd"))
    return (statusbar()
            + icon("plus", 18, 74, 20, 20)
            + icon("wordmark", 129, 71.67, 116, 33)
            + icon("chevron-down", 253, 83.67, 10, 5.67)
            + icon("act-heart", 353.67, 74, 22.67, 20)
            # The notification dot is knocked out of the heart's stroke first.
            + disc(368.3, 70.63, 11.4, "var(--x-bg)")
            + disc(370, 72.33, 8, "var(--x-notif)")
            + "".join(rail)
            + tx("Your story", 52.5, 220.77, "cap", mid=True)
            + tx("d", 116.33, 220.77, "cap")
            + tx("forbu…", 270.33, 220.77, "cap")
            + clipok(tx("dominoma…", 366.4, 220.77, "cap", mid=True))
            + '<div class="pop" style="left:122.33px;top:110.67px;width:148.33px;'
              'height:120px"></div>'
            + icon("users", 143.33, 131.67, 21.67, 22)
            + tx("Following", 179.67, 148.58, "menu")
            + icon("star-out", 143.33, 187.67, 21.67, 21)
            + tx("Favorites", 179.67, 204.58, "menu")
            + art("f09-post")
            + post_head(262.5, 259.51, "harolds_finishing_touches", "f09-av",
                        story=242.33, vx=236.33, follow=279,
                        sub=(52.67, 276.1, "Suggested for you"),
                        colour="var(--x-ink-inv)")
            + bottom(768.67, 0))


def s10():
    """The Following feed, the first of the two the switcher opens.

    There is no tab bar on it: the second post's photograph runs to the phone's
    foot, and the second post is the first one again, same account and same
    avatar 635.33 further down.
    """
    return (statusbar() + feed_nav("Following")
            + post_head(140.84, 144.84, "midcenturyhome", "f10-av", story=120.67)
            + art("f10-post")
            + actions(666, ((14.33, (43.67, "409")), (84.33, (113, "1")),
                            (134, None), (172, (201, "2")), (358, None)))
            + caption(13, 713.17, "midcenturyhome",
                      "Completed in 1937 in central…",
                      12.67, 734.43, "4 hours ago")
            + post_head(140.84, 144.84, "midcenturyhome", "f10-av", 635.33, 120.67)
            + art("f10-post2"))


def s11():
    """Favorites with nothing in it yet.

    The illustration is editorial art and the capture is its only source, so it
    is a crop at its measured box. Everything under it is type: two lines of
    22/700, three of 14/400, and the one accent button on these boards.
    """
    return (statusbar() + feed_nav("Favorites", favs=True)
            + art("f11-art")
            + tx("Choose the accounts you", 196.5, 432.8, "h2", mid=True)
            + tx("can’t miss out on", 196.5, 458.9, "h2", mid=True)
            + tx("Add accounts to your favorites to see their", 196.5, 485.6,
                 "body", mid=True)
            + tx("posts here, starting with the most recent", 196.5, 502.6,
                 "body", mid=True)
            + tx("posts.", 196.5, 519.2, "body", mid=True)
            + '<div class="cta" style="left:131.67px;top:538.67px;'
              'width:129.67px"></div>'
            + tx("Add favorites", 196.5, 566, "bodys", "var(--x-ink-inv)", mid=True))


def s12():
    """The Favorites feed, a reel.

    Its nav bar carries no divider, because the video starts where the divider
    would be, and the header is set on the video rather than above it: white
    type, an outlined pill, a gradient star, and the mute badge at the video's
    foot. The action row and the caption are back on white.
    """
    return (statusbar() + feed_nav("Favorites", favs=True, line=False)
            + art("f12-video")
            + post_head(140.67, 137.84, "discoverearth", "f12-av", vx=149.33,
                        sub=(69.7, 154.43, "discoverearth · Original audio"),
                        follow=249, colour="var(--x-ink-inv)")
            + icon("music", 53, 144.67, 9.33, 10.67, ";color:var(--x-ink-inv)")
            + icon("star-grad", 323.67, 132.67, 14.67, 14)
            + disc(353.17, 681, 25.67, "var(--x-scrim)")
            + icon("mute", 360.33, 688.67, 11, 11, ";color:var(--x-ink-inv)")
            + actions(735, ((14.33, (44, "14.8K")), (95.33, (124, "110")),
                            (161, (188, "323")), (226.67, (256, "1,783")),
                            (358, None)))
            + caption(12.67, 782.17, "discoverearth",
                      "A raw moment with the Tsaatan…",
                      13, 803.43, "3 days ago")
            + art("f12-next")
            + clipok(art("f12-av", 715.67, "rnd"))
            + clipok(tx("discoverearth", 53, 853.51, "bodys", "var(--x-ink-inv)"))
            + clipok(icon("verified", 149.33, 843, 11.33, 11.33,
                          ";color:var(--x-ink-inv)")))


def s13():
    """A reel in fullscreen, with the toast iOS puts up when a screen recording
    starts. The status bar is the template's in white, as everywhere: the
    capture's own, ink and all, is never carried over."""
    return (art("f13-video") + statusbar("var(--x-ink-inv)")
            + '<div class="toast" style="left:8px;top:693px;width:377px;'
              'height:67.67px"></div>'
            + icon("warn", 24.33, 715.33, 23.33, 23.33, ";color:var(--x-ink-inv)")
            + tx("Screen recording is not available when watching", 60.67,
                 723.34, "body", "var(--x-ink-inv)")
            + tx("reels in fullscreen.", 60.67, 740.84, "body",
                 "var(--x-ink-inv)")
            + '<div class="prog"><i style="width:45.5px"></i></div>'
            + bottom(769, 1, "var(--x-bar-dark)", "var(--x-ink-inv)"))


def s14():
    """The same view further into the same reel, with the mute glyph the player
    holds for a moment after a tap. Its white is at .14, the one glyph on these
    boards that is not an opaque colour."""
    return (art("f14-video") + statusbar("var(--x-ink-inv)")
            + icon("mute", 187, 375.1, 18.33, 18.33, ";color:rgba(255,255,255,.14)")
            + '<div class="prog"><i style="width:151px"></i></div>'
            + bottom(769, 1, "var(--x-bar-dark)", "var(--x-ink-inv)"))


# ------------------------------------------------- home-screen widgets ----
# Boards 16-20 are not app screens. They are the iOS home screen carrying
# Instagram's five widgets, which Mobbin shoots on a plain grey ground with no
# wallpaper, app icons or dock -- so that is all these draw: the ground, the
# shared status bar, and the widgets.
#
# The five share one geometry. A medium widget is 344.67 x 162.67 and a small
# one is that height square; the left column starts at x 24 and the right at
# 206, row 1 at y 80 and row 2 at 262. Content is inset 18, the title sets
# 600/15 on a baseline 35.33 below the widget top, and the corner mark is
# inset 19 from the top-right. Nothing casts a shadow: the ground reads 100%
# flat right up to the corner, which is why --x-home can be one token.
W_MED, W_SMALL = 344.67, 162.67
W_COL2, W_ROW2 = 206.0, 262.0


def mark(x, y, w=22.0, h=22.33):
    """The Instagram corner mark: the app's own glyph, placed by its ink box.

    assets/brand/instagram.png is the 516px square from the iTunes lookup, and
    its glyph inks 99-419 x 99-421 of that -- 62.02% of the width and 62.40% of
    the height, on a 19.186% margin. So the file goes down at whatever size
    puts the measured ink where it was measured, with that margin backed off.
    The mark is 22.00 x 22.33 on every widget that carries one, and 22.33 x
    21.33 inside the c20 search field. The file arrived composited on white and
    the captures show it transparent -- c20 reads 243 inside the lens against
    245 on the field around it -- so scratch/wunwhite.py divided that white back
    out before it was committed.
    """
    w, h = w / 0.6202, h / 0.6240
    return ('<img class="a" alt="Instagram" src="%s" style="left:%gpx;top:%gpx;'
            'width:%gpx;height:%gpx">'
            % (_uri(OUT / "assets" / "brand" / "instagram.png"),
               round(x - 0.19186 * w, 2), round(y - 0.19186 * h, 2),
               round(w, 2), round(h, 2)))


def grad(name, x, y, w, h):
    """A board 19 shortcut glyph, stroked in the brand ramp instead of an ink.

    The ramp runs corner to corner across the glyph's own box: a radial
    gradient at -45 degrees, flattened to .3571 of its height and centred a
    little outside the top-left. userSpaceOnUse resolves in viewBox units and
    not in the pt the icon is placed at, so the transform is built from the
    file's own viewBox -- which, this folder's icons being cut to their ink, is
    the glyph. cx and cy are written out because omitting them defaults each to
    50% of the viewport rather than to 0.
    """
    svg = icon(name, x, y, w, h)
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split()]
    defs = ('<defs><radialGradient id="%s-g" gradientUnits="userSpaceOnUse" cx="0" cy="0"'
            ' r="3.231" gradientTransform="translate(%g %g) scale(%g %g)'
            ' translate(-.6 2) rotate(-45) scale(1 .3571)">%s</radialGradient></defs>'
            % (name, vb[0], vb[1], vb[2], vb[3],
               "".join('<stop offset="%g" stop-color="%s"/>' % r for r in RAMP)))
    return svg.replace("currentColor", "url(#%s-g)" % name).replace(">", ">" + defs, 1)


def widget(x, y, w, title=None):
    """One widget tile. Board 20's search widget is the only one without a
    title, and the only one without a corner mark, so the two go together."""
    out = ['<div class="w" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx"></div>'
           % (x, y, w, W_SMALL)]
    if title:
        out += [tx(title, x + 18, y + 35.33, "wtitle", "var(--x-ink-w)"),
                mark(x + w - 40.67, y + 19)]
    return "".join(out)


def cells(x, n, d):
    """Left edges of a widget's columns. The cells are the story rings, d 71.67
    in a medium widget and d 59.67 in a small one, and they sit flush against
    both content edges: four across 308.67 and two across 126.67, which puts
    the same 7.33 gutter between them either way."""
    return [x + 18 + (d + 7.33) * i for i in range(n)]


def s16():
    """The Messages widget at both sizes. The account has no picture, so both
    draw the blank avatar, and both centre the username on that rather than on
    the content edge: the ink centres land 0.34 left of the disc's, which is
    the string's own side bearings."""
    return "".join(
        ['<div class="hs"></div>', statusbar(),
         widget(24, 80, W_MED, "Messages"),
         icon("avatar-blank", 48.77, 131.32, 57.48, 57.48, ";color:var(--x-blank)"),
         tx("samleefin18", 77.51, 206.2, "cap", "var(--x-ink-w)", mid=True),
         widget(24, W_ROW2, W_SMALL, "Messages"),
         icon("avatar-blank", 43.41, 314.34, 56.5, 56.5, ";color:var(--x-blank)"),
         tx("samleefi&hellip;", 71.66, 388.2, "cap", "var(--x-ink-w)", mid=True)])


def s17():
    """The Stories widget at both sizes. Cell 1 of the medium is the account's
    own story: no ring, a d 61.0 picture where a ringed cell's is 61.67, and a
    badge that is a white knockout disc, a dark disc and the plus -- drawn over
    the picture and not erased out of it, each covering its own pixels."""
    d, ds = 71.67, 59.67
    med, sml = cells(24, 4, d), cells(24, 2, ds)
    out = ['<div class="hs"></div>', statusbar(),
           widget(24, 80, W_MED, "Stories"),
           art("w17-a1", cls="rnd"),
           disc(88, 176, 24, "var(--x-bg)"), disc(89, 177, 22, "var(--x-badge)"),
           icon("w-plus", 94, 182, 12, 12, ";color:var(--x-ink-inv)"),
           tx("Your story", med[0] + d / 2, 221.5, "cap", "var(--x-ink-w2)", mid=True)]
    for i, label in enumerate(["interiorplu&hellip;", "thegalacti&hellip;",
                               "thedesign&hellip;"]):
        out += [ring(med[i + 1], 134.5, d, 2.67, "var(--x-story-w)"),
                art("w17-a%d" % (i + 2), cls="rnd"),
                tx(label, med[i + 1] + d / 2, 221.5, "cap", "var(--x-ink-w)", mid=True)]
    out.append(widget(24, W_ROW2, W_SMALL, "Stories"))
    for i, label in enumerate(["interiorp&hellip;", "thegalac&hellip;"]):
        out += [ring(sml[i], 319.34, ds, 2.67, "var(--x-story-w)"),
                art("w17-b%d" % (i + 1), cls="rnd"),
                tx(label, sml[i] + ds / 2, 394.5, "cap", "var(--x-ink-w)", mid=True)]
    return "".join(out)


def s18():
    """Suggested Reels: four thumbnails on the medium widget's own 4-column
    pitch, 94.67 tall where a story cell would be 71.67 square."""
    return "".join(['<div class="hs"></div>', statusbar(),
                    widget(24, 80, W_MED, "Suggested Reels")]
                   + [art("w18-%d" % (i + 1), cls="thumb") for i in range(4)])


def s19():
    """Four small shortcut widgets, one glyph each in the brand ramp."""
    return "".join(
        ['<div class="hs"></div>', statusbar(),
         widget(24, 80, W_SMALL, "Reels"), grad("w-reels", 81.33, 144.33, 48, 48),
         widget(W_COL2, 80, W_SMALL, "Messages"), grad("w-direct", 259.33, 147, 55, 47.67),
         widget(24, W_ROW2, W_SMALL, "Explore"), grad("nav-search", 81.33, 331, 48.33, 48.33),
         widget(W_COL2, W_ROW2, W_SMALL, "Create"), grad("w-create", 263.33, 326.33, 48, 48)])


def s20():
    """The Search widget: no title and no corner mark, because the mark sits in
    the field instead. Three shortcut tiles under it, black glyphs on the fill,
    and those three are the widgets' own drawings, not the app's nav glyphs --
    nav-home scores 18.91 against this tile and nav-reels 50.84."""
    return "".join(
        ['<div class="hs"></div>', statusbar(), widget(24, 80, W_MED),
         '<div class="tl" style="left:42px;top:98px;width:308.67px;height:44px;'
         'border-radius:var(--x-r-field)"></div>',
         mark(57.0, 109.33, 22.33, 21.33),
         tx("Search on Instagram", 88.33, 125.8, "menu", "var(--x-ink-w2)")]
        + ['<div class="tl" style="left:%gpx;top:150px;width:97.67px;height:74.67px;'
           'border-radius:var(--x-r-tile)"></div>' % x for x in (42, 147.67, 253)]
        + [icon(n, x, y, w, h, ";color:var(--x-ink-w)") for n, x, y, w, h in
           (("w-home", 79.67, 176, 22, 22), ("w-reels", 185.33, 176.33, 22, 22),
            ("w-direct", 291, 177.67, 22, 19.67))])


SCREENS = [("01-profile", "Profile", s01),
           ("02-grid-scrolled", "Grid, scrolled", s02),
           ("03-reels", "Reels tab", s03),
           ("04-reposts", "Reposts tab", s04),
           ("05-tagged", "Tagged tab", s05),
           ("06-private", "Private account", s06),
           ("07-nytcooking", "NYT Cooking", s07),
           ("08-agnezmo", "AGNEZ MO", s08),
           ("09-feed-switcher", "Feed switcher", s09),
           ("10-following-feed", "Following feed", s10),
           ("11-favorites-empty", "Favorites, empty", s11),
           ("12-favorites-feed", "Favorites feed", s12),
           ("13-reels-toast", "Reels, fullscreen, toast", s13),
           ("14-reels-fullscreen", "Reels, fullscreen", s14)]

# The home screen, its own row on the canvas: five widgets, not five app
# screens, and numbered 16-20 because that is the capture each is measured
# against. There is no c15 -- board 15 carries a live account, not a capture.
WIDGET_BOARDS = [("16-widget-messages", "Messages", s16),
                 ("17-widget-stories", "Stories", s17),
                 ("18-widget-reels", "Suggested reels", s18),
                 ("19-widget-shortcuts", "Shortcuts", s19),
                 ("20-widget-search", "Search", s20)]

# Board 15 has no capture behind it, so it joins the screens row and not the
# captures row, and nothing in probes.json or the README's delta table names it.
LIVE = [("15-yilin0xx", "yilin0xx, live", s15)]


def screen(label, fn):
    return page(NAME + " - " + label, '<div class="phone">%s</div>' % fn(), SCREEN_CSS)


# ------------------------------------------------------- the references ----
# The fourteen captures, unretouched and with the attribution banner they ship
# with intact, one board each and in the same order as the screens, so the
# canvas parks each capture directly under its replica. Never committed: the
# root .gitignore excludes ref-*.html and assets/refs, and re-running this file
# rebuilds them from whatever captures are in the folder.
#
# The eight profile screens are Mobbin's, cited by their screen id. The six feed
# screens came from the user, and a file name is all there is to cite them by.
MOBBIN = "https://mobbin.com/screens/"
SOURCE = {"01-profile": MOBBIN + "14abab29-3e7f-41ea-b1d3-cad9d3705f5a",
          "02-grid-scrolled": MOBBIN + "bea6b7c5-8dfd-40c5-9cdb-63aad72ee143",
          "03-reels": MOBBIN + "bee0c28a-9ce0-44ab-9e7c-18762d85af30",
          "04-reposts": MOBBIN + "227b9b6e-f606-4d12-b941-62b1c52f4d4c",
          "05-tagged": MOBBIN + "ed12d16e-138a-4ffb-a2b2-1134b1ec45b9",
          "06-private": MOBBIN + "9c930acd-4fd6-4400-b628-d1b44bbe66a9",
          "07-nytcooking": MOBBIN + "2ebf521b-8011-4472-9615-9778c546f0ef",
          "08-agnezmo": MOBBIN + "fd46bbb4-f06b-4ef9-83aa-461daa667c15",
          "09-feed-switcher": "switching-to-following-feed-01.png",
          "10-following-feed": "switching-to-following-feed-02.png",
          "11-favorites-empty": "switching-to-favorites-feed-01.png",
          "12-favorites-feed": "switching-to-favorites-feed-02.png",
          "13-reels-toast": "switching-to-fullscreen-01.png",
          "14-reels-fullscreen": "switching-to-fullscreen-02.png",
          "16-widget-messages": "widgets-01.png",
          "17-widget-stories": "widgets-02.png",
          "18-widget-reels": "widgets-03.png",
          "19-widget-shortcuts": "widgets-04.png",
          "20-widget-search": "widgets-05.png"}

REF_CSS = """body{padding:24px}
.rboard{position:relative;flex:none;width:430px;height:932px;padding:13px 20px 0;
  border-radius:20px;background:#151311;color:#fff;overflow:hidden}
.rboard h1{font:600 13px/17px var(--x-font);letter-spacing:-.1px}
.rboard p{margin-top:1px;font:400 9px/12px ui-monospace,Menlo,monospace;
  color:rgba(255,255,255,.45);word-break:break-all}
.rboard img{margin:9px auto 0;display:block;height:858px;width:auto;border-radius:5px}"""


def ref_boards():
    for stem, label, _ in SCREENS + WIDGET_BOARDS:
        f = REFS_DIR / ("p%s.png" % stem[:2])
        if not f.exists():
            continue
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="rboard"><h1>%s &mdash; Mobbin capture</h1>'
                    '<p>1179&times;2676 @3x &middot; %s</p>'
                    '<img src="%s" alt="%s reference"></div>'
                    % (label, SOURCE[stem], _uri(f), label), REF_CSS))


# ------------------------------------------------------------------ run ----
def layout():
    """The three rows, whether or not the reference boards were built.

    They need assets/refs/, which is gitignored, so a clean clone builds none
    of them -- and a row written only when they exist would rewrite the
    committed layout.json on every such run. The canvas already drops an entry
    whose file is missing, and a row that empties out with it.
    """
    return {"name": PAGE_NAME, "rows": [
        {"title": "Foundations",
         "files": [{"file": n, "label": "Design tokens"} for n, _ in token_boards()]
                  + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]},
        {"title": "Screens", "numbered": True,
         "files": [{"file": s, "label": l} for s, l, _ in SCREENS + LIVE]},
        # Same order as the row above, so capture N lands under replica N.
        {"title": "Source of truth: Mobbin captures", "numbered": True,
         "files": [{"file": "ref-" + s, "label": l} for s, l, _ in SCREENS]},
        {"title": "Home-screen widgets", "numbered": True,
         "files": [{"file": s, "label": l} for s, l, _ in WIDGET_BOARDS]},
        {"title": "Source of truth: widget captures", "numbered": True,
         "files": [{"file": "ref-" + s, "label": l} for s, l, _ in WIDGET_BOARDS]}]}


def main():
    files = dict(list(token_boards())
                 + list(evidence_boards())
                 + [(s, screen(l, fn)) for s, l, fn in SCREENS + LIVE + WIDGET_BOARDS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    out = layout()
    (OUT / "layout.json").write_text(json.dumps(out, indent=2) + "\n")
    print("layout.json", len(out["rows"]), "rows")


if __name__ == "__main__":
    main()
