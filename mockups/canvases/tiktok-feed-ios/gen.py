"""TikTok for iOS: the For You feed and its video player, eight screens.

One Mobbin flow, rebuilt from the captures in assets/refs and measured with
refkit:

    python3 mockups/canvases/tiktok-feed-ios/gen.py

Every number in here came off a capture. probes.json is the replay and
README.md the write-up.

These screens are almost entirely interface over one moving picture, so the
split is sharp: the video frame is the only thing cut out of a capture, at the
boxes in crops.json, and everything TikTok draws on it -- nav, rail, chip,
caption, tab bar, scrubber -- is erased out of that crop and redrawn live in
HTML, CSS and inline SVG.

Two facts about the source shape the whole board. Mobbin composites the
Dynamic Island out of its captures, so statusbar() ships island=False over the
top 54 pt of bare video. And TikTok scrims the location chip rather than
blurring it, which cut() undoes so the chip can be redrawn from a token.

Artboards are output. Never hand-edit the .html -- edit this file and re-run.
"""
import base64, json, re
from pathlib import Path

OUT = Path(__file__).resolve().parent
ART_DIR = OUT / "assets" / "art"
REFS_DIR = OUT / "assets" / "refs"
ICON_DIR = OUT / "assets" / "icons"
CROPS = json.loads((OUT / "crops.json").read_text())

NAME = "TikTok feed"
# The canvas page name. This folder ships as an example, hence the prefix.
PAGE_NAME = "(example) " + NAME
P = "tf"           # token prefix: --tf-bg, --tf-ink, --tf-t-copy
SCALE = 2.2417     # the captures are 882 x 1910: 393.45 x 851.6 pt

