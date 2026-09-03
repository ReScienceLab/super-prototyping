"""ChatGPT for iOS -- 25 screens, the tokens behind them, and the captures.

Regenerates the whole folder in place, byte-identically, from anywhere:

    python3 mockups/canvases/chatgpt-ios/gen.py
    python3 tools/refkit.py tokens mockups/canvases/chatgpt-ios

Every colour and every metric in here was read off the 25 Mobbin captures at
2.244275 capture px per design pt (882 px across a 393 pt screen), and every
one of them is stated with its evidence on the 00b/00c boards. Nothing was
eyeballed. The artboards are output: never hand-edit an .html, edit this file
and re-run.

Two things the captures make you decide up front.

THE APP IS FOUR TYPE SYSTEMS. Screens 05-12 are a web view -- OpenAI's auth
flow in a sheet -- and everything else is native. They do not share a black:
the native ink censuses at #030003 and the web view's at #0E0E10, on screens
captured in the same batch, so the split is the app's, not the colour space's.
They do not share a button either: 53.8 pt tall in the sheet, 47.5-50.4
outside it. But the boundary is not where the sheet is, which is why there are
four ladders and not two. The native screens run on 15/17/22/27/34px. The web
view is rem-based, and its sizes turn up outside it: 13's subtitle and 04's
pill labels set on the web 16px and 17.6px on screens that are otherwise
native. 04's own title is a 33px that belongs to neither. And 16's
announcement sheet is a ladder of its own again, 15.25/16/26.75. Every one of
those sizes ships as its own token, with the width that forced it.

THE FACE IS OPENAI SANS AND IT IS NOT ON THIS MACHINE. `refkit font` returns
no call for it -- it is outside the candidate set, which cannot name a brand
face at all -- so the boards set in the platform stack. The stand-in sends two
bills, and both are paid in one place rather than spread over the screens.
FACE_DROP raises every run 1.1 pt, because OpenAI Sans sits that much lower in
its own line box; XOFF pulls every LEFT-ALIGNED run 0.6 pt left, because the
stand-in starts its ink that much further right at the same box left. Centred
text pays only the first: its ink is placed by the middle, not the edge. On
top of that the stand-in sets 2.7-3.0% wider at 34px (1.00x at 17px), so the
34px titles get containers wide enough for the wrap the capture shows. The
wrap wins; the type is never shrunk to fit.

Three defects belong to the source, not to the replica, and none of them is a
delta to chase: Mobbin composites the Dynamic Island out, drops the home
indicator entirely, and exports with square corners. All three are drawn here.
The diff window is trimmed accordingly -- see README.md.
"""
import base64, json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}
SCALE = 2.244275                                  # capture px per design pt

