"""Emit mockups/canvases/skillpath-ios/ from five frames of one screen recording.

The source is a 9-second pan-and-zoom over three iPhone 17 Pro simulator
windows (https://x.com/BreejeAnadkat/status/2096553815071993964). Two of the
three windows hold the same unnamed gamified self-improvement app: a Home tab
with a streak card, a level bar and a quest list, and a Path tab with a
serpentine road of lessons. This folder rebuilds five of its screens.

Because the recording zooms, every frame has its own scale, so there is no one
"capture scale" here: SCALES below carries one px-per-pt figure per frame and
every measurement in this file was read at the scale of the frame it came from.
The device is 402 x 874 pt, not the 393 x 852 the rest of this repo uses --
that is an iPhone 17 Pro, and the numbers only close on 402 x 874 (width and
height scales agree to 0.07% there and disagree by 0.34% at 393 x 852).

Chrome is CSS: cards, pills, the tab bar, the progress bar, the road and every
glyph of type. Illustration is cropped out of the capture at its own measured
box -- `crops.json` names each box, `cut()` writes assets/art/<id>.png and
`art()` places the <img> back at the same numbers.

    python3 mockups/canvases/skillpath-ios/gen.py

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

# capture px per design pt, one per frame: the recording zooms between them.
# Each is (frame width / 402 + frame height / 874) / 2 on the screen-inner rect
# found by scanning the bezel transition.
SCALES = {"c1": 1.01194, "c2": 1.07450, "c3": 1.01490,
          "c4": 1.01490, "c5": 1.07985}

NAME = "Skill Path"
PAGE_NAME = "(example) " + NAME
P = "sp"

W, H = 402.0, 874.0          # iPhone 17 Pro logical size

# ---------------------------------------------------------------- tokens ----
# `refkit font` returns "no call, weak" on both the largest glyph on the Home
# screen ("3" of 3 Days, 0.721) and on the Path title ("S" of Skill Path,
# 0.510): a 1.01x video frame of a 24pt cap cannot separate SF Pro from SF Pro
# Rounded. The app is a simulator build with no custom face anywhere in it, so
# the family recorded is the platform stack and the cut is not claimed.
FONT = ('-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
        '"Helvetica Neue",Helvetica,Arial,sans-serif')

# name -> (weight, px, evidence). The px column is the size at which the board's
# ink width matches the capture's, measured on the string named in the row.
TYPE = {
 "hero":  (700, 31.5, 'probe t-hero, c2 "3 Days": ref ink 96.8 pt wide, board 96.8'),
 "title": (700, 24.5, 'probe t-title, c4 "Skill Path": ref 100.5, board 100.5'),
 "h1":    (700, 17.5, 'probe t-h1, c2 "Level 4": ref 54.9, board 55.8, +1.6%'),
 "sect":  (700, 17.0, 'probe t-sect, c2 "Today\u2019s Quest": ref 112.6, board 112.6. '
                      'Half a point smaller than h1, and the two do not merge: '
                      'forcing this run to 17.5 costs c1 and c2 0.10 and 0.15'),
 "h2":    (700, 24.5, 'probe t-h2, c5 "Barrier Repair": ref 153.7, board 150.9. '
                      'The width asks for 25px and the frame does not: 25px '
                      'costs c5 0.31, so the -1.8% stands'),
 "greet": (700, 20.0, 'probe t-greet, c2 "Welcome Back": ref 134.9, board 134.0'),
 "count": (700, 16.0, 'probe t-count, c2 "235" in the gem pill: ref 27.9, board '
                      '28.9. A wider box takes the pill border with it, so this '
                      'one was settled on a zoom pair as well, scratch/p_gem.png'),
 "node":  (600, 16.6, 'probe t-node, c4 "Under-Eye Care": ref 120.2, board 120.2'),
 "row":   (600, 15.5, 'probe t-row, c2 quest row 1 title: ref 130.3, board 131.2'),
 "chipname": (600, 15.0, 'probe t-chipname, c4 "Oral Posture": ref 86.7, board 85.7'),
 "cta":   (700, 15.0, 'probe t-cta, c5 "START LESSON": ref 116.7, board 118.5. '
                      'The width is what set the tracking: .09em ran 125.9 wide, '
                      '.045em lands within 2%'),
 "body":  (500, 15.0, 'probe t-body, c2 "Hi, James": ref 67.0, board 65.1'),
 "meta":  (500, 13.5, 'probe t-meta, c2 "95/120 XP": ref 63.3, board 63.3'),
 "date":  (400, 15.5, 'probe t-date, c2 the Thu numeral "12": ref 14.9, board 15.8. '
                      'Two glyphs is a thin sample; 14.6px measures better and '
                      'renders worse, so the round number stands'),
 "sub":   (400, 13.0, 'probe t-sub, c2 quest row 1 subtitle: ref 196.4, board 195.4'),
 "cap":   (600, 11.7, 'probe t-cap, c2 "CURRENT STREAK": ref 108.0, board 108.9. '
                      'A cap-height read said 14px, which set it 18% too wide'),
 "tab":   (500, 12.0, 'probe t-tab, c2 "Home": ref 32.6, board 31.6. The four '
                      'labels band at 49.3-81.9 / 144.3-168.5 / 232.7-261.5 / '
                      '313.6-363.0; "Progress" is 49.3 wide against 49.3'),
 "day":   (500, 11.0, 'probe t-day, c2 "Mon": ref 20.5, board 20.5'),
 "count2": (600, 10.7, 'probe t-count2, c2 "1/5 completed": ref 72.6, board 72.6. '
                       '14px was 26% too wide'),
 "chip":  (600, 9.3, 'probe t-chip, c2 the quest-row "+25 XP": ref 36.3, board '
                     '36.3. 12px was 8% too wide'),
 }
TYPE_TOKENS = [("Type", "t-" + k, "%d %gpx/%gpx var(--x-font)"
                % (w, fs, round(fs * 1.22, 1)), ev)
               for k, (w, fs, ev) in TYPE.items()]
# The clock is not fitted like the rest: it is the repo's standard chrome,
# so it keeps the template's own 17px/22px rather than this table's 1.22 lead.
TYPE_TOKENS.append(("Type", "t-time", "590 17px/22px var(--x-font)",
                    "repo standard chrome (templates/gen.py); the source's "
                    "clock is not measured"))

TOKENS = [
 ("Font", "font", FONT,
  'refkit font: "3" of 3 Days = no call, weak (0.721 SF Pro); "S" of Skill '
  'Path = no call, weak (0.510 SF Pro Rounded). Platform stack, cut not claimed'),

 ("Surface", "sheet",   "#FDFDFD",
  "flat census, c2 quest sheet (150-250, 440-460) and c5 lesson sheet: 100%. "
  "This is the recording's white plateau -- H.264 flat-field quantisation puts "
  "paper white at 253, and 255 appears only as ringing beside dark text"),
 ("Surface", "strip",   "#F5F9FC",
  "flat census, c2 weekday strip (222-252, 242-292): 100%"),
 ("Surface", "level",   "#E6F7EF",
  "flat census, c2 level card interior (200-260, 340-360): 100%"),
 ("Surface", "sky-1",   "#9DCDE8",
  "flat census, c4 sky at y 66-74, both sides of the island: 100%"),
 ("Surface", "sky-2",   "#94C6E2",
  "flat census, c2 home sky at y 300-310, left of the streak card: 100%"),
 ("Surface", "sky-3",   "#90C3E2",
  "flat census, c4 path sky at y 300-320 and y 520-528: 100%"),
 ("Surface", "day-on",  "#E2E9F5",
  "mode of the c2 Mon check disc (47-59, 263-271), all pixels: no flat core at 20pt"),
 ("Surface", "chip",    "rgba(255,255,255,.40)",
  "c4 inactive chip reads #C5DBED flat over #9DCDE8 sky: (197-157)/(255-157) = .41"),
 ("Surface", "chip-on", "#F6FAFD",
  "flat census, c4 Skincare chip right of its label (144-153, 112-140): 67%"),
 ("Surface", "node",    "#FCFEFF",
  "mode of the c4 Barrier Repair node core (50-60, 420-450)"),
 ("Surface", "node-off", "#BDD6E4",
  "flat census, c4 locked Weekly Exfoliation node (158-178, 565-575): 84%"),
 ("Surface", "cta",     "#5B8BA8",
  "flat census, c5 START LESSON button interior (150-250, 770-790): 99%"),
 ("Surface", "cta-lip", "#43708C",
  "column scan c5 x 200: the button's bottom lip, y 820.8-824.5"),
 ("Surface", "scrim",   "rgba(26,60,74,.415)",
  "c5 over c4 at two grounds: sky 144,195,226 -> 95,139,163 and locked node "
  "188,214,228 -> 121,150,165. (1-a) = 26/44 = 0.59 on red, 11/19 = 0.58 on green"),

 ("Line", "dash",   "#CFDDE9",
  "mode of the c4 road centre dash core (97-100, 566-572)"),
 ("Line", "ring",   "#DDE3EA",
  "c2 quest-progress ring, coverage solve against the #FDFDFD sheet"),
 ("Line", "card-edge", "#F8F9FB",
  "c2 column scan x 25: the quest row edges read 248/253 against the sheet"),

 ("Ink", "ink",     "#0E1114",
  "ink core, darkest 15% of c2 3 Days (47-143, 181-209): #060606, and of "
  "Today's Quest: #1E1E1E"),
 ("Ink", "ink-2",   "#575757", "ink core, c2 1/5 completed (270-358, 469-482)"),
 ("Ink", "ink-3",   "#8B959E", "ink core, c2 CURRENT STREAK (46-153, 157-168)"),
 ("Ink", "ink-4",   "#B9BBC1", "ink core, c2 Quests resets at midnight (38-195, 496-510)"),
 ("Ink", "ink-sub",  "#A4A9AF", "ink core, c2 quest row subtitles (78-380, 549-563)"),
 ("Ink", "ink-sky", "#22323E", "ink core, c5 Barrier Repair title (101-256, 690-712)"),
 ("Ink", "ink-sky-2", "#255471", "ink core, c4 Under-Eye Care node label (200-310, 277-292)"),
 ("Ink", "ink-sky-3", "#6795B3", "ink core, c4 Weekly Exfoliation, the locked label"),
 ("Ink", "ink-inv",  "#FDFDFD", "the sheet white; white type is the same plateau"),
 ("Ink", "ink-hdr",  "rgba(253,253,253,.72)",
  "c2 Hi, James reads #CFF0FF brightest-15% over #9BCBE6 sky"),

 ("Accent", "green",     "#16BE70", "mean of the c2 level-node core (38-42, 386-397)"),
 ("Accent", "green-2",   "#29BA76", "mean of the c2 level track core (82-98, 388-394)"),
 ("Accent", "green-pale", "#D7FFEE", "mean of the c2 locked level node (269-275, 385-397)"),
 ("Accent", "track-off", "#C5ECD7", "mean of the c2 unfilled level track (312-333, 388-394)"),
 ("Accent", "xp",        "#3FBE84", "c2 +25 XP chip label, ink core widened to the glyph"),
 ("Accent", "tab-on",    "#E3EDF3", "flat census, c4 active tab pill, 8% of the tab-bar window"),
 ("Accent", "tab-on-ink", "#9FB2BF", "ink core, c4 active Path label (140-178, 832-843)"),
 ("Accent", "tab-off-ink", "#4E4E4E", "ink core, c4 inactive Home icon (56-80, 807-826)"),
 ("Accent", "play",     "#5F8AA4",
  "ink core of the c4 Barrier Repair play triangle (55-78, 428-450): #5F8AA4, "
  "and of the c5 sheet triangle (45-62, 700-722): #608AA4"),
 ("Accent", "gem",      "#B23BD8",
  "ink core, c2 +2 gem chip label (153-170, 574-585)"),
 ("Accent", "lock",     "#80A4BB",
  "mode of the c4 keyhole glyph (163-171, 586-598), all pixels"),

 ("Radius", "r-card",  "28px", "c2 streak-card corner, row scans at y 131 and y 296"),
 ("Radius", "r-level", "24px", "c2 level-card corner, row scans at y 334 and y 431"),
 ("Radius", "r-row",   "22px", "c2 quest-row corner"),
 ("Radius", "r-cta",   "20px", "c5 START LESSON corner"),
 ("Radius", "r-pill",  "999px", "by construction, not measured"),
 ("Radius", "r-phone", "55px",
  "circular stand-in for the 17 Pro's continuous display corner; refkit "
  "--crop-phone masks the same number"),

 # Type. Every size here was fitted to the reference's own ink width with
 # refkit bbox, not read off a cap height: SF Pro is not in the renderer, the
 # stand-in does not set to the same width, and a cap measured through H.264
 # blur is 1-2 pt taller than the glyph. Each row carries the reference width,
 # the width the board rendered at the size that was replaced, and the string
 # both were measured on.
 *TYPE_TOKENS,

 ("Metrics", "w",       "402px", "iPhone 17 Pro logical width"),
 ("Metrics", "h",       "874px", "iPhone 17 Pro logical height"),
 ("Metrics", "status",  "54px",
  "repo standard chrome (templates/gen.py), iOS Dynamic Island status bar"),
 ("Metrics", "gutter",  "20px",
  "c2 streak-card row scan: left edge 20.5, right edge 382.5, on a 402 pt frame"),
 ("Metrics", "row",     "85.2px",
  "c2 quest titles at 527.1 / 611.8 / 697.4: pitch 84.7 and 85.6"),
 ("Metrics", "road",    "37px",
  "c4 road verticals run x 80-117 and x 287-324 on every row between bends"),
 ("Metrics", "bend",    "39px",
  "circle fit on the c4 bend at y 214.5: predicted left edge 85.2 / 82.4 / "
  "80.7 at y 234 / 240 / 246 against 85 / 82 / 81 measured"),
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
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json, each
    at the scale of the frame it came from."""
    if not REFS_DIR.exists():
        return
    try:
        from PIL import Image                                 # noqa: local dep
    except ImportError:                                       # no Pillow, no cut
        return
    ART_DIR.mkdir(parents=True, exist_ok=True)
    src, n = {}, 0
    for cid, (ref, x0, y0, x1, y1) in CROPS.items():
        f = REFS_DIR / (ref + ".png")
        if not f.exists():
            continue
        if ref not in src:
            src[ref] = Image.open(f).convert("RGB")
        k = SCALES[ref]
        src[ref].crop(tuple(round(v * k) for v in (x0, y0, x1, y1))).save(
            ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def art(cid, dx=0.0, dy=0.0, z=None):
    """One <img>, placed at the box it was measured from (dx/dy only for the
    same asset reused on a screen that scrolls it)."""
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx%s">'
            % (_uri(cid), x0 + dx, y0 + dy, x1 - x0, y1 - y0,
               ";z-index:%d" % z if z else ""))


