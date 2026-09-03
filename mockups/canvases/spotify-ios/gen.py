"""The Spotify iOS board: five screens, cloned from five captures.

    python3 mockups/canvases/spotify-ios/gen.py

regenerates every .html in this folder, byte-identically, from anywhere --
every path resolves against __file__. The artboards are output. Never
hand-edit them; edit this file and re-run.

Sources are five 881 x 1909 exports (2.24173 capture px per design pt, crop
only, never resampled) in assets/refs/, which is gitignored. assets/art/ IS
committed: every file in it is a crop of a capture at a box in crops.json,
and without it the screens have no artwork.

WHAT IS MEASURED AND WHAT IS NOT. Every colour, box, radius and type size
below traces to a probe on those captures; the evidence boards carry one row
per token. Two things do not:

  * The typeface. refkit font returns "no call" on this UI -- SF Compact
    .737 / SF Pro .701 / SF Pro Rounded .694 on the 32px Jam title, Avenir
    Next .743 on the 24px home heading, every score weak. The face is
    Spotify Mix, a Circular derivative that is in no candidate set here.
    SF Pro is the stand-in, chosen on the bill rather than the ranking: set
    to the captures' own cap heights it lands within 1-2% of their ink
    widths on the two largest strings (1.010 and 0.980), where SF Compact
    is 12% wide and Futura 9% narrow. It is 6-11% wide at 11-16px, which is
    why the small centred lines carry a measured letter-spacing.
  * The second track row's subtitle on the home screens. At the bottom
    fade's alpha .99 it is below legibility in the capture; "sombr" is the
    artist of the track above it, not a transcription.

THE 393 x 852 FRAME. iPhone 14 Pro / 15 / 15 Pro / 16 at 1pt = 1px, with a
54pt status bar. These captures have no Dynamic Island and no home
indicator -- both were checked with flat column scans, not assumed -- so the
status bar here draws the clock and the three glyphs only.
"""
import base64, json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}
SCALE = 2.24173                                  # capture px per design pt

