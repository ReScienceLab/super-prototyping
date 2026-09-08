"""Emit mockups/canvases/flashcard-onboarding/ from four frames of a video.

Four onboarding screens at 393 x 852 pt, cloned from a 1080 x 1350 H.264 clip
of a flashcard app walkthrough. The phone's screen window inside that clip is
525 x 1140 px, so the scale is 1.337 px per pt (525/393 = 1.3359, 1140/852 =
1.3380, 0.16% apart), and every number below was read at that scale.

Chrome is CSS -- type, the nav track, both pills, the arrows, the two buttons,
the status bar clock. Illustration is cropped out of the frames at its own
measured box: `crops.json` names each box, `cut()` writes assets/art/<id>.png
and `art()` places the <img> back at the same numbers, so an asset cannot
drift from where it was measured. See the README for what that costs here.

    python3 mockups/canvases/flashcard-onboarding/gen.py

Artboards are output. Edit this file, never the HTML.
"""
import base64
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}
SCALE = 1.337                                    # capture px per design pt

NAME = "Flashcard Onboarding"
PAGE_NAME = "(example) " + NAME
P = "f"

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Every box below is design pt on the 525 x
# 1140 crops in assets/refs, replayable from probes.json with --pt 1.337.
TOKENS = [
 ("Font", "font",
  'system-ui,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif',
  "SF Pro, not Rounded: the terminals on 'Create Account' are cut, not round, "
  "at 3x. Four measured strings run 3.3-5.2% narrower than system-ui, a "
  "1.9-point spread that --x-tracking absorbs, against 2.5-7.1% and a "
  "4.6-point spread for SF Pro Rounded"),
 ("Font", "tracking", "-.025em",
  "every string is narrower than its untracked setting by an amount that "
  "scales with character count, not with width: 5.0px over 13 gaps on the "
  "eyebrow and 12.8 over 35 on the subtitle, ratio .391 against .371 "
  "predicted by tracking and .533 by a narrower face. The four strings solve "
  "to -.0257, -.0244, -.0248 and -.0266em across 15px and 36px, so one "
  "figure covers the whole ramp. It has to be set on each rule: "
  "letter-spacing inherits as a computed length, so an em on body reaches a "
  "36px title as body's own -.4px and tracks it at a third of the intent"),

 ("Surface", "bg",       "#FFFFFF",
  "flat census on c4 y700-760 is 100% #FDFDFD, but 2801 px elsewhere hit 255: "
  "the 2-level floor is H.264 flat-field quantization, not an off-white"),
 ("Surface", "card",     "#FDFAF4",
  "flat run c4 row 185, x 97.4..285.9 -- the warm panel behind the trophy"),
 ("Surface", "track",    "#F4F4F4",
  "flat run c1 col 120, y 770.2..787.4 and 800.9..824.8 -- the nav track"),
 ("Surface", "pill-off", "#C1C1C1",
  "flat census inside the disabled back pill, 50.6% of 3221 flat px"),

 ("Line", "hairline",    "#EFEFEF",
  "Login outline: c4 row 651 x 364.0..365.5, c4 col 40 y 623.3..625.5"),

 ("Ink", "ink",          "#000000",
  "ink core (darkest 2%) of the eyebrow, both title lines and the legal bold"),
 ("Ink", "ink-mid",      "#3A3A3A",  "ink core of the Login label, c4"),
 ("Ink", "ink-2",        "#7E7E7E",
  "subtitle ink core #7D7D7D on c1 and c4, legal-line grey #7F7F7F; "
  "one token at the midpoint"),
 ("Ink", "ink-inv",      "#FFFFFF",
  "brightest 2% of the back arrow is #FEFEFE, on the same 2-level floor as bg"),

 ("Accent", "accent",    "#F39D05",
  "flat fill of the walked segment of the progress path, c2 and c3; the nodes "
  "themselves are 25pt across at 1.337 px/pt, too small for a census. Every "
  "amber element on a screen is cropped art, so this token is used only by "
  "the foundations boards"),

 ("Fill", "pill-dark",
  "linear-gradient(180deg,#8A8A8A 0,#3C3C3C 6.8px,#141414 15.7px,"
  "#0F0F0F 30px,#090909 41px,#040404 100%)",
  "column profile c2 col 336 (next) and col 55 (back), y 768.7..825.5; the "
  "two pills profile identically, so an enabled back pill is the same fill"),
 ("Fill", "pill-grey",
  "linear-gradient(180deg,#DADADA 0,#D2D2D2 4.5px,#C4C4C4 9.8px,"
  "#C1C1C1 30px,#C1C1C1 100%)",
  "column profile c1 col 55, y 768.7..825.5 -- back is disabled on 01 only"),
 ("Fill", "btn-dark",
  "linear-gradient(180deg,#8A8A8A 0,#3C3C3C 5px,#000000 12px,#000000 100%)",
  "column profile c4 col 340, y 560.5..616.6 -- Create Account"),

 ("Radius", "r-pill",    "999px",
  "by construction: both nav pills and both buttons are h/2 caps"),
 ("Radius", "r-phone",   "52px",
  "circular stand-in for the 55pt continuous display corner"),

 ("Type", "t-eyebrow",   "600 15px/18px var(--x-font)",
  "cap 11.2 at 573.7..584.9 on c1; 'SMART LEARNING' spans 125.7 tracked"),
 ("Type", "t-title",     "700 36px/42.3px var(--x-font)",
  "flat cap 'R' 25.4 on c4 (25.4/0.7046 = 36.0); baselines 629.8 and 672.1"),
 ("Type", "t-sub",       "400 15px/18.7px var(--x-font)",
  "flat cap 'E' 11.2 on c1 subtitle; line tops 688.1 and 706.8"),
 ("Type", "t-btn",       "600 20px/24px var(--x-font)",
  "'Login' cap top 643.2 to descender 661.2 solves 20.0 at cap .7046 desc .213"),
 ("Type", "t-legal",     "400 13px/17.2px var(--x-font)",
  "band 12.7 ascender-to-descender at 769.6..782.3, pitch 17.2"),
 ("Type", "t-time",      "590 17px/22px var(--x-font)",
  "status bar digits 12.7 tall at 20.2..32.9, spanning 32.2 untracked -- "
  "iOS chrome, so it opts out of --x-tracking"),

 ("Metrics", "w",        "393px",   "iPhone 15/16 logical width"),
 ("Metrics", "h",        "852px",   "iPhone 15/16 logical height"),
 ("Metrics", "status",   "54px",    "iOS status bar, Dynamic Island devices"),
 ("Metrics", "nav-y",    "768.7px", "c1 col 336, the next pill's top edge"),
 ("Metrics", "nav-h",    "56.8px",  "c1 col 336, 768.7..825.5"),
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
def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return                       # a fresh clone has no captures; art/ is committed
    try:
        from PIL import Image                                 # noqa: local dep
    except ImportError:
        print("%-24s %6s (no Pillow; assets/art/ left as committed)"
              % ("assets/art/", "-"))
        return
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


def art(cid):
    """One <img>, placed at the box it was measured from."""
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx">' % (_uri(cid), x0, y0, x1 - x0, y1 - y0))


# ------------------------------------------------- placing type by its ink ----
# Every type position in this folder was measured as a baseline, because a
# baseline is the one thing a string of any content puts in the same place: an
# ink top moves with the tallest glyph, and "Climb the Global" has no
# descender where "Take on Challenges," has two. SF Pro Rounded reports hhea
# ascender .952 and descender .213 per em, and a browser centres that
# 1.165em content box in the line box, so:
ASC, DESC = 0.952, 0.213


def bt(baseline, fs, lh):
    """The `top` that lands a single line's baseline where it was measured."""
    return baseline - ((lh - (ASC + DESC) * fs) / 2 + ASC * fs)


# ------------------------------------------------------------ phone frame ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-bg);color:var(--x-ink);transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;
  font:var(--x-t-time)}
