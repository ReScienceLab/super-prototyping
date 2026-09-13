"""Instagram for iOS: eight user-profile screens, rebuilt from Mobbin captures.

    python3 mockups/canvases/instagram-ios/gen.py

regenerates every board in place, byte-identical, from anywhere. Boards are
output; never hand-edit the .html.

What is measured and what is not. Every colour, baseline, box and pitch in
here came off assets/refs/cNN.png -- the eight captures at 1179 x 2556, three
capture pixels per design point -- and the measurement that justifies it is in
probes.json, replayable with `refkit batch`. The one thing not measured here
is the iOS status bar: it is this repo's shared chrome, copied unchanged from
templates/gen.py, clock and all. The captures carry no home indicator (Mobbin
strips it), so neither do these boards.

What is cropped and what is rebuilt. Only photography is cropped: the 74
boxes in crops.json, cut out of the captures and placed back by art() at the
same numbers, so an asset cannot drift from where it was measured. Everything
else is live -- type, buttons, rings, the tab bar, the grid's play/carousel/pin
badges and the reels view counts, which are listed in each crop's `erase`,
inpainted out of the photograph and redrawn on top.

Where the icons come from. 12 of the 23 SVGs in assets/icons are Instagram's
own IGDS drawings, lifted out of the IGDS*Icon.react modules in the JS the
logged-out instagram.com shell loads; the other 11 are traced off the captures
because they only appear behind the login wall. icon() sets
preserveAspectRatio="none", so each file's viewBox is the glyph's ink box,
never a module's design grid -- see the folder README.

The scroll model. Boards 03-05 are board 01 scrolled by exactly 208.33 pt:
the mutuals row, the buttons and the highlights all move by that one number,
and the nav is opaque, so nothing above the mutuals survives. Board 02 is the
same account scrolled far enough that the tab bar sticks under the nav; its
first grid row is board 01's second, which is why boards 01 and 02 share the
crops ig-t4..ig-t6.
"""
import base64, json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
ICON_DIR = OUT / "assets" / "icons"

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

TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on the c01 nav title: SF Pro, score 0.922, margin 0.104 over the runner-up"),

 ("Surface", "bg",   "#FFFFFF",
  "flat census of c01 200-300 x 302-312, the ground between the Threads and mutuals rows: 100% flat"),
 ("Surface", "fill", "#F1F2F6",
  "flat census of the c01 Message button at 240-330 x 375-395: 89.4% flat, no channel under 241"),

 ("Line", "hairline", "#DADADA",
  "c06 tab-bar divider at y 346.0, one device pixel tall and the full width: 72.3% flat"),
 ("Line", "ring",     "#DDDEE2",
  "c01 highlight 1's ring at 9 o'clock, 3.3pt of stroke over 12pt of height: 56.1% flat"),

 ("Ink", "ink",     "#0E0F13",
  "flat census of the c01 active-tab underline, 29-69 x 559-561: the only solid fill of this colour in the set"),
 ("Ink", "ink-2",   "#6E7074",
  "modal ink of c06's 'Follow this account to see their photos'; --only ink reads #696C6E, iOS stem-darkening"),
 ("Ink", "ink-inv", "#FFFFFF",
  "label core on the accent fill, c01 Follow"),

 ("Accent", "accent",   "#4A5DF6",
  "flat census of the c01 Follow button at 60-150 x 375-395: 94.6% flat"),
 ("Accent", "link",     "#3846C7",
  "modal ink of c01's youtube.com URL; --only ink reads #3543B4, iOS stem-darkening"),
 ("Accent", "verified", "#3F96F4",
  "flat census of the c01 verified disc, 156-163 x 81-88 inside the tick's arms: 42.9% flat"),
 ("Accent", "sub",      "#7339F5",
  "modal of the filled crown on c08 highlight 1, ink box 12.67-24.0 x 484.33-492.67"),
 ("Accent", "story",    STORY,
  "24-sample sweep of the c01 avatar ring at r 48.5, kept every 30 deg; conic, because the halves do not mirror"),

 ("Radius", "r-btn",   "8px",
  "refkit bbox on the c01 Follow button corner, 16-194 x 369-401"),
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
 ("Type", "t-cap",   "400 12px/15px var(--x-font)",
  "c01 highlight labels 'CFO Podcast' w 72.67 and 'IG Tips' w 38.0; 400 12px sets both exactly"),
 ("Type", "t-caps",  "600 12px/15px var(--x-font)",
  "c03 reels view count '31.2M' w 33.33 in white on the tile; 600 12px is the only fit under 0.5"),
 ("Type", "t-title", "700 24px/29px var(--x-font)",
  "c06 'This account is private' w 250.33, baseline 625.2; 700 24px sets 249.67"),
 ("Type", "t-note",  "400 15px/18px var(--x-font)",
  "c06 'Follow this account to see their photos' w 262.67 and 'and videos.' w 77.33; 400 15px sets both"),
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
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-ring)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-fill);border:1px solid var(--x-ring)}
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
                '<p>Sampled off eight iPhone 16 Pro captures at 3.0 capture px per '
                'design pt. Every value has a row on the evidence board.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, type_, met), SHEET)


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
    profile API serves, masked to the circle iOS masks them to. Both register
    against the capture at scale 1.000 with no offset, so what is left is the
    capture's own encoding: about 6 levels on the Instagram mark, 14 on NYT
    Cooking's red. agnezmo's live picture is a different photograph now, so
    that one stays a crop.
    """
    return ('<img class="a rnd" alt="%s avatar" src="%s" style="left:%gpx;top:%gpx;'
            'width:%gpx;height:%gpx">'
            % (name, _uri(OUT / "assets" / "brand" / (name + ".png")), x, y, d, d))


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.t{position:absolute;white-space:nowrap}
.t b{font-weight:600}
.c{transform:translateX(-50%)}
.a{position:absolute;display:block}
.rnd{border-radius:50%}
svg{position:absolute;display:block}
.ring{position:absolute;width:100px;height:100px;border-radius:50%;background:var(--x-story)}
.ring i{position:absolute;inset:4px;border-radius:50%;background:var(--x-bg)}
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
.div{position:absolute;left:0;width:var(--x-w);height:.33px;background:var(--x-hairline);inset:auto}"""