NAME = "Spotify"
PAGE_NAME = "(example) " + NAME + " iOS"
P = "s"          # token prefix: --s-bg, --s-ink, --s-t-h1

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Phase 2 order: font, then surface -> ink ->
# accent, then radii, type, metrics. Written with the placeholder prefix --x-
# and rewritten to P on the way out, so the CSS below stays readable.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font: no call, all weak (SF Compact .737 / SF Pro .701 / Avenir "
  "Next .743). Face is Spotify Mix, outside the set. SF Pro stands in: at "
  "matched cap height it sets 1.010 and 0.980 of the captures' ink width on "
  "&quot;Recommended Stations&quot; and &quot;Kick up some Jams.&quot;"),

 ("Surface", "bg",      "#111111",
  "flat-fill census, 04 ground x200-380 y600-640, 73% of pixels"),
 ("Surface", "bg-deep", "#030003",
  "flat-fill census, 03 ground x20-90 y700-760, 100% of pixels"),
 ("Surface", "chip",    "#333333",
  "flat-fill census, 04 Podcasts chip interior, 65%; same value inside the "
  "selected Wrapped chip, 73%"),
 ("Surface", "chip-sel-line", "#EBECE9",
  "colour scan across the Wrapped chip's left edge at y91: two capture px "
  "at #EBECE9 over a 1.3pt run, so the ring is not pure white"),
 ("Surface", "jam-top", "#121212",
  "flat-fill census, 02 modal x180-215 y190-210; flat from the modal top to "
  "59.5% of its height"),
 ("Surface", "jam-bot", "#8A0C56",
  "flat-fill census, 02 modal x150-250 y655-665, the ramp's bottom stop"),
 ("Surface", "codes-top", "#A2C6A8",
  "flat-fill census, 05 modal x150-250 y236-244, 100%; flat to 30% of height"),
 ("Surface", "codes-mid", "#526859",
  "column median at 05 y475, the ramp's measured mid stop at 63.5%"),
 ("Surface", "codes-bot", "#151716",
  "column median at 05 y595 extrapolated to the modal foot at y613.7"),

 ("Ink", "ink",     "#FFFFFF",
  "brightest plateau x40, 04 H1 / 03 H1 / 02 title / 03 button label"),
 ("Ink", "ink-2",   "#BABABA",
  "brightest plateau, 04 station subtitle x24 and the &quot;Jump into a "
  "session&quot; line x15"),
 ("Ink", "ink-3",   "#B6B6B6",
  "brightest plateau, 04 inactive tab labels; 4 levels under ink-2 and "
  "stroke-limited at 11px, kept separate rather than averaged"),
 ("Ink", "ink-on-accent", "#000000",
  "mode of the core, 02 &quot;Try it now&quot; #000300 / #000200 and the 04 "
  "avatar letter #000E00"),
 ("Ink", "ink-fine", "#DE97C3",
  "brightest plateau n=120, 02 fine print over the magenta ramp. Not a "
  "white-alpha blend: solving R and G for alpha gives .75 and .57"),
 ("Ink", "dot",     "#575457",
  "brightest plateau x23, 03 inactive page dots"),

 ("Accent", "green",  "#1ED860",
  "flat-fill census, 04 All chip 60% and the 02 Try-it-now button 71%"),
 ("Accent", "avatar", "#19E78D",
  "mode of the core, 04 account circle"),
 ("Accent", "purple", "#8500EA",
  "flat-fill census, 03 first card, 100% of pixels"),
 ("Accent", "pink",   "#F237A6",
  "flat-fill census, 03 second card, 88%"),

 ("Radius", "r-card",  "4px",
  "corner-inset fit, 04 station card: 1.35 / 0.46 at dy 1 / 2 against a "
  "circle's 1.35 / 0.54"),
 ("Radius", "r-modal", "4px",
  "corner-inset fit, 02 modal bottom-left against the scrim: 1.01 / 1.01 at "
  "dy 1 / 2"),
 ("Radius", "r-promo", "8px",
  "corner-inset fit, 03 card: 2.69 / 0.91 at dy 2 / 4 against a circle's "
  "2.70 / 1.07"),
 ("Radius", "r-codes", "0px",
  "corner-inset fit, 05 modal: inset 0.01 at dy 0.5. The modal is square"),
 ("Radius", "r-pill",  "999px",
  "04 chip corner: inset 5.37 at dy 4 against a 16px circle's 5.42, and the "
  "chip is 32 tall, so the radius is half the height"),

 ("Type", "t-h1",     "700 24px/30px var(--x-font)",
  "04 &quot;Recommended Stations&quot;, ink 253.4 x 17.8, height fit 23.8px. "
  "Weight from stroke mass against the capture, which no width or height "
  "fit sees: w600 renders 0.916 and 0.891 of it on the two headings, w700 "
  "1.011 and 0.986"),
 ("Type", "t-h1-promo", "600 25px/31.2px var(--x-font)",
  "03 &quot;Get the best live&quot;, ink 173.0 x 18.3: width fit 24.6px, "
  "height fit 24.8px; line pitch 89.7 -> 120.9"),
 ("Type", "t-h2",     "700 24px/31px var(--x-font)",
  "03 card head, line pitch 385.7 / 416.7 / 447.7; height fit 23.4-25.0px "
  "at w700 on &quot;artists live&quot; and &quot;See your&quot;"),
 ("Type", "t-title",  "700 32px/34px var(--x-font)",
  "02 &quot;Kick up some Jams.&quot;, ink 283.7 x 30.3: width fit 32.0px, "
  "height fit 33.2px at w700"),
 ("Type", "t-modal-h", "700 24px/28px var(--x-font)",
  "05 &quot;Spotify Codes&quot;, ink 147.2 x 22.8: height fit 24.9px at "
  "w700. Width fit is 22.1px -- SF Pro sets this string 8.6% wide"),
 ("Type", "t-body",   "400 16px/20px var(--x-font)",
  "02 body lines top at 456.9 / 476.7 / 496.7 / 516.7 and 03 body at 483.8 "
  "/ 503.9 / 523.7 / 544.2; height fit 15.1-15.6px at w400 on both"),
 ("Type", "t-body-sm", "400 13px/18px var(--x-font)",
  "05 body lines top at 472.9 / 491.0 / 508.6; height fit 13.1px at w400"),
 ("Type", "t-row",    "400 16px/20px var(--x-font)",
  "04 track title, ink 137.8 x 14.3: height fit 15.8px. Stroke mass puts "
  "the weight at w400 (1.031 of the capture); w500 renders 1.193"),
 ("Type", "t-sub",    "400 13px/18px var(--x-font)",
  "04 station and mix subtitles, line pitch 18.0; height fit 13.0px at w400. "
  "Sized in the browser, not in PIL: PIL's 13.7px width fit renders 11.6% "
  "over the measured 237.8 ink of &quot;Jump into a session...&quot;, and "
  "13px lands it at 246.4"),
 ("Type", "t-caption", "400 13px/17px var(--x-font)",
  "04 track subtitle, ink 66.9 x 11.6 under the bottom fade: height fit "
  "12.4px at w400"),
 ("Type", "t-chip",   "500 13px/17px var(--x-font)",
  "04 chip labels, cap 9.4; width fit 13.0px at w500 on &quot;Music&quot;"),
 ("Type", "t-btn",    "700 16px/20px var(--x-font)",
  "02 &quot;Try it now&quot; ink 70.9 x 15.2 and 05 &quot;Scan&quot; ink "
  "33.9 x 12.0: height fit 16.5 and 17.0px at w700"),
 ("Type", "t-btn-caps", "700 13px/17px var(--x-font)",
  "03 &quot;SEE LIVE EVENTS&quot;, ink 103.0 x 9.8: width fit 12.9px at w700"),
 ("Type", "t-dismiss", "700 15px/20px var(--x-font)",
  "02 and 03 &quot;Dismiss&quot;, ink 54.9 and 55.8 x 11.6: height fit "
  "14.6px at w700"),
 ("Type", "t-tab",    "500 11px/14px var(--x-font)",
  "04 tab labels, ink 28.5 x 8.5 on &quot;Home&quot;: width fit 10.4px, "
  "height fit 11.6px at w500"),
 ("Type", "t-time",   "590 17px/22px var(--x-font)",
  "iOS status bar clock, not app chrome"),

 ("Metrics", "w",      "393px", "iPhone 14 Pro / 15 / 16 logical width"),
 ("Metrics", "h",      "852px", "iPhone 14 Pro / 15 / 16 logical height"),
 ("Metrics", "status", "54px",  "iOS status bar height"),
 ("Metrics", "gutter", "16px",
  "05 search field ink at 16.1 left and 16.1 right, and 04 H1 ink at 17.6 "
  "less the 24px R side bearing"),
 ("Metrics", "rail",   "17.9px",
  "04 station and mix card ink left edge, half-coverage at 18.0 and full "
  "colour at 18.5 -- the carousel sits 1.9 outside the text gutter"),
 ("Metrics", "card",   "144.7px",
  "04 station card, ink 17.9 to 162.6; the card is square, 145 tall"),
 ("Metrics", "pitch",  "165.1px",
  "04 carousel item pitch, cards 1 and 2 at 17.9 and 183.0"),
 ("Metrics", "thumb",  "48px",
  "04 track thumb, ink 16.2 to 64.4 by 710.3 to 758.0"),
 ("Metrics", "row",    "62.2px",
  "04 track row pitch, thumb tops at 710.3 and 772.5"),
 ("Metrics", "tab",    "98.25px",
  "04 tab label centres 49.0 / 147.35 / 245.95 / 343.85, four equal columns "
  "of 393"),
 ("Metrics", "chip-h", "32px",
  "04 chip row ink band 75.0 to 107.1"),
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

