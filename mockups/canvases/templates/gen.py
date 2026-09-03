"""The Templates board, and the skeleton for every new iPhone board.

Open it on the canvas to see the four boards a clone run always produces --
design tokens, the evidence table, one phone screen, one parked reference --
built from placeholder values so the shapes are visible before anything has
been measured, plus that same screen dropped into a photoreal device shell.
To start a real board, copy the folder and edit this file:

    cp -r mockups/canvases/templates mockups/canvases/<slug>
    python3 mockups/canvases/<slug>/gen.py

The copy regenerates itself in place, byte-identical, from anywhere: every
path in here resolves against __file__.

Change, in this order:

    NAME       the board's name, printed on the boards themselves.
    PAGE_NAME  the canvas page name; drop the "(example) " prefix.
    P          the token prefix, one to three letters ("n" -> --n-bg).
    TOKENS     every row: the value *and* the evidence. The :root block and the
               evidence table are both generated from this one list, so a value
               cannot drift from the evidence behind it and a token cannot ship
               without one. A row you cannot defend is not a token; delete it.
    SCREENS    one entry per screen, each returning body HTML.
    REFS       one entry per capture, in the same order as SCREENS, so the
               canvas parks each reference directly under its mockup.

Already measured, and not to be re-derived per board: the 393 x 852 pt phone
at 1pt = 1px -- iPhone 14 Pro / 15 / 15 Pro / 16, per Apple's HIG layout
table -- its 52pt corners and bezel, the 54pt status bar with its 125 x 36
island at top 11, the three status glyphs, the 139 x 5 home indicator at
bottom 8, and the seven device shells the 02-08 boards wrap that screen in.
Those shells are iPhone 17 Pro and iPhone 16 Pro art; the screen they frame was
drawn at 390 x 844 and is scaled here to 393 x 852. See the comment above
SHELLS for why, for what the colourways actually are, and for the numbers each
board states on its face.

The 52pt corner is a circular stand-in, not the device's own number. Apple
publishes no display radius anywhere; UIScreen._displayCornerRadius reports
55.0 pt on every 393 x 852 device, and that corner is continuous
(CALayerCornerCurve), which border-radius cannot draw. refkit's --crop-phone
masks the same 52, so the mask and the frame agree.

Both the status bar and the home indicator take a colour, because iOS picks
one against the wallpaper. Measure it per screen; white is a guess.

Artboards are output. Never hand-edit the .html -- edit this file and re-run.
"""
import base64, json
from pathlib import Path

OUT = Path(__file__).resolve().parent
A = json.load(open(OUT / "assets.json"))   # the device shell, as a data: URI

