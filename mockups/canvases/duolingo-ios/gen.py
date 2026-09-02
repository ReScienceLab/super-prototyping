"""Emit mockups/canvases/duolingo-ios/ from eight Mobbin captures.

Six learning-path screens and two modal sheets at 393 x 852 pt. The captures
are 881 x 1910 once their watermark strip is trimmed, so the scale is
881 / 393 = 2.2417 px per pt, and every number below was read at that scale.

Chrome is CSS -- cards, buttons, panels, rules, pills, type. Illustration is
cropped out of the capture at its own measured box: `crops.json` names each
box, `cut()` writes assets/art/<id>.png, and `art()` places the <img> back at
the same numbers, so an asset cannot drift from where it was measured. See
the README for why the art is cropped rather than generated.

    python3 mockups/canvases/duolingo-ios/gen.py

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
SCALE = 2.2417                                   # capture px per design pt

NAME = "Duolingo"
PAGE_NAME = "(example) " + NAME
P = "d"

# ---------------------------------------------------------------- tokens ----
# Feather Bold is Duolingo's own face and is not on this machine, so the board
# ships a rounded system stand-in. `refkit font` on the unit title scored 0.353
# with SF Compact on top -- a weak verdict, i.e. the real face is outside the
# candidate set. Its cap sits at 0.762em, not SF Pro's 0.714, so every size
# below is a cap match measured on the render, not one derived from the capture.
FONT = ('ui-rounded,"SF Pro Rounded","Nunito",-apple-system,'
        'BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif')

TOKENS = [
 ("Font", "font", FONT,
  'refkit font on "Order" = weak (0.353, SF Compact); Feather Bold is outside '
  'the candidate set, so this is a declared stand-in. Its cap sits at 0.762em, '
  'not SF Pro\'s 0.714, so every size below is a cap match on the render'),

 ("Surface", "bg",     "#FFFFFF", "flat-fill census, page ground, all six path screens"),
 ("Surface", "panel",  "#F7F7F7", "05 locked panel, column scan at x 8, y 504.4-756.0"),
 ("Surface", "scrim",  "rgba(0,0,0,.396)",
  "page white reads 154/255 behind both sheets: 1 - 154/255 = .396"),
 ("Surface", "chip",   "#E2F2FF", "flat census, 04 UP NEXT pill, 1476 px"),
 ("Surface", "chip-2", "#E5E5E5", "flat census, 05 UP NEXT pill, 2891 px"),

 ("Line", "rule",    "#E3E3E3",
  "direct read at y 757.6 (tab-bar rule) and y 246.9 (06 section rules)"),
 ("Line", "border",  "#E5E5E5", "04 UP NEXT rule, column scan y 501.7-503.5"),
 ("Line", "border-2", "#E7E7E7", "08 trophy tile ring, row scan y 407, 2.2pt wide"),
 ("Line", "grab",     "#B1B1B1", "sheet drag handle, column scan at x 196 on both sheets"),

 ("Ink", "ink",     "#4B4B4B", "flat census: 07 title 99 px, 04 'Section 2' 85 px"),
 ("Ink", "ink-2",   "#AFAFAF", "flat census, 05 'Section 3' 89 px, and its UP NEXT pill"),
 ("Ink", "ink-3",   "#9D9D9D", "flat census, 06 section-divider label, 4 px (thin)"),
 ("Ink", "ink-inv", "#FFFFFF", "brightest core of the unit title on green, #FCFEFA"),
 ("Ink", "ink-inv-2", "rgba(255,255,255,.72)",
  "kicker core #CBF1B0 over #59CC01 solves to alpha .69"),

 ("Unit", "u-green",  "#59CC01", "flat census, 01 header fill, 16704 px"),
 ("Unit", "u-green-d", "#45A302", "mean of the 2pt lip band, y 184-186"),
 ("Unit", "u-red",    "#FF4C4B", "flat census, 02 header fill, 16759 px"),
 ("Unit", "u-red-d",  "#CC3B3C", "mean of the 2pt lip band, y 184-186"),
 ("Unit", "u-blue",   "#1DB1F8", "flat census, 03 header fill, 16482 px"),
 ("Unit", "u-blue-d", "#1590C9", "column scan at x 60, y 207.4-209.7"),
 ("Unit", "u-sky",    "#53ADF0", "flat census, 06 header fill, 14988 px"),
 ("Unit", "u-sky-d",  "#428CBD", "column scan at x 60, y 207.4-210.1"),
 ("Unit", "u-purple", "#C385F7", "flat census, 04 and 05 header fills, 15980/16606 px"),
 ("Unit", "u-purple-d", "#9D6BC5", "mean of the 2pt lip band, y 184-186"),

 ("Accent", "blue",    "#1DB1F8",
  "= u-blue; the 16px link and count glyphs read #17ABDA-#1DA3DA, diluted"),
 ("Accent", "btn",     "#14B2F5", "flat census, both sheet primary buttons, 14357 px"),
 ("Accent", "btn-d",   "#0F9AD7", "mean of the 4.1pt button lip, 2420 px"),
 ("Accent", "cta",     "#53ADF0",
  "flat census, 04 CONTINUE body, 19723 px at 99.7%; also 05/06's washed counts"),
 ("Accent", "cta-d",   "#4395D3", "column scan, 04 CONTINUE lip, y 728.6-732.7"),
 ("Accent", "orange",  "#F89402", "darkest 8% of the 01 streak count, peak #F29403"),
 ("Accent", "pink",    "#CE91B1", "darkest 8% of the 03 energy count, peak #CF8DAF"),
 ("Accent", "magenta", "#B84B8C", "darkest 8% of the 06 JUMP HERE? tooltip label"),

 ("Radius", "r-card",  "13.5px",
  "least-squares corner fit, 01/02/03 headers: 13.25/13.50/13.50, rms 0.20"),
 ("Radius", "r-btn",   "10px", "same fit on the 07 sheet button: 10.25, rms 0.38"),
 ("Radius", "r-sheet", "16px", "same fit on both sheet tops: 16.00 / 17.25"),
 ("Radius", "r-tile",  "24px", "08 trophy tile, five-point corner solve from x 266.8"),
 ("Radius", "r-pill",  "999px", "by construction, not measured"),
 ("Radius", "r-phone", "52px", "circular stand-in for the 55pt continuous display corner"),

 ("Type", "t-time",    "590 17.6px/22px var(--x-font)", "9:41 clock; cap 12.9pt and 32.6pt wide on the render, both exact"),
 ("Type", "t-count",   "700 15.6px/20px var(--x-font)", "cap 11.6pt; 700 not 800, and -.74px tracking, from '635' at 26.8pt wide"),
 ("Type", "t-kicker",  "800 11.7px/16px var(--x-font)",
  "cap 10.7pt, ink top 129.6; 1.76px tracking sets it to the measured 137.4pt"),
 ("Type", "t-unit",    "800 19.4px/24px var(--x-font)",
  "cap 14.3pt; the 2-line card is exactly 24.0pt taller, so line-height is 24; -.43px tracking lands 'Order food and drink' on 179.3pt"),
 ("Type", "t-title",   "800 22.9px/29px var(--x-font)",
  "cap 17.0pt, 08 ink tops 572.5/601.5/630.0; -.25px tracking, line 2 = 350.6pt"),
 ("Type", "t-title-2", "800 22.9px/32px var(--x-font)",
  "same cap and tracking on 07, whose two ink tops are 455.4 and 487.3"),
 ("Type", "t-body",    "500 19.3px/23.2px var(--x-font)",
  "cap 13.8pt on the 'L' of 'Learn', ink tops 618.9 and 642.1; +.55px tracking sets line 1 to 312.3pt"),
 ("Type", "t-btn",     "800 15.0px/20px var(--x-font)", "cap 11.2pt; CONTINUE 76.3pt and SEND CONGRATS 127.1pt, both within 2%"),
 ("Type", "t-link",    "800 15.6px/20px var(--x-font)",
  "cap 11.6pt, 87.0pt wide on NO THANKS; ink top 770.5 on both sheets"),
 ("Type", "t-label",   "600 19.8px/22px var(--x-font)",
  "the 06 divider label, 600 not 800; ink 14.3pt tall, 177.5pt wide"),
 ("Type", "t-chip",    "800 13.5px/18px var(--x-font)", "cap 10.3pt on UP NEXT"),

 ("Metrics", "w",       "393px",   "iPhone 15/16 logical width"),
 ("Metrics", "h",       "852px",   "iPhone 15/16 logical height"),
 ("Metrics", "status",  "54px",    "iOS status bar; no Dynamic Island and no home indicator in any capture"),
 ("Metrics", "gutter",  "15.6px",  "sheet and CTA buttons run x 15.6 to 377.4"),
 ("Metrics", "card-x",  "24.1px",  "unit header left edge, row scan at y 150"),
 ("Metrics", "card-w",  "344.8px", "unit header 24.1 to 368.9"),
 ("Metrics", "card-y",  "111px",   "unit header top, from the corner fit"),
 ("Metrics", "tabs-y",  "756.6px", "top of the 2.2pt tab-bar rule"),
]


def TS(tok):
    """(font-size, line-height) of a type token, so no call site restates a size."""
    v = next(v for g, n, v, e in TOKENS if n == tok)
    a, b = v.split()[1].split("/")
    return float(a.rstrip("px")), float(b.rstrip("px"))


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

# ------------------------------------------------------------------ art ----
def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return
    from PIL import Image                                     # noqa: local dep
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


Z = {"06-tip": 3, "04-duo": 4, "07-btngem": 4}       # art that sits over chrome


def art(cid):
    """One <img>, placed at the box it was measured from."""
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx%s">'
            % (_uri(cid), x0, y0, x1 - x0, y1 - y0,
               ";z-index:%d" % Z[cid] if cid in Z else ""))


def art_of(ref, skip=()):
    """Every crop belonging to one screen, in manifest order."""
    return "".join(art(c) for c in CROPS
                   if c.startswith(ref + "-") and c not in skip)

# ------------------------------------------------------------ phone frame ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-bg);color:var(--x-ink);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.phone>*{position:absolute}
img.a{display:block;z-index:2}
.sb{left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:0;top:18.2px;width:142.3px;text-align:center;
  font:var(--x-t-time)}"""

