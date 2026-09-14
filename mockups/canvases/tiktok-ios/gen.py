"""TikTok for iOS: fifteen screens across two runs, on one canvas page.

This file is the bio editor and the post composer, seven screens from two
Mobbin flows: "Adding a bio" is boards 01-03, "Adding a caption" is 04-07.
feed.py is the other run, the eight-screen For You feed, and this file is the
entry point for both -- it builds the one :root they share and writes every
board:

    python3 mockups/canvases/tiktok-ios/gen.py

The two runs keep separate token prefixes, --tk- here and --tf- there, because
they are two different surfaces of the app measured off two different capture
sets: these seven are assets/refs/cp1..cp7 at 3 px/pt, those eight are f1..f8
at 2.2417. That is also why each keeps its own crops and probes file; refkit
batch takes one --pt per run.

Every number in here came off a capture; probes.json is the replay and
README.md the write-up. Interface is redrawn in HTML/CSS/SVG -- only the boxes
in crops.json are cut out of the captures, and board 03's avatar is not one of
them: the capture's is a real person's face, so avatarbuild.py fetches a named
TikTok account's avatar instead.

Two facts about the source that shape the whole board: Mobbin composites the
Dynamic Island out of its captures, so the status bar ships island=False; and
the captures are Dutch-locale, so the space bar reads "spatie".
"""

import base64, json
from pathlib import Path

import feed

OUT = Path(__file__).resolve().parent
ART_DIR = OUT / "assets" / "art"
REFS_DIR = OUT / "assets" / "refs"
CROPS = json.loads((OUT / "crops.json").read_text())

NAME = "TikTok"
# The canvas page name. This folder ships as an example, hence the prefix.
PAGE_NAME = "(example) " + NAME
P = "tk"         # token prefix: --tk-bg, --tk-ink, --tk-t-row
SCALE = 3        # the captures are 1179 x 2556: 393 x 852 pt at 3x

