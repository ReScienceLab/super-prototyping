"""The pass templates half of mockups/canvases/apple-wallet/, boards 03-07.

Source: the Figma community file "Apple Wallet Templates", JJU4hc5PIkYLVhsGVNZYI2.
Five pass templates, one frame each, node ids per board in README.md. Unlike
apple-wallet / apple-settings / apple-calendar this file ships no dark
appearance, so every board here is light and there is no .dark block.

It also publishes no variables at all: get_variable_defs comes back empty. So
every colour is a raw hex read out of the design context and confirmed against
the file's own 2x PNG exports under assets/refs/, and every metric is a node
box confirmed the same way. Where the two disagree the export wins; the
README lists the places that mattered.

Two coordinate systems, and they are not interchangeable. Card art (logo,
company name, app icon, the info glyph, the barcode) is a child of the pass
and is placed card-relative; every "Field" instance is a child of the frame
and is placed in frame coordinates, over the card. Reading a field box as
card-relative puts it 108pt low, which the export catches immediately.

The frame is 390 x 844 with a notch, not the repo's usual 393 x 852 Dynamic
Island frame, so the phone here is 42pt-cornered and DISPLAY draws the notch.
Verify with `refkit shoot --crop-phone --phone-size 390x844 --phone-radius 42`.

letter-spacing is measured here, which no earlier run needed. Figma's own SF
Pro sets 14pt through 22pt wider than Chrome does and matches it at 12 and 40,
so LS carries one tracking token per size, solved off the export. The glyph
outlines are identical either way -- only the advances differ -- and the file's
one stated tracking, .18px on Hold Near Reader, rides on top of the 20pt
correction. See README.md.

Artboards are output. Edit this file, never the HTML.

    python3 mockups/canvases/apple-wallet/gen.py
"""
import base64
import os

OUT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(OUT, "assets", "passes")
REFS = os.path.join(OUT, "assets", "refs")


def icon(name, style="", cls=""):
    """Inline one glyph. Its viewBox IS its ink box -- either because
    apple-calendar/iconkit.py measured it (the SF Symbols) or because Figma
    exported the node alone (the card backgrounds) -- so a left/top/width/
    height off the frame places it exactly."""
    svg = open(os.path.join(ASSETS, "icons", name + ".svg"), encoding="utf-8").read()
    return svg.replace("<svg ", '<svg preserveAspectRatio="none" class="%s" style="%s" '
                       % (cls, style), 1)


def at(name, x, y, w, h, cls="", style=""):
    return icon(name, "left:%gpx;top:%gpx;width:%gpx;height:%gpx;%s"
                % (x, y, w, h, style), cls)


def img(name):
    """assets/images/<name> as a data: URI. The iframe is sandboxed, so a board
    that wants a bitmap has to carry it. Logos are the file's own art at 3x of
    the 32pt slot they render in; the four photographs are JPEG at the 2x of
    the comparison scale, because a 916px PNG of palm trees costs 1.4 MB."""
    ext = name.rsplit(".", 1)[1]
    with open(os.path.join(ASSETS, "images", name), "rb") as f:
        return "data:image/%s;base64,%s" % (
            "jpeg" if ext == "jpg" else ext, base64.b64encode(f.read()).decode())


# ---------------------------------------------------------------- tokens