NAME = "Templates"
# The canvas page name. This folder ships as an example, hence the prefix; a real board
# is just its NAME.
PAGE_NAME = "(example) " + NAME
P = "x"          # token prefix: --x-bg, --x-ink, --x-t-row

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Phase 2 order: font, then surface -> line ->
# ink -> accent, then radii, type, metrics. Values are written with the
# placeholder prefix --x- throughout this file and rewritten to P on the way
# out, so the CSS below stays readable instead of %s-riddled.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "PLACEHOLDER - platform stack; confirm with refkit font on the largest title"),

 ("Surface", "bg",       "#FFFFFF",         "PLACEHOLDER - flat-fill census, page background"),
 ("Surface", "card",     "#F6F6F7",         "PLACEHOLDER - flat-fill census inside a card"),
 ("Surface", "scrim",    "rgba(0,0,0,.20)", "PLACEHOLDER - native capture over a photo"),

 ("Line", "hairline",    "#E4E4E6",         "PLACEHOLDER - refkit hairline solve, list divider"),
 ("Line", "border",      "#D9D9DC",         "PLACEHOLDER - refkit hairline solve, card outline"),

 ("Ink", "ink",          "#111113",         "PLACEHOLDER - ink core of a title, darkest 2%"),
 ("Ink", "ink-2",        "#6B6B70",         "PLACEHOLDER - ink core of a subtitle"),
 ("Ink", "ink-3",        "#9B9BA1",         "PLACEHOLDER - ink core of a caption"),
 ("Ink", "ink-inv",      "#FFFFFF",         "PLACEHOLDER - ink core on the accent fill"),

 ("Accent", "accent",    "#007AFF",         "PLACEHOLDER - mode of a button core"),
 ("Accent", "danger",    "#FF3B30",         "PLACEHOLDER - mode of a destructive label core"),

 ("Radius", "r-field",   "10px",            "PLACEHOLDER - refkit bbox on a search field corner"),
 ("Radius", "r-card",    "14px",            "PLACEHOLDER - refkit bbox on a card corner"),
 ("Radius", "r-sheet",   "20px",            "PLACEHOLDER - refkit bbox on the sheet corner"),
 ("Radius", "r-pill",    "999px",           "by construction, not measured"),
 ("Radius", "r-phone",   "52px",            "circular stand-in for the 55pt continuous display corner"),

 ("Type", "t-title",     "700 28px/34px var(--x-font)", "PLACEHOLDER - refkit bands on the title"),
 ("Type", "t-head",      "600 17px/22px var(--x-font)", "PLACEHOLDER - refkit bands on a section header"),
 ("Type", "t-row",       "400 17px/22px var(--x-font)", "PLACEHOLDER - refkit bands on a list row"),
 ("Type", "t-note",      "400 13px/16px var(--x-font)", "PLACEHOLDER - refkit bands on a caption"),
 ("Type", "t-time",      "590 17px/22px var(--x-font)", "iOS status bar clock"),

 ("Metrics", "w",        "393px",           "iPhone 15/16 logical width"),
 ("Metrics", "h",        "852px",           "iPhone 15/16 logical height"),
 ("Metrics", "status",   "54px",            "iOS status bar, Dynamic Island devices"),
 ("Metrics", "gutter",   "20px",            "PLACEHOLDER - refkit scan on the left inset"),
 ("Metrics", "row",      "44px",            "PLACEHOLDER - refkit bands pitch on the list"),
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


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:var(--x-t-head);margin-bottom:2px}
header p{font:var(--x-t-note);color:var(--x-ink-3);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-3);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-border)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-card);border:1px solid var(--x-border)}
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
                '<p>Every value below is a placeholder. Replace each one, and its '
                'evidence row, before the board means anything.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, type_, met), SHEET)


EV_ROWS = 40   # rows that fit the 478 x 980 box; the table splits past this


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
SCREEN_CSS = """.pad{position:absolute;left:var(--x-gutter);right:var(--x-gutter);
  top:calc(var(--x-status) + 10px)}
.pad h1{font:var(--x-t-title);margin-bottom:14px}
.r{height:var(--x-row);display:flex;align-items:center;justify-content:space-between;
  font:var(--x-t-row);border-bottom:1px solid var(--x-hairline)}
.r span{font:var(--x-t-note);color:var(--x-ink-3)}"""


def screen_body(island=True):
    """Replace me. An empty screen, to prove the frame and the tokens are wired.

    Body only, no frame, so the same screen can go in the CSS bezel or the
    photoreal shell without being written twice.
    """
    return ('%s<div class="pad"><h1>Screen title</h1>'
            '<div class="r">First row<span>Detail</span></div>'
            '<div class="r">Second row<span>Detail</span></div>'
            '<div class="r">Third row<span>Detail</span></div></div>%s'
            % (statusbar(island=island), home()))


def demo():
    return page(NAME + " - Screen",
                '<div class="phone">%s</div>' % screen_body(), SCREEN_CSS)