# (group, name, value, evidence). The :root block and the evidence table are
# both generated from this list, so a value cannot drift from the evidence
# behind it. Values are written with the placeholder prefix --x- throughout
# this file and rewritten to P on the way out.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on the capture's 'alexsmith' and 'Bio': SF Pro, the platform face"),

 ("Surface", "bg",       "#FDFBFC",  "flat-fill census, page ground on all seven captures"),
 ("Surface", "chip",     "#F3F0F3",  "chip, action-pill and suggestion-chip fill, 04 x60 y280"),
 ("Surface", "keyboard", "#D1D2D9",  "keyboard ground, 01 x197 y565 and y830"),
 ("Surface", "key",      "#FDFBFC",  "letter keycap fill, 01 x10 y575"),
 ("Surface", "key-alt",  "#AAAFBB",  "modifier keycap fill: shift, backspace, 123, emoji, return"),
 ("Surface", "key-edge", "#898B8D",  "keycap bottom edge, 1.3pt under every cap"),
 ("Surface", "scrim",    "rgba(0,0,0,.195)",
  "05 reads #CCC9CD over #FDFBFC below the divider: (253-204)/253"),
 ("Surface", "bar",      "rgba(0,0,0,.40)",
  "04's Edit cover bar: the cover reads 137 beside it, 82 under"),
 ("Surface", "tile-scrim",
  "linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.42) 60%,rgba(0,0,0,0))",
  "not the capture's: TikTok draws the top label bare, and the stand-in clip is white UI"),

 ("Line", "hairline",    "#D1CECF",  "nav rule, y 102.67, one device pixel on all but 03"),
 ("Line", "divider",     "#8A8788",  "bio field rule, 01/02 y 247.67, x 16 to 377.33"),
 ("Line", "rule",        "#E8E6E7",  "post divider, 04-06 y 319.67 and 07 y 359.67"),
 ("Line", "line",        "#E6E3E4",  "content-tab rule 03 y 443.67; the @ Mention chip outline"),
 ("Line", "tabs",        "#CDCBCC",  "tab-bar hairline, 03 y 769.0"),
 ("Line", "stat",        "#F1EFF0",  "stat divider core, 03 x 150.8 and x 243.0, a 3px ramp"),

 ("Ink", "ink",          "#000000",  "darkest 0.5% of every title and row label"),
 ("Ink", "ink-2",        "#6A6767",  "stat labels #6D6B6C and 07 suggestion text #676467"),
 ("Ink", "ink-3",        "#838083",  "04 More-options subtitle #817E80, 06 #878587, 03 #878487"),
 ("Ink", "ink-4",        "#A8A5A8",  "the 0/80 counter, the palest type; placeholders within 5 levels"),
 ("Ink", "ink-inv",      "#FDFBFC",  "white type on the pink pill and over the cover art"),

 ("Accent", "pink",      "#FD2953",  "Save once filled, the Add pill, the Post pill, the caret"),
 ("Accent", "cyan",      "#1FD6EC",  "the avatar + badge and the left third of the create button"),

 ("Radius", "r-chip",    "4px",      "half-coverage corner solve on the h-28 chips"),
 ("Radius", "r-ctl",     "5px",      "keycap and the @ Mention chip"),
 ("Radius", "r-cover",   "6px",      "04's cover cell and its bar: 4.8pt in, one row off the foot"),
 ("Radius", "r-pill",    "8px",      "profile action pills, h 44"),
 ("Radius", "r-btn",     "9px",      "Drafts and Post, h 44.67; the create button's three rects"),
 ("Radius", "r-card",    "12px",     "the Add-phone-number banner"),
 ("Radius", "r-phone",   "52px",     "circular stand-in for the 55pt continuous display corner"),

 ("Type", "t-time",      "590 17px/22px var(--x-font)", "iOS status bar clock"),
 ("Type", "t-nav",       "700 17px/22px var(--x-font)", "'Bio' 24.67x13.33; the capture's 'alexsmith'; the stat numbers"),
 ("Type", "t-handle",    "600 17px/22px var(--x-font)", "the capture's '@alexsmith58', 113.67 wide"),
 ("Type", "t-body",      "400 15px/20px var(--x-font)", "'Save' 32.67 wide; 'Add a bio' 63.33x11.0"),
 ("Type", "t-cap",       "400 15px/17.67px var(--x-font)",
  "the description field: 'Add description...' 119.3 wide, line pitch 17.67"),
 ("Type", "t-cap-b",     "600 15px/17.67px var(--x-font)",
  "the hashtags inside the caption: '#motion #traffic #car #driving' 214.3"),
 ("Type", "t-row",       "500 16.5px/20px var(--x-font)",
  "'Everyone can view this post' 207.3 x 15.3 with its descender; the rows are not bold"),
 ("Type", "t-btn",       "550 15px/20px var(--x-font)",
  "'Edit profile' 75.0 wide over 3145 ink px; 600 sets 5% more ink than the capture"),
 ("Type", "t-btn-lg",    "550 16px/20px var(--x-font)",
  "the composer buttons run a size above the profile pills: 'Drafts' 44.3x12.3, 'Post' 32.0"),
 ("Type", "t-tag",       "400 15.5px/20px var(--x-font)", "'#motion' 57.0; '#motionlessinwhite' 149.0"),
 ("Type", "t-card",      "700 15px/20px var(--x-font)", "'Add phone number' 138.0x12.7 with the descender"),
 ("Type", "t-bio",       "400 14px/19px var(--x-font)", "the profile bio; 03's 'Drafts: 1' 51.67x10.33 over the tile"),
 ("Type", "t-chip-lg",   "600 14px/19px var(--x-font)", "01 chip 'Mention' 52.33x10.67; the capture's 'Your orders' 75.33"),
 ("Type", "t-meta",      "400 13px/18px var(--x-font)", "stat labels, place chips, post counts, 'Template'"),
 ("Type", "t-chip",      "600 12px/16px var(--x-font)", "04 chips: 'Hashtags' 54.0x11.0, 'Mention' 47.0; 'Preview' 45.33"),
 ("Type", "t-count",     "400 12px/16px var(--x-font)", "'0/80' 24.67 wide, the capture's '19/80' 29.67"),
 ("Type", "t-tab",       "600 9.5px/13px var(--x-font)", "'Home' 27.0, 'Inbox' 25.0, 'Profile' 29.7 wide"),
 ("Type", "t-key",       "320 25px/30px var(--x-font)",
  "keycap letters: 'q' 11.67x17.67, x-height 13.33 = 13.33/0.529; 400 sets 16% more ink"),
 ("Type", "t-keylab",    "400 16px/21px var(--x-font)", "'return' 42.0x11.33 and 'spatie' 42.67x14.67"),
 ("Type", "t-mark",      "400 17.5px/22px var(--x-font)", "the 01 chip's @ mark, 14.0x14.0"),
 ("Type", "t-mark-sm",   "400 15.5px/20px var(--x-font)", "the 04 chips' # and @ marks, 11.7-12.7 wide"),

 ("Metrics", "w",        "393px",    "iPhone 15/16 logical width"),
 ("Metrics", "h",        "852px",    "iPhone 15/16 logical height"),
 ("Metrics", "status",   "54px",     "iOS status bar"),
 ("Metrics", "kb",       "562.33px", "keyboard ground top, 01/02/05/06"),
 ("Metrics", "nav",      "102.67px", "nav rule"),
]


def TS(tok):
    """(font-size, line-height) of a type token, so no call site restates a size."""
    v = next(v for g, n, v, e in TOKENS if n == tok)
    a, b = v.split()[1].split("/")
    return float(a.rstrip("px")), float(b.rstrip("px"))


