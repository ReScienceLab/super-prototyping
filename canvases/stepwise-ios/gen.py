"""Stepwise, iOS -- two screens rebuilt from a 9.9s screen recording.

    python3 canvases/stepwise-ios/gen.py

Emits every board in this folder and `layout.json`, byte-identical on a re-run.
The `NN-*.html` files are output: edit this file, never the HTML.

THE SOURCE. A 2160x2160 30fps recording of an app called Stepwise, 297 frames.
Two states are settled long enough to measure: frames 1-23 hold the profile,
frames 43-223 hold the "Pick your vibe" sheet over it. Frame 13 and frame 85
were picked by scoring frame-to-frame difference against Laplacian variance,
not by eye. The camera zooms in from frame 24, at the same moment the sheet
animates, so there is no unzoomed sheet frame: the two references sit at
different scales and `scratch/refs.py` resamples each onto its own canonical
grid.

    assets/refs/p1.png   936 x 2029   2.381679 px/pt   frame 13, profile
    assets/refs/p2.png  1079 x 2339   2.745547 px/pt   frame 85, sheet

p2's top 69.93pt is off the top of the video and is padded with the flat
dimmed ground; no probe and no reported delta reads it.

THE CAPTURE SCALE. p1's phone rect is 936.07 x 2017.70 px. Against 393 x 852
that is 2.38185 px/pt across and 2.36819 down, a 0.58% disagreement -- under
the skill's 1% recrop threshold, and a property of the mockup rather than of
the crop: no shipping iPhone has the 2.157 aspect this frame does (390 x 844 =
2.164 is the closest). Width is what both references are normalised on.

WHAT IS DRAWN HERE RATHER THAN COPIED. Every avatar face is this repo's own
original character art. The source's twelve faces are the designer's own
illustrations and are not reproduced, traced or imitated; only their
*design-system* properties were measured and matched -- the flat black line on
a white face, the 3-unit stroke on a 100-unit circle (2.78pt at the measured
92.7pt circle), the ink box inside the circle, the circle diameter, the pale
ground, the grid pitch. The characters themselves are invented. The same rule
applies to the app-icon stack in the "3 apps added" tile, which is three plain
rounded squares in the measured colours instead of the third-party app mark the
capture shows, and to the row-1 app-icon thumbnail. README.md says what that
costs: the avatar grid's delta is not a fidelity measure and is excluded from
every claim in the table.

Everything that is interface -- sheet, scrim, grabber, title, rows, chevrons,
toggle, Pro pill, tab bar, footprints, check badge, type, spacing, radii and
colour -- is rebuilt from measurement. That is where the delta budget goes.
"""
import base64, json, re
from pathlib import Path

OUT = Path(__file__).resolve().parent
ICON_DIR = OUT / "assets" / "icons"
REF_DIR = OUT / "assets" / "refs"

NAME = "Stepwise, iOS"
PAGE_NAME = "(example) " + NAME
P = "sw"


# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Written with the placeholder prefix --x- and
# rewritten to P on the way out, so the CSS below stays readable.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  'refkit font on "Pick", the largest word: call SF Pro, 0.912, margin 0.061. '
  "At 15pt it is a no call (SF Pro .78 / Compact .75 / Rounded .75), so the "
  "call rests on one instance. The bill for that, measured ref/mine with "
  'refkit bbox on nine strings: the black weights set 1.4-3.2% narrow in the '
  'source than the stand-in does -- "You\'re a Pro member" 144.0/148.6 = '
  '0.969, "About Stepwise" 106.6/109.2 = 0.976, "VB" 27.7/28.1 = 0.986 -- '
  'while the 13pt grey text and the 27pt title are within 0.4% '
  '("Manage subscription" 1.003, "Pick your vibe" 172.3/172.3 = 1.000). '
  "So the residual in the list and the Pro card is type width, not layout"),

 ("Surface", "bg",     "#F4F0EB",
  "flat census, page ground right of the cards, p1 x 378-390 y 700-840: "
  "#F4F0EB 32%, the rest within 3 levels (video compression, not a gradient)"),
 ("Surface", "card",   "#FEFEFE",
  "flat census inside the left tile, p1 x 30-160 y 358-396: 100% flat"),
 ("Surface", "sheet",  "#F0EEEF",
  "flat census inside the sheet, p2 x 30-360 y 340-358: 100% flat"),
 ("Surface", "well",   "#F8F5F9",
  "flat census, the pale disc behind the footprints, p1 x 222-232 y 303-332: 100% flat"),
 ("Surface", "chip",   "#EEEAE6",
  "flat census, the selected tab's pill, p1 x 258-285 y 790-812: #EEEAE5 54%, #EEEAE7 45%"),
 ("Surface", "bar",    "rgba(255,255,255,.85)",
  "the tab bar reads #FEFCF9 over the #F5F1EC below it; .85 white solves it to "
  "within 3 levels. It is a material, not a fill: the faded row text shows through"),
 ("Surface", "scrim",  "rgba(0,0,0,.20)",
  "p2 #C3BFBC over #F4F0EB and #CDCACE over #FEFEFE: both solve .20"),

 ("Line", "hairline",  "#F1F1F1",
  "list divider, p1 col 320: #FEFEFE to y646.3, #F4F4F4 / #F1F1F1 / #F6F6F6 "
  "over 1.3pt, back to #FDFDFD. refkit hairline returns the ground at band "
  "widths 2, 5 and 6, so this is the run minimum, not a coverage solve"),
 ("Line", "dash",      "#AEAAA5",
  "ink mean of the dashed rule under VB, p1 x 181-212 y 238.5-241.5; the "
  "coverage solve fails on a dashed rule for the same reason"),
 ("Line", "grabber",   "#B6B3B6",
  "mode of the sheet grabber core, p2 x 181-212 y 275-278: 56%"),

 ("Ink", "ink",        "#000000",
  "ink core of VB, p1 x 182-211 y 217-233: the darkest 2% is #000000"),
 ("Ink", "ink-2",      "#888888",
  '"Daily target" #878787 and "Manage subscription" #8A898A: one token'),
 ("Ink", "ink-3",      "#BBBBBB",
  "ink core of the About row's chevron, p1 x 348-353 y 733-740"),
 ("Ink", "ink-inv",    "#FFFFFF",
  "the toggle knob, p1 x 319-353 y 677: #FFFFFF flat"),

 ("Accent", "green",   "#2DB150",
  "mode of the check disc core, p2 x 338-352 y 440-452: 87%"),
 ("Accent", "pro-a",   "#D736A9",
  "the Pro pill's ramp, p1 col 66: #DB49B2 at y479.0 and #F6CCED at y507.2, "
  "a straight line in all three channels, extrapolated to the pill top 474.9"),
 ("Accent", "pro-b",   "#FADEF5",
  "the same line extrapolated to the pill foot 511.4"),

 ("Radius", "r-tile",  "20.5px",
  "joint (x0,y0,r) least-squares fit on the 50%-crossing of both tiles' "
  "top-left corners, p1: 20.75 and 20.25, rms 0.21 and 0.23pt"),
 ("Radius", "r-pro",   "23.5px",
  "the same fit on the Pro card, p1 corner (21.1, 449.4): rms 0.22pt. The "
  "source really does use three different card radii"),
 ("Radius", "r-list",  "25.5px",
  "the same fit on the list card, p1 corner (21.0, 572.1): rms 0.21pt"),
 ("Radius", "r-sheet", "33.5px",
  "the same fit on the sheet, p2 corner (9.0, 270.0): rms 0.18pt"),
 ("Radius", "r-icon",  "9px",
  "the row-1 app thumbnail, 35.7 x 34.8: the corner is 4.0 in at dy 1.6"),
 ("Radius", "r-pill",  "999px",
  "the toggle, its knob, the tab bar and the tab bar's selected chip are all "
  "exactly half their height: 14.3 / 11.9 / 31.25 / 27.0"),
 ("Radius", "r-phone", "52px",
  "p2 col 30 leaves the sheet at y 847.4; a 52pt circular corner predicts "
  "847.1. That is the stand-in for the iPhone's 55pt continuous corner, and "
  "refkit --crop-phone masks the same 52"),

 ("Type", "t-title",   "700 27px/27px var(--x-font)",
  'p2 "Pick your vibe": cap 19.3, x-height 14.9 (0.772 of cap, the same ratio '
  "as VB), ink 172.3 wide. SF Pro Display bold sets it 3.3% wide at matched cap"),
 ("Type", "t-name",    "700 22px/22px var(--x-font)",
  'p1 "VB": cap 15.9, ink 27.7 wide, i-stem/cap 0.207. SF Pro Display bold is '
  "5.7% wide at matched cap, so 22 rather than the cap-matched 22.3"),
 ("Type", "t-pill",    "800 19px/19px var(--x-font)",
  'p1 "Pro" inside the pill, black core only (--dark 40..128 all agree): '
  "29.6 x 14.1, so cap 14.1 and a heavier weight than anything else on the "
  "screen. 19px sets that string 29.8 wide against 19.98px for a matched cap, "
  "and width is the error that shows: the outline is 1.45pt of white either side"),
 ("Type", "t-tile",    "600 15px/15px var(--x-font)",
  'p1 "3 apps added" 95.7 wide and "10,000 steps" 91.5, digits 10.9 tall, '
  "stems 1.8-2.1 = w590-650"),
 ("Type", "t-row",     "500 15px/15px var(--x-font)",
  'p1 "Movement nudges" 125.5 wide, cap 10.9, x-height 8.4, b-stem 1.5-1.7 = w460-510'),
 ("Type", "t-note",    "500 13px/13px var(--x-font)",
  'p1 "Daily target" 70.1 wide, cap 8.4'),
 ("Type", "t-sub",     "400 13px/13px var(--x-font)",
  'p1 "Manage subscription" 125.1 wide, cap 8.8'),
 ("Type", "t-time",    "590 17px/22px var(--x-font)",
  "iOS status bar clock, from templates/gen.py unchanged"),

 ("Metrics", "w",       "393px",  "iPhone 15/16 logical width"),
 ("Metrics", "h",       "852px",  "iPhone 15/16 logical height"),
 ("Metrics", "status",  "54px",   "iOS status bar, Dynamic Island devices"),
 ("Metrics", "gutter",  "20.7px",
  "the corner fits put all three cards' left edge at 20.8-21.1 and the row "
  "scans put their right edge at 372.6-372.8; 20.7 splits it"),
 ("Metrics", "tile",    "170px",
  "p1 tiles: 20.7-190.7 and 202.6-372.6 across, 266.9-437.0 down. They are square"),
 ("Metrics", "row",     "56px",
  "p1 dividers at 646.9 / 708.6 / 763.9: the text-only rows are 55.3 and 56.3. "
  "The toggle row is 61.7 and the thumbnail row 74.8, both content-driven"),
 ("Metrics", "av",      "92.7px",
  "p2 grid circles across row 409.6: 38.2-130.9, 150.2-243.1, 262.4-355.3. "
  "Down column 84.5 they measure 93.4, the same 0.7% the capture's own aspect is out by"),
 ("Metrics", "av-x",    "112.18px", "p2 column centres 84.55 / 196.65 / 308.85"),
 ("Metrics", "av-y",    "108.78px", "p2 row centres 409.45 / 518.20 / 627.10 / 735.80"),
 ("Metrics", "hero",    "117.5px",
  "p1 profile circle 138.6-254.9 x 80.2-197.3 at a bright-250 threshold, which "
  "runs about 1pt tight against the corner fits; centre (196.75, 138.75)"),
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