# (group, name, value, evidence). One row per token, and the :root block, the
# token board and the evidence boards are all generated from it, so a value
# cannot drift from the evidence behind it.
#
# "2x" in an evidence row means a sample or an ink box measured off the file's
# own PNG export in assets/refs/, at its native 780 x 1688.
TOKENS_SPEC = [
 ("", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  'every type style in the file is Font(family: "SF Pro"); this is the '
  'platform stack that resolves to it on macOS and iOS'),

 ("Surface", "bg", "#FFFFFF",
  "the page under every one of the five frames, and the barcode background "
  "on both scannable passes"),
 ("Surface", "black", "#000000",
  "the Display Shape, the status-bar glyphs, Done, the ellipsis and the home "
  "indicator. No opacity on any of them, which the 2x export confirms"),
 ("Surface", "white", "#FFFFFF",
  "every string on a pass: company name, field labels and values on the "
  "coupon and the keys, and both barcode grounds"),
 ("Surface", "pass-green", "#579B52",
  "fill on the Flight Pass Card Background path; 2x samples [87,155,82]"),
 ("Surface", "pass-blue", "#1287FF",
  "fill on the Coupon Card Background path; 2x samples #1287FF flat"),
 ("Surface", "key-mask", "#D8D8D8",
  "bg-[#d8d8d8] on the Key Background mask, under a cover photo on all three "
  "key passes, so it is never visible; kept because the file states it"),

 ("Ink", "gold", "#F7E6C0",
  "raw hex on every Field label of the boarding pass (GATE, SAN FRANCISCO, "
  "SCHEDULED, ...). The coupon and the keys use white for the same slot"),
 ("Ink", "num", "#1D1D1F",
  "raw hex on the coupon's barcode number, the one string on any of the five "
  "frames that is not white or black"),
 ("Ink", "hnr", "rgba(60,60,67,.6)",
  "raw rgba on the Hold Near Reader label; it sits on a white page, so 2x "
  "reads the composite #767680"),
 ("Ink", "symbol", "#F5F5F7",
  "fill on the Flight Symbol path -- not white, and the only near-white on "
  "the boarding pass that is not #FFFFFF"),

 ("Radius", "r-phone", "42px",
  "the Display Shape's own corner, solved off the 2x export: black reaches "
  "x 38.5 at y 0, 5.5 at y 20 and 1.5 at y 30, which is a plain r=42 circle"),
 ("Radius", "r-pass", "17.6px",
  "corner radius on the Flight Pass and Coupon Card Background paths"),
 ("Radius", "r-key", "11px",
  "corner radius on the Key Background mask"),
 ("Radius", "r-qr", "5px",
  "corner radius on both barcode backgrounds. The file states it on the "
  "coupon's; the boarding pass's own corner profile, solved off 2x, is the "
  "same circle (inset 3.24pt at 0.43 below the top edge)"),
 ("Radius", "r-pill", "100px",
  "corner radius on the home indicator"),

 ("Type", "t-m12", "510 12px/16px var(--awt-font)",
  "Figma Medium/12pt: every Field label on all five frames"),
 ("Type", "t-r14", "400 14px/21px var(--awt-font)",
  "Figma Regular/14pt: the coupon's barcode number"),
 ("Type", "t-b15", "590 15px/20px var(--awt-font)",
  "Figma SemiBold/15pt on Time, at the file's auto line height; 20px is the "
  "round line box that lands its baseline on the 2x export's 29.25"),
 ("Type", "t-r17", "400 17px/22px var(--awt-font)",
  "Figma Regular/17pt: Field - Small values"),
 ("Type", "t-b17", "590 17px/22px var(--awt-font)",
  "Figma SemiBold/17pt: the Done button"),
 ("Type", "t-r20", "400 20px/24px var(--awt-font)",
  "Figma Regular/20pt: the Hold Near Reader label"),
 ("Type", "t-b20", "590 20px/24px var(--awt-font)",
  "Figma SemiBold/20pt: every Company Name"),
 ("Type", "t-r22", "400 22px/28px var(--awt-font)",
  "Figma Regular/22pt: Field - Medium values (GATE 62, SEP 23 - OCT 1)"),
 ("Type", "t-r40", "400 40px/41px var(--awt-font)",
  "Figma Regular/40pt uppercase: Field - Primary values (SFO, LGA)"),
 ("Type", "ls-14", ".19px",
  "tracking. Figma's SF Pro sets 14pt .19pt/char wider than Chrome does; "
  "solved off the coupon's 14-digit barcode number (mine 111.5, ref 114.0)"),
 ("Type", "ls-17", ".45px",
  "tracking at 17pt, solved off the coupon's 31-character message "
  "(mine 237.5, ref 251.0, 30 gaps) and confirmed on LIZ CHETELAT"),
 ("Type", "ls-20", ".45px",
  "tracking at 20pt, solved off Downtown San Francisco (21 gaps, 9.5pt "
  "short) and Beachfront Suites (16 gaps, 7.5pt short)"),
 ("Type", "ls-22", ".3px",
  "tracking at 22pt, solved off SEP 23 - OCT 1 (13 gaps, 3.5pt short). "
  "12pt and 40pt need none: their strings already measure to the pixel"),

 ("Metrics", "w", "390px", "node box of every one of the five frames"),
 ("Metrics", "h", "844px", "node box of every one of the five frames"),
 ("Metrics", "sb", "48px", "node box of the Status Bar frame"),
 ("Metrics", "nav", "91px", "node box of the Navigation Bar frame"),
 ("Metrics", "pass-w", "358px",
  "node box of the Flight Pass, the Coupon and the Key Background"),
 ("Metrics", "pass-h", "502px", "node box of the Flight Pass and the Coupon"),
 ("Metrics", "key-h", "225px",
  "node box of the Key Background: inset 51.99% from the bottom of a 502pt "
  "Key, so a key pass is the same width as a full pass and 277 shorter"),
 ("Metrics", "pass-x", "16px", "node box: 16 either side of 358 in a 390 frame"),
 ("Metrics", "pass-y", "108px",
  "node box: the top of every pass, 48 of status bar plus a 60pt gap"),
 ("Metrics", "home-w", "134px", "node box of the home indicator bar"),
]


