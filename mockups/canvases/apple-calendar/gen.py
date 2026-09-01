"""Emit mockups/canvases/apple-calendar/ from the Figma measurements.

Source: the Figma community file "Apple Calendar . iOS", 3YLkiKW7ZFRg85c8k6VXFf,
393pt mode (the file also ships a 430pt column; this repo's frame is 393). Node
ids per board are in README.md.

Every number here came out of the file, not out of a screenshot: the published
variables for the palette and the metrics, the file's own type styles for the
ramp, and node boxes for the geometry. The PNG renders under assets/refs/ were
only used to confirm them and to read the strings, which a text layer named
"XX" does not give you.

No letter-spacing anywhere, on purpose. The type styles carry tracking (-0.43
at 17pt, +0.12 at 10pt and so on) but SF Pro already applies it through its
optical size axis, so Figma's own PNG export shows none of it on top. This is
the same finding as apple-photos/README.md records.

Light and dark are one board each from one builder: .dark on the phone swaps
the six variables the file redefines for its dark screens and nothing else.

Artboards are output. Edit this file, never the HTML.

    python3 mockups/canvases/apple-calendar/gen.py
"""
import base64
import json
import os
import re

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
    board that wants a bitmap has to carry it."""
    with open(os.path.join(ASSETS, "images", name + ".png"), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


# ---------------------------------------------------------------- tokens

# (group, name, light, dark, evidence). One row per token, and the :root
# block, the .dark block, the token board and the evidence board are all
# generated from it, so a value cannot drift from the evidence behind it.
#
# "Figma variable X" means the file's own published variable, read with
# get_variable_defs on a light frame and on a dark one; that is the primary
# source here, not a screenshot. Where a value is a composite (a translucent
# fill over a known ground) the row says what over what. Where neither was
# available the row says which reference PNG was sampled and how.
TOKENS_SPEC = [
 ("", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif', "",
  'every type style in the file is Font(family: "SF Pro"); this is the '
  'platform stack that resolves to it on macOS and iOS'),

 ("Surface", "bg", "#FFFFFF", "#000000",
  "Figma variable bg/primary-base; the dark frames fill with system/black"),
 ("Surface", "black", "#000000", "",
  "Figma variable system/black: the Dynamic Island, the sheet's own header"),
 ("Surface", "white", "#FFFFFF", "",
  "Figma variable system/white: the ring around the now-dot, light in both themes"),
 ("Surface", "sep", "#C7C7CC", "#464649",
  "Figma variable system/grey3, light and dark"),
 ("Surface", "event-bg", "rgba(27,173,248,.20)", "rgba(27,173,248,.28)",
  "Figma variable app-calendar/event-bg #1BADF833; the dark frames raise the "
  "alpha, solved from the fill over black on ref-d01 at 2x"),
 ("Surface", "event-bd", "#1BADF8", "",
  "Figma variable app-calendar/event-border, one value in both themes"),
 ("Surface", "blur", "rgba(255,255,255,.70)", "rgba(40,40,42,.94)",
  "Figma variable ui/background-blur #FFFFFFB2; the dark month header is the "
  "same material, solved from ref-d03 at 2x"),
 ("Surface", "sheet", "#D9D9D9", "#18181A",
  "flat-fill census on the stacked-sheet edge above the modal, ref-04 / ref-d04"),
 ("Surface", "scrim", "rgba(0,0,0,.20)", "rgba(0,0,0,.502)",
  "Figma variable ui/alert-overlay #00000033; the dark frames dim twice as "
  "hard (#00000080), solved from the white status-bar clock, which renders "
  "127 on ref-d05 where it is 255 on ref-d01"),
 ("Surface", "modal", "#FFFFFF", "#1C1C1E",
  "Figma variable bg/primary-elevated, light and dark"),
 ("Surface", "group", "#F2F2F7", "#1C1C1E",
  "Figma variable grouped-bg/primary-elevated; dark from a flat-fill census "
  "on the mini day card, ref-d08"),
 ("Surface", "fill", "#EEEEEF", "#48484D",
  "Figma variable fill/tertiary over bg/tertiary-elevated: #7676801F on "
  "#FFFFFF, #7676803D on #3A3A3C"),
 ("Surface", "btn", "#E6E6EB", "#28282A",
  "Figma variable system/grey5; dark from a flat-fill census on the alert "
  "buttons, ref-d05"),
 ("Surface", "card", "#FFFFFF", "#3A3A3C",
  "Figma variable bg/tertiary-elevated, light and dark"),
 ("Surface", "elev", "#F2F2F7", "#2C2C2E",
  "Figma variable bg/secondary-elevated, light and dark: the ground a modal "
  "sheet uses, which is not the plain-page grey"),
 ("Surface", "kbd", "#D0D3DA", "#29292A",
  "Figma variable keyboard/bg; the dark one is #28282AF0, so it is sampled "
  "composited off ref-d07"),
 ("Surface", "key", "#FFFFFF", "#696969",
  "Figma variable keyboard/key-bg; dark #FFFFFF4D over keyboard/bg"),
 ("Surface", "key2", "#A9AFBC", "#3F3F40",
  "Figma variable keyboard/return-bg; dark #FFFFFF1A over keyboard/bg"),
 ("Surface", "key-bd", "#6C6C71", "#000000",
  "Figma variable keyboard/key-border, light and dark; it paints one point "
  "*below* the 42pt key box, not around it"),

 ("Ink", "ink", "#000000", "#FFFFFF",
  "Figma variable label/primary, light and dark"),
 ("Ink", "grey", "#8E8E93", "",
  "Figma variable system/grey, one value in both themes"),
 ("Ink", "grey2", "#8A8A8E", "#8E8E93",
  "Figma variable label/secondary #3C3C4399 over white; the dark frames use "
  "system/grey instead"),
 ("Ink", "hint", "#C5C5C7", "#6F6F74",
  "Figma variable label/tertiary over bg/tertiary-elevated (#3C3C434D on "
  "#FFFFFF, #EBEBF54D on #3A3A3C); ink core of the Title placeholder, 07 / d07"),
 ("Ink", "dim", "#BCBCC1", "#65656A",
  "ink core of the dimmed Add button, 07 / d07 at 2x. Figma's own "
  "label/quarternary composites lighter than this; the render is what is copied"),
 ("Ink", "red", "#FF382B", "#FE4336",
  "Figma variable system/red, light and dark"),
 ("Ink", "blue", "#007BFE", "",
  "Figma variable ui/accent"),
 ("Ink", "event-ink", "#106895", "#1BADF8",
  "Figma variable app-calendar/event-title; the dark frames use "
  "app-calendar/event, the border colour, as the title colour"),

 ("Radius", "r-phone", "52px", "",
  "circular stand-in for the 55pt continuous display corner; refkit "
  "--crop-phone masks the same 52, so mask and frame agree"),
 ("Radius", "r-pill", "100px", "",
  "Figma corner radius on the Dynamic Island, the home bar, the day circle "
  "and the toggle: a number larger than the box, i.e. fully round"),
 ("Radius", "r-event", "5px", "",
  "Figma corner radius on an event block in Day Events"),
 ("Radius", "r-sheet", "10px", "",
  "Figma corner radius on the presented sheet and on the stacked edge behind it"),
 ("Radius", "r-btn", "14px", "",
  "Figma corner radius on the Continue button and on the Join / share buttons"),
 ("Radius", "r-alert", "13px", "",
  "Figma corner radius on the permission alert"),
 ("Radius", "r-card", "10px", "",
  "Figma corner radius on a form card and on a detail card"),
 ("Radius", "r-field", "6px", "",
  "Figma corner radius on the Starts / Ends date and time pills"),

 ("Type", "t-r11", "400 11px/13px var(--ac-font)", "", "Figma type style Regular/11pt"),
 ("Type", "t-r13", "400 13px/16px var(--ac-font)", "", "Figma type style Regular/13pt"),
 ("Type", "t-r15", "400 15px/20px var(--ac-font)", "", "Figma type style Regular/15pt"),
 ("Type", "t-r15-22", "400 15px/22px var(--ac-font)", "",
  "Regular/15pt set in a 22pt line box: the event-details summary, whose two "
  "lines measure 22 apart on ref-08"),
 ("Type", "t-r16", "400 16px/21px var(--ac-font)", "", "Figma type style Regular/16pt"),
 ("Type", "t-r17", "400 17px/22px var(--ac-font)", "", "Figma type style Regular/17pt"),
 ("Type", "t-r18", "400 18px/23px var(--ac-font)", "", "Figma type style Regular/18pt"),
 ("Type", "t-r22", "400 22px/28px var(--ac-font)", "", "Figma type style Regular/22pt"),
 ("Type", "t-b8", "590 8px/10px var(--ac-font)", "", "Figma type style SemiBold/8pt"),
 ("Type", "t-b10", "590 10px/12px var(--ac-font)", "", "Figma type style SemiBold/10pt"),
 ("Type", "t-b11", "590 11px/13px var(--ac-font)", "", "Figma type style SemiBold/11pt"),
 ("Type", "t-b13", "590 13px/16px var(--ac-font)", "", "Figma type style SemiBold/13pt"),
 ("Type", "t-b15", "590 15px/20px var(--ac-font)", "", "Figma type style SemiBold/15pt"),
 ("Type", "t-b17", "590 17px/22px var(--ac-font)", "", "Figma type style SemiBold/17pt"),
 ("Type", "t-b18", "590 18px/23px var(--ac-font)", "", "Figma type style SemiBold/18pt"),
 ("Type", "t-b20", "590 20px/25px var(--ac-font)", "", "Figma type style SemiBold/20pt"),
 ("Type", "t-b22", "700 22px/28px var(--ac-font)", "", "Figma type style Bold/22pt"),
 ("Type", "t-b34", "700 34px/41px var(--ac-font)", "", "Figma type style Bold/34pt"),

 ("Metrics", "w", "393px", "", "Figma variable screen/width in the 393 mode"),
 ("Metrics", "h", "852px", "", "Figma variable screen/height in the 393 mode"),
 ("Metrics", "sb", "54px", "", "node box of the Status Bar frame"),
 ("Metrics", "nav", "44px", "",
  "Figma variable listing/margin-big, which is also the nav row height and "
  "the tap target"),
 ("Metrics", "margin", "16px", "",
  "node box of the stacked-sheet edge: 16 in from each side of the 393 frame"),
 ("Metrics", "gutter", "20px", "",
  "Figma variable listing/margin: the left inset of every card, title and row"),
 ("Metrics", "home", "34px", "", "node box of the Home Indicator frame"),
 ("Metrics", "home-w", "140px", "",
  "Figma variable homebar/width in the 393 mode (it is 154 in the 430 mode)"),
 ("Metrics", "island-w", "126px", "", "node box of the Dynamic Island"),
 ("Metrics", "island-h", "37px", "", "node box of the Dynamic Island"),
 ("Metrics", "hour", "50px", "",
  "pitch of the Day Events rows: the frame is 1200 tall for 24 hours"),
 ("Metrics", "timecol", "52px", "",
  "Figma variable app-calendar/content-margin-h: where the hour rules start"),
 ("Metrics", "day", "35px", "",
  "node box of a day circle in the week strip and in the month grid"),
 ("Metrics", "hair", "0.33px", "",
  "stroke weight on the week-strip and footer rules"),
 ("Metrics", "rule", "0.66px", "",
  "stroke weight on the Day Events hour rules, twice the hairline"),
 ("Metrics", "daycut", "579px", "",
  "769 - 190: the day list is clipped where the footer starts, which is the "
  "one reading that reproduces both the day render and the month render"),
]

# The five metrics tokens nothing references in CSS -- nav, margin, gutter,
# home, hour -- are deliberate. Every element on this board is positioned from
# its own measured Figma frame coordinate rather than from a grid, so those
# five document the grid instead of driving it. They are measurements, so they
# belong in the block; deleting them would lose the only record of them.


def _root():
    """One :root block, byte-identical in every board, and no `}` inside it:
    tools/refkit.py reads it with a non-greedy regex."""
    out, seen = [":root{"], None
    for group, name, value, _dark, _ev in TOKENS_SPEC:
        if group and group != seen:
            out.append("")
            out.append("  /* %s */" % group)
        seen = group
        out.append("  --ac-%s:%s;" % (name, value))
    return "\n".join(out) + "\n}"


def _dark():
    """Only what the file redefines. system/grey, system/black and system/white
    are one variable in both themes, so they are not here."""
    return ".dark{\n%s\n}" % "\n".join(
        "  --ac-%s:%s;" % (n, d) for _g, n, _v, d, _e in TOKENS_SPEC if d)


TOKENS = _root()
DARK = _dark()

BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--ac-font);background:#fff;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{width:var(--ac-w);height:var(--ac-h);position:relative;flex:none;overflow:hidden;border-radius:var(--ac-r-phone);background:var(--ac-bg);color:var(--ac-ink);outline:1px solid rgba(0,0,0,.10);box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;right:0;top:0;height:var(--ac-sb);z-index:8}
.sb .t{position:absolute;left:10px;top:18.5px;width:123.5px;height:22px;text-align:center;font:var(--ac-t-b17)}
.sb .island{position:absolute;left:133.5px;top:11px;width:var(--ac-island-w);height:var(--ac-island-h);border-radius:var(--ac-r-pill);background:var(--ac-black)}
.sb svg{position:absolute;display:block}
.home{position:absolute;left:50%;bottom:8px;z-index:7;transform:translateX(-50%);width:var(--ac-home-w);height:5px;border-radius:var(--ac-r-pill);background:var(--ac-ink)}"""

