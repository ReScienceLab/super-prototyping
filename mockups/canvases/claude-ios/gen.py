"""Emit mockups/canvases/claude-ios/ from measurements of 15 Mobbin captures.

Fifteen screens of the Claude iOS app, four flows: asking Claude, voice mode,
a PDF attachment and a photo attachment. Every value in TOKENS carries the
measurement it came from; nothing here is eyeballed.

    python3 mockups/canvases/claude-ios/gen.py

Artboards are output. Edit this file, never the HTML.

Two things about the source are not defects in the replica:

  * The captures have no Dynamic Island. All fifteen show a bare status bar
    over the page ground, clock and glyphs only, so the frame is drawn with
    island=False and --crop-phone diffs against it cleanly.
  * The streaming answer on screen 03 runs its bold labels straight into the
    previous sentence -- "and granolaLunch:" -- because the app is rendering
    a partial markdown stream. Transcribed as it renders.

Colour space: captures 08-15 arrived untagged Display P3 and were converted
to sRGB before anything was sampled; 01-07 were already sRGB. Without that
conversion the same brand orange reads #E07A54 on one half of the set and
#D97757 on the other. See README.md.
"""
import base64, json, math
from pathlib import Path

OUT = Path(__file__).resolve().parent
A = json.load(open(OUT / "assets.json"))

