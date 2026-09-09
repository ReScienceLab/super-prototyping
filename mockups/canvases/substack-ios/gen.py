"""Substack for iOS: seven scroll positions of the home feed, from one generator.

Every board on this canvas is output. Edit this file and re-run; never touch the
HTML.

    python3 mockups/canvases/substack-ios/gen.py

What is drawn and what is cropped is decided once, in crops.json, and the rule
there is the same one chatgpt-ios uses: crop what the capture already contains,
draw only what it does not. There is a third case here, and it is the better
one: fetch. A publication's tile, a person's avatar and a post's cover are that
publisher's own file, pulled off Substack into assets/logos/, assets/avatars/
and assets/photos/ at full resolution and placed here -- the capture holds
215 px of a logo that ships at 1904, 120 px of an avatar that ships at 2477, and
a cover under the scrim the card lays over it. Nine tiles, nine avatars, four
covers and the two document pages screen 4's note attaches are fetched; each of
those folders' SOURCES notes says where every file came from.

Fetching costs score and is still right. A crop is the capture's own pixels put
back where they were cut from, so it scores zero against the capture by
construction and cancels its own misregistration on the way. A real file has to
be placed, sized and resampled, and it lands two or three levels of grey off a
lossy 3x screenshot of the app's own resample -- s5 pays 0.03 for av-5, and the
four covers pay 0.28 of the seven-screen mean between them, the two document
pages another 0.25. Those two are worth being precise about: over a cover the
mean error is 1.3 to 2.2 levels while the signed error is under half a level, so
none of it is tone or placement and all of it is detail finer than the eye reads
at 1x, the difference between the file the publisher uploaded and the bytes
Substack's CDN handed the app. Over the document pages it is 3.78 and 8.94
against signed +0.09 and +2.18 -- same shape, more of it, because those pages
are 4pt type at a 2:1 downscale and no filter, CDN rendition or mipmap chain
beats Lanczos by more than 0.2 (scratch/docrend.py, scratch/docmip.py).
What fetching buys is an asset that is what it claims to be and holds up at any
zoom, which is the point of the exercise; scratch/facefit.py and
scratch/wherefrom.py are what keep the cost honest, fitting each circle and each
cover to the artwork rather than trusting the box crops.json measured off the
feed.

What is left as a crop is what could not be identified or fetched: seven note
avatars whose authors nobody could name, the capture account's own photo (me,
th-4, share-7), one note photo that is a frame of a video, the type block at the
foot of each article card -- type the capture states only as ink, sitting on a
photograph that is fetched and drawn under it -- the "substack" wordmark, and
three publications this repo has not put a name to. The header, the tab bar, the
compose button, the note bodies, the buttons, the rules and every icon are CSS
and inline SVG.

Three things about this feed are worth knowing before reading the code:

The action row under a note reflows. Its four icons are not at four fixed x's --
each icon is followed by its own count, and the next icon starts a fixed gap
after whatever came before it, so a note with 1.3K likes pushes its share icon
70pt further right than a note with 30. It is laid out here as a flex row with
the two measured gaps, not as four columns.

The tab bar is translucent and the feed runs underneath it. Everything the
capture shows through that blur is drawn: the note under the pill on screen 1,
the one under the toast on screen 2, "winnie" at the bottom of screen 7. Where
the blur makes a string genuinely illegible, README.md says so.

Type is placed by ink, not by line box. A capture gives the top row of a line's
ink; CSS wants the top of its line box, and the distance between them depends on
which glyph in the run is tallest -- an i-dot sits higher than an ascender, an
ascender higher than a cap. tx() below closes that gap from a measured table.
"""
import base64
import json
import math
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
LOGO_DIR = OUT / "assets" / "logos"
FACE_DIR = OUT / "assets" / "avatars"
PHOTO_DIR = OUT / "assets" / "photos"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}
SCALE = 3.0                       # capture px per design pt: 1179 / 393

NAME = "Substack iOS"
PAGE_NAME = "(example) " + NAME
P = "s"          # token prefix: --s-bg, --s-ink, --s-t-body

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Every colour is read off assets/refs/cN.png,
# the captures converted from the untagged Display P3 they came out of Mobbin in
# to sRGB (scratch/srgb.py); reading them off the raw file would put every hue
# about 8% out. Every length is in design pt at 3 capture px to the pt.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "system stack; sizes solved against a real Chrome render, scratch/fit.py"),

 ("Surface", "bg",     "#FFFFFF", "flat-fill census, feed background, all seven"),
 ("Surface", "card",   "#FDFDFD", "flat-fill census, the Keep reading toast, c2"),
 ("Surface", "fill",   "#EFEFEF", "flat-fill census, Stats pill c4 and the note band c1"),
 ("Surface", "tint",   "rgba(0,0,0,.075)",
  "the selected tab's oval darkens its material by 18/255 over white (c1 #ECECEC) "
  "and by 25 over a photo (c6): a scrim, not a fill"),
 ("Surface", "glass",  "rgba(255,255,255,.66)",
  "solved from the tab pill over white (c1 #FEFEFE) and over a photo (c6 #C3B8A9); "
  "saturate(3) is a sweep, not a solve -- see README"),
 ("Surface", "peach",  "#FEDFC3", "flat-fill census, Share pill c4 and Share now c7"),
 ("Surface", "grad-a", "#FDFDFD", "refkit scan col, top of the share-profile ground, c7 y124"),
 ("Surface", "grad-b", "#E7E7E7", "refkit scan col, foot of the same ground, c7 y388"),
 ("Surface", "band",   "#D6D6D6", "flat-fill census, the 4pt band under it, c7 y388..392"),

 ("Line", "hairline",  "#C7C7C7", "one device row under the tile labels, c1 y233"),
 ("Line", "border",    "#DDDDDD", "refkit scan col through the just-published card edge, c4 y136.7"),

 ("Ink", "ink",        "#373737", "mode of the ink core, Share your profile 21.5/600, c7"),
 ("Ink", "ink-2",      "#787878", "mode of the ink core, the help line under it, c7"),
 ("Ink", "ink-inv",    "#FFFFFF", "mode of the ink core, Follow on the accent fill, c6"),
 ("Ink", "link",       "#097FC6", "ink core of week.wild.plus/athens-26, c1 y353"),

 ("Accent", "accent",  "#FF5800", "flat-fill census, the compose button, c1"),
 ("Accent", "live",    "#FF4850", "flat-fill census, the LIVE pill on c3 x38.67..65.33"),

 ("Radius", "r-card",  "12px",  "inset profile of the card corner, c4 / c1 photo / c7 button"),
 ("Radius", "r-tile",  "8px",   "inset profile of the people-card corner, c6"),
 ("Radius", "r-pill",  "999px", "by construction, not measured"),
 ("Radius", "r-phone", "52px",  "circular stand-in for the 55pt continuous display corner"),

 ("Type", "t-body",  "400 15px/20px var(--x-font)",     "fit 15.00, note body, c1 line 1"),
 ("Type", "t-name",  "600 15px/20px var(--x-font)",     "fit 15.00, Evangeline, c1"),
 ("Type", "t-toast", "700 14.5px/19.33px var(--x-font)","fit 14.50 at 700 on the toast title, c2"),
 ("Type", "t-meta",  "400 10.5px/14px var(--x-font)",   "refkit bands on May 19, c1"),
 ("Type", "t-sub",   "500 10.5px/14px var(--x-font)",   "refkit bands on Subscribe, c1"),
 ("Type", "t-tile",  "400 11px/14px var(--x-font)",     "fit 11.00, Big Think c1, Just published c4, the people-card sub c6"),
 ("Type", "t-badge", "600 11.5px/14px var(--x-font)",   "8.3pt of digit height in the bell badge, c5"),
 ("Type", "t-live",  "700 9px/12px var(--x-font)",      "fit 9.00 on 6.33pt of cap height, the LIVE pill c3 y191..197.33"),
 ("Type", "t-small", "400 13px/17px var(--x-font)",     "fit 13.00, Ileana liked and the counts, c1"),
 ("Type", "t-label", "600 13px/17px var(--x-font)",     "fit 13.00, The Hidden Cost of, c4"),
 ("Type", "t-pub",   "700 13px/17px var(--x-font)",     "fit 13.00 at 700 on three names, c5/c6"),
 ("Type", "t-help",  "400 14px/19px var(--x-font)",     "fit 14.00, the share help line, c7"),
 ("Type", "t-btn",   "500 14px/19px var(--x-font)",     "fit 14.00, Share now, c7"),
 ("Type", "t-head",  "600 20.5px/25px var(--x-font)",   "fit 20.50, People to follow, c6"),
 ("Type", "t-share", "600 21.5px/26px var(--x-font)",   "fit 21.50, Share your profile, c7"),
 ("Type", "t-time",  "590 16.75px/22px var(--x-font)",  "iOS status bar clock"),

 ("Metrics", "w",      "393px", "iPhone 15/16 logical width"),
 ("Metrics", "h",      "852px", "iPhone 15/16 logical height"),
 ("Metrics", "status", "54px",  "iOS status bar, Dynamic Island devices"),
 ("Metrics", "gutter", "16px",  "refkit scan row, left ink edge of every body line"),
 ("Metrics", "avatar", "40px",  "refkit bbox on a note avatar, c1 y272.67"),
 ("Metrics", "tab",    "62.33px", "refkit scan col through the pill on c6, y768..831"),
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