.sb svg{position:absolute;display:block;fill:currentColor}
.sb .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
.home{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);
  width:139px;height:5px;border-radius:3px;background:currentColor;z-index:6}
img.a{position:absolute;display:block}"""

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

# The repo's standard status bar, lifted from templates/gen.py, chrome and all.
# The source's own bar differs -- the clock sits 2.5pt higher and the right-hand
# cluster carries a fourth glyph reading "32" between wifi and the battery --
# but the frame around a board is the repo's, not the source's, the same call
# the Dynamic Island and the home indicator already make. See the README.
def statusbar(colour="var(--x-ink)", time="9:41"):
    return ('<div class="sb" style="color:%s"><div class="island"></div>'
            '<div class="time">%s</div>%s</div>'
            % (colour, time, SB_ICONS))


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
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-ink-2);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-2);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-hairline)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-card);border:1px solid var(--x-hairline)}
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
td.t,td.v{font-family:ui-monospace,Menlo,monospace}
td.t{color:var(--x-accent);white-space:nowrap}
td.v{color:var(--x-ink-mid);max-width:132px;word-break:break-all}
td.e{color:var(--x-ink-2)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink", "Accent", "Fill") for _, n, v, _ in _of(g))
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
                '<p>Four onboarding screens, measured off a 1080 &times; 1350 video '
                'at 1.337 capture px per design pt. Every value below is a '
                'measurement; the row that justifies it is on 00b, and the probe '
                'that produced it is in <code>probes.json</code>.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, type_, met), SHEET)


EV_ROWS = 10   # rows that fit the 478 x 980 box; the table splits past this
ART_BOARD = "00%s-art" % "bcdefg"[-(-len(TOKENS) // EV_ROWS)]   # after the last one


def evidence_boards():
    """The evidence table, split across as many boards as it needs. It is the
    deliverable of Phase 1: trim the board count, never the rows."""
    pages = [TOKENS[i:i + EV_ROWS] for i in range(0, len(TOKENS), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--x-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield ("00%s-evidence" % "bcdefg"[i],
               page(NAME + " - Evidence" + of,
                    '<div class="sheet"><header><h1>Evidence%s</h1>'
                    '<p>One row per token. A token with no evidence is a guess.</p>'
                    '</header><table class="ev">%s</table></div>' % (of, rows), SHEET))


# ------------------------------------------------------------ art board ----
# The board that answers "which of this is a picture?". Every crop is declared
# once as a background-image class and used twice: at its measured pt box on a
# scaled-down phone, and again in the contact sheet.
MINI_W = 100.0
MINI_S = MINI_W / 393.0

ART_BOARD_CSS = SHEET + """
.rule{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2);
  margin:-10px 0 13px}