def _root(*runs):
    """One :root block, byte-identical in every board on the page -- both runs'
    tokens, each under its own prefix. No `}` inside it: refkit tokens reads it
    with a non-greedy regex."""
    out, seen = [":root{"], None
    for prefix, tokens in runs:
        for group, name, value, _ in tokens:
            if (prefix, group) != seen:
                out.append("" if seen else None)
                out.append("  /* %s %s */" % (prefix, group))
                seen = (prefix, group)
            # a composite type token carries var(--x-font) inside its value,
            # and page()'s rewrite is per run, so the block itself has to be
            # final on both sides of the colon
            out.append("  --%s-%s:%s;"
                       % (prefix, name, value.replace("--x-", "--%s-" % prefix)))
    return "\n".join(x for x in out if x is not None) + "\n}"


# Written out with the final prefixes, not the --x- placeholder, since one
# block now holds two of them. page() still rewrites --x- in the rest of each
# file, per run.
TOKENS_CSS = feed.TOKENS_CSS = _root((P, TOKENS), (feed.P, feed.TOKENS))

# ------------------------------------------------------------------ art ----
# The page-coloured notch under the + badge over the avatar. Geometry, so it
# is drawn rather than carried inside any asset.
NOTCH = (218.5, 180.15, 29.7)

# ---------------------------------------------------------- substitutions ----
# The name, the handle, the bio, the row under it and the two content tiles in
# the captures are all one real person's, so the boards carry a stand-in
# account instead -- @snapaction_ai, whose avatar avatarbuild.py fetches and
# whose own clip tilebuild.py cuts the tiles from. BIO is measured to the capture's
# ink box (ref 125.7pt wide, this 125.3 at t-body); the character counter is
# derived from it rather than typed, by the rule the capture's own 19/80 fixes:
# TikTok counts UTF-16 units, so the dancer costs two. This bio comes to 21.
ACCOUNT = "snapaction_ai"
HANDLE = "@" + ACCOUNT
BIO = "snap it, act later \U0001F57A"
COUNT = "%d/80" % (len(BIO.encode("utf-16-le")) // 2)
LINK = "snapaction.ai"


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
        box_ = tuple(round(v * SCALE) for v in (x0, y0, x1, y1))
        src[ref].crop(box_).save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def img(cid, x, y, w, h, extra=""):
    """One <img> at a box of its own. Everything a crop covers goes through
    art(); this is for the two fetched assets, and for the globe, a crop the
    link row reuses below the size it was cut at."""
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx%s">' % (_uri(cid), x, y, w, h, extra))


def art(cid, dx=0.0):
    """One crop, placed at the box it was measured from. dx moves it along its
    row: the camera mark repeats on 07's two chips."""
    _, x0, y0, x1, y1 = CROPS[cid]
    return img(cid, x0 + dx, y0, x1 - x0, y1 - y0)


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


def statusbar(colour="var(--x-ink)", time="9:41", island=False):
    """island=False throughout: Mobbin composites the Island out of its captures,
    and all seven show a clean bar."""
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
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 10.5px/13.5px var(--x-font);color:var(--x-ink-3);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-3);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-line)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;word-break:break-all}
.foot{display:flex;gap:28px;align-items:flex-start;margin-top:12px}
.foot h2{margin-top:0}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-chip);border:1px solid var(--x-line)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-3);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid var(--x-line)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-3);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-line);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-pink)}
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
        '<div class="tr"><span style="font:var(--x-%s);line-height:1.1">Grumpy wizards</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Measured off seven Mobbin captures of TikTok for iOS at 3x. '
                'Every row has an evidence line on the next board.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2>'
                '<div class="rad">%s</div></div>'
                '<div><h2>Metrics</h2><div class="met">%s</div></div></div>'
                '<h2>Type</h2>%s</div>'
                % (NAME, swatches, radii, met, type_), SHEET)


EV_ROWS = 38   # rows that fit the 478 x 980 box; the table splits past this


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
SCREEN_CSS = """.t,.b,.a,.ic{position:absolute}
.a,.ic{display:block}
.ic{overflow:visible}
.t{white-space:nowrap}
.sh{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-h)}"""


def boxtop(ink_top, tk):
    """Chrome puts the cap top of a line at lh/2 - 0.3455*size below the box
    top: half-leading (lh - 1.162*size)/2 plus the gap between the ascent
    (0.952em) and the cap height (0.7165em) of SF Pro."""
    size, lh = TS(tk)
    return ink_top - (lh / 2 - 0.3455 * size)


def tx(x, ink_top, s, tk="t-body", col=None, w=None, extra=""):
    """One run of type, positioned by the top of its ink."""
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;font:var(--x-%s)%s%s%s">%s</div>'
            % (x, boxtop(ink_top, tk), tk,
               ";color:%s" % col if col else "",
               ";width:%.1fpx" % w if w else "", extra, s))


def txc(ink_top, s, tk="t-body", col=None, x=0.0, w=393.0, extra=""):
    """Centred type. The width is the box it centres in, not the ink."""
    return tx(x, ink_top, s, tk, col, w, ";text-align:center" + extra)


def txr(right, ink_top, s, tk="t-body", col=None, w=200.0):
    """Right-aligned type: the post counts hang off x 377.67."""
    return tx(right - w, ink_top, s, tk, col, w, ";text-align:right")