NAME = "ChatGPT iOS"
PAGE_NAME = NAME
P = "g"          # token prefix: --g-bg, --g-ink, --g-t-row

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). The :root block and the evidence table are
# both generated from this list, so a value cannot drift from the evidence
# behind it, and a token cannot ship without one.
TOKENS = [
 ("Font", "font", '-apple-system,BlinkMacSystemFont,"SF Pro Text",'
                  '"Helvetica Neue",Arial,sans-serif',
  "refkit font: no call. OpenAI Sans is outside the candidate set; "
  "stand-in cap 0.7165 vs ~0.735, +2.7-3.0% wide at 34px, 1.00x at 17px"),

 ("Surface", "bg",       "#FFFFFF",
  "flat-fill census, page ground, all 25 captures"),
 ("Surface", "card",     "#FAFAFA",
  "17 row y690 crosses card 1 at #FCFBFC, the 16pt gap at #FEFEFE and card 2 "
  "at #FAFAFA; 18's y700 census reads #FBF8FB. The neutral of that spread"),
 ("Surface", "chip",     "#F7F7F7",
  "25 row y215, the selected Sources tab pill"),
 ("Surface", "sheet",    "#EFECF0",
  "16 col x30, memory sheet body below the hero"),
 ("Surface", "dark",     "#030003",
  "04 col x196 sheet ground; 02 Continue core. Native black, chroma noise"),
 ("Surface", "dark-2",   "#2F2C2F",
  "04 col x196, the Google button inside the black sheet"),
 ("Surface", "fab",      "#242424",
  "21 col x300, the Chat button, y 770.9-821.2. 23 censuses the same pill at "
  "#282528, four levels up and tinted with it; that capture is the noisier of "
  "the two -- its page white breaks into 18446 exact pixels where 21 has "
  "21983 -- so the clean board sets the token"),
 ("Surface", "web-btn",  "#0D0D0D",
  "06/08/09/10/12 col x196 button core, reads #0E0E10. Web view, not native"),
 ("Surface", "disabled", "#A1A0A3",
  "07 and 11 col x196, Continue before the form validates"),
 ("Surface", "close",   "#C5C5C7",
  "04 close disc, row y101 either side of the X; the disc's left crescent "
  "censuses #C6C6C6 and #C5C5C5 in almost equal share around it"),
 ("Surface", "fade",    "#F3F3F3",
  "24 col 196: white to 720.1, F8F8F8 to 770.0, F3F3F3 at the composer line"),
 ("Surface", "scrim",    "rgba(20,5,20,.20)",
  "05-12 col strip above the sheet reads #D0CDD0 over white and 16's scrimmed "
  "home screen averages 207,204,207: the dim is tinted, not neutral black"),

 ("Line", "field",  "#DFDFDF",
  "05 edges across the email field: #DCDCDC #DDDDDD #DEDEDE #E4E4E4"),
 ("Line", "pill",   "#E0E0E0",
  "06 coverage solve on the Apple pill's top rule: #DDDDDD-#DFDFDF depending "
  "on the band. A 1pt rule this pale is under the diff's noise either way"),
 ("Line", "hair",   "#E8E8E8",
  "13 row y250 crosses the card's left rule at 23.5-24.4 reading #E3E3E3. No "
  "coverage solve here: the card's own shadow sits outside the rule and a "
  "solve would count it as ink, returning #CBC8CF"),

 ("Ink", "ink",     "#000000",
  "02 title ink core, darkest 8%; reads #030003"),
 ("Ink", "ink-web", "#0D0D0D",
  "05 sheet title ink core: #0A0A0A at the darkest 2%, #121212 at 8%. The web "
  "view's black sits between them and censuses flat as #0E0E10 on 06's button"),
 ("Ink", "sub",     "#5F5F5F",
  "20's three body lines, darkest 8%: #5D5D5D. Native only: the web view's "
  "subtitle looks like the same grey and is not, see sub-web"),
 ("Ink", "sub-web", "#676767",
  "the web view's subtitle, five boards inside a level of each other at the "
  "darkest 6-8%: 05 #676667, 06 #676666, 07 #696868, 09 #666666, 10 #666666, "
  "where --x-sub renders the same runs #595959. 20's native body, which is what "
  "set --x-sub, reads #5E5E5E against my #5B5B5B on the same census"),
 ("Ink", "mute",    "#868686",
  "02 feature body line 1, darkest 8%: #858585. All three lines at once read "
  "four levels light, because the interline white is inside the 8%. Also 21's "
  "empty state, #848484-#878787 across three screens"),
 ("Ink", "place",   "#909090",
  "17 'Ask ChatGPT' and 05 'Email' placeholder cores, #8F8F8F-#929192"),
 ("Ink", "tab",     "#8B8B8C",
  "24 row y215, the unselected Sources label"),
 ("Ink", "legal",   "#8A8A8A",
  "02 legal ink core, darkest 12% of (36,776)-(200,790); 11 reads 969696"),

 ("Accent", "blue",  "#5953B8",
  "16 Upgrade label #494496 divided by the 0.816 scrim: unscrimmed value"),

 ("Radius", "r-phone", "52px",  "iPhone 14 Pro/15/16 display corner, this repo's stand-in"),
 ("Radius", "r-field", "12px",  "05 field corner, refkit scan on the top-left"),
 ("Radius", "r-card",  "16px",  "17 carousel card corner"),
 ("Radius", "r-sheet", "48.5px",
  "16 bottom-left corner, 13 subpixel edges from 4 to 40pt above the sheet "
  "floor, least-squares on a circle: r 48.5 at 0.30 rms. The top corners read "
  "37 by the same fit, but there the edge being found is the hero's own soft "
  "top, not the mask"),
 ("Radius", "r-pill",  "999px", "every button and pill in the app is fully round"),

 ("Type", "t-time",  "600 15px/20px var(--x-font)", "iOS status bar clock"),
 ("Type", "t-h1",    "600 34px/40px var(--x-font)",
  "02 title ink 118.5-144.4: cap 25.8 / 0.7165"),
 ("Type", "t-wall",  "600 33px/40px var(--x-font)",
  "04 title sets 236.6 x 23.6 where the same 34px that is exact on 02's 326.2 "
  "renders it 242.2 x 25.0; 33px scales width and cap height onto both"),
 ("Type", "t-h2",    "500 28px/33px var(--x-font)",
  "15 title sets 302.1 and 164.9 over its two lines and 12 combinations hold "
  "both: width cannot separate 500/28 from 600/27.4. Ink mass can. The ref's "
  "line 1 counts 9255 px under 128 where 600/27.4 renders 10567, 14% heavy, and "
  "a board sweep bottoms out flat from 450 to 550 (14 2.85-2.87, 15 3.79-3.81) "
  "against 600's 2.95/3.89. 500 is the real weight inside that floor"),
 ("Type", "t-h3",    "500 22px/28px var(--x-font)",
  "13 title sets 148.4 x 20.1 and 20's 293.6 x 20.1; 500 22px returns 148.4 "
  "x 20.1, where 600 overshoots both by 2.3%"),
 ("Type", "t-side",  "600 22px/28px var(--x-font)",
  "23 'ChatGPT' sets 90.0 x 16.0; 600 22px returns 89.6 x 16.0, 700 91.3 x 16.5"),
 ("Type", "t-body",  "400 17px/22px var(--x-font)",
  "02 subtitle 176.9-215.7 over two lines: leading 22.4"),
 ("Type", "t-row",   "400 17px/22px var(--x-font)",
  "19 menu label ink 725.8-742.3; sidebar rows"),
 ("Type", "t-btn",   "600 17px/22px var(--x-font)", "02 and 04 button labels"),
 # The one 17px run on these boards that is not a button and not a section
 # header. 25's empty-state headline sets 215.2 wide over 4317 ink pixels;
 # t-btn's 600 gives 218.8 over 5042 and 500 gives 214.8 over 4332. It is not
 # t-btn slipping either -- dropping t-btn itself to 500 costs 02 two thirds of
 # a level on its feature headings, which are the same 17px and really are 600.
 ("Type", "t-emph",  "500 17px/22px var(--x-font)",
  "25 \"Give ChatGPT more context\", ink 342.6-356.0, 215.2 wide over 4317 px"),
 ("Type", "t-nav",   "600 17px/22px var(--x-font)",
  "19 nav title ink 74.4-87.8, width 69.9"),
 ("Type", "t-card",  "600 15px/20px var(--x-font)",
  "17 card title ink 695.1-711.1: 0.962em with ascender and descender"),
 ("Type", "t-cards", "400 15px/20px var(--x-font)",
  "17 card sub ink 716.5-730.7"),
 ("Type", "t-web",   "400 16px/21px var(--x-font)",
  "06 sub line 1 sets 319.0 and the field value 231.3; 16px returns 319.9/231.7"),
 ("Type", "t-webbtn","600 17.6px/22px var(--x-font)",
  "06 'Continue with Google' sets 175.6; 17.6px semibold returns 175.6 exactly"),
 ("Type", "t-webcta","500 17px/22px var(--x-font)",
  "05 Continue label sets 68.6 x 12.9; 500 17px returns 68.6 x 12.9"),
 ("Type", "t-webact","500 16px/22px var(--x-font)",
  "the web ladder's tappable weight, and four strings on two screens agree on "
  "it to the tenth: 13 sets 'Turn on notifications' 151.1, 'Maybe later' 85.6 "
  "and 'ChatGPT' 65.1, 09 sets 'Resend email' 96.7, where 500 16px returns "
  "151.1 / 85.6 / 65.5 / 96.7 and t-btn's 600 17px overshoots every one by "
  "7.3-8.1%. 23's 'Projects' and 20's 'Try it' stay on t-btn: those measure "
  "63.3 and 37.9 against my 63.7 and 39.2, so the native screens are not this"),
 ("Type", "t-sheeth", "600 26.75px/32.5px var(--x-font)",
  "16 title sets 197.4 and 217.4 over its two lines, where 15's title at the same "
  "27px renders 1.3% narrow; the sheet is its own ladder, half a px under t-h2"),
 ("Type", "t-sheet",  "400 15.25px/20.5px var(--x-font)",
  "16 body line 1 sets 327.1 wide on a 20.5 pitch; the same string returns 322.6 "
  "at 15px and 327.1 at 15.25, so the sheet is not the 15px card ladder"),
 ("Type", "t-sheetbtn","600 16px/21px var(--x-font)",
  "16 'Show me' sets 68.2 x 11.6 and 'Not now' 60.2 x 11.1; 600 16px returns 67.7 "
  "and 61.0, where 17px overshoots both by 5%"),
 ("Type", "t-weblegal","400 12.8px/17px var(--x-font)",
  "07 legal line sets 181.8; my 12px returned 169.3, so 12 x 181.8/169.3"),
 ("Type", "t-webh",  "400 22px/28px var(--x-font)",
  "05 title ink 195.6-216.1, asc+desc 20.5 / 0.93 = 22.0; stroke reads regular"),
 ("Type", "t-proj",  "400 28px/34px var(--x-font)",
  "24 \"UI UX\" ink 143.9-164.0, cap 20.1 / 0.7165 = 28.0; 400, not the 600 "
  "first written -- at 28px the capture's title carries 1895 ink pixels and "
  "sets 67.3 wide, against 1910/67.3 at 400 and 2684/70.0 at 600"),
 ("Type", "t-tab",   "600 15px/20px var(--x-font)", "24 tab label ink 210.3-224.6"),
 ("Type", "t-lbl",   "400 12px/16px var(--x-font)",
  "06 floating field label above the filled value"),

 ("Metrics", "w",        "393px",   "iPhone 14 Pro/15/16 logical width"),
 ("Metrics", "h",        "852px",   "iPhone 14 Pro/15/16 logical height"),
 ("Metrics", "status",   "54px",    "iOS status bar, Dynamic Island devices"),
 ("Metrics", "gutter",   "24px",    "02 Continue box x 24.1-368.9"),
 ("Metrics", "content",  "345px",   "the same box, width 344.8"),
 ("Metrics", "sheet-top","59px",    "05-12: scrim ends 58.8, sheet white starts 59.3"),
 ("Metrics", "field-h",  "54.8px",  "11 field 261.1-315.9 and 05 field 301.9-357.2"),
 ("Metrics", "btn-web",  "53.8px",  "06 Continue 381.5-435.3, the web view's button"),
 ("Metrics", "btn-h",    "47.5px",  "04 sheet buttons, pitch 60.3"),
 ("Metrics", "row",      "48px",    "21/23 sidebar row pitch, icon tops 135.9 182.7"),
 ("Metrics", "comp-h",   "47.2px",  "17 composer pill 770.0-817.2"),
 ("Metrics", "comp-x",   "30.5px",  "17 composer pill left edge; right edge 362.5"),
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


TOKENS_CSS = _root().replace("var(--x-font)", "var(--x-font)")

# ------------------------------------------------------------------ art ----
def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return
    from PIL import Image                                     # noqa: local dep
    ART_DIR.mkdir(parents=True, exist_ok=True)
    src, n = {}, 0
    for cid, (ref, x0, y0, x1, y1) in CROPS.items():
        f = REFS_DIR / (ref + ".png")
        if not f.exists():
            continue
        if ref not in src:
            src[ref] = Image.open(f).convert("RGB")
        box = tuple(round(v * SCALE) for v in (x0, y0, x1, y1))
        src[ref].crop(box).save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def art(cid, x=None, y=None, w=None, z=None):
    """One <img>, at the box it was measured from unless a screen reuses it.

    The logo, the Google mark and the Apple mark appear on several screens at
    the same size; x/y/w move a reused crop and keep its aspect ratio.
    """
    _, x0, y0, x1, y1 = CROPS[cid]
    cw, ch = x1 - x0, y1 - y0
    w = cw if w is None else w
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx%s">'
            % (_uri(cid), x0 if x is None else x, y0 if y is None else y,
               w, w * ch / cw, ";z-index:%d" % z if z else ""))


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


# ------------------------------------------------------- the line box ----
# Every string on these boards is placed by the top of its ink, because that
# is what refkit measures. Chrome puts the cap top of a line at
#   lh/2 - 0.3455*size
# below the box top -- half-leading (lh - 1.162*size)/2 plus the gap between
# the ascent (0.952em) and the cap height (0.7165em) of the platform face.
# Solving that once here is the difference between placing 60 strings and
# nudging 60 strings.
TY = {"t-time": (15, 20), "t-h1": (34, 40), "t-wall": (33, 40), "t-h2": (28, 33), "t-h3": (22, 28),
      "t-side": (22, 28), "t-body": (17, 22), "t-row": (17, 22),
      "t-btn": (17, 22), "t-emph": (17, 22), "t-nav": (17, 22), "t-card": (15, 20),
      "t-cards": (15, 20), "t-tab": (15, 20), "t-lbl": (12, 16),
      "t-proj": (28, 34), "t-webh": (22, 28),
      "t-web": (16, 21), "t-webbtn": (17.6, 22), "t-webcta": (17, 22),
      "t-webact": (16, 22),
      "t-weblegal": (12.8, 17), "t-sheetbtn": (16, 21),
      "t-sheet": (15.25, 20.5), "t-sheeth": (26.75, 32.5)}


# Chrome puts a line's cap top at lh/2 - 0.3455*size below the box top.  The
# +1.1 is the stand-in's bill: OpenAI Sans sits about that much lower in its own
# line box than -apple-system does, measured as ref-minus-mine over the first
# ink band of 13, 14, 17, 20, 24 and 25 (0.9 .. 1.8, median 1.15).
FACE_DROP = 1.1


def boxtop(ink_top, tk, lh=None):
    size, dflt = TY[tk]
    return ink_top - ((lh or dflt) / 2 - 0.3455 * size) + FACE_DROP