# ------------------------------------------------------------- line boxes ----
# A CSS block's cap-top is not its `top`. For SF Pro the content box is
# 1.2em (hhea ascent .9556 + descent .2444) and the cap sits .705em under
# the em top, so a block of font-size F and line-height L puts its first
# cap-top at  top + (L - 1.2F)/2 + (.9556 - .705)F.  Everything on these
# screens is positioned by the cap-top that was measured off the capture,
# and this inverts that once instead of nudging tops per element.
ASC, CAP = 0.9556, 0.705


def ytop(cap_top, size, lh):
    return cap_top - (lh - 1.2 * size) / 2 - (ASC - CAP) * size


# ------------------------------------------------------------------ art ----
def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return
    from PIL import Image
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
    print("cut", n, "crops")


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


# Art that has to sit above chrome drawn later in the document. The two home
# thumbs are cut from pixels the bottom fade has already dimmed, so they go
# over the fade, not under it, or the fade lands on them twice.
Z = {"th1": 4, "th2": 4}


def art(cid, dy=0.0):
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx%s">'
            % (_uri(cid), x0, y0 + dy, x1 - x0, y1 - y0,
               ";z-index:%d" % Z[cid] if cid in Z else ""))


def backdrop(ref):
    """The four dimmed-background pieces that surround a modal."""
    return "".join(art("%s-bg-%s" % (ref, s)) for s in "tlrb")