# 393-mode Status Bar: px-10, two flex-1 sides around the 126px island, each
# side items-center with pt-18 pb-13. Each entry is the glyph's own ink rect in
# the 393 x 852 frame, as iconkit.py measured it.
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


# ------------------------------------------------- shared: day view chrome

# Right Actions is a 185-wide frame at x 188 holding four 44-tall slots at
# 0/50/105/160; slot #4 is an empty 20pt spacer. Each glyph is centred in its
# slot, and these are the ink rects that come out of that.
HEADER_CSS = """.hd{position:absolute;left:0;top:0;width:var(--ac-w);height:186px;background:var(--ac-bg);z-index:6}
.hd svg{position:absolute;display:block;color:var(--ac-red)}
.hd .back{position:absolute;left:33px;top:65px;font:var(--ac-t-r17);color:var(--ac-red);white-space:nowrap}
.hd .rule{position:absolute;left:0;top:186px;width:var(--ac-w);height:var(--ac-hair);background:var(--ac-sep)}
.wk{position:absolute;top:98px;width:var(--ac-day);height:56px}
.wk s{display:block;height:12px;margin-top:2px;text-align:center;font:var(--ac-t-b10);text-decoration:none;color:var(--ac-grey)}
.wk b{display:flex;align-items:center;justify-content:center;margin-top:7px;width:var(--ac-day);height:var(--ac-day);padding-bottom:1px;border-radius:var(--ac-r-pill);font:var(--ac-t-r18)}
.wk.on b{background:var(--ac-red);color:var(--ac-white);font:var(--ac-t-b18)}
.wk.off s,.wk.off b{color:var(--ac-grey)}
.today{position:absolute;top:154px;height:21px;font:var(--ac-t-r16);white-space:nowrap}"""

