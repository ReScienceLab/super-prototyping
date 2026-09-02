"""The app-screens half of mockups/canvases/apple-wallet/, boards 01-02.

Source: the Figma community file "Apple Wallet . iOS", NOU4nWNs63L4QX6YCBSejL,
393pt mode (the file also ships a 430pt column; this repo's frame is 393). Node
ids per board are in README.md.

Every number here came out of the file, not out of a screenshot: the published
variables for the palette and the metrics, the file's own type styles for the
ramp, and node boxes for the geometry. The PNG renders under assets/refs/ were
only used to confirm them, to settle the two composites the variables give as
alpha over an unnamed ground, and to catch the one place where the component
tree and the render disagree (the home indicator, below).

No letter-spacing anywhere, on purpose. The type styles carry tracking (+0.40
at 34pt, -0.43 at 17pt and so on) but SF Pro already applies it through its
optical size axis, so Figma's own PNG export shows none of it on top. Same
finding as apple-settings/gen.py and apple-photos/README.md record.

Light and dark are one board each from one builder: .dark on the phone swaps
the four variables the file redefines for its dark screens and nothing else.

Artboards are output. Edit this file, never the HTML.

    python3 mockups/canvases/apple-wallet/gen.py
"""
import base64
import os

OUT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(OUT, "assets", "screens")
REFS = os.path.join(OUT, "assets", "refs")


def icon(name, style="", cls=""):
    """Inline one glyph lifted by apple-calendar/iconkit.py. Its viewBox IS its
    ink box, so a left/top/width/height off the Figma frame places it exactly."""
    svg = open(os.path.join(ASSETS, "icons", name + ".svg"), encoding="utf-8").read()
    return svg.replace("<svg ", '<svg preserveAspectRatio="none" class="%s" style="%s" '
                       % (cls, style), 1)


def at(name, x, y, w, h, cls=""):
    return icon(name, "left:%gpx;top:%gpx;width:%gpx;height:%gpx" % (x, y, w, h), cls)


def img(name):
    """assets/images/<name> as a data: URI. The iframe is sandboxed, so a board
    that wants a bitmap has to carry it. These are the file's own pass art and
    promo illustration at 3x of the slot they render in; the two photographic
    passes are JPEG because a gradient costs four times as much as PNG."""
    ext = name.rsplit(".", 1)[1]
    with open(os.path.join(ASSETS, "images", name), "rb") as f:
        return "data:image/%s;base64,%s" % (
            "jpeg" if ext == "jpg" else ext, base64.b64encode(f.read()).decode())


# ---------------------------------------------------------------- tokens

