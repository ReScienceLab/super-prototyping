#!/usr/bin/env python3
"""Emit the welcome board. Artboards are output, never source: edit this file,
not the HTML. Sources are the repo's own assets/banner.png and assets/icon.png.

Only /clone-prototype is on the board. The other two skills were a three-up
row here and are not shown for now, so the one people are meant to run first
has the whole width to itself.

This is the one board that is not phone-shaped: a landscape strip as wide
as the row of example cards under it on the canvas, one card per other
folder. Add a folder and the row grows, so raise CARDS below and copy the
printed size into canvas/src/App.tsx as WELCOME_BOARD_SIZE; keep the
two in step.

Everything clickable on this page is a canvas shape, not markup in here. The
canvas renders boards in <iframe srcDoc sandbox="">, where a link cannot
navigate anything, so the example cards are drawn by
canvas/src/CanvasLinkShapeUtil.tsx instead. The repo CTA is not on this board
at all: it is pinned to the viewport's top-right corner as tldraw chrome, in
canvas/src/canvasChrome.tsx."""
import base64, io, os
from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(OUT, "..", "..", "..", "assets")
REPO = "github.com/ReScienceLab/super-prototyping"

CARDS = 7               # one example card per mockups/canvases folder, minus this one
W = CARDS * 239 + (CARDS - 1) * 80      # card pitch on the canvas: 239 wide, 80 gutter
BANNER_H = W // 4       # the banner crop's own 4:1 aspect, so nothing stretches
H = BANNER_H + 281      # 281 is what the header, the heading and the skill card need,
                        # 263 of it content and 18 of slack under the card

BANNER_W = 2304         # the source's full width; past this there is no more detail
BANNER_CROP = (0, 72, 2304, 648)   # 4:1 out of the 3:1 source, trimming dead black
MARK_PX = 96            # 2x the 48px display size

# What the lede had when the header still held the star button's 260px slot, kept so its
# lines break where they were measured to break. The freed space trails at the right edge.
LEDE_W = W - 2 * 30 - 360 - 24 - 260 - 24


def uri(image, fmt, **opts):
    buf = io.BytesIO()
    image.save(buf, fmt, **opts)
    mime = "jpeg" if fmt == "JPEG" else "png"
    return f"data:image/{mime};base64," + base64.b64encode(buf.getvalue()).decode()


def banner_uri():
    im = Image.open(os.path.join(ASSETS, "banner.png")).convert("RGB").crop(BANNER_CROP)
    h = round(im.height * BANNER_W / im.width)
    return uri(im.resize((BANNER_W, h), Image.LANCZOS), "JPEG", quality=88,
               optimize=True, progressive=False)


def mark_uri():
    im = Image.open(os.path.join(ASSETS, "icon.png")).convert("RGB")
    return uri(im.resize((MARK_PX, MARK_PX), Image.LANCZOS), "PNG", optimize=True)


# The banner is white line work on black, so the board is too. The ramp below
# is spaced for legibility at this size rather than borrowed from a palette.
TOKENS = f""":root{{
  --w-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;
  --w-mono:ui-monospace,Menlo,"SF Mono",monospace;

  --w-ground:#08080A;
  --w-panel:#111115;
  --w-edge:#24242C;
  --w-ink:#F4F4F6;
  --w-muted:#A6A6B0;
  --w-dim:#71717C;

  --w-pad:30px;
  --w-gutter:24px;
  --w-banner-h:{BANNER_H}px;     /* the board width / 4, the crop's own aspect */
  --w-radius:10px;
}}"""


def board():
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>super-prototyping</title>
<style>
/* ============================================================================
   WELCOME -- the board the bare URL opens. Says what this repo is, where it
   lives, and what the shapes below it do, in three columns across a landscape
   strip. The canvas renders it in <iframe srcDoc sandbox="">, which blocks
   external stylesheets, so the token block is inlined like every other board's.
   ========================================================================= */
{TOKENS}

*{{box-sizing:border-box;margin:0;padding:0}}
body{{width:{W}px;height:{H}px;overflow:hidden;
  background:var(--w-ground);color:var(--w-ink);
  font-family:var(--w-font);-webkit-font-smoothing:antialiased}}

/* Full bleed. The art is line work on black and the board's ground is black,
   so the strip has no edge to frame. */
.banner{{display:block;width:{W}px;height:var(--w-banner-h)}}

main{{padding:var(--w-pad)}}

header{{display:flex;align-items:center;gap:24px;padding-bottom:26px}}
.mark{{display:flex;align-items:center;gap:14px;flex:none;width:360px}}

.mark img{{width:48px;height:48px;border-radius:12px;border:1px solid var(--w-edge)}}
h1{{font:700 24px/28px var(--w-font);letter-spacing:-.3px}}
.url{{font:400 12px/16px var(--w-mono);color:var(--w-muted)}}

.lede{{flex:none;width:{LEDE_W}px;font:400 14px/21px var(--w-font);color:var(--w-muted);
  border-left:1px solid var(--w-edge);padding-left:24px}}
.lede b{{color:var(--w-ink);font-weight:600}}

h2{{font:600 10px/13px var(--w-font);letter-spacing:1.3px;text-transform:uppercase;
  color:var(--w-dim);padding-bottom:12px}}

/* The one skill on the board, so it is the full width. Everything on this page is
   white line work on black and the card keeps to that: no colour. The moving light on
   this canvas belongs to the two CTAs pinned top-right, and only to them. */
.skill{{display:flex;align-items:center;gap:30px;
  padding:34px 36px;border-radius:14px;
  background:linear-gradient(180deg,#17171C,#0C0C10);
  border:1px solid #3A3A46;
  box-shadow:0 12px 40px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.10)}}
.skill b{{flex:none;font:700 30px/36px var(--w-mono);color:#FFFFFF;letter-spacing:-.5px}}
.skill span{{font:400 15px/22px var(--w-font);color:var(--w-muted);
  border-left:1px solid var(--w-edge);padding-left:30px}}

code{{font:400 12.5px/20px var(--w-mono);color:var(--w-ink)}}
</style>
</head>
<body>

<img class="banner" src="{banner_uri()}" alt="super-prototyping">

<main>
  <header>
    <div class="mark">
      <img src="{mark_uri()}" alt="">
      <div>
        <h1>super-prototyping</h1>
        <p class="url">{REPO}</p>
      </div>
    </div>
    <p class="lede">Clone and design product UI as <b>self-contained HTML artboards</b> on a
    local tldraw canvas. Drop an <code>.html</code> file into a folder and it shows up here
    as a shape.</p>
  </header>

  <h2>Start with this skill</h2>
  <div class="skill">
    <b>/clone-prototype</b>
    <span>Copy a real app's screens. Grid the capture, sample it by eye, name the type face,
    then generate.</span>
  </div>
</main>

</body>
</html>
"""


LAYOUT = """{
  "name": "Start here",
  "rows": [
    {
      "title": "super-prototyping",
      "files": [{ "file": "00-welcome", "label": "What this is" }]
    }
  ]
}
"""

if __name__ == "__main__":
    p = os.path.join(OUT, "00-welcome.html")
    with open(p, "w") as f:
        f.write(board())
    print("%-24s %6d KB   %d x %d, %d cards" %
          ("00-welcome.html", os.path.getsize(p) // 1024, W, H, CARDS))
    with open(os.path.join(OUT, "layout.json"), "w") as f:
        f.write(LAYOUT)
    print("layout.json")