# The second half of the stand-in's bill.  A left-aligned run of -apple-system
# starts its ink about 0.6pt further right than OpenAI Sans does at the same box
# left: measured as mine-minus-ref over the first glyph of every recents row on
# 23 (+0.45 on all five) and the six feature runs on 02 (+0.45 twice, +0.89
# four times, mean 0.63 over the twelve).  Left-aligned
# text pays it; centred text does not, because the ink is placed by its middle,
# and forcing the offset on txc as well takes 06 and 13 the wrong way.
XOFF = 0.6


def tx(x, ink_top, s, tk="t-body", col=None, w=None, extra="", lh=None,
       off=None):
    """One run of type, positioned by the top of its ink.

    `lh` overrides the token's leading where a block's measured pitch disagrees
    with its token, which keeps the exception on the one board instead of
    forking a type token for it.
    """
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;font:var(--x-%s)%s%s%s%s">%s</div>'
            % (x - (XOFF if off is None else off), boxtop(ink_top, tk, lh), tk,
               ";line-height:%.0fpx" % lh if lh else "",
               ";color:%s" % col if col else "",
               ";width:%.1fpx" % w if w else "", extra, s))


def txc(ink_top, s, tk="t-body", col=None, x=0.0, w=393.0, extra="", lh=None):
    """Centred type. The width is the box it centres in, not the ink."""
    return tx(x, ink_top, s, tk, col, w, ";text-align:center" + extra, lh, 0.0)


def box(x, y, w, h, style="", cls="b", inner=""):
    return ('<div class="%s" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;'
            'height:%.1fpx;%s">%s</div>' % (cls, x, y, w, h, style, inner))


# ---------------------------------------------------------------- icons ----
# Inline SVG, never an SF Symbols glyph: the artboard is sandboxed and a
# private-use codepoint renders as tofu without SF Pro installed. Each entry
# is (viewBox width, viewBox height, markup) at the icon's *measured* ink box
# in pt, so placing it is 1:1 with nothing to converge.
def _gear():
    """Eight teeth on a ring.  Off 02: the gear spans 28.5 x 27.9 about (40.45,496.85),
    so a tooth tip sits at r 14.1; the tip reads 5.4 wide 0.9 down and 6.2 wide 2.7
    down, which is a 6.2 rect with rx 1.9; the body's outer edge solves to r 10.7 from
    the row half-widths at dy 3.2 and 4.1, and the bore to r 4.75 from the gap on the
    five rows either side of centre."""
    teeth = "".join(
        '<rect x="-3.1" y="-14.1" width="6.2" height="5.9" rx="1.9"'
        ' transform="rotate(%g)"/>' % (i * 45) for i in range(8))
    return ('<g transform="translate(14.1,14.1)" fill="currentColor">%s'
            '<circle r="7.725" fill="none" stroke="currentColor" stroke-width="5.95"/>'
            '</g>' % teeth)


S_ = ' fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"'