def box(x, y, w, h, style="", cls="b", inner=""):
    return ('<div class="%s" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;'
            'height:%.2fpx;%s">%s</div>' % (cls, x, y, w, h, style, inner))


def circle(x, y, d, style=""):
    return box(x, y, d, d, "border-radius:50%;" + style)


def rule(x, y, w, colour):
    """One device pixel at 3x. Every hairline in the captures measures 0.33pt."""
    return box(x, y, w, 0.33, "background:%s" % colour)


def svg(x, y, w, h, inner, colour="var(--x-ink)", sw=2.0):
    """A glyph small enough to live at its call site: chevrons, dots, marks.
    Same contract as art() -- the path is in absolute screen pt."""
    return ('<svg class="ic" viewBox="%g %g %g %g" style="left:%gpx;top:%gpx;width:%gpx;'
            'height:%gpx;color:%s" fill="none" stroke="currentColor" stroke-width="%g"'
            ' stroke-linecap="round" stroke-linejoin="round">%s</svg>'
            % (x, y, w, h, x, y, w, h, colour, sw, inner))


def chev_right(y, colour="var(--x-ink-3)"):
    """The disclosure chevron on every post-settings row: x 370.33, 6.33 x 11.33."""
    return svg(370.33, y, 6.33, 11.33,
               '<path d="M371.1 %g L375.9 %g L371.1 %g"/>' % (y + .8, y + 5.67, y + 10.53),
               colour, 1.9)


CHIP = "border-radius:var(--x-r-chip);background:var(--x-chip)"
PILL = "border-radius:var(--x-r-pill);background:var(--x-chip)"


def screen(title, inner, hm="#686568"):
    """One phone artboard. No board background: the phone floats on the canvas."""
    return page(NAME + " - " + title,
                '<div class="phone">%s%s%s</div>' % (statusbar(), inner, home(hm)),
                SCREEN_CSS)


# ------------------------------------------------------------ 01-02 bio ----
def bio_screen(filled):
    """The bio editor. Empty: grey Save, pink caret, placeholder. Filled: the
    bio, pink Save, no caret (the capture caught it dark)."""
    t = (tx(17.0, 75.33, "Cancel")
         + txc(73.67, "Bio", "t-nav")
         + tx(343.67, 75.67, "Save", "t-body",
              "var(--x-pink)" if filled else "var(--x-ink-4)")
         + rule(0, 102.67, 393, "var(--x-hairline)"))
    if filled:
        t += (tx(22.0, 122.33, BIO)
              + tx(16.33, 262.33, COUNT, "t-count", "var(--x-ink-4)"))
    else:
        t += (box(20.0, 119.0, 2.67, 19.0, "background:var(--x-pink)")
              + tx(23.0, 122.67, "Add a bio", "t-body", "var(--x-ink-4)")
              + tx(16.67, 262.33, "0/80", "t-count", "var(--x-ink-4)"))
    t += rule(16.0, 247.67, 361.33, "var(--x-divider)")
    # The mention chip above the keyboard: page-coloured, one-pixel outline.
    t += (box(8.0, 522.67, 91.0, 31.33, "border-radius:var(--x-r-ctl);"
              "background:var(--x-bg);box-shadow:inset 0 0 0 1px var(--x-line)")
          + tx(18.0, 531.33, "@", "t-mark")
          + tx(36.0, 532.33, "Mention", "t-chip-lg"))
    return screen("Bio - " + ("filled" if filled else "empty"),
                  t + keyboard(), "#000000")