# The Mobbin captures carry neither a home indicator nor a Dynamic Island,
# so the frame ships without either.


def statusbar(ref):
    """Two status bars in the set: 01/07/08 carry a wider cellular glyph
    than 02-06, so the right cluster is cropped twice."""
    return ('<div class="sb"><div class="time">9:41</div></div>'
            + art("sb-right" if ref == "01" else "sb2-right"))


def ct(ink, fs, lh):
    """Box top that lands the cap top of `fs`/`lh` type on ink row `ink`."""
    return ink - ((lh - fs) / 2 + 0.115 * fs)


def t(cls, ink, fs, lh, body, left=0.0, width=393.0, align="center", extra=""):
    return ('<div class="%s" style="left:%.1fpx;top:%.2fpx;width:%.1fpx;'
            'text-align:%s%s">%s</div>'
            % (cls, left, ct(ink, fs, lh), width, align, extra, body))

# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n'
            '</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print("%-24s %6d KB" % (name + ".html", len(html.encode()) // 1024))


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-ink-2);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-2);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-rule)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2);font-style:normal;word-break:break-all}
.foot{display:flex;gap:28px;align-items:flex-start;margin-top:12px}
.foot h2{margin-top:0}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:#F3F3F3;border:1px solid var(--x-rule)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-2);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid var(--x-rule)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-2);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-rule);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-blue)}
td.v{color:var(--x-ink);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-ink-2)}"""


def _of(group):
    return [x for x in TOKENS if x[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink", "Unit", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s);line-height:1.1">'
        'Discuss destinations</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Eight Mobbin captures, 881 &times; 1910 after the watermark trim, '
                '2.2417 px per pt.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2>'
                '<div class="rad">%s</div></div>'
                '<div><h2>Metrics</h2><div class="met">%s</div></div></div>'
                '<h2>Type</h2>%s</div>'
                % (NAME, swatches, radii, met, type_), SHEET)


EV_ROWS = 34


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
                    '<p>One row per token. A token with no evidence is a guess.</p>'
                    '</header><table class="ev">%s</table></div>' % (of, rows), SHEET))

# -------------------------------------------------------------- screens ----
SCREEN = """.card{left:var(--x-card-x);top:var(--x-card-y);width:var(--x-card-w);
  border-radius:var(--x-r-card);z-index:1}