# ------------------------------------------------------------ phone frame ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}
img.a{position:absolute;display:block}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:52px;overflow:hidden;background:var(--x-bg);color:var(--x-ink);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:8}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--x-t-time)}
.sb svg{position:absolute;display:block;fill:currentColor}
.t{position:absolute;white-space:nowrap}"""

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


def statusbar(colour="var(--x-ink)", time="9:41"):
    """No island: a flat column scan across y 11-47 of all five captures
    finds no housing, and no home indicator at the foot either."""
    return ('<div class="sb" style="color:%s"><div class="time">%s</div>%s</div>'
            % (colour, time, SB_ICONS))


# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print(name, len(html))


# The stand-in's width bill, paid per string. SF Pro sets 2-7% wider than
# the capture's face at the sizes here, and the difference lands on strings
# whose ink width is itself a measurement, so it is charged as tracking:
# (capture ink width - rendered ink width) / gaps, both read off a render.
# Never used to make a shrunken size hold a wrap -- the sizes are fitted
# first, on stroke mass, and the leftover is what this takes.
def txt(s, x, cap_top, font, colour="var(--x-ink)", size=0, lh=0,
        width=None, track=0.0, extra=""):
    """One line of type, placed by the cap-top that was measured, not by a
    box top. `width` centres it in that width instead of setting from x."""
    style = "left:%.1fpx;top:%.2fpx;font:var(--x-%s);color:%s" % (
        x, ytop(cap_top, size, lh), font, colour)
    if width is not None:
        style += ";width:%.1fpx;text-align:center" % width
    if track:
        style += ";letter-spacing:%.2fpx" % track
    return '<div class="t" style="%s%s">%s</div>' % (style, extra, s)


# ------------------------------------------------------- the home screens ----
# 01 and 04 are one screen at one scroll position; only the chip rail differs,
# so both come out of home_body(). Every number is off 04 unless noted.
HOME_CSS = """.chip{position:absolute;top:75px;height:var(--x-chip-h);
  border-radius:var(--x-r-pill);background:var(--x-chip);font:var(--x-t-chip);
  color:var(--x-ink);display:flex;align-items:center;justify-content:center}
.chip.sel{box-shadow:inset 0 0 0 1.3px var(--x-chip-sel-line)}
.chip.on{background:var(--x-green);color:var(--x-ink-on-accent)}
.av{position:absolute;left:16.1px;top:75px;width:32.1px;height:32.1px;z-index:3;
  border-radius:50%;background:var(--x-avatar);color:var(--x-ink-on-accent);
  font:var(--x-t-chip);display:flex;align-items:center;justify-content:center}
/* The circle sits on the ground with a 2.6pt ring of ground around it, so
   the chips scrolling under it on 01 stay clear. A ::before halo cannot do
   this: .av is its own stacking context, so a z-index:-1 child paints over
   the element's background rather than behind it. */
.av{box-shadow:0 0 0 2.6px var(--x-bg)}
.card{position:absolute;border-radius:var(--x-r-card);overflow:hidden}
.card img{position:absolute;left:0;top:0;display:block}
.thumb{position:absolute;width:var(--x-thumb);height:var(--x-thumb);
  border-radius:2px;overflow:hidden}
.more{position:absolute;width:17.9px;height:3.6px;z-index:2}
.more i{position:absolute;top:0;width:3.6px;height:3.6px;border-radius:50%;
  background:currentColor}
/* The scroll content fades into the ground under the tab bar. Alpha was read
   off four strings: .126 at y725, .473 at 748, .933 at 786, .988 at 811. */
.fade{position:absolute;left:0;top:700px;width:var(--x-w);height:152px;z-index:3;
  background:linear-gradient(180deg,rgba(17,17,17,0) 15px,rgba(17,17,17,.473) 48px,
    rgba(17,17,17,.933) 86px,var(--x-bg) 93px)}
/* The bar reads unfaded in the capture -- tab labels plateau at #B6B6B6 and
   the Home glyph at #FFFFFF -- so it sits above the fade, not under it. */
.tab{position:absolute;top:775.5px;width:var(--x-tab);text-align:center;
  color:var(--x-ink-3);z-index:6}