# ----------------------------------------------------- the device shells ----
# The same screen inside seven phones from one Figma community file ("iPhone
# 16 / 17 Free Mockup"), in two sections: three iPhone 17 Pro colourways and
# four iPhone 16 Pro ones. The art is decorative; the geometry under it is not.
# Every one of the seven is drawn on identical geometry, so one mapping serves
# them all. Measured off the exports at 2x, where 6 px = 1 pt, and confirmed
# against the file's own node metadata:
#
#   art 1300 x 2642 units, screen window at (65, 55) sized 1170 x 2532
#   window corner 164 units = 54.67 pt, and a true circle: rmse 0.59 px over
#   303 rows, so no squircle correction is earned at this size
#   camera node 370 x 108 units = 123.33 x 36.00 pt at top 13.33, centred
#
# WHICH PHONE THIS IS. The art is a 17 Pro and a 16 Pro. The *screen artboard*
# in both is neither: 1170 x 2532 px at @3x is 390 x 844 pt, the iPhone
# 12/13/14 size, while both real phones are 1206 x 2622 px = 402 x 874 pt. The
# designer drew new bodies around a screen frame that was never resized. So
# the window here is scaled to exactly 393 x 852, the size this repo is built
# on, and every screen drops in unchanged: a 0.18% non-uniform stretch of
# decoration. Each board states all three numbers on its face. Rendering at a
# true 402 x 874 would be more faithful and would break every screen in this
# repo.
#
# WHICH COLOUR THIS IS. Not what the layer says. The 17 Pro board the file
# calls "space black" has a #EE610E rail, and is cosmic orange; the 16 Pro one
# it also calls "space black" has a #DCBEA4 rail, and is desert titanium. Both
# are named here for what they render as. The 16 Pro's fourth is stranger
# still: it is blue titanium, an iPhone 15 Pro finish, sitting where Apple's
# own line-up has black titanium. Kept and labelled, not quietly renamed.
#
# The shell is drawn *over* the screen, so its bezel masks the screen's corners
# and the two cannot disagree about where the phone ends. Everything inside the
# window is punched to alpha *except* the Dynamic Island, which is hardware and
# stays: eroded 2px first, so the pill's rim -- anti-aliased against the art's
# own wallpaper -- cannot fringe onto the screen underneath. That island is
# 124.3 x 36.3 pt at top 13.5 once scaled, against the 125 x 36 at top 11 the
# CSS frame draws. It sits where the art's camera housing is, not where we
# would put it.
#
# shellbuild.py, next to this file, turns an export into one of those punched
# shells and carries the node ids to re-export from.
SHELL_W, SHELL_H = 436.67, 889.01

DEVICE_CSS = """body{padding:16px 20px 0;display:block}
.wrap{display:flex;flex-direction:column;align-items:center}
.device{position:relative;flex:none;width:436.67px;height:889.01px}
.dscreen{position:absolute;left:21.83px;top:18.51px;width:var(--x-w);height:var(--x-h);
  border-radius:55.09px;overflow:hidden;background:var(--x-bg);color:var(--x-ink)}
.dshell{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
.cap{margin-top:8px;width:436.67px;text-align:center;font:var(--x-t-note);color:var(--x-ink-3)}
.cap b{font:var(--x-t-note);font-weight:600;color:var(--x-ink)}"""

# One row per model, in the order the boards are numbered. The key is both the
# assets.json key and the tail of the file name, so the three cannot drift.
MODELS = [("iPhone 17 Pro", ["cosmic-orange", "deep-blue", "silver"]),
          ("iPhone 16 Pro", ["blue-titanium", "natural-titanium",
                             "white-titanium", "desert-titanium"])]

# Only where the board would otherwise assert something untrue about the phone.
NOTES = {"blue-titanium": "Blue titanium is a 15 Pro finish, not a 16 Pro one."}

# (file, label, key, model), numbered 02 upward across both models
SHELLS, _n = [], 2
for _model, _keys in MODELS:
    SHELLS.append((_model, [("%02d-device-%s" % (_n + _i, _k),
                             _k.replace("-", " ").capitalize(), _k, _model)
                            for _i, _k in enumerate(_keys)]))
    _n += len(_keys)