.card>div{position:absolute}
.card .k{left:16.6px;top:14.9px;font:var(--x-t-kicker);color:var(--x-ink-inv-2);
  letter-spacing:1.76px}
.card .u{left:16.6px;top:36.2px;font:var(--x-t-unit);color:var(--x-ink-inv);
  letter-spacing:-.43px}
.card .sep{top:0;bottom:-4px;left:289.1px;width:2px}
.num{top:72.6px;font:var(--x-t-count);letter-spacing:-.74px}
.tabrule{left:0;top:var(--x-tabs-y);width:var(--x-w);height:2.2px;background:var(--x-rule)}
.fab{left:321.4px;top:685.4px;width:55.3px;height:55.3px;border-radius:50%;
  background:var(--x-border);z-index:1}
.fab i{position:absolute;left:2.2px;right:2.2px;top:2.2px;bottom:4.5px;
  border-radius:50%;background:var(--x-bg)}
.btn{left:var(--x-gutter);width:361.8px;border-radius:var(--x-r-btn);z-index:3}
.btn span{position:absolute;font:var(--x-t-btn);color:var(--x-ink-inv)}
.pill{top:527.9px;left:161.5px;width:70px;height:25.9px;
  border-radius:var(--x-r-pill);z-index:1}
.sec,.desc,.chip{z-index:3}
.sec{font:var(--x-t-title);letter-spacing:-.25px}
.desc{font:var(--x-t-body);letter-spacing:.55px}
.chip{font:var(--x-t-chip)}"""

SHEETCSS = """.sheetbody{left:0;width:var(--x-w);background:var(--x-bg);
  border-radius:var(--x-r-sheet) var(--x-r-sheet) 0 0;z-index:1}
