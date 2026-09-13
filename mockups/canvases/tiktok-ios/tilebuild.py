#!/usr/bin/env python3
"""Build assets/art/tile.png from one frame of the clip the boards are posting.

    python3 mockups/canvases/tiktok-ios/tilebuild.py ~/Desktop/day4.mp4

Run once; the PNG is committed, and the clip itself stays out of the repo at
39MB. It fills the two content tiles -- board 03's drafts thumbnail and boards
04-07's cover cell -- which are both 3:4 and were both frames of a video
belonging to a stranger. This clip is the stand-in account's own, so the
boards post its video rather than someone else's. AT is the frame: 4.0s is the
one with the whole device centred, which is what a cover has to survive being
scaled to 112pt. The clip is 16:9, so it sits letterboxed on the black it
already carries, the way TikTok shows a landscape video.
"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image, PngImagePlugin

AT = "4.0"          # seconds; the whole phone, centred
SIZE = (393, 523)   # board 03's drafts cell at 1x; 04 scales it down

clip = Path(sys.argv[1]).expanduser()
png = subprocess.run(["ffmpeg", "-v", "error", "-ss", AT, "-i", str(clip),
                      "-frames:v", "1", "-f", "image2", "-c:v", "png", "-"],
                     capture_output=True, check=True).stdout
frame = Image.open(io.BytesIO(png)).convert("RGB")

im = Image.new("RGB", SIZE, (0, 0, 0))
h = round(SIZE[0] * frame.height / frame.width)
im.paste(frame.resize((SIZE[0], h), Image.LANCZOS), (0, (SIZE[1] - h) // 2))

meta = PngImagePlugin.PngInfo()
meta.add_text("Source", "%s @ %ss" % (clip.name, AT))
out = Path(__file__).resolve().parent / "assets" / "art" / "tile.png"
im.save(out, optimize=True, pnginfo=meta)
print(out, im.size, meta.chunks[0][1].decode())