# ------------------------------------------------------------ phone frame ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}
img.a{position:absolute;display:block}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-sheet);color:var(--x-ink);
  transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:9}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--x-t-time)}
.sb .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
.sb svg{position:absolute;display:block;fill:currentColor}"""

# The status bar is the repo's standard chrome, copied verbatim from
# mockups/canvases/templates/gen.py. The source's own bar was not measured
# and its glyphs were not cropped: the repo's chrome wins over the source's,
# the same way the phone frame does.
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


# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print("%-24s %6d" % (name, len(html)))


# --------------------------------------------------------------- helpers ----
# Measured, not assumed. SF Pro is not installed in the renderer (a probe of
# eight stacks -- -apple-system, "SF Pro Text", "SF Pro Display", "Helvetica
# Neue", Helvetica, Arial, "SF Compact Text" -- came back byte-identical), so
# the board is set in the platform fallback and the fallback's metrics are the
# ones that decide where a cap lands. scratch/met.html renders HXE at 12 / 18 /
# 25 / 31.5 / 40 px inside a block of a known top; the cap top comes out at
# lh/2 - CAP_TOP*fs below that top, with CAP_TOP = 0.350 to +-0.008 across all
# five sizes, and the cap itself measures 0.733 em (SF Pro's is 0.714). tx()
# inverts the measured relation, not the nominal one: assuming SF Pro's 0.714
# put every run low by 0.105*fs, which is 3.3 pt on the 31.5 px "3 Days".
CAP_TOP = 0.350

def tx(x, cap_top, text, style, colour="var(--x-ink)", weight=None,
       extra="", cls="t"):
    """Absolutely place one run of text by the cap-top the grid actually shows.
    `style` names a row of TYPE, so the size that decides the position is the
    same one the stylesheet sets; `weight` overrides that row's weight alone."""
    w, fs, _ = TYPE[style]
    lh = round(fs * 1.22, 1)
    top = cap_top - lh / 2.0 + CAP_TOP * fs
    return ('<div class="%s" style="left:%.1fpx;top:%.2fpx;font:var(--x-t-%s)'
            '%s;color:%s%s">%s</div>'
            % (cls, x, top, style,
               ";font-weight:%d" % weight if weight and weight != w else "",
               colour, extra, text))