.minis{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:2px}
.mini{position:relative;width:%.1fpx;height:%.1fpx;overflow:hidden;
  border-radius:9px;border:1px solid var(--x-hairline);background:var(--x-bg)}
.mini .in{position:absolute;left:0;top:0;width:393px;height:852px;
  transform:scale(%.5f);transform-origin:0 0}
.mini em{position:absolute;left:5px;bottom:4px;font-style:normal;
  font:600 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-mid);
  background:rgba(255,255,255,.9);padding:1px 4px;border-radius:3px}
b.i{display:block;background-repeat:no-repeat}
.mini b.i{position:absolute;background-size:100%% 100%%}
.cs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.cs figure{border:1px solid var(--x-hairline);border-radius:5px;padding:4px;
  background:var(--x-bg)}
.cs b.i{height:74px;background-size:contain;background-position:center}
.cs figcaption{margin-top:3px;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2)}
.cs figcaption b{color:var(--x-ink-mid)}
""" % (MINI_W, round(852 * MINI_S, 1), MINI_S)


def art_classes():
    """One background-image rule per crop, so each data URI is embedded once."""
    return "".join(".i-%s{background-image:url(%s)}" % (c, _uri(c))
                   for c in CROPS if _uri(c))


def tile(cid, style=""):
    return '<b class="i i-%s"%s></b>' % (cid, ' style="%s"' % style if style else "")


def mini(ref, label):
    """One screen scaled down, carrying its art and nothing else."""
    ids = [c for c in CROPS if c.startswith(ref + "-")]
    inner = "".join(
        tile(c, "left:%.1fpx;top:%.1fpx;width:%.1fpx;height:%.1fpx"
                % (CROPS[c][1], CROPS[c][2],
                   CROPS[c][3] - CROPS[c][1], CROPS[c][4] - CROPS[c][2]))
        for c in ids)
    # data-clip-ok: .in keeps its 393x852 layout box under the transform,
    # so the overflow check sees a clip that is not one.
    return ('<div class="mini" data-clip-ok><div class="in">%s</div>'
            '<em>%s &middot; %d</em></div>' % (inner, label, len(ids)))


def art_board():
    minis = "".join(mini(s[:2], s[3:]) for s, _, _ in SCREENS)
    sheet_ = "".join(
        '<figure>%s<figcaption><b>%s</b><br>%s &middot; %.0f&times;%.0f pt'
        '</figcaption></figure>'
        % (tile(c), c, CROPS[c][0], CROPS[c][3] - CROPS[c][1],
           CROPS[c][4] - CROPS[c][2])
        for c in CROPS if _uri(c))
    return page(
        NAME + " - Art assets",
        '<div class="sheet"><header><h1>Art assets</h1>'
        '<p>%d crops, cut from the four frames at the pt boxes in '
        '<code>crops.json</code> and placed back at the same numbers. Nothing '
        'here is generated and nothing here is redrawn: on 03 the Winner Board '
        'panel covers the medals behind it, so the medals cannot be recovered '
        'from any frame in the clip.</p></header>'
        '<p class="rule">every screen with its chrome removed, so what is left '
        'is exactly what is an image</p>'
        '<div class="minis">%s</div>'
        '<h2>Every crop, in manifest order</h2>'
        '<div class="cs">%s</div></div>'
        % (len(CROPS), minis, sheet_),
        ART_BOARD_CSS + "\n" + art_classes())


# --------------------------------------------------------------- screens ----
# Every `top` below is bt() applied to a measured baseline, so the numbers in
# the source read as the numbers in probes.json.
SCREEN_CSS = """.c{position:absolute;left:0;width:var(--x-w);text-align:center;
  letter-spacing:var(--x-tracking)}