# Slot #3 changes per screen -- the day view offers the list, the month view
# the list-below-a-rectangle -- so the glyph is keyed by name and centred in
# its own slot; slots #2 and #1 never move.
NAV_ICONS = {"list-bullet": (239.672, 68.413, 21.645, 15.694),
             "list-bullet-below-rect": (240.220, 66.469, 20.560, 19.819),
             "magnifyingglass": (295.005, 65.652, 20.990, 21.194),
             "plus": (351.638, 67.382, 17.724, 17.725)}


def chevron():
    return at("chevron-left", 13.289, 66.598, 11.247, 19.293)


def actions(third="list-bullet"):
    return "".join(at(n, *NAV_ICONS[n])
                   for n in (third, "magnifyingglass", "plus"))

WEEK_X = [20, 73, 126, 179, 232, 285, 338]

# The seventh column really does read 23 in the source file, not 22. Copied as
# it is; noted in README.md rather than quietly corrected.
WEEK = [("S", "16", "off"), ("M", "17", ""), ("T", "18", ""), ("W", "19", ""),
        ("T", "20", ""), ("F", "21", "on"), ("S", "23", "off")]


def header(back="July"):
    ic = chevron() + actions()
    days = "".join('<div class="wk %s" style="left:%gpx"><s>%s</s><b>%s</b></div>'
                   % (cls, x, letter, num)
                   for x, (letter, num, cls) in zip(WEEK_X, WEEK))
    return ('<div class="hd">%s<div class="back">%s</div>%s'
            '<div class="today" style="left:122.5px;width:45px">Friday</div>'
            '<div class="today" style="left:177.5px;width:93px">21 July 2023</div>'
            '<div class="rule"></div></div>' % (ic, back, days))


# Footer: Links is a 44-tall row at y 774 holding three text buttons at their
# own measured boxes; the Home Bar frame is the last 34.
# The component carries a background blur, but the file's own renders only show
# it on the month screen: there the grid smears through to a flat #FCFCFC,
# while both day screens end their event list at the footer and leave it pure
# white. `mat` follows the render, screen by screen.
FOOTER_CSS = """.ft{position:absolute;left:0;top:769px;width:var(--ac-w);height:83px;z-index:6;background:var(--ac-bg)}
.ft.mat{background:var(--ac-blur);-webkit-backdrop-filter:blur(25px);backdrop-filter:blur(25px)}
.ft a{position:absolute;top:16px;height:22px;text-align:center;font:var(--ac-t-r17);color:var(--ac-red)}
.ft hr{position:absolute;left:0;top:-0.67px;width:var(--ac-w);height:var(--ac-hair);border:0;background:var(--ac-sep)}"""

LINKS = [("Today", 16, 47), ("Calendars", 158, 78), ("Inbox", 335, 42)]


def footer(mat=False):
    return ('<div class="ft%s"><hr>%s%s</div>'
            % (" mat" if mat else "", "".join('<a style="left:%gpx;width:%gpx">%s</a>' % (x, w, s)
                       for s, x, w in LINKS), home()))


# ------------------------------------------------- 01/02 day view

# Day Events is 1200 tall (24 x 50) starting at y 190, so it runs a long way
# past the 852 frame. It is cut at 769 here, where the footer starts: the
# file's own render of this screen stops the blue event dead on that line and
# leaves the footer pure white, while its render of the month screen lets the
# grid blur through the same footer. Clipping the list at the footer is the
# one reading that reproduces both. Inside one hour row the rule sits at
# 6.17 -- centred on the 13pt label box, not on the row.
DAY_EXTRA = """
.de{position:absolute;left:0;top:190px;width:var(--ac-w);height:var(--ac-daycut);z-index:1}
.de s{position:absolute;left:0;width:47px;height:13px;text-align:right;font:var(--ac-t-b11);color:var(--ac-grey);text-decoration:none}
.de i{position:absolute;left:var(--ac-timecol);width:341px;height:var(--ac-rule);background:var(--ac-sep);font-style:normal}
.ev{position:absolute;left:55px;width:336px;border-radius:var(--ac-r-event);background:var(--ac-event-bg);z-index:3}
.ev i{position:absolute;left:0;top:0;width:3px;height:100%;border-radius:var(--ac-r-event);background:var(--ac-event-bd)}
.ev b{position:absolute;left:6px;font:var(--ac-t-b13);color:var(--ac-event-ink);white-space:nowrap}
.now{position:absolute;left:0;top:490px;width:var(--ac-w);height:1px;z-index:4;color:var(--ac-red)}
.now s{left:6px;top:-5.5px;width:auto;height:12px;text-align:left;font:var(--ac-t-b10);color:inherit;white-space:nowrap}
.now u{position:absolute;top:0;height:1px;background:currentColor;text-decoration:none}
.now em{position:absolute;left:54px;top:-3px;width:7px;height:7px;border-radius:var(--ac-r-pill);background:currentColor;border:.5px solid var(--ac-white)}"""

DAY_CSS = "\n".join((PHONE, HEADER_CSS, FOOTER_CSS, DAY_EXTRA))

HOURS = ["12 AM"] + ["%d AM" % h for h in range(1, 12)] \
      + ["12 PM"] + ["%d PM" % h for h in range(1, 12)]

# (top, height, title, title-top within the event). The first is vertically
# centred in its 21pt box, the second is pinned to a 3pt inset.
EVENTS = [(334, 21, "Feed Minerva \U0001F431", 2.5),
          (408, 197, "Work \U0001F9D1‍\U0001F4BB", 3)]


# 769 - 190. Nothing below this line is ever seen, so nothing below it is
# emitted: the hour rows stop at 11 AM and the Work event loses its last 26pt.
CUT = 579


def grid():
    return "".join('<s style="top:%dpx">%s</s><i style="top:%gpx"></i>'
                   % (i * 50, h, i * 50 + 6.17)
                   for i, h in enumerate(HOURS) if i * 50 + 13 <= CUT)


def now_line():
    return ('<div class="now"><s>9:41 AM</s><u style="left:49px;width:5px"></u>'
            '<em></em><u style="left:61px;width:332px"></u></div>')


