#!/usr/bin/env python3
"""Build icon.png: the note redrawn as a stroked path, under the iOS squircle.

    python3 mockups/canvases/tiktok-ios/iconbuild.py

Run once; icon.png is committed. The mark is redrawn from the watermark in the
captures at 40x, not lifted from TikTok's own artwork.
"""
import subprocess
from pathlib import Path
from PIL import Image

B = Path(__file__).resolve().parent
S = B / "scratch"

# Stem, then the head: a 38-radius circle swept 330 deg so the gap sits at the
# upper right, tucked against the stem, the way the watermark's note does. The
# flag is the same stroke curving out of the stem's top and hooking down.
NOTE = ('<path d="M148 52V162A42 42 0 1 1 142 141"/>'
        '<path d="M148 52C150 86 170 102 191 114"/>')


def layer(dx, dy, colour):
    return ('<g transform="translate(%g %g)" stroke="%s" stroke-width="24"'
            ' fill="none" stroke-linecap="round">%s</g>' % (dx, dy, colour, NOTE))


HTML = """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0}body{width:256px;height:256px;background:#000}
svg{display:block}</style></head><body>
<svg width="256" height="256" viewBox="0 0 256 256">%s%s%s</svg>
</body></html>
""" % (layer(-6, -6, "#1FD6EC"), layer(6, 6, "#FD2953"), layer(0, 0, "#FDFBFC"))


def squircle(size, n=5.0, ss=4):
    """iOS icon mask: the superellipse |x|^n + |y|^n = 1, supersampled ss x."""
    big = size * ss
    m = Image.new("L", (big, big), 0)
    px = m.load()
    half = big / 2.0
    for y in range(big):
        v = abs((y + 0.5 - half) / half) ** n
        if v >= 1.0:
            continue
        dx = half * (1.0 - v) ** (1.0 / n)
        for x in range(int(half - dx), int(half + dx) + 1):
            px[x, y] = 255
    return m.resize((size, size), Image.LANCZOS)


(S / "icon.html").write_text(HTML)
subprocess.run(["refkit", "shoot", str(S / "icon.html"), "-o", str(S), "--scale", "1"],
               check=True)
# shoot pads every board to the 478 x 980 artboard box; the icon is its corner.
im = Image.open(S / "icon.png").convert("RGBA").crop((0, 0, 256, 256))
im.putalpha(squircle(256))
from PIL import PngImagePlugin
meta = PngImagePlugin.PngInfo()
# The sibling icons carry their App Store source here. This one has none:
# TikTok's artwork is not redistributable, so the note is redrawn.
meta.add_text("Source", "Redrawn from the Mobbin watermark in assets/refs; see iconbuild.py. Not TikTok's own artwork.")
im.save(B / "icon.png", pnginfo=meta)
print(B / "icon.png", im.size)
