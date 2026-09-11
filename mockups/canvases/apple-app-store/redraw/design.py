"""Draw the traced glyphs again, the way they were designed.

Every icon in assets/icons is a trace: one polygon, hundreds of implicit
linetos, no curve anywhere, so the circles are faceted and the 45-degree edges
are staircases. But none of these shapes is organic - each is a handful of
primitives a designer would have drawn: a circle and a round-capped bar, a
stadium and an arc, a rounded rhombus stacked three times.

So each icon here is written as that construction, with its dimensions left as
parameters, and the parameters are fitted to the trace: render the candidate
and the trace at the same size and minimise the ink that disagrees. The fit
reports the number it lands on, so obvious intent - a radius that wants to be
half the width, an edge that wants to be 45 degrees - can be snapped by hand
afterwards.

    python3 design.py --fit mic          # fit and report, write nothing
    python3 design.py --write mic        # fit, then rewrite assets/icons/mic.svg
    python3 design.py --show mic         # ink disagreement as a PNG, for the eye
"""
from __future__ import annotations

import math
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.optimize import minimize

HERE = Path(__file__).resolve().parent
ICONS = HERE.parent / "assets" / "icons"
OUT = HERE.parent / "scratch" / "compare"
ZOOM = 16                       # px per pt while fitting

S2 = math.sqrt(0.5)


# ------------------------------------------------------------- rasterising

def viewbox(name: str):
    head = (ICONS / (name + ".svg")).read_text().split("\n", 1)[0]
    return [float(v) for v in head.split('viewBox="', 1)[1].split('"', 1)[0].split()]


def rasterise(svg: str, w: float, h: float) -> np.ndarray:
    """Ink coverage, 0..1, at ZOOM px per pt."""
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as f:
        f.write(svg)
        path = f.name
    png = path + ".png"
    subprocess.run(["rsvg-convert", "-z", str(ZOOM), "-b", "white", path, "-o", png],
                   check=True, capture_output=True)
    a = np.asarray(Image.open(png).convert("L"), float) / 255.0
    Path(path).unlink(), Path(png).unlink()
    want = (int(round(h * ZOOM)), int(round(w * ZOOM)))
    if a.shape != want:                       # rsvg rounds, pad or crop to match
        b = np.ones(want)
        r, c = min(a.shape[0], want[0]), min(a.shape[1], want[1])
        b[:r, :c] = a[:r, :c]
        a = b
    return 1.0 - a


def n(v: float) -> str:
    return ("%.2f" % v).rstrip("0").rstrip(".") or "0"


def pt(p) -> str:
    return " %s %s" % (n(p[0]), n(p[1]))


def wrap(name: str, body: str) -> str:
    x0, y0, w, h = viewbox(name)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%g" height="%g" '
            'viewBox="%g %g %g %g" fill="currentColor">\n'
            '<g transform="translate(%g %g)" fill="currentColor" '
            'stroke-linecap="round" stroke-linejoin="round">\n'
            '%s\n</g>\n</svg>\n' % (w, h, x0, y0, w, h, x0, y0, body))


# --------------------------------------------------------------- drawings
# Each builder takes its fitted parameters and returns SVG in local pt, with
# the glyph's ink box running 0..w by 0..h.

STROKE = 'fill="none" stroke="currentColor" stroke-width="%s"'


def rounded_poly(pts, radii) -> str:
    """A polygon whose corners are cut back and joined by an arc of radius r.

    The one primitive the tab bar is built out of: every sheet, platform and
    page here is a polygon with rounded corners. Writing it as arcs rather
    than stroking a skeleton keeps the outline free to take a notch.
    """
    q = [np.asarray(v, float) for v in pts]
    k = len(q)
    ins, outs, arcs = [], [], []
    for i in range(k):
        a, b, c = q[i - 1], q[i], q[(i + 1) % k]
        u, v = a - b, c - b
        u, v = u / np.linalg.norm(u), v / np.linalg.norm(v)
        half = math.acos(max(-1.0, min(1.0, float(u @ v)))) / 2
        t = min(radii[i] / math.tan(half) if radii[i] > 0 else 0.0,
                np.linalg.norm(a - b) / 2, np.linalg.norm(c - b) / 2)
        ins.append(b + u * t)
        outs.append(b + v * t)
        d1, d2 = b - a, c - b
        arcs.append((t * math.tan(half),
                     1 if d1[0] * d2[1] - d1[1] * d2[0] > 0 else 0))
    d = "M" + pt(ins[0])
    for i in range(k):
        r, sweep = arcs[i]
        d += ("A%s %s 0 0 %d%s" % (n(r), n(r), sweep, pt(outs[i]))) if r > 1e-6 \
            else "L" + pt(q[i])
        if i < k - 1:
            d += "L" + pt(ins[i + 1])
    return d + "Z"