NAME = "Claude iOS"
PAGE_NAME = "(example) " + NAME
P = "c"

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Written with the placeholder prefix --x-
# and rewritten to P on the way out. Coordinates in the evidence column are
# design pt off the 3x captures (1179 x 2556 = 393 x 852 pt).
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on &ldquo;Claude&rdquo;, 13pt cap: no call (0.760/0.725/0.710). "
  "The real face is Styrene, a brand face outside the candidate set; the "
  "system stack is the honest stand-in"),
 ("Font", "serif", 'Georgia,"Iowan Old Style",Charter,"Times New Roman",serif',
  "width-fit vs cap-fit over 7 installed serifs: Georgia 1.00 body / 1.01 "
  "heading, next best 0.99. The real face is Tiempos, also a brand face"),

 ("Surface", "bg",     "#FBF9F5", "flat-fill census, page ground, 12 screens"),
 ("Surface", "card",   "#FBFAF7", "flat census inside the composer; it is a blur material, spread #F9FAF5..#FDFBF9"),
 ("Surface", "fill",   "#EFEEE6", "flat census, user bubble and the three sheet tiles"),
 ("Surface", "raised", "#FEFCFB", "flat census, the 44pt nav circles and the sheet&rsquo;s close button"),
 ("Surface", "white",  "#FFFFFF", "flat census, keyboard keys and the attached-file card"),
 ("Surface", "kbd",    "#E3E3E5", "flat census, keyboard ground y 545..852"),
 ("Surface", "scrim",  "rgba(0,0,0,.20)", "sheet scrim reads #C9C7C5 over #FBF9F5: 1 - 201/251 = .199"),

 ("Line", "hairline",  "#C8C6C2", "scan across the artifact card&rsquo;s 0.33pt divider, y 343.7"),
 ("Line", "border",    "#E3E2DE", "scan across the artifact card&rsquo;s outline, x 15.7 and 377.7"),

 ("Ink", "ink",        "#12100F", "ink core of typed text and serif body, darkest 2%"),
 ("Ink", "ink-2",      "#44423E", "ink core of the two-line disclaimer, screen 07"),
 ("Ink", "ink-3",      "#767470", "ink core of the six action icons, y 586..602"),
 ("Ink", "ink-4",      "#ABAAA6", "ink core of &ldquo;Normal&rdquo; on the Choose style row"),
 ("Ink", "ink-inv",    "#FFFFFF", "ink core of the arrow on the send button"),
 ("Ink", "placeholder","#73736E", "ink core of &ldquo;Reply to Claude&rdquo;, darkest 20%: a placeholder has no dark core"),

 ("Accent", "accent",  "#D97757", "flat census, star mark and new-chat bubble; mean over all 15 after the P3 fix"),
 ("Accent", "send",    "#CB6442", "flat census, send button core on 01/08/13 -- a second, darker orange"),
 ("Accent", "switch",  "#2C83DA", "flat census, the Web search switch, screen 12"),

 ("Voice", "v-blue-1",   "#B6C9DE", "scan of the p04 gradient at y 720"),
 ("Voice", "v-blue-2",   "#ACC3DD", "scan of the p04 gradient at y 840"),
 ("Voice", "v-warm-1",   "#E9AD98", "scan of the p05 gradient at y 720"),
 ("Voice", "v-warm-2",   "#EAA087", "scan of the p05 gradient at y 840"),
 ("Voice", "v-deep-1",   "#C0C9D8", "scan of the p06 gradient at y 720"),
 ("Voice", "v-deep-2",   "#B8C2D5", "scan of the p06 gradient at y 840"),
 ("Voice", "voice-ink",  "#76797C", "ink core of the caption on 04 and 06; 05 reads #86786F over its warm ground"),

 ("Radius", "r-comp",   "24px",  "corner arc off the 3x capture; the material is within 2 levels of the page, so no solve"),
 ("Radius", "r-bubble", "13px",  "circular fit to 9 edge samples down the bubble corner, rmse 0.66"),
 ("Radius", "r-card",   "14px",  "circular fit, artifact card and attachment tile, both 13.75"),
 ("Radius", "r-sheet",  "47px",  "circular fit to 12 samples along the sheet&rsquo;s bottom and left edges"),
 ("Radius", "r-key",    "5px",   "keyboard key corner, 3x capture"),
 ("Radius", "r-pill",   "999px", "by construction, not measured"),
 ("Radius", "r-phone",  "52px",  "circular stand-in for the 55pt continuous display corner"),

 ("Type", "t-nav",    "400 18px/22px var(--x-serif)",    "the model name is serif, not sans: cap 12.7 and ink width 85.6 on &ldquo;Sonnet 4.5&rdquo;, and Georgia at 18px measures 85.0"),
 ("Type", "t-body",   "400 18px/24px var(--x-font)",     "cap 12.7 on bubble text and the composer placeholder"),
 ("Type", "t-cap",    "400 15.5px/20px var(--x-font)",   "cap 11.0 on &ldquo;Ready and listening&rdquo;"),
 ("Type", "t-note",   "400 13px/16.7px var(--x-font)",   "bands pitch 16.7 on the two disclaimer lines"),
 ("Type", "t-key",    "400 22px/43px var(--x-font)",     "key glyph box 11 x 17.3 at (19, 584)"),
 ("Type", "t-serif",  "400 17.8px/25.5px var(--x-serif)","cap 12.3, bands pitch 25.5 over 5 answer screens"),
 ("Type", "t-h1",     "700 29px/36.3px var(--x-serif)",  "cap 20.3 on &ldquo;7-Day Healthy Meal Plan&rdquo;"),
 ("Type", "t-h2",     "700 25px/31px var(--x-serif)",    "cap 17.3 on &ldquo;Day 1&rdquo; and &ldquo;Content Issues&rdquo;"),
 ("Type", "t-hero",   "400 29.3px/36.3px var(--x-serif)","cap 20.3, bands pitch 36.3 on the home headline"),
 ("Type", "t-list",   "700 25.5px/31px var(--x-serif)",  "cap 17.7, bands pitch 31 on the voice transcript"),
 ("Type", "t-time",   "590 17px/22px var(--x-font)",     "iOS status bar clock"),

 ("Metrics", "w",        "393px", "iPhone 15/16 logical width"),
 ("Metrics", "h",        "852px", "iPhone 15/16 logical height"),
 ("Metrics", "status",   "54px",  "iOS status bar, and where the nav band starts"),
 ("Metrics", "nav",      "103px", "nav circles at top 59, 44 tall: 59 + 44 = 103"),
 ("Metrics", "gutter",   "16px",  "scan to the left nav circle, x 16..60"),
 ("Metrics", "pad",      "21.3px","scan to the left edge of every serif answer line"),
 ("Metrics", "comp-w",   "369px", "scan across the composer, x 12..381"),
 ("Metrics", "tap",      "44px",  "bbox of the nav circles, 44 x 44"),
 ("Metrics", "kbd-top",  "545px", "scan down to the keyboard ground on 01, 09 and 14"),
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
# The bezel is this repo's own framing, not a property of the app.
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-bg);color:var(--x-ink);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--x-t-time)}
.sb .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
.sb svg{position:absolute;display:block;fill:currentColor}
"""

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


def statusbar(colour="var(--x-ink)", time="9:41", island=False):
    """island defaults to False: not one of the fifteen captures shows one."""
    return ('<div class="sb" style="color:%s">%s<div class="time">%s</div>%s</div>'
            % (colour, '<div class="island"></div>' if island else "", time, SB_ICONS))


def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print("%-26s %6d B" % (name + ".html", len(html.encode())))


# ---------------------------------------------------------------- the mark ----
# The Anthropic asterisk, measured off the 43.3pt instance on screen 08 by
# sampling the orange-vs-cream boundary around three radii: twelve spokes, all
# reaching the bounding box, at these bearings (degrees clockwise from up) and
# these widths as a fraction of the radius. Not a regular star: the whole point
# of the mark is that the spokes are uneven, so they are transcribed, not
# generated from 360/12.
SPOKES = [(11, .188), (43, .251), (81, .188), (103, .163), (130, .138),
          (149, .201), (182, .151), (211, .163), (236, .176), (271, .126),
          (305, .226), (334, .251)]


def star(size, colour="var(--x-accent)", cls=""):
    lines = []
    for deg, wfrac in SPOKES:
        sw = wfrac * 50                       # viewBox units: R = 50
        r = 50 - sw / 2                       # round cap reaches the box edge
        t = math.radians(deg)
        lines.append('<path d="M50 50L%.2f %.2f" stroke-width="%.2f"/>'
                     % (50 + r * math.sin(t), 50 - r * math.cos(t), sw))
    return ('<svg class="%s" width="%s" height="%s" viewBox="0 0 100 100" fill="none"'
            ' stroke="%s" stroke-linecap="round">%s</svg>'
            % (cls, size, size, colour, "".join(lines)))


# ------------------------------------------------------------------ icons ----
# Everything else is a 24-unit stroke glyph unless it says fill. Sizes come
# from the ink boxes measured on the captures, so each call states its own.
def ico(name, size, colour="currentColor", sw=1.8, style=""):
    return ('<svg width="%s" height="%s" viewBox="0 0 24 24" fill="none" stroke="%s"'
            ' stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"'
            ' style="display:block;%s"><path d="%s"/></svg>'
            % (size, size, colour, sw, style, _ICONS[name]))


def fico(path, size, colour, style=""):
    """A filled glyph: the send arrow, the stop square, the new-chat bubble."""
    return ('<svg width="%s" height="%s" viewBox="0 0 24 24" fill="%s"'
            ' style="display:block;%s"><path d="%s"/></svg>'
            % (size, size, colour, style, path))


def ghost(size, colour):
    """Outline body, two solid eyes: two stroke widths, so two paths."""
    return ('<svg width="%s" height="%s" viewBox="0 0 24 24" fill="none" stroke="%s"'
            ' stroke-linecap="round" stroke-linejoin="round" style="display:block">'
            '<path stroke-width="1.75" d="%s"/>'
            '<path stroke-width="2.4" d="M9.5 10.9v.01M14.5 10.9v.01"/></svg>'
            % (size, size, colour, _ICONS["ghost"]))


_ICONS = {
 # nav
 "ghost": "M12 2.6c-4.6 0-8 3.5-8 8.2v9.4c0 .8.9 1.2 1.5.6l1.5-1.5c.4-.4 1-.4 1.4 0"
          "l1.1 1.1c.4.4 1 .4 1.4 0l1.1-1.1c.4-.4 1-.4 1.4 0l1.1 1.1c.4.4 1 .4 1.4 0"
          "l1.1-1.1c.4-.4 1-.4 1.4 0l1.1 1.1c.6.6 1.5.2 1.5-.6v-9.4c0-4.7-3.4-8.2-8-8.2Z",
 "chev-down": "M7 10l5 5 5-5",
 "chev-right": "M9.5 5.5 16 12l-6.5 6.5",
 "sliders": "M3 6h18M3 12h18M3 18h18M15.5 3.4v5.2M9 9.4v5.2M6.2 15.4v5.2",
 "plus": "M12 4.5v15M4.5 12h15",
 "close": "M6 6l12 12M18 6L6 18",
 "mic-off": "M15.1 4.9A3.1 3.1 0 0 0 8.9 6.3v3.4M8.9 12.4a3.1 3.1 0 0 0 5.6 1.5"
            "M5 11.2a7 7 0 0 0 10.9 5.8M19 11.2v.6a7 7 0 0 1-.4 2.2M12 18.4V21M3.4 2.6l17.2 18.8",
 "mic": "M12 3.2a3.1 3.1 0 0 0-3.1 3.1v5.4a3.1 3.1 0 0 0 6.2 0V6.3A3.1 3.1 0 0 0 12 3.2Z"
        "M5 11.2a7 7 0 0 0 14 0M12 18.4V21",
 "arrow-up": "M12 20V5M5.2 11.8 12 5l6.8 6.8",
 "arrow-down": "M12 4v15M5.2 12.2 12 19l6.8-6.8",
 "wave": "M4 10.5v3M8.6 6.5v11M13.4 4.5v15M18 9v6M22 11v2M1 11v2",
 # artifact card + action bar
 "clipboard": "M9 4.2h6M8.2 4.2h7.6a2 2 0 0 1 2 2v13.6a2 2 0 0 1-2 2H8.2a2 2 0 0 1-2-2V6.2"
              "a2 2 0 0 1 2-2ZM9.4 2.4h5.2a1.2 1.2 0 0 1 1.2 1.2v1.6H8.2V3.6a1.2 1.2 0 0 1 1.2-1.2Z"
              "M9.6 11.6h4.8M9.6 15.4h4.8",
 "copy": "M8.6 2.8h9.6a2.6 2.6 0 0 1 2.6 2.6v9.6M5.4 7.6h9.8a2.4 2.4 0 0 1 2.4 2.4v9.8"
         "a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 19.8V10a2.4 2.4 0 0 1 2.4-2.4Z",
 "share": "M12 15.4V2.8M7.4 7.4 12 2.8l4.6 4.6M4.6 13.6v5.8a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-5.8",
 "play": "M7.6 4.4 19 12 7.6 19.6V4.4Z",
 "thumb-up": "M7.4 21.4V10.6M3.4 10.6h4v10.8h-4a1 1 0 0 1-1-1v-8.8a1 1 0 0 1 1-1Z"
             "M7.4 10.6 12.4 2.6c1.6 0 2.6 1.3 2.3 2.8l-.7 3.4h4.8c1.6 0 2.7 1.4 2.3 2.9"
             "l-1.9 7.6a2.4 2.4 0 0 1-2.3 1.8H7.4",
 "thumb-down": "M16.6 2.6v10.8M20.6 13.4h-4V2.6h4a1 1 0 0 1 1 1v8.8a1 1 0 0 1-1 1Z"
               "M16.6 13.4 11.6 21.4c-1.6 0-2.6-1.3-2.3-2.8l.7-3.4H5.2c-1.6 0-2.7-1.4-2.3-2.9"
               "l1.9-7.6A2.4 2.4 0 0 1 7.1 2.6h9.5",
 "retry": "M20.4 12a8.4 8.4 0 1 1-2.6-6.1M20.4 3.6v5.2h-5.2",
 # sheet
 "camera": "M4.4 7.6h2.9l1.5-2.4h6.4l1.5 2.4h2.9a2 2 0 0 1 2 2v8.6a2 2 0 0 1-2 2H4.4"
           "a2 2 0 0 1-2-2V9.6a2 2 0 0 1 2-2ZM12 17.6a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
 "image": "M4.4 3.4h15.2a2 2 0 0 1 2 2v13.2a2 2 0 0 1-2 2H4.4a2 2 0 0 1-2-2V5.4a2 2 0 0 1 2-2Z"
          "M8.4 10a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM2.4 16.6l5.2-4.6 6 5.2 3-2.6 4.8 4.2",
 "file-up": "M14 2.6H7a2 2 0 0 0-2 2v14.8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.6l-5-5Z"
            "M14 2.6v5h5M12 17.4V10M9 13 12 10l3 3",
 "globe": "M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2ZM2.6 12h18.8"
          "M12 2.4c2.5 2.6 3.8 6 3.8 9.6S14.5 19 12 21.6C9.5 19 8.2 15.6 8.2 12S9.5 5 12 2.4Z",
 "feather": "M20.6 3.4c-9 0-14 4.6-14 11.2 0 1.7.4 3.2 1.1 4.4M20.6 3.4 4.2 20.6"
            "M20.6 3.4c0 6.6-3.6 9.8-9.4 10.4M8.6 15.4h4.2M11 11.2h3.6",
 # keyboard
 "shift": "M12 3.4 3.6 12.2h4.6v6.2h7.6v-6.2h4.6L12 3.4Z",
 "backspace": "M9 4.6h11a2 2 0 0 1 2 2v10.8a2 2 0 0 1-2 2H9L1.6 12 9 4.6Z"
              "M17.4 8.6 12 14M12 8.6l5.4 5.4",
 "return": "M20.4 4.6v6.8a2.6 2.6 0 0 1-2.6 2.6H4.4M9.4 8.6 4 14.2l5.4 5.4",
 "smiley": "M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8ZM7.4 13.6a5.4 5.4 0 0 0 9.2 0H7.4Z"
           "M9.2 9.4v.02M14.8 9.4v.02",
}


# ------------------------------------------------------ placing type by ink ----
# Every text position on the captures was measured as an *ink* top: the first
# row of pixels the capital letters occupy. CSS positions a line box. These
# two differ by the half-leading plus the gap between the font's ascent and
# its cap height, which is a constant fraction of the size:
#
#   offset = (line-height - font-size) / 2 + K * font-size
#
# K = ascent - cap over the em, 0.2708 for SF Pro and 0.2240 for Georgia. Both
# faces measure ascent + descent = 1.000 em, which is what collapses the
# half-leading to (lh - fs) / 2. Derived in Phase 1 and confirmed on five
# measured line pitches.
def ct(ink, fs, lh, serif=False):
    """The CSS top that puts the cap top of fs/lh text at y = ink."""
    return round(ink - ((lh - fs) / 2 + (.2240 if serif else .2708) * fs), 2)


# ----------------------------------------------------------- chrome CSS ----
# Everything positioned absolutely is positioned at the pt it occupies on the
# capture. Where a number looks arbitrary it is measured; where it looks round
# it is measured too.
APP_CSS = """/* nav: two 44pt circles at top 59, the model name centred, its chevron beside it */
.nav{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-nav);z-index:5}
.nbtn{position:absolute;top:59px;width:var(--x-tap);height:var(--x-tap);border-radius:22px;
  background:var(--x-raised);display:flex;align-items:center;justify-content:center}
