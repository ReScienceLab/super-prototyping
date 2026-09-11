"""Redraw a traced glyph as designed vector artwork.

The icons in assets/icons were traced off a screenshot, so every one of them is
a polygon of hundreds of implicit linetos: the edges are faceted and the
"circles" are not circles. This turns such a polygon back into the drawing a
designer would have made:

  1. resample and smooth the contour, which kills the tracing jitter;
  2. find the corners, the points where the outline genuinely turns;
  3. between two corners fit the simplest thing that holds - a line, then a
     circular arc, then a cubic Bezier - so a round corner comes out as one
     `A` and a straight edge as one `L`.

The result keeps the file's viewBox, so gen.py places it exactly where the
trace was placed.

    python3 refit.py --list mic            # what it found, no writing
    python3 refit.py --write mic magnifier # rewrite those files
"""
from __future__ import annotations

import math
import os
import sys
from pathlib import Path

import numpy as np

ICONS = Path(__file__).resolve().parent.parent / "assets" / "icons"

STEP = 0.02                                      # pt between resampled points
SIGMA = float(os.environ.get("SIGMA", 0.22))     # pt, smoothing along the contour
TOL = float(os.environ.get("TOL", 0.09))         # pt, worst deviation a fit may have
CORNER = float(os.environ.get("CORNER", 45))     # deg turned over CORNER_SPAN
CORNER_SPAN = float(os.environ.get("SPAN", 0.7))  # pt


# ---------------------------------------------------------------- contours

def parse(d: str) -> list[np.ndarray]:
    """The traces are M + implicit linetos + Z, nothing else."""
    out = []
    for chunk in d.replace("Z", " ").split("M"):
        nums = [float(v) for v in chunk.split()]
        if len(nums) >= 6:
            out.append(np.array(nums, float).reshape(-1, 2))
    return out


def resample(pts: np.ndarray, step: float) -> np.ndarray:
    """Uniform arc-length samples around a closed contour."""
    loop = np.vstack([pts, pts[:1]])
    seg = np.linalg.norm(np.diff(loop, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(16, int(round(s[-1] / step)))
    t = np.linspace(0, s[-1], n, endpoint=False)
    return np.column_stack([np.interp(t, s, loop[:, 0]), np.interp(t, s, loop[:, 1])])


def smooth(pts: np.ndarray, sigma: float, step: float) -> np.ndarray:
    r = max(1, int(round(3 * sigma / step)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) * step / sigma) ** 2)
    k /= k.sum()
    wrap = np.vstack([pts[-r:], pts, pts[:r]])
    return np.column_stack([np.convolve(wrap[:, i], k, "valid") for i in (0, 1)])


def corners(pts: np.ndarray, step: float) -> list[int]:
    """Indices where the outline turns more than CORNER over CORNER_SPAN."""
    k = max(2, int(round(CORNER_SPAN / step / 2)))
    a = pts - np.roll(pts, k, axis=0)
    b = np.roll(pts, -k, axis=0) - pts
    ang = np.degrees(np.abs(np.arctan2((a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]), (a * b).sum(1))))
    hits = []
    n = len(pts)
    for i in np.flatnonzero(ang > CORNER):
        w = [(i + j) % n for j in range(-k, k + 1)]
        if ang[i] >= ang[w].max() and not any((i - h) % n < 2 * k or (h - i) % n < 2 * k
                                              for h in hits):
            hits.append(int(i))
    return sorted(hits)


# ------------------------------------------------------------------- fits

def fit_line(p: np.ndarray) -> float:
    v = p[-1] - p[0]
    n = np.linalg.norm(v)
    if n < 1e-9:
        return 0.0
    v = v / n
    return float(np.abs((p - p[0])[:, 0] * v[1] - (p - p[0])[:, 1] * v[0]).max())


def fit_circle(p: np.ndarray):
    """Kasa fit; returns (cx, cy, r, worst radial error)."""
    x, y = p[:, 0], p[:, 1]
    a = np.column_stack([x, y, np.ones(len(p))])
    try:
        sol, *_ = np.linalg.lstsq(a, x * x + y * y, rcond=None)
    except np.linalg.LinAlgError:
        return None
    cx, cy = sol[0] / 2, sol[1] / 2
    rr = sol[2] + cx * cx + cy * cy
    if rr <= 0:
        return None
    r = math.sqrt(rr)
    err = float(np.abs(np.hypot(x - cx, y - cy) - r).max())
    return cx, cy, r, err