.grab{left:178.5px;height:4.5px;border-radius:var(--x-r-pill);
  background:var(--x-grab);z-index:3}
.tile{left:266.8px;top:380.2px;width:55.3px;height:54px;border-radius:var(--x-r-tile);
  background:var(--x-bg);border:2.2px solid var(--x-border-2);z-index:1}
.title,.link{z-index:3}
.title{font:var(--x-t-title);letter-spacing:-.25px}
.link{font:var(--x-t-link);color:var(--x-blue)}
b{color:var(--x-blue);font-weight:inherit}"""

UNITS = {"01": "green", "02": "red", "03": "blue",
         "04": "purple", "05": "purple", "06": "sky"}


def card(ref, kicker, lines):
    u = UNITS[ref]
    return ('<div class="card" style="height:%.1fpx;background:var(--x-u-%s);'
            'border-bottom:4px solid var(--x-u-%s-d)">'
            '<div class="sep" style="background:var(--x-u-%s-d)"></div>'
            '<div class="k">%s</div><div class="u">%s</div></div>'
            % (76.0 if len(lines) == 1 else 100.0, u, u, u, kicker, "<br>".join(lines)))


def counters(nums):
    return "".join('<div class="num" style="left:%.1fpx;color:var(--x-%s)">%s</div>'
                   % (x, c, s) for s, x, c in nums)


def button(top, height, fill, lip, label, ink, lipw=4.1, extra=""):
    """Duolingo's CTA: a flat body over a `lipw` strip of its own darker shade."""
    return ('<div class="btn" style="top:%.2fpx;height:%.2fpx;background:%s;'
            'border-bottom:%.1fpx solid %s">'
            '<span style="left:0;width:361.8px;text-align:center;top:%.2fpx">%s</span>'
            '%s</div>'
            % (top, height, fill, lipw, lip, ct(ink, *TS("t-btn")) - top, label, extra))