def box(x, y, w, h, r=0.0, css="", cls="b"):
    return ('<div class="%s" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;'
            'height:%.1fpx%s%s"></div>'
            % (cls, x, y, w, h, ";border-radius:%.1fpx" % r if r else "", css))


def art_at(cid, x, y, w, h):
    """The same measured asset placed a second time. Used only for the bolt and
    gem glyphs, which the source repeats at several sizes; the crop box in
    crops.json is still the one instance that was measured."""
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx">' % (_uri(cid), x, y, w, h))


EXTRA = """.t,.b{position:absolute}
.t{white-space:nowrap;letter-spacing:-.01em}
.sky{position:absolute;left:0;top:0;width:402px}
.card{position:absolute;background:var(--x-sheet)}
.pill{position:absolute;border-radius:999px}
.road{position:absolute;left:0;top:0;width:402px;height:874px}
.blur{position:absolute;left:0;top:0;width:402px;height:152px;
  background:rgba(157,205,232,.55);
  -webkit-backdrop-filter:blur(13px);backdrop-filter:blur(13px);z-index:4}
.node{position:absolute;width:47px;height:47px;border-radius:24px;
  background:var(--x-node);box-shadow:0 3px 7px rgba(31,74,97,.16)}
.tabbar{position:absolute;left:23.5px;top:794.3px;width:355px;height:59.7px;
  border-radius:30px;background:var(--x-sheet);
  box-shadow:0 6px 22px rgba(40,64,80,.13);z-index:6}"""


