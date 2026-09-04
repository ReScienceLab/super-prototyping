"""Apple Home & Lock Screen: seven artboards cloned from the Figma community
file "Apple Home and Lock Screen · iOS" (ftV2wtqJaMqjnFaf8SS1Ve, node 6:389),
plus the token board, the evidence board and one reference board per screen.

The source is a design file, not a device capture, so the references are the
file's own 3x exports (assets/refs, not committed) and every number here is a
Figma value re-checked by a probe on those exports (probes.json). One thing the
file does not say out loud: its home-screen "Apps" frame sits under the 54pt
status bar, so every top-anchored Figma y is +54 on the export.

Run `python3 mockups/canvases/apple-home-lock/gen.py`; it regenerates the
folder in place from this file, assets/ and crops.json. Artboards are output:
never hand-edit the .html.
"""
import base64, json, re
from pathlib import Path

OUT = Path(__file__).resolve().parent
ASSETS, REFS_DIR, ART_DIR = OUT / "assets", OUT / "assets" / "refs", OUT / "assets" / "art"
SCALE = 3                       # px per pt on the exports

NAME = "Apple Home & Lock Screen"
PAGE_NAME = "(example) " + NAME
P = "hs"

MIME = {".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml"}


def uri(path):
    return "data:%s;base64,%s" % (MIME[path.suffix], base64.b64encode(path.read_bytes()).decode())


# ------------------------------------------------------------------ art ----
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}


def cut():
    """Key the white glyphs out of the exports at the crops.json boxes. Runs only
    when the (uncommitted) refs are present; assets/art is what is committed."""
    if not REFS_DIR.exists():
        return
    from PIL import Image                                     # noqa: local dep
    import numpy as np
    ART_DIR.mkdir(parents=True, exist_ok=True)
    for cid, (ref, x0, y0, x1, y1) in CROPS.items():
        f = REFS_DIR / (ref + ".png")
        if not f.exists():
            continue
        im = Image.open(f).convert("RGB").crop(tuple(round(v * SCALE) for v in (x0, y0, x1, y1)))
        p = np.asarray(im, dtype=float)
        ring = np.concatenate([p[0], p[-1], p[:, 0], p[:, -1]])
        bg = np.median(ring, axis=0)                      # the disc behind the glyph
        room = 255 - bg
        a = ((p - bg) / np.maximum(room, 1))[..., room > 40].mean(axis=-1)
        a = np.clip(a, 0, 1)
        out = np.zeros(p.shape[:2] + (4,), dtype=np.uint8)
        out[..., :3] = 255
        out[..., 3] = np.round(a * 255)
        Image.fromarray(out, "RGBA").save(ART_DIR / (cid + ".png"))
        print("cut", cid, im.size, "disc", tuple(int(v) for v in bg))


def art(cid):
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a" alt="" src="%s" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx">'
            % (uri(ART_DIR / (cid + ".png")), x0, y0, x1 - x0, y1 - y0))


