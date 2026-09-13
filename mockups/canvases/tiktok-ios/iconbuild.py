#!/usr/bin/env python3
"""Build icon.png from the App Store's own artwork, under the iOS squircle.

    python3 mockups/canvases/tiktok-ios/iconbuild.py

Run once; icon.png is committed. Same route as every other folder's icon: the
iTunes lookup API's artworkUrl512, masked and stamped with its source.
"""
import io
import json
import urllib.request
from pathlib import Path

from PIL import Image, PngImagePlugin

TRACK = 835599320   # TikTok - Videos, Shop & LIVE, TIKTOK PTE. LTD.
SIZE = 256


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


url = "https://itunes.apple.com/lookup?id=%d&country=us" % TRACK
art = json.load(urllib.request.urlopen(url))["results"][0]["artworkUrl512"]
im = Image.open(io.BytesIO(urllib.request.urlopen(art).read())).convert("RGBA")
im = im.resize((SIZE, SIZE), Image.LANCZOS)
im.putalpha(squircle(SIZE))

meta = PngImagePlugin.PngInfo()
meta.add_text("Source", "https://itunes.apple.com/us/app/id%d" % TRACK)
out = Path(__file__).resolve().parent / "icon.png"
im.save(out, pnginfo=meta)
print(out, im.size, art)