# ------------------------------------------------------------- tab bar ----
TAB_C = [67.5, 158.0, 248.5, 339.0]           # column centres, pitch 90.5
TABS = ["Home", "Path", "Shop", "Progress"]

TAB_ICON = {
 "Home": '<path d="M2 9.4 11 2l9 7.4v9.1a1.9 1.9 0 0 1-1.9 1.9H3.9A1.9 1.9 0 0 1 2 18.5Z"/>'
         '<path d="M8.2 15.6h5.6"/>',
 "Path": '<path d="M4.3 4.1h8.1a3.05 3.05 0 0 1 0 6.1H4.3'
         'a3.5 3.5 0 0 0 0 7H11.9"/>'
         '<circle cx="15.6" cy="17.2" r="2.2"/>',
 "Shop": '<path d="M1.6 2.6h2.9l2.7 10.6h9.6l2.4-7.6H6"/>'
         '<circle cx="8.4" cy="17.6" r="1.9"/><circle cx="15.9" cy="17.6" r="1.9"/>',
 "Progress": '<path d="M1.9 19.4h18.2"/>'
             '<rect x="3.4" y="10.2" width="4.3" height="6.9" rx="1.4"/>'
             '<rect x="9.5" y="6.0" width="4.3" height="11.1" rx="1.4"/>'
             '<rect x="15.6" y="2.8" width="4.3" height="14.3" rx="1.4"/>',
}


def tabbar(active):
    out = ['<div class="tabbar"></div>']
    i = TABS.index(active)
    out.append(box(TAB_C[i] - 46.8, 798.3, 93.6, 52.0, 26.0,
                   ";background:var(--x-tab-on);z-index:7"))
    for j, name in enumerate(TABS):
        on = j == i
        colour = "var(--x-tab-on-ink)" if on else "var(--x-tab-off-ink)"
        out.append('<svg viewBox="0 0 22 22" style="position:absolute;'
                   'left:%.1fpx;top:806.8px;width:18.7px;height:18.7px;fill:none;'
                   'stroke:%s;stroke-width:1.7;stroke-linecap:round;'
                   'stroke-linejoin:round;z-index:8">%s</svg>'
                   % (TAB_C[j] - 9.35, colour, TAB_ICON[name]))
        out.append(tx(0, 833.4, name, "tab", colour,
                      extra=";width:%gpx;left:%.1fpx;text-align:center;z-index:8"
                            % (120, TAB_C[j] - 60)))
    return "".join(out)


# ---------------------------------------------------------------- home ----
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DAY_C = [53.0, 102.5, 152.0, 201.5, 251.0, 300.5, 350.0]     # pitch 49.5
LEVEL_X = [48.25, 125.1, 202.0, 278.9, 355.75]               # pitch 76.875
LEVEL_XP = ["30 XP", "60 XP", "90 XP", "120 XP", "150 XP"]

# emoji box per quest row: the ink centres on x 52.7, 27.6 below the row top,
# so a 34pt box lands at 35.7. ic-razor is cut short at the tab bar.
ICON = {"ic-dumbbell": (10.6, 34.0, 34.0), "ic-mewing": (10.6, 34.0, 34.0),
        "ic-skincare": (10.6, 34.0, 34.0), "ic-razor": (10.6, 34.0, 16.8)}

QUESTS = [
 ("ic-skincare",  "Morning Skincare Routine", "Apply cleanser, moisturizer and Shampoo"),
 ("ic-dumbbell",  "Push Day Workout",         "Complete today’s push workout…"),
 ("ic-mewing",    "Mewing Practice",          "5 minutes of proper tongue posture and"),
 ("ic-skincare",  "Morning Skincare Routine", "Apply cleanser, moisturizer and Shampoo"),
 ("ic-razor",     "Morning Skincare Routine", "Apply cleanser, moisturizer and Shampoo"),
]

CHECK = ('<svg viewBox="0 0 24 24" style="position:absolute;left:%.1fpx;top:%.1fpx;'
         'width:%.1fpx;height:%.1fpx;fill:none;stroke:%s;stroke-width:%.1f;'
         'stroke-linecap:round;stroke-linejoin:round">'
         '<path d="M5 12.4 9.7 17 19 7.2"/></svg>')


