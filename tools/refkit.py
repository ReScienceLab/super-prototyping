#!/usr/bin/env python3
"""refkit — reference-to-mockup toolkit.

  grid     overlay a labelled measuring grid ON a reference image, so colours
           and metrics can be read VISUALLY (element -> value), not blindly
  sample   colour census of a region: true fills, small-element modes
  hairline solve a sub-pixel border/divider colour from its ink coverage
  shoot    render mockup HTML with headless Chrome at artboard size
  montage  lay images side by side for an A/B compare

Needs: pillow, numpy. Chrome only for `shoot`.
"""
import argparse, glob, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def _rgb(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.uint8)


def _hex(c):
    return "#%02X%02X%02X" % tuple(int(v) for v in c)


def cmd_grid(a):
    im = Image.open(a.image).convert("RGB")
    z = a.zoom
    big = im.resize((im.width * z, im.height * z), Image.NEAREST)
    d = ImageDraw.Draw(big, "RGBA")
    for x in range(0, im.width, a.minor):
        d.line([(x * z, 0), (x * z, big.height)], fill=(0, 200, 255, 90))
    for y in range(0, im.height, a.minor):
        d.line([(0, y * z), (big.width, y * z)], fill=(0, 200, 255, 90))
    for x in range(0, im.width, a.major):
        d.line([(x * z, 0), (x * z, big.height)], fill=(255, 0, 0, 190))
        d.text((x * z + 2, 2), str(x), fill=(255, 0, 0, 255))
    for y in range(0, im.height, a.major):
        d.line([(0, y * z), (big.width, y * z)], fill=(255, 0, 0, 190))
        d.text((2, y * z + 2), str(y), fill=(255, 0, 0, 255))
    big.save(a.out)
    print(f"{a.out}  {big.size}  src {im.size}  minor {a.minor}px  major {a.major}px  zoom {z}x")
    print("Now READ this image with the Read tool. Label every colour you sample "
          "with the UI element it belongs to before writing it into a token.")


def cmd_sample(a):
    px = _rgb(a.image)[a.y0:a.y1, a.x0:a.x1]
    if px.size == 0:
        sys.exit("empty region")
    # A flat pixel equals all four neighbours -> it is a real fill, not an
    # antialiased edge. Fills read off the flat mask; small elements have no
    # flat interior, so fall back to the plain mode.
    c = px[1:-1, 1:-1]
    flat = ((c == px[:-2, 1:-1]).all(-1) & (c == px[2:, 1:-1]).all(-1)
            & (c == px[1:-1, :-2]).all(-1) & (c == px[1:-1, 2:]).all(-1))
    for label, sel in (("flat fills", c[flat] if flat.any() else None),
                       ("all pixels", px.reshape(-1, 3))):
        if sel is None or len(sel) == 0:
            print(f"{label}: none (region too small / all antialiased)")
            continue
        vals, counts = np.unique(sel.reshape(-1, 3), axis=0, return_counts=True)
        order = counts.argsort()[::-1][:a.top]
        print(f"{label}  n={len(sel)}")
        for i in order:
            print(f"  {_hex(vals[i])}  {counts[i]:6d}  {100*counts[i]/len(sel):5.1f}%")


def cmd_hairline(a):
    """A 1pt rule in a downscaled capture never reaches its true colour.
    Sum the ink deficit across the band, divide by the capture scale to get
    full-coverage ink, subtract from the background."""
    px = _rgb(a.image)[a.y0:a.y1, a.x0:a.x1].astype(float)
    bg = np.array([int(a.bg[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)
    axis = 0 if (a.y1 - a.y0) <= (a.x1 - a.x0) else 1   # sum across the thin axis
    band = px.mean(axis=1 - axis)                        # average along the rule
    ink = (bg - band).sum(axis=0) / a.scale
    print(f"bg {_hex(bg)}  scale {a.scale}  band {band.shape[0]}px")
    print(f"solved rule colour: {_hex(np.clip(bg - ink, 0, 255))}")


def cmd_shoot(a):
    os.makedirs(a.out, exist_ok=True)
    for f in [p for g in a.html for p in sorted(glob.glob(g))]:
        png = os.path.join(a.out, os.path.splitext(os.path.basename(f))[0] + ".png")
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        f"--force-device-scale-factor={a.scale}",
                        f"--window-size={a.w},{a.h}", f"--screenshot={png}",
                        "file://" + os.path.abspath(f)],
                       check=True, capture_output=True)
        print(png, Image.open(png).size)


def cmd_montage(a):
    ims = [Image.open(p).convert("RGB") for g in a.images for p in sorted(glob.glob(g))]
    ims = [i.resize((max(1, int(i.width * a.height / i.height)), a.height)) for i in ims]
    out = Image.new("RGB", (sum(i.width for i in ims), a.height), "white")
    x = 0
    for i in ims:
        out.paste(i, (x, 0)); x += i.width
    out.save(a.out)
    print(a.out, out.size)


p = argparse.ArgumentParser(prog="refkit")
s = p.add_subparsers(dest="cmd", required=True)

g = s.add_parser("grid"); g.set_defaults(fn=cmd_grid)
g.add_argument("image"); g.add_argument("-o", "--out", required=True)
g.add_argument("--zoom", type=int, default=3)
g.add_argument("--minor", type=int, default=10)
g.add_argument("--major", type=int, default=50)

v = s.add_parser("sample"); v.set_defaults(fn=cmd_sample)
v.add_argument("image"); v.add_argument("x0", type=int); v.add_argument("y0", type=int)
v.add_argument("x1", type=int); v.add_argument("y1", type=int)
v.add_argument("--top", type=int, default=6)

h = s.add_parser("hairline"); h.set_defaults(fn=cmd_hairline)
h.add_argument("image"); h.add_argument("x0", type=int); h.add_argument("y0", type=int)
h.add_argument("x1", type=int); h.add_argument("y1", type=int)
h.add_argument("--bg", required=True, help="background hex, no #")
h.add_argument("--scale", type=float, required=True, help="capture px per design pt")

t = s.add_parser("shoot"); t.set_defaults(fn=cmd_shoot)
t.add_argument("html", nargs="+"); t.add_argument("-o", "--out", required=True)
t.add_argument("--w", type=int, default=478); t.add_argument("--h", type=int, default=980)
t.add_argument("--scale", type=int, default=2)

m = s.add_parser("montage"); m.set_defaults(fn=cmd_montage)
m.add_argument("images", nargs="+"); m.add_argument("-o", "--out", required=True)
m.add_argument("--height", type=int, default=520)

a = p.parse_args(); a.fn(a)
