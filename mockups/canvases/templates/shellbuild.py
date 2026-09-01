"""Turn a 2x Figma export of the mockup frame into an alpha-punched shell.

    python3 shellbuild.py export.png shell.png

then base64 the result into assets.json under the key gen.py expects. The
source is the Figma community file "iPhone 16 / 17 Free Mockup",
bqWOZpJAPlI8sF35bFP9Cv, exported at scale 2 -- one frame per colourway, and
the layer names lie about which colour that is (see gen.py):

    17 Pro   2901:3396 deep blue    2901:3419 silver    2901:5295 cosmic orange
    16 Pro    901:932  blue tit.     901:886  natural    901:863  white
              901:1830 desert titanium, which the file calls "space black"

The art is 1300 x 2642 units; every phone in the file shares that geometry.
Exported at scale 2, so 1 unit = 2 px:

    screen window  (65, 55)  1170 x 2532, corner 164   -> (130, 110)  2340 x 5064, r 328
    camera pill    (465, 95)  370 x 108, fully round   -> (930, 190)   740 x 216,  r 108

Punch = screen minus the camera pill, so the Dynamic Island survives as art.
The pill is eroded 2 px first: its rim is anti-aliased against the wallpaper
underneath, and without the erosion that rim fringes onto the live screen.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT_W, OUT_H = 874, 1776
SCREEN = (130, 110, 2340, 5064, 328.0)
ISLAND = (930, 190, 740, 216, 108.0)


def rrect(shape, x, y, w, h, r, grow=0.0):
    """Signed-distance coverage of a rounded rect, 1 inside, 0 outside."""
    r = r + grow
    cx, cy = x + w / 2.0, y + h / 2.0
    hx, hy = w / 2.0 + grow - r, h / 2.0 + grow - r
    ys, xs = np.ogrid[:shape[0], :shape[1]]
    qx = np.abs(xs - cx) - hx
    qy = np.abs(ys - cy) - hy
    d = (np.minimum(np.maximum(qx, qy), 0)
         + np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) - r)
    return np.clip(0.5 - d, 0, 1)


def build(src, dst):
    a = np.asarray(Image.open(src).convert("RGB")).astype(np.float64)

    # the white export ground, reached from the four corners; anything white
    # but enclosed by the phone is not ground and must stay opaque
    lab, _ = ndimage.label((a >= 250).all(2))
    h, w = lab.shape
    ground = np.isin(lab, [n for n in {lab[0, 0], lab[0, w - 1],
                                       lab[h - 1, 0], lab[h - 1, w - 1]} if n])

    punch = rrect(lab.shape, *SCREEN) * (1 - rrect(lab.shape, *ISLAND, grow=-2.0))
    alpha = np.where(ground, 0.0, 255.0 * (1.0 - punch))

    # premultiply across the downscale so punched edges cannot halo
    pm = np.concatenate([a * (alpha[..., None] / 255.0), alpha[..., None]], 2)
    sm = np.dstack([np.asarray(Image.fromarray(pm[..., i].astype(np.float32), "F")
                               .resize((OUT_W, OUT_H), Image.LANCZOS))
                    for i in range(4)]).astype(np.float64)
    al = np.clip(sm[..., 3], 0, 255)
    rgb = np.divide(sm[..., :3], np.where(al[..., None] > 0, al[..., None] / 255.0, 1))
    Image.fromarray(np.concatenate(
        [np.clip(rgb, 0, 255), al[..., None]], 2).round().astype(np.uint8),
        "RGBA").save(dst)


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