# ------------------------------------------------------------ 03 profile ----
def profile_screen():
    """The profile the saved bio lands on."""
    # The name is centred on the screen and its chevron hangs 3.7pt off the
    # right of the ink, so the substitute's extra 35.7pt of width moves both.
    t = (txc(73.0, ACCOUNT, "t-nav")
         + svg(256.7, 76.67, 11.67, 7.33,
               '<path d="M257.7 77.7L262.53 82.4L267.37 77.7"/>')
         + art("footprints")
         + "".join(box(355.67, y, 19.33, 2.0, "border-radius:1px;background:var(--x-ink)")
                   for y in (74.0, 80.0, 86.0)))

    # Avatar: a 4pt gradient ring, a 2.5pt page-coloured gap, then the 96pt
    # disc. The face in the capture is a stranger's, so the disc is another
    # account's avatar instead -- avatarbuild.py fetches it.
    t += (circle(142.7, 104.7, 109.0,
                 "background:linear-gradient(135deg,#0E9DFF,#19FEBF)")
          + circle(146.7, 108.7, 101.0, "background:var(--x-bg)")
          + img("03-avatar", 149.2, 111.2, 96.0, 96.0, ";border-radius:50%")
          + circle(*NOTCH, "background:var(--x-bg)")
          + circle(221.33, 183.0, 24.0, "background:var(--x-cyan)")
          + box(232.25, 189.97, 1.9, 10.67, "background:var(--x-ink-inv)")
          + box(227.0, 194.35, 11.67, 1.9, "background:var(--x-ink-inv)"))
    t += txc(219.33, HANDLE, "t-handle")

    # Stats. The divider is a three-pixel ramp: one pixel of its core reads it.
    for cx, n, lab, lx in ((104.33, "6", "Following", 77.33),
                           (196.5, "0", "Followers", 169.67),
                           (288.5, "0", "Likes", 275.0)):
        t += (txc(254.0 if lab == "Following" else 253.67, n, "t-nav", x=cx - 40, w=80)
              + tx(lx, 274.0, lab, "t-meta", "var(--x-ink-2)"))
    t += "".join(box(x, 259.67, 1.0, 16.0, "background:var(--x-stat)")
                 for x in (150.8, 243.0))

    t += (box(46.33, 294.0, 117.33, 44.0, PILL) + tx(68.0, 310.0, "Edit profile", "t-btn")
          + box(167.67, 294.0, 131.33, 44.0, PILL) + tx(188.67, 310.0, "Share profile", "t-btn")
          + box(303.0, 294.0, 44.0, 44.0, PILL) + art("personadd"))

    t += (txc(352.67, BIO, "t-bio", x=76.5, w=240)
          # The capture's row here is TikTok Shop's, so this is the account's
          # site instead, on the same centre: the globe is 04's own glyph, at
          # the 17pt the cart it replaces was cut at, and the row is
          # icon + 3.67 + text, 110.0 wide against the capture's 97.7.
          + img("globe", 141.5, 375.5, 17.0, 17.0)
          + tx(162.17, 378.33, LINK, "t-chip-lg"))

    # Content tabs. The grid tab is active: six bars, a caret, a 2pt underline.
    t += ("".join(box(39.0 + 6.0 * i, y, 2.33, 6.33, "background:var(--x-ink)")
                  for y in (416.33, 425.33) for i in range(3))
          + svg(60.67, 422.0, 7.0, 4.67,
                '<path d="M60.67 422.0H67.67L64.17 426.67Z" fill="currentColor" stroke="none"/>')
          + art("tab-lock")
          + art("tab-repost")
          + art("tab-saved")
          + art("tab-liked")
          + box(28.0, 442.0, 48.0, 2.0, "background:var(--x-ink)")
          + rule(0, 443.67, 393, "var(--x-line)")
          # The drafts cell: one third of 393 at 3:4. The capture's frame is a
          # stranger's video, so it carries a frame of the stand-in account's
          # own, cropped to fill rather than letterboxed, and the badge TikTok
          # draws over it is redrawn rather than cut out with it. The scrim
          # under the badge is the one thing here the capture does not have:
          # see the tile-scrim token.
          + img("tile", 0.0, 444.0, 131.0, 174.3)
          + box(0.0, 444.0, 131.0, 52.3, "background:var(--x-tile-scrim)")
          + tx(6.1, 453.8, "Drafts: 1", "t-bio", "var(--x-ink-inv)"))

    # The contacts banner: page-coloured, so only its shadow reads.
    t += (box(0, 689.33, 393, 67.67, "border-radius:var(--x-r-card) var(--x-r-card) 0 0;"
              "background:var(--x-bg);box-shadow:0 5px 10px -2px rgba(0,0,0,.10)")
          + tx(28.33, 709.33, "Add phone number", "t-card")
          + tx(28.33, 728.33, "Let contacts find you on TikTok", "t-meta", "var(--x-ink-2)")
          + box(248.33, 705.33, 89.33, 29.33,
                "border-radius:var(--x-r-ctl);background:var(--x-pink)")
          + txc(714.67, "Add", "t-btn", "var(--x-ink-inv)", x=248.33, w=89.33)
          + svg(352.67, 713.33, 9.33, 9.33,
                '<path d="M353.4 714.1L361.3 722.0M361.3 714.1L353.4 722.0"/>',
                "var(--x-ink-3)", 1.6))

    t += rule(0, 769.0, 393, "var(--x-tabs)")
    for name, lab, lx, ly, on in (("tb-home", "Home", 26.0, 803.67, False),
                                  ("tb-friends", "Friends", 101.67, 803.33, False),
                                  ("tb-inbox", "Inbox", 263.0, 803.33, False),
                                  ("tb-me", "Profile", 339.33, 803.0, True)):
        t += (art(name)
              + tx(lx, ly, lab, "t-tab", None if on else "var(--x-ink-3)"))
    # The create button: cyan then pink, offset by 4 and 7.33, with the near-black
    # cap painted over both -- the capture shows colour only at the two edges.
    t += ("".join(box(x, 777.33, 35.67, 28.0,
                      "border-radius:var(--x-r-btn);background:%s" % c)
                  for x, c in ((175.0, "var(--x-cyan)"), (182.33, "#F62E6F"), (179.0, "#141723")))
          + box(195.67, 785.0, 1.67, 13.0, "background:var(--x-ink-inv)")
          + box(190.0, 790.67, 13.0, 1.67, "background:var(--x-ink-inv)"))
    return screen("Profile", t)