def home(done):
    """done = how many of the five quests have been cleared; the source shows
    0/5 (c1) and 1/5 (c2), and the cleared row leaves the top of the list."""
    o = ['<div class="sky" style="height:340px;background:linear-gradient('
         '180deg,var(--x-sky-1) 40px,var(--x-sky-2) 310px)"></div>',
         art("home-clouds"),
         box(0, 312, 402, 562, 0,
             ";background:var(--x-sheet);border-radius:36px 36px 0 0"),
         tx(22.3, 75.4, "Hi, James", "body", "var(--x-ink-hdr)"),
         tx(22.3, 98.7, "Welcome Back", "greet", "var(--x-ink-inv)"),
         box(252.2, 78.2, 75.4, 36.3, 18.15,
             ";background:rgba(255,255,255,.16);"
             "border:1px solid rgba(255,255,255,.46)"),
         art("gem-hdr"),
         tx(287.5, 86.5, "235", "count", "var(--x-ink-inv)"),
         art("avatar")]

    # streak card
    o += [box(20.5, 130.5, 362.0, 166.0, 28.0, ";background:var(--x-sheet);"
              "box-shadow:0 6px 18px rgba(40,72,92,.10)"),
          box(20.5, 231.0, 362.0, 65.5, 0, ";background:var(--x-strip);"
              "border-radius:0 0 28px 28px"),
          tx(45.6, 157.3, "CURRENT STREAK", "cap", "var(--x-ink-3)",
             extra=";letter-spacing:.02em"),
          tx(46.5, 180.6, "3 Days", "hero", "var(--x-ink)"),
          art("medal")]
    for i, d in enumerate(DAYS):
        on = i < 3
        o.append(tx(0, 248.5, d, "day", "var(--x-ink-3)",
                    extra=";width:80px;left:%.1fpx;text-align:center%s"
                          % (DAY_C[i] - 40,
                             ";color:var(--x-ink-2);font-weight:700" if i == 3 else "")))
        if on:
            o.append(box(DAY_C[i] - 10, 261.0, 20.0, 20.0, 10.0,
                         ";background:var(--x-day-on)"))
            o.append(CHECK % (DAY_C[i] - 7, 264.0, 14, 14, "var(--x-ink-3)", 2.6))
        else:
            o.append(tx(0, 264.3, str(9 + i), "date",
                        "var(--x-ink-2)" if i == 3 else "var(--x-ink-3)",
                        weight=700 if i == 3 else 400,
                        extra=";width:80px;left:%.1fpx;text-align:center"
                              % (DAY_C[i] - 40)))
    o.append(box(198.5, 283.5, 6.0, 6.0, 3.0, ";background:var(--x-ink-2)"))

    # level card
    o += [box(19.5, 333.8, 362.5, 98.2, 24.0, ";background:var(--x-level)"),
          art("crown"),
          tx(62.4, 349.0, "Level 4", "h1", "#0F1B15"),
          art("bolt-lv"),
          tx(307.1, 350.9, "95/120 XP", "meta", "#72887D")]
    o.append(box(LEVEL_X[0], 386.9, LEVEL_X[-1] - LEVEL_X[0], 9.4, 4.7,
                 ";background:var(--x-track-off)"))
    o.append(box(LEVEL_X[0], 386.9, 231.0 - LEVEL_X[0], 9.4, 4.7,
                 ";background:var(--x-green-2)"))
    for i, x in enumerate(LEVEL_X):
        on = i < 3
        o.append(box(x - 13.5, 382.6, 27.0, 18.0, 9.0,
                     ";background:var(--x-green)" if on
                     else ";background:var(--x-green-pale)"))
        if on:
            o.append(CHECK % (x - 6.5, 385.1, 13, 13, "var(--x-ink-inv)", 2.8))
        else:
            o.append('<svg viewBox="0 0 12 16" style="position:absolute;'
                     'left:%.1fpx;top:384.6px;width:6px;height:14px;'
                     'fill:var(--x-green)"><circle cx="6" cy="5" r="4"/>'
                     '<path d="M4.6 6.6h2.8l-.7 8.4H5.3Z"/></svg>' % (x - 3))
        o.append(tx(0, 410.4, LEVEL_XP[i], "meta", "#435849",
                    extra=";width:120px;left:%.1fpx;text-align:center" % (x - 60)))

    # quest card
    rows = QUESTS[done:done + 4]
    o += [box(20.5, 450.0, 361.0, 382.0, 24.0, ";background:var(--x-sheet);"
              "border:1px solid var(--x-card-edge)"),
          tx(37.2, 468.1, "Today’s Quest", "sect", "var(--x-ink)"),
          tx(38.2, 496.0, "Quests resets at midnight", "sub", "var(--x-ink-4)"),
          box(256.0, 465.0, 111.5, 22.5, 11.25, ";background:var(--x-sheet);"
              "border:1px solid var(--x-card-edge)"),
          '<svg viewBox="0 0 20 20" style="position:absolute;left:261px;top:467.5px;'
          'width:18px;height:18px;fill:none;stroke-width:3">'
          '<circle cx="10" cy="10" r="8.5" stroke="var(--x-ring)"/>'
          '<circle cx="10" cy="10" r="8.5" stroke="#5E9CC4" stroke-linecap="round"'
          ' stroke-dasharray="%.1f 53.4" transform="rotate(-90 10 10)"/></svg>'
          % (10.7 * done),
          tx(285.0, 470.6, "%d/5 completed" % done, "count2", "var(--x-ink-2)")]
    for i, (icon, title, sub) in enumerate(rows):
        top = 511.0 + i * 85.2
        o.append(box(27.5, top, 350.2, 82.0, 22.0, ";background:var(--x-strip)"))
        dy, w, h = ICON[icon]
        o.append(art_at(icon, 35.7, top + dy, w, h))
        o.append(tx(77.3, top + 16.1, title, "row", "var(--x-ink)"))
        o.append(tx(77.3, top + 38.5, sub, "sub", "var(--x-ink-sub)"))
        o.append(art_at("bolt-chip", 77.0, top + 62.0, 18.0, 13.0))
        o.append(tx(96.5, top + 65.4, "+25 XP", "chip", "var(--x-xp)"))
        o.append(art_at("gem-chip", 135.0, top + 60.0, 17.0, 13.0))
        o.append(tx(155.5, top + 65.4, "+2", "chip", "var(--x-gem)"))
        o.append(box(341.0, top + 20.5, 28.5, 28.5, 14.25,
                     ";border:1.6px dashed var(--x-ring)"))
    o.append(tabbar("Home"))
    return "".join(o)