# TikTok draws the location chip as a flat scrim, not a backdrop blur. Solving
# chip = T*video + K against the one pair of frames that differ only by the
# chip (p2 without it, p3 with) gives rgba(40,40,40,.41); cut() runs that
# inverse over the pixels the chip covered so the board can paint its own.
SCRIM_T, SCRIM_K = 0.587, 16.43

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). The :root block and the evidence table are
# both generated from this list, so a value cannot drift from the evidence
# behind it. Values are written with the placeholder prefix --x- throughout
# this file and rewritten to P on the way out.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on the creator name, 0.91; every cap height divides by SF Pro's 0.714"),

 ("Surface", "bg",    "#000",
  "the ground under the video crop; p2's tab bar reads (0,0,2)"),
 ("Surface", "bar",   "#000",   "tab-bar ground, flat-fill census of p1 x60-95 y790-800"),
 ("Surface", "chip",  "rgba(40,40,40,.41)",
  "chip = .587*video + 16.43, solved p3 against p2, the one pair differing only by the chip"),
 ("Surface", "pill",  "#FFF",   "Repost pill fill, p7 x14-88 y489-514 at the 99.5th pct"),
 ("Surface", "pin",   "#12BC90",
  "location-pin plate, median of its green pixels on p5 and p7"),
 ("Surface", "track", "rgba(255,255,255,.24)",
  "unplayed scrub track, p2 x300-375 y758-768 solved against the video under it"),
 ("Surface", "fill",  "rgba(255,255,255,.75)", "played scrub fill, p2 x20-200 y758-768"),
 ("Surface", "rest",  "rgba(255,255,255,.43)",
  "the resting progress line's played half, p5 and p6: its fully covered rows\n"
  "  read 131.5 and 130.2 over near-black video, which is .51 composited over\n"
  "  the rest-track under it"),
 ("Surface", "rest-track", "rgba(255,255,255,.135)",
  "the same line's unplayed half, which reads 39.2 on p5 and 30.9 on p6, well\n"
  "  under the .24 the expanded bar's track solves to: the resting line is the\n"
  "  subtler of the two, not the same bar drawn thin"),
 ("Surface", "play",  "rgba(255,255,255,.32)",
  "the paused-state triangle, p2 and p3 x175-216 y364-411: its left edge steps\n"
  "  the video by 30-37 levels where the same edge drawn at .6 steps it by 55-61"),

 ("Ink", "ink",     "#FFF",
  "nav 'For You', creator name, caption and every rail count read (255,255,255)"),
 ("Ink", "ink-2",   "rgba(255,255,255,.85)",
  "chip line 2 reads (217,215,218) over p5's (12,9,12) chip ground"),
 ("Ink", "ink-3",   "rgba(255,255,255,.75)",
  "nav 'Following' and the more/less link, dimmer than the run beside them"),
 ("Ink", "ink-4",   "rgba(255,255,255,.13)",
  "the 1.4pt nav separator; its peak coverage over the video reads .135-.142 on\n"
  "  p1, p6, p7 and p8, where the same solve returns .32 for a bar drawn at .30"),
 ("Ink", "ink-tab", "rgba(255,255,255,.8)",
  "inactive tab glyph and label, (204,204,207) over the tab bar's pure black"),
 ("Ink", "ink-dark", "#000000",
  "the Repost label and its glyph, black rather than the brand #161823: the\n"
  "  label's covered pixels sit at (3,2,6) on p7 and (4,3,5) on p8, and their\n"
  "  deficit from the white pill runs 1:1.01:0.99 across the channels where\n"
  "  #161823 would run 1:0.99:0.94"),

 ("Accent", "accent", "#FE2C55", "follow badge, Friends dot and p7's liked heart"),
 ("Accent", "cyan",   "#3BF2FD", "the add button's left plate, p1 x175-186 y778-806"),
 ("Accent", "save",   "#FAD016", "p7 and p8's saved bookmark, x353-374 y586-609"),

 ("Radius", "r-phone", "52px",
  "circular stand-in for the 55pt continuous display corner; this repo's own frame"),
 ("Radius", "r-chip",  "6px",   "refkit bbox on the chip corner, p7 x12 y523.5"),
 ("Radius", "r-pill",  "4px",
  "Repost pill corner, p7 y487.6 and p8 y605.3: the fill reaches the pill's\n"
  "  left edge 3.6pt below its top edge, where a 10pt corner takes 8.5"),
 ("Radius", "r-track", "5.8px", "half of the 11.6pt scrub track, p2 y757.0-768.6"),

 ("Type", "t-time",     "590 17px/22px var(--x-font)", "iOS status bar clock"),
 ("Type", "t-nav",      "700 17px/22px var(--x-font)", "'For You' cap 12.49 / 0.714 = 17.5"),
 ("Type", "t-nav-2",    "600 15px/22px var(--x-font)", "'Following' cap 10.7 / 0.714 = 15.0"),
 ("Type", "t-name",     "600 17px/22px var(--x-font)",
  "'Michael Matti' ascender 12.49 / 0.75 = 16.7, p1 y667.8-680.29"),
 ("Type", "t-copy",     "400 15px/17.2px var(--x-font)",
  "caption cap 11.15 / 0.714 = 15.6; pitch 16.95 measured p7 lines 2-4"),
 ("Type", "t-copy-b",   "600 15px/17.2px var(--x-font)",
  "p7's hashtag lines, heavier than its prose at the same cap height"),
 ("Type", "t-chip",     "500 13px/16px var(--x-font)",  "chip line 1 cap 9.37 / 0.714 = 13.1"),
 ("Type", "t-chip-2",   "400 11px/14px var(--x-font)",  "chip line 2 cap 7.58-8.03 / 0.714 = 10.6-11.2"),
 ("Type", "t-count",    "600 12px/15px var(--x-font)",  "rail count '605.9K' cap 8.92 / 0.714 = 12.5"),
 ("Type", "t-tab",      "500 10px/12px var(--x-font)",  "tab label cap 6.69 / 0.714 = 9.4, y803.85-810.99"),
 ("Type", "t-time-big", "600 32px/38px var(--x-font)",  "p2's '00:06' digit cap 23.2 / 0.714 = 32.5"),
 ("Type", "t-time-sep", "600 20px/24px var(--x-font)",
  "p2's separator ink 6.25 x 16.95; the same slash set at t-time-big measures 9.37 x 27.66"),
 ("Type", "t-refresh",  "700 17px/22px var(--x-font)",  "p5's 'Drag down to refresh' cap 12.1"),
 ("Type", "t-pill",     "600 13px/15px var(--x-font)",
  "the Repost label: 'R' cap 9.37 on p7 and 8.92 on p8, and a 42.38pt word\n"
  "  where 12px sets 39.70"),
 ("Type", "t-music",    "400 14px/16px var(--x-font)",  "p1's marquee 'C' cap 10.26 / 0.714 = 14.4"),

 ("Metrics", "w",      "393px",   "iPhone 16 Pro point width; 882 capture px / 2.2417"),
 ("Metrics", "h",      "852px",   "point height; the capture runs 851.6 and is padded"),
 ("Metrics", "status", "54px",    "iOS status bar, Dynamic Island devices"),
 ("Metrics", "gutter", "12px",    "chip, caption and pill all start at x 12.04-12.5"),
 ("Metrics", "tabbar", "82.7px",  "tab-bar top 769.3 to the foot of the frame"),
 ("Metrics", "copy-w", "300px",
  "caption column: p8's longest line ends 310.03, p7's right-aligned 'less' at 311.82"),
 ("Metrics", "rail-x", "362.8px", "right-rail centre, mean of its five glyph ink boxes"),
]