.nbtn.l{left:var(--x-gutter)}
.nbtn.r{left:333px}
.ntitle{position:absolute;left:0;top:68.13px;width:var(--x-w);text-align:center;
  font:var(--x-t-nav)}
.nchev{position:absolute;left:241.1px;top:66.7px}
.nslid{position:absolute;left:348.3px;top:68px}
/* the menu mark: three 1.7pt lines on a 5.15 pitch, 16 / 16 / 7.4 long */
.menu{position:absolute;left:14px;top:16px;width:16px;height:12px}
.menu i{position:absolute;left:0;height:1.7px;border-radius:1px;background:currentColor}

/* home: the mark, then the two-line greeting. Both sit on the midpoint of the
   space between the nav and the composer, plus 4pt, which is one formula
   across all five home screens: star_top = (103 + comp_top) / 2 - 61.35. */
.hero{position:absolute;left:0;width:var(--x-w);text-align:center;z-index:1}
.hero svg{margin:0 auto}
.hero .hl{margin-top:12.34px;font:var(--x-t-hero)}

/* composer: 369 wide at left 12, bottom-anchored. A blur material with a soft
   shadow above and below it. Text ink lands 76.7 above the card's bottom edge
   and the 36pt button row 7 above it, on every one of the fifteen. */
.comp{position:absolute;left:12px;width:var(--x-comp-w);border-radius:var(--x-r-comp);
  background:var(--x-card);z-index:4;
  box-shadow:0 -8px 22px rgba(66,52,36,.055),0 12px 26px rgba(66,52,36,.075)}
.comp .txt{position:absolute;left:14px;right:14px;bottom:60.6px;height:24px;
  font:var(--x-t-body);white-space:nowrap;overflow:hidden}
.comp .caret{display:inline-block;width:1.7px;height:21px;background:var(--x-ink);
  vertical-align:-4.5px;margin-left:1px}
.comp .btns{position:absolute;left:8px;right:8px;bottom:7px;height:36px}
.cbtn{position:absolute;top:0;width:36px;height:36px;border-radius:18px;
  display:flex;align-items:center;justify-content:center}