def day_view(events=EVENTS, now=True):
    ev = "".join('<div class="ev" style="top:%gpx;height:%gpx"><i></i>'
                 '<b style="top:%gpx">%s</b></div>'
                 % (top, min(h, CUT - top), ty, title)
                 for top, h, title, ty in events)
    return ('<div class="de">%s%s%s</div>%s%s%s'
            % (grid(), ev, now_line() if now else "", header(), footer(),
               statusbar()))


def today_with_events(dark=False):
    return page("Apple Calendar - Today, with events" + (" (dark)" if dark else ""),
                DAY_CSS, phone(day_view(), dark))


def today_no_events(dark=False):
    return page("Apple Calendar - Today, no events" + (" (dark)" if dark else ""),
                DAY_CSS, phone(day_view(events=[]), dark))


# ------------------------------------------------- 03 month view

# The month header is 115 tall, not 186: the weekday strip shrinks to a bare
# 17pt row of letters and the "Friday / 21 July 2023" line is gone. Its columns
# are a different grid from the day view's -- 35 wide on a 52.333 pitch inset
# 22 from each edge, rather than 35 on a 53 pitch inset 20.
MONTH_X = [22, 74.3333, 126.6667, 179, 231.3333, 283.6667, 336]

MONTH_CSS = PHONE + "\n" + FOOTER_CSS + """
.mh{position:absolute;left:0;top:0;width:var(--ac-w);height:115px;z-index:6;background:var(--ac-blur)}
.mh svg{position:absolute;display:block;color:var(--ac-red)}
.mh .back{position:absolute;left:33px;top:65px;font:var(--ac-t-r17);color:var(--ac-red);white-space:nowrap}
.mh s{position:absolute;top:100px;width:var(--ac-day);height:12px;text-align:center;font:var(--ac-t-b10);text-transform:uppercase;text-decoration:none}
.mh s.we{color:var(--ac-grey)}
.mh .rule{position:absolute;left:0;top:115px;width:var(--ac-w);height:var(--ac-hair);background:var(--ac-sep)}
.mv{position:absolute;left:0;top:124px;width:var(--ac-w);height:834px;z-index:1}
.mv i{position:absolute;height:var(--ac-hair);background:var(--ac-sep)}
.mv b{position:absolute;display:flex;align-items:center;justify-content:center;width:var(--ac-day);height:var(--ac-day);padding-bottom:1px;border-radius:var(--ac-r-pill);font:var(--ac-t-r18);font-weight:400}
.mv b.we{color:var(--ac-grey)}
.mv b.td{background:var(--ac-red);color:var(--ac-white);font:var(--ac-t-b18)}
.mv u{position:absolute;width:var(--ac-day);height:25px;text-align:center;font:var(--ac-t-b20);white-space:nowrap;text-decoration:none}
.mv u.cur{color:var(--ac-red)}"""

MONTH_WEEK = [("S", "we"), ("M", ""), ("T", ""), ("W", ""),
              ("T", ""), ("F", ""), ("S", "we")]


def month_header(back="2023"):
    days = "".join('<s class="%s" style="left:%gpx">%s</s>' % (cls, x, letter)
                   for x, (letter, cls) in zip(MONTH_X, MONTH_WEEK))
    return ('<div class="mh">%s%s<div class="back">%s</div>%s'
            '<div class="rule"></div></div>'
            % (chevron(), actions("list-bullet-below-rect"), back, days))


def week(days, today=None):
    """Seven cells, Sunday first. None is an empty slot; columns 0 and 6 are
    the weekend ones the file greys out."""
    return [None if d is None else
            (d, "td" if d == today else "we" if i in (0, 6) else "")
            for i, d in enumerate(days)]


def span(a, b):
    return [str(d) for d in range(a, b + 1)]


def label(col, text, cls):
    """A month name sits on one column but is allowed to overflow it: the 53pt
    text box is centred on the 35pt cell, so "Jul" hangs 9pt past each side."""
    return [(text, cls) if i == col else None for i in range(7)]


# (top within .mv, kind, seven cells, the x range the rule under the row
# paints). Figma builds each of those rules out of 21 segments and hides the
# ones outside the month, which is what steps the month boundary across the
# grid; None means the row has no rule at all.
MONTH_ROWS = [
    (0,   "m", label(6, "Jul", "cur"),                     (327.3333, 393)),
    (33,  "w", week([None] * 6 + ["1"]),                   (0, 393)),
    (103, "w", week(span(2, 8)),                           (0, 393)),
    (173, "w", week(span(9, 15)),                          (0, 393)),
    (243, "w", week(span(16, 22), today="21"),             (0, 393)),
    (313, "w", week(span(23, 29)),                         (0, 118)),
    (383, "w", week(["30", "31"] + [None] * 5),            None),
    (452, "m", label(2, "Aug", ""),                        (118, 393)),
    (485, "w", week([None, None] + span(1, 5)),            (0, 393)),
    (555, "w", week(span(6, 12)),                          (0, 393)),
    (625, "w", week(span(13, 19)),                         (0, 393)),
    (695, "w", week(span(20, 26)),                         (0, 327.3333)),
    (765, "w", week(span(27, 31) + [None, None]),          None),
]


def month_grid():
    out = []
    for top, kind, cells, rule in MONTH_ROWS:
        for x, cell in zip(MONTH_X, cells):
            if cell is None:
                continue
            text, cls = cell
            if kind == "m":
                out.append('<u class="%s" style="left:%gpx;top:%gpx">%s</u>'
                           % (cls, x, top + 1, text))
            else:
                out.append('<b class="%s" style="left:%gpx;top:%gpx">%s</b>'
                           % (cls, x, top + 4, text))
        if rule:
            x0, x1 = rule
            out.append('<i style="left:%gpx;top:%gpx;width:%gpx"></i>'
                       % (x0, top + (32 if kind == "m" else 69) + 0.335, x1 - x0))
    return '<div class="mv">%s</div>' % "".join(out)


def month_view(dark=False):
    return page("Apple Calendar - Month" + (" (dark)" if dark else ""),
                MONTH_CSS,
                phone(month_grid() + month_header() + footer(mat=True) + statusbar(),
                      dark))


# ------------------------------------------------- 04 what's new

# A modal over a black backdrop. The 68pt "Bottom Sheet" part is two rounded
# tops stacked: a #D9D9D9 card peeking out from 58, and the white sheet itself
# from 68. Both are 10pt radius, the grey one inset 16 from each edge.
SHEET_CSS = """.hd{position:absolute;left:0;top:0;width:var(--ac-w);height:68px;background:var(--ac-black);z-index:1}
.gs{position:absolute;left:16px;top:58px;width:361px;height:10px;border-radius:var(--ac-r-sheet) var(--ac-r-sheet) 0 0;background:var(--ac-sheet);z-index:2}
.sh{position:absolute;left:0;top:68px;width:var(--ac-w);height:784px;border-radius:var(--ac-r-sheet) var(--ac-r-sheet) 0 0;background:var(--ac-modal);z-index:3}
.sb{color:var(--ac-white)}
.btn{position:absolute;left:24px;width:345px;height:50px;border-radius:var(--ac-r-btn);z-index:5;text-align:center;font:var(--ac-t-b17);line-height:49px}
.btn.fill{background:var(--ac-red);color:var(--ac-white)}"""