def _root():
    """One :root block, byte-identical in every board, and no `}` inside it:
    tools/refkit.py reads it with a non-greedy regex."""
    out, seen = [":root{"], None
    for group, name, value, _ev in TOKENS_SPEC:
        if group and group != seen:
            out.append("")
            out.append("  /* %s */" % group)
        seen = group
        out.append("  --awt-%s:%s;" % (name, value))
    return "\n".join(out) + "\n}"


TOKENS = _root()

BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--awt-font);background:#fff;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;padding:24px}"""

# The notch, as one path in frame coordinates, solved off the 2x export rather
# than taken from the file: the Display Shape node exports as a 55 KB bitmap
# per board and this is 300 bytes. Black reaches x 82 at y 0 and x 87 from
# y 8.75 down, so the top fillets are r=5 and the bottom corners r=22, meeting
# a flat bottom edge at y 30.75. It is drawn over everything, which is what
# the file does; nothing on any of the five frames reaches under it.
NOTCH = ('<svg class="ds" viewBox="0 0 390 844" width="390" height="844">'
         '<path d="M82 0A5 5 0 0 1 87 5L87 8.75A22 22 0 0 0 109 30.75'
         'L281 30.75A22 22 0 0 0 303 8.75L303 5A5 5 0 0 1 308 0Z"/></svg>')

PHONE = """.phone{width:var(--awt-w);height:var(--awt-h);position:relative;flex:none;overflow:hidden;border-radius:var(--awt-r-phone);background:var(--awt-bg);color:var(--awt-black);outline:1px solid rgba(0,0,0,.10);box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.ds{position:absolute;left:0;top:0;z-index:9}
.ds path{fill:var(--awt-black)}
.sb{position:absolute;left:0;right:0;top:0;height:var(--awt-sb);z-index:8}
.sb .t{position:absolute;left:21px;top:13.5px;width:54px;height:20px;text-align:center;font:var(--awt-t-b15)}
.nav{position:absolute;left:0;right:0;top:0;height:var(--awt-nav);z-index:8}
.nav .done{position:absolute;left:15.6px;top:56.75px;width:43.68px;letter-spacing:var(--awt-ls-17);font:var(--awt-t-b17)}
.phone>svg,.sb svg,.nav svg{position:absolute;display:block}
.home{position:absolute;left:128px;top:830.5px;z-index:7;width:var(--awt-home-w);height:5px;border-radius:var(--awt-r-pill);background:var(--awt-black)}"""

# Each entry is the glyph's own ink rect in the 390 x 844 frame. Battery is one
# lifted group, not three rects: its 21 x 10.333 shell is a 1pt stroke at 35%,
# so its ink runs half a point past the viewBox on three sides and the file
# carries overflow="visible" to let it.
SB_ICONS = [("cellular", 302, 20, 17, 10.6667),
            ("wifi", 325, 20, 15.3333, 11),
            ("battery", 347.833, 19.8333, 23.828, 10.3333)]