ICONS = {
 # nav
 # Two bars 8.9 apart, not the 6.4 first drawn: on 17 the top bar's ink runs
 # 75.7-78.4 and the bottom's 84.7-87.3, a 2.7 stroke either side of a 8.9 pitch,
 # and the pair fills 75.7-87.3 rather than sitting inside it. The lengths are
 # 20.1 and 12.9 at the same threshold, against 20.5 and 12.5 as it was drawn.
 "menu":    (20.9, 11.3, '<path d="M1.2 1.2h18.5M1.2 10.1h11.0"%s stroke-width="2.4"/>' % S_),
 # Three pieces, each measured off 17 rather than composed by eye. The head's
 # ink is 290.5-301.7 x 70.4-81.5, an 11.1 circle centred on (296.1, 76.0). The
 # shoulders are not a full semicircle: the left leg stands at 286.5-288.7 and
 # the apex tops out at 82.4, which puts an r-8.5 arc centred on (296.1, 92.0),
 # and it stops at about x 298.5 where the badge knocks it out -- a row slice at
 # 85.5 finds nothing between 293 and the badge. The badge is a plus, 9.3 x 8.9
 # of ink centred on (302.8, 88.2), and it sits beside the SHOULDERS, not beside
 # the head: as drawn before, its bar merged with the head's right wall into one
 # 5.8-wide run at y 76.
 "person+": (21.8, 23.2,
   '<circle cx="10.0" cy="5.95" r="4.45"%s stroke-width="1.9"/>'
   '<path d="M1.5 22A8.5 8.5 0 0 1 12.45 13.87"%s stroke-width="1.9"/>'
   '<path d="M16.65 14.9v6.7M13.1 18.25h7.1"%s stroke-width="1.9"/>' % (S_, S_, S_)),
 # Six dashes and an arrowhead, where this was nine dashes and no arrow. 17's
 # circle walls sit at 341.3-344.0 and 361.4-364.0 on row 81.5, so the ring is
 # 22.7 across on a 2.4 stroke, centred on (352.7, 81.6) -- r 10.1 on the centre
 # line, 63.5 round. The side dashes span 77.5-85.6, 8.1 of ink, which is a 5.7
 # arc under two round caps; six of those on a 10.58 pitch leave a 4.88 gap that
 # shows as the 2.2 of white measured at the top. Offsetting half a dash puts one
 # dash centred at 3 o'clock and gaps at 12 and 6, which is what the capture has.
 # The 7-o'clock dash carries a filled arrowhead: ink 342.6-351.6 x 86.5-92.0,
 # about twice a dash's width, tipped at (344.8, 86.4).
 "dashed":  (22.7, 22.6,
   '<circle cx="11.35" cy="11.3" r="10.1"%s stroke-width="2.4"'
   ' stroke-dasharray="5.7 4.88" stroke-dashoffset="2.85"/>'
   '<path d="M3.5 16.15L1.1 20.55 6.3 20.15z" fill="currentColor"/>' % S_),
 "search":  (21.8, 21.4,
   '<circle cx="9.1" cy="8.9" r="7.7"%s stroke-width="1.9"/>'
   '<path d="M14.8 14.6l5.9 5.8"%s stroke-width="1.9"/>' % (S_, S_)),
 "share":   (20.5, 20.5,
   '<path d="M10.25 1.3v13.1M5.9 5.5l4.35-4.2 4.35 4.2"%s stroke-width="1.9"/>'
   '<path d="M4.3 8.9H2.1v10.3h16.3V8.9h-2.2"%s stroke-width="1.9"/>' % (S_, S_)),
 "dots":    (20.9, 4.9,
   '<g fill="currentColor"><circle cx="2.45" cy="2.45" r="2.45"/>'
   '<circle cx="10.45" cy="2.45" r="2.45"/>'
   '<circle cx="18.45" cy="2.45" r="2.45"/></g>'),
 "chev":    (10.2, 18.3,
   '<path d="M9.2 1.1L1.2 9.15l8 8.05"%s stroke-width="2"/>' % S_),
 # Two closes, because the web sheet's is not the app's. Both are square -- the
 # one viewBox drawn here was 16.9 x 16.0, so its span bound on height and set
 # the width 1.3 wide -- and both carry the same ~2.1 stroke, measured as ink
 # coverage across one row rather than off a threshold: 5.88pt over the two arms
 # on 06 against 5.74 for a drawn 2.0, and 7.46 on 04 against 5.33 for a drawn
 # 1.54. Only the box differs, 14.7 on the web sheet against 13.6 in 04's grey
 # disc, which is why the stroke cannot ride on a single entry scaled twice.
 "close":   (14.7, 14.7,
   '<path d="M1.03 1.03L13.67 13.67M13.67 1.03L1.03 13.67"%s stroke-width="2.05"/>' % S_),
 "close-d": (13.6, 13.6,
   '<path d="M1.08 1.08L12.52 12.52M12.52 1.08L1.08 12.52"%s stroke-width="2.16"/>' % S_),
 # composer
 "plus":    (16.9, 16.9, '<path d="M8.45 1v14.9M1 8.45h14.9"%s stroke-width="2"/>' % S_),
 "mic":     (15.6, 18.7,
   '<rect x="5.1" y=".9" width="5.4" height="10.4" rx="2.7"%s stroke-width="1.7"/>'
   '<path d="M1.5 9.1a6.3 6.3 0 0012.6 0M7.8 15.4v2.4"%s stroke-width="1.7"/>'
   % (S_, S_)),
 # The disc is 31.6 across on 17, not the 35.2 first read off it: thresholding
 # the near-black at <100 puts it at 321.4-353.0 x 777.9-809.6, and the 35.2 was
 # the pill's white taken in with it. Inside it, bright pixels within 11pt of the
 # centre give four bars of one width, 3.12, on a 5.12 pitch at dx -7.66 -2.31
 # +2.59 +7.71, and heights 5.79 / 16.04 / 10.25 / 5.79 -- the outer two equal,
 # which is what the old 8 / 15 / 11 / 5.4 got wrong quite apart from the scale.
 "wave":    (31.64, 31.64,
   '<circle cx="15.82" cy="15.82" r="15.82" fill="currentColor"/>'
   '<g fill="#FFF"><rect x="6.60" y="12.93" width="3.12" height="5.79" rx="1.56"/>'
   '<rect x="11.95" y="7.49" width="3.12" height="16.04" rx="1.56"/>'
   '<rect x="16.85" y="10.70" width="3.12" height="10.25" rx="1.56"/>'
   '<rect x="21.97" y="12.93" width="3.12" height="5.79" rx="1.56"/></g>'),
 "send":    (31.6, 31.6,
   '<circle cx="15.8" cy="15.8" r="15.8" fill="#DEDEE0"/>'
   '<path d="M15.8 22.4V10.1M10.6 15.3l5.2-5.2 5.2 5.2" fill="none" stroke="#FFF"'
   ' stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>'),
 # forms
 # 25.0 x 19.6 with a 2.2 stroke, all of it off 08's own eye: the ink box grows
 # to 332.0-356.9 x 373.4-393.0, the centre row breaks into lid 331.8-334.9,
 # pupil 338.9-349.2, lid 353.2-356.7, and the centre column puts the pupil's
 # ring at 377.7-388.4. The 21 x 15 this replaces was the right drawing at the
 # wrong aspect, so only one of its axes bound.
 "eye":     (25.0, 19.6,
   '<path d="M1.1 9.8S5.7 1.1 12.5 1.1 23.9 9.8 23.9 9.8s-4.6 8.7-11.4 8.7'
   'S1.1 9.8 1.1 9.8z"%s stroke-width="2.2"/>'
   '<circle cx="12.5" cy="9.8" r="4.15"%s stroke-width="2.2"/>' % (S_, S_)),
 "checkc":  (14.6, 14.6,
   '<circle cx="7.3" cy="7.3" r="6.4"%s stroke-width="1.4"/>'
   '<path d="M4.3 7.5l2.1 2.1 4.1-4.4"%s stroke-width="1.4"/>' % (S_, S_)),
 "radio":   (21.4, 20.9,
   '<circle cx="10.7" cy="10.45" r="9.5" fill="none" stroke="#D3D3D3"'
   ' stroke-width="1.6"/>'),
 "radio-on":(21.4, 20.9,
   '<circle cx="10.7" cy="10.45" r="10.4" fill="currentColor"/>'
   '<path d="M6.1 10.6l3.1 3.1 6.1-6.5" fill="none" stroke="#FFF" stroke-width="1.8"'
   ' stroke-linecap="round" stroke-linejoin="round"/>'),
 # welcome features
 # a waving flag, not a pennant: on 02 the top edge crests at x6.8 and falls to
 # y5.1 at the fly, the bottom edge repeats the wave 16.4 lower at the pole and
 # 13.7 lower at the fly, and the fly itself is a plain vertical at x22.55
 "flag":    (24.1, 29.5,
   '<path d="M1.55 27.95V1.9C7 -0.4 15 5.6 22.55 4.9V19.1C15 21 7 16 1.55 18.3"'
   '%s stroke-width="3.0"/>' % S_),
 "lock":    (27.2, 29.9,
   # body wall 2.87pt wide on the 02 row scan at y392; shackle 3.27pt of horizontal
   # ink at y376.5, which is 3.0 across a radial 24 degrees off the horizontal
   '<path d="M6.04 10.0V9.06a7.56 7.56 0 0115.12 0v0.94"%s stroke-width="3.0"/>'
   '<rect x="1.45" y="9.95" width="24.3" height="18.4" rx="3.91"%s stroke-width="2.9"/>'
   '<circle cx="13.6" cy="19.4" r="2.85" fill="currentColor"/>'
   '<rect x="12.45" y="19.4" width="2.3" height="4.4" rx="1.0" fill="currentColor"/>'
   % (S_, S_)),
 "gear":    (28.2, 28.2, _gear()),
 # plus menu
 "image":   (18.7, 18.3,
   '<rect x=".95" y=".95" width="16.8" height="16.4" rx="4.4"%s stroke-width="1.8"/>'
   '<circle cx="6.2" cy="6.1" r="1.8" fill="currentColor"/>'
   '<path d="M2.1 15.1l4.6-4.6 3 3 3.4-3.4 4.4 4.4"%s stroke-width="1.8"/>'
   % (S_, S_)),
 "pencil":  (17.8, 17.8,
   '<path d="M1.5 16.3l1-4.2L11.9 2.7l3.2 3.2-9.4 9.4-4.2 1z"%s stroke-width="1.8"/>'
   '<path d="M10.3 4.3l3.2 3.2"%s stroke-width="1.8"/>' % (S_, S_)),
 "globe":   (19.2, 18.3,
   '<ellipse cx="9.6" cy="9.15" rx="8.7" ry="8.25"%s stroke-width="1.8"/>'
   '<path d="M9.6.9c-2.9 3.9-2.9 12.6 0 16.5M9.6.9c2.9 3.9 2.9 12.6 0 16.5'
   'M1.4 6.3h16.4M1.4 12h16.4"%s stroke-width="1.8"/>' % (S_, S_)),
 # sidebar rows
 # A folder with a rule across it, not a plain folder, and 19.1 x 17.2 rather
 # than the near-square 20.9 x 20.5 first drawn -- that aspect alone set the
 # width a point wide. 21's walls sit at 26.3-28.1 and 43.7-45.4, so the body is
 # 19.1 across on a 1.8 stroke; the tab tops out at 137.2 and the body top at
 # 139.2, 2.0 below it; the bottom edge centres on 152.6. The rule is the piece
 # that was missing: a full-width run at 143.0-144.8, 1.8 thick, which every row
 # slice across the icon finds and which reads as the folder's front lip.
 "folder":  (19.1, 17.2,
   '<path d="M.9 13.7V3.5a2.6 2.6 0 012.6-2.6h5l2 2h5.15a2.6 2.6 0 012.6 2.6'
   'v8.2a2.6 2.6 0 01-2.6 2.6H3.5a2.6 2.6 0 01-2.6-2.6z"%s stroke-width="1.8"/>'
   '<path d="M.9 7.6h17.35"%s stroke-width="1.8"/>' % (S_, S_)),
 # The plus is not inside the folder, it replaces its bottom-right corner. On 23
 # the bottom edge stops at 37.0 and the right wall at about 297, and a plus
 # 7.1 x 6.7 sits in the gap centred on (42.75, 302.75) -- bars at 39.2-46.3 and
 # 299.4-306.1, the same 1.8 stroke. Drawn in the middle, as it was, the mark
 # merged with the rule above it.
 "folder+": (19.6, 17.8,
   '<path d="M17.85 8.7V5.5a2.6 2.6 0 00-2.6-2.6H10.4l-2-2H3.5A2.6 2.6 0 00.9 3.5'
   'V13.6a2.6 2.6 0 002.6 2.6h6.8"%s stroke-width="1.8" fill="none"/>'
   '<path d="M.9 7.6h16.95M16.05 12v4.9M13.4 14.45h5.3"%s stroke-width="1.8"/>'
   % (S_, S_)),
 # A photo behind a tilted card, measured off 21 row by row. The pair's ink runs
 # 25.4-46.3 x 183.1-203.2, so this icon is 20.9 x 20.1 and not the 22.0 x 21.0
 # first drawn. The front frame's walls centre on 26.3 and 39.2 and its top and
 # bottom on 189.4 and 201.9. The back card is the piece that was wrong: its top
 # edge is not level, it drops from (33.0, 184.0) to (43.3, 185.7) -- 1.6 over
 # 10.3, about 9 degrees -- and only its right wall, at 45.4 from 186 to 196, is
 # vertical. The dot is filled, 2.7 across, centred on (34.75, 192.95).
 "images":  (20.9, 20.1,
   '<rect x=".9" y="6.3" width="12.9" height="12.5" rx="3.8"%s stroke-width="1.8"/>'
   '<path d="M7.6 1L16.4 2.2a4.2 4.2 0 013.6 4.3L19.6 12.6"%s stroke-width="1.8"/>'
   '<path d="M.9 13.6q2.2-3.2 4.4-1.4L13.4 18.8"%s stroke-width="1.8"/>'
   '<circle cx="9.35" cy="9.85" r="1.35" fill="currentColor" stroke="none"/>'
   % (S_, S_, S_)),
 # Four rings, not four filled tiles. 23's row 188.3 cuts each of the top pair
 # into two 2.2 walls 5.8 apart, so they are 8.4 across on a 1.9 stroke, and the
 # four sit on a 9.8 pitch centred at (31.4, 188.3) and (41.2, 198.1).
 "apps":    (20.9, 20.5,
   '<g%s stroke-width="1.9">'
   '<circle cx="6.4" cy="4.35" r="3.1"/><circle cx="16.2" cy="4.35" r="3.1"/>'
   '<circle cx="6.4" cy="14.15" r="3.1"/><circle cx="16.2" cy="14.15" r="3.1"/>'
   '</g>' % S_),
 "codex":   (20.9, 20.5,
   '<circle cx="10.45" cy="10.25" r="9.4"%s stroke-width="1.8"/>'
   '<path d="M6.6 10.25a3.85 3.85 0 017.7 0"%s stroke-width="1.8"/>' % (S_, S_)),
 "book":    (22.3, 18.3,
   '<rect x="1" y=".9" width="5.4" height="16.5" rx="1.6"%s stroke-width="1.8"/>'
   '<rect x="8.5" y=".9" width="5.4" height="16.5" rx="1.6"%s stroke-width="1.8"/>'
   '<path d="M16.6 2.9l3.8 1-3.3 13.4-3.8-1z"%s stroke-width="1.8"/>'
   % (S_, S_, S_)),
 "compose": (19.0, 19.0,
   '<path d="M17.1 10.6v5.4a2.6 2.6 0 01-2.6 2.6H3.6A2.6 2.6 0 011 16V5.1'
   'a2.6 2.6 0 012.6-2.6H9"%s stroke-width="1.9"/>'
   '<path d="M13.7 1.2l4.1 4.1L9.2 13.9l-4.6.5.5-4.6z"%s stroke-width="1.9"/>'
   % (S_, S_)),
 # Two bubbles, 24 x 20.5 with 1 unit = 1pt at the 24 empty state. Each is a
 # 12.9 x 11.7 box with 5.85 corners, so a circle stretched 1.2pt, and one corner
 # pulled out to a point: the arc holds to 35deg on the side and 25deg on the
 # base. The back one stops 1.5pt short of the front one at both ends, round
 # caps. Stroke 2.05: the flats read 2.0 to 2.1 on the capture.
 "chats": (24.0, 20.5,
   '<path d="M1.8 18.6l.9-2.5A5.85 5.85 0 017.45 6.9h1.2a5.85 5.85 0 015.85 5.85'
   'A5.85 5.85 0 018.65 18.6h-1.2a5.85 5.85 0 01-2.45-.55z"%s stroke-width="2.05"/>'
   '<path d="M11.05 3.25a5.85 5.85 0 014.1-1.65h1a5.85 5.85 0 015.85 5.85'
   'a5.85 5.85 0 01-1.1 3.35l1.1 2.5-3.8-.65"%s stroke-width="2.05"/>' % (S_, S_)),
 "sparkle": (14.0, 14.0,
   '<path d="M7 0c.7 4.1 2.2 5.6 6.3 6.3H14v1.4h-.7C9.2 8.4 7.7 9.9 7 14'
   'c-.7-4.1-2.2-5.6-6.3-6.3H0V6.3h.7C4.8 5.6 6.3 4.1 7 0z" fill="currentColor"/>'),
 "phone":   (16.9, 16.5,
   '<path d="M5.1 1.3l2.3 3.5-2 2.1a12 12 0 004.6 4.6l2.1-2 3.5 2.3-.6 2.8'
   'a1.7 1.7 0 01-1.9 1.1C7.3 14.9 2 9.6 1 3.8A1.7 1.7 0 012.1 1.9z"%s'
   ' stroke-width="1.7"/>' % S_),
 "attach":  (17.0, 17.0,
   '<path d="M13.6 8.2l-6.1 6a3.4 3.4 0 01-4.8-4.8l7-6.9a2.3 2.3 0 013.2 3.2'
   'l-6.6 6.6a1.1 1.1 0 01-1.6-1.6l5.9-5.9"%s stroke-width="1.6"/>' % S_),
}