WN_CSS = PHONE + "\n" + SHEET_CSS + """
.ti{position:absolute;left:0;top:144.5px;width:var(--ac-w);z-index:5;text-align:center;font:var(--ac-t-b34);color:var(--ac-ink)}
.ls{position:absolute;left:32px;width:329px;z-index:5}
.ls svg{position:absolute;display:block;color:var(--ac-red)}
.ls b{position:absolute;left:56px;top:-0.5px;width:273px;font:var(--ac-t-b15);color:var(--ac-ink)}
.ls p{position:absolute;left:56px;width:273px;margin:0;font:var(--ac-t-r15);color:var(--ac-grey)}"""

# (row top, icon box, title, description). The icon boxes are the ink boxes
# measured off the render: an SF Symbol sits on a text baseline, so its ink is
# not centred in the 44pt frame the file draws around it, and centring it there
# puts every one of the three a few points out.
WN_ROWS = [
    (284, ("envelope", 5, 37, 35, 24.5), "Found Events",
     "Siri suggests events found in Mail,<br>Messages, and Safari, so you can add<br>"
     "them easily, such as flight reservations<br>and hotel bookings."),
    (408, ("clock", 5, 32.5, 34, 34), "Time to Leave",
     "Calendar uses Apple Maps to look up<br>locations, traffic conditions, and transit<br>"
     "options to tell vou when it\u2019s time to<br>leave."),
    (532, ("location", 5, 24, 32, 31.5), "Location Suggestions",
     "Calendar suggests locations based on<br>your past events and significant<br>locations."),
]


def whats_new(dark=False):
    rows = "".join(
        '<div class="ls" style="top:%gpx">%s<b>%s</b><p style="top:19.5px">%s</p></div>'
        % (top, at(*ic), title, desc) for top, ic, title, desc in WN_ROWS)
    body = ('<div class="hd"></div><div class="gs"></div><div class="sh"></div>'
            '<div class="ti">What\u2019s New<br>in Calendar</div>%s'
            '<div class="btn fill" style="top:713px">Continue</div>%s%s'
            % (rows, home(), statusbar()))
    return page("Apple Calendar - What\u2019s New" + (" (dark)" if dark else ""),
                WN_CSS, phone(body, dark))


# ------------------------------------------------- 05/06 permission alerts

# The alert screens are a whole day screen with a 20% black scrim and one
# 270pt-wide card on top, centred between the (hidden) status bar and home bar
# at y 214..658. The card carries the same 25px material as the footer; over a
# scrimmed white page that lands on #EFEFEF, which is what the render shows.
ALERT_CSS = DAY_CSS + """
.scrim{position:absolute;inset:0;background:var(--ac-scrim);z-index:9}
.al{position:absolute;left:61.5px;width:270px;border-radius:var(--ac-r-alert);overflow:hidden;z-index:10;text-align:center;background:var(--ac-blur);-webkit-backdrop-filter:blur(25px);backdrop-filter:blur(25px)}
.al .ct{padding:20px}
.al b{display:block;font:var(--ac-t-b17);color:var(--ac-ink)}
.al p{margin:0;font:var(--ac-t-r13);color:var(--ac-ink)}
.al .map{position:relative;width:270px;height:180px}
.al .map img{display:block;width:270px;height:180px}
.al .pill{position:absolute;left:8px;top:8px;width:104px;height:24px;border-radius:var(--ac-r-pill);background:var(--ac-bg);box-shadow:0 2px 4px rgba(0,0,0,.10)}
.al .pill svg{position:absolute;left:8.5px;top:7px;width:9.7px;height:10px;display:block;color:var(--ac-blue)}
.al .pill s{position:absolute;left:24.5px;top:3.5px;font:var(--ac-t-b13);color:var(--ac-blue);text-decoration:none}
.al a{position:relative;display:block;height:44px;font:var(--ac-t-r17);line-height:44px;color:var(--ac-blue);text-decoration:none}
.al a::before{content:"";position:absolute;left:0;top:0;width:100%;height:var(--ac-hair);background:var(--ac-sep)}
.al .rw{display:flex}
.al .rw a{flex:1}
.al .rw a+a::after{content:"";position:absolute;left:0;top:0;width:var(--ac-hair);height:100%;background:var(--ac-sep)}"""

MAP = ('<div class="map"><img alt="" src="%s"><div class="pill">'
       + icon("location-fill") + '<s>Precise: On</s></div></div>')


def alert(top, title, desc, buttons, map_=False, row=False):
    btn = "".join('<a>%s</a>' % b for b in buttons)
    return ('<div class="scrim"></div><div class="al" style="top:%gpx">'
            '<div class="ct"><b>%s</b><p>%s</p></div>%s%s</div>'
            % (top, title, desc, MAP % img("alert-map") if map_ else "",
               '<div class="rw">%s</div>' % btn if row else btn))


def location_permission(dark=False):
    body = (day_view(events=[]) +
            alert(214, 'Allow "Calendar" to use your<br>location?',
                  "Your location is used for time to leave<br>"
                  "alerts, to improve location searches,<br>"
                  "and to suggest event locations.",
                  ["Allow Once", "Allow While Using App", "Don't Allow"], map_=True))
    return page("Apple Calendar - Location permission" + (" (dark)" if dark else ""),
                ALERT_CSS, phone(body, dark))


def notifications_permission(dark=False):
    body = (day_view(events=[]) +
            alert(348, '"Calendar" Would Like to<br>Send You Notifications',
                  "Notifications may include alerts,<br>"
                  "sounds, and icon badges. These can<br>"
                  "be configured in Settings.",
                  ["Don't Allow", "Allow"], row=True))
    return page("Apple Calendar - Notifications permission"
                + (" (dark)" if dark else ""), ALERT_CSS, phone(body, dark))


# The software keyboard, which only the dark New Event frame carries: that
# frame is the keyboard-up state with the Title field focused. Figma builds it
# out of auto-layout rows of `flex-1` keys with a fixed gap inside a padded
# row, so every key width below is (row width - gaps) / n, solved rather than
# typed. Coordinates are relative to the 393 x 336 keyboard at (0.5, 516);
# the four SF Symbols are placed in frame coordinates instead, by their own
# ink boxes, the way every other glyph on this board is.
KBD_CSS = """.kb{position:absolute;left:0.5px;top:516px;width:var(--ac-w);height:336px;z-index:6;background:var(--ac-kbd)}
.kb i{position:absolute;top:0;width:1px;height:53px;background:var(--ac-sep)}
.kb b{position:absolute;height:42px;border-radius:5px;background:var(--ac-key);box-shadow:0 1px 0 var(--ac-key-bd);text-align:center;font:var(--ac-t-r22);padding-top:6px}
.kb b.m{background:var(--ac-key2)}
.kb b.w{font:var(--ac-t-r16);padding-top:9.5px}
.kbi{position:absolute;display:block;z-index:7;color:var(--ac-ink)}"""

KBD_PAD, KBD_GAP, KBD_MOD = 3, 6, 44.5


def keys(top, x0, w, labels, gap=KBD_GAP):
    return "".join('<b style="left:%gpx;top:%gpx;width:%gpx">%s</b>'
                   % (x0 + i * (w + gap), top, w, s)
                   for i, s in enumerate(labels))