def chrome(time="9:41"):
    """Status bar, nav bar and home indicator: byte-identical on all five
    frames, down to the ellipsis at x 349.283."""
    return ('<div class="sb"><div class="t">%s</div>%s</div>'
            '<div class="nav"><div class="done">Done</div>%s</div>'
            '<div class="home"></div>%s'
            % (time, "".join(at(*i) for i in SB_ICONS),
               at("ellipsis", 349.283, 56.801, 22.408, 22.397), NOTCH))


def page(title, css, body):
    return """<!DOCTYPE html>
<html lang="en">
<meta charset="utf-8">
<title>%s</title>
<style>
%s
%s
%s
</style>
%s
</html>
""" % (title, TOKENS, BASE, css, body)


def phone(body):
    return '<div class="phone">%s</div>' % body


# ------------------------------------------------------------- the screens

# The logos are white-on-transparent glyphs, not squircles, so the 32pt Logo
# and the 20pt App Icon at the bottom of a pass are the same file at two
# sizes -- confirmed at 0.9 levels of 255 against both slots on ref-01. That
# also makes the Logo node's 4pt corner radius a no-op, so no token for it.
LOGO = {n: img("logo-%s.png" % n)
        for n in ("fleet", "fruit", "key-a", "key-b", "key-c")}
STRIP = img("strip.jpg")
KEY_PHOTO = {n: img("key-%s.jpg" % n) for n in ("a", "b", "c")}
QR = img("qr-raster.png")

SCREEN_CSS = PHONE + """
.im,.tx,.qr{position:absolute}
.im{display:block;object-fit:cover}
.lg{object-fit:contain}
.tx{white-space:nowrap}
.qr{background:var(--awt-white);border-radius:var(--awt-r-qr)}
.green{color:var(--awt-pass-green)}
.blue{color:var(--awt-pass-blue)}
.white{color:var(--awt-white)}
.sym{color:var(--awt-symbol)}
.key{border-radius:var(--awt-r-key);background:var(--awt-key-mask);filter:drop-shadow(0 4px 8px rgba(0,0,0,.15))}
.hnr{left:112.52px;top:455.005px;letter-spacing:calc(var(--awt-ls-20) + .18px);font:var(--awt-t-r20);color:var(--awt-hnr)}"""


def logo(which, x, y, size):
    """A Logo or an App Icon. The art is fitted, never cropped: only
    logo-key-a is non-square (500 x 478) and the export shows its 29.5pt ink
    square, which is contain, not cover."""
    return im(LOGO[which], x, y, size, size, "lg")


def im(src, x, y, w, h, cls=""):
    return ('<img class="im %s" alt="" src="%s" style="left:%gpx;top:%gpx;'
            'width:%gpx;height:%gpx">' % (cls, src, x, y, w, h))


# Which tracking token each type token takes. Figma's own SF Pro advances
# run wider than Chrome's at 14pt through 22pt and match it at 12 and 40,
# so the correction is per size and measured, not a single global value.
# See README.md; the glyphs themselves measure the same width in both.
LS = {"r14": "ls-14", "r17": "ls-17", "b17": "ls-17",
      "r20": "ls-20", "b20": "ls-20", "r22": "ls-22"}


def ty(t):
    """The `font:` shorthand for a type token plus its tracking."""
    if t not in LS:
        return "font:var(--awt-t-%s)" % t
    return ("letter-spacing:var(--awt-%s);font:var(--awt-t-%s)" % (LS[t], t))


def tx(s, style):
    return '<div class="tx" style="%s">%s</div>' % (style, s)


def ra(pos, t):
    """letter-spacing also pads after the last glyph, which walks a
    right-aligned string left by one gap. Pull the box back by the same."""
    if t not in LS or not pos.startswith("right:"):
        return ""
    return ";margin-right:calc(-1 * var(--awt-%s))" % LS[t]


def bold(s, pos, y, colour="var(--awt-white)"):
    """A Company Name, or the one bold 20pt string a key pass carries."""
    return tx(s, "%s;top:%gpx;%s;color:%s%s"
              % (pos, y - 0.5, ty("b20"), colour, ra(pos, "b20")))