def ico(name, x, y, w=None, col=None, z=None, cls="i"):
    vw, vh, d = ICONS[name]
    w = vw if w is None else w
    return ('<svg class="%s" viewBox="0 0 %g %g" style="left:%.1fpx;top:%.1fpx;'
            'width:%.2fpx;height:%.2fpx%s%s">%s</svg>'
            % (cls, vw, vh, x, y, w, w * vh / vw,
               ";color:%s" % col if col else "", ";z-index:%d" % z if z else "", d))


# --------------------------------------------------------------- screens ----
# The soft halo around every floating control is the one thing here that is
# decoration rather than measurement: the composer's ground reads #F5F4F7 about
# 5pt out from the pill edge and #FBFBFD by 20pt, which is what these two
# shadows put back. Nothing else on these boards is unmeasured.
SH = "box-shadow:0 1px 4px rgba(0,0,0,.05),0 6px 20px rgba(0,0,0,.05)"

SCREEN_CSS = """.t,.b,.i,.a{position:absolute}
.i{display:block;fill:none}
.a{display:block;object-fit:cover}
.t{white-space:nowrap}
.w{white-space:normal}
u{text-underline-offset:2px}"""

# The floating nav is one disc and one pill, both 44 tall from y 59.3. Sampled
# through 16, whose scrim makes the white shapes legible: the disc runs
# 16.5-59.7 across row 81 and 59.3-102.9 down column 38; the right pill runs
# 272.2 to about 372.
NAV_Y, NAV_D = 59.3, 44.0


def circle(x, y, d, style="", inner=""):
    return box(x, y, d, d, "border-radius:50%;" + style, inner=inner)


def navdisc():
    return (circle(16.5, NAV_Y, NAV_D, "background:#FFF;" + SH)
            + ico("menu", 27.6, 75.7, 20.9))


def navpill(icons):
    return (box(272.2, NAV_Y, 100.0, NAV_D, "border-radius:22px;background:#FFF;" + SH)
            + icons)


def navtitle(title, w=95.9):
    return (box(75.7, NAV_Y, w, NAV_D, "border-radius:22px;background:#FFF;" + SH)
            + txc(74.4, title, "t-nav", x=75.7, w=w))


def home_nav(title=None):
    """17-20: menu left, add-people and temporary-chat right, title optional."""
    return (navdisc()
            + navpill(ico("person+", 286.1, 70.0, 21.8)
                      + ico("dashed", 341.3, 70.25, 22.7))
            + (navtitle(title) if title else ""))


def card(x, w, title, sub):
    """One suggestion card. 17 row y690: card1 13.8-176.4, gap to 192.5."""
    return (box(x, 682.6, w, 62.4, "border-radius:var(--x-r-card);background:var(--x-card)")
            + tx(x + 14.7, 695.1, title, "t-card")
            + tx(x + 14.7, 716.5, sub, "t-cards", "var(--x-mute)"))


def composer(place, tail="wave"):
    """17/18/19/20/03: one pill, 30.5-362.5, holding everything."""
    out = (box(30.5, 770.0, 332.0, 47.2,
               "border-radius:23.6px;background:#FFF;" + SH)
           + ico("plus", 51.7, 785.1)
           + tx(84.7, 786.9, place, "t-row", "var(--x-place)")
           + ico("mic", 283.4, 784.2, 15.6, "var(--x-place)"))
    return out + (ico("wave", 321.4, 777.9, 31.64) if tail == "wave"
                  else ico("send", 321.3, 777.5, 31.6))


def composer_b(place):
    """24/25: the plus leaves the pill and becomes its own disc.
    24 row y793: disc 20.1-64.2, gap, pill 72.2-372.9."""
    return (circle(20.1, 773.4, 44.0, "background:#FFF;" + SH)
            + ico("plus", 33.75, 786.9)
            + box(72.2, 773.5, 300.7, 43.7,
                  "border-radius:21.9px;background:#FFF;" + SH)
            + tx(91.8, 789.3, place, "t-row", "var(--x-place)")
            + ico("mic", 299.0, 786.0, 15.6, "var(--x-place)")
            + ico("wave", 335.5, 779.8, 31.2))


def pillbtn(x, y, w, h, label, bg="var(--x-dark)", fg="#FFF", tk="t-btn"):
    return (box(x, y, w, h, "border-radius:var(--x-r-pill);background:%s" % bg)
            + txc(y + h / 2 - TY[tk][0] * 0.7165 / 2, label, tk, fg, x, w))




def screen(title, inner, sb="var(--x-ink)", hm="var(--x-ink)", bg=None, css=""):
    """One phone artboard. No board background: the phone floats on the canvas."""
    return page(NAME + " - " + title,
                '<div class="phone"%s>%s%s%s</div>'
                % (' style="background:%s"' % bg if bg else "",
                   statusbar(sb), inner, home(hm)),
                SCREEN_CSS + css)


# Column x 4-12 -- left of every composer pill and its shadow -- averaged over
# the six boards that carry a fade (03/17/19/20/24/25; 18's carousel card runs
# off the left edge and cannot be read there). The deficit from white is 0 at
# y 670, 2 at 700, 5 at 725, 7 at 765 and 8 from 800 down, so the ramp is not
# linear: it is nearly flat for its first 30pt and again over its last 50.
FADE_STOPS = ("rgba(247,247,247,0) 0%,rgba(247,247,247,.25) 17%,"
              "rgba(247,247,247,.5) 28%,rgba(247,247,247,.75) 50%,"
              "var(--x-fade) 72%,var(--x-fade) 100%")


def fade():
    """The ground under every composer."""
    return box(0, 668, 393, 184,
               "background:linear-gradient(180deg,%s)" % FADE_STOPS)


# ---------------------------------------------------------------- 01-04 ----
def s01():
    return screen("Splash", art("01-mark"))


FEATURES = [
 ("flag", 28.2, 259.4, 24.1, 258.9, 281.6, "Responses can be inaccurate",
  "ChatGPT may provide inaccurate<br>information about people, places, or<br>facts."),
 ("lock", 26.7, 371.2, 27.2, 371.6, 394.3, "Don’t share sensitive info",
  "Chats may be reviewed and used for<br>training. <u style=\"color:var(--x-ink)\">Learn more about your<br>choices</u>"),
 ("gear", 25.70, 483.00, 28.71, 483.9, 506.6, "Control your chat history",
  "Decide whether new chats on this<br>device will appear in your history and<br>"
  "be used to improve our systems."),
]