def keyboard():
    p, g, m, W = KBD_PAD, KBD_GAP, KBD_MOD, 393
    row = W - 2 * p
    space = row - 92.5 - 92 - 2 * g
    sug = (W - 4) / 3.0
    return ('<div class="kb">'
            + "".join('<i style="left:%gpx"></i>' % x
                      for x in (sug + 0.5, 2 * sug + 2.5))
            + keys(53, p, (row - 9 * g) / 10.0, "QWERTYUIOP")
            + keys(107, 22, (W - 44 - 8 * g) / 9.0, "ASDFGHJKL")
            + keys(161, p + m + 14, (row - 2 * m - 28 - 6 * g) / 7.0, "ZXCVBNM")
            + '<b style="left:%gpx;top:161px;width:%gpx"></b>' % (p, m)
            + '<b class="m" style="left:%gpx;top:161px;width:%gpx"></b>' % (W - p - m, m)
            + '<b class="m w" style="left:%gpx;top:215px;width:92.5px">123</b>' % p
            + '<b class="w" style="left:%gpx;top:215px;width:%gpx">space</b>'
              % (p + 92.5 + g, space)
            + '<b class="m w" style="left:%gpx;top:215px;width:92px">return</b>'
              % (W - p - 92)
            + '</div>'
            + at("shift-fill", 15.492, 688.828, 21.006, 18.125, "kbi")
            + at("delete-backward", 357.67, 688.975, 21.162, 17.978, "kbi")
            + at("face-smiling", 29.553, 798.534, 26.895, 26.895, "kbi")
            + at("microphone", 341.561, 796.939, 18.865, 28.213, "kbi"))


# ------------------------------------------------- 07 new event

# A form sheet: the same 68pt black cap and grey peek card as What’s New,
# then an inset grouped table on #F2F2F7. Cards are 353 wide at x 20 with a
# 10pt radius, every row is 44pt, and a row’s top separator starts at the
# label’s own left edge (40) and runs flush to the card’s right edge.
# This screen carries no home indicator; the file’s render has none.
# The grouped-table rules, shared by the New Event form and the Event Details
# list. Screen 08 is the same table with the card stretched to the full width
# and no fill, which is why `.cd` carries the inset and `.fr` never does.
ROW_CSS = """.cd{position:absolute;left:20px;width:353px;border-radius:var(--ac-r-card);background:var(--ac-card);z-index:5}
.fr{position:relative;height:44px}
.fr+.fr::before{content:"";position:absolute;left:20px;right:0;top:-0.33px;height:var(--ac-hair);background:var(--ac-sep)}
.fr b{position:absolute;left:20px;top:10.5px;font:var(--ac-t-r17)}
.fr em{position:absolute;left:20px;top:10.5px;font:var(--ac-t-r17);font-style:normal;color:var(--ac-hint)}
.fr i{position:absolute;left:20px;top:11px;width:2px;height:22px;background:var(--ac-red)}
.fr s{position:absolute;right:37.5px;top:10.5px;font:var(--ac-t-r17);color:var(--ac-grey);text-decoration:none}
.fr svg{position:absolute;right:21.95px;top:14.98px;width:9.1px;height:13.17px;display:block;color:var(--ac-grey)}"""

FORM_CSS = PHONE + "\n" + ROW_CSS + "\n" + SHEET_CSS + "\n" + KBD_CSS + """
.sh.grp{background:var(--ac-elev)}
.nav{position:absolute;left:0;top:85.5px;width:var(--ac-w);height:22px;z-index:5;font:var(--ac-t-r17)}
.nav u{position:absolute;left:20px;color:var(--ac-red);text-decoration:none}
.nav b{position:absolute;left:0;width:var(--ac-w);text-align:center;font:var(--ac-t-b17)}
.nav s{position:absolute;right:20px;font:var(--ac-t-b17);color:var(--ac-dim);text-decoration:none}
.fr p{position:absolute;top:4.5px;height:35px;margin:0;border-radius:var(--ac-r-field);background:var(--ac-fill);text-align:center;font:var(--ac-t-r17);line-height:35px}
.fr .tg{position:absolute;right:20px;top:6.5px;width:51px;height:31px;border-radius:var(--ac-r-pill);background:var(--ac-fill)}
.fr .tg::after{content:"";position:absolute;left:2px;top:2px;width:27px;height:27px;border-radius:var(--ac-r-pill);background:var(--ac-white);box-shadow:0 3px 8px rgba(0,0,0,.15),0 3px 1px rgba(0,0,0,.06)}"""

CHEV = icon("chevron-updown")


def fcard(top, rows):
    return ('<div class="cd" style="top:%gpx;height:%gpx">%s</div>'
            % (top, 44 * len(rows), "".join('<div class="fr">%s</div>' % r
                                            for r in rows)))


def new_event(dark=False):
    date = '<p style="left:%gpx;width:117px">Jul 21, 2023</p>'
    time = '<p style="left:%gpx;width:%gpx">%s</p>'
    body = ('<div class="hd"></div><div class="gs"></div>'
            '<div class="sh grp"></div>'
            '<div class="nav"><u>Cancel</u><b>New Event</b><s>Add</s></div>'
            + fcard(142, ['<i></i><em style="left:21px">Title</em>',
                          '<em>Location or Video Call</em>'])
            + fcard(265, ['<b>All-day</b><div class="tg"></div>',
                          '<b>Starts</b>' + date % 123.5
                          + time % (244.5, 88, "9:00&thinsp;AM"),
                          '<b>Ends</b>' + date % 116.5
                          + time % (237.5, 95, "10:00&thinsp;AM"),
                          '<b>Travel Time</b><s>None</s>' + CHEV])
            + fcard(476, ['<b>Repeat</b><s>Never</s>' + CHEV])
            + fcard(555, ['<b>Alert</b><s>None</s>' + CHEV])
            + (keyboard() + home() if dark else "")
            + statusbar())
    return page("Apple Calendar - New Event" + (" (dark)" if dark else ""),
                FORM_CSS, phone(body, dark))


# ------------------------------------------------- 08 event details