.eyebrow{font:var(--x-t-eyebrow)}
.title{font:var(--x-t-title)}
.sub{font:var(--x-t-sub);color:var(--x-ink-2)}

.track{position:absolute;left:12.7px;top:769.5px;width:365.8px;height:55.3px;
  border-radius:var(--x-r-pill);background:var(--x-track)}
.pill{position:absolute;top:var(--x-nav-y);height:var(--x-nav-h);
  border-radius:var(--x-r-pill);color:var(--x-ink-inv)}
.pill.back{left:12.7px;width:84.5px;background:var(--x-pill-grey)}
.pill.back.on{background:var(--x-pill-dark)}
.pill.next{left:295.5px;width:83px;background:var(--x-pill-dark)}
.pill svg{position:absolute;left:50%;top:21.9px;margin-left:-9.35px;
  display:block;width:18.7px;height:14.2px}

.btn{position:absolute;left:12.7px;width:352.8px;border-radius:var(--x-r-pill)}
.btn1{top:560.5px;height:56.1px;background:var(--x-btn-dark)}
.btn2{top:623.1px;height:56.1px;background:var(--x-bg);
  border:1.5px solid var(--x-hairline)}
.lbl{position:absolute;left:12.7px;width:352.8px;text-align:center;
  letter-spacing:var(--x-tracking);
  font:var(--x-t-btn)}