# ----------------------------------------------------------------- icons ----
def icon(name, x, y, w, h, extra=""):
    """Inline assets/icons/<name>.svg at a measured box, in page pt. Each file's
    viewBox is its own ink units, so the box written here is the measurement.
    The canvas inspector names the inline <svg> from assets/icons/ by geometry."""
    svg = (ICON_DIR / (name + ".svg")).read_text(encoding="utf-8").strip()
    return svg.replace("<svg ", '<svg class="ic" style="left:%gpx;top:%gpx;'
                       'width:%gpx;height:%gpx%s" ' % (x, y, w, h, extra), 1)


# The type is positioned by its cap top, which is what a bbox on a capture
# reports; CSS positions the line box. With line-height set equal to the font
# size (every --x-t-* token below does), SF Pro's cap top sits this far down:
#   half-leading (1 - 1.1938)/2 + ascent 0.9558 - cap 0.7143 = 0.1446 em
CAP = 0.1446


def cap(y, size):
    """The `top` that puts a cap top at page y, for a font-size of `size`."""
    return round(y - CAP * size, 2)


# ------------------------------------------------------------ phone frame ----
# The bezel is this repo's own framing, not a property of the app being cloned,
# so it is the same in every canvas folder.
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
    """From templates/gen.py, unchanged. The capture draws no Dynamic Island,
    so both screens call this with island=False, and its clock sits further
    left than the template's default box centres one: SCREEN_CSS narrows
    .sb .time to the measured centre rather than fork this function."""
    return ('<div class="sb" style="color:%s">%s<div class="time">%s</div>%s</div>'
            % (colour, '<div class="island"></div>' if island else "", time, SB_ICONS))


