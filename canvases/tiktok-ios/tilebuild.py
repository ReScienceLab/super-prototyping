#!/usr/bin/env python3
"""Build assets/art/tile.png from one frame of the clip the boards are posting.

    python3 canvases/tiktok-ios/tilebuild.py ~/Desktop/day4.mp4

Run once; the PNG is committed, and the clip itself stays out of the repo at
39MB. It fills the two content tiles -- board 03's drafts thumbnail and boards
04-07's cover cell -- which are both 3:4 and were both frames of a video
belonging to a stranger. This clip is the stand-in account's own, so the boards
post its video rather than someone else's. The clip is 16:9, so the frame is
centre-cropped to 3:4 rather than letterboxed: a cover fills its cell. That
keeps 1080 of 2560 columns, which is what makes AT worth choosing -- at 9.0s
the demo is on its result card, the one frame that still reads as a product at
the 112pt the cover is scaled to, where the frames of scrolling mail are mush.
"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image, PngImagePlugin

AT = "9.0"          # seconds; the result card, the frame that survives 112pt
SIZE = (393, 523)   # board 03's drafts cell at 1x; 04 scales it down

clip = Path(sys.argv[1]).expanduser()
png = subprocess.run(["ffmpeg", "-v", "error", "-ss", AT, "-i", str(clip),
                      "-frames:v", "1", "-f", "image2", "-c:v", "png", "-"],
                     capture_output=True, check=True).stdout
frame = Image.open(io.BytesIO(png)).convert("RGB")

w = round(frame.height * SIZE[0] / SIZE[1])
x = (frame.width - w) // 2
im = frame.crop((x, 0, x + w, frame.height)).resize(SIZE, Image.LANCZOS)

meta = PngImagePlugin.PngInfo()
meta.add_text("Source", "%s @ %ss" % (clip.name, AT))
out = Path(__file__).resolve().parent / "assets" / "art" / "tile.png"
im.save(out, optimize=True, pnginfo=meta)
print(out, im.size, meta.chunks[0][1].decode())