# ------------------------------------------------------------ 04-07 post ----
def post_head(lines=(), caret=None):
    """The back chevron, the description field and the cover cell. Each line is
    (text, token): TikTok sets the hashtags bolder than the prose. No lines
    means the placeholder."""
    t = (svg(16.67, 72.33, 10.0, 17.33, '<path d="M25.7 73.3L17.7 81.0L25.7 88.7"/>')
         + rule(0, 102.67, 393, "var(--x-hairline)")
         # The cover cell, the same stand-in frame at the same 3:4. Its two
         # labels and the bar under them are TikTok's, so they are drawn here;
         # the watermark and the sticker in the capture were the video's own
         # and went with it. 'Edit cover' keeps its 40% bar; the top label gets
         # the tile-scrim, at the same 0.30 of the cell 03 uses.
         + img("tile", 265.2, 111.1, 112.0, 148.8, ";border-radius:var(--x-r-cover)")
         + box(265.2, 111.1, 112.0, 44.6, "background:var(--x-tile-scrim);"
               "border-radius:var(--x-r-cover) var(--x-r-cover) 0 0")
         + tx(275.8, 123.6, "Preview", "t-chip", "var(--x-ink-inv)")
         + box(271.0, 228.2, 100.2, 25.7,
               "border-radius:var(--x-r-cover);background:var(--x-bar)")
         + txc(236.8, "Edit cover", "t-chip", "var(--x-ink-inv)", x=271.0, w=100.2))
    if lines:
        t += "".join(tx(21.5, 115.0 + 17.67 * i, s, tk)
                     for i, (s, tk) in enumerate(lines))
    else:
        t += tx(21.67, 113.67, "Add description...", "t-cap", "var(--x-ink-4)")
    if caret:
        t += box(caret, 128.0, 2.0, 20.0, "background:var(--x-pink)")
    return t


def post_chips():
    """# Hashtags and @ Mention, y 276 to 304.67 on all four post screens."""
    return (box(15.67, 276.0, 86.33, 28.67, CHIP)
            + tx(23.0, 283.67, "#", "t-mark-sm")
            + tx(41.0, 285.67, "Hashtags", "t-chip")
            + box(110.0, 276.0, 79.0, 28.67, CHIP)
            + tx(116.67, 284.0, "@", "t-mark-sm")
            + tx(135.0, 285.67, "Mention", "t-chip"))


# Two of the place names in the capture are crude user-generated ones. The
# measured chip boxes are kept and neutral names are centred in them, chosen to
# render at the width the box was built for: a chip is its label plus 6-7pt of
# padding, so a substitute that does not fill it reads as a padding error.
PLACES = [(38.0, 67.0, "Yo Mama"), (113.0, 120.33, "Northside Pizzeria"),
          (241.33, 75.0, "All For You"), (324.33, 82.0, "Bridge Cafe")]


def post_settings():
    """Divider, Location, Add link, the privacy row, More options, Share to.
    07 translates this whole block down 40pt; every number here is 04's."""
    t = (rule(0, 319.67, 393, "var(--x-rule)")
         + art("pin") + tx(45.33, 347.67, "Location", "t-row")
         + svg(114.0, 348.33, 11.33, 11.33,
               '<circle cx="119.67" cy="354.0" r="5.1"/>'
               '<path d="M119.67 351.6V351.7M119.67 353.4V356.6"/>', "var(--x-ink-3)", 1.2)
         + chev_right(348.33))
    t += "".join(box(x, 380.0, w, 28.0, CHIP) + txc(389.0, s, "t-meta", x=x, w=w)
                 for x, w, s in PLACES)
    t += (art("plus")
          + tx(44.33, 439.67, "Add link", "t-row")
          + circle(106.0, 433.33, 7.33, "background:var(--x-pink)")
          + chev_right(440.33)
          + box(38.0, 470.0, 89.33, 28.0, CHIP)
          + art("template")
          + tx(66.33, 478.67, "Template", "t-meta"))
    t += (art("globe") + tx(45.33, 529.67, "Everyone can view this post", "t-row")
          + chev_right(530.33))
    t += ("".join(circle(18.0 + 6.33 * i, 586.33, 3.0, "background:var(--x-ink)")
                  for i in range(3))
          + tx(45.33, 581.67, "More options", "t-row")
          + tx(45.0, 604.33, "Privacy and more settings have been moved here.",
               "t-meta", "var(--x-ink-3)")
          + chev_right(582.33))
    t += (art("share") + tx(44.67, 656.0, "Share to", "t-row")
          + circle(293.0, 644.0, 36.0, "background:var(--x-chip)")
          + circle(342.0, 644.0, 36.0, "background:var(--x-chip)")
          + art("bubble")
          + art("facebook"))
    return t


def post_buttons():
    return (box(11.67, 769.67, 182.33, 44.67,
                "border-radius:var(--x-r-btn);background:var(--x-chip)")
            + art("drafts") + tx(91.33, 785.67, "Drafts", "t-btn-lg")
            + box(200.33, 769.67, 182.33, 44.67,
                  "border-radius:var(--x-r-btn);background:var(--x-pink)")
            + art("post")
            + tx(285.67, 786.67, "Post", "t-btn-lg", "var(--x-ink-inv)"))


