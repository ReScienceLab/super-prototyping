"""Emit mockups/canvases/apple-settings/ from the Figma measurements.

Source: the Figma community file "Apple Settings . iOS", SAJX6z3s8bHctuZyvOSN8i,
393pt mode (the file also ships a 430pt column; this repo's frame is 393). Node
ids per board are in README.md.

Every number here came out of the file, not out of a screenshot: the published
variables for the palette and the metrics, the file's own type styles for the
ramp, and node boxes for the geometry. The PNG renders under assets/refs/ were
only used to confirm them and to settle the two composites the variables give
as alpha over an unnamed ground (the nav material and the toggle track).

No letter-spacing anywhere, on purpose. The type styles carry tracking (-0.43
at 17pt, -0.08 at 13pt and so on) but SF Pro already applies it through its
optical size axis, so Figma's own PNG export shows none of it on top. Same
finding as apple-photos/README.md and apple-calendar/gen.py record.

Light and dark are one board each from one builder: .dark on the phone swaps
the nine variables the file redefines for its dark screens and nothing else.

Artboards are output. Edit this file, never the HTML.

    python3 mockups/canvases/apple-settings/gen.py
"""
import base64
import json
import os

OUT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(OUT, "assets")


def icon(name, style="", cls=""):
    """Inline one glyph lifted by iconkit.py. Its viewBox IS its ink box, so a
    left/top/width/height off the Figma frame places it exactly."""
    svg = open(os.path.join(ASSETS, "icons", name + ".svg"), encoding="utf-8").read()
    return svg.replace("<svg ", '<svg preserveAspectRatio="none" class="%s" style="%s" '
                       % (cls, style), 1)


def at(name, x, y, w, h, cls=""):
    return icon(name, "left:%gpx;top:%gpx;width:%gpx;height:%gpx" % (x, y, w, h), cls)