def s02():
    rows = "".join(
        ico(n, ix, iy, iw)
        + tx(79.3, hy, head, "t-btn")
        + tx(78.9, by, body, "t-body", "var(--x-mute)")
        for n, ix, iy, iw, hy, by, head, body in FEATURES)
    return screen("Welcome",
        tx(24.5, 118.5, "Welcome to ChatGPT", "t-h1")
        + tx(24.5, 176.9, "ChatGPT is a free AI assistant that can help<br>"
             "you with a wide variety of tasks.", "t-body", "var(--x-mute)", lh=21)
        + rows
        + pillbtn(24.1, 697.3, 344.8, 50.4, "Continue")
        + txc(774.0, "By continuing, you agree to our "
              "<span style=\"color:var(--x-sub)\">Terms</span> and have<br>read our "
              "<span style=\"color:var(--x-sub)\">Privacy Policy</span>.",
              "t-cards", "var(--x-legal)", 34.2, 322.6, lh=20))


def s03():
    return screen("Home, signed out",
        navdisc()
        + pillbtn(286.5, 59.7, 88.7, 42.8, "Sign up", "var(--x-fab)")
        + fade()
        + card(13.8, 221.9, "Write a short story", "tailored to my favorite genre")
        + card(249.5, 221.9, "Quiz me on world history", "to enhance my geography")
        + composer("Ask ChatGPT", "send"))


AUTH4 = [(589.9, "Apple", "#FFF", "var(--x-ink)", None),
         (649.7, "Google", "var(--x-dark-2)", "#FFF", None),
         (709.8, "Sign up", "var(--x-dark-2)", "#FFF", "Sign up"),
         (769.5, "Log in", None, "#FFF", "Log in")]


def s04():
    out = (circle(334.2, 85.1, 32.5, "background:var(--x-close)")
           + ico("close-d", 343.5, 94.9, 13.6, "var(--x-ink)")
           + tx(60.6, 298.5, "Let’s brainstorm", "t-wall")
           + circle(302.9, 295.7, 31.6, "background:var(--x-ink)")
           + box(0, 565.9, 393, 286.1,
                 "background:var(--x-dark);border-radius:28px 28px 0 0"))
    for y, label, bg, fg, plain in AUTH4:
        st = ("background:%s" % bg if bg
              else "border:1px solid var(--x-dark-2)")
        out += box(24.5, y, 344.4, 47.5, "border-radius:14px;" + st)
        if plain:
            out += txc(y + 16.55, plain, "t-webbtn", fg, 24.5, 344.4)
        else:
            out += tx(122.1 if label == "Apple" else 120.8, y + 16.55,
                      "Continue with " + label, "t-webbtn", fg)
            out += (art("05-apple", 103.8, y + 16.4, 11.6) if label == "Apple"
                    else art("04-google", 95.6, y + 15.5, 17.6))
    return screen("Auth wall", out, hm="#FFF")


# ---------------------------------------------------------------- 05-12 ----
def webchrome(back=False):
    """Shared across all eight web-view screens: scrim, sheet, mark, close,
    and on the two password screens a back chevron at the same 97.3 centre."""
    return (box(0, 0, 393, 852, "background:var(--x-scrim)")
            + box(0, 59.0, 393, 793,
                  "background:#FFF;border-radius:12px 12px 0 0")
            + art("05-logo")
            + ico("close", 347.6, 90.0, 14.7, "var(--x-ink-web)")
            + (ico("chev", 35.6, 88.2, 10.2, "var(--x-ink-web)") if back else ""))


def field(y, label, value=None, eye=False):
    """The web view's text field: 54.8 tall, 1px #DFDFDF, 12pt corner. Filled,
    it floats a 12px label over the value; empty, it shows the label as a
    placeholder on the field's own centre line.

    The reveal eye does not hold still between those two states: on 07 its ink
    centres on 376.5, the empty field's own centre line, and on 08 -- same box,
    348.9-404.2 on both -- it centres on 383.0, the value line's middle rather
    than the field's. It rides the content, not the container, and the two
    offsets below are those measured centres less the icon's half-height."""
    out = box(24.5, y, 344.4, 54.8,
              "border:1px solid var(--x-field);border-radius:var(--x-r-field)")
    if value is not None:
        out += (tx(37.0, y + 11.9, label, "t-lbl", "var(--x-place)")
                + tx(37.0, y + 29.2, value, "t-web", "var(--x-ink-web)"))
    else:
        out += tx(37.0, y + 21.0, label, "t-web", "var(--x-place)")
    if eye:
        out += ico("eye", 332.0, y + (24.1 if value is not None else 17.6),
                   25.0, "var(--x-ink-web)")
    return out


def webtitle(t, sub=None):
    out = txc(195.6, t, "t-webh", "var(--x-ink-web)")
    return out + (txc(232.1, sub, "t-web", "var(--x-sub-web)", lh=21) if sub else "")


def weblinks():
    """07-10 close with the two legal links; 05/06 use the provider pills and
    11/12 put the same sentence inside the form instead."""
    return txc(796.7, "<u>Terms of Use</u> &nbsp;&middot;&nbsp; <u>Privacy Policy</u>",
               "t-weblegal", "var(--x-sub)")


# tops and height are the darkness centroid of each rule over x 150..250 on 06:
# 514.0/560.95, 573.61/621.68, 634.0/680.97, so 47.0 tall on a 60pt pitch
PROVIDERS = [(514.0, "05-google", 95.3, 15.4, 18.7, 120.8, "Continue with Google"),
             (573.6, "05-apple", 103.8, 16.3, 11.6, 122.1, "Continue with Apple"),
             (634.0, None, 98.9, 15.7, 16.9, 124.3, "Continue with phone")]


def providers():
    out = ""
    for y, cid, mx, dy, mw, lx, label in PROVIDERS:
        out += box(24.5, y, 344.4, 47.0, "border:1px solid var(--x-pill);"
                   "border-radius:var(--x-r-pill)")
        out += (art(cid, mx, y + dy, mw) if cid
                else ico("phone", mx, y + dy, mw, "var(--x-ink-web)"))
        out += tx(lx, y + 16.2, label, "t-webbtn", "var(--x-ink-web)")
    return out


LOGIN_SUB = ("You’ll get smarter responses and can upload<br>"
             "files, images and more.")


def login(value):
    return screen("Log in" + (", email entered" if value else ""),
        webchrome()
        + webtitle("Log in or sign up", LOGIN_SUB)
        + field(301.9, "Email", value)
        + pillbtn(24.5, 381.9, 344.4, 53.4, "Continue",
                  "var(--x-web-btn)", tk="t-webcta")
        # The separator reads as a grey and is not one: its core at the darkest 2%
        # is #131313 against --x-sub's #4F4F4F rendered, so it carries the web
        # view's own ink at 12px. The size is not in doubt -- 8.0 and 5.8 wide on
        # a 9.4 pitch, against my 8.0 and 6.2 on the same 9.4.
        + txc(470.1, "OR", "t-lbl", "var(--x-ink-web)")
        + providers(),
        sb="var(--x-ink-web)", hm="var(--x-ink-web)")


def s05():
    return login(None)


def s06():
    return login(EMAIL)


EMAIL = "alexsmith.mobbin+1@gmail.com"
DOTS = "•" * 12


def account(valid):
    y = 455.8 if valid else 428.6
    return screen("Create account" + (", password valid" if valid else ""),
        webchrome(back=True)
        + webtitle("Create your account", "Set your password for OpenAI to continue")
        + field(280.7, "Email", EMAIL)
        + field(349.1, "Password", DOTS if valid else None, eye=True)
        + (ico("checkc", 25.4, 417.5, 14.6, "var(--x-ink-web)")
           + tx(45.9, 418.5, "Contains 12 characters", "t-lbl", "var(--x-ink-web)")
           if valid else "")
        + pillbtn(24.5, y, 344.4, 53.4, "Continue",
                  "var(--x-web-btn)" if valid else "var(--x-disabled)",
                  tk="t-webcta")
        + weblinks(),
        sb="var(--x-ink-web)", hm="var(--x-ink-web)")


def s07():
    return account(False)


def s08():
    return account(True)


def inbox(code):
    return screen("Check inbox" + (", code entered" if code else ""),
        webchrome()
        + webtitle("Check your inbox",
                   "Enter the verification code we just sent to<br>" + EMAIL + ".")
        + field(301.9, "Code", code)
        + pillbtn(24.5, 381.9, 344.4, 53.4, "Continue",
                  "var(--x-web-btn)", tk="t-webcta")
        + txc(464.3, "Resend email", "t-webact", "var(--x-ink-web)")
        + weblinks(),
        sb="var(--x-ink-web)", hm="var(--x-ink-web)")


def s09():
    return inbox(None)


def s10():
    return inbox("275963")


AGE_LEGAL = ("By tapping “Continue”, you agree to our <u>Terms</u> and have<br>"
             "read our <u>Privacy Policy</u>.")