.tab.on{color:var(--x-ink)}
.tab svg{display:block;margin:0 auto;fill:none;stroke:currentColor}
.tab b{display:block;font:var(--x-t-tab);margin-top:""" + (
    "%.2fpx}" % (806.0 - 796.8 - (14 - 1.2 * 11) / 2 - (ASC - CAP) * 11))

# Tab glyphs at their measured ink boxes, viewBox = box so scale is 1:1.
TAB_ICONS = {
 "home": '<svg viewBox="0 0 20.1 21.4" style="width:20.1px;height:21.4px">'
         '<path d="M1 8.6 10.05 1 19.1 8.6v11.8H1Z" fill="currentColor"/></svg>',
 "search": '<svg viewBox="0 0 21.4 21" style="width:21.4px;height:21px">'
           '<circle cx="8.9" cy="8.9" r="7.9" stroke-width="2"/>'
           '<path d="M14.7 14.7 20.4 20" stroke-width="2"/></svg>',
 "library": '<svg viewBox="0 0 20.1 19.6" style="width:20.1px;height:19.6px">'
            '<path d="M1 0v19.6M7 0v19.6M13.4.6l5.7 18.4" stroke-width="1.8"/>'
            '<path d="M13.4.6 19.1 19" stroke-width="1.8"/></svg>',
 "create": '<svg viewBox="0 0 21.9 21.9" style="width:21.9px;height:21.9px">'
           '<path d="M11 1v19.9M1 10.95h19.9" stroke-width="2"/></svg>',
}
TABS = [("home", "Home", True), ("search", "Search", False),
        ("library", "Your Library", False), ("create", "Create", False)]

# (label, left, width). 04 has the rail at rest; 01 has it scrolled, with the
# account circle pinned over the Wrapped chip on its own ground disc.
CHIPS_04 = [("All", 59.8, 48.2, "on"), ("Wrapped", 115.5, 90.1, "sel"),
            ("Music", 213.7, 65.6, ""), ("Podcasts", 287.7, 85.7, ""),
            ("Audiobooks", 381.4, 103.9, "")]
CHIPS_01 = [("Wrapped", 7.1, 90.1, "sel"), ("Music", 105.3, 66.0, ""),
            ("Podcasts", 179.8, 85.2, ""), ("Audiobooks", 273.0, 103.9, "")]

# (crop id, subtitle line 1, subtitle line 2). Card 3 is clipped by the frame
# and its subtitle with it, so the strings are the visible fragments.
STATIONS = [("st1", "Olivia Rodrigo, Gracie", "Abrams, Noah Kahan, S…"),
            ("st2", "Ariana Grande, Billie", "Eilish, Tate McRae, Olivi…"),
            ("st3", "Taylor S", "Tate Mc")]
MIXES = [("mx1", "Gracie Abrams, Billie", "Eilish and Ariana Grande"),
         ("mx2", "Gracie Abrams, Olivia", "Rodrigo and Chappell…"),
         ("mx3", "Olivia R", "McAlpin")]


def _shelf(items, card_y, sub_y):
    out = []
    for i, (cid, l1, l2) in enumerate(items):
        _, x0, y0, x1, _ = CROPS[cid]
        out.append('<div class="card" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;'
                   'height:145px"><img src="%s" alt="" style="width:%.1fpx;'
                   'height:145px"></div>'
                   % (x0, card_y, x1 - x0, _uri(cid), x1 - x0))
        for n, line in enumerate((l1, l2)):
            out.append(txt(line, x0, sub_y + n * 18, "t-sub", "var(--x-ink-2)",
                           13, 18, track=-.16))
    return "".join(out)


def _row(cid, title, sub, dy):
    _, x0, y0, _, _ = CROPS[cid]
    return ('<div class="thumb" style="left:%.1fpx;top:%.1fpx">'
            '<img class="a" src="%s" alt="" style="left:0;top:0;width:48px;'
            'height:48px"></div>' % (x0, y0, _uri(cid))
            + txt(title, 76.0, 717.9 + dy, "t-row", "var(--x-ink)", 16, 20)
            + txt(sub, 76.0, 742.2 + dy, "t-caption", "var(--x-ink-2)", 13, 17)
            + '<div class="more" style="left:352px;top:%.1fpx">%s</div>'
              % (733.1 + dy, "".join('<i style="left:%.1fpx"></i>' % (n * 7.15)
                                     for n in range(3))))


def home_body(chips, pinned):
    out = [statusbar()]
    for label, x, w, cls in chips:
        out.append('<div class="chip %s" style="left:%.1fpx;width:%.1fpx">%s</div>'
                   % (cls, x, w, label))
    if pinned:
        out.append('<div class="av">A</div>')
    out.append(txt("Recommended Stations", 16.0, 128.7, "t-h1", "var(--x-ink)", 24, 30,
                   track=-.55))
    out.append(_shelf(STATIONS, 170.0, 329.1))
    out.append(txt("To get you started", 16.0, 388.8, "t-h1", "var(--x-ink)", 24, 30,
                   track=-.55))
    out.append(_shelf(MIXES, 430.0, 589.1))
    out.append(txt("Jump into a session based on your tastes", 16.0, 647.7,
                   "t-sub", "var(--x-ink-2)", 13, 18, track=-.28))
    out.append(txt("Start listening", 16.0, 670.7, "t-h1", "var(--x-ink)", 24, 30,
                   track=-.55))
    # Placed before the fade so the CSS type dims with it; the two thumbs are
    # cut from already-faded pixels and carry z-index 4 to sit above it.
    out.append(_row("th1", "The Fate of Ophelia", "Taylor Swift", 0))
    out.append(_row("th2", "back to friends", "sombr", 62.2))
    out.append('<div class="fade" data-clip-ok></div>')
    tabs = "".join(
        '<div class="tab%s" style="left:%.3fpx">%s<b>%s</b></div>'
        % (" on" if on else "", i * 98.25, TAB_ICONS[key], label)
        for i, (key, label, on) in enumerate(TABS))
    out.append(tabs)
    return "".join(out)


def home_chips():
    return page(NAME + " - Home, browse rail scrolled",
                '<div class="phone">%s</div>' % home_body(CHIPS_01, True), HOME_CSS)


def home():
    return page(NAME + " - Home",
                '<div class="phone">%s</div>' % home_body(CHIPS_04, True), HOME_CSS)


# ------------------------------------------------------------ 02: the Jam ----
JAM_CSS = """.modal{position:absolute;left:29.5px;top:182.5px;width:334px;height:486.3px;
  border-radius:var(--x-r-modal);z-index:2;
  background:linear-gradient(180deg,var(--x-jam-top) 0,var(--x-jam-top) 59.5%,
    var(--x-jam-bot) 100%)}
.mark{position:absolute;left:185.2px;top:119.2px;width:22.8px;height:22.8px;z-index:3;
  border-radius:50%;background:#fff}
.mark svg{position:absolute;left:3.3px;top:5.6px;width:16.2px;height:11.6px;fill:#000}
.pill{position:absolute;border-radius:var(--x-r-pill);z-index:3;
  font:var(--x-t-btn);display:flex;align-items:center;justify-content:center}
/* Everything emitted after the modal belongs on top of it. A positioned
   element with z-index:auto loses to the modal's 2 whatever the DOM order,
   so the content has to name a layer of its own. */
.modal~.t,.modal~img.a{z-index:3}"""

# The Spotify wordless mark, three arcs, drawn to the 16.2 x 11.6 ink box the
# capture puts inside the 22.8 disc.
MARK = ('<svg viewBox="0 0 16.2 11.6"><path d="M1.6 2.3C5.2.6 10.6.8 14.3 3'
        'a1 1 0 0 0 1-1.7C11.1-1.2 5.1-1.4 1 .5a1 1 0 0 0 .6 1.8Z"/>'
        '<path d="M2.5 5.9C5.6 4.5 9.9 4.7 13 6.5a.85.85 0 0 0 .9-1.45'
        'C10.4 2.95 5.5 2.75 2 4.35a.85.85 0 0 0 .5 1.55Z"/>'
        '<path d="M3.3 9.3c2.5-1.1 5.9-1 8.4.4a.7.7 0 0 0 .7-1.2'
        'c-2.9-1.6-6.7-1.7-9.6-.4a.7.7 0 0 0 .5 1.2Z"/></svg>')

JAM_BODY = ["As a Premium user, host a Jam where",
            "everyone can add songs to a playlist.",
            "Invite friends, listen together or",
            "separately, and keep the party going."]


def jam():
    b = [backdrop("02"), statusbar(), '<div class="modal"></div>',
         '<div class="mark">%s</div>' % MARK, art("02-illus")]
    # SF Pro sets this 6.7 over the measured 283.7, across 17 gaps.
    b.append(txt("Kick up some Jams.", 29.5, 404.2, "t-title", "var(--x-ink)",
                 32, 34, width=334, track=-.39))
    for i, line in enumerate(JAM_BODY):
        b.append(txt(line, 29.5, 456.9 + i * 20, "t-body", "var(--x-ink)",
                     16, 20, width=334))
    b.append('<div class="pill" style="left:129.0px;top:557.1px;width:135.2px;'
             'height:48.2px;background:var(--x-green);'
             'color:var(--x-ink-on-accent)">Try it now</div>')
    b.append(txt("Only Premium users can host a Jam.", 29.5, 634.8, "t-body-sm",
                 "var(--x-ink-fine)", 13, 18, width=334, track=-.32))
    # Dismiss sits on the scrim below the modal, inside 02-bg-b, so it is the
    # one label on this screen the crop already carries. See README.
    return page(NAME + " - Jam invitation", '<div class="phone">%s</div>'
                % "".join(b), JAM_CSS)


# --------------------------------------------------------- 03: live events ----
PROMO_CSS = """.promo{position:absolute;top:165.5px;height:514.8px;
  border-radius:var(--x-r-promo)}
.dots{position:absolute;left:163.4px;top:706.6px;height:7.1px}
.dots i{position:absolute;top:0;width:7.1px;height:7.1px;border-radius:50%;
  background:var(--x-dot)}
.dots i.on{background:var(--x-ink)}
.cta{position:absolute;left:129.5px;top:584.5px;width:134px;height:32.2px;
  border-radius:var(--x-r-pill);background:var(--x-bg-deep);color:var(--x-ink);
  font:var(--x-t-btn-caps);display:flex;align-items:center;justify-content:center}"""

PROMO_HEAD = ["See your", "favorite", "artists live"]
PROMO_BODY = ["Get updates on", "upcoming concerts near",
              "you, specifically tailored", "to your music taste."]


def live_events():
    b = [statusbar(),
         '<div class="promo" style="left:60.5px;width:272px;'
         'background:var(--x-purple)"></div>',
         '<div class="promo" style="left:351.6px;width:21.9px;'
         'background:var(--x-pink)"></div>']
    # Tracking off the measured ink: 8.5 over 172.2 across 16 gaps on the
    # outer heading, 3.6 over 93.2 across 8 on the card head.
    for i, line in enumerate(["Get the best live", "events for you"]):
        b.append(txt(line, 0, 89.7 + i * 31.2, "t-h1-promo", "var(--x-ink)",
                     25, 31.2, width=393, track=-.5))
    b.append(art("03-illus"))
    for i, line in enumerate(PROMO_HEAD):
        b.append(txt(line, 60.5, 385.7 + i * 31.0, "t-h2", "var(--x-ink)",
                     24, 31, width=272, track=-.45))
    for i, line in enumerate(PROMO_BODY):
        b.append(txt(line, 60.5, 483.8 + i * 20.1, "t-body", "var(--x-ink)",
                     16, 20, width=272))
    b.append('<div class="cta">SEE LIVE EVENTS</div>')
    b.append('<div class="dots">%s</div>' % "".join(
        '<i class="%s" style="left:%.1fpx"></i>' % ("on" if n == 0 else "", n * 15.2)
        for n in range(5)))
    b.append(txt("Dismiss", 0, 743.4, "t-dismiss", "var(--x-ink)", 15, 20, width=393))
    return page(NAME + " - Live events",
                '<div class="phone" style="background:var(--x-bg-deep)">%s</div>'
                % "".join(b), PROMO_CSS)


# ------------------------------------------------------- 05: Spotify Codes ----
CODES_CSS = """.codes{position:absolute;left:46.2px;top:233.5px;width:300.6px;
  height:380.2px;border-radius:var(--x-r-codes);z-index:2;
  background:linear-gradient(180deg,var(--x-codes-top) 0,var(--x-codes-top) 30%,
    var(--x-codes-mid) 63.5%,var(--x-codes-bot) 100%)}
.codes ~ .t,.codes ~ .pill,.codes ~ img{z-index:3}
.pill{position:absolute;border-radius:var(--x-r-pill);
  font:var(--x-t-btn);display:flex;align-items:center;justify-content:center}"""

# SF Pro sets these three lines 6.5% wider than the capture's face, and the
# first one is already flush to the modal's edges, so the shortfall is taken
# as tracking rather than as an overflowing centred line.
CODES_BODY = ["Everything on Spotify has a code for sharing. Scan it",
              "with your phone and you’ll be sent straight to that",
              "song, podcast, artist or playlist."]


def codes():
    b = [backdrop("05"), statusbar(), '<div class="codes"></div>',
         art("05-collage")]
    # 9.8 over the measured 146.8 across 12 gaps -- the widest the stand-in
    # runs anywhere on the board, and the evidence row says why.
    b.append(txt("Spotify Codes", 46.2, 440.8, "t-modal-h", "var(--x-ink)",
                 24, 28, width=300.6, track=-.8))
    for i, line in enumerate(CODES_BODY):
        b.append(txt(line, 46.2, 472.9 + i * 17.85, "t-body-sm", "var(--x-ink)",
                     13, 18, width=300.6, track=-.37))
    b.append('<div class="pill" style="left:147.1px;top:554.5px;width:99.0px;'
             'height:47.7px;background:#fff;color:var(--x-ink-on-accent);'
             'z-index:3">Scan</div>')
    return page(NAME + " - Spotify Codes",
                '<div class="phone">%s</div>' % "".join(b), CODES_CSS)


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-ink-3);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-3);margin:9px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.sw .chip{height:22px;border-radius:6px;border:1px solid #2A2A2A}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-chip);border:1px solid #3F3F3F}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-3);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid #262626}
.tr span{white-space:nowrap}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-3);
  font-style:normal;white-space:nowrap;flex:none}
.met{columns:2;font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2)}
.met div{break-inside:avoid}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid #262626;font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace}
td.t{color:var(--x-green);white-space:nowrap}
td.v{color:var(--x-ink-2);max-width:118px;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap}
td.e{color:var(--x-ink-3)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--%s-%s</b><i>%s</i></div>' % (n, P, n, v)
        for g in ("Surface", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius"))
    # The 32px specimen would not fit its row beside the label, and the row
    # clips rather than wraps, so the big cuts get a short string.
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">%s</span>'
        '<em>--%s-%s &middot; %s</em></div>'
        % (n, "Jams" if float(v.split()[1].split("px")[0]) >= 24 else
           "Kick up some Jams", P, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "".join("<div>--%s-%s: %s</div>" % (P, n, v)
                  for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s &mdash; design tokens</h1>'
                '<p>Every value is a measurement off one of the five captures. '
                'The evidence board carries the probe behind each one.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, type_, met), SHEET)


EV_ROWS = 30


def evidence_boards():
    pages = [TOKENS[i:i + EV_ROWS] for i in range(0, len(TOKENS), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--%s-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (P, n, v.replace("var(--x-font)", "var(--%s-font)" % P), e)
            for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield ("00%s-evidence" % "bcdefgh"[i],
               page(NAME + " - Evidence" + of,
                    '<div class="sheet"><header><h1>Evidence%s</h1>'
                    '<p>One row per token. A token with no evidence is a guess.</p>'
                    '</header><table class="ev">%s</table></div>' % (of, rows), SHEET))


MINI = .245                                # four phones abreast in 478 - 40
ART_CSS = SHEET + ("""
.minis{display:flex;gap:9px;justify-content:center}
.mini{position:relative;flex:none;width:%.1fpx;height:%.1fpx;
  background:#0A0A0A;outline:1px solid #2A2A2A}""" % (393 * MINI, 852 * MINI)) + """
.minis em{display:block;font:400 8px/12px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;text-align:center;margin-top:3px}
.mini img{position:absolute;display:block}
.tiles{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}
.tile{text-align:center}
.tile img{display:block;max-width:74px;max-height:74px;width:auto;height:auto;
  margin:0 auto;background:#0A0A0A}
.tile em{display:block;font:400 7.5px/10px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;margin-top:2px}"""


def art_board():
    """Where every crop came from: the boxes on four scaled phones, then the
    assets themselves at their own sizes."""
    s = MINI
    minis = ""
    for ref in ("02", "03", "04", "05"):
        ids = [c for c in CROPS if CROPS[c][0] == ref and _uri(c)]
        if not ids:
            continue
        boxes = "".join(
            '<img src="%s" alt="" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;'
            'height:%.1fpx">' % (_uri(c), CROPS[c][1] * s, CROPS[c][2] * s,
                                 (CROPS[c][3] - CROPS[c][1]) * s,
                                 (CROPS[c][4] - CROPS[c][2]) * s) for c in ids)
        minis += ('<div><div class="mini">%s</div><em>ref %s &middot; %d</em></div>'
                  % (boxes, ref, len(ids)))
    tiles = "".join('<div class="tile"><img src="%s" alt=""><em>%s</em></div>'
                    % (_uri(c), c) for c in CROPS if _uri(c))
    return page(NAME + " - Art assets",
                '<div class="sheet"><header><h1>Art assets</h1>'
                '<p>%d crops, each cut from its capture at the box in '
                'crops.json and placed back at the same numbers. Nothing here '
                'is drawn or generated.</p></header>'
                '<h2>where each crop sits</h2><div class="minis">%s</div>'
                '<h2>the assets</h2><div class="tiles">%s</div></div>'
                % (len(CROPS), minis, tiles), ART_CSS)


SCREENS = [("01-home-chips", "Home, rail scrolled", home_chips),
           ("02-jam", "Jam invitation", jam),
           ("03-live-events", "Live events", live_events),
           ("04-home", "Home", home),
           ("05-codes", "Spotify Codes", codes)]

# ------------------------------------------------- Phase 5: the references ----
REF_CSS = """body{padding:24px}
.phone img{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-h);display:block}"""


def ref_boards():
    for stem, label, _ in SCREENS:
        f = REFS_DIR / (stem[:2] + ".png")
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone"><img src="%s" alt="%s"></div>' % (uri, label),
                    REF_CSS))


# ------------------------------------------------------------------ run ----
cut()
write("00-design-tokens", token_board())
for name, html in evidence_boards():
    write(name, html)
write("00d-art", art_board())
for name, _, fn in SCREENS:
    write(name, fn())
for name, html in ref_boards():
    write(name, html)

LAYOUT = {
 "name": PAGE_NAME,
 # Without this the welcome card would show the token board, which is not a
 # phone. 04 is the app's own front door.
 "cover": "04-home",
 "rows": [
  {"title": "Foundations",
   "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
            + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]
            + [{"file": "00d-art", "label": "Art assets"}]},
  {"title": "Screens", "numbered": True,
   "files": [{"file": n, "label": l} for n, l, _ in SCREENS]},
  # Same order as the row above: the canvas lays every row out from x = 0 at
  # one pitch, so item N here lands column-for-column under item N up there.
  {"title": "Source of truth: captures", "numbered": True,
   "files": [{"file": "ref-" + n, "label": l} for n, l, _ in SCREENS]},
 ],
}
(OUT / "layout.json").write_text(json.dumps(LAYOUT, indent=2) + "\n")
print("layout.json", len(LAYOUT["rows"]), "rows")
print("\nnext: python3 tools/refkit.py tokens", OUT)