# ---------------------------------------------------------------- path ----
# Road centreline in content pt. The board at scroll 0 is c4; c3 is the same
# content 184.3 lower down, which is what SCROLL_B holds.
ROAD = [(305.5, -200.0), (305.5, 213.3), (98.5, 213.3), (98.5, 363.9),
        (305.5, 363.9), (305.5, 513.9), (98.5, 513.9), (98.5, 698.1),
        (305.5, 698.1), (305.5, 883.4), (98.5, 883.4), (98.5, 1120.0)]
BEND = 39.0
SCROLL_B = -184.3

CHIPS = [("Fitness",      -60.0,  96.7, None,            None),
         ("Skincare",      46.7, 108.3, "chip-skincare",  85.5),
         ("Hair",         165.0,  76.0, "chip-hair",     199.5),
         ("Oral Posture", 251.0, 132.0, "chip-oral",     284.0)]
ACTIVE_CHIP = "Skincare"

# node: (x, y, state, label)
NODES = [(65.5,  138.1, "done",   "Morning Cleanse"),
         (164.4, 288.4, "done",   "Under-Eye Care"),
         (65.5,  438.4, "play",   "Barrier Repair"),
         (166.8, 588.8, "locked", "Weekly Exfoliation"),
         (65.5,  808.3, "play",   "Face Shape &amp; Cut"),
         (166.8, 958.4, "locked", "Washing Correctly")]


def road_d(dy):
    """One path string with BEND-radius corners at every turn."""
    pts = [(x, y + dy) for x, y in ROAD]
    d = ["M %.1f %.1f" % pts[0]]
    for i in range(1, len(pts) - 1):
        (px, py), (cx, cy), (nx, ny) = pts[i - 1], pts[i], pts[i + 1]
        ax = cx + (0 if px == cx else (BEND if px > cx else -BEND))
        ay = cy + (0 if py == cy else (BEND if py > cy else -BEND))
        bx = cx + (0 if nx == cx else (BEND if nx > cx else -BEND))
        by = cy + (0 if ny == cy else (BEND if ny > cy else -BEND))
        d.append("L %.1f %.1f Q %.1f %.1f %.1f %.1f" % (ax, ay, cx, cy, bx, by))
    d.append("L %.1f %.1f" % pts[-1])
    return " ".join(d)


def road(dy):
    p = road_d(dy)
    return ('<svg class="road" viewBox="0 0 402 874"><path d="%s" fill="none" '
            'stroke="var(--x-sheet)" stroke-width="var(--x-road)" '
            'stroke-linecap="butt" stroke-linejoin="round"/>'
            '<path d="%s" fill="none" stroke="var(--x-dash)" stroke-width="3.5" '
            'stroke-dasharray="15.8 12.8" stroke-linecap="butt"/></svg>' % (p, p))


LOCK_BOX = CROPS["lock"]


def nodes(dy):
    o = []
    for x, y, state, label in NODES:
        cy = y + dy
        if cy < -60 or cy > 960:
            continue
        locked = state == "locked"
        o.append(box(x - 23.5, cy - 23.5, 47.0, 47.0, 23.5,
                     ";background:var(--x-node-off);z-index:2" if locked
                     else ";background:var(--x-node);z-index:2;"
                          "box-shadow:0 3px 7px rgba(31,74,97,.16)"))
        if state == "done":
            o.append((CHECK % (x - 8.5, cy - 8.5, 17, 17,
                               "var(--x-ink-sky-2)", 2.4))
                     .replace("position:absolute;", "position:absolute;z-index:3;"))
        elif state == "play":
            o.append('<svg viewBox="0 0 20 22" style="position:absolute;'
                     'left:%.1fpx;top:%.1fpx;width:18.6px;height:20.3px;'
                     'fill:var(--x-play);z-index:3">'
                     '<path d="M3 2.4a1.6 1.6 0 0 1 2.5-1.3l12 8.6a1.6 1.6 0 0 1 0 2.6'
                     'l-12 8.6A1.6 1.6 0 0 1 3 19.6Z"/></svg>'
                     % (x - 6.5, cy - 10.15))
        else:
            o.append(art("lock", x - (LOCK_BOX[1] + LOCK_BOX[3]) / 2.0,
                     cy - (LOCK_BOX[2] + LOCK_BOX[4]) / 2.0, z=3))
        o.append(tx(x + 35.5, cy - 14.1, label, "node",
                    "var(--x-ink-sky-3)" if locked else "var(--x-ink-sky-2)",
                    extra=";z-index:3"))
        o.append(box(x + 35.4, cy + 9.35, 59.1, 17.5, 8.75,
                     ";background:rgba(255,255,255,.92);z-index:3"))
        o.append(art_at("bolt-chip", x + 41.0, cy + 11.6, 11.5, 13.0))
        o.append(tx(x + 55.0, cy + 13.4, "+25 XP", "cap", "var(--x-xp)",
                    extra=";z-index:4"))
    return "".join(o)