TY = {"nav": (20, 24), "stat": (16, 20), "body": (14, 18), "bodys": (14, 18),
      "cap": (12, 15), "caps": (12, 15), "title": (24, 29), "note": (15, 18)}


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


def ring(x=9, y=122.67):
    """The story ring: a d 100 gradient disc with a d 92 hole, leaving 4pt of
    stroke and 4pt of ground before the d 86 photograph."""
    return '<div class="ring" style="left:%gpx;top:%gpx"><i></i></div>' % (x, y)


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
        out.append(icon("threads-note", note_x, base - 12.3, 15.33, 14))
        out.append(tx(title[1], title[0], base, "bodys"))
        if tail:
            out.append(tx(tail[1], tail[0], base, "bodys"))
    return "".join(out)


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
            + threads(294.5, "instagram", 113.0,
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
            + threads(348.33, "agnezmo", 107.33, (126.5, "Life is Life-ing"),
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


SCREENS = [("01-profile", "Profile", s01),
           ("02-grid-scrolled", "Grid, scrolled", s02),
           ("03-reels", "Reels tab", s03),
           ("04-reposts", "Reposts tab", s04),
           ("05-tagged", "Tagged tab", s05),
           ("06-private", "Private account", s06),
           ("07-nytcooking", "NYT Cooking", s07),
           ("08-agnezmo", "AGNEZ MO", s08)]


def screen(label, fn):
    return page(NAME + " - " + label, '<div class="phone">%s</div>' % fn(), SCREEN_CSS)


# ------------------------------------------------------- the references ----
# The eight Mobbin captures, unretouched and with the attribution banner they
# ship with intact, one board each and in the same order as the screens, so the
# canvas parks each capture directly under its replica. Never committed: the
# root .gitignore excludes ref-*.html and assets/refs, and re-running this file
# rebuilds them from whatever captures are in the folder.
MOBBIN = "https://mobbin.com/screens/"
SCREEN_IDS = ["14abab29-3e7f-41ea-b1d3-cad9d3705f5a",
              "bea6b7c5-8dfd-40c5-9cdb-63aad72ee143",
              "bee0c28a-9ce0-44ab-9e7c-18762d85af30",
              "227b9b6e-f606-4d12-b941-62b1c52f4d4c",
              "ed12d16e-138a-4ffb-a2b2-1134b1ec45b9",
              "9c930acd-4fd6-4400-b628-d1b44bbe66a9",
              "2ebf521b-8011-4472-9615-9778c546f0ef",
              "fd46bbb4-f06b-4ef9-83aa-461daa667c15"]

REF_CSS = """body{padding:24px}
.rboard{position:relative;flex:none;width:430px;height:932px;padding:13px 20px 0;
  border-radius:20px;background:#151311;color:#fff;overflow:hidden}
.rboard h1{font:600 13px/17px var(--x-font);letter-spacing:-.1px}
.rboard p{margin-top:1px;font:400 9px/12px ui-monospace,Menlo,monospace;
  color:rgba(255,255,255,.45);word-break:break-all}
.rboard img{margin:9px auto 0;display:block;height:858px;width:auto;border-radius:5px}"""


def ref_boards():
    for i, (stem, label, _) in enumerate(SCREENS):
        f = REFS_DIR / ("p%02d.png" % (i + 1))
        if not f.exists():
            continue
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="rboard"><h1>%s &mdash; Mobbin capture</h1>'
                    '<p>1179&times;2676 @3x &middot; %s%s</p>'
                    '<img src="%s" alt="%s reference"></div>'
                    % (label, MOBBIN, SCREEN_IDS[i], _uri(f), label), REF_CSS))


# ------------------------------------------------------------------ run ----
def layout(names):
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                      + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]},
            {"title": "Screens", "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _ in SCREENS]}]
    # Same order as the row above, so capture N lands under replica N.
    refs = [{"file": "ref-" + s, "label": l} for s, l, _ in SCREENS if "ref-" + s in names]
    if refs:
        rows.append({"title": "Source of truth: Mobbin captures",
                     "numbered": True, "files": refs})
    return {"name": PAGE_NAME, "rows": rows}


def main():
    files = dict([("00-design-tokens", token_board())]
                 + list(evidence_boards())
                 + [(s, screen(l, fn)) for s, l, fn in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    out = layout(files)
    (OUT / "layout.json").write_text(json.dumps(out, indent=2) + "\n")
    print("layout.json", len(out["rows"]), "rows")


if __name__ == "__main__":
    main()