# (group, name, light, dark, evidence). One row per token, and the :root
# block, the .dark block, the token board and the evidence boards are all
# generated from it, so a value cannot drift from the evidence behind it.
#
# "Figma variable X" means the file's own published variable, read with
# get_variable_defs on a light frame and on a dark one; that is the primary
# source here, not a screenshot. Where a variable is an alpha fill the row
# keeps the alpha and says what it composites over, and the sample that
# confirms the composite.
TOKENS_SPEC = [
 ("", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif', "",
  'every type style in the file is Font(family: "SF Pro"); this is the '
  'platform stack that resolves to it on macOS and iOS'),

 ("Surface", "bg", "#FFFFFF", "#000000",
  "Figma variable bg/primary-base: the page, and (because it is the exact "
  "inverse of label/primary) the glyph inside an action button"),
 ("Surface", "black", "#000000", "",
  "Figma variable system/black: the Dynamic Island, one value in both themes, "
  "which is why the island is invisible on the dark boards"),
 ("Surface", "white", "#FFFFFF", "",
  "Figma variable system/white: the promo headline, its body copy and the GET "
  "pill. They stay white in dark because the card under them does not change"),
 ("Surface", "sep", "rgba(60,60,67,.3608)", "rgba(84,84,88,.651)",
  "Figma variable separator/non-opaque #3C3C435C / #545458A6: the 1pt inside "
  "border on every pass. Over the white Apple pass it renders #B9B9BB / "
  "#909092, which is what ref-01 and ref-d01 sample at 2x"),
 ("Surface", "blur", "rgba(255,255,255,.698)", "rgba(40,40,42,.941)",
  "Figma variable ui/background-blur #FFFFFFB2 / #28282AF0, behind Material "
  "Blur (BACKGROUND_BLUR radius 50). Over the page it renders #FFFFFF / "
  "#262627 in the footer band, which is what ref-01 and ref-d01 sample at 2x; "
  "in light it is therefore invisible"),
 ("Surface", "promo", "#C7BCA9", "",
  "raw hex on the Get Started card, not a published variable and not "
  "redefined in dark: ref-02 and ref-d02 both sample #C7BCA9 at 2x"),
 ("Surface", "promo2", "#B19F8E", "",
  "raw hex on the card's bottom band, likewise one value in both themes"),

 ("Ink", "ink", "#000000", "#FFFFFF",
  "Figma variable label/primary: the Wallet title, the clock, the action "
  "buttons, and the home indicator at 60%"),
 ("Ink", "blue", "#007BFE", "#0385FF",
  "Figma variable ui/accent: the GET label, the only accent on either screen"),

 ("Radius", "r-phone", "52px", "",
  "the repo's frame convention, not a value in the file: its screens are "
  "square-cornered 393 x 852 artboards"),
 ("Radius", "r-card", "11px", "",
  "Figma variable app-wallet/card-corner: every pass"),
 ("Radius", "r-promo", "14px", "",
  "Figma corner radius on the Get Started card, which also clips its "
  "illustration and its bottom band"),
 ("Radius", "r-pill", "100px", "",
  "Figma corner radius on the Dynamic Island, the home indicator, the two "
  "action buttons and the GET pill"),

 ("Type", "t-b15", "590 15px/20px var(--aw-font)", "",
  "Figma type style SemiBold/15pt: the GET label"),
 ("Type", "t-r17", "400 17px/22px var(--aw-font)", "",
  "Figma type style Regular/17pt: the promo body copy"),
 ("Type", "t-b17", "590 17px/22px var(--aw-font)", "",
  "Figma type style SemiBold/17pt: the status-bar clock"),
 ("Type", "t-b28", "700 28px/34px var(--aw-font)", "",
  "Figma type style Bold/28pt: the promo headline"),
 ("Type", "t-b34", "700 34px/41px var(--aw-font)", "",
  "Figma type style Bold/34pt: the Wallet title"),

 ("Metrics", "w", "393px", "", "Figma variable screen/width in the 393 mode"),
 ("Metrics", "h", "852px", "", "Figma variable screen/height in the 393 mode"),
 ("Metrics", "sb", "54px", "", "node box of the Status Bar frame"),
 ("Metrics", "header", "167px", "",
  "node box of .Wallet > Header: the 54pt status bar over a 113pt Title "
  "Container (pt-52 pb-20 px-18)"),
 ("Metrics", "btn", "34px", "",
  "node box of the Orders and Add buttons, which is also the Title row height"),
 ("Metrics", "margin", "17px", "",
  "node box of a pass inside the 393 frame: 17 either side of 359"),
 ("Metrics", "pad", "21px", "",
  "px-21 on the Get Started Section, so the promo card is inset 21 not 17"),
 ("Metrics", "card-w", "359px", "", "Figma variable app-wallet/card-width"),
 ("Metrics", "card-h", "226px", "", "Figma variable app-wallet/card-height"),
 ("Metrics", "card-pitch", "49px", "",
  "Figma variable app-wallet/card-between is -177, so a 226pt pass sits 49 "
  "below the one above it and covers all but its top 49"),
 ("Metrics", "illo-w", "351px", "",
  "Figma variable app-wallet/illustration-width, also the promo card width"),
 ("Metrics", "illo-h", "234px", "",
  "Figma variable app-wallet/illustration-height"),
 ("Metrics", "promo-h", "454px", "",
  "node box of the Get Started card: 142 text + 234 illustration + 78 band"),
 ("Metrics", "band", "78px", "",
  "node box of the card's Bottom: py-17 around a 44pt two-line paragraph"),
 ("Metrics", "home", "34px", "", "node box of the Home Bar frame"),
 ("Metrics", "home-w", "140px", "",
  "Figma variable homebar/width in the 393 mode (it is 154 in the 430 mode)"),
 ("Metrics", "foot-w", "430px", "",
  "node box of the .Wallet > Footer instance, which kept its 430pt width "
  "inside a 393pt frame, which is why the home indicator is off centre; the "
  "folder README has the whole story"),
 ("Metrics", "island-w", "126px", "", "node box of the Dynamic Island"),
 ("Metrics", "island-h", "37px", "", "node box of the Dynamic Island"),
]