# A plain white screen: nav, a 22pt title, a three-line grey summary, then a
# 353-wide mini day view and the grouped table again -- this time stretched
# edge to edge with no fill, so only its separators show. The mini view is not
# the day view scaled: its hour pitch is 35 rather than 50 and the two events
# carry different type sizes (8.5 on the filled bar, 11 on the tinted one),
# which is what the file draws.
ED_CSS = PHONE + "\n" + ROW_CSS + """
.nv{position:absolute;left:0;top:0;width:var(--ac-w);height:110px;z-index:5}
.nv svg{position:absolute;display:block;color:var(--ac-red)}
.nv u{position:absolute;left:33px;top:64.5px;font:var(--ac-t-r17);color:var(--ac-red);text-decoration:none}
.nv b{position:absolute;left:0;top:64.5px;width:var(--ac-w);text-align:center;font:var(--ac-t-b17)}
.nv s{position:absolute;right:16.5px;top:64.5px;font:var(--ac-t-r17);color:var(--ac-red);text-decoration:none}
.et{position:absolute;left:20px;top:105.5px;width:353px;font:var(--ac-t-b22)}
.es{position:absolute;left:20px;font:var(--ac-t-r15-22);color:var(--ac-grey2)}
.mini{position:absolute;left:20px;width:353px;overflow:hidden;border-radius:var(--ac-r-event);background:var(--ac-group)}
.mini s{position:absolute;left:0;width:43px;height:13px;text-align:right;font:var(--ac-t-b11);color:var(--ac-grey);text-decoration:none}
.mini hr{position:absolute;left:48px;right:0;height:var(--ac-rule);border:0;background:var(--ac-sep)}
.ev{position:absolute;border-radius:var(--ac-r-event);background:var(--ac-event-bg)}
.ev.fl{border-radius:var(--ac-r-event) 0 0 var(--ac-r-event)}
.ev i{position:absolute;left:0;top:0;width:3px;height:100%;border-radius:var(--ac-r-event);background:var(--ac-event-bd)}
.ev b{position:absolute;font:var(--ac-t-b11);color:var(--ac-event-ink);white-space:nowrap}
.ev em{position:absolute;font:var(--ac-t-r11);font-style:normal;white-space:nowrap}
.ev svg{position:absolute;display:block;color:var(--ac-white)}
.ev.cut{border-radius:var(--ac-r-event) 0 0 0}
.ev.on{background:var(--ac-event-bd)}
.ev.sm b{font:var(--ac-t-b8)}
.ev.on b,.ev.on em{color:var(--ac-white)}
.ed{left:0;width:var(--ac-w);border-radius:0;background:none}
.ed .fr:first-child::before,.ed .fr:last-child::after{content:"";position:absolute;left:20px;right:0;height:var(--ac-hair);background:var(--ac-sep)}
.ed .fr:first-child::before{top:-0.33px}
.ed .fr:last-child::after{bottom:0}
.ed .sub{position:absolute;left:20px;top:34.5px;font:var(--ac-t-r17);color:var(--ac-grey)}
.ed .dot{position:absolute;right:94px;top:15.5px;width:13px;height:13px;border-radius:var(--ac-r-pill);background:var(--ac-event-bd)}
.del{position:absolute;left:0;top:784.5px;width:var(--ac-w);text-align:center;padding-left:1px;font:var(--ac-t-r17);color:var(--ac-red)}"""

MINI_HOURS = ["6 AM", "7 AM", "8 AM"]

# (left, width, top, height, class, inner HTML), all card-relative. Every event
# is drawn at its full Figma size and clipped by the card, so a bar that runs
# off an edge loses that corner's radius by itself; `fl` and `cut` are for the
# two on screen 08 that stop exactly ON the card's right edge, where a radius
# would show. Text offsets differ per bar and are measured, not derived.
MINI_EVENTS = [(51, 302, 35, 14, " on sm fl",
                '<i></i><b style="left:5px;top:2px">Feed Minerva \U0001F431</b>'),
               (51, 302, 88, 14, " cut",
                '<i></i><b style="left:5px;top:3px">Work '
                '\U0001F9D1\u200D\U0001F4BB</b>')]


def mini(top, height, hours, events):
    grid = "".join('<s style="top:%gpx">%s</s><hr style="top:%gpx">'
                   % (9.5 + 35 * i, h, 16.17 + 35 * i)
                   for i, h in enumerate(hours))
    ev = "".join('<div class="ev%s" style="left:%gpx;width:%gpx;top:%gpx;'
                 'height:%gpx">%s</div>' % (cls, x, w, t, h, inner)
                 for x, w, t, h, cls, inner in events)
    # data-clip-ok: the card is a window onto a taller day view, so a title's
    # line box and the bars themselves are meant to run past its edges.
    return ('<div class="mini" style="top:%gpx;height:%gpx" data-clip-ok>%s%s'
            '</div>' % (top, height, grid, ev))


def event_details(dark=False):
    body = ('<div class="nv">%s<u>Jul 21</u><b>Event Details</b><s>Edit</s></div>'
            '<div class="et">Feed Minerva \U0001F431</div>'
            '<div class="es" style="top:148.5px">Friday, Jul 21, 2023<br>'
            'from 6:30&thinsp;AM to 7&thinsp;AM<br>repeats daily</div>%s'
            '<div class="cd ed" style="top:367px;height:88px">'
            '<div class="fr"><b>Calendar</b><div class="dot"></div>'
            '<s style="right:20.5px">Calendar</s></div>'
            '<div class="fr"><b>Alert</b><s>None</s>%s</div></div>'
            '<div class="del">Delete Event</div>%s%s'
            % (chevron(), mini(250, 102, MINI_HOURS, MINI_EVENTS), CHEV, home(),
             statusbar()))
    return page("Apple Calendar - Event Details" + (" (dark)" if dark else ""),
                ED_CSS, phone(body, dark))


# ------------------------------------------------- 09 event details, video call

# The same screen with a video-call row spliced in above the summary, and a
# taller mini day view: four hours instead of three, and three bars rather than
# two, one of which carries a second line and the FaceTime glyph. The app icon
# is the shipped artwork, not a redraw; Figma applies its 7.5pt corner itself,
# so the bitmap is a full square and the radius is CSS.
VC_CSS = ED_CSS + """
.dv{position:absolute;left:20px;right:0;height:var(--ac-hair);background:var(--ac-sep)}
.vc{position:absolute;left:20px;top:147px;width:38px;height:38px;border-radius:7.5px;display:block}
.vcn{position:absolute;left:70px;top:154.5px;font:var(--ac-t-r17)}
.join{position:absolute;left:271px;top:152px;width:64px;height:28px;border-radius:var(--ac-r-btn);background:var(--ac-btn);text-align:center;padding-right:1px;font:var(--ac-t-b15);line-height:27px;color:var(--ac-red)}
.shr{position:absolute;left:345px;top:152px;width:28px;height:28px;border-radius:var(--ac-r-btn);background:var(--ac-btn)}
.shr+svg{position:absolute;left:352.291px;top:156.593px;width:13.418px;height:16.927px;display:block;color:var(--ac-red)}"""

VC_HOURS = ["4 PM", "5 PM", "6 PM", "7 PM"]

VC_EVENTS = [(51, 337, -50, 100, "", '<i></i>'),
             (51, 168, 53, 100, "",
              '<i></i><b style="left:5px;top:2.5px">Prepare Luggage '
              '\U0001F9F3</b>'),
             (220, 168, 53, 32, " on",
              '<i></i><b style="left:5px;top:2.5px">Call Parents</b>'
              + at("video-fill", 6.627, 18.707, 13.289, 8.83)
              + '<em style="left:24px;top:16.5px">FaceTime</em>')]


def video_call(dark=False):
    body = ('<div class="nv">%s<u>Sep 7</u><b>Event Details</b><s>Edit</s></div>'
            '<div class="et">Call Parents</div>'
            '<div class="dv" style="top:141.67px"></div>'
            '<img class="vc" alt="" src="%s"><div class="vcn">FaceTime</div>'
            '<div class="join">Join</div><div class="shr"></div>%s'
            '<div class="dv" style="top:189.67px"></div>'
            '<div class="es" style="top:203.5px">Thursday, Sep 7, 2023<br>'
            'from 5&thinsp;PM to 6&thinsp;PM</div>%s'
            '<div class="cd ed" style="top:435px;height:156px">'
            '<div class="fr"><b>Calendar</b><div class="dot"></div>'
            '<s style="right:20.5px">Calendar</s></div>'
            '<div class="fr"><b>Alert</b><s>10 minutes before</s>%s</div>'
            '<div class="fr" style="height:68px"><b>Text</b>'
            '<div class="sub">Talk about next week trip</div></div></div>'
            '<div class="del">Delete Event</div>%s%s'
            % (chevron(), img("facetime"),
               at("share", 352.291, 156.593, 13.418, 16.927),
               mini(283, 137, VC_HOURS, VC_EVENTS), CHEV, home(), statusbar()))
    return page("Apple Calendar - Video Call" + (" (dark)" if dark else ""),
                VC_CSS, phone(body, dark))