def age(filled):
    return screen("Age" + (", filled" if filled else ""),
        webchrome()
        + webtitle("How old are you?")
        + field(261.1, "Full name", "Alex Smith" if filled else None)
        + field(329.5, "Age", "31" if filled else None)
        + tx(24.5, 395.7, AGE_LEGAL, "t-weblegal", "var(--x-legal)", lh=17.8)
        + pillbtn(24.5, 450.9, 344.4, 53.4, "Continue",
                  "var(--x-web-btn)" if filled else "var(--x-disabled)",
                  tk="t-webcta"),
        sb="var(--x-ink-web)", hm="var(--x-ink-web)")


def s11():
    return age(False)


def s12():
    return age(True)


# ---------------------------------------------------------------- 13-15 ----
def s13():
    return screen("Notifications",
        txc(111.8, "Stay in the loop", "t-h3")
        + txc(145.3, "Get an alert when ChatGPT completes a task,<br>"
              "has new suggestions, and more.", "t-web", "var(--x-mute)", lh=20.5)
        + box(33.4, 276.0, 326.2, 30.0,
              "border:1px solid var(--x-hair);border-radius:var(--x-r-card);"
              "background:#FFF")
        + box(23.6, 209.6, 345.8, 76.2,
              "border:1px solid var(--x-hair);border-radius:var(--x-r-card);"
              "background:#FFF;" + SH)
        + art("13-appicon")
        + tx(103.4, 228.1, "ChatGPT", "t-webact")
        + tx(102.5, 253.5, "Your weekly news summary is…", "t-row", "var(--x-mute)")
        + pillbtn(24.1, 716.0, 344.8, 48.2, "Turn on notifications",
                  tk="t-webact")
        + txc(787.8, "Maybe later", "t-webact"))


USE_CASES = ["School", "Work", "Personal tasks", "Fun & entertainment", "Other"]


def usecase(selected):
    rows = "".join(
        ico("radio-on" if u == selected else "radio", 33.4, 257.1 + i * 44, 21.4)
        + tx(64.6, 261.1 + i * 44, u, "t-row")
        for i, u in enumerate(USE_CASES))
    return screen("Use case" + (", selected" if selected else ""),
        txc(108.8, "What do you want to use<br>ChatGPT for?", "t-h2", lh=34.2)
        + txc(188.9, "We’ll use this information to suggest ideas you<br>"
              "might find useful.", "t-cards", "var(--x-mute)", lh=19)
        + rows
        + pillbtn(24.1, 767.3, 344.8, 50.3, "Continue"))


def s14():
    return usecase(None)


def s15():
    return usecase("Personal tasks")


# ------------------------------------------------------------- 16-20 home ----
HOME_CARDS = [(13.8, 162.6, "Create an image", "for my presentation"),
              (192.5, 190.7, "ChatGPT starter guide", "with a simple example")]


def home_body(cards=HOME_CARDS, place="Ask ChatGPT", title=None):
    return (home_nav(title) + fade()
            + "".join(card(*c) for c in cards)
            + composer(place))


# The presenting screen behind the sheet is not merely scrimmed, it is also
# flattened, and the capture gives both ends of that map. Its nav pill, white on
# 17, reads #C9C6C9 here where the bare page beside it reads #CFCCCF -- six
# levels apart, on two areas that are the same white underneath. Its menu bars,
# --x-ink as drawn, read #413F42. Dividing both by the scrim leaves white at
# 246.2 and ink at 76.2, a straight line of slope 0.672 through an intercept of
# 74.9, which is what this filter applies. It is sharp, not blurred: the icons
# and the label under it are crisp on the capture, and an earlier blur here was
# only covering for nav icons that were the wrong shape.
DIM = ('<svg width="0" height="0" aria-hidden="true" style="position:absolute">'
       '<filter id="dim" color-interpolation-filters="sRGB">'
       '<feComponentTransfer>'
       '<feFuncR type="linear" slope=".672" intercept=".294"/>'
       '<feFuncG type="linear" slope=".672" intercept=".294"/>'
       '<feFuncB type="linear" slope=".672" intercept=".294"/>'
       '</feComponentTransfer></filter></svg>')


def s16():
    """The sheet's ground is #EFECF0 over a dimmed copy of the home screen.
    We render the home screen, dim it, scrim it, and put an opaque sheet on top:
    the capture's sheet is translucent enough to ghost the cards through, which
    is the one thing on this board we do not reproduce.

    The Upgrade label is composited outside the dim, and the capture is what
    says so: the greys behind the sheet all move together, but its purple does
    not move at all. It reads #4A4691 here against #443C94 on my own render with
    nothing but the scrim between --x-blue and the eye, and putting it through
    the dim as well would land it 36 levels light. Only the pill it sits in is
    dimmed, which is why the box is drawn on one side of the layer and its two
    marks on the other."""
    return screen("Memory announcement",
        DIM
        + '<div style="position:absolute;inset:0;filter:url(#dim)" data-clip-ok>'
        + home_body()
        + box(75.7, NAV_Y, 125.7, NAV_D, "border-radius:22px;background:#FFF;" + SH)
        + "</div>"
        + ico("sparkle", 94.5, 74.0, 14.2, "var(--x-blue)")
        + tx(114.0, 74.4, "Upgrade", "t-nav", "var(--x-blue)")
        + box(0, 0, 393, 852, "background:var(--x-scrim)")
        + box(7.8, 341.7, 377.5, 501.3,
              "background:var(--x-sheet);border-radius:var(--x-r-sheet);"
              "box-shadow:0 18px 50px rgba(0,0,0,.18)")
        # The hero crop runs 341.7-514.4, so it already carries the sheet's
        # grabber and its close button; drawing either again doubles them. The
        # button was drawn over its own crop until the zoom showed it: the
        # capture's circle reads #9499BE against a #BDC6F1 ground, a black .22
        # scrim, and mine read #74798F -- .22 applied twice -- with a white X
        # sitting on top of the capture's own dark one.
        + art("16-hero", w=377.5, z=1)
        # centred on 196.95, not on the sheet: the measured ink box is
        # 97.6-296.3, a quarter-point right of the sheet's own middle
        + txc(542.3, "Introducing new,<br>improved memory", "t-sheeth",
              x=8.2, w=377.5, lh=32.7)
        + txc(613.1, "ChatGPT now remembers your recent chats, so<br>"
              "you won’t need to repeat yourself as often.<br>"
              "Want to change what it knows about you? Just<br>"
              "ask. <span style=\"color:var(--x-ink)\">Learn more</span>",
              "t-sheet", "var(--x-sub)", 33.0, 327.0, lh=20.5)
        + pillbtn(31.2, 712.0, 330.6, 48.6, "Show me", tk="t-sheetbtn")
        + txc(783.8, "Not now", "t-sheetbtn", x=7.8, w=377.5))


def s17():
    return screen("Home, empty", home_body())


CAROUSEL = [(-78.9, 221.9, "Increase the number of items", "in a package"),
            (158.2, 221.9, "Write a short story", "tailored to my favorite genre"),
            (380.1, 221.9, "Quiz me on world history", "to enhance my geography")]


def s18():
    return screen("Home, carousel scrolled", home_body(CAROUSEL))


MENU = [(623.4, 626.0, "image", "Create an image"),
        (673.4, 675.9, "pencil", "Write or edit"),
        (723.4, 725.8, "globe", "Look something up")]


def s19():
    rows = "".join(ico(n, 25.0, iy, 18.7) + tx(66.8, ty, label, "t-row")
                   for iy, ty, n, label in MENU)
    return screen("Composer menu",
        home_nav("ChatGPT") + fade() + rows + composer("Ask anything"))


def s20():
    return screen("Image announcement",
        home_nav("ChatGPT")
        + art("20-tiles")
        + txc(403.2, "The next era of image creation", "t-h3")
        + txc(436.2, "More magic, more control — create<br>"
              "stunning visuals, graphics, and realistic<br>"
              "photos with even more precision.", "t-body", "var(--x-sub)")
        + box(160.7, 518.2, 71.5, 39.0,
              "border-radius:var(--x-r-pill);background:#FFF;" + SH)
        + txc(531.6, "Try it", "t-btn", x=160.7, w=71.5)
        + fade() + composer("Ask anything"))


# ---------------------------------------------------------------- 21-23 ----
ROW_TOP, ROW_PITCH = 135.9, 48.0
EMPTY = "Once you start chatting, your<br>conversations will appear here."


def side_nav(avatar):
    return (tx(25.0, 72.6, "ChatGPT", "t-side")
            + box(284.0, NAV_Y, 91.0, NAV_D,
                  "border-radius:22px;background:#FFF;" + SH)
            + ico("search", 293.2, 70.0, 21.8) + avatar)


# Most of the list is drawn 20.9 wide off x 25, but three marks have their own
# ink box and their own place in it: the folder is 19.1 x 17.2 starting 1.3 in
# and 0.4 down, the photo pair 20.9 x 20.1 starting 0.4 in and 0.8 above the
# row's own top, and the ones with no entry keep the nominal box. The photo's
# -0.8 is worth having: over its own 24 x 24 window it takes the icon from
# 53.7 to 31.4, where the whole board moves by two hundredths.
ICO_BOX = {"folder": (19.1, 1.3, 0.4), "images": (20.9, 0.4, -0.8)}