# The Focus crescent the capture carries beside its clock, at its measured ink
# box: 76.8-90.3 x 19.7-33.2, 6.3 right of the clock. SCREEN_CSS narrows the
# template's clock box to put the clock where this capture has it.
FOCUS = icon("moon", 76.8, 19.7, 13.5, 13.5)


# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html, encoding="utf-8", newline="\n")
    print("%-28s %8d" % (name, len(html)))


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 15px/19px var(--x-font);margin-bottom:2px}
header p{font:400 9.5px/13px var(--x-font);color:#6E6C6A;margin-bottom:12px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:#6E6C6A;margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid #E6E2DD}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:#6E6C6A;font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:46px;height:30px;background:var(--x-card);border:1px solid #CFCBC6}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:#6E6C6A;font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  flex-wrap:wrap;
  padding-bottom:3px;margin-bottom:3px;border-bottom:1px solid #E6E2DD}
.tr span{white-space:nowrap}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:#6E6C6A;
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:#6E6C6A}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid #E6E2DD;font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:#B0308E}
td.v{color:#6E6C6A;max-width:132px;overflow:hidden;text-overflow:ellipsis}
td.e{color:#4A4846}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n not in ("r-pill", "r-phone"))
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Grumpy wizards</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Every value is measured off assets/refs/p1.png at 2.381679 px/pt '
                'or p2.png at 2.745547 px/pt. The evidence boards carry the probe '
                'behind each one, and probes.json replays them.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, type_, met), SHEET)


EV_ROWS = 22   # what fits the 478 x 980 box at this evidence length


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


# ----------------------------------------------------------------- screens ----
# Every number below is a page coordinate in design pt, straight off the two
# references. Nothing is derived from a grid the source does not have: the five
# list rows are 74.8 / 61.7 / 55.3 / 56.3 pt tall because their content is, and
# the three cards carry three different radii.
SCREEN_CSS = """.phone .ic{position:absolute;display:block;overflow:visible}
/* The two overrides of the shared status bar. This mockup does not draw the
   iPhone one: measured on p1, its clock ink runs 38.2-70.5 x 20.2-32.8, its
   signal bars 287.6-307.3 x 19.7-32.8, its wifi arc 314.5-331.7 x 19.7-32.3
   and its battery 339.3-366.5 x 20.2-33.2. Against templates/gen.py that is a
   clock centred on 54.35 rather than 71.2, and a right-hand cluster 5.9pt
   further right and 3.1pt higher. Two rules put the template's own status bar
   on those boxes; statusbar() itself is left alone. */
.sb .time{width:109.5px;top:14.9px}
.sb svg{translate:5.9px -3.1px}
.t{position:absolute;white-space:nowrap}
.d{position:absolute}

/* --- profile head ------------------------------------------------------ */
.hero{left:138px;top:80px;width:var(--x-hero);height:var(--x-hero);
  border-radius:50%;background:var(--x-card)}
/* the badge is a ground-coloured ring with a white disc inside it, not a
   bordered circle: it punches through the hero's edge */
.shuf{left:225.3px;top:167.3px;width:30.3px;height:30.3px;border-radius:50%;
  background:var(--x-bg)}
.shuf i{position:absolute;left:3px;top:3px;width:24.3px;height:24.3px;
  border-radius:50%;background:var(--x-card)}
.name{left:0;top:213.92px;width:var(--x-w);text-align:center;font:var(--x-t-name)}
.dash{left:181.8px;top:239.3px;width:29.8px;height:1.3px;
  background:repeating-linear-gradient(to right,
    var(--x-dash) 0 2.1px,transparent 2.1px 5.45px)}

/* --- the two tiles ----------------------------------------------------- */
.tile{top:266.9px;width:var(--x-tile);height:170.1px;
  background:var(--x-card);border-radius:var(--x-r-tile)}
.well{left:219.75px;top:289.95px;width:54.5px;height:54.5px;
  border-radius:50%;background:var(--x-well)}

/* --- the Pro card ------------------------------------------------------ */
.procard{left:var(--x-gutter);top:449.4px;width:351.9px;height:88.5px;
  background:var(--x-card);border-radius:var(--x-r-pro)}
.pill{left:38.6px;top:474.9px;width:55px;height:36.5px;
  border-radius:18px 4px 17px 17px;
  background:linear-gradient(to bottom,var(--x-pro-a),var(--x-pro-b))}
.pill b{position:absolute;left:0;top:8.55px;width:55px;text-align:center;
  font:var(--x-t-pill);color:var(--x-ink);
  -webkit-text-stroke:2.9px var(--x-ink-inv);paint-order:stroke fill}
.pill s{position:absolute;background:var(--x-ink-inv);border-radius:50%;opacity:.8}

/* --- the settings list -------------------------------------------------- */
/* The list runs off the bottom of the screen behind a scroll fade. Sampled in
   10pt bands down x 26..96, the card's coverage over the #F4F0EB ground runs
   1.00 at y 758, .58 at 780, .26 at 800 and settles near .06 from y 818 to the
   screen foot -- the fade does not reach zero, and the "Privacy Policy" row is
   still legible under it. */
.list{left:var(--x-gutter);top:572.1px;width:351.9px;height:279.9px;
  background:var(--x-card);
  border-radius:var(--x-r-list) var(--x-r-list) 0 0;
  -webkit-mask-image:linear-gradient(to bottom,#000 185.9px,rgba(0,0,0,.06) 245.9px);
  mask-image:linear-gradient(to bottom,#000 185.9px,rgba(0,0,0,.06) 245.9px)}
.list .lab{position:absolute;font:var(--x-t-row);color:var(--x-ink)}
.list .hr{position:absolute;left:18.2px;width:315.8px;height:1px;
  background:var(--x-hairline)}
.thumb{position:absolute;left:14.6px;top:23.3px;width:35.7px;height:34.8px;
  border-radius:var(--x-r-icon);overflow:hidden}
.tgl{position:absolute;left:272.5px;top:91.1px;width:63.4px;height:28.6px;
  border-radius:var(--x-r-pill);background:var(--x-ink)}
.tgl i{position:absolute;left:24.8px;top:2.6px;width:36.1px;height:23.8px;
  border-radius:var(--x-r-pill);background:var(--x-ink-inv)}

/* --- the floating tab bar ----------------------------------------------- */
/* The shadow is the one value on this screen that is fitted rather than read:
   below the bar the ground drops to #EBE6E3 from #F4F0EB and recovers over
   about 14pt, which is this blur at this alpha to within 2 levels. */
.tabs{left:102.3px;top:770.7px;width:189px;height:62.5px;
  border-radius:var(--x-r-pill);background:var(--x-bar);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  box-shadow:0 5px 20px rgba(0,0,0,.055)}
.tabs u{position:absolute;left:90.7px;top:3.7px;width:93.7px;height:53.9px;
  border-radius:var(--x-r-pill);background:var(--x-chip)}

/* --- the sheet ----------------------------------------------------------- */
.scrim{position:absolute;inset:0;background:var(--x-scrim);z-index:4}
.bs{left:9px;top:270px;width:375px;height:575.8px;background:var(--x-sheet);
  border-radius:var(--x-r-sheet);z-index:5}
.grab{position:absolute;left:170.2px;top:4.3px;width:35px;height:5.1px;
  border-radius:var(--x-r-pill);background:var(--x-grabber)}
.bs h1{position:absolute;left:0;top:35px;width:375px;text-align:center;
  font:var(--x-t-title)}
/* 29.2 = the first column centre 84.55, less the 46.35 radius and the sheet's
   own left edge; 93.1 is the same subtraction down. */
.av{position:absolute;width:var(--x-av);height:var(--x-av);border-radius:50%;
  background:var(--x-card)}
.av .ic{left:0;top:0;width:var(--x-av);height:var(--x-av)}"""


def chev(x, y, w=7.2, h=12.2):
    """chevron.right at its measured ink box, page pt."""
    return icon("chevron", x, y, w, h, ";color:var(--x-ink-3)")


# (divider y, glyph, glyph box, label, label x, cap top, accessory). Page pt.
# Divider 0.0 means "no rule above this row": row 1 is the top of the card.
ROWS = [
 (0.0,   "appicon", (35.3, 595.4, 35.7, 34.8), "App icon",        79.8, 607.1, "chev"),
 (646.9, "walk",    (41.1, 665.9, 23.1, 22.3), "Movement nudges", 80.2, 671.8, "toggle"),
 (708.6, "info",    (43.2, 726.2, 19.3, 19.3), "About Stepwise",  79.8, 730.6, "chev"),
 (763.9, "bell",    (43.7, 783.1, 18.0, 19.7), "Notifications",   80.2, 786.4, "chev"),
 (820.1, "hand",    (45.8, 839.3, 17.0, 17.8), "Privacy Policy",  79.8, 843.5, "chev"),
]
LIST_L, LIST_T = 20.7, 572.1


def settings_list():
    """The five rows, placed by their own measurements inside the masked card.
    Rows 4 and 5 sit under the fade: the bell and the hand are measured at a
    threshold the fade lets through, so their boxes are the visible ink and may
    run 1-2pt small. The fifth divider, if there is one, is past the screen."""
    out = []
    for rule, glyph, (gx, gy, gw, gh), label, lx, ly, acc in ROWS:
        if rule:
            out.append('<div class="hr" style="top:%gpx"></div>' % (rule - LIST_T))
        if glyph == "appicon":
            # the app thumbnail. Original art: see the module docstring.
            out.append('<div class="thumb">%s</div>'
                       % icon("appicon", 0, 0, gw, gh))
        else:
            out.append(icon(glyph, gx - LIST_L, gy - LIST_T, gw, gh))
        out.append('<div class="lab" style="left:%gpx;top:%gpx">%s</div>'
                   % (lx - LIST_L, cap(ly, 15) - LIST_T, label))
        if acc == "toggle":
            out.append('<div class="tgl"><i></i></div>')
        else:
            out.append(chev(346.8 - LIST_L, (ly - 0.4) - LIST_T))
    return "".join(out)


def profile(hero="av-02"):
    """Screen 01, frame 13. `hero` names which face the head shows: the capture
    puts the selected avatar there, so screen 02 passes its own."""
    return (
     statusbar(island=False) + FOCUS +

     # head: white disc on the page ground, the shuffle badge punching its edge.
     # Both glyphs are siblings of their discs, so every icon() on this screen
     # takes page coordinates.
     '<div class="d hero"></div>%s<div class="d shuf"><i></i></div>%s'
     '<div class="t name">VB</div><div class="d dash"></div>'
     % (icon(hero, 138, 80, 117.5, 117.5), icon("shuffle", 232.2, 175.9, 15.5, 13)) +

     # left tile: the app stack. Original art: see the module docstring.
     '<div class="d tile" style="left:var(--x-gutter)"></div>%s'
     '<div class="t" style="left:37.8px;top:%gpx;font:var(--x-t-tile)">3 apps added</div>%s'
     % (icon("appstack", 43.8, 292.5, 76.1, 58), cap(405.6, 15), chev(144.9, 406, 6.3, 10.9)) +

     # right tile: daily target
     '<div class="d tile" style="left:202.6px"></div><div class="d well"></div>%s'
     '<div class="t" style="left:220px;top:%gpx;font:var(--x-t-note);'
     'color:var(--x-ink-2)">Daily target</div>'
     '<div class="t" style="left:220px;top:%gpx;font:var(--x-t-tile)">10,000 steps</div>%s'
     % (icon("footprints", 235.5, 303.1, 23.1, 28.6), cap(385, 13), cap(406, 15),
        chev(322.9, 406, 6.3, 10.9)) +

     # the Pro card. The five dots are the pill's own sparkle, drawn at the
     # sizes they read at rather than traced.
     '<div class="d procard"></div>'
     '<div class="d pill"><b>Pro</b>'
     '<s style="left:9.5px;top:25.5px;width:2.2px;height:2.2px"></s>'
     '<s style="left:44.5px;top:7.5px;width:1.8px;height:1.8px"></s>'
     '<s style="left:47.5px;top:21.5px;width:2.6px;height:2.6px"></s>'
     '<s style="left:16.5px;top:30.5px;width:1.6px;height:1.6px"></s>'
     '<s style="left:38.5px;top:29.5px;width:2px;height:2px"></s></div>'
     '<div class="t" style="left:105.8px;top:%gpx;font:var(--x-t-tile)">'
     "You're a Pro member</div>"
     '<div class="t" style="left:106.6px;top:%gpx;font:var(--x-t-sub);'
     'color:var(--x-ink-2)">Manage subscription</div>%s'
     % (cap(479.1, 15), cap(498.8, 13), chev(347.2, 487.65)) +

     # the settings list behind its scroll fade
     '<div class="d list">%s</div>' % settings_list() +

     # the floating tab bar. No home indicator: the capture has none.
     '<div class="d tabs"><u></u>%s%s</div>'
     % (icon("house", 140.7 - 102.3, 788.5 - 770.7, 25.6, 25.2),
        icon("person", 227.6 - 102.3, 788.9 - 770.7, 24.7, 25.2)))


# The twelve faces, in draw order. Original art: see the module docstring.
FACES = ["av-%02d" % i for i in range(1, 13)]
SELECTED = 2          # zero-based; the capture's check badge is on item 3
SHEET_L, SHEET_T = 9.0, 270.0


def pick_your_vibe():
    """Screen 02, frame 85: the profile dimmed under the avatar picker."""
    cells = []
    for i, face in enumerate(FACES):
        cells.append(
            '<div class="av" style="left:calc(29.2px + var(--x-av-x) * %d);'
            'top:calc(93.1px + var(--x-av-y) * %d)">%s</div>'
            % (i % 3, i // 3, icon(face, 0, 0, 92.7, 92.7)))
    # the check badge, measured on its own centre rather than hung off the circle
    cells.append(icon("check", 344.92 - 11.29 - SHEET_L, 446.18 - 11.29 - SHEET_T,
                      22.58, 22.58, ";color:var(--x-green)"))
    return (profile(hero=FACES[SELECTED]) +
            '<div class="scrim"></div>'
            '<div class="d bs"><div class="grab"></div>'
            '<h1>Pick your vibe</h1>%s</div>' % "".join(cells))


SCREENS = [("01-profile", "Profile", profile),
           ("02-pick-your-vibe", "Pick your vibe", pick_your_vibe)]


# ------------------------------------------------- Phase 5: the reference ----
# The two canonical frames, unretouched, on their own boards, parked under the
# replicas. assets/refs/ and ref-*.html are both gitignored: they are frames of
# a third-party recording and this repo does not redistribute them. Without
# assets/refs/ this file builds every other board and skips these two.
REF_CSS = """.rboard{width:430px;height:932px;background:#151311;border-radius:20px;
  padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rboard h1{font:600 14px/18px var(--x-font);letter-spacing:-.1px}
.rboard p{font:400 9.5px/13px ui-monospace,Menlo,monospace;
  color:rgba(255,255,255,.5);margin-top:2px}
.rboard .shot{margin-top:9px;display:flex;justify-content:center}
.rboard img{height:844px;width:auto;display:block;border-radius:6px}
.rboard .near{color:#F1CD8A}"""

# (screen file, label, capture, px/pt, note). The note is not decoration: say
# where a reference is a near match and never let one pass as exact.
REFS = [
 ("01-profile", "Profile", "p1.png", "2.381679",
  "near: frame 13 of 297, the settled profile. Its avatar is the source "
  "designer's art and is not what the replica draws."),
 ("02-pick-your-vibe", "Pick your vibe", "p2.png", "2.745547",
  "near: frame 85, camera-zoomed. The top 69.93pt is off the video and is "
  "padded flat here; all twelve faces are the source designer's art."),
]


def ref_boards():
    for name, label, shot, scale, note in REFS:
        src = REF_DIR / shot
        if not src.exists():
            continue
        raw = src.read_bytes()
        w, h = re.search(rb"IHDR(....)(....)", raw).groups()
        dims = "%dx%d" % (int.from_bytes(w, "big"), int.from_bytes(h, "big"))
        uri = "data:image/png;base64," + base64.b64encode(raw).decode()
        body = ('<div class="rboard"><h1>%s &mdash; reference</h1>'
                '<p>%s &middot; assets/refs/%s &middot; %s @ %s px/pt &middot; '
                '<span class="near">%s</span></p>'
                '<div class="shot"><img src="%s" alt="%s"></div></div>'
                % (label, name, shot, dims, scale, note, uri, label))
        yield "ref-" + name, page(NAME + " - reference: " + label, body, REF_CSS)


# ------------------------------------------------------------------- run ----
write("00-design-tokens", token_board())
for _name, _html in evidence_boards():
    write(_name, _html)
for _name, _label, _fn in SCREENS:
    write(_name, page(NAME + " - " + _label, '<div class="phone">%s</div>' % _fn(),
                      SCREEN_CSS))
_refs = list(ref_boards())
for _name, _html in _refs:
    write(_name, _html)
if not _refs:
    print("(no assets/refs: skipped the %d reference boards)" % len(REFS))

LAYOUT = {
 "name": PAGE_NAME,
 "rows": [
  {"title": "Foundations",
   "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
            + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]},
  {"title": "Stepwise iOS replica screens", "numbered": True,
   "files": [{"file": n, "label": l} for n, l, _ in SCREENS]},
  # Same order as the row above: the canvas lays every row out from x = 0 at
  # one pitch, so item N here lands column-for-column under item N up there.
  {"title": "Source of truth: recording frames", "numbered": True,
   "files": [{"file": "ref-" + n, "label": l} for n, l, _, _, _ in REFS]},
 ],
}
(OUT / "layout.json").write_text(json.dumps(LAYOUT, indent=2) + "\n",
                                 encoding="utf-8", newline="\n")
print("layout.json", len(LAYOUT["rows"]), "rows")