def _root():
    """One :root block, byte-identical in every board, and no `}` inside it:
    tools/refkit.py reads it with a non-greedy regex."""
    out, seen = [":root{"], None
    for group, name, value, _dark, _ev in TOKENS_SPEC:
        if group and group != seen:
            out.append("")
            out.append("  /* %s */" % group)
        seen = group
        out.append("  --aw-%s:%s;" % (name, value))
    return "\n".join(out) + "\n}"


def _dark():
    """Only what the file redefines. system/black, system/white and the two
    promo hexes are one value in both themes, so they are not here."""
    return ".dark{\n%s\n}" % "\n".join(
        "  --aw-%s:%s;" % (n, d) for _g, n, _v, d, _e in TOKENS_SPEC if d)


TOKENS = _root()
DARK = _dark()

BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--aw-font);background:#fff;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{width:var(--aw-w);height:var(--aw-h);position:relative;flex:none;overflow:hidden;border-radius:var(--aw-r-phone);background:var(--aw-bg);color:var(--aw-ink);outline:1px solid rgba(0,0,0,.10);box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;right:0;top:0;height:var(--aw-sb);z-index:8}
.sb .t{position:absolute;left:10px;top:18px;width:123.5px;height:22px;text-align:center;font:var(--aw-t-b17)}
.sb .island{position:absolute;left:133.5px;top:11px;width:var(--aw-island-w);height:var(--aw-island-h);border-radius:var(--aw-r-pill);background:var(--aw-black)}
.sb svg{position:absolute;display:block}"""

# 393-mode Status Bar: px-10, two flex-1 sides around the 126px island, each
# side items-center with pt-18 pb-13. Each entry is the glyph's own ink rect in
# the 393 x 852 frame. This file, apple-settings and apple-calendar all draw
# the same Status Bar component, and the three ink rects agree to three
# decimals, so cellular.svg / wifi.svg / battery.svg were re-lifted from this
# file's own export and came back byte-identical.
SB_ICONS = [("cellular", 282.598, 22.109, 19.474, 12.531),
            ("wifi", 309.076, 22.986, 16.621, 11.996),
            ("battery", 332.946, 22.993, 26.824, 12.120)]


def statusbar(time="1:47"):
    return ('<div class="sb"><div class="t">%s</div><div class="island"></div>%s</div>'
            % (time, "".join(at(*i) for i in SB_ICONS)))


# The footer is where the community file slips. .Wallet > Footer is a 430pt
# instance dropped into a 393pt frame at x 0, and the Home Bar inside it kept
# that 430pt width while the indicator itself was overridden to the 393 value
# of 140. So the indicator centres on 430, not on 393, and lands at x 145 --
# 18.5pt right of the frame's own centre. Both PNG exports show it there, so
# the boards put it there: left:50% inside a 430pt footer reproduces the defect
# by construction rather than by a magic number.
#
# The material is a flat fill, not a backdrop-filter. Nothing scrolls under
# the footer in either frame, so Figma's Material Blur composites flat --
# invisible over white in light, #262627 in dark -- and a real blur(25px) here
# only samples the bezel outside the 52pt corners and smears it back inside,
# which is 3.5 levels of damage the export does not have.
FOOT = """.foot{position:absolute;left:0;bottom:0;width:var(--aw-foot-w);height:var(--aw-home);z-index:7}
.foot .mat{position:absolute;inset:0;background:var(--aw-blur)}
.foot .bar{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:var(--aw-home-w);height:5px;border-radius:var(--aw-r-pill);background:var(--aw-ink);opacity:.6}"""


def foot():
    return ('<div class="foot"><div class="mat"></div><div class="bar"></div></div>')


def phone(body, dark=False):
    return '<div class="phone%s">%s</div>' % (" dark" if dark else "", body)


def page(title, css, body):
    return """<!DOCTYPE html>