def TS(tok):
    """(font-size, line-height) of a type token, so no call site restates a size."""
    v = next(v for g, n, v, e in TOKENS if n == tok)
    a, b = v.split()[1].split("/")
    return float(a.rstrip("px")), float(b.rstrip("px"))


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
def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json.

    `erase` clears what TikTok drew on the frame so the board can draw it
    live: [x0,y0,x1,y1] blanks a box, [x0,y0,x1,y1,sign,T] blanks only the
    pixels a high-pass finds inside it, which is what lifts type off a picture
    without taking the picture with it. Both are then filled from their
    surroundings. `unscrim` runs last, undoing the location chip's scrim over
    the pixels it covered.
    """
    if not REFS_DIR.exists():
        return
    import numpy as np
    from PIL import Image, ImageFilter
    ART_DIR.mkdir(parents=True, exist_ok=True)
    src, n = {}, 0
    for cid, c in CROPS.items():
        if cid.startswith("_"):
            continue
        f = REFS_DIR / (c["img"] + ".png")
        if c["img"] not in src:
            src[c["img"]] = Image.open(f).convert("RGB")
        box = tuple(round(v * SCALE) for v in c["box"])
        a = np.asarray(src[c["img"]].crop(box)).astype(float)
        if c.get("erase"):
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
            a = _inpaint(a, m)
        if c.get("unscrim"):
            u = c["unscrim"]
            u = [u[0] + 1, u[1] + 1, u[2] - 1, u[3] - 1]      # inside the soft rim
            X0, Y0, X1, Y1 = (int(round((v - o) * SCALE))
                              for v, o in zip(u, c["box"][:2] * 2))
            a[Y0:Y1, X0:X1] = (a[Y0:Y1, X0:X1] - SCRIM_K) / SCRIM_T
        Image.fromarray(np.clip(np.round(a), 0, 255).astype("uint8")).save(
            ART_DIR / (cid + ".jpg"), quality=92)
        n += 1
    print("%-22s %4d crops" % ("assets/art/", n))


def _grow(m, n):
    """Dilate a glyph mask by n pixels, so its antialiased rim goes with it."""
    import numpy as np
    for _ in range(n):
        p = np.pad(m, 1)
        m = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m


def _inpaint(a, m, sweeps=60):
    """Fill the masked pixels from their neighbours. Coarse to fine: solve the
    half-resolution image first so a wide hole picks up the picture's low
    frequencies instead of a flat smear, then relax at full size."""
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


def _uri(cid):
    f = ART_DIR / (cid + ".jpg")
    return ("data:image/jpeg;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def art(cid, alt="", extra=""):
    """One crop, placed back at the box it was measured from, so the asset
    cannot drift from its evidence."""
    x0, y0, x1, y1 = CROPS[cid]["box"]
    return ('<img class="a" src="%s" alt="%s" style="left:%.2fpx;top:%.2fpx;'
            'width:%.2fpx;height:%.2fpx%s">'
            % (_uri(cid), alt, x0, y0, x1 - x0, y1 - y0, extra))


def icon(name, colour="var(--x-ink)", dy=0.0):
    """One inline <svg> from assets/icons/<name>.svg, drawn at the ink box its
    own viewBox holds, in page pt. Scale is then 1:1 with the measurement and
    the canvas inspector names it as a vector asset.

    dy shifts the whole drawing down its column, for the two glyphs that recur
    at more than one height: the location pin sits at five different chip tops
    and the Repost mark at two.
    """
    svg = (ICON_DIR / (name + ".svg")).read_text().strip()
    x, y, w, h = (float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split())
    return svg.replace('<svg xmlns="http://www.w3.org/2000/svg" ',
                       '<svg class="ic" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx;color:%s" '
                       % (x, y + dy, w, h, colour), 1).replace("\n", "")


# ------------------------------------------------------------ phone frame ----
# Measured once, for every board. The bezel is this repo's own framing, not a
# property of the app being cloned, so it is the same in every folder.
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


def statusbar(colour="var(--x-ink)", time="9:41", island=False):
    """island=False on every board here: Mobbin composites the Dynamic Island
    out of its captures, and all eight show a clean bar."""
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


# --------------------------------------------------- foundations boards ----
# These three boards are their own background, unlike the screens: the ground
# is a neutral dark, not --x-bg, so a pure-black token swatch still reads.
SHEET = """body{padding:0;background:#131316;color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 10.5px/14px var(--x-font);color:var(--x-ink-3);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-3);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.18)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;word-break:break-all}
.foot{display:flex;gap:30px;align-items:flex-start}
.foot h2{margin-top:12px}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:rgba(255,255,255,.14);
  border:1px solid rgba(255,255,255,.18)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-3);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid rgba(255,255,255,.12)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-3);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid rgba(255,255,255,.12);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-accent)}