def screen(ref, kicker, title, nums, fab=False, extra=""):
    return page(NAME + " - " + " ".join(title),
                '<div class="phone">%s%s%s%s%s<div class="tabrule"></div>%s</div>'
                % (statusbar(ref), counters(nums), card(ref, kicker, title),
                   extra, '<div class="fab"><i></i></div>' if fab else "",
                   art_of(ref)),
                SCREEN)


# 04 and 05 replace the lower path with the same "up next" block, in two states.
def upnext(chip_bg, chip_ink, ink, sec, desc, button_html, lead=""):
    return ('%s<div class="pill" style="background:var(--x-%s)"></div>'
            '%s%s%s%s'
            % (lead, chip_bg,
               t("chip", 535.8, *TS("t-chip"), "UP NEXT", 161.5, 70.0,
                 extra=";color:var(--x-%s)" % chip_ink),
               t("sec", 574.9, *TS("t-title"), sec, extra=";color:var(--x-%s)" % ink),
               t("desc", 618.9, *TS("t-body"), "<br>".join(desc),
                 extra=";color:var(--x-%s)" % ink),
               button_html))


def s04():
    cta = button(684.5, 48.2, "var(--x-cta)", "var(--x-cta-d)", "CONTINUE", 700.7)
    rule = ('<div style="left:0;top:501.7px;width:393px;height:1.8px;'
            'background:var(--x-border);z-index:1"></div>')
    return screen("04", "SECTION 1, UNIT 47", ["Bistro: Ask for the bill"],
                  [("19", 63.1, "ink"), ("847", 144.5, "ink-2"),
                   ("8369", 233.6, "blue"), ("25", 341.4, "pink")],
                  extra=upnext("chip", "cta", "ink", "Section 2",
                               ["Learn words, phrases, and grammar",
                                "concepts for basic interactions"], cta, rule))


def s05():
    jump = ('<div class="btn" style="top:683.7px;height:49.1px;background:var(--x-bg);'
            'border:1.7px solid var(--x-rule);border-bottom-width:4.5px">'
            '<span style="left:0;width:358.4px;text-align:center;top:%.2fpx;'
            'color:var(--x-cta)">JUMP HERE?</span></div>'
            % (ct(700.7, *TS("t-btn")) - 683.7 - 1.7))
    panel = ('<div style="left:0;top:504px;width:393px;height:252.4px;'
             'background:var(--x-panel);z-index:1"></div>')
    # The lock glyph is cropped art, so "Section 3" is placed to its right rather
    # than centred on the screen: the lock plus the words are what is centred.
    sec = ('<div class="sec" style="left:161.5px;top:%.2fpx;color:var(--x-ink-2)">'
           'Section 3</div>' % ct(574.9, *TS("t-title")))
    return screen("05", "SECTION 2, UNIT 22", ["Describe people"],
                  [("1", 137.5, "ink-2"), ("500", 225.6, "cta")],
                  extra=upnext("chip-2", "ink-2", "ink-2", "", 
                               ["Learn more foundational concepts and",
                                "sentences for basic conversations"], jump, panel)
                        + sec)