def path(dy, clouds=True):
    o = ['<div class="sky" style="height:874px;background:linear-gradient('
         '180deg,var(--x-sky-1) 70px,var(--x-sky-3) 200px)"></div>']
    if clouds:
        o.append(art("cloud-l", 0.0, dy * 0.26))
    o.append(road(dy))
    o.append(nodes(dy))
    o.append('<div class="blur"></div>')
    o.append(tx(22.7, 80.8, "Skill Path", "title", "var(--x-ink-inv)",
                extra=";z-index:5"))
    for name, x, w, cid, tx0 in CHIPS:
        on = name == ACTIVE_CHIP
        o.append(box(x, 106.0, w, 40.0, 20.0,
                     ";z-index:5;background:%s"
                     % ("var(--x-chip-on)" if on else "var(--x-chip)")))
        if cid:
            o.append(art(cid, 0.0, 0.0, 6))
        if tx0:
            o.append(tx(tx0, 118.5, name, "chipname", "#22303A", extra=";z-index:6"))
        else:
            o.append(tx(x + 48.0, 118.5, name, "chipname", "#22303A", extra=";z-index:6"))
    return "".join(o)


# -------------------------------------------------------- lesson sheet ----
# Five circles whose centres all land on y 705: the scalloped top of the sheet,
# fitted to the white/scrim boundary sampled every 4pt in c5.
SCALLOP = [(52.0, 56.5), (146.0, 76.2), (230.0, 54.5), (310.0, 65.25), (388.0, 58.0)]


def sheet():
    circles = "".join('<circle cx="%.1f" cy="705" r="%.2f"/>' % (x, r)
                      for x, r in SCALLOP)
    o = [box(0, 0, 402, 874, 0, ";background:var(--x-scrim);z-index:10"),
         '<svg style="position:absolute;left:0;top:640px;width:402px;'
         'height:234px;z-index:11" viewBox="0 640 402 234">'
         '<g fill="var(--x-sheet)">%s<rect x="0" y="705" width="402" height="169"/>'
         '</g></svg>' % circles,
         box(24.5, 680.0, 58.0, 58.0, 29.0,
             ";background:var(--x-tab-on);z-index:12"),
         '<svg viewBox="0 0 20 22" style="position:absolute;left:43.5px;top:702px;'
         'width:18.6px;height:20.3px;fill:var(--x-play);z-index:13">'
         '<path d="M3 2.4a1.6 1.6 0 0 1 2.5-1.3l12 8.6a1.6 1.6 0 0 1 0 2.6'
         'l-12 8.6A1.6 1.6 0 0 1 3 19.6Z"/></svg>',
         tx(102.8, 694.5, "Barrier Repair", "h2", "var(--x-ink-sky)",
            extra=";z-index:13"),
         art_at("bolt-chip", 101.9, 725.0, 12.5, 14.0),
         tx(119.0, 726.6, "+25 XP", "cap", "var(--x-xp)", extra=";z-index:13"),
         box(22.0, 767.5, 358.3, 57.0, 20.0,
             ";z-index:12;background:linear-gradient(180deg,"
             "var(--x-cta) 0,var(--x-cta) 52.5px,var(--x-cta-lip) 52.5px)"),
         tx(142.6, 788.1, "START LESSON", "cta", "var(--x-ink-inv)",
            extra=";letter-spacing:.045em;z-index:13")]
    return "".join(o)


# --------------------------------------------------------------- boards ----
SCREENS = [
 ("01-home",             "Home",              "5:54", lambda: home(0) ),
 ("02-home-quest-done",  "Home, one cleared", "5:55", lambda: home(1) ),
 ("03-path",             "Skill Path",        "6:09",
  lambda: path(0.0) + tabbar("Path")),
 ("04-path-scrolled",    "Skill Path scrolled", "6:09",
  lambda: path(SCROLL_B) + tabbar("Path")),
 ("05-lesson-sheet",     "Lesson sheet",      "6:09",
  lambda: path(0.0) + tabbar("Path") + sheet()),
]

REFS = [("01-home", "c1"), ("02-home-quest-done", "c2"), ("03-path", "c4"),
        ("04-path-scrolled", "c3"), ("05-lesson-sheet", "c5")]


def screen(name, title, time, build):
    body = ('<div class="phone">%s%s</div>'
            % (build(), statusbar("var(--x-ink-inv)", time)))
    return page("%s - %s" % (NAME, title), body, EXTRA)


def ref_boards():
    """ref-NN-*.html hold the capture itself, at 1pt = 1px beside the rebuild.
    Never committed: assets/refs/ is third-party and .gitignore already keeps
    it out. Regenerating them is what `clone-prototype` phase 5 does."""
    if not REFS_DIR.exists():
        return
    for board, ref in REFS:
        f = REFS_DIR / (ref + ".png")
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        body = ('<div class="phone" style="background:#000">'
                '<img class="a" src="%s" alt="" '
                'style="left:0;top:0;width:402px;height:874px"></div>' % uri)
        write("ref-" + board, page("%s - reference %s" % (NAME, ref), body, EXTRA))


# --------------------------------------------------------- token boards ----
# The artboard is 478 x 980 and the evidence is the deliverable, so the tables
# split across boards rather than being trimmed to fit. Both row counts below
# are the largest value that still reports `fits` under
#   refkit shoot ./0*.html -o scratch/ovf --scale 2 --check-overflow
# run WITHOUT --crop-phone: with it a full-bleed board is cropped to the phone
# rect first and an overflowing table never shows up.
TOK_ROWS = 14     # 73 tokens -> 6 boards of 13/12/12/12/12/12; 15 rows
                  # overflows by 10px, on the one chunk that carries
                  # --sp-font's 107-character stack