def bezier(ctrl: np.ndarray, t: np.ndarray) -> np.ndarray:
    u = 1 - t
    return (u ** 3)[:, None] * ctrl[0] + (3 * u * u * t)[:, None] * ctrl[1] \
        + (3 * u * t * t)[:, None] * ctrl[2] + (t ** 3)[:, None] * ctrl[3]


def fit_bezier(p: np.ndarray, t0: np.ndarray, t1: np.ndarray):
    """Least squares cubic through p with the given unit end tangents."""
    d = np.linalg.norm(np.diff(p, axis=0), axis=1)
    t = np.concatenate([[0], np.cumsum(d)])
    t = t / t[-1] if t[-1] > 0 else t
    best = None
    for _ in range(6):
        u = 1 - t
        a1 = (3 * u * u * t)[:, None] * t0
        a2 = (3 * u * t * t)[:, None] * t1
        rhs = p - (u ** 3)[:, None] * p[0] - (t ** 3)[:, None] * p[-1]
        m = np.array([[(a1 * a1).sum(), (a1 * a2).sum()],
                      [(a1 * a2).sum(), (a2 * a2).sum()]])
        v = np.array([(a1 * rhs).sum(), (a2 * rhs).sum()])
        try:
            alpha = np.linalg.solve(m, v)
        except np.linalg.LinAlgError:
            break
        chord = np.linalg.norm(p[-1] - p[0])
        alpha = np.clip(alpha, 1e-3, 3 * chord)
        ctrl = np.array([p[0], p[0] + alpha[0] * t0, p[-1] + alpha[1] * t1, p[-1]])
        err = float(np.linalg.norm(bezier(ctrl, t) - p, axis=1).max())
        if best is None or err < best[1]:
            best = (ctrl, err)
        # Newton reparameterisation
        u = 1 - t
        dv = 3 * (u * u)[:, None] * (ctrl[1] - ctrl[0]) + 6 * (u * t)[:, None] * \
            (ctrl[2] - ctrl[1]) + 3 * (t * t)[:, None] * (ctrl[3] - ctrl[2])
        d2 = 6 * u[:, None] * (ctrl[2] - 2 * ctrl[1] + ctrl[0]) + \
            6 * t[:, None] * (ctrl[3] - 2 * ctrl[2] + ctrl[1])
        diff = bezier(ctrl, t) - p
        num = (diff * dv).sum(1)
        den = (dv * dv).sum(1) + (diff * d2).sum(1)
        t = np.clip(t - np.where(np.abs(den) > 1e-12, num / den, 0), 0, 1)
        t[0], t[-1] = 0, 1
    return best


def tangent(pts: np.ndarray, i: int, ahead: bool, k: int = 6) -> np.ndarray:
    n = len(pts)
    v = pts[(i + k) % n] - pts[i] if ahead else pts[i] - pts[(i - k) % n]
    d = np.linalg.norm(v)
    return v / d if d > 1e-9 else np.array([1.0, 0.0])


# ------------------------------------------------------------------ emit

def num(v: float) -> str:
    return ("%.2f" % v).rstrip("0").rstrip(".") or "0"


def pt(p) -> str:
    return "%s %s" % (num(p[0]), num(p[1]))