def ellipse(cx, cy, rx, ry) -> str:
    return "M%s %sA%s %s 0 1 0 %s %sA%s %s 0 1 0 %s %sZ" % (
        n(cx - rx), n(cy), n(rx), n(ry), n(cx + rx), n(cy),
        n(rx), n(ry), n(cx - rx), n(cy))


def sheet(cx, cy, hw, hh, rr) -> str:
    """An isometric sheet: a rounded square, turned 45 degrees and squashed.

    Drawn as that transform rather than as a rhombus with circular corners,
    because that is what the corners of the trace actually are - ellipses.
    """
    a = hw / math.sqrt(2)
    return ('<g transform="translate(%s %s) scale(1 %s) rotate(45)">'
            '<rect x="%s" y="%s" width="%s" height="%s" rx="%s"/></g>' % (
                n(cx), n(cy), n(hh / hw), n(-a), n(-a), n(2 * a), n(2 * a), n(rr)))


def chevron(cx, hw, my, vy, t, rout, rin) -> str:
    """The sliver of a sheet left visible by the sheet resting on top of it.

    Not a stroked V: the sheets are stacked straight down, so what shows is a
    band of constant *vertical* depth t, which is fractionally deeper at the
    point than a stroke of the same weight would be.
    """
    return '<path d="%s"/>' % rounded_poly(
        [(cx - hw, my), (cx, vy), (cx + hw, my),
         (cx + hw, my - t), (cx, vy - t), (cx - hw, my - t)],
        [t / 2, rout, t / 2, t / 2, rin, t / 2])


def d_lens(p):
    """A ring and a bar at 45 degrees: magnifier, and the Search tab."""
    cx, cy, r, sw, hl = p
    return (('<circle cx="%s" cy="%s" r="%s" ' + STROKE + "/>\n"
             '<path d="M%s %sl%s %s" ' + STROKE + "/>") % (
                n(cx), n(cy), n(r), n(sw),
                n(cx + r * S2), n(cy + r * S2), n(hl * S2), n(hl * S2), n(sw)))


def d_mic(p):
    """A stadium, the cradle under it, a stem and a foot."""
    cx, sw, cw, ct, cb, ar, ay, at, sb, by, bw = p
    return (('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" ' + STROKE + "/>\n"
             '<path d="M%s %sV%sA%s %s 0 0 0 %s %sV%s" ' + STROKE + "/>\n"
             '<path d="M%s %sV%s" ' + STROKE + ' stroke-linecap="butt"/>\n'
             '<path d="M%s %sh%s" ' + STROKE + "/>") % (
                n(cx - cw / 2), n(ct), n(cw), n(cb - ct), n(cw / 2), n(sw),
                n(cx - ar), n(at), n(ay), n(ar), n(ar), n(cx + ar), n(ay), n(at), n(sw),
                n(cx), n(ay + ar - sw / 2), n(sb), n(sw),
                n(cx - bw / 2), n(by), n(bw), n(sw)))


def d_today(p):
    """A page: rounded frame, two rules, one solid block."""
    sw, x0, y0, x1, y1, rx, lw, ay, ax0, ax1, by, bx1, kx0, ky0, kx1, ky1, kr = p
    return (('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" ' + STROKE + "/>\n"
             '<path d="M%s %sH%s" ' + STROKE + "/>\n"
             '<path d="M%s %sH%s" ' + STROKE + "/>\n"
             '<rect x="%s" y="%s" width="%s" height="%s" rx="%s"/>') % (
                n(x0), n(y0), n(x1 - x0), n(y1 - y0), n(rx), n(sw),
                n(ax0 + lw / 2), n(ay), n(ax1 - lw / 2), n(lw),
                n(ax0 + lw / 2), n(by), n(bx1 - lw / 2), n(lw),
                n(kx0), n(ky0), n(kx1 - kx0), n(ky1 - ky0), n(kr)))


def d_apps(p):
    """Three sheets in a stack: the top one whole, the others a sliver each."""
    cx, cy, hw, hh, rr, dy, t, chw, cvy, rout, rin = p
    return "\n".join([chevron(cx, chw, cy + 2 * dy, cvy + 2 * dy, t, rout, rin),
                      chevron(cx, chw, cy + dy, cvy + dy, t, rout, rin),
                      sheet(cx, cy, hw, hh, rr)])