def siderows(rows, top=ROW_TOP):
    """Icon at x 25, label at x 61, ink 2.1 below the icon's top, 48pt pitch.

    2.1, not the 4.2 first written: 21's three labels put their cap tops at
    138.1, 187.1 and 235.3 against my 140.4, 189.4 and 237.0, a flat 2.1 low on
    all three.  The pitch is 48.0 -- the caps fit 48.6 slightly better, but
    tried on the board that costs 21 a quarter of a level and 22 six tenths,
    because the icons and the rules keep the round number."""
    return "".join(
        (ico(n, 25.0 + ICO_BOX.get(n, (0, 0, 0))[1],
             top + i * ROW_PITCH + ICO_BOX.get(n, (0, 0, 0))[2],
             ICO_BOX.get(n, (20.9,))[0]) if n else "")
        + tx(61.0, top + 2.1 + i * ROW_PITCH, label, "t-row")
        for i, (n, label) in enumerate(rows))


# the column at x310 leaves white 15pt above the pill and comes back to white 19pt
# below it, reading 205 at the top edge and 212 just under the bottom one
FAB_SH = "box-shadow:0 3px 14px rgba(0,0,0,.18),0 8px 26px rgba(0,0,0,.12)"


def fab():
    """Its two pieces are measured off the white inside the pill, which 21 and 22
    agree on to the tenth: the compose mark's ink is 273.6-291.8 x 787.1-805.4,
    and "Chat" runs 307.0-343.5 with its caps topping at 789.8. The gap between
    them is 15.6, not the 8.5 first drawn here."""
    return (box(253.4, 770.6, 110.0, 50.8,
                "border-radius:var(--x-r-pill);background:var(--x-fab);" + FAB_SH)
            + ico("compose", 273.3, 786.8, 18.6, "#FFF")
            + tx(306.5, 789.0, "Chat", "t-btn", "#FFF"))


def s21():
    return screen("Sidebar, empty",
        side_nav(art("21-avatar"))
        + siderows([("folder", "Projects"), ("images", "Images"), ("apps", "Apps")])
        + txc(476.3, EMPTY, "t-body", "var(--x-mute)", 80.2, 232.2)
        + fab())


def s22():
    return screen("Sidebar, avatar loading",
        side_nav(circle(340.4, 66.4, 29.0, "background:var(--x-pill)"))
        + siderows([("folder", "Projects"), ("images", "Images"),
                    ("codex", "Codex"), ("book", "Library"), ("apps", "Apps")])
        + txc(572.6, EMPTY, "t-body", "var(--x-mute)", 80.6, 231.3)
        + fab())


# ink tops off 23, not a pitch: the list runs at 48 down to Vaquita and then
# opens out to about 50.5 for the last three rows
RECENTS = [(490.6, "Cafe Mocha Recipe"), (538.7, "Test Confirmation"),
           (586.4, "Mobbin Logo Identity"), (634.5, "Gestalt Principles Overview"),
           (682.2, "Vaquita Endangered Infographic"), (732.6, "New group chat"),
           (784.3, "Cafe Mocha Recipe"), (833.7, "Café Mocha Recipe")]


def s23():
    recents = "".join(tx(25.0, y, r, "t-row") for y, r in RECENTS)
    return screen("Sidebar, projects and recents",
        side_nav(art("23-avatar"))
        + siderows([("images", "Images"), ("apps", "Apps")])
        + tx(25.0, 244.2, "Projects", "t-btn")
        + ico("folder+", 26.7, 288.3, 19.6) + tx(61.0, 291.2, "New project", "t-row")
        + art("23-recipe") + tx(61.0, 339.3, "Recipe", "t-row")
        + art("23-uiux") + tx(61.0, 387.4, "UI UX", "t-row")
        + tx(25.0, 445.1, "Recents", "t-btn")
        + recents + art("23-grpav")
        + fab())


# ---------------------------------------------------------------- 24-25 ----
TABS = [(24.5, 73.0, 39.2, "Chats"), (98.5, 90.0, 114.5, "Sources")]


def project(active):
    tabs = "".join(
        (box(x, 201.0, w, 32.0, "border-radius:16px;background:var(--x-chip)")
         if label == active else "")
        + tx(lx, 210.3, label, "t-tab",
             None if label == active else "var(--x-tab)")
        for x, w, lx, label in TABS)
    return (navdisc()
            + navpill(ico("share", 283.8, 70.8, 20.5) + ico("dots", 341.8, 78.4, 20.9))
            + art("24-proj") + tx(69.5, 142.6, "UI UX", "t-proj") + tabs)


def s24():
    return screen("Project, chats tab",
        project("Chats")
        + ico("chats", 184.7, 289.0, 24, "var(--x-mute)")
        + txc(322.2, "Project chats will appear here", "t-body", "var(--x-mute)")
        + fade() + composer_b("Message UI UX"))


def s25():
    return screen("Project, sources tab",
        project("Sources")
        + art("25-cluster")
        + txc(342.6, "Give ChatGPT more context", "t-emph")
        + txc(367.6, "Upload Sources, link drives, or<br>"
              "connect apps like Slack to give<br>"
              "ChatGPT deeper context about your<br>project.",
              "t-body", "var(--x-mute)", 30.0, 333.0)
        + pillbtn(164.9, 466.1, 63.2, 40.1, "Add")
        + fade() + composer_b("Message UI UX"))


SCREENS = [
    ("01-splash", "Splash", s01),
    ("02-welcome", "Welcome", s02),
    ("03-home-signed-out", "Home, signed out", s03),
    ("04-auth-wall", "Auth wall", s04),
    ("05-login-sheet", "Log in or sign up", s05),
    ("06-login-email", "Email entered", s06),
    ("07-create-account", "Create account", s07),
    ("08-create-account-valid", "Password valid", s08),
    ("09-check-inbox", "Check inbox", s09),
    ("10-check-inbox-code", "Code entered", s10),
    ("11-age", "How old are you?", s11),
    ("12-age-filled", "Age filled", s12),
    ("13-notifications", "Notifications", s13),
    ("14-use-case", "Use case", s14),
    ("15-use-case-selected", "Use case selected", s15),
    ("16-memory-sheet", "Memory announcement", s16),
    ("17-home-empty", "Home, empty", s17),
    ("18-home-carousel", "Home, carousel", s18),
    ("19-composer-menu", "Composer menu", s19),
    ("20-image-whats-new", "Image announcement", s20),
    ("21-sidebar-empty", "Sidebar, empty", s21),
    ("22-sidebar-loading", "Sidebar, loading", s22),
    ("23-sidebar-full", "Sidebar, full", s23),
    ("24-project-chats", "Project chats", s24),
    ("25-project-sources", "Project sources", s25),
]


# ------------------------------------------------------ tokens + evidence ----
SHEET = """body{padding:0;background:#FFF;color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px 20px 12px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-sub);margin-bottom:10px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-sub);margin:7px 0 4px}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.sw .chip{height:22px;border-radius:5px;border:1px solid var(--x-hair)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-sub);font-style:normal;word-break:break-all}
.foot{display:flex;gap:28px;align-items:flex-start;margin-top:6px}
.foot h2{margin-top:0}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-card);border:1px solid var(--x-hair)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-sub);font-style:normal;text-align:center}
.ty{column-count:2;column-gap:16px}
.tr{break-inside:avoid;padding-bottom:0;margin-bottom:0;
  border-bottom:1px solid var(--x-hair)}
.tr span{display:block;white-space:nowrap;overflow:hidden;line-height:1.05}
.tr em{display:block;font:400 8px/10px ui-monospace,Menlo,monospace;
  color:var(--x-sub);font-style:normal;white-space:nowrap}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink);
  column-count:2;column-gap:18px}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-hair);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-blue)}
td.v{color:var(--x-ink);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-sub)}"""


def _of(group):
    return [x for x in TOKENS if x[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    # One word per row, not a phrase: at 34px a phrase is wider than half the
    # board and the ladder has to run in two columns to fit 24 rows.
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Prototype</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>25 Mobbin captures, 882 &times; 1911 after the watermark trim, '
                '2.2443 px per pt. Two apps in one: 05-12 are an OpenAI web view '
                'on #0D0D0D, the rest is native on #030003 &mdash; and four type '
                'ladders, because the web sizes reach past the sheet into 04 and '
                '13, and 16 is a ladder of its own.</p>'
                '</header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2>'
                '<div class="rad">%s</div></div>'
                '<div><h2>Metrics</h2><div class="met">%s</div></div></div>'
                '<h2>Type</h2><div class="ty">%s</div></div>'
                % (NAME, swatches, radii, met, type_), SHEET)


EV_ROWS = 24


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
.phone img{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-h);display:block}"""


def ref_boards():
    for stem, label, _ in SCREENS:
        f = REFS_DIR / (stem[:2] + ".png")
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone"><img src="%s" alt="%s"></div>' % (uri, label),
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
        rows.append({"title": "Source of truth: Mobbin captures",
                     "numbered": True, "files": refs})
    # The welcome card shows 23: the home boards are white to the composer and
    # read as blank at card size, the sidebar is the one screen with the app on it.
    return {"name": PAGE_NAME, "cover": "23-sidebar-full", "rows": rows}


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