<html lang="en">
<meta charset="utf-8">
<title>%s</title>
<style>
%s
%s
%s
%s
</style>
%s
</html>
""" % (title, TOKENS, DARK, BASE, css, body)


# ------------------------------------------------- shared: the Wallet header

# Chrome sets a glyph half a point lower than Figma does inside the same line
# box, so every text top on these two screens is written as its measured Figma
# coordinate minus 0.5: the Wallet title, the promo headline, the promo body,
# the status-bar clock, and the GET label. Rects are never shifted.
#
# GET at 15pt is the new one. apple-settings put the cutoff somewhere between
# 13pt (no shift) and 17pt (shift) without a 15pt string to test it on; this
# board has one, and it wants the shift. Each of the three was swept both ways
# against the export: 19.5 / 16.5 / 3.5 gives 0.23 mean delta, and putting all
# three back on their measured tops gives 0.48.
#
# The clock is the other one. pt-18 over a 22pt line inside a 54pt bar puts its
# Figma top at 18.5, so it is written at 18. apple-settings and apple-calendar
# shipped it at 18.5 and rendered it half a point low; both are fixed.
#
# Both screens use one .Wallet > Header: the status bar, then a Title Container
# (pt-52 pb-20 px-18) holding the 34pt title and two 34pt circular buttons.
# The buttons are label/primary, so black in light and white in dark, and each
# glyph is bg/primary-base, which is exactly their inverse.
HEADER = PHONE + "\n" + """.hd{position:absolute;left:0;top:0;width:var(--aw-w);height:var(--aw-header);z-index:6}
.hd .ti{position:absolute;left:18px;top:105.5px;font:var(--aw-t-b34)}
.hd .btn{position:absolute;top:109.5px;width:var(--aw-btn);height:var(--aw-btn);border-radius:var(--aw-r-pill);background:var(--aw-ink)}
.hd svg{position:absolute;display:block}
.hd svg.gl{color:var(--aw-bg)}"""


def header():
    return ('<div class="hd">%s<div class="ti">Wallet</div>'
            '<div class="btn" style="left:296px"></div>'
            '<div class="btn" style="left:341px"></div>%s%s</div>'
            % (statusbar(),
               at("shippingbox.fill", 304.117, 117.575, 16.842, 18.063, "gl"),
               at("plus", 351.117, 119.659, 13.696, 13.696, "gl")))


# ------------------------------------------------- 01 Cards

# Node 2:2139 (light) / 2:2140 (dark). Three passes at x 17, 359 x 226, each
# with a 1pt inside border of separator/non-opaque over its own art. The stack
# pitch is the file's own arithmetic: card-height 226 plus card-between -177.
CARDS_CSS = HEADER + "\n" + FOOT + "\n" + """.pass{position:absolute;left:var(--aw-margin);width:var(--aw-card-w);height:var(--aw-card-h);border-radius:var(--aw-r-card);overflow:hidden}
.pass img{display:block;width:100%;height:100%;object-fit:cover}
.pass::after{content:"";position:absolute;inset:0;border:1px solid var(--aw-sep);border-radius:inherit}"""

# top to bottom, which is also paint order: each pass covers the one above it.
PASSES = ["clipper.jpg", "sapphire.jpg", "apple-empty.png"]


def cards(dark=False):
    stack = "".join(
        '<div class="pass" style="top:%gpx"><img alt="" src="%s"></div>'
        % (167 + i * 49, img(f)) for i, f in enumerate(PASSES))
    return page("Apple Wallet - Cards" + (" (dark)" if dark else ""), CARDS_CSS,
                phone(header() + stack + foot(), dark))


# ------------------------------------------------- 02 Get Started

# Node 2:2157 (light) / 2:2158 (dark). One promo card at x 21 (the Section is
# px-21, not the 17 a pass gets), 351 x 454, clipped to 14: a 142pt text block
# (p-20), the 351 x 234 illustration, then a 78pt band in a second, darker hex.
# Neither hex is a published variable and neither changes in dark, so the whole
# card is identical on both boards and only the page around it inverts.
GS_CSS = HEADER + "\n" + FOOT + "\n" + """.promo{position:absolute;left:var(--aw-pad);top:var(--aw-header);width:var(--aw-illo-w);height:var(--aw-promo-h);border-radius:var(--aw-r-promo);overflow:hidden;background:var(--aw-promo);color:var(--aw-white)}
.promo h2{position:absolute;left:20px;top:19.5px;width:311px;font:var(--aw-t-b28)}
.promo>img{display:block;position:absolute;left:0;top:142px;width:var(--aw-illo-w);height:var(--aw-illo-h);object-fit:cover}
.promo .bt{position:absolute;left:0;bottom:0;width:100%;height:var(--aw-band);background:var(--aw-promo2)}
.promo .bt p{position:absolute;left:20px;top:16.5px;width:223px;font:var(--aw-t-r17)}
.promo .bt .get{position:absolute;left:263px;top:25px;width:68px;height:28px;border-radius:var(--aw-r-pill);background:var(--aw-white)}
.promo .bt .get span{position:absolute;left:19px;top:3.5px;width:30px;height:20px;text-align:center;font:var(--aw-t-b15);color:var(--aw-blue)}"""


def get_started(dark=False):
    promo = ('<div class="promo"><h2>Boarding Passes<br>and Tickets<br>'
             'All in One Place</h2><img alt="" src="%s">'
             '<div class="bt"><p>Find apps and start collecting your passes.</p>'
             '<div class="get"><span>GET</span></div></div></div>'
             % img("illustration.png"))
    return page("Apple Wallet - Get Started" + (" (dark)" if dark else ""), GS_CSS,
                phone(header() + promo + foot(), dark))


# ------------------------------------------------- foundations boards

# The two boards that carry Phase 1 and Phase 2: the token block rendered as
# itself, and the evidence behind every row of it. Both are built from
# TOKENS_SPEC, so neither can fall out of step with the :root the screens
# inline. Every swatch shows light over dark, because this board ships both.
SHEET = """body{padding:0;background:var(--aw-bg);color:var(--aw-ink)}
.sh8{width:478px;height:980px;padding:22px 24px;overflow:hidden}
h1{font:590 20px/25px var(--aw-font)}
header p{font:400 13px/16px var(--aw-font);color:#8E8E93;margin:2px 0 12px}
h2{font:590 10px/12px var(--aw-font);text-transform:uppercase;color:#8E8E93;margin:13px 0 6px}
.gr{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.sw .ch{height:24px;border-radius:5px;border:0.5px solid #C7C7CC;display:flex;overflow:hidden}
.sw .ch span{flex:1}
.sw b{display:block;margin-top:3px;font:590 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;color:#8E8E93;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rd{display:flex;gap:10px}
.rd div{text-align:center}
.rd .b{width:46px;height:26px;background:var(--aw-promo);border:0.5px solid #C7C7CC}
.rd em{display:block;margin-top:3px;font:400 8.5px/11px var(--aw-font);color:#8E8E93;font-style:normal}
.ty .tr{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding-bottom:2px;border-bottom:0.5px solid #C7C7CC}
.ty .tr span{white-space:nowrap;overflow:hidden}
.ty .tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:#8E8E93;font-style:normal;white-space:nowrap;flex:none}
.mt{columns:3;column-gap:14px;font:400 9px/13.5px ui-monospace,Menlo,monospace;color:#8E8E93}
.ev div{padding:3px 0;border-bottom:0.5px solid #C7C7CC}
.ev b{font:590 8.5px/12px ui-monospace,Menlo,monospace;color:var(--aw-blue)}
.ev i{font:400 8.5px/12px ui-monospace,Menlo,monospace;color:#8E8E93;font-style:normal}
.ev p{font:400 8px/11px var(--aw-font);color:#8E8E93}"""


def _of(group):
    return [t for t in TOKENS_SPEC if t[0] == group]


def token_board():
    """Colour, radius, type and metrics, drawn with the tokens themselves. A
    two-tone chip is a token the dark frames redefine; a flat one is a token
    that is one value in both themes."""
    sw = "".join(
        '<div class="sw"><div class="ch"><span style="background:%s"></span>'
        '%s</div><b>--aw-%s</b><i>%s</i></div>'
        % (v, '<span style="background:%s"></span>' % d if d else "", n, v)
        for g in ("Surface", "Ink") for _, n, v, d, _ in _of(g))
    rd = "".join('<div><div class="b" style="border-radius:%s"></div><em>%s</em></div>'
                 % (v, n[2:]) for _, n, v, _, _ in _of("Radius"))
    ty = "".join('<div class="tr"><span style="font:var(--aw-%s)">%s</span>'
                 '<em>%s</em></div>'
                 % (n, "Wallet" if int(v.split()[1].split("px")[0]) >= 28
                    else "Boarding Passes and Tickets", v.split(" var")[0])
                 for _, n, v, _, _ in _of("Type"))
    mt = "<br>".join("--aw-%s: %s" % (n, v) for _, n, v, _, _ in _of("Metrics"))
    return page("Apple Wallet - Design Tokens", SHEET,
                '<div class="sh8"><header><h1>Apple Wallet &middot; iOS</h1>'
                '<p>Figma NOU4nWNs63L4QX6YCBSejL, 393pt mode. A two-tone chip is a '
                'token the dark frames redefine, light half on the left &mdash; only '
                'four of them do. The type ramp is labelled with its own shorthand; '
                'every row of it is a named style in the file. The caption under a '
                'chip is its light value; evidence for all %d tokens, both themes, '
                'is on the next %d board%s.</p></header>'
                '<h2>Colour</h2><div class="gr">%s</div>'
                '<h2>Radius</h2><div class="rd">%s</div>'
                '<h2>Type</h2><div class="ty">%s</div>'
                '<h2>Metrics</h2><div class="mt">%s</div></div>'
                % (len(TOKENS_SPEC), len(list(evidence_boards())),
                   "" if len(list(evidence_boards())) == 1 else "s", sw, rd, ty, mt))


EV_ROWS = 21   # what fits the 478 x 980 box; past this the table splits


def evidence_boards():
    """The evidence table, over as many boards as it needs. It is the
    deliverable of Phase 1: split the board, never trim the rows."""
    pages = [TOKENS_SPEC[i:i + EV_ROWS] for i in range(0, len(TOKENS_SPEC), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows_ = "".join(
            '<div><b>--aw-%s</b> <i>%s%s</i><p>%s</p></div>'
            % (n, v, " / " + d if d else "", e) for _g, n, v, d, e in chunk)
        of = " %d/%d" % (i + 1, len(pages))
        yield ("00%s-evidence" % "bcdefgh"[i],
               page("Apple Wallet - Evidence" + of, SHEET,
                    '<div class="sh8"><header><h1>Evidence%s</h1>'
                    '<p>Token, then its light value and its dark override, then '
                    'where the value came from. A token with no evidence is a '
                    'guess.</p></header><div class="ev">%s</div></div>' % (of, rows_)))


# ------------------------------------------------- Phase 5: the references

# assets/refs/ref-<name>.png is the file's own PNG export of that frame at 2x,
# 786 x 1704, unretouched. They are gitignored (they are someone else's
# artwork), so a fresh clone regenerates the boards above and skips these.
REF_CSS = """.rb{width:430px;height:932px;background:#151311;border-radius:20px;padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rb h1{font:590 15px/20px var(--aw-font)}
.rb p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rb .shot{margin-top:9px;display:flex;justify-content:center}
.rb img{width:393px;height:852px;display:block;border-radius:6px}"""


def ref_boards():
    for name, label, _fn in SCREENS:
        for pre, theme in (("", "light"), ("d", "dark")):
            path = os.path.join(REFS, "ref-%s%s.png" % (pre, name))
            if not os.path.exists(path):
                continue
            with open(path, "rb") as f:
                uri = "data:image/png;base64," + base64.b64encode(f.read()).decode()
            yield ("ref-%s%s" % (pre, name),
                   page("Apple Wallet - reference: %s (%s)" % (label, theme),
                        REF_CSS,
                        '<div class="rb"><h1>%s &mdash; %s reference</h1>'
                        '<p>Figma PNG export &middot; 786&times;1704 @2x &middot; '
                        'exact frame, not a near match</p>'
                        '<div class="shot"><img alt="%s" src="%s"></div></div>'
                        % (label, theme, label, uri)))


# (file stem, caption on the canvas, builder). Both themes come from one
# builder: fn() is the light frame, fn(dark=True) the dark one.
SCREENS = [("01-cards", "Cards", cards),
           ("02-get-started", "Get Started", get_started)]