def lbl(s, pos, y, colour="var(--awt-gold)"):
    """A Field label. 12pt does not take the half-point shift."""
    return tx(s, "%s;top:%gpx;%s;color:%s" % (pos, y, ty("m12"), colour))


def val(s, pos, y, t, colour="var(--awt-white)"):
    """A Field value, written half a point above its Figma top -- Chrome sets
    a glyph that much lower than Figma inside the same line box, from 15pt up.
    Same finding as apple-wallet and apple-settings."""
    return tx(s, "%s;top:%gpx;%s;color:%s%s"
              % (pos, y - 0.5, ty(t), colour, ra(pos, t)))


def barcode(x, y, w, h, *parts):
    """The white ground plus whatever is drawn on it. Both scannable passes
    stack a vector QR and a raster one, 2pt apart -- see README.md."""
    return ('<div class="qr" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx">'
            '</div>' % (x, y, w, h)) + "".join(parts)


# label, value, left, top of the five Field - Small instances, in frame
# coordinates. The value sits 12 under the label's top.
FLIGHT_SMALL = [("SCHEDULED", "2:40", 32, 254),
                ("FLIGHT", "AP 2214", 135, 254),
                ("SEAT", "33A", 224, 254),
                ("GROUP", "B", 301, 254),
                ("PASSENGER", "LIZ CHETELAT", 33, 306)]


def boarding_pass():
    """Flight Pass. The plane is one 34.17 x 34.38 glyph rotated 45 degrees
    inside a 48.587 square box; its rotated bbox measures 42.03 x 34.13 at
    (+2.76, -0.02) from the glyph centre, which is what the export shows."""
    return page("Apple Wallet Templates - Boarding Pass", SCREEN_CSS, phone(
        at("pass-bg-flight", 16, 108, 358, 502, "green")
        + logo("fleet", 26, 118, 32)
        + bold("Fleet", "left:64px", 122)
        + at("flight-symbol", 177.646, 197.044, 34.1688, 34.3784, "sym",
             "transform:rotate(45deg)")
        + lbl("GATE", "right:34px", 117) + val("62", "right:35px", 127, "r22")
        + lbl("SAN FRANCISCO", "left:32px", 176)
        + val("SFO", "left:32px", 191, "r40")
        + lbl("NEW YORK", "right:34.5px", 176.6995)
        + val("LGA", "right:34.5px", 191.6995, "r40")
        + "".join(lbl(l, "left:%gpx" % x, y)
                  + val(v, "left:%gpx" % x, y + 12, "r17")
                  for l, v, x, y in FLIGHT_SMALL)
        + barcode(111.26, 417.07, 168.1, 175.45,
                  at("qr-flight", 127.41, 433.88, 136.07, 142),
                  im(QR, 138.97, 446, 113.05, 118))
        + logo("fleet", 26, 580, 20)
        + at("nfc", 343.216, 572.904, 17.5546, 27.9839, "white")
        + chrome()))


def store_card():
    """Coupon. Its background path and its strip are inset a point left of
    the 16pt gutter every other pass sits on; the card's own children are
    not. Both numbers are in the export -- see README.md."""
    return page("Apple Wallet Templates - Store Card", SCREEN_CSS, phone(
        at("pass-bg-coupon", 15, 108, 358, 502, "blue")
        + im(STRIP, 15, 177.057, 358, 127.358)
        + logo("fruit", 26, 118, 32)
        + bold("Front Door Fruit", "left:64px", 122)
        + lbl("Front Door Fruit Stand, Cupertino", "left:32px", 321.0049,
              "var(--awt-white)")
        + val("Your busket is ready for pickup.", "left:32px", 333.0049, "r17")
        + barcode(120, 422, 150, 167,
                  at("qr-coupon", 136, 438, 118, 118),
                  im(QR, 138, 438, 118, 118),
                  # 14pt is the one size this file uses that no run has yet
                  # tested the half-point shift on, so it is written at its
                  # measured Figma top; ink lands 568..578 either way.
                  tx("57801237606617", "left:122px;top:563px;width:148px;"
                     "text-align:center;text-indent:var(--awt-ls-14);"
                     + ty("r14") + ";color:var(--awt-num)"))
        + logo("fruit", 26, 580, 20)
        + at("info", 340.796, 576.051, 22.408, 22.397, "white")
        + chrome()))