.cbtn.plus{left:0}
.cbtn.mic{left:271.2px}
.cbtn.act{left:317px}
.stop{width:14px;height:14px;border-radius:3px;background:#fff}
/* the attachment: 80pt square, 8.3 in from the card's left, 6.3 down from its top */
.att{position:absolute;left:8.3px;top:6.3px;width:80px;height:80px}
.att .in{width:80px;height:80px;border-radius:var(--x-r-card);overflow:hidden;
  background:var(--x-white)}
.att img,.doc img{width:100%;height:100%;display:block;object-fit:cover}
.attx{position:absolute;left:48px;top:5.7px;width:26px;height:26px;border-radius:13px;
  background:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 1px 4px rgba(66,52,36,.16)}
/* the attached-file card: 96 in the sent bubble, scaled to 80 on the composer */
.doc{width:96px;height:96px;padding:4.2px 9.7px 9px;display:flex;flex-direction:column;
  justify-content:space-between;background:var(--x-white);
  border-radius:var(--x-r-card);overflow:hidden}
.doc b{font:500 12.3px/16.7px var(--x-font);color:var(--x-ink)}
.doc i{align-self:flex-start;font:600 11px/17px var(--x-font);font-style:normal;
  color:var(--x-ink-2);border:.7px solid var(--x-border);border-radius:6px;padding:0 5.5px}
.att .doc{transform:scale(.8333);transform-origin:0 0}

/* conversation */
.chat{position:absolute;left:0;width:var(--x-w);z-index:1}
.bub{margin:0 16px 0 auto;width:max-content;max-width:316px;background:var(--x-fill);
  border-radius:var(--x-r-bubble);height:49px;padding:11.13px 16px 0;
  font:var(--x-t-body)}
.sent{margin:0 16px 8px auto;width:96px;height:96px}

/* the answer. Serif, 17.8/25.5, left edge 21.3, every wrap forced with <br> so
   a substituted face cannot re-break a line the capture broke elsewhere. */
.ans{position:absolute;left:var(--x-pad);width:358px;font:var(--x-t-serif);z-index:1}
.ans h1{font:var(--x-t-h1);letter-spacing:-.045em}
.ans h2{font:var(--x-t-h2);letter-spacing:-.045em}
.ans>*+*{margin-top:8.4px}
.ans>p+h2,.ans>ul+h2,.ans>ol+h2{margin-top:5.7px}
.ans>h1+p,.ans>h2+p,.ans>h2+ol,.ans>h2+ul{margin-top:10.3px}
.ans>h1+h2{margin-top:8.25px}
.ans ol,.ans ul{list-style:none}
.ans li{position:relative}
.ans li+li{margin-top:8.2px}
.ans ol li{padding-left:29.3px}
.ans ul li{padding-left:39.7px}
.ans .m{position:absolute;left:0;width:22px;text-align:right}
.ans ul .m{left:22px;width:8px;text-align:center}

/* the thinking mark: the same asterisk at 25.3, one line under the bubble */
.tstar{position:absolute;left:20px;z-index:1}
/* below the composer the answer keeps scrolling under a vibrancy veil:
   ink #0D0B09 reads #C6C4C2 and the ground #FCFAF6 reads #F6F4F2, which
   solves to rgba(245,243,240,.80) over both. */
.tail{position:absolute;left:0;bottom:0;width:var(--x-w);height:35px;
  background:rgba(245,243,240,.8);z-index:2}

/* the scroll-to-latest chip: 36 across, centred, 50 above the composer */
.chip{position:absolute;left:178.5px;top:668px;width:36px;height:36px;border-radius:18px;
  background:#FEFDFB;display:flex;align-items:center;justify-content:center;z-index:3;
  box-shadow:0 2px 12px rgba(66,52,36,.11)}"""

ART_CSS = """/* the artifact card, screen 07: an outline, no fill */
.acard{position:absolute;left:15.7px;top:271.7px;width:362px;height:298.6px;
  border:.67px solid var(--x-border);border-radius:var(--x-r-card);z-index:1}
/* not --x-t-h2: the card's own heading measures 111.3 wide against the
   answer h2's 159.7, i.e. 25 x 0.696, on a 25.4 line */
.acard h2{position:absolute;left:13.6px;top:10.7px;font:700 17.4px/25.4px var(--x-serif);
  letter-spacing:-.045em}
.acard .clip{position:absolute;left:334px;top:26px}
.acard hr{position:absolute;left:0;right:0;top:72px;border:0;
  border-top:.33px solid var(--x-hairline)}
.acard .rows{position:absolute;left:13.6px;top:86.16px;font:var(--x-t-serif)}
.acard .rows div{height:42.7px}
.acts{position:absolute;left:18.4px;top:584.4px;display:flex;gap:12.8px;color:var(--x-ink-3);z-index:1}
.disc{position:absolute;right:16.7px;top:623.93px;text-align:right;
  font:var(--x-t-note);color:var(--x-ink-2);z-index:1}
.dstar{position:absolute;left:16.7px;top:628.7px;z-index:1}"""

VOICE_CSS = """/* voice mode: a full-bleed gradient, a caption, and the 287 x 88 capsule */
.vgrad{position:absolute;inset:0;z-index:0}
.veil{position:absolute;left:0;right:0;top:545px;bottom:0;
  -webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,0) 0,#000 100px);
          mask-image:linear-gradient(180deg,rgba(0,0,0,0) 0,#000 100px)}
.vcap{position:absolute;left:0;top:638.25px;width:var(--x-w);text-align:center;
  font:var(--x-t-cap);color:var(--x-voice-ink);z-index:2}
.pill{position:absolute;left:53px;top:692.15px;width:287.5px;height:88px;border-radius:44px;z-index:2}
.pill>div{position:absolute;top:6.1px;width:75.7px;height:75.7px;border-radius:37.85px;
  display:flex;align-items:center;justify-content:center}
.pill .a{left:6.05px;background:#FEFEFE}
.pill .b{left:106px;background:#151314}
.pill .c{left:206px;background:#FEFEFE}
/* the middle glyph is an outline square on 05, a filled arrow elsewhere */
.stopo{width:14.7px;height:14.4px;border-radius:3.4px;border:1.8px solid #fff}
.vlist{position:absolute;left:25.3px;top:118.84px;width:352px;
  font:var(--x-t-list);z-index:2}
.vlist div+div{margin-top:24px}"""

KBD_CSS = """/* keyboard: rows at 569 / 623 / 677 / 731, keys 32 x 43 on a 38.18 pitch */
.kbd{position:absolute;left:0;top:var(--x-kbd-top);width:var(--x-w);height:307px;
  background:var(--x-kbd);z-index:5}
.key{position:absolute;height:43px;background:var(--x-white);border-radius:var(--x-r-key);
  display:flex;align-items:center;justify-content:center;font:var(--x-t-key);
  box-shadow:0 1px 0 rgba(66,52,36,.22)}
.key.s{font:400 15.5px/43px var(--x-font)}
.emo{position:absolute;left:29px;top:253.3px;color:#080809}"""

SHEET_CSS = """/* the Add to Chat sheet, screen 12 */
.scrim{position:absolute;inset:0;background:var(--x-scrim);z-index:7}
.sheet{position:absolute;left:8px;top:403.7px;width:377px;height:440.3px;
  background:var(--x-bg);border-radius:var(--x-r-sheet);z-index:8;color:var(--x-ink)}
.grab{position:absolute;left:171.3px;top:4.6px;width:34.3px;height:5px;border-radius:2.5px;
  background:#BFBFBB}
.sx{position:absolute;left:15.5px;top:15.3px;width:42px;height:42px;border-radius:21px;
  background:var(--x-raised);display:flex;align-items:center;justify-content:center}
.stitle{position:absolute;left:0;top:23.43px;width:377px;text-align:center;
  font:600 18px/22px var(--x-font)}
.tiles{position:absolute;left:15.3px;top:67px;display:flex;gap:11.7px}
.tile{width:107.5px;height:88.3px;border-radius:var(--x-r-card);background:var(--x-fill);
  position:relative}
.tile svg{position:absolute;left:50%;top:20px;transform:translateX(-50%)}
.tile span{position:absolute;left:0;top:47.2px;width:107.5px;text-align:center;
  font:400 17px/20px var(--x-font)}
.srow{position:absolute;left:15.3px;width:349px;height:64px;display:flex;
  align-items:center;gap:16.3px;font:400 18px/22px var(--x-font)}
.srow hr{position:absolute;left:0;right:0;top:0;border:0;
  border-top:.67px solid var(--x-hairline)}
.srow .v{margin-left:auto;color:var(--x-ink-4)}
.sw{width:60.3px;height:27.5px;border-radius:13.75px;background:var(--x-switch);
  position:relative;margin-left:auto}
.sw i{position:absolute;left:23px;top:3px;width:34.5px;height:21.5px;border-radius:10.75px;
  background:#fff}"""


# --------------------------------------------------------------- builders ----
def nav(right="ghost"):
    """Left menu, centred model name, one of three right controls. Voice mode
    is the exception: it drops the circles and the title and keeps a bare
    sliders glyph at (348.3, 68)."""
    if right == "sliders":
        return '<div class="nav"><div class="nslid">%s</div></div>' % ico("sliders", 24, sw=1.7)
    inner = {"ghost": ghost(21.6, "var(--x-ink)"),
             "new": newchat(24.5)}[right]
    return ('<div class="nav">'
            '<div class="nbtn l"><div class="menu"><i style="top:0;width:16px"></i>'
            '<i style="top:5.15px;width:16px"></i><i style="top:10.3px;width:7.4px"></i>'
            '</div></div>'
            '<div class="ntitle">Sonnet 4.5</div>'
            '<div class="nchev">%s</div>'
            '<div class="nbtn r">%s</div></div>'
            % (ico("chev-down", 27.1, sw=1.9), inner))


def newchat(size):
    """The new-chat control: a filled brand-orange bubble with a white plus."""
    return ('<svg width="%s" height="%s" viewBox="0 0 24 24" style="display:block">'
            '<path fill="var(--x-accent)" d="M12 2.2c5.4 0 9.8 3.7 9.8 8.4 0 4.6-4.4 8.4-9.8 8.4'
            'q-1.3 0-2.5-.3l-4.4 2.4a.75.75 0 0 1-1.1-.85l.85-3.2C3 15.5 2.2 13.4 2.2 10.6'
            ' 2.2 5.9 6.6 2.2 12 2.2Z"/>'
            '<path stroke="#fff" stroke-width="2" stroke-linecap="round"'
            ' d="M12 7.4v6.4M8.8 10.6h6.4"/></svg>' % (size, size))


def hero(comp_top):
    """star_top = (103 + comp_top) / 2 - 61.35, on all five home screens."""
    top = (103 + comp_top) / 2 - 61.35
    return ('<div class="hero" style="top:%.2fpx">%s'
            '<div class="hl">How can I help you this<br>late night?</div></div>'
            % (top, star(43.3)))


WAVE = [3.4, 9.4, 20.0, 9.4, 13.4, 3.4]      # bar extents, capture-measured


def wave(size=36):
    """The voice button's 6 white bars: pitch 3.74, width 1.5, all centred on
    the button's own centre line."""
    d = "".join("M%.2f %.2fV%.2f" % (9.05 + i * 3.74, 18 - (e - 1.5) / 2, 18 + (e - 1.5) / 2)
                for i, e in enumerate(WAVE))
    return ('<svg width="%s" height="%s" viewBox="0 0 36 36" stroke="#fff" stroke-width="1.5"'
            ' stroke-linecap="round" style="display:block"><path d="%s"/></svg>' % (size, size, d))


ACTIONS = {
 "send":  ('background:var(--x-send)', lambda: ico("arrow-up", 21, "var(--x-ink-inv)", sw=2.1)),
 "stop":  ('background:var(--x-fill)', lambda: '<div class="stop" style="background:#141414"></div>'),
 "voice": ('background:#141414', wave),
}

# (attachment?, keyboard?) -> the composer's measured height
COMP_H = {(False, False): 99, (False, True): 101, (True, False): 179, (True, True): 180.3}


def composer(text=None, ph=None, mic=True, act="send", att=None, kb=False):
    """369 x H at left 12, anchored 35 above the home indicator, or 320 when a
    keyboard is up. `att` is "doc" or "photo"; both carry the close badge."""
    if att:
        inner = ('<div class="doc"><b>Motivation<br>letter</b><i>PDF</i></div>' if att == "doc"
                 else '<div class="in"><img src="%s" alt="attached photo"></div>' % A["photo"])
        att_html = ('<div class="att">%s<div class="attx">%s</div></div>'
                    % (inner, ico("close", 14.5, "#12100F", sw=2.1)))
    else:
        att_html = ""
    txt = (('<span>%s</span><span class="caret"></span>' % text) if text is not None
           else '<span style="color:var(--x-placeholder)">%s</span>' % ph)
    bg, glyph = ACTIONS[act]
    return ('<div class="comp" style="bottom:%spx;height:%spx">%s'
            '<div class="txt">%s</div>'
            '<div class="btns"><div class="cbtn plus">%s</div>%s'
            '<div class="cbtn act" style="%s">%s</div></div></div>'
            % (320 if kb else 35, COMP_H[(bool(att), kb)], att_html, txt,
               ico("plus", 18, "var(--x-ink)", sw=1.9),
               '<div class="cbtn mic">%s</div>' % ico("mic", 20, "var(--x-ink)", sw=1.7) if mic else "",
               bg, glyph()))


# ---------------------------------------------------------------- keyboard ----
KEY_W, PITCH = 32, 38.18
# (glyphs, x0, key width, pitch) per row. The letter rows are the 32 x 38.18
# grid; the symbol layout's punctuation row is not, it runs five 47.5-wide keys
# on a 53.6 pitch, measured off screen 14 white-key runs.
KROWS = [("qwertyuiop", 8.7, KEY_W, PITCH), ("asdfghjkl", 27.7, KEY_W, PITCH),
         ("zxcvbnm", 65.7, KEY_W, PITCH)]
NROWS = [("1234567890", 8.7, KEY_W, PITCH), ("-/:;()$&@\u201d", 8.7, KEY_W, PITCH),
         (".,?!\u2019", 65.7, 47.5, 53.6)]


def keyboard(numeric=False):
    """545..852. Four key rows plus a bare emoji glyph on a fifth. Screens 01
    and 09 are the lowercase letter layout with shift off; screen 14 is the
    symbol layout, which is what its capture shows even though it is typing
    words."""
    keys = []
    for r, (glyphs, x0, w, pitch) in enumerate(NROWS if numeric else KROWS):
        top = 24 + r * 54
        for i, ch in enumerate(glyphs):
            keys.append('<div class="key" style="left:%.2fpx;top:%dpx;width:%.1fpx">%s</div>'
                        % (x0 + i * pitch, top, w, ch))
    keys += [
     '<div class="key s" style="left:8.7px;top:132px;width:43.3px">%s</div>'
     % ("#+=" if numeric else ico("shift", 21, "#080809", sw=1.6)),
     '<div class="key s" style="left:341.3px;top:132px;width:43.4px">%s</div>' % ico("backspace", 22, "#080809", sw=1.6),
     '<div class="key s" style="left:8.7px;top:186px;width:89.3px">%s</div>' % ("ABC" if numeric else "123"),
     '<div class="key s" style="left:104px;top:186px;width:185.3px"></div>',
     '<div class="key s" style="left:295.3px;top:186px;width:89.4px">%s</div>' % ico("return", 21, "#080809", sw=1.6),
     '<div class="emo">%s</div>' % ico("smiley", 27, "#080809", sw=1.6)]
    return '<div class="kbd">%s</div>' % "".join(keys)


# ------------------------------------------------------------- voice mode ----
# The wash is two components, because one radial cannot fit both: a vertical
# ramp read down the darkest column (x = 110 on all three) and a horizontal
# white veil that lifts both edges off it. The ramp is flat page ground to
# y 555, then measured stops; nothing above 545 is tinted at all, which is what
# the mask on the veil enforces.
VOICE = {                                # (y, hex) down x = 110
 "04": ((555, "#FCFAF6"), (570, "#FBFAF7"), (590, "#F6F6F6"), (610, "#EDEFF3"),
        (630, "#E2E7EF"), (650, "#D8E1EA"), (670, "#CAD8E5"), (685, "#BECDE0"),
        (740, "#ACC1D7"), (810, "#A0B9D8"), (852, "#A4BAD7")),
 "05": ((555, "#FCFAF6"), (570, "#FEF9F6"), (590, "#FCF4EF"), (610, "#F9ECE5"),
        (630, "#F7DFD7"), (650, "#F3D2C6"), (670, "#EEC4B5"), (685, "#E8B6A4"),
        (740, "#E6A48E"), (810, "#E4967B"), (852, "#E7967D")),
 "06": ((555, "#FDFBF9"), (570, "#FCFAF6"), (590, "#F9F8F6"), (610, "#F2F2F2"),
        (630, "#EAEBEF"), (650, "#DFE2E9"), (670, "#D4D9E1"), (685, "#C8CDD9"),
        (760, "#B8C2D4"), (810, "#A8B5CC"), (852, "#ABB8CF")),
}
VPILL = {"04": ("#E2E5ED", "var(--x-voice-ink)"),
         "05": ("#F0DDD8", "#86786F"),
         "06": ("#E4E6EC", "var(--x-voice-ink)")}
# The veil: white at this alpha, by x, averaged over the tinted rows of all
# three. Zero at x = 110, which is why that column is the ramp's own axis.
VEIL = ((0, .135), (6, .127), (20, .093), (40, .053), (60, .019), (110, 0),
        (196, .024), (240, .063), (280, .070), (320, .104), (350, .171),
        (375, .241), (393, .295))
VLIST = ["Italian pasta dishes", "Grilled chicken and<br>vegetables", "Stir fry with rice",
         "Tacos or burrito bowls", "Simple salad with protein"]


def voice(key, caption, transcript, mid="arrow"):
    pill, ink = VPILL[key]
    ramp = ",".join(["var(--x-bg) 545px"]
                    + ["%s %spx" % (c, y) for y, c in VOICE[key]])
    veil = ",".join("rgba(255,255,255,%.3f) %.1f%%" % (a, 100.0 * x / 393) for x, a in VEIL)
    glyph = ('<div class="stopo"></div>' if mid == "stop"
             else ico("arrow-up", 18, "#fff", sw=1.8))
    return ('<div class="vgrad" style="background:linear-gradient(180deg,%s)">'
            '<div class="veil" style="background:linear-gradient(90deg,%s)"></div></div>%s'
            '<div class="vcap" style="color:%s">%s</div>'
            '<div class="pill" style="background:%s">'
            '<div class="a">%s</div><div class="b">%s</div>'
            '<div class="c">%s</div></div>'
            % (ramp, veil,
               ('<div class="vlist">%s</div>'
                % "".join("<div>%s</div>" % t for t in VLIST)) if transcript else "",
               ink, caption, pill,
               ico("plus", 18, "#141414", sw=1.8), glyph,
               ico("close", 15, "#141414", sw=1.9)))


# ---------------------------------------------------------- the fifteen ----
# Copy is part of the replica, wraps included: every <br> is where the capture
# broke the line, not where a browser would.
def frame(body, css):
    """(body, css). The frame itself is added once, by the driver."""
    return body, css


def ans(top_ink, *blocks):
    """The answer column, positioned by the ink top of its first line."""
    first = blocks[0]
    fs, lh = ((29, 36.3) if first.startswith("<h1") else
              (25, 31) if first.startswith("<h2") else (17.8, 25.5))
    return ('<div class="ans" style="top:%.2fpx">%s</div>'
            % (ct(top_ink, fs, lh, serif=True), "".join(blocks)))


def bubble(top, text, sent=None):
    """The user turn: an optional 96pt attachment card, then the pill."""
    card = ""
    if sent == "doc":
        card = '<div class="sent"><div class="doc"><b>Motivation<br>letter</b><i>PDF</i></div></div>'
    elif sent == "photo":
        card = ('<div class="sent"><div class="doc" style="padding:0">'
                '<img src="%s" alt="a mountain at sunrise"></div></div>' % A["photo"])
    return ('<div class="chat" style="top:%spx">%s<div class="bub">%s</div></div>'
            % (top, card, text))


def tstar(top):
    """The asterisk Claude shows while it thinks: 25.3, left 20, one line
    under the user's bubble."""
    return '<div class="tstar" style="top:%spx">%s</div>' % (top, star(25.3))


MEAL = "Give me a 7-day healthy meal plan"
CHIP = '<div class="chip">%s</div>' % ico("arrow-down", 22.3, "var(--x-ink)", sw=1.9)


def s01():
    return frame(nav() + hero(431)
                 + composer(text=MEAL, kb=True) + keyboard(), APP_CSS + "\n" + KBD_CSS)


def s02():
    return frame(nav("new") + bubble(123, MEAL) + tstar(209)
                 + composer(ph="Reply to Claude", mic=False, act="stop"), APP_CSS)


def s03():
    return frame(nav("new") + bubble(123, MEAL) + ans(192.7,
      "<h1>7-Day Healthy Meal Plan</h1>",
      "<h2>Day 1</h2>",
      "<p><b>Breakfast:</b> Greek yogurt with mixed<br>berries, honey, and granola"
      "<b>Lunch:</b> Grilled<br>chicken salad with mixed greens, cherry<br>tomatoes, "
      "cucumber, olive oil and lemon<br>dressing<b>Dinner:</b> Baked salmon with roasted"
      "<br>sweet potato and steamed broccoli<b>Snacks:</b><br>Apple slices with almond "
      "butter, handful of<br>mixed nuts</p>",
      "<h2>Day 2</h2>",
      "<p><b>Breakfast:</b> Oatmeal with sliced banana,<br>cinnamon, and walnuts"
      "<b>Lunch:</b> Turkey and<br>avocado whole wheat wrap with a side of<br>carrot sticks"
      "<b>Dinner:</b> Stir-fried tofu with<br>mixed vegetables (bell peppers, snap peas,"
      "<br>carrots) over brown rice<b>Snacks:</b> Hummus<br>with bell pepper strips and "
      "string cheese</p>",
      "<h2>Day 3</h2>",
      # Only this paragraph's fourth line is on screen, below the composer and
      # under the veil; the composer covers lines 1-3, so their wraps are the
      # measured line count, not a transcription.
      "<p><b>Breakfast:</b> Scrambled eggs with spinach<br>and whole grain toast"
      "<b>Lunch:</b> Quinoa bowl<br>with chickpeas, roasted vegetables and<br>"
      "tahini dressing<b>Dinner:</b> Grilled chicken<br>with wild rice and green beans</p>")
      + CHIP + composer(ph="Reply to Claude", mic=False, act="stop")
      + '<div class="tail"></div>', APP_CSS)


def s04():
    return frame(nav("sliders") + voice("04", "Ready and listening", False),
                 APP_CSS + "\n" + VOICE_CSS)


def s05():
    return frame(nav("sliders") + voice("05", "Tap anywhere to interrupt", True, mid="stop"),
                 APP_CSS + "\n" + VOICE_CSS)


def s06():
    return frame(nav("sliders") + voice("06", "Ready and listening", True),
                 APP_CSS + "\n" + VOICE_CSS)


def s07():
    rows = "".join("<div>%s</div>" % t for t in
                   ["Italian pasta dishes", "Grilled chicken and vegetables",
                    "Stir fry with rice", "Tacos or burrito bowls",
                    "Simple salad with protein"])
    acts = "".join(ico(n, 19.2, sw=1.7) for n in
                   ("copy", "share", "play", "thumb-up", "thumb-down", "retry"))
    return frame(nav("new") + bubble(122.7, "Give me dinner plan.")
                 + ans(194.3, "<p>I&rsquo;ll help you plan dinner! What type of<br>"
                              "cuisine are you in the mood for, and how<br>"
                              "many people are you cooking for?</p>")
                 + '<div class="acard"><h2>Quick Dinner<br>Ideas</h2>'
                   '<div class="clip">%s</div><hr><div class="rows">%s</div></div>'
                   % (ico("clipboard", 20, "var(--x-ink)", sw=1.5), rows)
                 + '<div class="acts">%s</div>' % acts
                 + '<div class="dstar">%s</div>' % star(23.3)
                 + '<div class="disc">Claude can make mistakes.<br>'
                   'Please double check responses.</div>'
                 + composer(ph="Reply to Claude", act="voice"),
                 APP_CSS + "\n" + ART_CSS)


def s08():
    return frame(nav() + hero(638) + composer(ph="Chat with Claude", att="doc"), APP_CSS)


def s09():
    return frame(nav() + hero(351.7)
                 + composer(text="Any suggestion?", att="doc", kb=True) + keyboard(),
                 APP_CSS + "\n" + KBD_CSS)


def s10():
    return frame(nav("new") + bubble(123, "Any suggestion?", sent="doc") + tstar(313.7)
                 + composer(ph="Reply to Claude", mic=False, act="stop"), APP_CSS)


def s11():
    return frame(nav("new") + bubble(123, "Any suggestion?", sent="doc")
                 + ans(298.3,
      "<p>I can see this is a motivation letter template,<br>but it&rsquo;s currently "
      "filled with &ldquo;Lorem ipsum&rdquo;<br>placeholder text instead of actual "
      "content.<br>Here are my suggestions to make it<br>effective:</p>",
      "<h2>Content Issues</h2>",
      '<ol><li><span class="m">1.</span><b>Replace all placeholder text</b> - The<br>'
      "entire body is Latin filler text that<br>needs to be replaced with genuine<br>"
      "content about:</li></ol>",
      '<ul><li><span class="m">&bull;</span>Why you&rsquo;re interested in this specific<br>'
      'position/opportunity</li>'
      '<li><span class="m">&bull;</span>What relevant experience and skills<br>'
      "you bring</li>"
      '<li><span class="m">&bull;</span>How your goals align with the</li></ul>')
      # The two lines that clear the composer are their own block, placed on
      # their own measured ink top: what the composer hides between them and
      # the bullet above is not on screen and so is not transcribable.
      + ans(823.7, '<p style="padding-left:39.7px">Reader&rdquo; but the name is '
                   "&ldquo;Ronny<br>Reader&rdquo; (typically a male name)</p>")
      + CHIP + composer(ph="Reply to Claude", act="voice")
      + '<div class="tail"></div>', APP_CSS)


def s12():
    tiles = "".join('<div class="tile">%s<span>%s</span></div>' % (ico(i, 22, sw=1.7), lbl)
                    for i, lbl in (("camera", "Camera"), ("image", "Photos"),
                                   ("file-up", "Files")))
    return frame(nav() + hero(718) + composer(ph="Chat with Claude", mic=False)
                 + '<div class="scrim"></div>'
                 + '<div class="sheet"><div class="grab"></div>'
                   '<div class="sx">%s</div><div class="stitle">Add to Chat</div>'
                   '<div class="tiles">%s</div>'
                   '<div class="srow" style="top:171px"><hr>%s<span>Web search</span>'
                   '<div class="sw"><i></i></div></div>'
                   '<div class="srow" style="top:235px"><hr>%s<span>Choose style</span>'
                   '<span class="v">Normal</span>%s</div></div>'
                   % (ico("close", 16.5, "var(--x-ink)", sw=1.9), tiles,
                      ico("globe", 22, "var(--x-ink)", sw=1.6),
                      ico("feather", 22, "var(--x-ink)", sw=1.6),
                      ico("chev-right", 17, "var(--x-ink)", sw=1.9)),
                 APP_CSS + "\n" + SHEET_CSS)


def s13():
    return frame(nav() + hero(638)
                 + composer(ph="Chat with Claude", att="photo"), APP_CSS)


def s14():
    return frame(nav() + hero(351.7)
                 + composer(text="Where is this place?", att="photo", kb=True)
                 + keyboard(numeric=True), APP_CSS + "\n" + KBD_CSS)


def s15():
    return frame(nav("new") + bubble(123, "Where is this place?", sent="photo")
                 + ans(298.3,
      "<p>I can see this is a dramatic mountain peak<br>with distinctive vertical rock "
      "faces and<br>beautiful alpenglow lighting (the warm<br>orange-pink light from "
      "sunrise or sunset).<br>The layered limestone or dolomite rock<br>formations with "
      "their characteristic vertical<br>striations are quite striking.</p>",
      "<p>However, I cannot identify the specific<br>location from the image alone. This "
      "type of<br>dramatic mountain architecture could be<br>found in several major "
      "mountain ranges,<br>including:</p>",
      '<ul><li><span class="m">&bull;</span>The Dolomites in Italy</li>'
      '<li><span class="m">&bull;</span>The Alps (various locations)</li>'
      '<li><span class="m">&bull;</span>The Pyrenees</li></ul>')
      + ans(809.2, "<p>you&rsquo;re trying to identify a location you<br>"
                   "visited, I&rsquo;d be happy to help further! The</p>")
      + CHIP + composer(ph="Reply to Claude", act="voice")
      + '<div class="tail"></div>', APP_CSS)


# (file, label, builder, source flow, note)
SCREENS = [
 ("01-home-typed",      "Home, typed",        s01, "asking-claude-01",             "exact"),
 ("02-sent",            "Question sent",      s02, "asking-claude-02",             "exact"),
 ("03-streaming",       "Answer streaming",   s03, "asking-claude-03",             "exact"),
 ("04-voice-listening", "Voice, listening",   s04, "asking-claude-audio-input-01", "exact"),
 ("05-voice-warm",      "Voice, interrupt",   s05, "asking-claude-audio-input-02", "exact"),
 ("06-voice-deep",      "Voice, listening 2", s06, "asking-claude-audio-input-03", "exact"),
 ("07-artifact",        "Artifact card",      s07, "asking-claude-audio-input-04", "exact"),
 ("08-home",            "Home, empty",        s08, "asking-claude-file-input-01",  "exact"),
 ("09-file-typed",      "File attached",      s09, "asking-claude-file-input-02",  "exact"),
 ("10-file-sent",       "File sent",          s10, "asking-claude-file-input-03",  "exact"),
 ("11-file-answer",     "File answer",        s11, "asking-claude-file-input-04",  "exact"),
 ("12-add-sheet",       "Add to Chat",        s12, "asking-claude-image-input-01", "exact"),
 ("13-photo-attached",  "Photo attached",     s13, "asking-claude-image-input-02", "exact"),
 ("14-photo-typed",     "Photo, typed",       s14, "asking-claude-image-input-03", "exact"),
 ("15-photo-answer",    "Photo answer",       s15, "asking-claude-image-input-04", "exact"),
]


# ------------------------------------------ Phase 2 boards: the contract ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 19px/24px var(--x-font);margin-bottom:2px}
header p{font:var(--x-t-note);color:var(--x-ink-3);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-3);margin:10px 0 4px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.sw2 .chip2{height:22px;border-radius:6px;border:1px solid var(--x-border)}
.sw2 b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw2 i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:38px;height:22px;background:var(--x-fill);border:1px solid var(--x-border)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-3);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:1px;border-bottom:1px solid var(--x-hairline)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-3);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2);columns:2;column-gap:18px}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-hairline);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace}
td.t{color:var(--x-accent);white-space:nowrap}
td.v{color:var(--x-ink-2);max-width:126px;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap}
td.e{color:var(--x-ink-3)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw2"><div class="chip2" style="background:var(--x-%s)"></div>'
        '<b>--%s-%s</b><i>%s</i></div>' % (n, P, n, v)
        for g in ("Surface", "Line", "Ink", "Accent", "Voice") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Grumpy wizards</span>'
        '<em>--%s-%s &middot; %s</em></div>' % (n, P, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--%s-%s: %s" % (P, n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>%d tokens, measured off fifteen 3&times; captures. Every one has an '
                'evidence row on the boards beside this. Two faces are stand-ins: the '
                'real Styrene and Tiempos are brand faces.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, len(TOKENS), swatches, radii, type_, met), SHEET)


EV_ROWS = 30


def evidence_boards():
    pages = [TOKENS[i:i + EV_ROWS] for i in range(0, len(TOKENS), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--%s-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (P, n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages))
        yield ("00%s-evidence" % "bcdefgh"[i],
               page(NAME + " - Evidence" + of,
                    '<div class="sheet"><header><h1>Evidence%s</h1>'
                    '<p>One row per token. A token with no evidence is a guess.</p>'
                    '</header><table class="ev">%s</table></div>' % (of, rows), SHEET))


# ------------------------------------------- Phase 5: park the reference ----
REF_CSS = """.rboard{width:430px;height:932px;background:#151311;border-radius:20px;
  padding:14px 20px 12px;color:#fff;position:relative;overflow:hidden}
.rboard h1{font:600 14px/18px var(--x-font);letter-spacing:-.1px}
.rboard p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rboard .shot{margin-top:9px;display:flex;justify-content:center}
.rboard img{height:884px;width:auto;display:block;border-radius:6px}
.rboard .near{color:#F1CD8A}"""

REFS = OUT / "assets" / "refs"


def ref_boards():
    """Each capture with its Mobbin watermark intact, on its own board, so the
    replica can be audited against its source a month from now. Skipped
    entirely when assets/refs/ is absent, which is how a fresh clone builds."""
    if not REFS.is_dir():
        return
    for i, (name, label, _, src, note) in enumerate(SCREENS, 1):
        f = REFS / ("%02d.jpg" % i)
        if not f.exists():
            continue
        uri = "data:image/jpeg;base64," + base64.b64encode(f.read_bytes()).decode()
        cls = "" if note == "exact" else ' class="near"'
        body = ('<div class="rboard"><h1>%s &mdash; reference</h1>'
                '<p>%s &middot; Mobbin, Claude iOS &middot; %s &middot; '
                '1179&times;2676 @3x, shown at 1.5&times; &middot; <span%s>%s</span></p>'
                '<div class="shot"><img src="%s" alt="%s"></div></div>'
                % (label, name, src, cls, note, uri, label))
        yield "ref-" + name, page(NAME + " - reference: " + label, body, REF_CSS)


# ------------------------------------------------------------------- run ----
def boards():
    yield "00-design-tokens", token_board()
    for name, html in evidence_boards():
        yield name, html
    for name, label, fn, _, _ in SCREENS:
        body, css = fn()
        yield name, page(NAME + " - " + label,
                         '<div class="phone">%s%s</div>' % (statusbar(), body),
                         css)
    for name, html in ref_boards():
        yield name, html


def layout(names):
    """Three rows from x = 0 at one pitch, so capture N in row 3 lands
    column-for-column under replica N in row 2."""
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                      + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]},
            {"title": "Screens", "numbered": True,
             "files": [{"file": n, "label": l} for n, l, _, _, _ in SCREENS]}]
    refs = [{"file": "ref-" + n, "label": l}
            for n, l, _, _, _ in SCREENS if "ref-" + n in names]
    if refs:
        rows.append({"title": "Source of truth: Mobbin captures",
                     "numbered": True, "files": refs})
    return {"name": PAGE_NAME, "rows": rows}


def main():
    files = dict(boards())
    for name, html in sorted(files.items()):
        write(name, html)
    lay = layout(files)
    (OUT / "layout.json").write_text(json.dumps(lay, indent=2) + "\n")
    print("%-26s %6d rows, %d boards" % ("layout.json", len(lay["rows"]), len(files)))


if __name__ == "__main__":
    main()