# size, line-height and weight of every type token, parsed from the token itself
# so a face used by tx() can never disagree with the face the CSS sets.
TY = {n: (float(v.split()[1].split("/")[0][:-2]),
          float(v.split()[1].split("/")[1][:-2]),
          int(v.split()[0]))
      for g, n, v, _ in TOKENS if g == "Type"}

# ------------------------------------------------------------ phone frame ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

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


def statusbar(colour="var(--x-ink)", time="9:41"):
    return ('<div class="sb" style="color:%s"><div class="island"></div>'
            '<div class="time">%s</div>%s</div>' % (colour, time, SB_ICONS))


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
    print("%-26s %8d" % (name, len(html)))


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:var(--x-t-label);margin-bottom:2px}
header p{font:var(--x-t-small);color:var(--x-ink-2);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-2);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-border)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-fill);border:1px solid var(--x-border)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-2);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid var(--x-hairline)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-2);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-hairline);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-accent)}
td.v{color:var(--x-ink-2);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-ink-2)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Grumpy wizards</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Read off seven captures of the home feed at 3 capture px to '
                'the design pt. Colour comes from the sRGB conversions, never the '
                'untagged P3 originals.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, type_, met), SHEET)


EV_ROWS = 40


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


# ------------------------------------------------------------------ art ----
def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return
    from PIL import Image                                    # noqa: local dep
    ART_DIR.mkdir(parents=True, exist_ok=True)
    src, n = {}, 0
    for cid, (ref, x0, y0, x1, y1) in CROPS.items():
        f = REFS_DIR / ("c" + ref + ".png")
        if not f.exists():
            continue
        if ref not in src:
            src[ref] = Image.open(f).convert("RGB")
        box = tuple(round(v * SCALE) for v in (x0, y0, x1, y1))
        src[ref].crop(box).save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-26s %8d crops" % ("assets/art/", n))


# A publication tile is that publication's own logo in an iOS squircle. The
# shape is a superellipse, |x|^n + |y|^n = 1. A tile on the white feed is the
# only ink in its column, so the .5 crossing of its coverage is its own edge:
# scratch/tilebox.py reads 71.83pt across six flat-fill tiles, and
# scratch/sqfit.py sweeps the exponent against that alpha -- 2.80 (mean |d| 4.2
# of 255) against 4.6 at 2.66 and 18.9 for the best plain rounded rect, which is
# what rules a circular corner out. The logos are the publications' own files,
# pulled from Substack by scratch/logos.py, not cut out of the capture: the
# capture has 215px of a tile whose source file ships at up to 1904.
#
# 72, not the 71.83 those crossings average: a tile is a bitmap and the raster
# gives it whole device pixels, so the size that matters is the one it lands on.
# scratch/logofit.py cuts each of the eight identified flat tiles at 215 and at
# 216 device px and differences both against the capture -- 216 wins on every
# single logo, 8.35 mean |d| down to 5.55, because a third of a pixel of scale
# is a third of a pixel of misregistration everywhere inside the mask.
TILE = 72.0
TILE_N = 2.80


