#!/usr/bin/env python3
"""Build assets/art/03-avatar.png from TikTok's own account avatar.

    python3 canvases/tiktok-ios/avatarbuild.py

Run once; the PNG is committed. Every other bitmap on these boards is cut out
of a capture, but the profile photograph in the capture belongs to a stranger,
so board 03 ships the avatar of the account in PROFILE instead. The profile
page carries it in its rehydration blob as avatarLarger, behind a signed URL
that expires, which is why this is a script and not a note with a link in it.
"""
import io
import json
import re
import urllib.request
from pathlib import Path

from PIL import Image, PngImagePlugin

PROFILE = "https://www.tiktok.com/@snapaction_ai"
SIZE = 288          # the 96pt disc at 3x, the scale the captures were taken at
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")


def get(url, referer=None):
    h = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}
    if referer:
        h["Referer"] = referer
    return urllib.request.urlopen(urllib.request.Request(url, headers=h)).read()


page = get(PROFILE).decode("utf-8", "replace")
# The blob is JSON inside a <script>, so the URL arrives /-escaped.
url = json.loads('"%s"' % re.search(r'"avatarLarger":"(.*?)"', page).group(1))
im = Image.open(io.BytesIO(get(url, PROFILE))).convert("RGB")
im = im.resize((SIZE, SIZE), Image.LANCZOS)

meta = PngImagePlugin.PngInfo()
meta.add_text("Source", PROFILE)
out = Path(__file__).resolve().parent / "assets" / "art" / "03-avatar.png"
im.save(out, optimize=True, pnginfo=meta)
print(out, im.size, url.split("?")[0])