# ------------------------------------------------- foundations boards

# The two boards that carry Phase 1 and Phase 2: the token block rendered as
# itself, and the evidence behind every row of it. Both are built from
# TOKENS_SPEC, so neither can fall out of step with the :root the screens
# inline. Every swatch shows light over dark, because this board ships both.
SHEET = """body{padding:0;background:var(--ac-bg);color:var(--ac-ink)}
.sh8{width:478px;height:980px;padding:22px 24px;overflow:hidden}
h1{font:var(--ac-t-b20)}
header p{font:var(--ac-t-r13);color:var(--ac-grey);margin:2px 0 12px}
h2{font:var(--ac-t-b10);text-transform:uppercase;color:var(--ac-grey);margin:13px 0 6px}
.gr{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.sw .ch{height:24px;border-radius:5px;border:0.5px solid var(--ac-sep);display:flex;overflow:hidden}
.sw .ch span{flex:1}
.sw b{display:block;margin-top:3px;font:590 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--ac-grey);font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rd{display:flex;gap:10px}
.rd div{text-align:center}
.rd .b{width:46px;height:26px;background:var(--ac-fill);border:0.5px solid var(--ac-sep)}
.rd em{display:block;margin-top:3px;font:400 8.5px/11px var(--ac-font);color:var(--ac-grey);font-style:normal}
.ty{columns:2;column-gap:18px}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding-bottom:1px;border-bottom:0.5px solid var(--ac-sep);break-inside:avoid}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--ac-grey);font-style:normal;white-space:nowrap;flex:none}
.mt{columns:3;column-gap:14px;font:400 9px/13.5px ui-monospace,Menlo,monospace;color:var(--ac-grey2)}
.ev div{padding:3px 0;border-bottom:0.5px solid var(--ac-sep)}
.ev b{font:590 8.5px/12px ui-monospace,Menlo,monospace;color:var(--ac-blue)}
.ev i{font:400 8.5px/12px ui-monospace,Menlo,monospace;color:var(--ac-grey2);font-style:normal}
.ev p{font:var(--ac-t-b8);font-weight:400;color:var(--ac-grey)}"""


def _of(group):
    return [t for t in TOKENS_SPEC if t[0] == group]


def token_board():
    """Colour, radius, type and metrics, drawn with the tokens themselves. A
    two-tone chip is a token the dark frames redefine; a flat one is a token
    that is one value in both themes."""
    sw = "".join(
        '<div class="sw"><div class="ch"><span style="background:%s"></span>'
        '%s</div><b>--ac-%s</b><i>%s</i></div>'
        % (v, '<span style="background:%s"></span>' % d if d else "", n, v)
        for g in ("Surface", "Ink") for _, n, v, d, _ in _of(g))
    rd = "".join('<div><div class="b" style="border-radius:%s"></div><em>%s</em></div>'
                 % (v, n[2:]) for _, n, v, _, _ in _of("Radius") if n != "r-phone")
    ty = "".join('<div class="tr"><span style="font:var(--ac-%s)">%s</span>'
                 '<em>%s</em></div>'
                 % (n, "Minerva" if int(v.split()[1].split("px")[0]) >= 20 else "Feed Minerva",
                    v.split(" var")[0])
                 for _, n, v, _, _ in _of("Type"))
    mt = "<br>".join("--ac-%s: %s" % (n, v) for _, n, v, _, _ in _of("Metrics"))
    return page("Apple Calendar - Design Tokens", SHEET,
                '<div class="sh8"><header><h1>Apple Calendar &middot; iOS</h1>'
                '<p>Figma 3YLkiKW7ZFRg85c8k6VXFf, 393pt mode. A two-tone chip is a '
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
        rows = "".join(
            '<div><b>--ac-%s</b> <i>%s%s</i><p>%s</p></div>'
            % (n, v, " / " + d if d else "", e) for _g, n, v, d, e in chunk)
        of = " %d/%d" % (i + 1, len(pages))
        yield ("00%s-evidence" % "bcdefgh"[i],
               page("Apple Calendar - Evidence" + of, SHEET,
                    '<div class="sh8"><header><h1>Evidence%s</h1>'
                    '<p>Token, then its light value and its dark override, then '
                    'where the value came from. A token with no evidence is a '
                    'guess.</p></header><div class="ev">%s</div></div>' % (of, rows)))


# ------------------------------------------------- Phase 5: the references

# assets/refs/ref-<name>.png is the file's own PNG export of that frame at 2x,
# 786 x 1704, unretouched. They are gitignored (they are someone else's
# artwork), so a fresh clone regenerates the 20 boards above and skips these.
REF_CSS = """.rb{width:430px;height:932px;background:#151311;border-radius:20px;padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rb h1{font:var(--ac-t-b15)}
.rb p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rb .shot{margin-top:9px;display:flex;justify-content:center}
.rb img{width:393px;height:852px;display:block;border-radius:6px}"""


def ref_boards():
    for name, _label, _fn in SCREENS:
        for pre, theme in (("", "light"), ("d", "dark")):
            path = os.path.join(ASSETS, "refs", "ref-%s%s.png" % (pre, name))
            if not os.path.exists(path):
                continue
            with open(path, "rb") as f:
                uri = "data:image/png;base64," + base64.b64encode(f.read()).decode()
            label = name[3:].replace("-", " ").capitalize()
            yield ("ref-%s%s" % (pre, name),
                   page("Apple Calendar - reference: %s (%s)" % (label, theme),
                        REF_CSS,
                        '<div class="rb"><h1>%s &mdash; %s reference</h1>'
                        '<p>Figma PNG export &middot; 786&times;1704 @2x &middot; '
                        'exact frame, not a near match</p>'
                        '<div class="shot"><img alt="%s" src="%s"></div></div>'
                        % (label, theme, label, uri)))


# (file stem, caption on the canvas, builder). Both themes come from one
# builder: fn() is the light frame, fn(dark=True) the dark one.
SCREENS = [("01-today-events", "Today, with events", today_with_events),
           ("02-today-empty", "Today, empty", today_no_events),
           ("03-month", "Month", month_view),
           ("04-whats-new", "What's New", whats_new),
           ("05-location-permission", "Location permission", location_permission),
           ("06-notifications-permission", "Notifications permission",
            notifications_permission),
           ("07-new-event", "New Event", new_event),
           ("08-event-details", "Event details", event_details),
           ("09-video-call", "Event details, video call", video_call)]


def layout(refs):
    """Four rows at one pitch from x = 0, so item N of every row lands
    column-for-column under item N of the row above: each dark screen sits
    under its light one, and each Figma export under the replica of it."""
    rows = [{"title": "Foundations",
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
            rows.append({"title": title, "numbered": True, "files": files})
    return {"name": "Apple Calendar (example)", "rows": rows}


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