def d_arcade(p):
    """A joystick: a ball, and a platform with the stick cut out of it."""
    (cx, ty, my, by, hw, rh, rv, slw, slb, bx, bmy, bvy, bw, brout, brin,
     bcy, br, ex, ey, erx, ery) = p
    yl = my + (ty - my) * (1 - (slw / 2) / hw)      # where the slot meets the edge
    platform = rounded_poly(
        [(cx - hw, my), (cx - slw / 2, yl), (cx - slw / 2, slb - slw / 2),
         (cx + slw / 2, slb - slw / 2), (cx + slw / 2, yl), (cx + hw, my), (cx, by)],
        [rh, 0, slw / 2, slw / 2, 0, rh, rv])
    return "\n".join([
        chevron(cx, bx, bmy, bvy, bw, brout, brin),
        '<path fill-rule="evenodd" d="%s%s"/>' % (platform, ellipse(ex, ey, erx, ery)),
        '<circle cx="%s" cy="%s" r="%s"/>' % (n(cx), n(bcy), n(br)),
    ])


SPEC = {
    # name: (builder, [start values], [parameter names])
    "magnifier": (d_lens, [6.36, 6.36, 5.54, 1.63, 6.15], "cx cy r sw handle".split()),
    "tab-search": (d_lens, [9.07, 9.05, 8.04, 2.06, 9.03], "cx cy r sw handle".split()),
    "mic": (d_mic, [5.95, 1.46, 4.51, 0.73, 10.53, 5.26, 8.28, 6.4, 15.81, 16.49, 7.07],
            "cx sw capw capt capb arcr arcy arctop stemb basey basew".split()),
    "tab-today": (d_today,
                  [1.96, 0.99, 0.94, 18.27, 23.43, 2.29, 1.28, 5.26, 4.62, 14.90,
                   8.45, 11.28, 3.96, 11.08, 15.29, 20.40, 1.19],
                  ("sw x0 y0 x1 y1 rx lw ay ax0 ax1 by bx1 "
                   "kx0 ky0 kx1 ky1 kr").split()),
    "tab-apps": (d_apps, [12.11, 6.32, 14.79, 6.94, 2.27, 5.38, 3.2, 11.26, 11.43,
                          2.4, 1.2],
                 "cx cy hw hh rr dy depth chw cvy rout rin".split()),
    "tab-arcade": (d_arcade,
                   [13.66, 7.2, 14.47, 20.9, 13.9, 2.2, 2.2, 1.90, 15.3,
                    13.56, 19.4, 25.0, 2.9, 2.2, 1.2, 3.67, 3.67, 5.3, 14.25,
                    1.9, 1.15],
                   ("cx ty my by hw rh rv slotw slotbot bandx bandy bandvy "
                    "banddepth bandrout bandrin bally ballr ovx ovy ovrx "
                    "ovry").split()),
}


# ------------------------------------------------------------------- fit

def loss_for(name: str):
    x0, y0, w, h = viewbox(name)
    target = rasterise((ICONS / (name + ".svg")).read_text(), w, h)
    build, _, _ = SPEC[name]

    def loss(p):
        try:
            a = rasterise(wrap(name, build(p)), w, h)
        except subprocess.CalledProcessError:
            return 1.0
        return float(np.abs(a - target).mean())

    return loss, target, w, h


def fit(name: str):
    build, p0, names = SPEC[name]
    loss, target, w, h = loss_for(name)
    best = minimize(loss, np.array(p0, float), method="Nelder-Mead",
                    options=dict(maxfev=4000, xatol=0.004, fatol=2e-6))
    p = best.x
    print("== %s   disagreeing ink %.4f -> %.4f" % (name, loss(np.array(p0)), best.fun))
    print("   " + "  ".join("%s=%.3f" % (k, v) for k, v in zip(names, p)))
    return p, target, w, h


def compare(name: str, p, target, w, h):
    OUT.mkdir(exist_ok=True)
    mine = rasterise(wrap(name, SPEC[name][0](p)), w, h)
    img = np.stack([1 - target, 1 - mine, np.ones_like(mine)], -1)
    Image.fromarray((img * 255).astype("uint8")).resize(
        (int(w * ZOOM * 2), int(h * ZOOM * 2)), Image.NEAREST).save(OUT / (name + ".png"))
    print("   red = only the trace, green = only the redraw -> %s" % (OUT / (name + ".png")))


if __name__ == "__main__":
    args = sys.argv[1:]
    names = [a for a in args if not a.startswith("--")] or list(SPEC)
    for name in names:
        p, target, w, h = fit(name)
        compare(name, p, target, w, h)
        if "--write" in args:
            (ICONS / (name + ".svg")).write_text(wrap(name, SPEC[name][0](p)))
            print("   wrote %s" % (ICONS / (name + ".svg")))