def s06():
    rules = "".join(
        '<div style="left:%.1fpx;top:245.9px;width:66px;height:1.7px;'
        'background:var(--x-rule);z-index:1"></div>' % x for x in (24.0, 302.9))
    label = t("", 239.8, *TS("t-label"), "Discuss destinations",
              extra=";font:var(--x-t-label);letter-spacing:-.11px;color:var(--x-ink-3)")
    return screen("06", "SECTION 2, UNIT 1", ["Use gender and", "number agreement"],
                  [("1", 137.5, "ink-2"), ("500", 225.6, "cta")],
                  fab=True, extra=rules + label)


def sheet(ref, top, grab_w, body, title, btn_label, link, btn_ink, btn_extra=""):
    return page(NAME + " - " + title,
                '<div class="phone">%s<div class="sheetbody" style="top:%.2fpx;'
                'height:%.2fpx"></div><div class="grab" style="top:%.1fpx;'
                'width:%.1fpx"></div>%s%s%s%s</div>'
                % (art(ref + "-bg"), top, 852 - top, top + 6.45, grab_w, body,
                   button(697.6, 48.2, "var(--x-btn)", "var(--x-btn-d)",
                          btn_label, btn_ink, extra=btn_extra),
                   t("link", 769.8, *TS("t-link"), link),
                   art_of(ref, skip=(ref + "-bg",))),
                SCREEN + "\n" + SHEETCSS)


def s07():
    body = (t("link", 413.1, *TS("t-link"), "641", 340.7, 30.0, "left")
            + t("title", 455.4, *TS("t-title-2"),
                "You protected your 5 day<br>streak with a <b>Streak Freeze!</b>"))
    # REFILL, the gem, and 425 each sit at their own measured x inside the button.
    label = ('<span style="left:122.9px;top:%.2fpx">REFILL</span>'
             '<span style="left:211.8px;top:%.2fpx">425</span>'
             % (ct(714.0, *TS("t-btn")) - 697.6, ct(714.0, *TS("t-btn")) - 697.6))
    return sheet("07", 373.85, 36.6, body, "Streak freeze", "", "NO THANKS",
                 714.0, btn_extra=label)


def s08():
    body = ('<div class="tile"></div>'
            + t("title", 572.5, *TS("t-title"),
                "<b>JohnSmith</b> finished #1 and<br>"
                "advanced to the Semifinals of the<br>"
                "Diamond Tournament!"))
    return sheet("08", 313.85, 36.2, body, "League promotion",
                 "SEND CONGRATS", "DISMISS", 714.2)


SCREENS = [
    ("01-path-green", "Path: green", lambda: screen(
        "01", "SECTION 1, UNIT 10", ["Order food and drink"],
        [("10", 63.1, "ink"), ("5", 154.5, "orange"), ("635", 233.1, "blue")],
        fab=True)),
    ("02-path-red", "Path: red", lambda: screen(
        "02", "SECTION 1, UNIT 9", ["Describe your family"],
        [("10", 63.1, "ink"), ("5", 154.5, "orange"), ("635", 233.1, "blue")],
        fab=True)),
    ("03-path-blue", "Path: blue", lambda: screen(
        "03", "SECTION 2, UNIT 99", ["Morning: Talk about", "getting ready"],
        [("19", 63.1, "ink"), ("846", 144.5, "ink-2"),
         ("8369", 233.6, "blue"), ("25", 341.4, "pink")])),
    ("04-section-done", "Section complete", s04),
    ("05-section-next", "Up next: locked", s05),
    ("06-jump-here", "Jump here", s06),
    ("07-streak-freeze", "Streak freeze", s07),
    ("08-league-promo", "League promotion", s08),
]

# ------------------------------------------------------------ references ----
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


# ----------------------------------------------------------------- main ----
def layout(names):
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                      + [{"file": n, "label": "Evidence"}
                         for n, _ in evidence_boards()]},
            {"title": "Screens", "numbered": True,
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
    (OUT / "layout.json").write_text(json.dumps(layout(files), indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(layout(files)["rows"])))


if __name__ == "__main__":
    main()