def icon():
    """icon.png, the welcome card's sticker: the file's iOS 17 wallpaper in the
    256px squircle the other Apple folders use (superellipse r .30, n 2.5, the
    fit to apple-calendar's mask) with the version number in SF Pro Display Bold.
    Keeps the committed file when Pillow or the font is missing."""
    try:
        from PIL import Image, ImageDraw, ImageFont                # noqa: local dep
        import numpy as np
    except ImportError:
        return
    font = next((p for p in (Path("/Library/Fonts/SF-Pro-Display-Bold.otf"),
                             Path.home() / "Library/Fonts/SF-Pro-Display-Bold.otf") if p.exists()), None)
    if font is None:
        print("icon.png kept: SF Pro Display Bold not installed")
        return
    N, ss, n = 256, 4, 2.5
    R = .30 * N * ss
    yy, xx = np.mgrid[0:N * ss, 0:N * ss] + .5
    dx = np.clip(np.maximum(R - xx, xx - (N * ss - R)), 0, None)
    dy = np.clip(np.maximum(R - yy, yy - (N * ss - R)), 0, None)
    mask = ((dx / R) ** n + (dy / R) ** n <= 1).reshape(N, ss, N, ss).mean((1, 3))
    wp = Image.open(ASSETS / "wp-light.webp").convert("RGB")
    w, cy = wp.width, 1600                                        # the red / purple / cyan swirl
    im = wp.crop((0, cy - w // 2, w, cy + w // 2)).resize((N, N), Image.LANCZOS)
    f = ImageFont.truetype(str(font), 176)
    l, t, r, b = f.getbbox("17")
    ImageDraw.Draw(im).text((N / 2 - (l + r) / 2, N / 2 - (t + b) / 2), "17", font=f, fill="white")
    im.putalpha(Image.fromarray(np.round(mask * 255).astype(np.uint8)))
    im.save(OUT / "icon.png")
    print("icon.png", im.size)


# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Probe ids refer to probes.json, replayed on
# the exports and on the renders with `refkit batch`. Figma names are the
# file's variables ("row-widget-margin") or its styles ("system/blue").
TOKENS = [
 ("Font", "font", '"SF Pro",-apple-system,"SF Pro Display","SF Pro Text","Helvetica Neue",sans-serif',
  "Figma family SF Pro, the variable face (wdth 100): with Chrome's optical sizing it sets 'Sunday, March 10' 170.3 wide against 170.7, 'Shortcuts' 53.7 against 53.3 and the 100px time 175.0 against 174.7; SF Pro Display alone misses the date by 5.4, SF Pro Text by 13.6; refkit font on the 100px time: SF Pro .836"),
 ("Font", "font-round", '"SF Pro Rounded",ui-rounded,-apple-system,sans-serif',
  "Figma family SF Pro Rounded on the Reminders widget; refkit font is a no call at 15px (every face within .05)"),

 ("Surface", "widget",       "#FFFFFF",              "bg/primary-elevated; widget-bg flat census 100%"),
 ("Surface", "widget-dark",  "#1C1C1E",              "bg/primary-elevated, dark; widget-bg-dark flat census 100%"),
 ("Surface", "glass",        "rgba(255,255,255,.3)", "dock-bg #ffffff4d; dock-in/dock-out and search-in/search-out solve .26-.35 through the backdrop blur"),
 ("Surface", "glass-dark",   "rgba(0,0,0,.3)",       "dock-bg dark; dock-in-dark/dock-out-dark solve .26/.28/.30 per channel"),
 ("Surface", "island",       "#000000",              "island and island-lock flat census 100%"),
 ("Surface", "event-bg",     "rgba(27,173,248,.2)",  "Figma event fill; event-bg census #D1EFFE is .2 of #1BADF8 over white"),
 ("Surface", "event-bg-dark", "#1C445B",             "event-bg-dark census: .28 of #1BADF8 over #1C1C1E, so the dark file does not reuse the light alpha"),
 ("Surface", "lock-btn",     "rgba(0,0,0,.26)",      "Figma; flash-in/flash-out solve .31/.23/.25, camera-in/camera-out .28/.27/.26"),
 ("Surface", "dragbar",      "rgba(127,127,127,.5)", "Figma drag bar: this at luminosity, then #C2C2C2 at overlay; dragbar-in composite #D94652 over #85040C reproduces both"),

 ("Line", "grey3",       "#C7C7CC", "system/grey3; radio ink core #C7C7CC, divider dot centres #D0D0D4 at the 20% percentile"),
 ("Line", "grey3-dark",  "#464649", "system/grey3 dark; radio-dark brightest 2% #464649"),
 ("Line", "event-bar",   "#1BADF8", "event-bar mode 100%"),

 ("Ink", "ink",          "#000000",              "label/primary; widget-count and cal-date ink core #000000"),
 ("Ink", "ink-dark",     "#FFFFFF",              "label/primary dark; widget-count-dark and cal-date-dark brightest 2% #FFFFFF"),
 ("Ink", "white",        "#FFFFFF",              "system/white; app-label, widget-label, sb-time brightest 2% #FFFFFF"),
 ("Ink", "lock-ink",     "rgba(255,255,255,.8)", "Figma date and time fill; lock-date brightest 2% #FFCFEB is .8 white added to the wallpaper (204 + backdrop, clipped), where a normal composite reads #DDCCD1, so the text blends plus-lighter"),
 ("Ink", "blue",         "#007BFE",              "system/blue; widget-title ink core #007BFE"),
 ("Ink", "blue-dark",    "#0385FF",              "widget-title-dark brightest 2% #0385FF"),
 ("Ink", "red",          "#FF382B",              "system/red; cal-day ink core #FF382B"),
 ("Ink", "red-dark",     "#FE4336",              "cal-day-dark brightest 2% #FE4336"),
 ("Ink", "event-title",  "#106895",              "event-title ink core #106895"),
 ("Ink", "event-time",   "#168AC6",              "event-time ink core #168AC6"),
 ("Ink", "event-ink-dark", "#1BADF8",            "event-title-dark and event-time-dark brightest 2% #1BADF8"),

 ("Radius", "r-widget",    "22px", "Figma Reminders 158x158 r22; widget-box (27.7,90)-(185.3,248)"),
 ("Radius", "r-widget-lg", "23px", "Figma Calendar 170x170 r23; cal-box (195.7,90)-(365.3,260)"),
 ("Radius", "r-app",       "13px", "app-corner-radius; icons-col tile edges 298/358, 396/456, 494/554, 592/652"),
 ("Radius", "r-glass",     "40px", "Figma dock and search radius; dock-col 742..840, search-col 690..720"),
 ("Radius", "r-event",     "4px",  "Figma event details radius"),
 ("Radius", "r-phone",     "52px", "circular stand-in for the 55pt continuous display corner; refkit --crop-phone masks the same 52"),

 ("Type", "t-label",        "400 12px/16px var(--x-font)",        "Figma SF Pro Regular 12/16 on every app and widget label, and the PM run"),
 ("Type", "t-search",       "590 12px/16px var(--x-font)",        "Figma SF Pro Semibold 12/16 'Search'"),
 ("Type", "t-time",         "590 18px/23px var(--x-font)",        "Figma SF Pro Semibold 18/23 ls -.44; hs-time-box cap 23.3..36 (12.7 = .705 x 18) and ink 33.7 wide, which tabular figures set at 34.7 and proportional ones at 32.3"),
 ("Type", "t-widget-title", "590 15px/22px var(--x-font-round)",  "Figma SF Pro Rounded Semibold 15/22 ls .42"),
 ("Type", "t-count",        "590 22px/26px var(--x-font-round)",  "Figma Rounded Semibold 22, leading normal = 1.19"),
 ("Type", "t-row",          "400 13px/19px var(--x-font-round)",  "Figma Rounded Regular 13/19 ls .5 on the reminder rows"),
 ("Type", "t-emoji",        "400 17px/20px var(--x-font)",        "Figma 17/20 emoji run before each reminder"),
 ("Type", "t-cal-day",      "590 13px/16px var(--x-font)",        "Figma Semibold 13/16 ls -.08, uppercase"),
 ("Type", "t-cal-date",     "400 34px/41px var(--x-font)",        "Figma Regular 34/41 ls .4"),
 ("Type", "t-event-title",  "590 15px/20px var(--x-font)",        "Figma Semibold 15/20 ls -.23, margin-bottom -3"),
 ("Type", "t-event-time",   "400 14px/19px var(--x-font)",        "Figma Regular 14/19 ls -.15"),
 ("Type", "t-lock-date",    "510 22px/28px var(--x-font)",        "Figma Medium 22/28 ls -.26; lock-date-box cap top 81.3 = line top 75 + 6.3"),
 ("Type", "t-lock-time",    "590 100px/119px var(--x-font)",      "Figma Semibold 100 leading normal ls -1.65; lock-time-box cap 120.7..191 (70.3 = .703 x 100) puts the line top at 96"),

 ("Metrics", "w",             "393px",  "iPhone 15 logical width; exports are 1179 wide at 3x"),
 ("Metrics", "h",             "852px",  "iPhone 15 logical height"),
 ("Metrics", "status",        "54px",   "status bar; the Apps frame starts under it"),
 ("Metrics", "top",           "90px",   "grid-above 36 under the 54 status bar; widget-box and cal-box y0 90"),
 ("Metrics", "between",       "38px",   "grid-between; Calendar bottom 260 to row 1 at 298, 358 to 396 (icons-col)"),
 ("Metrics", "widget-margin", "27.5px", "row-widget-margin; widget-box x0 27.7"),
 ("Metrics", "app-margin",    "31px",   "row-app-margin; icons at x 31/121.33/211.67/302"),
 ("Metrics", "app",           "60px",   "app-size; icons-col tiles 60 tall"),
 ("Metrics", "dock-h",        "98px",   "dock-height; dock-col 742..840"),
 ("Metrics", "dock-margin",   "12px",   "dock-margin, 852 - 12 - 98 = 742"),
 ("Metrics", "dock-pad",      "22px",   "dock-padding-h; dock icons at x 34/122.33/210.67/299"),
 ("Metrics", "search-w",      "77px",   "Figma search 77x30 at (158,690); search-col 690..720"),
 ("Metrics", "btn",           "50px",   "Figma 50x50 discs, flashlight-margin 46 and 16 from the bottom"),
 ("Metrics", "homebar",       "140px",  "homebar; homebar-box (126.3,839)-(266.7,844)"),
]


def _root():
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
  display:flex;justify-content:center;padding:24px}
.dark{--x-widget:var(--x-widget-dark);--x-glass:var(--x-glass-dark);--x-grey3:var(--x-grey3-dark);
  --x-ink:var(--x-ink-dark);--x-blue:var(--x-blue-dark);--x-red:var(--x-red-dark);
  --x-event-bg:var(--x-event-bg-dark);--x-event-title:var(--x-event-ink-dark);--x-event-time:var(--x-event-ink-dark)}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:#000;color:var(--x-white);transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.wp,.a{position:absolute;display:block}
.wp{left:0;top:0;width:var(--x-w);height:var(--x-h)}
.sb{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:10px;top:18px;width:142px;text-align:center;
  font:var(--x-t-time);letter-spacing:-.44px;color:var(--x-white);font-variant-numeric:tabular-nums}
.sb .island{position:absolute;top:11px;width:126px;height:37px;border-radius:20px;background:var(--x-island)}
.sb svg{position:absolute;display:block;overflow:visible}"""


def _svg(name, left, top):
    """One of the file's own status glyphs, placed at its Figma glyph box."""
    s = (ASSETS / ("sb-%s.svg" % name)).read_text()
    return re.sub(r'style="display: block;"', 'style="left:%gpx;top:%gpx"' % (left, top), s, count=1)


def _bars(left, top, w, h, bw, rx, heights):
    """The cellular glyph: four bars 27.76% apart, bottom-aligned, at the insets
    the file gives for each Bar #N Full."""
    xs = [0, .2776 * w, .5552 * w, .8325 * w]
    return ('<svg style="left:%gpx;top:%gpx" width="%g" height="%g" viewBox="0 0 %g %g" fill="#fff">%s</svg>'
            % (left, top, w, h, w, h,
               "".join('<rect x="%.3f" y="%.3f" width="%g" height="%.3f" rx="%g"/>'
                       % (x, h - bh, bw, bh, rx) for x, bh in zip(xs, heights))))


def sb_home(time):
    """The 430 '15 Pro Max' bar the file drops into its 393 frames, left-aligned:
    island at 152, icons at their 430 boxes (probes hs-cell-box, hs-wifi-box,
    hs-batt-box)."""
    return ('<div class="sb"><div class="island" style="left:152px"></div>'
            '<div class="time">%s</div>%s%s%s</div>'
            % (time, _bars(305, 21, 22.39, 14.41, 3.744, .9, [5.528, 8.127, 11.131, 14.41]),
               _svg("wifi-430", 335, 22), _svg("battery-430", 362, 22)))


def sb_lock():
    """The 393 '15 Pro' bar: island at 133.5, the time at opacity 0 in the file,
    icons 1.5 lower than the home bar's (ls-cell-box, ls-wifi-box, ls-batt-box)
    lock_body adds the drag bar 23 under their top, outside .sb so its blend
    modes see the wallpaper."""
    return ('<div class="sb"><div class="island" style="left:133.5px"></div>%s%s%s</div>'
            % (_bars(282.6, 22.1, 19.47, 12.53, 3.255, .78, [4.807, 7.067, 9.679, 12.53]),
               _svg("wifi-393", 309.1, 23), _svg("battery-393", 332.95, 23)))


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
SHEET = """body{padding:0;background:#fff;color:#000}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 12px/16px var(--x-font);color:#8a8a8e;margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;color:#8a8a8e;margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid #d9d9dc;
  background-image:linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),
  linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%);background-size:8px 8px;background-position:0 0,4px 4px}
.sw .chip i{display:block;height:100%;border-radius:5px}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i.v{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;color:#8a8a8e;font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:#f2f2f7;border:1px solid #d9d9dc}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);color:#8a8a8e;font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding-bottom:2px;border-bottom:1px solid #e5e5ea}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:#8a8a8e;font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:#3a3a3c;column-count:2}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;border-bottom:1px solid #e5e5ea;font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-blue)}
td.v{color:#3a3a3c;max-width:140px;overflow:hidden;text-overflow:ellipsis}
td.e{color:#6d6d72}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip"><i style="background:var(--x-%s)"></i></div>'
        '<b>--x-%s</b><i class="v">%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">%s</span>'
        '<em>--x-%s &middot; %s</em></div>'
        % (n, "1:47" if n == "t-lock-time" else "Minerva Dinner 26", n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Figma community file ftV2wtqJaMqjnFaf8SS1Ve, node 6:389. Every value is a '
                'Figma variable or style re-checked by a probe on the file&rsquo;s 3&times; exports; '
                'the dark values are the same names under <code>.dark</code>.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, type_, met), SHEET)


EV_ROWS = 60


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
                    '<p>One row per token: the Figma name, then the probe in probes.json that '
                    're-measured it on the export.</p></header><table class="ev">%s</table></div>'
                    % (of, rows), SHEET))


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.card{position:absolute;top:var(--x-top);background:var(--x-widget);color:var(--x-ink);overflow:hidden}
.rem{left:var(--x-widget-margin);width:158px;height:158px;border-radius:var(--x-r-widget)}
.cal{left:195.5px;width:170px;height:170px;border-radius:var(--x-r-widget-lg)}
.rem h3{position:absolute;left:16px;top:10px;font:var(--x-t-widget-title);letter-spacing:.42px;color:var(--x-blue);white-space:nowrap}
.rem .n{position:absolute;right:17px;top:7px;font:var(--x-t-count)}
.rem .row{position:absolute;left:48px;display:flex;align-items:flex-start;gap:1px;
  font:var(--x-t-row);letter-spacing:.5px;white-space:nowrap}
.rem .row em{font:var(--x-t-emoji);font-style:normal}
.rem .rad{position:absolute;left:15px;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--x-grey3)}
.rem .dv{position:absolute;left:15px;width:126px;height:1px;
  background:repeating-linear-gradient(90deg,var(--x-grey3) 0 2px,transparent 2px 3px)}
.cal .day{position:absolute;left:16px;top:14px;font:var(--x-t-cal-day);letter-spacing:-.08px;
  text-transform:uppercase;color:var(--x-red);white-space:nowrap}
.cal .date{position:absolute;left:16px;top:28px;font:var(--x-t-cal-date);letter-spacing:.4px}
.cal .ev{position:absolute;left:16px;top:73px;width:138px;display:flex;flex-direction:column;gap:4px}
.cal .e{display:flex;gap:4px}
.cal .bar{flex:none;width:4px;border-radius:100px;background:var(--x-event-bar)}
.cal .d{flex:1;min-width:0;background:var(--x-event-bg);border-radius:var(--x-r-event);padding:0 4px}
.cal .d b{display:block;font:var(--x-t-event-title);letter-spacing:-.23px;color:var(--x-event-title);
  margin-bottom:-3px;white-space:nowrap;overflow:hidden}
.cal .d span{display:block;font:var(--x-t-event-time);letter-spacing:-.15px;color:var(--x-event-time);white-space:nowrap}
.cal .d span i{font:var(--x-t-label);font-style:normal}
.wl,.al{position:absolute;text-align:center;font:var(--x-t-label);color:var(--x-white);white-space:nowrap}
.al{width:100px;margin-left:-20px}
.app{position:absolute;display:block;width:var(--x-app);height:var(--x-app);border-radius:var(--x-r-app)}
.glass{position:absolute;background:var(--x-glass);border-radius:var(--x-r-glass);
  -webkit-backdrop-filter:blur(40px);backdrop-filter:blur(40px)}
.search{left:158px;top:690px;width:var(--x-search-w);height:30px}
.search span{position:absolute;left:24px;top:7px;font:var(--x-t-search);color:var(--x-white);white-space:nowrap}
.dock{left:var(--x-dock-margin);top:742px;width:369px;height:var(--x-dock-h)}"""

LOCK_CSS = """.ldate,.ltime{position:absolute;left:0;width:var(--x-w);text-align:center;color:var(--x-lock-ink);white-space:nowrap;
  mix-blend-mode:plus-lighter}
.ldate{top:75px;font:var(--x-t-lock-date);letter-spacing:-.26px}
.ltime{top:96px;font:var(--x-t-lock-time);letter-spacing:-1.65px}
.lbtn{position:absolute;top:752px;width:var(--x-btn);height:var(--x-btn);border-radius:50%;background:var(--x-lock-btn)}
.hbar{position:absolute;left:126.5px;top:839px;width:var(--x-homebar);height:5px;border-radius:100px;
  background:var(--x-white);-webkit-backdrop-filter:blur(40px);backdrop-filter:blur(40px)}
.drag{position:absolute;left:297px;top:42.5px;width:48px;height:2.33px;border-radius:999px;
  background:var(--x-dragbar);mix-blend-mode:luminosity}
.drag2{background:#c2c2c2;mix-blend-mode:overlay}"""

APPS = ["facetime", "calendar", "photos", "shortcuts", "health", "wallet", "reminders", "mail",
        "podcasts", "news", "weather", "notes", "translate", "appstore"]
DOCK = ["maps", "safari", "music", "camera"]
COLS = [31, 121.33, 211.67, 302]
DOCK_X = [34, 122.33, 210.67, 299]

# Strings per export. The three localized exports are 430 x 932 instances of
# the same component; the boards keep the 393 layout and swap the strings.
LOCALES = {
 "en": dict(search="Search", widgets=("Reminders", "Calendar"),
            rows=[("🧘🏻‍♂️", "Yoga"), ("🚶🏻", "Walk"), ("🦉", "Duolingo")], day="Monday",
            events=[("Minerva Dinner", "5:00–5:30"), ("In-N-Out", "7–8")],
            apps=["FaceTime", "Calendar", "Photos", "Shortcuts", "Health", "Wallet", "Reminders", "Mail",
                  "Podcasts", "News", "Weather", "Notes", "Translate", "App Store"]),
 "es": dict(search="Buscar", widgets=("Recordatorios", "Calendario"),
            rows=[("🚶🏻", "Caminar"), ("🧘🏻‍♂️", "Yoga"), ("🦉", "Duolingo")], day="Lunes",
            events=[("Minerva Cena", "5:00–5:30"), ("In-N-Out", "7–8")],
            apps=["FaceTime", "Calendario", "Fotos", "Atajos", "Salud", "Wallet", "Recordatorios", "Mail",
                  "Podcasts", "News", "Tiempo", "Notas", "Traducir", "App Store"]),
 "zh": dict(search="搜索", widgets=("提醒事项", "日历"),
            rows=[("🧘🏻‍♂️", "瑜伽"), ("🚶🏻", "走"), ("🦉", "多邻国")], day="周一",
            events=[("密涅瓦的晚餐", "5:00–5:30"), ("汉堡包", "7–8")],
            apps=["通话", "日历", "照片", "快捷指令", "健康", "钱包", "提醒事项", "邮件",
                  "播客", "消息", "天气", "备忘录", "翻译", "预览"]),
 "fr": dict(search="Recherche", widgets=("Rappels", "Calendrier"),
            rows=[("🧘🏻‍♂️", "Yoga"), ("🚶🏻", "Marcher"), ("🦉", "Duolingo")], day="Lundi",
            events=[("Minerva Dîner", "5:00–5:30"), ("In-N-Out", "7–8")],
            apps=["FaceTime", "Calendrier", "Photos", "Raccourcis", "Santé", "Wallet", "Rappels", "Mail",
                  "Podcasts", "News", "Météo", "Notes", "Traduire", "App Store"]),
}

_LOGO = {}


def logo(name):
    if name not in _LOGO:
        _LOGO[name] = uri(ASSETS / ("logo-%s.webp" % name))
    return _LOGO[name]


def widgets(L):
    rows = "".join(
        '<div class="rad" style="top:%dpx"></div><div class="row" style="top:%dpx"><em>%s</em>%s</div>'
        % (t, t, emo, txt) for t, (emo, txt) in zip((40, 79, 118), L["rows"]))
    dividers = "".join('<div class="dv" style="top:%dpx"></div>' % t for t in (69, 108))
    events = "".join(
        '<div class="e"><div class="bar"></div><div class="d"><b>%s</b><span>%s<i>PM</i></span></div></div>'
        % (title, when) for title, when in L["events"])
    return ('<div class="card rem"><h3>%s</h3><div class="n">73</div>%s%s</div>'
            '<div class="card cal"><div class="day">%s</div><div class="date">26</div>'
            '<div class="ev">%s</div></div>'
            '<div class="wl" style="left:27.5px;top:252px;width:158px">%s</div>'
            '<div class="wl" style="left:195.5px;top:264px;width:170px">%s</div>'
            % (L["widgets"][0], rows, dividers, L["day"], events, L["widgets"][0], L["widgets"][1]))


def home_body(wallpaper, locale="en", dark=False):
    L = LOCALES[locale]
    grid = "".join(
        '<img class="app" alt="" src="%s" style="left:%gpx;top:%gpx">'
        '<div class="al" style="left:%gpx;top:%gpx">%s</div>'
        % (logo(app), COLS[i % 4], 298 + 98 * (i // 4), COLS[i % 4], 362 + 98 * (i // 4), label)
        for i, (app, label) in enumerate(zip(APPS, L["apps"])))
    dock = "".join('<img class="app" alt="" src="%s" style="left:%gpx;top:761px">' % (logo(app), x)
                   for app, x in zip(DOCK, DOCK_X))
    return ('<div class="phone%s"><img class="wp" alt="" src="%s">%s%s%s'
            '<div class="glass search"><span>%s</span></div>%s<div class="glass dock"></div>%s</div>'
            % (" dark" if dark else "", uri(ASSETS / wallpaper), sb_home("1:47"), widgets(L), grid,
               L["search"], art("search"), dock))


def lock_body(wallpaper):
    return ('<div class="phone"><img class="wp" alt="" src="%s">%s'
            '<div class="drag"></div><div class="drag drag2"></div>'
            '<div class="ldate">Sunday, March 10</div><div class="ltime">1:47</div>'
            '<div class="lbtn" style="left:46px"></div><div class="lbtn" style="left:297px"></div>%s%s'
            '<div class="hbar"></div></div>'
            % (uri(ASSETS / wallpaper), sb_lock(), art("flashlight"), art("camera")))


def home(wallpaper, locale="en", dark=False):
    return lambda: page(NAME + " - Home " + locale + (" dark" if dark else ""),
                        home_body(wallpaper, locale, dark), SCREEN_CSS)


def lock(wallpaper, label):
    return lambda: page(NAME + " - Lock " + label, lock_body(wallpaper), LOCK_CSS)


SCREENS = [
 ("01-home-light", "Home, light", home("wp-light.webp")),
 ("02-home-dark",  "Home, dark",  home("wp-dark.webp", dark=True)),
 ("03-lock-light", "Lock, light", lock("wp-light.webp", "light")),
 ("04-lock-dark",  "Lock, dark",  lock("wp-dark.webp", "dark")),
 ("05-home-es",    "Home, Spanish", home("wp-light.webp", "es")),
 ("06-home-zh",    "Home, Chinese", home("wp-light.webp", "zh")),
 ("07-home-fr",    "Home, French",  home("wp-light.webp", "fr")),
]

# ------------------------------------------------- Phase 5: the reference ----
REF_CSS = """.rboard{width:430px;height:932px;background:#151311;border-radius:20px;
  padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rboard h1{font:600 14px/18px var(--x-font);letter-spacing:-.1px}
.rboard p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rboard .shot{margin-top:9px;display:flex;justify-content:center}
.rboard img{height:844px;width:auto;display:block;border-radius:6px}
.rboard .near{color:#F1CD8A}"""

# (screen file, label, export, size, note). A "near" note is a reference that
# is not the board's own frame: the localized exports are 430 x 932.
REFS = [
 ("01-home-light", "Home, light", "home-light", "1179&times;2556 @3x", "exact: node 6:436, iOS 17 Bg Light"),
 ("02-home-dark",  "Home, dark",  "home-dark",  "1179&times;2556 @3x", "exact: node 6:437"),
 ("03-lock-light", "Lock, light", "lock-light", "1179&times;2556 @3x", "exact: node 6:456"),
 ("04-lock-dark",  "Lock, dark",  "lock-dark",  "1179&times;2556 @3x", "exact: node 6:458"),
 ("05-home-es", "Home, Spanish", "home-es", "1290&times;2796 @3x", "near: node 6:440 is a 430&times;932 instance; the board keeps the 393 layout"),
 ("06-home-zh", "Home, Chinese", "home-zh", "1290&times;2796 @3x", "near: node 6:441 is a 430&times;932 instance; the board keeps the 393 layout"),
 ("07-home-fr", "Home, French",  "home-fr", "1290&times;2796 @3x", "near: node 6:442 is a 430&times;932 instance; the board keeps the 393 layout"),
]


def ref_boards():
    for name, label, export, size, note in REFS:
        f = REFS_DIR / (export + ".png")
        if not f.exists():
            continue
        cls = "" if note.startswith("exact") else ' class="near"'
        body = ('<div class="rboard"><h1>%s &mdash; reference</h1>'
                '<p>%s &middot; Figma export &middot; %s &middot; <span%s>%s</span></p>'
                '<div class="shot"><img src="%s" alt="%s"></div></div>'
                % (label, name, size, cls, note, uri(f), label))
        yield "ref-" + name, page(NAME + " - reference: " + label, body, REF_CSS)


# ------------------------------------------------------------------ run ----
if __name__ == "__main__":
    cut()
    icon()
    write("00-design-tokens", token_board())
    for name, html in evidence_boards():
        write(name, html)
    for name, _, fn in SCREENS:
        write(name, fn())
    for name, html in ref_boards():
        write(name, html)

    LAYOUT = {
     "name": PAGE_NAME,
     "cover": "01-home-light",
     "rows": [
      {"title": "Foundations",
       "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]},
      {"title": "Screens", "numbered": True,
       "files": [{"file": n, "label": l} for n, l, _ in SCREENS]},
      {"title": "Source of truth: Figma exports", "numbered": True,
       "files": [{"file": "ref-" + n, "label": l} for n, l, *_ in REFS]},
    ]}
    (OUT / "layout.json").write_text(json.dumps(LAYOUT, indent=2, ensure_ascii=False) + "\n")
    print("layout.json", len(LAYOUT["rows"]), "rows")