def device(body, key, label, model):
    short, colour = model.replace("iPhone ", ""), label.lower()
    note = NOTES.get(key)
    return ('<div class="wrap"><div class="device">'
            '<div class="dscreen">%s</div>'
            '<img class="dshell" alt="%s %s shell" src="%s"></div>'
            '<p class="cap"><b>%s</b> &middot; %s<br>'
            'Art is a %s; its screen artboard is 390 &times; 844 pt. Shown here '
            'at 393 &times; 852 so this repo&rsquo;s screens drop in. '
            'A real %s is 402 &times; 874.%s</p></div>'
            % (body, colour, model, A[key], model, colour, short, short,
               "<br>" + note if note else ""))


def shell_board(key, label, model):
    return page(NAME + " - " + model + ": " + label.lower(),
                device(screen_body(island=False), key, label, model),
                SCREEN_CSS + "\n" + DEVICE_CSS)


SCREENS = [("01-screen", "Screen", demo)]

# ------------------------------------------------- Phase 5: the reference ----
# Each capture, unretouched and with its attribution watermark intact, on its
# own board. Swap PLACEHOLDER_SHOT for the real base64 data: URI and keep the
# rest: the caption is what makes the replica auditable a month from now.
REF_CSS = """.rboard{width:430px;height:932px;background:#151311;border-radius:20px;
  padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rboard h1{font:600 14px/18px var(--x-font);letter-spacing:-.1px}
.rboard p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rboard .shot{margin-top:9px;display:flex;justify-content:center}
.rboard img{height:844px;width:auto;display:block;border-radius:6px}
.rboard .near{color:#F1CD8A}"""

PLACEHOLDER_SHOT = ("data:image/svg+xml;base64," + base64.b64encode(
    b'<svg xmlns="http://www.w3.org/2000/svg" width="393" height="852">'
    b'<rect width="393" height="852" fill="#221F1C"/>'
    b'<rect x="8.5" y="8.5" width="376" height="835" rx="12" fill="none"'
    b' stroke="#4A443E" stroke-width="1" stroke-dasharray="6 5"/>'
    b'<text x="196" y="420" fill="#6E665D" text-anchor="middle"'
    b' font-family="monospace" font-size="13">base64 capture goes here</text>'
    b'</svg>').decode())

# (screen file, label, note). The note is not decoration: state where a
# reference is a *near* match -- a toast, another scroll position, one row
# label off -- and never let a near-match pass as exact.
REFS = [("01-screen", "Screen", "PLACEHOLDER - no capture yet")]


def ref_boards():
    for name, label, note in REFS:
        cls = "" if note.startswith("exact") else ' class="near"'
        body = ('<div class="rboard"><h1>%s &mdash; reference</h1>'
                '<p>%s &middot; source &middot; 1179&times;2556 @3x &middot; '
                '<span%s>%s</span></p>'
                '<div class="shot"><img src="%s" alt="%s"></div></div>'
                % (label, name, cls, note, PLACEHOLDER_SHOT, label))
        yield "ref-" + name, page(NAME + " - reference: " + label, body, REF_CSS)


# ------------------------------------------------------------------ run ----
write("00-design-tokens", token_board())
for name, html in evidence_boards():
    write(name, html)
for name, _, fn in SCREENS:
    write(name, fn())
for name, html in ref_boards():
    write(name, html)
for _model, _row in SHELLS:
    for name, label, key, model in _row:
        write(name, shell_board(key, label, model))

LAYOUT = {
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
   "files": [{"file": "ref-" + n, "label": l} for n, l, _ in REFS]},
] + [
  {"title": "Device shells: " + m + " art, 393 x 852 pt window",
   "files": [{"file": n, "label": l} for n, l, _, _ in row]} for m, row in SHELLS],
}
(OUT / "layout.json").write_text(json.dumps(LAYOUT, indent=2) + "\n")
print("layout.json", len(LAYOUT["rows"]), "rows")
print("\nnext: python3 tools/refkit.py tokens", OUT)