def piece(p: np.ndarray, t0, t1, depth: int, notes: list) -> str:
    """One corner-to-corner run of the contour as the simplest thing that fits."""
    if len(p) < 3:
        return "L" + pt(p[-1])
    if fit_line(p) <= TOL:
        notes.append("line %.2f" % np.linalg.norm(p[-1] - p[0]))
        return "L" + pt(p[-1])
    c = fit_circle(p)
    if c and c[3] <= TOL and c[2] < 400:
        cx, cy, r, _ = c
        mid = p[len(p) // 2]
        sweep = 1 if float(np.cross(np.append(p[len(p) // 2] - p[0], 0),
                              np.append(p[-1] - p[len(p) // 2], 0))[2]) > 0 else 0
        # half the run's angle decides the large-arc flag
        a0 = math.atan2(p[0][1] - cy, p[0][0] - cx)
        a1 = math.atan2(p[-1][1] - cy, p[-1][0] - cx)
        span = (a1 - a0) % (2 * math.pi) if sweep else (a0 - a1) % (2 * math.pi)
        notes.append("arc r=%.2f c=(%.2f,%.2f) %.0fdeg" % (r, cx, cy, math.degrees(span)))
        return "A%s %s 0 %d %d %s" % (num(r), num(r), 1 if span > math.pi else 0,
                                      sweep, pt(p[-1]))
    b = fit_bezier(p, t0, t1)
    if b and (b[1] <= TOL or depth >= 8 or len(p) < 10):
        ctrl = b[0]
        notes.append("bezier err=%.3f" % b[1])
        return "C%s %s %s" % (pt(ctrl[1]), pt(ctrl[2]), pt(ctrl[3]))
    h = len(p) // 2
    tm = p[min(h + 3, len(p) - 1)] - p[max(h - 3, 0)]
    tm = tm / (np.linalg.norm(tm) or 1)
    return piece(p[:h + 1], t0, -tm, depth + 1, notes) + \
        piece(p[h:], tm, t1, depth + 1, notes)


def contour_path(raw: np.ndarray, notes: list) -> str:
    pts = smooth(resample(raw, STEP), SIGMA, STEP)
    cs = corners(pts, STEP)
    n = len(pts)
    if len(cs) < 3:                              # too few to chord the loop
        c = fit_circle(pts)
        if c and c[3] <= TOL:
            cx, cy, r, _ = c
            notes.append("circle r=%.3f c=(%.2f,%.2f)" % (r, cx, cy))
            return "M%s %sA%s %s 0 1 0 %s %sA%s %s 0 1 0 %s %sZ" % (
                num(cx - r), num(cy), num(r), num(r), num(cx + r), num(cy),
                num(r), num(r), num(cx - r), num(cy))
        cs = [0, n // 3, 2 * n // 3]
    d = "M" + pt(pts[cs[0]])
    for j, a in enumerate(cs):
        b = cs[(j + 1) % len(cs)]
        run = pts[a:b + 1] if b > a else np.vstack([pts[a:], pts[:b + 1]])
        d += piece(run, tangent(pts, a, True), tangent(pts, b, False), 0, notes)
    return d + "Z"


def redraw(name: str) -> tuple[str, list[str]]:
    src = (ICONS / (name + ".svg")).read_text()
    head = src.split("\n", 1)[0]
    d = src.split(' d="', 1)[1].split('"', 1)[0]
    notes, parts = [], []
    for raw in parse(d):
        notes.append("-- contour %d, %d traced points" % (len(parts) + 1, len(raw)))
        parts.append(contour_path(raw, notes))
    return head + '\n<path fill-rule="evenodd" d="%s"/>\n</svg>\n' % "".join(parts), notes


def compare(name: str, svg: str) -> None:
    """Overlay the redraw on the trace: cyan is trace only, magenta redraw only."""
    import importlib.util

    import numpy as np
    from PIL import Image
    spec = importlib.util.spec_from_file_location(
        "design", Path(__file__).resolve().parent / "design.py")
    design = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(design)
    _, _, w, h = design.viewbox(name)
    was = design.rasterise((ICONS / (name + ".svg")).read_text(), w, h)
    now = design.rasterise(svg, w, h)
    out = design.OUT / (name + ".png")
    out.parent.mkdir(exist_ok=True)
    img = np.stack([1 - was, 1 - now, np.ones_like(now)], -1)
    Image.fromarray((img * 255).astype("uint8")).resize(
        (int(w * design.ZOOM * 2), int(h * design.ZOOM * 2)), Image.NEAREST).save(out)
    print("   disagreeing ink %.4f -> %s" % (float(np.abs(was - now).mean()), out))


if __name__ == "__main__":
    args = sys.argv[1:]
    names = [a for a in args if not a.startswith("--")]
    for name in names:
        svg, notes = redraw(name)
        old = (ICONS / (name + ".svg")).stat().st_size
        anchors = sum(svg.count(c) for c in "MLAC")
        print("\n== %s  %d -> %d bytes, %d anchors"
              % (name, old, len(svg), anchors))
        for line in notes:
            print("   " + line)
        if "--show" in args:
            compare(name, svg)
        if "--write" in args:
            (ICONS / (name + ".svg")).write_text(svg)