def key_pass(photo, name, title):
    """The three key templates: one 358 x 225 cover photo with a logo on it,
    a title, and the Hold Near Reader block. That label is the file's one
    node with tracking of its own, .18pt on top of the 20pt correction."""
    return page("Apple Wallet Templates - Key", SCREEN_CSS, phone(
        im(KEY_PHOTO[photo], 16.52, 108, 358, 225, "key")
        + logo(name, 32.52, 124, 32)
        + title
        + at("hold-near-reader", 162.52, 382, 64, 64)
        + '<div class="tx hnr">Hold Near Reader</div>'
        + chrome()))


def home_key():
    return key_pass("a", "key-a", bold("Downtown San Francisco",
                                       "left:32.52px", 291.005))


def car_key():
    return key_pass("b", "key-b", bold("822V", "right:31.48px", 127.005))


def hotel_key():
    return key_pass("c", "key-c",
                    bold("Beachfront Suites", "left:32.52px", 291.005)
                    + lbl("MAUI, HAWAII", "right:31.34px", 120,
                          "var(--awt-white)")
                    + val("SEP 23 - OCT 1", "right:32.34px", 130, "r22"))


# --------------------------------------------- Phase 1 and 2, as two boards

# The token block rendered as itself, and the evidence behind every row of
# it. Both are built from TOKENS_SPEC, so neither can fall out of step with
# the :root the screens inline.
SHEET = """body{padding:0;background:var(--awt-bg);color:var(--awt-black)}
.sh8{width:478px;height:980px;padding:22px 24px;overflow:hidden}
h1{font:590 20px/25px var(--awt-font)}
header p{font:400 13px/16px var(--awt-font);color:#8E8E93;margin:2px 0 12px}
h2{font:590 10px/12px var(--awt-font);text-transform:uppercase;color:#8E8E93;margin:13px 0 6px}
.gr{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.sw .ch{height:24px;border-radius:5px;border:0.5px solid #C7C7CC;overflow:hidden}
.sw b{display:block;margin-top:3px;font:590 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;color:#8E8E93;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rd{display:flex;gap:10px}
.rd div{text-align:center}
.rd .b{width:52px;height:44px;background:var(--awt-pass-blue);border:0.5px solid #C7C7CC}
.rd em{display:block;margin-top:3px;font:400 8.5px/11px var(--awt-font);color:#8E8E93;font-style:normal}
.ty .tr{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding-bottom:2px;border-bottom:0.5px solid #C7C7CC}
.ty .tr span{white-space:nowrap}
.ty .tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:#8E8E93;font-style:normal;white-space:nowrap;flex:none}
.mt{columns:3;column-gap:14px;font:400 9px/13.5px ui-monospace,Menlo,monospace;color:#8E8E93}
.ev div{padding:3px 0;border-bottom:0.5px solid #C7C7CC}
.ev b{font:590 8.5px/12px ui-monospace,Menlo,monospace;color:var(--awt-pass-blue)}
.ev i{font:400 8.5px/12px ui-monospace,Menlo,monospace;color:#8E8E93;font-style:normal}
.ev p{font:400 8px/11px var(--awt-font);color:#8E8E93}"""


def _of(group):
    return [t for t in TOKENS_SPEC if t[0] == group]


