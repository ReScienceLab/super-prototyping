#!/usr/bin/env python3
"""Build assets/art/tile.png from the stand-in account's own site banner.

    python3 mockups/canvases/tiktok-ios/tilebuild.py

Run once; the PNG is committed. It fills the two content tiles -- board 03's
drafts thumbnail and boards 04-07's cover cell -- which are both 3:4 and were
both crops of a video belonging to a stranger. The banner is landscape, so it
sits letterboxed on the black it already carries, the way TikTok shows a
landscape clip. SITE is the one knob; it has to match avatarbuild.py's PROFILE.
"""
import io
import re
import urllib.request
from pathlib import Path

from PIL import Image, PngImagePlugin

SITE = "https://snapaction.ai/"
SIZE = (393, 523)             # board 03's drafts cell at 1x; 04 scales it down
TRIM = (110, 15, 1090, 630)   # the banner's own margins, off its 1200x630
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req).read()


page = get(SITE).decode("utf-8", "replace")
url = re.search(r'og:image"\s+content="([^"]+)"', page).group(1)
banner = Image.open(io.BytesIO(get(url))).convert("RGB").crop(TRIM)

im = Image.new("RGB", SIZE, (0, 0, 0))
h = round(SIZE[0] * banner.height / banner.width)
im.paste(banner.resize((SIZE[0], h), Image.LANCZOS), (0, (SIZE[1] - h) // 2))

meta = PngImagePlugin.PngInfo()
meta.add_text("Source", url)
out = Path(__file__).resolve().parent / "assets" / "art" / "tile.png"
im.save(out, optimize=True, pnginfo=meta)
print(out, im.size, url)