def img(name):
    """assets/images/<name>.png as a data: URI. The iframe is sandboxed, so a
    board that wants a bitmap has to carry it. These are the file's own app
    icons, downscaled to 87px (3x of the 29pt slot they render in)."""
    with open(os.path.join(ASSETS, "images", name + ".png"), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


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

 ("Surface", "bg", "#F2F2F7", "#000000",
  "Figma variable grouped-bg/primary-base: the ground a grouped list sits on"),
 ("Surface", "card", "#FFFFFF", "#1C1C1E",
  "Figma variable bg/primary-elevated: every list card"),
 ("Surface", "black", "#000000", "",
  "Figma variable system/black: the Dynamic Island, one value in both themes "
  "(which is why the island is invisible on the dark boards)"),
 ("Surface", "white", "#FFFFFF", "",
  "Figma variable system/white: the toggle knob, light in both themes"),
 ("Surface", "sep", "#C7C7CC", "#464649",
  "Figma variable system/grey3: row dividers and the nav rule"),
 ("Surface", "track", "rgba(118,118,128,.1216)", "rgba(118,118,128,.2392)",
  "Figma variable fill/tertiary #7676801F / #7676803D: the off toggle track. "
  "Over the card it renders #EEEEEF / #313136, which is what ref-02 and "
  "ref-d02 sample at 2x"),
 ("Surface", "blur", "rgba(255,255,255,.698)", "rgba(40,40,42,.941)",
  "Figma variable ui/background-blur #FFFFFFB2 / #28282AF0, behind Material "
  "Blur (BACKGROUND_BLUR radius 50). Over the page ground it renders #FBFBFC "
  "/ #262627, which is what the Developer nav band samples at 2x"),

 ("Ink", "ink", "#000000", "#FFFFFF",
  "Figma variable label/primary: row labels, the large title, the clock, the "
  "home indicator"),
 ("Ink", "grey", "#8E8E93", "",
  "Figma variable system/grey: section headers and section help text, one "
  "value in both themes (confirmed on ref-d02)"),
 ("Ink", "grey2", "#AFB0B4", "#636366",
  "Figma variable system/grey2: the sign-in avatar glyph"),
 ("Ink", "blue", "#007BFE", "#0385FF",
  "Figma variable ui/accent: the sign-in link, the action rows, the checkmark"),
 ("Ink", "green", "#31C859", "#2DD257",
  "Figma variable system/green: the on toggle track"),

 ("Radius", "r-phone", "52px", "",
  "the repo's frame convention, not a value in the file: its screens are "
  "square-cornered 393 x 852 artboards"),
 ("Radius", "r-card", "10px", "",
  "Figma corner radius on every list card"),
 ("Radius", "r-logo", "6px", "",
  "Figma corner radius on the 29pt app icon in a list row"),
 ("Radius", "r-pill", "100px", "",
  "Figma corner radius on the Dynamic Island, the home indicator, the toggle "
  "and its knob"),

 ("Type", "t-r13", "400 13px/16px var(--as-font)", "",
  "Figma type style Regular/13pt; Uppercase/13pt is the same style with "
  "text-transform on top"),
 ("Type", "t-r17", "400 17px/22px var(--as-font)", "",
  "Figma type style Regular/17pt: every row label"),
 ("Type", "t-b17", "590 17px/22px var(--as-font)", "",
  "Figma type style SemiBold/17pt: the nav title and the status-bar clock"),
 ("Type", "t-b34", "700 34px/41px var(--as-font)", "",
  "Figma type style Bold/34pt: the large Settings title"),

 ("Metrics", "w", "393px", "", "Figma variable screen/width in the 393 mode"),
 ("Metrics", "h", "852px", "", "Figma variable screen/height in the 393 mode"),
 ("Metrics", "sb", "54px", "", "node box of the Status Bar frame"),
 ("Metrics", "nav", "44px", "",
  "node box of Title and Actions, which is also the list row height and the "
  "tap target"),
 ("Metrics", "margin", "16px", "",
  "Figma variable listing/margin: the inset of every card from the frame"),
 ("Metrics", "gutter", "20px", "",
  "node box padding on Content inside a row, a section header and a card"),
 ("Metrics", "logo", "29px", "", "node box of the app icon in a list row"),
 ("Metrics", "rowgap", "35px", "",
  "gap on the Sections flex column: the space between two cards"),
 ("Metrics", "toggle-w", "51px", "", "node box of the Toggle component"),
 ("Metrics", "toggle-h", "31px", "", "node box of the Toggle component"),
 ("Metrics", "knob", "27px", "",
  "node box of the Knob: the 31pt toggle with its 2pt padding"),
 ("Metrics", "home", "34px", "", "node box of the Home Bar frame"),
 ("Metrics", "home-w", "140px", "",
  "Figma variable homebar/width in the 393 mode (it is 154 in the 430 mode)"),
 ("Metrics", "island-w", "126px", "", "node box of the Dynamic Island"),
 ("Metrics", "island-h", "37px", "", "node box of the Dynamic Island"),
 ("Metrics", "hair", "0.33px", "",
  "stroke weight on every divider and on the nav rule"),
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
        out.append("  --as-%s:%s;" % (name, value))
    return "\n".join(out) + "\n}"


def _dark():
    """Only what the file redefines. system/grey, system/black and system/white
    are one variable in both themes, so they are not here."""
    return ".dark{\n%s\n}" % "\n".join(
        "  --as-%s:%s;" % (n, d) for _g, n, _v, d, _e in TOKENS_SPEC if d)


TOKENS = _root()
DARK = _dark()

BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--as-font);background:#fff;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{width:var(--as-w);height:var(--as-h);position:relative;flex:none;overflow:hidden;border-radius:var(--as-r-phone);background:var(--as-bg);color:var(--as-ink);outline:1px solid rgba(0,0,0,.10);box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;right:0;top:0;height:var(--as-sb);z-index:8}
.sb .t{position:absolute;left:10px;top:18px;width:123.5px;height:22px;text-align:center;font:var(--as-t-b17)}
.sb .island{position:absolute;left:133.5px;top:11px;width:var(--as-island-w);height:var(--as-island-h);border-radius:var(--as-r-pill);background:var(--as-black)}
.sb svg{position:absolute;display:block}
.home{position:absolute;left:50%;bottom:8px;z-index:7;transform:translateX(-50%);width:var(--as-home-w);height:5px;border-radius:var(--as-r-pill);background:var(--as-ink)}"""

# 393-mode Status Bar: px-10, two flex-1 sides around the 126px island, each
# side items-center with pt-18 pb-13. Each entry is the glyph's own ink rect in
# the 393 x 852 frame. This file and apple-calendar draw the same Status Bar
# component, down to three decimals, so these are its measurements verbatim.
SB_ICONS = [("cellular", 282.598, 22.109, 19.474, 12.531),
            ("wifi", 309.076, 22.986, 16.621, 11.996),
            ("battery", 332.946, 22.993, 26.824, 12.120)]


def statusbar(time="1:47"):
    return ('<div class="sb"><div class="t">%s</div><div class="island"></div>%s</div>'
            % (time, "".join(at(*i) for i in SB_ICONS)))


def home():
    return '<div class="home"></div>'


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


# ------------------------------------------------- shared: the grouped list

# Chrome sets a glyph half a point lower than Figma does inside the same line
# box, so every text top from 17pt up -- row labels, the nav title, the
# sign-in link, the 34pt page title, the status-bar clock -- is written as its
# measured Figma coordinate minus 0.5. The 13pt strings are not: the section
# headers, the section help and the sign-in subtitle land on their measured
# coordinate, and shifting them costs the Developer board 0.6 of a level.
# Rects are never shifted. Same finding as apple-calendar/README.md records.


# Every screen in this file is the same grouped list: cards inset 16 from the
# frame, 44pt rows inside them, a 0.33pt divider between rows that starts
# where the row's own content starts. A row with a 29pt app icon indents its
# label and its divider to 64 (20 gutter + 29 icon + 15 gap); a row without
# one indents both to 20.
LIST = PHONE + "\n" + """.card{position:absolute;left:var(--as-margin);width:361px;border-radius:var(--as-r-card);background:var(--as-card)}
.row{position:absolute;left:0;right:0;height:var(--as-nav)}
.row .lb{position:absolute;left:var(--as-gutter);top:10.5px;font:var(--as-t-r17);white-space:nowrap}
.row .lb.ac{color:var(--as-blue)}
.row .lg{position:absolute;left:var(--as-gutter);top:7.5px;width:var(--as-logo);height:var(--as-logo);border-radius:var(--as-r-logo);object-fit:cover;display:block}
.row .dv{position:absolute;left:var(--as-gutter);right:0;bottom:0;height:var(--as-hair);background:var(--as-sep)}
.row.logo .lb,.row.logo .dv{left:64px}
.row svg{position:absolute;display:block;color:var(--as-sep)}
.row svg.ck{color:var(--as-blue)}
.tg{position:absolute;right:var(--as-gutter);top:6.5px;width:var(--as-toggle-w);height:var(--as-toggle-h);border-radius:var(--as-r-pill);background:var(--as-track)}
.tg.on{background:var(--as-green)}
.tg i{position:absolute;left:2px;top:2px;width:var(--as-knob);height:var(--as-knob);border-radius:var(--as-r-pill);background:var(--as-white);box-shadow:0 3px 8px rgba(0,0,0,.15),0 3px 1px rgba(0,0,0,.06)}
.tg.on i{left:22px}"""

# Both accessory glyphs sit at their own measured ink box inside the row, not
# centred by CSS: chevron.right and checkmark have different optical centres
# and Figma places each by its text box.
CHEVRON = at("chevron-right", 332.841, 15.426, 7.157, 12.277)
CHECK = at("checkmark", 321.925, 14.910, 14.950, 14.559, "ck")


def row(i, label, logo=None, accent=False, chevron=False, toggle=None,
        check=False, divider=False):
    p = ['<img class="lg" alt="" src="%s">' % img(logo) if logo else "",
         '<div class="lb%s">%s</div>' % (" ac" if accent else "", label),
         CHEVRON if chevron else "",
         CHECK if check else "",
         "" if toggle is None else '<div class="tg%s"><i></i></div>'
         % (" on" if toggle else ""),
         '<div class="dv"></div>' if divider else ""]
    return '<div class="row%s" style="top:%gpx">%s</div>' % (
        " logo" if logo else "", i * 44, "".join(p))


def rows(items):
    """Every row but the last carries the divider; that is the component's
    own hasDivider default and what the exports show."""
    return "".join(row(i, divider=i < len(items) - 1, **it)
                   for i, it in enumerate(items))


def card(top, height, items):
    return '<div class="card" style="top:%gpx;height:%gpx">%s</div>' % (
        top, height, rows(items))


# ------------------------------------------------- 01 Settings home

# Node 2006:4774 (light) / 2006:4775 (dark). The Top frame is 976 tall inside
# an 852 frame: this is a scrolling list parked at the top, so Siri & Search
# is cut mid-row and Photos and Game Center are off-screen. Both are emitted,
# because the frame clips them rather than the file omitting them.
HOME_CSS = LIST + """
.title{position:absolute;left:var(--as-margin);top:100.5px;font:var(--as-t-b34)}
.si{position:absolute;left:96px;top:16.5px}
.si b{display:block;font:var(--as-t-r17);font-weight:400;color:var(--as-blue);margin-bottom:-2px}
.si span{display:block;position:relative;top:0.5px;font:var(--as-t-r13)}
.card>svg.av{position:absolute;display:block;color:var(--as-grey2)}"""

HOME_CARDS = [
    (255, 44, [{"label": "Screen Time", "logo": "screen-time", "chevron": True}]),
    (334, 132, [{"label": "General", "logo": "general", "chevron": True},
                {"label": "Accessibility", "logo": "accessibility", "chevron": True},
                {"label": "Privacy &amp; Security", "logo": "privacy",
                 "chevron": True}]),
    (501, 44, [{"label": "Passwords", "logo": "passwords", "chevron": True}]),
    (580, 396, [{"label": "Safari", "logo": "safari", "chevron": True},
                {"label": "News", "logo": "news", "chevron": True},
                {"label": "Translate", "logo": "translate", "chevron": True},
                {"label": "Maps", "logo": "maps", "chevron": True},
                {"label": "Shortcuts", "logo": "shortcuts", "chevron": True},
                {"label": "Health", "logo": "health", "chevron": True},
                {"label": "Siri &amp; Search", "logo": "siri", "chevron": True},
                {"label": "Photos", "logo": "photos", "chevron": True},
                {"label": "Game Center", "logo": "game-center", "chevron": True}])]


def settings_home(dark=False):
    signin = ('<div class="card" style="top:150px;height:70px">%s'
              '<div class="si"><b>Sign in to your iPhone</b>'
              '<span>Set up iCloud, the App Store, and more.</span></div></div>'
              % at("person-crop-circle-fill", 20.419, 5.475, 59.366, 59.336, "av"))
    return page("Apple Settings - Settings" + (" (dark)" if dark else ""), HOME_CSS,
                phone(statusbar() + '<div class="title">Settings</div>' + signin
                      + "".join(card(*c) for c in HOME_CARDS) + home(), dark))


# ------------------------------------------------- shared: pushed screen nav

# Page Title on a pushed screen is 98 tall: the 54pt status bar over a 44pt
# Title and Actions row. Both instances in this file hide their Back button
# and their right actions, so the title is all that is left in that row.
NAV = """.nav{position:absolute;left:0;top:0;width:var(--as-w);height:98px;z-index:6}
.nav .mat{position:absolute;inset:0;background:var(--as-blur);backdrop-filter:blur(25px);-webkit-backdrop-filter:blur(25px)}
.nav .rule{position:absolute;left:0;right:0;bottom:0;height:var(--as-hair);background:var(--as-sep)}
.nav .tt{position:absolute;left:0;right:0;top:64.5px;text-align:center;font:var(--as-t-b17)}"""


def nav(title, material=True):
    return ('<div class="nav">%s%s<div class="tt">%s</div>%s</div>'
            % ('<div class="mat"></div>' if material else "",
               statusbar(), title,
               '<div class="rule"></div>' if material else ""))


# ------------------------------------------------- 02 Developer

# Node 2006:4813 (light) / 2006:4814 (dark). Sections start at y 120 and each
# one is a 22pt header, a card, then an optional 54pt help block; the gap
# after a section is 20 when it has help and 35 when it does not.
DEV_CSS = LIST + NAV + """
.sl{position:absolute;left:36px;height:16px;font:var(--as-t-r13);text-transform:uppercase;color:var(--as-grey)}
.sh{position:absolute;left:36px;width:321px;font:var(--as-t-r13);color:var(--as-grey)}"""

# (top, header, card height, rows, help). "Text" is verbatim: two Action Rows
# in this community file were left on the component's unfilled default. The
# clone rule is to transcribe the reference, so the defect is reproduced and
# recorded in README.md rather than quietly corrected.
DEV_SECTIONS = [
    (120, "Paired devices", 44, [{"label": "Text", "accent": True}],
     "Removing trusted computers will delete all of the records of computers "
     "that you have paired with previously."),
    (260, "UI automation", 44,
     [{"label": "Enable UI Automation", "toggle": True}], None),
    (361, "State restoration testing", 44,
     [{"label": "Fast App Termination", "toggle": False}],
     "Terminate instead of suspending apps when backgrounded to force apps to "
     "be relaunched when they are foregrounded."),
    (501, "Waltter testing", 176,
     [{"label": "Additional Logging", "toggle": False},
      {"label": "Allow HTTP Services", "toggle": False},
      {"label": "Disable Rate Limiting", "toggle": False},
      {"label": "NFC Pass Key Optional", "toggle": False}], None),
    (734, "Media services testing", 88,
     [{"label": "AirPlay Suggestions", "chevron": True},
      {"label": "Text", "accent": True}], None),
    (879, "News testing", 44,
     [{"label": "Reset Local Data on Next Launch"}], None)]


def section(top, header, height, items, help_=None):
    out = ['<div class="sl" style="top:%gpx">%s</div>' % (top, header),
           card(top + 22, height, items)]
    if help_:
        out.append('<div class="sh" style="top:%gpx">%s</div>'
                   % (top + 22 + height + 6, help_))
    return "".join(out)


def developer(dark=False):
    return page("Apple Settings - Developer" + (" (dark)" if dark else ""), DEV_CSS,
                phone(nav("Developer") + "".join(section(*s) for s in DEV_SECTIONS)
                      + home(), dark))


# ------------------------------------------------- 03 Display Zoom

# Node 2006:4825 (light) / 2006:4826 (dark). This nav bar has neither the
# material nor the rule -- the page ground runs straight up under the clock --
# and Sections is pt-35, so the one card starts at 98 + 35 = 133.
def display_zoom(dark=False):
    return page("Apple Settings - Display Zoom" + (" (dark)" if dark else ""),
                LIST + NAV,
                phone(nav("Display Zoom", material=False)
                      + card(133, 88, [{"label": "Larger Text"},
                                       {"label": "Default", "check": True}])
                      + home(), dark))


# ------------------------------------------------- foundations boards

# The two boards that carry Phase 1 and Phase 2: the token block rendered as
# itself, and the evidence behind every row of it. Both are built from
# TOKENS_SPEC, so neither can fall out of step with the :root the screens
# inline. Every swatch shows light over dark, because this board ships both.
SHEET = """body{padding:0;background:var(--as-card);color:var(--as-ink)}
.sh8{width:478px;height:980px;padding:22px 24px;overflow:hidden}
h1{font:590 20px/25px var(--as-font)}
header p{font:var(--as-t-r13);color:var(--as-grey);margin:2px 0 12px}
h2{font:590 10px/12px var(--as-font);text-transform:uppercase;color:var(--as-grey);margin:13px 0 6px}
.gr{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.sw .ch{height:24px;border-radius:5px;border:0.5px solid var(--as-sep);display:flex;overflow:hidden}
.sw .ch span{flex:1}
.sw b{display:block;margin-top:3px;font:590 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--as-grey);font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rd{display:flex;gap:10px}
.rd div{text-align:center}
.rd .b{width:46px;height:26px;background:var(--as-bg);border:0.5px solid var(--as-sep)}
.rd em{display:block;margin-top:3px;font:400 8.5px/11px var(--as-font);color:var(--as-grey);font-style:normal}
.ty .tr{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding-bottom:2px;border-bottom:0.5px solid var(--as-sep)}
.ty .tr span{white-space:nowrap;overflow:hidden}
.ty .tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--as-grey);font-style:normal;white-space:nowrap;flex:none}
.mt{columns:3;column-gap:14px;font:400 9px/13.5px ui-monospace,Menlo,monospace;color:var(--as-grey)}
.ev div{padding:3px 0;border-bottom:0.5px solid var(--as-sep)}
.ev b{font:590 8.5px/12px ui-monospace,Menlo,monospace;color:var(--as-blue)}
.ev i{font:400 8.5px/12px ui-monospace,Menlo,monospace;color:var(--as-grey);font-style:normal}
.ev p{font:400 8px/11px var(--as-font);color:var(--as-grey)}"""


def _of(group):
    return [t for t in TOKENS_SPEC if t[0] == group]


def token_board():
    """Colour, radius, type and metrics, drawn with the tokens themselves. A
    two-tone chip is a token the dark frames redefine; a flat one is a token
    that is one value in both themes."""
    sw = "".join(
        '<div class="sw"><div class="ch"><span style="background:%s"></span>'
        '%s</div><b>--as-%s</b><i>%s</i></div>'
        % (v, '<span style="background:%s"></span>' % d if d else "", n, v)
        for g in ("Surface", "Ink") for _, n, v, d, _ in _of(g))
    rd = "".join('<div><div class="b" style="border-radius:%s"></div><em>%s</em></div>'
                 % (v, n[2:]) for _, n, v, _, _ in _of("Radius"))
    ty = "".join('<div class="tr"><span style="font:var(--as-%s)">%s</span>'
                 '<em>%s</em></div>'
                 % (n, "Settings" if int(v.split()[1].split("px")[0]) >= 34
                    else "Sign in to your iPhone", v.split(" var")[0])
                 for _, n, v, _, _ in _of("Type"))
    mt = "<br>".join("--as-%s: %s" % (n, v) for _, n, v, _, _ in _of("Metrics"))
    return page("Apple Settings - Design Tokens", SHEET,
                '<div class="sh8"><header><h1>Apple Settings &middot; iOS</h1>'
                '<p>Figma SAJX6z3s8bHctuZyvOSN8i, 393pt mode. A two-tone chip is a '
                'token the dark frames redefine, light half on the left. The type '
                'ramp is labelled with its own shorthand; every row of it is a named '
                'style in the file. The caption under a chip is its light value; '
                'evidence for all %d tokens, both themes, is on the next %d '
                'boards.</p></header>'
                '<h2>Colour</h2><div class="gr">%s</div>'
                '<h2>Radius</h2><div class="rd">%s</div>'
                '<h2>Type</h2><div class="ty">%s</div>'
                '<h2>Metrics</h2><div class="mt">%s</div></div>'
                % (len(TOKENS_SPEC), len(list(evidence_boards())), sw, rd, ty, mt))


EV_ROWS = 21   # what fits the 478 x 980 box; past this the table splits


def evidence_boards():
    """The evidence table, over as many boards as it needs. It is the
    deliverable of Phase 1: split the board, never trim the rows."""
    pages = [TOKENS_SPEC[i:i + EV_ROWS] for i in range(0, len(TOKENS_SPEC), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows_ = "".join(
            '<div><b>--as-%s</b> <i>%s%s</i><p>%s</p></div>'
            % (n, v, " / " + d if d else "", e) for _g, n, v, d, e in chunk)
        of = " %d/%d" % (i + 1, len(pages))
        yield ("00%s-evidence" % "bcdefgh"[i],
               page("Apple Settings - Evidence" + of, SHEET,
                    '<div class="sh8"><header><h1>Evidence%s</h1>'
                    '<p>Token, then its light value and its dark override, then '
                    'where the value came from. A token with no evidence is a '
                    'guess.</p></header><div class="ev">%s</div></div>' % (of, rows_)))


# ------------------------------------------------- Phase 5: the references

# assets/refs/ref-<name>.png is the file's own PNG export of that frame at 2x,
# 786 x 1704, unretouched. They are gitignored (they are someone else's
# artwork), so a fresh clone regenerates the 9 boards above and skips these.
REF_CSS = """.rb{width:430px;height:932px;background:#151311;border-radius:20px;padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rb h1{font:590 15px/20px var(--as-font)}
.rb p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rb .shot{margin-top:9px;display:flex;justify-content:center}
.rb img{width:393px;height:852px;display:block;border-radius:6px}"""


def ref_boards():
    for name, label, _fn in SCREENS:
        for pre, theme in (("", "light"), ("d", "dark")):
            path = os.path.join(ASSETS, "refs", "ref-%s%s.png" % (pre, name))
            if not os.path.exists(path):
                continue
            with open(path, "rb") as f:
                uri = "data:image/png;base64," + base64.b64encode(f.read()).decode()
            yield ("ref-%s%s" % (pre, name),
                   page("Apple Settings - reference: %s (%s)" % (label, theme),
                        REF_CSS,
                        '<div class="rb"><h1>%s &mdash; %s reference</h1>'
                        '<p>Figma PNG export &middot; 786&times;1704 @2x &middot; '
                        'exact frame, not a near match</p>'
                        '<div class="shot"><img alt="%s" src="%s"></div></div>'
                        % (label, theme, label, uri)))


# (file stem, caption on the canvas, builder). Both themes come from one
# builder: fn() is the light frame, fn(dark=True) the dark one.
SCREENS = [("01-settings", "Settings", settings_home),
           ("02-developer", "Developer", developer),
           ("03-display-zoom", "Display Zoom", display_zoom)]


def layout(refs):
    """Four rows at one pitch from x = 0, so item N of every row lands
    column-for-column under item N of the row above: each dark screen sits
    under its light one, and each Figma export under the replica of it."""
    rows_ = [{"title": "Foundations",
              "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                       + [{"file": n, "label": "Evidence"}
                          for n, _ in evidence_boards()]},
             {"title": "Screens: light", "numbered": True,
              "files": [{"file": n, "label": l} for n, l, _ in SCREENS]},
             {"title": "Screens: dark", "numbered": True,
              "files": [{"file": "d" + n, "label": l} for n, l, _ in SCREENS]}]
    for pre, title in (("", "Source of truth: Figma export, light"),
                       ("d", "Source of truth: Figma export, dark")):
        files = [{"file": "ref-%s%s" % (pre, n), "label": l}
                 for n, l, _ in SCREENS if "ref-%s%s" % (pre, n) in refs]
        if files:
            rows_.append({"title": title, "numbered": True, "files": files})
    return {"name": "(example) Apple Settings", "rows": rows_}


def main():
    files = {"00-design-tokens.html": token_board()}
    files.update((n + ".html", h) for n, h in evidence_boards())
    for name, _label, fn in SCREENS:
        files[name + ".html"] = fn()
        files["d" + name + ".html"] = fn(dark=True)
    refs = dict(ref_boards())
    files.update((n + ".html", h) for n, h in refs.items())
    for name, html in sorted(files.items()):
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(html)
        print("%-32s %6d KB" % (name, len(html.encode()) // 1024))
    with open(os.path.join(OUT, "layout.json"), "w", encoding="utf-8") as f:
        json.dump(layout(refs), f, indent=2)
        f.write("\n")
    print("%-32s %6d rows" % ("layout.json", len(layout(refs)["rows"])))


if __name__ == "__main__":
    main()