EV_ROWS = 11      # 73 rows -> 7 boards of 11/11/11/10/10/10/10; 12 overflows
                  # by 5px
SUF = "bcdefghijklmnopqrstuv"

# 478 - 2 x 24px body padding. The artboard clips horizontally as silently as
# it clips vertically -- and --check-overflow does not catch that one, because
# it only flags an element whose own overflow is `hidden`, never the page
# running wider than the board. So the table is pinned to the width rather than
# left to size itself. Left to itself it sized to --sp-font's stack: the old
# board's row dividers measure 1033px wide, starting at the 24px padding and
# ending 579px past the right edge of the 478px artboard, so the whole value
# column was off the board and --check-overflow still said `fits`.
TW = 430

TABLE_CSS = """.w{flex:none;width:%dpx}
h1{font:600 15px/1.4 var(--x-font);color:var(--x-ink);margin:0 0 4px 2px}
p.cap{font:12px/1.5 var(--x-font);color:#8B959E;margin:0 0 12px 2px}
table{border-collapse:collapse;background:var(--x-sheet);border-radius:14px;
  overflow:hidden;box-shadow:0 8px 30px rgba(40,64,80,.12);
  width:%dpx;table-layout:fixed}
td{padding:7px 12px;border-top:1px solid #EEF1F4;overflow-wrap:anywhere}
tr:first-child td{border-top:0}
code{font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}""" % (TW, TW)


def _split(seq, cap):
    """The fewest boards of at most `cap` rows, balanced. Slicing at the cap
    would leave the last board a three-row stub; this spreads the remainder,
    and every chunk still comes in under the count that was measured to fit."""
    n = -(-len(seq) // cap)
    out, i = [], 0
    for k in range(n):
        take = -(-(len(seq) - i) // (n - k))
        out.append(seq[i:i + take])
        i += take
    return out


def _of(k, pages):
    return " %d/%d" % (k + 1, len(pages)) if len(pages) > 1 else ""


def _sheet(title, cap, table, css):
    return page("%s - %s" % (NAME, title),
                '<div class="w"><h1>%s</h1><p class="cap">%s</p>'
                '<table>%s</table></div>' % (title, cap, table),
                TABLE_CSS + "\n" + css)


def tokens_board(chunk, of):
    rows = []
    for group, name, value, _ in chunk:
        swatch = ""
        if value.startswith("#") or value.startswith("rgba"):
            swatch = ('<i style="background:%s"></i>' % value)
        rows.append('<tr><td>%s</td><td><code>--%s-%s</code></td>'
                    '<td>%s<code>%s</code></td></tr>'
                    % (group, P, name, swatch, value.replace("<", "&lt;")))
    css = """table{font:13px/1.5 var(--x-font)}
td{vertical-align:middle}
td:first-child{color:#8B959E;width:76px}
td:nth-child(2){width:116px}
i{display:inline-block;width:15px;height:15px;border-radius:4px;
  margin-right:8px;vertical-align:-3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.10)}"""
    return _sheet("Design tokens" + of,
                  "%d of the %d tokens. One shared <code>:root</code>, "
                  "byte-identical in every board." % (len(chunk), len(TOKENS)),
                  "".join(rows), css)


def evidence_board(chunk, of):
    rows = ['<tr><td><code>--%s-%s</code></td><td>%s</td></tr>'
            % (P, name, ev.replace("<", "&lt;"))
            for _, name, _, ev in chunk]
    css = """table{font:13px/1.55 var(--x-font)}
td{vertical-align:top}
td:first-child{width:126px}"""
    return _sheet("Evidence" + of,
                  "One row per token, and what it was measured on. "
                  "A token with no evidence is a guess.",
                  "".join(rows), css)


def foundation_boards():
    """Every board of the Foundations row, in canvas order: the token table,
    then the evidence table, each split across as many boards as the 980px
    artboard takes. The `00`, `00b`, `00c` ... suffixes run across both sets,
    so the filenames sort into the order the row lists them."""
    tok, evd = _split(TOKENS, TOK_ROWS), _split(TOKENS, EV_ROWS)
    i = 0
    for k, chunk in enumerate(tok):
        yield ("00%s-design-tokens" % ("" if i == 0 else SUF[i - 1]),
               "Design tokens" + _of(k, tok), tokens_board(chunk, _of(k, tok)))
        i += 1
    for k, chunk in enumerate(evd):
        yield ("00%s-evidence" % ("" if i == 0 else SUF[i - 1]),
               "Evidence" + _of(k, evd), evidence_board(chunk, _of(k, evd)))
        i += 1


FOUNDATIONS = list(foundation_boards())


# --------------------------------------------------------------- layout ----
LAYOUT = {
 "name": PAGE_NAME,
 "rows": [
  {"title": "Foundations",
   "files": [{"file": n, "label": lbl} for n, lbl, _ in FOUNDATIONS]},
  {"title": "Screens", "numbered": True,
   "files": [{"file": n, "label": l} for n, l, _, _ in SCREENS]},
  # Same order as the row above: the canvas lays every row out from x = 0 at
  # one pitch, so item N here lands column-for-column under item N up there.
  {"title": "Source of truth: captures", "numbered": True,
   "files": [{"file": "ref-" + n, "label": dict((a, b) for a, b, _, _ in SCREENS)[n]}
             for n, _ in REFS]},
 ],
}


if __name__ == "__main__":
    cut()
    for name, _, html in FOUNDATIONS:
        write(name, html)
    for name, title, time, build in SCREENS:
        write(name, screen(name, title, time, build))
    ref_boards()
    (OUT / "layout.json").write_text(json.dumps(LAYOUT, indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(LAYOUT["rows"])))
    print("\nnext: refkit tokens", OUT)