td.v{color:var(--x-ink-2);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-ink-3)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s);line-height:1.15">Grumpy wizards</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Measured off eight Mobbin captures of the TikTok iOS For You feed, '
                'at 2.2417 capture px per point. Every row has an evidence line on the '
                'next board.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2><div class="rad">%s</div></div>'
                '<div><h2>Metrics</h2><div class="met">%s</div></div></div>'
                '<h2>Type</h2>%s</div>'
                % (NAME, swatches, radii, met, type_), SHEET)


EV_ROWS = 22   # rows that fit the 478 x 980 box; the table splits past this


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


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.t,.b,.a,.ic{position:absolute}
.a,.ic{display:block}
.t{white-space:nowrap}
.mq{position:absolute;overflow:hidden}
.mq span{display:block;white-space:nowrap;font:var(--x-t-music)}"""


def boxtop(ink_top, tk):
    """Chrome puts the cap top of a line at lh/2 - 0.3455*size below the box
    top: half the leading, plus the gap between SF Pro's 0.952em ascent and its
    0.7165em cap height. Every y in this file is therefore an ink top, which is
    what refkit measures, not a box top, which it cannot see."""
    size, lh = TS(tk)
    return ink_top - (lh / 2 - 0.3455 * size)


def tx(x, ink_top, s, tk="t-copy", col=None, w=None, extra=""):
    """One run of type, positioned by the top of its ink."""
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;font:var(--x-%s)%s%s%s">%s</div>'
            % (x, boxtop(ink_top, tk), tk,
               ";color:%s" % col if col else "",
               ";width:%.1fpx" % w if w else "", extra, s))


def txc(x, ink_top, w, s, tk="t-copy", col=None):
    """Centred type. w is the box it centres in, not the width of the ink."""
    return tx(x, ink_top, s, tk, col, w, ";text-align:center")


def box(x, y, w, h, style):
    return ('<div class="b" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;'
            'height:%.2fpx;%s"></div>' % (x, y, w, h, style))


# ------------------------------------------------------------ feed parts ----
RAIL_X = 362.8      # the rail's centre, mean of its five glyph ink boxes
COUNT_W = 80.0      # a box wide enough for '605.9K', centred on RAIL_X
COUNT_Y = (486.24, 551.8, 616.9, 682.1)      # the four count ink tops
TAB_X = (39.3, 117.9, 196.5, 275.1, 353.7)   # five 78.6pt cells


def nav():
    """LIVE badge, the two feed tabs, search. 'For You' is the live tab on all
    seven boards that show the bar; p5 replaces the whole row with refresh()."""
    return (icon("live")
            + tx(123.6, 75.8, "Following", "t-nav-2", "var(--x-ink-3)")
            + box(205.2, 74.5, 1.4, 13.0, "background:var(--x-ink-4);border-radius:.7px")
            + tx(214.2, 74.05, "For You", "t-nav")
            + icon("search"))


def refresh():
    """p5 only: what the nav row becomes while the feed is dragged down."""
    return (txc(105.0, 104.8, 183.0, "Drag down to refresh", "t-refresh")
            + box(351.5, 105.3, 10.7, 10.7, "border-radius:50%;background:var(--x-cyan)")
            + box(363.6, 105.3, 10.7, 10.7, "border-radius:50%;background:var(--x-accent)"))


def rail(post):
    """Avatar, follow badge, the four actions with their counts, album disc.
    Every row sits at the same y on all seven boards that show the rail; p2
    hides the whole column while the scrubber is held."""
    out = [art(post["avatar"], post["name"] + " avatar", ";border-radius:50%"),
           box(352.41, 411.29, 21.41, 21.41, "border-radius:50%;background:var(--x-accent)"),
           icon("plus", "#FFF"),
           icon("heart", post["heart"]),
           icon("bubble"),
           icon("bookmark", post["save"]),
           icon("share")]
    out += [txc(RAIL_X - COUNT_W / 2, y, COUNT_W, n, "t-count")
            for y, n in zip(COUNT_Y, post["counts"])]
    out.append(art(post["disc"], "album art", ";border-radius:50%"))
    return "".join(out)


def chip(post, top, lines=2):
    """The location chip: a scrim box, the pin plate, one or two lines. The pin
    is top-aligned at the box's 4pt pad rather than centred, so a second line
    grows the box downward and leaves it where it was."""
    return "".join([
        box(12.0, top, post["chip_w"], 28.1 if lines == 1 else 40.6,
            "background:var(--x-chip);border-radius:var(--x-r-chip)"),
        icon("pin", "var(--x-pin)", top - 523.28),   # viewBox y 527.28 = chip top + 4
        tx(42.8, top + (8.9 if lines == 1 else 7.5), post["chip"][0], "t-chip",
           extra=post.get("chip_tight", "")),
    ] + ([] if lines == 1 else
         [tx(42.8, top + 24.9, post["chip"][1], "t-chip-2", "var(--x-ink-2)")]))


def caption(post, name_top, lines):
    """The creator name and the caption under it. Every line is placed at the
    ink top it was measured at rather than flowed: the emoji in three of these
    captions set a taller line box than the type around them, so a flow column
    drifts by two points at every emoji line."""
    return (tx(12.0, name_top, post["name"], "t-name")
            + "".join(tx(12.0, top, s, tk, None, 300.0) for top, s, tk in lines))


def music(offset):
    """The track marquee: one repeating unit scrolling under a fixed note. Each
    capture catches it at a different phase, so the offset is all that changes."""
    unit = "Higher - Croixx&nbsp;&nbsp;&nbsp;Contains: "
    return (icon("music")
            + '<div class="mq" data-clip-ok style="left:29.9px;top:%.2fpx;width:182.6px;height:16px">'
              '<span style="margin-left:-%.1fpx">%s</span></div>'
              % (boxtop(741.14, "t-music"), offset, unit * 3))


def repost(dy=0.0):
    """p7 and p8 only: the pill the feed shows above a post the viewer has
    reposted. Its y follows the caption stack, hence dy."""
    return (box(12.04, 487.58 + dy, 77.18, 27.65,
                "background:var(--x-pill);border-radius:var(--x-r-pill)")
            + icon("repost", "var(--x-ink-dark)", dy)
            + tx(38.37, 496.5 + dy, "Repost", "t-pill", "var(--x-ink-dark)"))


def tabbar():
    out = [box(0, 769.3, 393.0, 82.7, "background:var(--x-bar)"),
           icon("tab-home"),
           icon("tab-friends", "var(--x-ink-tab)"),
           icon("tab-add"),
           icon("tab-inbox", "var(--x-ink-tab)"),
           icon("tab-profile", "var(--x-ink-tab)"),
           box(127.6, 771.3, 7.6, 7.6, "border-radius:50%;background:var(--x-accent)")]
    for i, (cx, s) in enumerate(zip(TAB_X, ("Home", "Friends", "", "Inbox", "Profile"))):
        if s:
            out.append(txc(cx - 39.3, 803.85, 78.6, s, "t-tab",
                           None if i == 0 else "var(--x-ink-tab)"))
    return "".join(out)


def scrubber():
    """p2: the fat track a held finger expands the progress line into."""
    return (box(12.2, 757.0, 369.1, 11.6,
                "background:var(--x-track);border-radius:var(--x-r-track)")
            + box(12.2, 757.0, 236.7, 11.6,
                  "background:var(--x-fill);border-radius:var(--x-r-track)")
            + box(244.0, 755.0, 9.8, 15.8, "background:#FFF;border-radius:4.9px"))


def progress(width, knob=0.0):
    """p3 just after release, still part-expanded, and p5/p6 at rest. The same
    bar at two heights: 3.6pt with a knob while it collapses, 2.1pt after, and
    the resting one is dimmer at both ends rather than the same bar drawn thin.
    """
    if knob:
        return (box(12.2, 765.0, 369.1, 3.6, "background:var(--x-track);border-radius:1.8px")
                + box(12.2, 765.0, width, 3.6, "background:var(--x-fill);border-radius:1.8px")
                + box(knob - 3.7, 763.1, 7.4, 7.4, "border-radius:50%;background:#FFF"))
    return (box(12.2, 767.2, 369.1, 2.1, "background:var(--x-rest-track);border-radius:1.05px")
            + box(12.2, 767.2, width, 2.1, "background:var(--x-rest);border-radius:1.05px"))


# ------------------------------------------------------------------ posts ----
# Three posts across the eight captures. Every string is the capture's own: this
# board is a fidelity replica of the feed, so the creators, their copy and their
# counts are transcribed rather than substituted, and their avatars and album
# discs are cropped as the photography they are.
POSTS = {
 "matti": dict(
   name="Michael Matti", avatar="avatar-matti", disc="disc-matti",
   counts=("605.9K", "1,643", "65.4K", "64.4K"),
   heart="var(--x-ink)", save="var(--x-ink)", chip_w=281.1,
   # The one chip line long enough to truncate, and UIKit tightens a line
   # before it truncates: the capture sets it in 241.78 where the same string
   # at t-chip sets 256.50, 14.72 over 38 gaps.
   chip_tight=";letter-spacing:-.52px",
   chip=("Confluence of Havasu Cr&hellip; &middot; Grand Canyon",
         "877.4K views on posts of this place")),
 "life": dict(
   name="Successful Life", avatar="avatar-life", disc="disc-life",
   counts=("382.4K", "13.8K", "67.1K", "81.6K"),
   heart="var(--x-ink)", save="var(--x-ink)", chip_w=233.6,
   chip=("United States", "2.6M people posted about this place")),
 "star": dict(
   name="starfvhls", avatar="avatar-starfvhls", disc="disc-starfvhls",
   counts=("123.1K", "335", "21K", "11.2K"),
   heart="var(--x-accent)", save="var(--x-save)", chip_w=232.0,
   chip=("Tokyo Skytree &middot; Sumida City", "9110 people posted about this place")),
}

MORE = '<span style="color:var(--x-ink-3)">more</span>'

# The ribbon that opens starfvhls' caption is U+10659, a Carian letter, which no
# face this board can name carries: it renders as tofu. It is traced into
# assets/icons/bow.svg instead and drawn at its own ink box, so the line starts
# past it.
BOW = '<span style="display:inline-block;width:16.0px"></span>'

CAP_MATTI = [(697.24, "Somewhere in the bottom of the Grand", "t-copy"),
             (714.19, "Canyon lies this beautiful stream&hellip; " + MORE, "t-copy")]

CAP_LIFE = [(725.34, "stay silent \U0001F515", "t-copy"),
            (744.08, "Best Motivational Speech. Life Less&hellip; " + MORE, "t-copy")]

CAP_STAR_OPEN = [
 (609.4, BOW + "&#8330;&#730; tokyo skytree in asakusa \U0001FAE7 i was", "t-copy"),
 (626.31, "gagged when i saw the baby axolotls! also", "t-copy"),
 (643.26, "a few days late but thank you sm for 10k &amp;", "t-copy"),
 (660.21, "happy 1 year anniversary to this account", "t-copy"),
 (675.83, '&#8889;&#9825; <span style="font:var(--x-t-copy-b)">'
          "#digitaldiary #mofusand #miffy</span>", "t-copy"),
 (703.04, "#matcha #tokyo #japan #travel #minivlog", "t-copy-b"),
 (719.99, "#aesthetic #fyp", "t-copy-b"),
]

CAP_STAR_SHUT = [
 (726.7, BOW + "&#8330;&#730; tokyo skytree in asakusa \U0001FAE7 i was", "t-copy"),
 (744.08, "gagged when i saw the baby axolotl&hellip; " + MORE, "t-copy"),
]


def screen(title, inner):
    """One phone artboard. No board background: the phone floats on the canvas
    ground and its shadow lands on whatever the board is placed over."""
    return page(NAME + " - " + title,
                '<div class="phone">%s%s%s</div>' % (statusbar(), inner, home()),
                SCREEN_CSS)


def for_you():
    p = POSTS["matti"]
    return screen("For You", art("v1") + nav() + rail(p) + chip(p, 614.27)
                  + caption(p, 667.8, CAP_MATTI) + music(20.4) + tabbar())


def scrubbing():
    """The one screen with no rail and no caption: holding the scrubber hides
    every overlay except the nav, the readout and the bar itself. The readout
    is three placed runs rather than one string: its separator is a 20px slash
    on the digits' 32px, centred on the screen, and the gaps either side of it
    are far wider than a space sets."""
    return screen("Scrubbing", art("v2") + nav() + icon("play", "var(--x-play)")
                  + txc(68.9, 680.9, 120.0, "00:06", "t-time-big")
                  + txc(166.7, 685.1, 60.0, "/", "t-time-sep", "var(--x-ink-3)")
                  + txc(201.4, 680.9, 120.0, "00:10", "t-time-big", "var(--x-ink-3)")
                  + scrubber() + tabbar())


def released():
    p = POSTS["matti"]
    return screen("Scrub released", art("v3") + nav() + rail(p) + chip(p, 614.27)
                  + caption(p, 667.8, CAP_MATTI) + music(53.1)
                  + icon("play", "var(--x-play)") + progress(121.2, 130.8) + tabbar())


def playing():
    p = POSTS["matti"]
    return screen("Playing", art("v4") + nav() + rail(p) + chip(p, 626.76, lines=1)
                  + caption(p, 667.8, CAP_MATTI) + music(148.9) + tabbar())


def pull_to_refresh():
    p = POSTS["life"]
    return screen("Pull to refresh", art("v5") + refresh() + rail(p) + chip(p, 643.71)
                  + caption(p, 696.79, CAP_LIFE) + progress(31.3) + tabbar())


def next_post():
    p = POSTS["life"]
    return screen("Next post", art("v6") + nav() + rail(p) + chip(p, 643.71)
                  + caption(p, 697.24, CAP_LIFE) + progress(31.3) + tabbar())


def caption_expanded():
    p = POSTS["star"]
    return screen("Caption expanded", art("v7") + nav() + rail(p) + repost()
                  + chip(p, 523.5) + icon("bow") + caption(p, 576.79, CAP_STAR_OPEN)
                  + tx(12.0, 744.52, "less", "t-copy", "var(--x-ink-3)", 300.0,
                       ";text-align:right")
                  + tabbar())


def caption_collapsed():
    p = POSTS["star"]
    return screen("Caption collapsed", art("v8") + nav() + rail(p) + repost(117.76)
                  + chip(p, 641.48) + icon("bow", "var(--x-ink)", 117.32)
                  + caption(p, 695.01, CAP_STAR_SHUT) + tabbar())


SCREENS = [("01-for-you", "For You", for_you),
           ("02-scrubbing", "Scrubbing", scrubbing),
           ("03-scrub-released", "Scrub released", released),
           ("04-playing", "Playing", playing),
           ("05-pull-to-refresh", "Pull to refresh", pull_to_refresh),
           ("06-next-post", "Next post", next_post),
           ("07-caption-expanded", "Caption expanded", caption_expanded),
           ("08-caption-collapsed", "Caption collapsed", caption_collapsed)]

# ------------------------------------------- Phase 5: the parked captures ----
# Each capture, unretouched, on its own board under the mockup it is the source
# for. They are 882 x 1910 -- the screen with Mobbin's watermark strip cut off,
# hence 851.6 pt of height rather than 852 -- so the frame takes the file's own
# aspect instead of the token height, which would squash it.
REF_CSS = """body{padding:24px;background:#131316}
figure{width:376px}
.rphone{width:376px;border-radius:26px;overflow:hidden;display:block;
  box-shadow:0 0 0 9px #1D191A,0 0 0 10.5px #3A3735}
.rphone img{width:100%;height:auto;display:block}
figcaption{margin-top:12px;font:400 9.5px/14px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3)}
figcaption b{display:block;font:600 12px/16px var(--x-font);color:var(--x-ink);
  margin-bottom:2px}"""

# The Mobbin flow these eight came from, in its own order. That mapping is the
# one thing on these boards not read off the pixels.
FLOW = "TikTok, iOS &mdash; browsing the For You feed"

# Where a capture is not simply "the frame board N is measured from".
REF_NOTES = {
 "02-scrubbing": "the only frame with the rail hidden: the scrubber is held",
 "03-scrub-released": "same video frame as 02, one moment after release",
 "06-next-post": "same post as 05, scrolled on; the burned-in caption is the video's own",
}


def ref_boards():
    for stem, label, _ in SCREENS:
        f = REFS_DIR / ("p%d.png" % int(stem[:2]))
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<figure><div class="rphone"><img src="%s" alt="%s"></div>'
                    '<figcaption><b>%s &middot; %s</b>mobbin.com &middot; %s<br>'
                    '882 &times; 1910, 2.2417 px/pt &middot; %s</figcaption></figure>'
                    % (uri, label, stem[:2], label, FLOW,
                       REF_NOTES.get(stem, "the exact frame board %s is measured from"
                                     % stem[:2])),
                    REF_CSS))


# ------------------------------------------------------------------ run ----
def layout(names):
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                      + [{"file": n, "label": "Evidence"}
                         for n in names if n.endswith("-evidence")]},
            # Same order as the row below: the canvas lays every row out from
            # x = 0 at one pitch, so item N here lands column-for-column over
            # its own capture.
            {"title": NAME + ": For You feed", "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _ in SCREENS]}]
    refs = [{"file": "ref-" + s, "label": l}
            for s, l, _ in SCREENS if "ref-" + s in names]
    if refs:
        rows.append({"title": "Source of truth: Mobbin captures",
                     "numbered": True, "files": refs})
    return {"name": PAGE_NAME, "rows": rows}


def main():
    cut()
    files = dict([("00-design-tokens", token_board())]
                 + list(evidence_boards())
                 + [(s, fn()) for s, _, fn in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    out = layout(sorted(files))
    (OUT / "layout.json").write_text(json.dumps(out, indent=2) + "\n")
    print("layout.json", len(out["rows"]), "rows")
    print("\nnext: refkit tokens", OUT)


if __name__ == "__main__":
    main()