.legal{font:var(--x-t-legal);color:var(--x-ink-2)}
.legal b{font-weight:600;color:var(--x-ink)}"""

ARROW = ('<svg viewBox="0 0 18.7 14.2" fill="none" stroke="currentColor"'
         ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
         '<path d="M1.4 7.1H17.3M10.9 1.4 17.3 7.1 10.9 12.8"/></svg>')
ARROW_BACK = ARROW.replace('<svg ', '<svg transform="scale(-1,1)" ')


def blk(cls, top, html):
    return '<div class="c %s" style="top:%.2fpx">%s</div>' % (cls, top, html)


def nav(ref):
    """The paged nav. Back is disabled on 01 -- there is no page behind it --
    and enabled from 02 on, where it takes the same fill as next: the two
    pills profile identically down c2 col 55 and col 336."""
    return ('<div class="track"></div>%s'
            '<div class="pill back%s">%s</div><div class="pill next">%s</div>'
            % (art(ref + "-path"), "" if ref == "01" else " on",
               ARROW_BACK, ARROW))


def onboarding(ref, eyebrow, title, sub):
    """Screens 01-03: hero card, three type levels, the paged nav."""
    return ('<div class="phone">%s%s%s%s%s%s%s</div>'
            % (statusbar(), art(ref + "-hero"),
               blk("eyebrow", bt(584.9, 15, 18), eyebrow),
               blk("title", bt(629.8, 36, 42.3), title),
               blk("sub", bt(699.3, 15, 18.7), sub),
               nav(ref), home()))


def s01():
    return page(NAME + " - Learn", onboarding(
        "01", "SMART LEARNING",
        "Learn Anything,<br>One Card at a Time",
        "Explore different categories and build your<br>vocabulary"), SCREEN_CSS)


def s02():
    return page(NAME + " - Challenges", onboarding(
        "02", "COMPETE &amp; ACHIEVE",
        "Take on Challenges,<br>Earn Your Medals",
        "Complete challenges and collect medals as<br>you learn and improve."),
        SCREEN_CSS)


def s03():
    return page(NAME + " - Rankings", onboarding(
        "03", "GLOBAL RANKING",
        "Climb the Global<br>Rankings",
        "Earn medals, improve your rank, and compete<br>"
        "with learners from around the world."), SCREEN_CSS)


def s04():
    # The two buttons are 12.7 from the left edge and 27.5 from the right, so
    # they centre on 189.1 while every other block on the screen centres on
    # 196.4. That is the source's, not this board's: see the README.
    return page(NAME + " - Master", '<div class="phone">%s%s%s%s'
                '<div class="btn btn1"></div><div class="btn btn2"></div>'
                '<div class="lbl" style="top:%.2fpx;color:var(--x-ink-inv)">Create Account</div>'
                '<div class="lbl" style="top:%.2fpx;color:var(--x-ink-mid)">Login</div>'
                '%s%s</div>'
                % (statusbar(), art("04-cup"),
                   blk("title", bt(498.9, 36, 42.3), "Ready to Master It?"),
                   blk("sub", bt(525.8, 15, 18.7),
                       "Create an account and start learning"),
                   bt(595.2, 20, 24), bt(657.3, 20, 24),
                   blk("legal", bt(779.5, 13, 17.2),
                       "By continuing, you agree to our <b>Terms of Use</b> and<br>"
                       "<b>Privacy Policy</b>"),
                   home()), SCREEN_CSS)


SCREENS = [("01-learn", "Learn", s01), ("02-challenges", "Challenges", s02),
           ("03-rankings", "Rankings", s03), ("04-master", "Master", s04)]

# ------------------------------------------------- Phase 5: the reference ----
# Each frame, cropped to the phone's screen window and otherwise unretouched,
# on its own board. The caption is what makes the replica auditable later.
REF_CSS = """.rboard{width:430px;height:932px;background:#151311;border-radius:20px;
  padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rboard h1{font:600 14px/18px var(--x-font);letter-spacing:-.1px}
.rboard p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rboard .shot{margin-top:9px;display:flex;justify-content:center}
.rboard img{height:844px;width:auto;display:block;border-radius:6px}
.rboard .near{color:#F1CD8A}"""

# (screen file, label, capture, note)
REFS = [("01-learn",      "Learn",      "c1", "exact - t=1.50s"),
        ("02-challenges", "Challenges", "c2", "exact - t=6.60s"),
        ("03-rankings",   "Rankings",   "c3", "exact - t=12.00s"),
        ("04-master",     "Master",     "c4", "exact - t=17.60s")]


def ref_boards():
    """One board per parked frame. A fresh clone has no captures -- they are
    third-party and gitignored -- so this yields nothing and the reference row
    drops out of layout.json rather than shipping four broken images."""
    for name, label, cap, note in REFS:
        f = REFS_DIR / (cap + ".png")
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        cls = "" if note.startswith("exact") else ' class="near"'
        body = ('<div class="rboard"><h1>%s &mdash; reference</h1>'
                '<p>%s &middot; video frame &middot; 525&times;1140 @1.337x &middot; '
                '<span%s>%s</span></p>'
                '<div class="shot"><img src="%s" alt="%s"></div></div>'
                % (label, name, cls, note, uri, label))
        yield "ref-" + name, page(NAME + " - reference: " + label, body, REF_CSS)


# ------------------------------------------------------------------ run ----
cut()
write("00-design-tokens", token_board())
for name, html in evidence_boards():
    write(name, html)
write(ART_BOARD, art_board())
for name, _, fn in SCREENS:
    write(name, fn())
for name, html in ref_boards():
    write(name, html)

LAYOUT = {
 "name": PAGE_NAME,
 "rows": [
  {"title": "Foundations",
   "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
            + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]
            + [{"file": ART_BOARD, "label": "Art assets"}]},
  {"title": "Screens", "numbered": True,
   "files": [{"file": n, "label": l} for n, l, _ in SCREENS]},
  # Same order as the row above: the canvas lays every row out from x = 0 at
  # one pitch, so item N here lands column-for-column under item N up there.
  # The row stays in layout.json even on a clone with no captures, where the
  # boards it names do not exist; the canvas skips an entry it cannot find,
  # and keeping the row means the file does not go dirty on regeneration.
  {"title": "Source of truth: video frames", "numbered": True,
   "files": [{"file": "ref-" + n, "label": l} for n, l, _, _ in REFS]},
 ],
}
(OUT / "layout.json").write_text(json.dumps(LAYOUT, indent=2) + "\n")
print("layout.json", len(LAYOUT["rows"]), "rows")
print("\nnext: refkit tokens", OUT)