def token_board():
    sw = "".join('<div class="sw"><div class="ch" style="background:%s"></div>'
                 '<b>--awt-%s</b><i>%s</i></div>' % (v, n, v)
                 for g in ("Surface", "Ink") for _, n, v, _ in _of(g))
    rd = "".join('<div><div class="b" style="border-radius:%s"></div><em>%s</em></div>'
                 % (v, n[2:]) for _, n, v, _ in _of("Radius"))
    ty = "".join('<div class="tr"><span style="font:var(--awt-%s)">%s</span>'
                 '<em>%s</em></div>'
                 % (n, "Fleet" if int(v.split()[1].split("px")[0]) >= 22
                    else "Boarding Passes and Tickets", v.split(" var")[0])
                 for _, n, v, _ in _of("Type") if n.startswith("t-"))
    ty += "".join('<div class="tr"><span style="font:400 %spx/1.3 var(--awt-font);'
                  'letter-spacing:var(--awt-%s)">%s</span><em>%s %s</em></div>'
                  % (n[3:], n, "Fleet" if int(n[3:]) >= 22 else "Boarding Passes",
                     v, "at " + n[3:] + "pt")
                  for _, n, v, _ in _of("Type") if n.startswith("ls-"))
    mt = "<br>".join("--awt-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    ev = len(list(evidence_boards()))
    return page("Apple Wallet Templates - Design Tokens", SHEET,
                '<div class="sh8"><header><h1>Apple Wallet Templates</h1>'
                '<p>Figma JJU4hc5PIkYLVhsGVNZYI2, five pass templates. The file '
                'publishes no variables at all, so every chip here is a raw hex '
                'read out of the design context and confirmed against the file\'s '
                'own 2&times; PNG export; there is no dark appearance to redefine '
                'any of them. The type ramp is labelled with its own shorthand. '
                'Evidence for all %d tokens is on the next %d board%s.</p></header>'
                '<h2>Colour</h2><div class="gr">%s</div>'
                '<h2>Radius</h2><div class="rd">%s</div>'
                '<h2>Type</h2><div class="ty">%s</div>'
                '<h2>Metrics</h2><div class="mt">%s</div></div>'
                % (len(TOKENS_SPEC), ev, "" if ev == 1 else "s", sw, rd, ty, mt))


EV_LETTERS = "efghij"   # 00-00c belong to screens.py; these follow
EV_ROWS = 21   # what fits the 478 x 980 box; past this the table splits


def evidence_boards():
    """The evidence table, over as many boards as it needs. It is the
    deliverable of Phase 1: split the board, never trim the rows."""
    pages = [TOKENS_SPEC[i:i + EV_ROWS] for i in range(0, len(TOKENS_SPEC), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows_ = "".join('<div><b>--awt-%s</b> <i>%s</i><p>%s</p></div>'
                        % (n, v, e) for _g, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages))
        yield ("00%s-evidence" % EV_LETTERS[i],
               page("Apple Wallet Templates - Evidence" + of, SHEET,
                    '<div class="sh8"><header><h1>Evidence%s</h1>'
                    '<p>Token, then its value, then where the value came from. A '
                    'token with no evidence is a guess.</p></header>'
                    '<div class="ev">%s</div></div>' % (of, rows_)))


# ------------------------------------------------- Phase 5: the references

# assets/refs/ref-<name>.png is the file's own PNG export of that frame at 2x,
# 780 x 1688, unretouched. They are gitignored (they are someone else's
# artwork), so a fresh clone regenerates the boards above and skips these.
REF_CSS = """.rb{width:430px;height:932px;background:#151311;border-radius:20px;padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rb h1{font:590 15px/20px var(--awt-font)}
.rb p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rb .shot{margin-top:9px;display:flex;justify-content:center}
.rb img{width:390px;height:844px;display:block;border-radius:6px}"""


def ref_boards():
    for stem, label, _fn, _node in SCREENS:
        path = os.path.join(REFS, "ref-%s.png" % stem)
        if not os.path.exists(path):
            continue
        with open(path, "rb") as f:
            uri = "data:image/png;base64," + base64.b64encode(f.read()).decode()
        yield ("ref-" + stem,
               page("Apple Wallet Templates - reference: %s" % label, REF_CSS,
                    '<div class="rb"><h1>%s &mdash; reference</h1>'
                    '<p>Figma PNG export &middot; 780&times;1688 @2x &middot; '
                    'exact frame, not a near match</p>'
                    '<div class="shot"><img alt="%s" src="%s"></div></div>'
                    % (label, label, uri)))


# (file stem, caption on the canvas, builder, Figma node id).
SCREENS = [("03-boarding-pass", "Boarding Pass", boarding_pass, "0:66"),
           ("04-store-card", "Store Card", store_card, "0:57"),
           ("05-key-a", "Home Key", home_key, "0:17"),
           ("06-key-b", "Car Key", car_key, "0:10"),
           ("07-key-c", "Hotel Key", hotel_key, "0:2")]