# (tag, count, count ink left). Rows pitch 52 from ink top 340.67.
HASHTAGS = [("#motio", "2631 posts", 313.0), ("#motion", "964.2K posts", 298.0),
            ("#motionblur", "89.1K posts", 310.67),
            ("#motiongraphics", "208.4K posts", 297.67),
            ("#motionlessinwhite", "149.9K posts", 302.33)]


def hashtag_list():
    return rule(0, 319.67, 393, "var(--x-rule)") + "".join(
        tx(15.33, 340.67 + 52.0 * i, tag, "t-tag")
        + tx(cx, 341.67 + 52.0 * i, n, "t-meta", "var(--x-ink-3)")
        for i, (tag, n, cx) in enumerate(HASHTAGS))


# ------------------------------------------------------------- keyboard ----
KB = 562.33
KEY_W, KEY_PITCH, KEY_H = 33.33, 39.33, 41.33
ROWS = ("qwertyuiop", "asdfghjkl", "zxcvbnm")
ROW_X = (3.0, 22.33, 61.67)
ROW_Y = (570.33, 624.67, 678.67, 732.67)
ROW_INK = (584.0, 638.0, 692.0)      # x-height top of the letters, per row


def keycap(x, w, y, fill, inner=""):
    """One key: the cap over a 1.3pt bottom edge."""
    return (box(x, y, w, KEY_H + 1.3,
                "border-radius:var(--x-r-ctl);background:var(--x-key-edge)")
            + box(x, y, w, KEY_H,
                  "border-radius:var(--x-r-ctl);background:%s" % fill) + inner)


def keyboard(alt=False):
    """The Dutch iOS keyboard. alt is TikTok's caption variant, where the
    return key is split into @ and #."""
    # The letters are lowercase, so the measured ink top is the x-height top:
    # back it up by (0.7165 - 0.529) em to get the cap top boxtop() wants.
    xcap = 0.1875 * TS("t-key")[0]
    t = box(0, KB, 393, 852 - KB, "background:var(--x-keyboard)")
    for r, letters in enumerate(ROWS):
        for i, ch in enumerate(letters):
            x = ROW_X[r] + i * KEY_PITCH
            t += keycap(x, KEY_W, ROW_Y[r],
                        "var(--x-key)", txc(ROW_INK[r] - xcap, ch, "t-key", x=x, w=KEY_W))
    t += (keycap(3.0, 44.33, ROW_Y[2], "var(--x-key-alt)", art("kb-shift"))
          + keycap(346.0, 44.33, ROW_Y[2], "var(--x-key-alt)", art("kb-back"))
          + keycap(3.0, 42.67, ROW_Y[3], "var(--x-key-alt)",
                   txc(747.0, "123", "t-keylab", x=3.0, w=42.67))
          + keycap(51.67, 43.33, ROW_Y[3], "var(--x-key-alt)", art("kb-emoji"))
          + keycap(100.33, 192.0, ROW_Y[3], "var(--x-key)",
                   txc(745.67, "spatie", "t-keylab", x=100.33, w=192.0)))
    if alt:
        t += (keycap(298.0, 43.67, ROW_Y[3], "var(--x-key-alt)",
                     tx(310.67, 743.0, "@", "t-key"))
              + keycap(347.67, 42.67, ROW_Y[3], "var(--x-key-alt)",
                       tx(362.0, 744.33, "#", "t-key")))
    else:
        t += keycap(298.33, 92.0, ROW_Y[3], "var(--x-key-alt)",
                    txc(748.0, "return", "t-keylab", x=298.33, w=92.0))
    return t + art("kb-globe") + art("kb-mic")


# ----------------------------------------------------------- post boards ----
def post_empty():
    return screen("Post - empty",
                  post_head() + post_chips() + post_settings() + post_buttons())


def post_keyboard():
    """The same screen with the field focused: a scrim from the divider to the
    keyboard, and no Drafts/Post row."""
    return screen("Post - keyboard",
                  post_head() + post_chips() + post_settings()
                  + box(0, 319.67, 393, KB - 319.67, "background:var(--x-scrim)")
                  + keyboard(True), "#000000")


def post_hashtags():
    return screen("Post - hashtags",
                  post_head((("share the motion you captured", "t-cap"),
                             ("#motio", "t-cap-b")), caret=71.33)
                  + post_chips() + hashtag_list() + keyboard(True), "#000000")