def _squircle(px, ss=4):
    """The tile's alpha mask, drawn at ss x and boxed down for the edge."""
    from PIL import Image, ImageDraw                        # noqa: local dep
    k = px * ss
    r = k / 2.0
    pts = []
    for i in range(720):
        a = math.pi * i / 360.0
        c, s = math.cos(a), math.sin(a)
        pts.append((r + math.copysign(abs(c) ** (2.0 / TILE_N), c) * r,
                    r + math.copysign(abs(s) ** (2.0 / TILE_N), s) * r))
    m = Image.new("L", (k, k), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.resize((px, px), Image.LANCZOS)


def tilecut():
    """Mask every publication logo into the tile squircle, at capture scale."""
    if not LOGO_DIR.exists():
        return
    from PIL import Image                                    # noqa: local dep
    ART_DIR.mkdir(parents=True, exist_ok=True)
    px = round(TILE * SCALE)
    mask, n = _squircle(px), 0
    for f in sorted(LOGO_DIR.glob("*.png")):
        im = Image.open(f).convert("RGB")
        s = min(im.size)                                     # centre square
        im = im.crop(((im.width - s) // 2, (im.height - s) // 2,
                      (im.width + s) // 2, (im.height + s) // 2))
        im = im.resize((px, px), Image.LANCZOS)
        im.putalpha(mask)
        im.save(ART_DIR / ("tile-" + f.stem + ".png"), optimize=True)
        n += 1
    print("%-26s %8d tiles" % ("assets/art/tile-*", n))


# An avatar is a person's or a publication's own picture, fetched from Substack
# into assets/avatars/ and named in that folder's SOURCES.md -- only the circle
# around it is ours. Each is cut at the size its own board draws it, a note's
# author at 40pt and a People-to-follow card's at 105, so nothing is resampled
# twice on the way to the screen.
_FACES = {}


def _facecut(f, px):
    """That picture's centre square, under a circle, at px across."""
    from PIL import Image, ImageDraw                        # noqa: local dep
    cid = "face-%s-%d" % (f.stem, px)
    out = ART_DIR / (cid + ".png")
    if cid not in _FACES:
        ART_DIR.mkdir(parents=True, exist_ok=True)
        k = px * 4
        mask = Image.new("L", (k, k), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, k - 1, k - 1), fill=255)
        im = Image.open(f).convert("RGB")
        d = min(im.size)
        im = im.resize((px, px), Image.LANCZOS,
                       box=((im.width - d) / 2, (im.height - d) / 2,
                            (im.width + d) / 2, (im.height + d) / 2))
        im.putalpha(mask.resize((px, px), Image.LANCZOS))
        im.save(out, optimize=True)
        _FACES[cid] = True
    return cid


def face(cid, x, y, size=40.0):
    """One avatar. Still a crop where the person could not be identified.

    Snapped to whole device pixels for the same reason a tile is: the raster
    floors an image box, so a box asking for a fraction gets a hard edge a
    fraction early instead of the capture's soft one."""
    f = FACE_DIR / (cid + ".png")
    if not f.exists():
        return art(cid)                     # nobody found: back on its own box
    px = round(size * SCALE)
    return ('<img class="a" src="%s" alt="%s" style="left:%.2fpx;top:%.2fpx;'
            'width:%.2fpx;height:%.2fpx">'
            % (_uri(_facecut(f, px)), cid, round(x * SCALE) / SCALE,
               round(y * SCALE) / SCALE, px / SCALE, px / SCALE))


# A card is a photograph with a card drawn on top of it, and the photograph is
# the publisher's own file in assets/photos/, not a crop. Three numbers place
# it, and all three are measured rather than assumed.
#
# The scale is not in doubt: scratch/wherefrom.py looks for a patch of the
# capture in the file at every plausible size, and on all four cards the answer
# is the card's own 361pt across, to the device pixel. Which row of the file the
# card's top corner lands on is a different number every time -- 16 on one, 171
# on another -- so Substack is keeping a crop per post and there is no rule to
# find, only a measurement to take.
#
# Under the photograph the app puts a flat ground and over it a linear ramp to
# that same colour. scratch/scrim.py pairs every pixel of the capture with the
# pixel of the file beneath it and solves capture = photo*(1-a) + ground*a,
# dropping the pixels that turn out to be type or a button. Fit each card on its
# own and the four ramps land within 2pt of each other, so they are one ramp and
# it is fitted once across all four; only the ground is per card, and it is not
# the file's average, its median or any darkening of either -- card-5's file
# averages white and its card is navy. That is a colour Substack picked, not one
# computed here.
SCRIM = (0.12, 180.85)                       # clear at the card's corner, solid
COVERS = {          # card box, the file row under its top corner, the ground
    "card-2":  ((16.0, 374.67, 361.0, 284.66), 171, "#493E2C"),
    "card-5":  ((16.0, 209.33, 361.0, 284.34), 33, "#1A4C68"),
    "card-7":  ((16.0, 485.33, 361.0, 283.67), 33, "#212524"),
    "photo-6": ((16.0, 607.67, 361.0, 244.33), 16, "#4F3E26"),
}


def _covercut(f, w, dy, h, vw=None, pre="cover-"):
    """The file at w device px across, from row dy, as far as it reaches.

    Cut rather than clipped in CSS: a data: URI of the 3840px original would be
    most of a board's weight for pixels no screen ever shows, and half these
    files run out before the card's foot anyway. vw cuts the width the same
    way, for the document page that runs off the right edge of the screen."""
    from PIL import Image                                    # noqa: local dep
    cid = pre + f.stem
    if cid not in _FACES:
        ART_DIR.mkdir(parents=True, exist_ok=True)
        im = Image.open(f).convert("RGB")
        fh = round(w * im.height / im.width)
        (im.resize((w, fh), Image.LANCZOS)
           .crop((0, dy, vw or w, min(dy + h, fh)))
           .save(ART_DIR / (cid + ".png"), optimize=True))
        _FACES[cid] = True
    return cid, min(h, round(w * Image.open(f).height / Image.open(f).width) - dy)


def cover(cid):
    """One card's picture: the ground, the publisher's file, the ramp over it.

    Three flat elements and no wrapper, because the boards are one absolutely
    positioned layer and a clip would need a box that owns the others. The file
    is cut to the window instead, so the ramp's own rounded corners are the only
    ones the card needs -- where the picture stops short of the foot, the ramp
    is already solid there and the ground is what shows."""
    (x, y, w, h), dy, ground = COVERS[cid]
    r0, r1 = SCRIM
    f = PHOTO_DIR / (cid + ".png")
    if not f.exists():
        return art(cid)
    rad = "border-radius:var(--x-r-card)"
    cut, ch = _covercut(f, round(w * SCALE), dy, round(h * SCALE))
    clear = "rgba(%d,%d,%d,0)" % tuple(int(ground[i:i + 2], 16)
                                       for i in (1, 3, 5))
    return (box(x, y, w, h, "%s;background:%s" % (rad, ground))
            + '<img class="a" src="%s" alt="%s" style="left:%.2fpx;top:%.2fpx;'
              'width:%.2fpx;height:%.2fpx;%s">'
              % (_uri(cut), cid, x, y, w, ch / SCALE, rad)
            + box(x, y, w, h, "%s;background:linear-gradient(%s %.2fpx,%s %.2fpx)"
                  % (rad, clear, r0, ground, r1)))


# The note on screen 4 attaches five pages of a document and the feed lays the
# first two out in a carousel 300pt tall. Each page keeps its own aspect, so the
# width is a consequence rather than a token: 1241x1754 at 900 device px tall is
# 636.8 across and the raster lands it on 637. scratch/docfit.py finds both
# pages at exactly that size with their own first row on the box below, so
# nothing here is cropped or centred -- the page is simply drawn whole, and the
# second one runs off the right edge of the screen.
DOCS = {          # the box in device px -- left, top, width, height -- and how
    "doc-4a": (48, 1518, 637, 900, 637),          # much of the width is on screen
    "doc-4b": (709, 1518, 637, 900, 470),
}


def doc(cid):
    """One page of the note's attached document, at the carousel's height.

    Kept in device px and divided down rather than written in pt, because the
    width is not a token: it is 900 device px tall at the file's own 1241x1754,
    which is 637 across, and 637/3 has no two-decimal spelling. scratch/docfit.py
    finds both pages at exactly that size with their own first row on the box
    below, so nothing here is cropped or centred -- the page is drawn whole, and
    the second one runs off the right edge of the screen.

    Not lifted above wash() the way a crop is: the scroll edge really does fade
    this page into the tab bar, and a drawn page has no fade of its own to
    double. The page that runs off the screen keeps only its left corners --
    the raster clips the rest, and a radius there would round a cut edge."""
    x, y, w, h, vis = DOCS[cid]
    f = PHOTO_DIR / (cid + ".jpeg")
    if not f.exists():
        return art(cid)
    r = "var(--x-r-card)"
    cut, _ = _covercut(f, w, 0, h, vis, "page-")
    return ('<img class="a" src="%s" alt="%s" style="left:%.4fpx;top:%.4fpx;'
            'width:%.4fpx;height:%.4fpx;border-radius:%s">'
            % (_uri(cut), cid, x / SCALE, y / SCALE, vis / SCALE, h / SCALE,
               r if vis == w else "%s 0 0 %s" % (r, r)))


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def art(cid, x=None, y=None, extra=""):
    """One crop, back at the box it was measured at unless moved deliberately.

    A crop whose foot reaches into the scroll-edge ramp already carries the
    capture's own fade, so it is lifted clear of wash()."""
    _, x0, y0, x1, y1 = CROPS[cid]
    top = y0 if y is None else y
    return ('<img class="a" src="%s" alt="%s" style="left:%.2fpx;top:%.2fpx;'
            'width:%.2fpx;height:%.2fpx%s%s">'
            % (_uri(cid), cid, x0 if x is None else x, top, x1 - x0, y1 - y0,
               ";z-index:2" if top + y1 - y0 > WASH_TOP else "", extra))


# ----------------------------------------------------------------- type ----
# Where a run's ink starts, in em above the middle of its line box. Measured by
# rendering real strings at 10.5 - 20.5 px (scratch/calib2.py): SF Pro Text puts
# an i-dot above an ascender, an ascender above a cap, and a round cap a hair
# above a flat one, so the constant is a property of the string, not the size. A
# run is placed by its tallest glyph because that is what a capture's row band
# reports. Weight 600 and up rides about .012 em higher again.
KLASS = [("ij", .382), ("bdfhkl‘’“”", .372),
         ("CGOQS023456789", .353), ("ABDEFHIJKLMNPRTUVWXYZ1", .341), ("t", .297)]
KX = .170                                    # x-height letters and punctuation
TAG = re.compile(r"<[^>]*>")


def kink(s, weight):
    k = 0.0
    for ch in TAG.sub("", s):
        if ch.isspace():
            continue
        for chars, v in KLASS:
            if ch in chars:
                k = max(k, v)
                break
        else:
            k = max(k, KX)
    return k + (.012 if weight >= 600 else 0)


def boxtop(ink_top, tk, s, lh=None):
    size, dlh, weight = TY[tk]
    lh = dlh if lh is None else lh
    return ink_top - lh / 2 + kink(s, weight) * size


def tx(x, ink_top, s, tk="t-body", col=None, extra="", lh=None):
    """A run of type placed by the top of its ink, the way a capture reports it."""
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;font:var(--x-%s)%s%s%s">%s</div>'
            % (x, boxtop(ink_top, tk, s, lh), tk,
               ";line-height:%.2fpx" % lh if lh else "",
               ";color:%s" % col if col else "", extra, s))


def txc(x, w, ink_top, s, tk="t-body", col=None, lh=None):
    """Centred in a box of known width, and free to wrap: the sub line on a
    people card is two lines when the publication has a long name."""
    return tx(x, ink_top, s, tk, col,
              ";width:%.2fpx;text-align:center;white-space:normal" % w, lh)


def box(x, y, w, h, style=""):
    return ('<div class="b" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;'
            'height:%.2fpx;%s"></div>' % (x, y, w, h, style))


def svg(w, h, inner, extra="", x=None, y=None, z=None):
    """Absolute when given a point, in flow when not: the action row is a flex."""
    return ('<svg class="%s" style="%swidth:%.2fpx;height:%.2fpx%s" '
            'viewBox="0 0 %.2f %.2f"%s>%s</svg>'
            % ("i" if x is not None else "fi",
               "left:%.2fpx;top:%.2fpx;" % (x, y) if x is not None else "",
               w, h, ";z-index:%d" % z if z else "", w, h, extra, inner))


def sk(w, h, d, sw=1.7, col="currentColor", x=None, y=None, z=None):
    return svg(w, h, '<path d="%s"/>' % d,
               ' fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round"'
               ' stroke-linejoin="round"' % (col, sw), x, y, z)


# ---------------------------------------------------------------- chrome ----
# The header is the same 54pt band on every screen: the wordmark in a 44pt hit
# area at the left inset, the reader's own avatar at the right. On a scrolled
# screen the wordmark gains a white disc, and iOS's scroll-edge blur runs over
# whatever the feed had reached -- so `behind` is that feed content, still drawn,
# and the blur is a real backdrop-filter over it rather than a picture of one.
HDR_DISC = (37.83, 80.83, 43.67)      # centre and diameter, all three captures


def header(under=""):
    if not under:
        return art("logo") + art("me")
    disc = box(HDR_DISC[0] - HDR_DISC[2] / 2, HDR_DISC[1] - HDR_DISC[2] / 2,
               HDR_DISC[2], HDR_DISC[2], "background:#FFF;border-radius:50%")
    return under + hdrglass() + disc + art("logo") + art("me")


# A scrolled header is not a photograph of a blur. It is the tail of the note
# the feed has just passed, still there, seen through the blur -- and a Gaussian
# spreads ink without moving it, so scratch/actrow.py reads that tail straight
# back off the capture: every icon keeps its centre of mass, so the action row's
# y, the gaps its counts push open and the separator under it are all measurable
# to a third of a point. The one thing that is not is the heart count, which the
# disc covers; its string is a stand-in fitted to the gap it holds open.
def behind(card_bot, act_y, counts, band_y, card, edge=16.0):
    return (box(16, -40, 361, card_bot + 40,
                "background:%s;border-radius:0 0 %.2fpx %.2fpx" % (card, edge, edge))
            + actions(act_y, counts)
            + box(0, band_y, 393, 4, "background:var(--x-band)"))


# The blur itself, fitted rather than guessed: scratch/edge.py shoots the band
# with the glass off and solves blur_s(mine)*(1-a) + 255a = ref one row at a
# time, sweeping s and least-squaring a. Over y70..126 that reads s = 4.5pt and
# a = .50, flat -- iOS ramps this effect on some surfaces, but here one radius
# fits the whole band, and the separator at its foot is soft because 4.5pt is
# already enough to soften a 4pt bar. It stops at 128: the solve puts a at 0
# from 128 down.
HDR_H, HDR_BLUR, HDR_TINT = 128.0, 4.5, 0.50


def hdrglass():
    """iOS's scroll-edge effect: one backdrop-filter, faded out at its foot."""
    fade = "linear-gradient(#000 78%,rgba(0,0,0,0))"
    return (box(0, 0, 393, HDR_H,
                "backdrop-filter:blur(%.2fpx);-webkit-backdrop-filter:blur(%.2fpx);"
                "-webkit-mask-image:%s;mask-image:%s" % (HDR_BLUR, HDR_BLUR, fade, fade))
            + box(0, 0, 393, HDR_H,
                  "background:linear-gradient(rgba(255,255,255,%.2f) 78%%,"
                  "rgba(255,255,255,0))" % HDR_TINT))


def divider(y):
    return box(0, y, 393, 0.34, "background:var(--x-hairline)")


def band(y):
    """The 4pt separator between one note and the next."""
    return box(0, y, 393, 4, "background:var(--x-fill)")


# A tile's left edge sits 36.26pt left of the centre its label is set on --
# scratch/tilebox.py, again off the .5 crossing. The label is the fitted number,
# so it stays the anchor and the tile hangs off it.
TILE_DX = 36.26


def tile(slug, x, y):
    return ('<img class="a" src="%s" alt="%s" style="left:%.2fpx;top:%.2fpx;'
            'width:%.2fpx;height:%.2fpx">'
            % (_uri("tile-" + slug), slug, x, y, TILE, TILE))


def _sqpath(size, seg=48):
    """The tile squircle as one SVG path, so CSS never has to approximate it.

    border-radius draws an ellipse quadrant and a superellipse is not one, which
    is the whole reason the mask is rasterised rather than styled."""
    r = size / 2.0
    d = []
    for i in range(seg * 4 + 1):
        t = math.pi * i / (seg * 2.0)
        c, sn = math.cos(t), math.sin(t)
        d.append("%s%.2f %.2f" % ("M" if i == 0 else "L",
                                  r + math.copysign(abs(c) ** (2.0 / TILE_N), c) * r,
                                  r + math.copysign(abs(sn) ** (2.0 / TILE_N), sn) * r))
    return " ".join(d) + "Z"


def seeall(x, y):
    """The row's last tile is a control, not a publication: nine dots on fill."""
    d, g = 5.33, 2.17
    o = (TILE - 20.33) / 2
    dots = "".join(
        '<circle cx="%.2f" cy="%.2f" r="%.2f"/>'
        % (o + d / 2 + (d + g) * c, 25.5 + d / 2 + (d + g) * r, d / 2)
        for r in range(3) for c in range(3))
    return svg(TILE, TILE,
               '<path d="%s" fill="var(--x-fill)"/>' % _sqpath(TILE)
               + '<g fill="#383838">%s</g>' % dots, "", x, y)


def tiledot(x, y):
    """A publication with something unread wears a 14pt dot at its top right."""
    return box(x + TILE - 14.67, y + 1.33, 14, 14,
               "background:var(--x-accent);border-radius:50%")


# The pill a publication wears while it is broadcasting: 26.67 x 12pt at
# x38.67 y188 on c3, so 22.76 and 63.06 in from its tile's own corner. The
# white ring is what lets it read on a logo of any colour.
def livebadge(x, y):
    return ('<div class="live" style="left:%.2fpx;top:%.2fpx">LIVE</div>'
            % (x + 22.76, y + 63.06))


def tiles(slugs, labels, ink_top, first=52.17, pitch=88.0, top=124.94,
          dots=(), live=()):
    """One publication row.

    Each tile is that publication's own logo, masked into the squircle -- the
    capture has 215px of a file that ships at up to 1904. Only the labels, the
    unread dots and the See all control are ours. Three publications resisted
    identification; those tiles are still crops, and crops.json names them."""
    out = []
    # A tile is a bitmap, and the raster floors an image box to a whole device
    # pixel: at 3x every tile's left lands on .73 of one, so the browser drops it
    # a quarter point left of where TILE_DX puts it and its edge comes out hard
    # where the capture's is a ramp. Snapping to the nearest device pixel instead
    # of the one below costs .09pt and buys back a third of the tile row's error
    # -- scratch/tilefit.py before and after.
    top = round(top * SCALE) / SCALE
    for i, slug in enumerate(slugs):
        x = round((first + pitch * i - TILE_DX) * SCALE) / SCALE
        if slug == "see-all":
            out.append(seeall(x, top))
        elif "tile-" + slug in CROPS:      # a publication still unidentified
            # max(x, 0): the one clipped tile was cut at the screen edge, so
            # its crop starts there rather than at the tile's own left.
            out.append(art("tile-" + slug, max(x, 0.0), top))
        else:
            out.append(tile(slug, x, top))
        if i in dots:
            out.append(tiledot(x, top))
        if i in live:
            out.append(livebadge(x, top))
    return "".join(out) + "".join(
        txc(first + pitch * i - 44, 88, ink_top, s, "t-tile")
        for i, s in enumerate(labels) if s)


I_CLOCK = ("M6 1.2A4.8 4.8 0 1 0 6 10.8A4.8 4.8 0 1 0 6 1.2Z M6 3.3V6L7.9 7.2")


def clock_row(y, s="From the archives"):
    return (svg(12, 12, '<circle cx="6" cy="6" r="6"/>'
                        '<path d="M6 3.1V6.2L8 7.5" fill="none" stroke="#FFF"'
                        ' stroke-width="1.3" stroke-linecap="round"/>',
                ' fill="var(--x-ink-2)"', 16, y)
            + tx(34, y + 0.84, s, "t-small", "var(--x-ink-2)"))


# Feed action icons, at the ink boxes refkit bbox reports for them.
def i_heart(filled=False, col="var(--x-ink-2)"):
    d = ("M9.67 16.4C9.67 16.4 1.15 11.3 1.15 5.85C1.15 3.25 3.2 1.15 5.72 1.15"
         "C7.4 1.15 8.95 2.1 9.67 3.5C10.39 2.1 11.94 1.15 13.62 1.15"
         "C16.14 1.15 18.18 3.25 18.18 5.85C18.18 11.3 9.67 16.4 9.67 16.4Z")
    if filled:
        return svg(19.33, 17.67, '<path d="%s"/>' % d, ' fill="%s"' % col)
    return sk(19.33, 17.67, d, 1.6, col)


def i_comment(col="var(--x-ink-2)"):
    return sk(19.33, 18.33,
              "M4.2 1.15H15.13A3.05 3.05 0 0 1 18.18 4.2V10.6A3.05 3.05 0 0 1 15.13 13.65"
              "H6.6L2.6 17.1V13.6A3.05 3.05 0 0 1 1.15 10.9V4.2A3.05 3.05 0 0 1 4.2 1.15Z",
              1.6, col)


def i_restack(col="var(--x-ink-2)"):
    """Two curved arrows closing a circle: Substack's restack glyph."""
    return sk(18.67, 16.67,
              "M2.6 6.6A6.9 6.9 0 0 1 15.4 4.6 M16.07 10.07A6.9 6.9 0 0 1 3.27 12.07"
              " M1.2 2.5V6.7H5.4 M17.47 13.9V9.7H13.27", 1.6, col)


def i_share(col="var(--x-ink-2)"):
    return sk(17.67, 17,
              "M8.83 11.3V1.2 M5.2 4.8L8.83 1.2L12.47 4.8"
              " M2.1 7.6V14.2A1.6 1.6 0 0 0 3.7 15.8H13.97A1.6 1.6 0 0 0 15.57 14.2V7.6",
              1.6, col)


ICONS = {"heart": i_heart, "comment": i_comment, "restack": i_restack,
         "share": i_share}
# Measured on c1, c2, c3 and c5: an icon is followed by its count 6.8pt later,
# and the next icon starts 29.0pt after whatever the last item ended on.
ACT_GAP, ACT_INNER, ACT_LEFT = 29.0, 6.8, 16.33


def actions(y, counts):
    """The like / comment / restack / share row. It reflows: see the module note."""
    size, lh, weight = TY["t-small"]
    dy = 3.67 - lh / 2 + kink("0", weight) * size
    cells = []
    for key, n in zip(("heart", "comment", "restack", "share"), counts):
        c = ('<div class="c" style="margin-top:%.2fpx">%s</div>' % (dy, n)) if n else ""
        cells.append("<span>%s%s</span>" % (ICONS[key](), c))
    return ('<div class="act" style="top:%.2fpx">%s</div>'
            % (y, "".join(cells)))


def attribution(y, who):
    return (svg(12, 11.33, '<path d="M6 10.5C6 10.5 .7 7.3 .7 3.9C.7 2.3 1.97 1 3.53 1'
                           'C4.57 1 5.53 1.6 6 2.47C6.47 1.6 7.43 1 8.47 1'
                           'C10.03 1 11.3 2.3 11.3 3.9C11.3 7.3 6 10.5 6 10.5Z"/>',
                ' fill="var(--x-ink-2)"', 16, y)
            + tx(34.3, y + 0.67, who, "t-small", "var(--x-ink-2)"))


CHECK_VA = {15: -3.84, 13: -3.3}


def check(size=15, cid="check", va=None, ml=4.19):
    """The paid badge after a name. A note author's is the filled rosette; a
    people card's is the same shape drawn as an outline, so it is its own crop."""
    _, x0, y0, x1, y1 = CROPS[cid]
    d = (x1 - x0) * size / 15.0
    return ('<img class="ck" src="%s" alt="verified" style="width:%.2fpx;'
            'height:%.2fpx;margin-left:%.2fpx;vertical-align:%.2fpx">'
            % (_uri(cid), d, d, ml, CHECK_VA[size] if va is None else va))


def note(y, av, name, meta, mark="tag", ticked=False, dy=0.0, ay=0.0):
    """One note's header block, anchored on the top of its 40pt avatar.

    `dy` moves the two type rows only. The avatar is a crop and sits on its
    measured box; the name beside it is not always the same distance below
    that box, and scratch/shift.py reads the difference off each note.

    `ay` moves the avatar only, and exists because a fetched file is not a
    crop. A crop cancels its own misregistration -- cut at the box and pasted
    back at the box, a third of a point of error goes back where it came from.
    Draw the circle ourselves and that error is visible, so a fetched avatar
    takes the box scratch/facefit.py fits to the artwork instead of the one
    crops.json measured off the feed.
    """
    out = [face(av, 16, y + ay),
           tx(64, y + 2.0 + dy, name + (check() if ticked else ""), "t-name"),
           tx(64, y + 28.2 + dy,
              '%s <span class="d">&middot;</span> <span class="sb2">Subscribe</span>' % meta,
              "t-meta", "var(--x-ink-2)")]
    if mark == "tag":
        out.append(art("tag", 318.67, y + 2.37))
    elif mark == "menu":
        out.append(svg(15, 3, '<circle cx="1.5" cy="1.5" r="1.5"/>'
                              '<circle cx="7.5" cy="1.5" r="1.5"/>'
                              '<circle cx="13.5" cy="1.5" r="1.5"/>',
                       ' fill="var(--x-ink-2)"', 333.67, y + 6.66)
                   + sk(13, 13, "M1 1L12 12 M12 1L1 12", 1.9, "var(--x-ink-2)",
                        364.33, y + 1.66))
    return "".join(out)


def body(lines, left=16.0, dy=0.0):
    return "".join(tx(left, y + dy, s) for y, s in lines)


# The floating tab bar. It is translucent and the feed runs under it, so it is
# drawn last, over everything, and blurs what it covers.
def tabbar(badge_=""):
    return (
        '<div class="pill"></div>'
        + box(25, 775.8, 74, 48.4, "border-radius:24.2px;background:var(--x-tint);z-index:4")
        # Substack draws its own five, not SF Symbols, so each path is traced
        # off c1 with scratch/icon.py -- the ink span of every 1/3pt row of the
        # icon's box, board against capture. What that reads off the capture and
        # a generic icon set does not give you: the inbox is a trapezoid over a
        # box, the bell's skirt flares and its clapper is a detached smile, the
        # home's door is that same smile rather than a bar, the chat bubble is
        # nearly an oval (6.33pt corners on a 19pt box) with a fat curled tail,
        # and the search handle is an outline, two strokes round a tip, not one.
        + sk(22, 22.5, "M1 9.5L11 0.95L21 9.5V19.35A2.2 2.2 0 0 1 18.8 21.55H3.2"
                       "A2.2 2.2 0 0 1 1 19.35Z M8.95 17.62Q11 18.48 13.05 17.62",
             1.9, "var(--x-ink)", 51, 789)
        + sk(22, 21.5, "M0.99 18.05V12L4 2Q4.15 0.95 4.7 0.95H17.3Q17.85 0.95 18 2"
                       "L21.01 12V18.05A2 2 0 0 1 19.01 20.05H2.99"
                       "A2 2 0 0 1 0.99 18.05Z"
                       " M0.99 13H7.67L8.57 15.72H13.44L14.34 13H21.01", 1.9,
             "var(--x-ink)", 117.33, 789.33)
        + sk(21.5, 22, "M7.33 0.95H13.66A6.34 6.34 0 0 1 20 7.29V13.05"
                       "A4.3 4.3 0 0 1 15.7 17.35H7.4Q4.5 18.5 3.2 20.3"
                       "Q2.1 21.4 2.3 19.2Q3.3 17.3 1 14.3V7.29"
                       "A6.33 6.33 0 0 1 7.33 0.95Z", 1.9,
             "var(--x-ink)", 184.67, 789)
        + sk(20.67, 21.5, "M0.95 17.16V15Q0.95 13 3.28 11V8A7.05 7.05 0 0 1 17.38 8"
                          "V11Q19.71 13 19.71 15V17.16Z"
                          " M8.28 19.95Q10.33 20.81 12.38 19.95", 1.9,
             "var(--x-ink)", 251, 789)
        + badge_
        + '<div class="srch"></div>'
        + sk(27, 27, "M10.83 1.55A9.45 9.45 0 1 0 10.83 20.45"
                     "A9.45 9.45 0 1 0 10.83 1.55Z"
                     " M16.83 18.83Q17.6 21.9 21.77 24.85A2.15 2.15 0 0 0 24.68 21.95"
                     "Q23.3 19.9 21.4 18.4", 2, "var(--x-ink)", 327.5, 786.5)
    )


WASH_TOP = 760.0

# iOS's scroll-edge effect: a black ramp under the floating tab bar. Measured
# on the left gutter of c5 and c6, where the ground is plain white all the way
# down -- 255 at 730 falling to 189 (alpha .26) by 820. c1/c3/c4/c7 do not have
# it: their gutters hold 249..251 to the bottom edge.
def fade():
    return box(0, 730, 393, 122,
               "z-index:2;background:linear-gradient(rgba(0,0,0,0),"
               "rgba(0,0,0,.047) 21%,rgba(0,0,0,.110) 34%,rgba(0,0,0,.184) 48%,"
               "rgba(0,0,0,.243) 61%,rgba(0,0,0,.26) 74%,rgba(0,0,0,.26))")


# The same effect where the ground is light: white, and invisible in the
# gutters, so it is fitted on the ink instead. A per-row least-squares solve of
# mine*(1-a) + 255a = ref over x16..377 puts a at .84 by 832 and .89 by 838 on
# c1, the one screen whose last body line down there is type rather than a crop.
# Held flat past 838 -- that is outside the score window and unverified.
def wash():
    return box(0, WASH_TOP, 393, 852 - WASH_TOP,
               "z-index:1;background:linear-gradient(rgba(255,255,255,0),"
               "rgba(255,255,255,.9) 84.78%,rgba(255,255,255,.9))")


def badge(cx, cy, d, n=""):
    """An unread count over a tab icon, centred on the point it was measured at."""
    return ('<div class="bdg" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;height:%.2fpx">'
            '%s</div>' % (cx - d / 2, cy - d / 2, d, d, n))


def fab():
    return ('<div class="fab">%s</div>'
            % sk(24, 24, "M12 4.15V19.85 M4.15 12H19.85", 2.7, "#FFF", 16.33, 16.33))


SCREEN_CSS = """.t,.b,.i,.a{position:absolute}
/* No fill here: a CSS fill would beat the fill="none" the stroke icons set. */
.i,.fi{display:block}
.a{display:block}
.t{white-space:nowrap}
.d{color:var(--x-ink-2)}
.sb2{font-weight:500;color:var(--x-accent)}
a{color:var(--x-link);text-decoration:none}
i{font-style:italic}
b{font-weight:600;letter-spacing:-.03px}
.ck{display:inline-block}
.act{position:absolute;left:16.33px;display:flex;align-items:flex-start;gap:29px}
.act span{display:flex;align-items:flex-start;gap:6.8px}
.act .c{font:var(--x-t-small);color:var(--x-ink-2);white-space:nowrap}
.pill,.srch{position:absolute;background:var(--x-glass);z-index:3;
  backdrop-filter:blur(4px) saturate(3);-webkit-backdrop-filter:blur(4px) saturate(3);
  box-shadow:0 4px 18px rgba(0,0,0,.09),inset 0 0 0 1px rgba(255,255,255,.7)}
.pill{left:21px;top:768.67px;width:281px;height:62.33px;border-radius:31.17px}
.srch{left:310px;top:769px;width:62px;height:62px;border-radius:50%}
.pill~.i,.srch~.i{z-index:5}
.live{position:absolute;width:26.67px;height:12px;border-radius:3.5px;
  /* Substack's badge face is narrower than the UI one: at the size its cap
     height fits, LIVE sets 1pt wide, so the tracking carries the difference. */
  background:var(--x-live);box-shadow:0 0 0 1.33px #FFF;letter-spacing:-.35px;
  display:flex;align-items:center;justify-content:center;
  font:var(--x-t-live);color:var(--x-ink-inv)}
.bdg{position:absolute;z-index:5;border-radius:50%;background:var(--x-accent);
  display:flex;align-items:center;justify-content:center;
  font:var(--x-t-badge);color:var(--x-ink-inv)}
.fab{position:absolute;left:312.67px;top:695.67px;width:56.67px;height:56.67px;
  border-radius:50%;background:var(--x-accent);z-index:5}"""


def screen(title, inner, css=""):
    """One phone artboard. No board background: the phone floats on the canvas."""
    return page(NAME + " - " + title,
                '<div class="phone">%s%s%s</div>'
                % (statusbar(), inner, home()),
                SCREEN_CSS + ("\n" + css if css else ""))


# --------------------------------------------------------------- screens ----
def s01():
    """A note in the feed, one publication tile row above it."""
    return screen("Note in the feed", "".join([
        header(),
        tiles(["the-anthro", "big-think", "uxui-hub", "claude-cow",
                "ai-first-design"],
              ["The Anthro…", "Big Think", "UX/UI Hub",
               "Claude Cow…", "AI First Desi…"], 208.5),
        divider(233),
        attribution(249.34, "Ileana liked"),
        note(272.67, "av-1", "Evangeline", "May 19", "menu", ay=0.33),
        body([(326.00, "This week’s Art x Design x AI coding Inspiration:"),
              (354.00, "The process behind <a>week.wild.plus/athens-26</a>"),
              (374.00, "captured on: <a>wild.as/labs/building-wild-week-athens</a>"),
              (402.00, "Tools:"),
              (430.00, "Figma, Weavy Claude Code, Framer"),
              (458.33, "<a>See more</a>")]),
        art("photo-1"),
        actions(701.33, ("225", "4", "15", None)),
        band(731.67),
        attribution(751.67, "Ileana liked"),
        note(775.33, "av-1b", "Design.md", "1d"),
        body([(828.33, "<a>Design.md</a> Library &gt; The open library for discovering"),
              (848.67, "and sharing <a>Design.md</a> systems. Build consistent UI")]),
        wash(), fab(), tabbar()]))


def s02():
    """The Keep reading toast, resting over the next note."""
    return screen("Keep reading toast", "".join([
        header(),
        tiles(["the-anthro", "system-design", "ux-psychology", "uxui-hub", "2e"],
              ["The Anthro…", "System Des…", "UX Psychol…",
               "UX/UI Hub", "The"], 208.5, dots=(1,)),
        divider(233),
        note(249, "av-2", "Tushar", "4d", dy=0.33),
        body([(302.33, "Just be honest with yourself, and you'll see changes"),
              (322.33, "in yourself."),
              (350.33, "Happy reading")]),
        cover("card-2"), art("card-2t"),
        actions(672.00, ("30", None, "1", None)),
        band(702.33),
        note(723.33, "av-2b", "Ali Abdaal", "May 22"),
        body([(776.33, "New video: the productivity system I actually"),
              (796.67, "keep using, and the three I quietly dropped.")]),
        art("card-2b"),
        # The toast sits above the feed and below the tab bar.
        box(16, 697.5, 287.7, 52.5,
            "border-radius:var(--x-r-card);background:var(--x-card);"
            "box-shadow:0 6px 20px rgba(0,0,0,.10);z-index:2"),
        art("toast-2", extra=";border-radius:var(--x-r-card) 0 0 var(--x-r-card);z-index:2"),
        tx(80, 709.0, "Keep reading", "t-small", "var(--x-ink-2)", ";z-index:2"),
        tx(80, 727.0, "An hour a day is all you…", "t-toast", None, ";z-index:2"),
        # The toast's dismiss is the full ink, not the secondary grey a note's
        # is, and it is a 10pt box: c2 reads 44,44,44 over x279.67..289.67.
        sk(10, 10, "M0.95 0.95L9.05 9.05 M9.05 0.95L0.95 9.05", 1.9,
           "var(--x-ink)", 279.67, 719, 2),
        wash(), fab(), tabbar()]))


def s03():
    """Three notes in a row, two of them long."""
    return screen("Three notes", "".join([
        header(),
        tiles(["aarron-walter", "the-anthro", "design-better", "system-design",
                "ux-psychology"],
              ["Aarron Walter", "The Anthro…", "Design Better",
               "System Des…", "UX Psychol…"], 208.5, dots=(1, 2, 3),
              live=(0,)),
        divider(233),
        note(249, "av-3a", "Stoic Wisdoms", "May 18", "tag", True, ay=0.33),
        body([(302.33, "<b><i>People are addicted to potential.</i></b>"),
              (330.33, "They love talking about what they <i>could</i> do, what"),
              (350.33, "they <i>might</i> achieve, who they <i>will</i> become."),
              (378.33, "But potential without execution is just fantasy."),
              (406.33, "Don’t live in the fantasy. Execute in the present.")]),
        actions(435.00, ("1.3K", "49", "134", None)),
        band(465.33),
        note(485.33, "av-3b", "Amanda", "May 18"),
        body([(538.33, "Dear substack:"),
              (566.33, "I want to subscribe to the creatives, the designers,"),
              (586.33, "the strategists, the filmmakers, the screenwriters,"),
              (606.33, "the branding girlies who’s writing I can fall in a rabbit"),
              (626.33, "hole on a Sunday morning \U0001F4DD ☀️"),
              (654.33, "Pls help me find them \U0001F90E")]),
        actions(682.67, ("81", "62", "2", None)),
        band(713.33),
        note(733.33, "av-3c", "Francisco", "May 18"),
        # All the pill leaves of this note's first line is the left stroke and
        # crossbar of a capital A in the 5pt gutter, ink top 787.0. The rest of
        # the sentence is a stand-in: nothing in the capture constrains it.
        body([(786.33, "A note I keep coming back to, from an old issue:")]),
        wash(), fab(), tabbar(badge(148.5, 783.6, 8.4))]))


def s04():
    """The author's own post, just published, above a scrolled tile row."""
    return screen("Just published", "".join([
        header(),
        # The card is 71pt tall, not 81.67: c4 puts its lower border at 207.33
        # and a soft drop shadow -- 226 a point below it, back to 253 by 223 --
        # in the 11pt between there and the tile row.
        box(15.67, 136.33, 361.67, 71.0,
            "border-radius:var(--x-r-card);background:var(--x-bg);"
            "border:0.6px solid var(--x-border);"
            "box-shadow:0 4px 16px rgba(0,0,0,.10)"),
        art("th-4", extra=";border-radius:var(--x-r-tile)"),
        tx(80, 151.33, "The Hidden Cost of", "t-label"),
        tx(80, 167.0, "Inconsistency", "t-label"),
        tx(80, 184.34, "Just published", "t-tile", "var(--x-ink-2)"),
        box(255, 156.67, 49.33, 31.67,
            "border-radius:var(--x-r-tile);background:var(--x-fill)"),
        txc(255, 49.33, 167.33, "Stats", "t-label"),
        box(312, 156.67, 53.33, 31.67,
            "border-radius:var(--x-r-tile);background:var(--x-peach)"),
        txc(312, 53.33, 167.0, "Share", "t-label", "var(--x-accent)"),
        tiles(["4a", "ux-ai", "bestfolios", "ai-first-design", "see-all"],
              ["Strategic Thi", "UX + AI", "Bestfolios.c…",
               "AI First Desi…", "See all"], 311.0, -10.83, top=227.58,
              dots=(0,)),
        divider(335.67),
        note(352, "av-4", "AI Engineering Insider", "2d", dy=-0.33),
        body([(405.00, "<b>Preview:</b>"),
              (433.00, "<b>The complete system-design playbook for Senior</b>"),
              (453.00, "<b>and Staff AI engineering interviews.</b>"),
              (481.00, "You can fine-tune a model and ship a… <a>See more</a>")], 16.33),
        doc("doc-4a"), doc("doc-4b"), art("link-4"),
        wash(), fab(), tabbar()]))


def s05():
    """An archive resurfacing, and the first row of People to follow."""
    return screen("From the archives", "".join([
        header(behind(62.0, 80.40, ("184", "24", "50", None), 112.0, "#B7B7B7")),
        clock_row(132),
        note(156, "av-5", "System Design Roadmap", "May 7, 2025", "tag", True, -0.33),
        cover("card-5"), art("card-5t"),
        actions(507.00, ("55", None, "16", None)),
        band(537.33),
        tx(16, 561.00, "People to follow", "t-head"),
        tx(335, 564.0, "See all", "t-label", "var(--x-accent)"),
        people(605.33, [("pf-5a", "AI Agents Simplified", "AI Agents Simplified", False),
                        ("pf-5b", "AI Agents Roadmap",
                         "Followed by <b>System Design Roadmap</b>", False),
                        (None, "Bestfolios", "Curated portfolios", False)]),
        fade(), fab(), tabbar(badge(280.7, 783.3, 16.2, "2"))]))


def s06():
    """People to follow at the top of the viewport, a quoted note under it."""
    return screen("People to follow", "".join([
        header(behind(68.20, 81.50, ("2.4K", "1.6K", "33K", None), 112.0, "#B8B8B8")),
        tx(16, 136.00, "People to follow", "t-head"),
        tx(335, 139.0, "See all", "t-label", "var(--x-accent)"),
        people(180.33, [("pf-6a", "Study English with…", "Study English with Sarah", False),
                        ("pf-6b", "Stoic Philosophy", "The Stoic Manual", True),
                        # Only 31pt of the third card is on screen. Its name is a
                        # stand-in fitted to the one thing the capture shows of
                        # it: ink starting at x389.33, i.e. 106.34pt of 13/700
                        # centred on 442.5.
                        (None, "Bestfolios Notes", "Curated portfolios", False)]),
        band(430.33),
        note(450, "av-6", "sol", "Jun 5", dy=0.33),
        box(15.67, 500, 4.67, 98.67, "background:var(--x-accent)"),
        body([(502.67, "<i>and over time, what i’ve slowly started realizing is</i>"),
              (522.67, "<i>that peace comes less from convincing everyone</i>"),
              (542.67, "<i>to understand you and more from understanding</i>"),
              (562.67, "<i>yourself so deeply that misunderstandings no</i>"),
              (582.67, "<i>longer destroy you.</i>")], 32.0, 0.67),
        cover("photo-6"), art("photo-6t"),
        # The note's own photograph is drawn and clean, but the type over its
        # foot is a crop and the capture bakes the translucent tab bar into that
        # crop. Repaint the band it covers with the photo's own colour
        # (#3F321F..#362B1B, median of the rows just above and below), or the
        # CSS material composites twice.
        box(21, 768.67, 281, 62.33, "border-radius:31.17px;z-index:2;"
            "background:linear-gradient(#3F321F,#362B1B)"),
        box(310, 769, 62, 62, "border-radius:50%;z-index:2;"
            "background:linear-gradient(#3F321F,#362B1B)"),
        fade(), fab(), tabbar()]))


def s07():
    """The share-your-profile card, on the one gradient ground in the app."""
    return screen("Share your profile", "".join([
        box(0, 124, 393, 264,
            "background:linear-gradient(var(--x-grad-a),var(--x-grad-b))"),
        box(0, 388, 393, 4, "background:var(--x-band)"),
        header(behind(59.00, 70.60, ("144", "101", "1.1K", None), 104.0, "#CDCDCD")),
        box(16, 130, 361, 238,
            "border-radius:var(--x-r-card);background:var(--x-bg);"
            "box-shadow:0 8px 24px rgba(0,0,0,.06)"),
        art("share-7"),
        txc(16, 361, 234.00, "Share your profile", "t-share"),
        txc(16, 361, 265.66, "Help friends follow your reading on Substack",
            "t-help", "var(--x-ink-2)"),
        box(39.67, 299.67, 313.66, 44.67,
            "border-radius:var(--x-r-card);background:var(--x-peach)"),
        txc(39.67, 313.66, 316.66, "Share now", "t-btn", "var(--x-accent)"),
        clock_row(407.67),
        note(430.67, "av-7", "Dr. Dominic Ng", "Nov 18", "tag", True, 0.67, ay=1.00),
        cover("card-7"), art("card-7t"),
        actions(782.33, ("128", None, "9", None)),
        band(812.33),
        art("av-7b"),
        tx(64, 834.0, "winnie", "t-name"),
        wash(), fab(), tabbar()]))


# People-to-follow cards. Three across, 165pt wide on an 8pt pitch, the third
# running off the right edge; the logo is a crop, everything else is drawn.
PF_X = (16.0, 189.0, 362.0)


def people(top, cards):
    out = []
    for (cid, name, sub, ticked), x in zip(cards, PF_X):
        out.append(box(x, top, 165, 229.67, "border-radius:var(--x-r-tile);"
                                            "border:0.6px solid var(--x-border)"))
        if cid:
            # 101.89pt at +31.56/+11.88 on the card -- the 0.5 crossing of
            # c5's first card, the one avatar that is a flat disc all the way
            # to its rim and so reads as an edge rather than as a picture.
            out.append(face(cid, x + 31.56, top + 11.88, 101.89))
        out.append(sk(10.67, 10.67, "M1 1L9.67 9.67 M9.67 1L1 9.67", 1.6,
                      "var(--x-ink)", x + 139.67, top + 14.67))
        # The label column is the button's 141pt, not the card's 165: it is what
        # breaks c5's second subtitle after "System" instead of after "Design".
        # A name without a badge is not centred on it either -- it sits 2pt left
        # on every unticked card of c5 and c6, so the row keeps the badge's slot
        # whether or not the badge is in it.
        out.append(txc(x + 12, 141 if ticked else 137, top + 128.34,
                       name + (check(15, "check-o", -2.83, 4.97) if ticked else ""), "t-pub"))
        out.append(txc(x + 12, 141, top + 147.67, sub, "t-tile",
                       "var(--x-ink-2)", 13.33))
        out.append(box(x + 12, top + 186, 141, 32,
                       "border-radius:var(--x-r-tile);background:var(--x-accent)"))
        out.append(txc(x + 12, 141, top + 197.67, "Follow", "t-btn",
                       "var(--x-ink-inv)"))
    return "".join(out)


SCREENS = [("01-note", "Note in the feed", s01),
           ("02-keep-reading", "Keep reading toast", s02),
           ("03-notes", "Three notes", s03),
           ("04-just-published", "Just published", s04),
           ("05-from-the-archives", "From the archives", s05),
           ("06-people-to-follow", "People to follow", s06),
           ("07-share-your-profile", "Share your profile", s07)]

# ------------------------------------------------- Phase 5: the reference ----
# Each capture as it came from Mobbin, attribution watermark intact, on its own
# board. The note is not decoration: it says where the replica had to reason
# past the capture, and no near-match is allowed to pass as exact.
REF_CSS = """.rboard{width:430px;height:932px;background:#151311;border-radius:20px;
  padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rboard h1{font:600 14px/18px var(--x-font);letter-spacing:-.1px}
.rboard p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rboard .shot{margin-top:9px;display:flex;justify-content:center}
.rboard img{height:844px;width:auto;display:block;border-radius:6px}
.rboard .near{color:#F1CD8A}"""

REFS = [
 ("01-note", "Note in the feed",
  "near - the note under the tab pill is legible only as a shape; its name, date and body are stand-ins"),
 ("02-keep-reading", "Keep reading toast",
  "near - same: the note the toast covers keeps its date, its name and body are stand-ins"),
 ("03-notes", "Three notes", "exact"),
 ("04-just-published", "Just published", "exact"),
 ("05-from-the-archives", "From the archives",
  "near - the two people-card names sit under the tab bar and are stand-ins"),
 ("06-people-to-follow", "People to follow", "exact"),
 ("07-share-your-profile", "Share your profile",
  "near - the note under the tab pill keeps the name winnie; its counts are stand-ins"),
]


def ref_boards():
    for i, (name, label, note_) in enumerate(REFS, 1):
        f = REFS_DIR / ("p%d.png" % i)
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        cls = "" if note_.startswith("exact") else ' class="near"'
        yield ("ref-" + name,
               page(NAME + " - reference: " + label,
                    '<div class="rboard"><h1>%s &mdash; reference</h1>'
                    '<p>%s &middot; Mobbin &middot; 1179&times;2676 @3x &middot; '
                    '<span%s>%s</span></p>'
                    '<div class="shot"><img src="%s" alt="%s"></div></div>'
                    % (label, name, cls, note_, uri, label), REF_CSS))


def layout(files):
    return {
     "name": PAGE_NAME,
     "rows": [
      {"title": "Foundations",
       "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]},
      {"title": "Screens", "numbered": True,
       "files": [{"file": n, "label": l} for n, l, _ in SCREENS]},
      # Same order as the row above: the canvas lays every row out from x = 0 at
      # one pitch, so item N here lands column-for-column under item N up there.
      {"title": "Source of truth: captures", "numbered": True,
       "files": [{"file": "ref-" + n, "label": l} for n, l, _ in REFS
                 if "ref-" + n in files]},
     ]}


def main():
    cut()
    tilecut()
    files = dict([("00-design-tokens", token_board())]
                 + list(evidence_boards())
                 + [(s, fn()) for s, _, fn in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    (OUT / "layout.json").write_text(json.dumps(layout(files), indent=2) + "\n")
    print("\nnext: refkit tokens", OUT)


if __name__ == "__main__":
    main()