def post_caption():
    """The finished caption. TikTok inserts a suggestion row above the divider,
    which pushes everything from the divider down by 40pt."""
    sugg = ("".join(box(x, 316.67, w, 28.0, CHIP)
                    + tx(40.33 + dx, 325.33, s, "t-meta", "var(--x-ink-2)")
                    + art("camera", dx=dx)
                    for x, w, dx, s in ((16.0, 198.33, 0.0, "share your excellent capture"),
                                        (222.33, 153.0, 206.0, "display your footage")))
            + box(383.33, 316.67, 40.0, 28.0, CHIP))
    return screen("Post - caption",
                  post_head((("share the motion you captured", "t-cap"),
                             ("#motion #traffic #car #driving", "t-cap-b")))
                  + post_chips() + sugg
                  + '<div class="sh" style="transform:translateY(40px)">%s</div>'
                    % post_settings()
                  + post_buttons())


SCREENS = [
    ("01-bio-empty", "Bio - empty", lambda: bio_screen(False)),
    ("02-bio-filled", "Bio - filled", lambda: bio_screen(True)),
    ("03-profile", "Profile", profile_screen),
    ("04-post-empty", "Post - empty", post_empty),
    ("05-post-keyboard", "Post - keyboard", post_keyboard),
    ("06-post-hashtags", "Post - hashtags", post_hashtags),
    ("07-post-caption", "Post - caption", post_caption),
]

# ------------------------------------------------------------ references ----
# The captures are 1180 x 2676: the 393 x 852 screen plus Mobbin's watermark
# strip. Sizing them to --x-h would squash the screen 4.5%, so the frame takes
# the file's own aspect and is scaled down to leave the caption room.
REF_CSS = """body{padding:24px}
figure{width:376px}
.phone{width:376px;height:auto;border-radius:28px}
.phone img{position:static;width:100%;height:auto;display:block}
figcaption{margin-top:12px;font:400 10px/14px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3)}
figcaption b{display:block;font:600 11px/15px var(--x-font);color:var(--x-ink)}"""

# stem -> (flow, screen id). Mobbin flows "Adding a bio" and "Adding a caption";
# the harvest names its files in flow order, so file N is that flow's Nth screen.
# That mapping is the one thing here not read off the pixels.
MOBBIN = {
    "01-bio-empty":     ("Adding a bio", "84e8a102-216b-4279-8c3d-e24dbb059c89"),
    "02-bio-filled":    ("Adding a bio", "182941ba-b854-4847-8c97-e25caf1be1b9"),
    "03-profile":       ("Adding a bio", "28345c40-c179-4f4e-800f-dcfaf79a12d7"),
    "04-post-empty":    ("Adding a caption", "3e36eb4c-e9ec-455b-9d38-0fe699bd029b"),
    "05-post-keyboard": ("Adding a caption", "dd6ada3f-41ba-4851-bae9-119b3caf85c3"),
    "06-post-hashtags": ("Adding a caption", "ec1cc372-d44e-4924-8109-b498437421bd"),
    "07-post-caption":  ("Adding a caption", "c00697f2-3b71-4a9b-840d-ec8536f20aca"),
}


def ref_boards():
    for stem, label, _ in SCREENS:
        f = REFS_DIR / ("p" + str(int(stem[:2])) + ".png")
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        flow, sid = MOBBIN[stem]
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<figure><div class="phone"><img src="%s" alt="%s"></div>'
                    '<figcaption><b>%s &middot; %s</b>mobbin.com/screens/%s<br>'
                    'the exact frame board %s is measured from</figcaption></figure>'
                    % (uri, label, flow, label, sid, stem[:2]),
                    REF_CSS))


# ----------------------------------------------------------------- main ----
def _run_rows(title, screens, names):
    """A run's screens and, under them, the captures they were measured from.
    The canvas lays every row out from x = 0 at one pitch, so the two rows stay
    in the same order and item N lands column-for-column over its own capture.
    That is also why the two runs get two reference rows and not one: 7 screens
    above 15 captures would line up with nothing."""
    rows = [{"title": title, "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _ in screens]}]
    refs = [{"file": "ref-" + s, "label": l}
            for s, l, _ in screens if "ref-" + s in names]
    if refs:
        rows.append({"title": "Source of truth: Mobbin captures",
                     "numbered": True, "files": refs})
    return rows


def layout(names):
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                      + [{"file": n, "label": "Evidence"} for n, _ in evidence_boards()]
                      + [{"file": "00d-feed-tokens", "label": "Feed tokens"}]
                      + [{"file": n, "label": "Evidence"}
                         for n, _ in feed.evidence_boards()]}]
    rows += _run_rows("TikTok: bio and caption", SCREENS, names)
    rows += _run_rows("TikTok: the For You feed", feed.SCREENS, names)
    return {"name": PAGE_NAME, "rows": rows}


def main():
    cut()
    files = dict([("00-design-tokens", token_board())]
                 + list(evidence_boards())
                 + [(s, fn()) for s, _, fn in SCREENS]
                 + list(ref_boards()))
    both = feed.build()
    clash = set(files) & set(both)
    assert not clash, "two runs, one board name: %s" % sorted(clash)
    files.update(both)
    for name in sorted(files):
        write(name, files[name])
    (OUT / "layout.json").write_text(json.dumps(layout(files), indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(layout(files)["rows"])))
    print("\nnext: refkit tokens", OUT)


if __name__ == "__main__":
    main()
