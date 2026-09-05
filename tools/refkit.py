#!/usr/bin/env python3
"""refkit, a reference-to-mockup toolkit.

  grid     overlay a labelled measuring grid ON a reference image, so colours
           and metrics can be read VISUALLY (element -> value), not blindly
  sample   colour census of a region: true fills, small-element modes, ink core
  bands    ink-fraction profile -> the bands an element occupies, and the pitch
           between them (row height, baselines, list rhythm)
  bbox     bounding box of the dark (or bright) pixels in a region.
           --grow instead grows the box to the ink it actually touches, which
           is the one to use for a crop: a threshold stops at a pale edge
  ink      bbox of the centred connected components only: the glyph, where
           `bbox` on the same window would return the neighbouring label too
  scan     walk one row/column and collapse it into colour runs. Finds an
           edge (sheet top, card inset) to the pixel
  batch    run a probes.json of measurements in one process; --against DIR
           adds a ref-vs-render delta table with the w/h ratios that make
           icon sizing converge instead of oscillate
  crops    per-probe ref|render crop pairs, NEAREST-zoomed. Numbers are good
           at size and useless at shape; this is the shape check
  key      chroma-key a generated asset off its flat ground, unpremultiply
           the edge spill, trim, and fit it to the measured box
  hairline solve a sub-pixel border/divider colour from its ink coverage
  font     name the type face in a region. Renders the word in every candidate
           and ranks by glyph shape, so it can answer "SF Pro"
  shoot    render mockup HTML with headless Chrome at artboard size
  diff     side-by-side + per-region census of a render against its reference
  tokens   audit a canvas folder: one shared :root, no undefined var()
  montage  lay images side by side for an A/B compare

Region arguments are capture pixels by default. Pass `--pt SCALE` (capture px
per design pt) to give them in design pt instead, so they match the numbers you
read off `grid` and the numbers that end up in the CSS. Every reported
coordinate comes back in the same unit you asked in.

Needs: pillow, numpy. Chrome only for `shoot`.
Self-check: python3 tools/test_refkit.py (from a checkout; not shipped in the wheel)
"""
import argparse, contextlib, glob, io, json, os, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PHONE_FRAME = "1D191A"          # the shared artboard phone frame's bezel colour
PHONE_RADIUS = 52               # .phone border-radius, in design pt


_IMG = {}                       # path-keyed: a batch decodes each capture once


def _flat(p):
    """Open as RGB. A cropped phone screen carries transparent 52pt corners;
    flatten them onto white rather than dropping the alpha and exposing the
    black bezel they were cut out of."""
    if p in _IMG:
        return _IMG[p]
    im = Image.open(p)
    if "A" in im.getbands():
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, "white")
        bg.paste(im, mask=im.getchannel("A"))
        im = bg
    _IMG[p] = im = im.convert("RGB")
    return im


def _rgb(p):
    return np.asarray(_flat(p), dtype=np.uint8)


def _hex(c):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in c)


def _k(a):
    return a.pt or 1.0


def _box(a):
    """Region args -> pixel slice bounds, honouring --pt."""
    k = _k(a)
    return [int(round(v * k)) for v in (a.x0, a.y0, a.x1, a.y1)]


def _flatsel(px):
    """Pixels equal to all four neighbours: a real fill, not an antialiased
    edge. Returns None when nothing in the region is flat, which is the
    normal case for anything smaller than a chip."""
    c = px[1:-1, 1:-1]
    if not c.size:
        return None
    flat = ((c == px[:-2, 1:-1]).all(-1) & (c == px[2:, 1:-1]).all(-1)
            & (c == px[1:-1, :-2]).all(-1) & (c == px[1:-1, 2:]).all(-1))
    return c[flat] if flat.any() else None


def _fill(px):
    """Dominant colour of a region: its flat fill, or the plain mode when the
    element is too small to have a flat interior. -> (hex, count, n)"""
    sel = _flatsel(px)
    if sel is None or not len(sel):
        sel = px.reshape(-1, 3)
    vals, counts = np.unique(sel.reshape(-1, 3), axis=0, return_counts=True)
    i = int(counts.argmax())
    return _hex(vals[i]), int(counts[i]), len(sel)


def _runs(f, minfrac):
    """Contiguous index spans where the profile exceeds minfrac."""
    out, s = [], None
    for i, v in enumerate(f):
        if v > minfrac and s is None:
            s = i
        elif v <= minfrac and s is not None:
            out.append((s, i)); s = None
    if s is not None:
        out.append((s, len(f)))
    return out


def cmd_grid(a):
    im = _flat(a.image)
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
    x0, y0, x1, y1 = _box(a)
    px = _rgb(a.image)[y0:y1, x0:x1]
    if px.size == 0:
        sys.exit("empty region")
    flat = _flatsel(px)
    pairs = (("flat fills", flat), ("all pixels", px.reshape(-1, 3)))
    for label, sel in (pairs if a.only != "ink" else ()):
        if sel is None or len(sel) == 0:
            print(f"{label}: none (region too small / all antialiased)")
            continue
        vals, counts = np.unique(sel.reshape(-1, 3), axis=0, return_counts=True)
        order = counts.argsort()[::-1][:a.top]
        print(f"{label}  n={len(sel)}")
        for i in order:
            print(f"  {_hex(vals[i])}  {counts[i]:6d}  {100*counts[i]/len(sel):5.1f}%")
    # Text has no flat interior at any realistic size; its true ink is the mean
    # of the darkest few percent, not the mode (which returns the background).
    if a.only == "flat":
        return
    v = px.reshape(-1, 3)
    n = max(1, int(len(v) * a.ink / 100))
    # On a dark UI the ink is the brightest pixels, not the darkest, and the
    # darkest percentile returns the background: same trap, opposite polarity.
    order = v.mean(1).argsort()
    end = "brightest" if a.bright else "darkest"
    sel = order[-n:] if a.bright else order[:n]
    print(f"ink core ({end} {a.ink}%): {_hex(v[sel].mean(0))}")


def cmd_bands(a):
    """Where the ink actually sits. Row pitch, baselines and list rhythm come
    off this profile. If every band you measure is a unique number, you are
    reading antialiasing rather than layout."""
    x0, y0, x1, y1 = _box(a)
    r = _rgb(a.image)[y0:y1, x0:x1].mean(2)
    across = 1 if a.axis == "rows" else 0
    base = y0 if across else x0
    f = (r < a.thr).mean(across)
    k = _k(a)
    prev = None
    for s, e in _runs(f, a.minfrac):
        lo, hi = (base + s) / k, (base + e) / k
        print(f"{lo:9.1f} .. {hi:9.1f}   size {hi-lo:6.1f}"
              + (f"   pitch {lo-prev:6.1f}" if prev is not None else ""))
        prev = lo


def _grow_box(px, seed, tol):
    """Grow a seed box to the ink it actually touches -> (box, ground, edge).

    A luminance threshold answers "which pixels here are ink", and stops at
    the first low-contrast edge: pale skin on white is under any threshold
    that does not also take the page, so a box measured that way cuts the
    ears off the figure and reports a confident number for the rest. This
    asks the other question, "how far does the thing I am pointing at go",
    by labelling the ink in a padded window and keeping only the components
    the seed already sits on, so a neighbouring element cannot drag the box
    outwards while a 1-level edge still can.

    The ground is the modal colour of the window's 1px ring rather than an
    argument, because the ring is background by construction whenever the
    padding is real, and hardcoding white gets a header wrong.

    `edge` is the sides where the result runs into the window: there the
    component escaped the padding, which usually means it merged with a
    neighbour, and the answer is not to be trusted.
    """
    ring = np.concatenate([px[0], px[-1], px[:, 0], px[:, -1]]).astype(int)
    key = (ring[:, 0] << 16) | (ring[:, 1] << 8) | ring[:, 2]
    vals, cnt = np.unique(key, return_counts=True)
    g = int(vals[cnt.argmax()])
    ground = np.array([(g >> 16) & 255, (g >> 8) & 255, g & 255], float)
    m = np.abs(px.astype(float) - ground).max(-1) > tol
    lab = _label(m)
    sx0, sy0, sx1, sy1 = seed
    keep = np.unique(lab[sy0:sy1, sx0:sx1])
    keep = keep[keep > 0]
    if not keep.size:
        return None, ground, ""
    ys, xs = np.nonzero(np.isin(lab, keep))
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    edge = "".join(n for n, hit in
                   (("L", box[0] == 0), ("T", box[1] == 0),
                    ("R", box[2] == px.shape[1]), ("B", box[3] == px.shape[0])) if hit)
    return box, ground, edge


def cmd_bbox(a):
    x0, y0, x1, y1 = _box(a)
    px = _rgb(a.image)
    k = _k(a)
    if a.grow:
        pad = int(round(a.pad * k))
        wx0, wy0 = max(0, x0 - pad), max(0, y0 - pad)
        wx1, wy1 = min(px.shape[1], x1 + pad), min(px.shape[0], y1 + pad)
        box, ground, edge = _grow_box(
            px[wy0:wy1, wx0:wx1], (x0 - wx0, y0 - wy0, x1 - wx0, y1 - wy0), a.tol)
        if box is None:
            sys.exit("nothing but ground inside the box. Check the region")
        bx0, by0 = (wx0 + box[0]) / k, (wy0 + box[1]) / k
        bx1, by1 = (wx0 + box[2]) / k, (wy0 + box[3]) / k
        print(f"x0 {bx0:.1f}  y0 {by0:.1f}  x1 {bx1:.1f}  y1 {by1:.1f}"
              f"   w {bx1-bx0:.1f}  h {by1-by0:.1f}   ground {_hex(ground)}"
              f"   grow L{x0/k-bx0:+.1f} T{y0/k-by0:+.1f} "
              f"R{bx1-x1/k:+.1f} B{by1-y1/k:+.1f}")
        if edge:
            print(f"  ! runs into the {edge} window edge: the component escaped "
                  f"--pad {a.pad:g}, so it has probably merged with a neighbour. "
                  f"Widen --pad, or distrust those sides.")
        return
    r = px[y0:y1, x0:x1].mean(2)
    m = (r > a.bright) if a.bright is not None else (r < a.dark)
    if not m.any():
        sys.exit("nothing matched. Check the threshold and the region")
    ys, xs = np.nonzero(m)
    bx0, by0 = (x0 + xs.min()) / k, (y0 + ys.min()) / k
    bx1, by1 = (x0 + xs.max() + 1) / k, (y0 + ys.max() + 1) / k
    print(f"x0 {bx0:.1f}  y0 {by0:.1f}  x1 {bx1:.1f}  y1 {by1:.1f}"
          f"   w {bx1-bx0:.1f}  h {by1-by0:.1f}   n {m.sum()}")


def _label(m):
    """4-connected components without scipy: every ink pixel starts as its own
    id, the max floods until nothing moves. Iterations ~ component diameter,
    which is nothing on an icon-sized window."""
    # ponytail: O(diameter) sweeps; per-run accumulate if windows ever get big
    lab = np.where(m, np.arange(1, m.size + 1, dtype=np.int64).reshape(m.shape), 0)
    while True:
        n = lab.copy()
        n[1:] = np.maximum(n[1:], lab[:-1])
        n[:-1] = np.maximum(n[:-1], lab[1:])
        n[:, 1:] = np.maximum(n[:, 1:], lab[:, :-1])
        n[:, :-1] = np.maximum(n[:, :-1], lab[:, 1:])
        n[~m] = 0
        if (n == lab).all():
            return lab
        lab = n


def cmd_ink(a):
    """`bbox` on a window that also contains a neighbouring label returns the
    window. Keeping only the components whose centroid sits near the window
    centre returns the glyph, which is the number the CSS needs."""
    k = _k(a)
    cx, cy, half = a.cx * k, a.cy * k, a.half * k
    img = _rgb(a.image)
    x0, y0 = max(0, int(round(cx - half))), max(0, int(round(cy - half)))
    win = img[y0:int(round(cy + half)), x0:int(round(cx + half))].astype(float).mean(2)
    if win.size == 0:
        sys.exit("empty window")
    bg = np.median(np.concatenate([win[0], win[-1], win[:, 0], win[:, -1]]))
    d = (bg - win) if a.dark else (win - bg)
    if d.max() <= 0:
        sys.exit("no ink in the window. For dark ink on a light fill pass --dark")
    lab = _label(d > d.max() * 0.5)
    H, W = lab.shape
    keep = []
    for i in [v for v in np.unique(lab) if v]:
        ys, xs = np.nonzero(lab == i)
        if len(ys) < a.minpx:
            continue
        if abs(ys.mean() - H / 2) > half * .8 or abs(xs.mean() - W / 2) > half * .8:
            continue
        keep.append((ys.min(), xs.min(), ys.max(), xs.max(), len(ys)))
    if not keep:
        sys.exit(f"no centred component of {a.minpx}+ px. Wrong polarity, or the "
                 "glyph is fainter than something else in the window")
    t, l = min(b[0] for b in keep), min(b[1] for b in keep)
    bm, r = max(b[2] for b in keep), max(b[3] for b in keep)
    bx0, by0 = (x0 + l) / k, (y0 + t) / k
    bx1, by1 = (x0 + r + 1) / k, (y0 + bm + 1) / k
    print(f"x0 {bx0:.1f}  y0 {by0:.1f}  x1 {bx1:.1f}  y1 {by1:.1f}"
          f"   w {bx1-bx0:.1f}  h {by1-by0:.1f}"
          f"   n {sum(b[4] for b in keep)}  comps {len(keep)}")


def cmd_scan(a):
    """One row or column, collapsed into colour runs. Finds the exact coordinate
    an edge lands on without reading 400 identical lines."""
    k = _k(a)
    img = _rgb(a.image)
    at, s0, s1 = int(round(a.at * k)), int(round(a.start * k)), int(round(a.end * k))
    line = img[s0:s1, at] if a.axis == "col" else img[at, s0:s1]
    runs = []
    for i, c in enumerate(line.astype(int)):
        if runs and np.abs(c - runs[-1][2]).max() <= a.tol:
            runs[-1][1] = i
        else:
            runs.append([i, i, c])
    for s, e, c in runs:
        print(f"{a.start + s/k:9.1f} .. {a.start + (e+1)/k:9.1f}   {_hex(c)}")


def cmd_hairline(a):
    """A 1pt rule in a downscaled capture never reaches its true colour.
    Sum the ink deficit across the band, divide by the capture scale to get
    full-coverage ink, subtract from the background."""
    x0, y0, x1, y1 = _box(a)
    px = _rgb(a.image)[y0:y1, x0:x1].astype(float)
    bg = np.array([int(a.bg[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)
    axis = 0 if (y1 - y0) <= (x1 - x0) else 1     # sum across the thin axis
    band = px.mean(axis=1 - axis)                 # average along the rule
    ink = (bg - band).sum(axis=0) / a.scale
    # Solved value first: `batch` compares the first colour a probe prints,
    # and the bg echo is a flag, not a measurement.
    print(f"solved rule colour: {_hex(np.clip(bg - ink, 0, 255))}")
    print(f"bg {_hex(bg)}  scale {a.scale}  band {band.shape[0]}px")


# --- font identification -----------------------------------------------------
# Closed-set render-and-compare: render the region's word in every candidate
# face, compare glyph shapes, rank. The published classifiers solve a
# 3,000-class Google-Fonts problem, and "SF Pro" is not one of their classes.
# A UI clone's candidate set is ~20 faces already on disk, so the small
# problem is the right one. Measurements behind the choice: docs/font-identification.md.
FONT_H = 64                                 # normalised cap height, px
FONT_WEIGHTS = (None, 400, 500, 600, 700)
FONT_TRACKS = (-0.03, -0.015, 0.0, 0.015)   # ems; iOS tracks tighter than PIL
SYSTEM_FONTS = {                            # path -> the name you would write
    "/System/Library/Fonts/SFNS.ttf": "SF Pro",
    "/System/Library/Fonts/SFCompact.ttf": "SF Compact",
    "/System/Library/Fonts/SFNSRounded.ttf": "SF Pro Rounded",
    "/System/Library/Fonts/NewYork.ttf": "New York",
    "/System/Library/Fonts/Supplemental/Helvetica.ttc": "Helvetica",
    "/System/Library/Fonts/Supplemental/Arial.ttf": "Arial",
    "/System/Library/Fonts/Supplemental/Verdana.ttf": "Verdana",
    "/System/Library/Fonts/Supplemental/Georgia.ttf": "Georgia",
}


def _ink_norm(lum):
    """Binarise, tight-crop to the ink, rescale to FONT_H keeping the aspect.
    Both the capture and the render go through this, so the comparison is of
    letterforms rather than of point size or dark mode."""
    # Polarity from the border ring, not the mean: white-on-dark text covering
    # more than a third of the box pushes the mean over 127 and inverts the mask.
    bg = np.median(np.concatenate([lum[0], lum[-1], lum[:, 0], lum[:, -1]]))
    a = np.abs(lum - bg)
    a = a > a.max() * 0.4
    ys, xs = np.nonzero(a)
    if not len(ys):
        return None
    im = Image.fromarray(a[ys.min():ys.max() + 1,
                           xs.min():xs.max() + 1].astype(np.uint8) * 255)
    return np.asarray(im.resize((max(1, round(im.width * FONT_H / im.height)),
                                 FONT_H), Image.LANCZOS)) > 127


def _set_axes(f, weight, opsz):
    """Set the Weight and Optical Size variation axes, leaving the rest at their
    defaults. Pillow takes the whole vector in axis order, and SF Pro's first
    axis is Width, so passing [700] renders it at its widest, not bold.
    False means this face cannot take the requested weight (it is a static
    file), so the caller skips that pass instead of scoring it twice."""
    try:
        axes = f.get_variation_axes()
    except OSError:
        return weight is None
    vals = []
    for ax in axes:
        n = (ax["name"] or b"").lower()
        v = ax["default"]
        if b"weight" in n and weight:
            v = weight
        elif b"optical" in n and opsz:
            v = opsz
        vals.append(max(ax["minimum"], min(ax["maximum"], v)))
    f.set_variation_by_axes(vals)
    return True


def _render_word(word, path, weight, track, opsz=None):
    f = ImageFont.truetype(path, 128)
    if not _set_axes(f, weight, opsz):
        return None
    dx, bb = track * 128, f.getbbox(word)
    im = Image.new("L", (int(bb[2] - bb[0] + abs(dx) * len(word)) + 20,
                         bb[3] - bb[1] + 20), 255)
    d, x = ImageDraw.Draw(im), 10 - bb[0]
    for ch in word:                         # one char at a time, so track applies
        d.text((x, 10 - bb[1]), ch, font=f, fill=0)
        x += f.getlength(ch) + dx
    return _ink_norm(np.asarray(im, dtype=float))


def _shape_score(a, b):
    """Shape IoU at a common cap height, discounted by the width mismatch.
    Stretching to a common width alone throws width away, so a condensed face
    scores like its normal sibling; padding alone over-punishes tracking drift.
    The product separates both."""
    w = min(a.shape[1], b.shape[1])
    r = [np.asarray(Image.fromarray(x.astype(np.uint8) * 255).resize((w, FONT_H)))
         > 127 for x in (a, b)]
    return ((r[0] & r[1]).sum() / max(1, (r[0] | r[1]).sum())
            * w / max(a.shape[1], b.shape[1]))


def _font_candidates(dirs):
    """The system UI faces that exist here, plus every font in each --fonts dir.
    The true face has to be in this set. Outside it you get the nearest
    neighbour, as with any classifier."""
    out = {p: n for p, n in SYSTEM_FONTS.items() if os.path.exists(p)}
    for d in dirs or []:
        for p in sorted(glob.glob(os.path.join(d, "*.[to]t[fc]"))):
            out[p] = os.path.splitext(os.path.basename(p))[0]
    return out


def cmd_font(a):
    x0, y0, x1, y1 = _box(a)
    px = _rgb(a.image)[y0:y1, x0:x1]
    if px.size == 0:
        sys.exit("empty region")
    target = _ink_norm(px.mean(2))
    if target is None:
        sys.exit("no ink in that region. Put the box on the word with `bbox`")
    cands = _font_candidates(a.fonts)
    if not cands:
        sys.exit("no candidate fonts on this machine. Pass --fonts DIR")
    cap = (y1 - y0) / _k(a)                 # design pt, for the optical-size axis
    ranked = sorted(
        ((n, max((_shape_score(target, r) for w in FONT_WEIGHTS for t in FONT_TRACKS
                  if (r := _render_word(a.word, p, w, t, cap)) is not None),
                 default=0.0))
         for p, n in cands.items()), key=lambda r: -r[1])

    for name, s in ranked[:a.top]:
        print(f"  {name:22s} {s:.3f}")
    margin = ranked[0][1] - (ranked[1][1] if len(ranked) > 1 else 0.0)
    if margin >= a.margin:
        print(f"call: {ranked[0][0]}   score {ranked[0][1]:.3f}, margin {margin:.3f}")
    else:
        tied = " / ".join(n for n, s in ranked if ranked[0][1] - s < a.margin)
        print(f"no call: {tied} within {a.margin:g}. Indistinguishable at this "
              "size, or the face is outside the candidate set. Record the family, "
              "not the cut.")
    if ranked[0][1] < .80:
        u = "pt" if a.pt else "px"
        print(f"weak: top score {ranked[0][1]:.3f} < 0.80, on {cap:.0f}{u} of cap "
              f"height. Clean renders score .85-.93, so first check the box holds "
              f"exactly \"{a.word}\" and nothing else, then re-run on the largest "
              "instance of the face. `bands --axis cols` gives the word gaps.")


def _crop_phone(im, scale, frame=PHONE_FRAME, tol=24, w=393, h=852, r=PHONE_RADIUS):
    """Artboards render the phone frame inside a 478 x 980 board; every
    reference is a bare device capture. Find the bezel and cut the screen out,
    so diff can compare the two pixel for pixel."""
    a = np.asarray(im.convert("RGB"), dtype=int)
    f = np.array([int(frame[i:i + 2], 16) for i in (0, 2, 4)])
    m = np.abs(a - f).sum(2) < tol
    if not m.any():
        return None
    ys, xs = np.nonzero(m)
    cx, cy = (xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2
    tw, th = int(round(w * scale)), int(round(h * scale))
    x, y = int(round(cx - tw / 2)), int(round(cy - th / 2))
    return _round_corners(im.crop((x, y, x + tw, y + th)), r * scale)


def _round_corners(im, r, ss=4):
    """The .phone box is a rounded rect, so a rectangular crop of it keeps four
    wedges of bezel. Punch them out, otherwise every montage of a cropped
    screen shows black corners. Mask built at ss x for a clean edge."""
    m = Image.new("L", (im.width * ss, im.height * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, m.width - 1, m.height - 1],
                                        radius=round(r * ss), fill=255)
    im = im.convert("RGBA")
    im.putalpha(m.resize(im.size, Image.LANCZOS))
    return im


def _render(html, png, scale, w, h):
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    f"--force-device-scale-factor={scale}",
                    f"--window-size={w},{h}", f"--screenshot={png}",
                    "file://" + os.path.abspath(html)],
                   check=True, capture_output=True)


def _overflow(html, w, h, clip_ok=()):
    """How far the board's content runs past the artboard, in CSS px, asked of
    the layout engine rather than guessed from pixels.

    The probe measures a copy of the board with a reporter script appended;
    the script is display:none so it cannot move what it reports, and the copy
    lives in a temp dir so a transient file never appears under mockups/. Do
    not do this with a pixel probe: a card's box-shadow tail paints ~60px below
    its own bottom edge and reads as overflow that is not there.

    A fitting document is not a fitting board: a fixed-height overflow:hidden
    box clips its own content internally while the document never grows, so
    the walk below reports every hidden-overflow element that is cutting more
    than 1px off its content. Elements that are SUPPOSED to clip stay silent:
    [data-clip-ok], the .phone frame, the .scroll container, anything in
    clip_ok, single-line/line-clamp ellipsis truncation, and any element whose
    bottom edge sits on its phone's bottom edge, because a sheet cropping at
    the screen bottom is the mock's scroll fold, not a defect.

    -> (px past the artboard, [(label, px clipped), ...]), or None.
    """
    src = open(html, encoding="utf-8").read()
    skip = json.dumps(["[data-clip-ok]", ".phone", ".scroll"] + list(clip_ok))
    probe = ("""<script>(()=>{const skip=%s,bad=[];
for(const el of document.querySelectorAll("*")){
 if(skip.some(q=>{try{return el.matches(q)}catch(e){return false}}))continue;
 const s=getComputedStyle(el),dy=el.scrollHeight-el.clientHeight,dx=el.scrollWidth-el.clientWidth;
 const ph=el.closest(".phone");
 const fold=ph&&Math.abs(el.getBoundingClientRect().bottom-ph.getBoundingClientRect().bottom)<4;
 const oy=s.overflowY==="hidden"&&dy>1&&s.webkitLineClamp==="none"&&!fold;
 const ox=s.overflowX==="hidden"&&dx>1&&s.textOverflow!=="ellipsis";
 if(oy||ox)bad.push((el.tagName.toLowerCase()+(el.id?"#"+el.id:"")
  +(el.classList.length?"."+el.classList[0]:"")).replace(/[^\\w.#-]/g,"")
  +"+"+Math.max(oy?dy:0,ox?dx:0));}
document.title="RK:"+Math.max(document.documentElement.scrollHeight,
 document.body.scrollHeight)+"|"+bad.slice(0,8).join(",")+"|";})()</script>"""
             % skip)
    fd, tmp = tempfile.mkstemp(suffix=".html")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(src + probe)
        out = subprocess.run([CHROME, "--headless", "--disable-gpu", "--dump-dom",
                              f"--window-size={w},{h}", "file://" + tmp],
                             capture_output=True, text=True).stdout
    finally:
        os.remove(tmp)
    m = re.search(r"RK:(\d+)\|(.*?)\|", out)
    if not m:
        return None
    clips = [(lab, int(n)) for lab, n in
             (c.rsplit("+", 1) for c in m.group(2).split(",") if "+" in c)]
    return max(0, int(m.group(1)) - h), clips


def cmd_shoot(a):
    os.makedirs(a.out, exist_ok=True)
    over = []
    for f in [p for g in a.html for p in sorted(glob.glob(g))]:
        png = os.path.join(a.out, os.path.splitext(os.path.basename(f))[0] + ".png")
        _render(f, png, a.scale, a.w, a.h)
        im, note = Image.open(png), ""
        if a.crop_phone:
            pw, ph = (int(v) for v in a.phone_size.lower().split("x"))
            c = _crop_phone(im, a.scale, w=pw, h=ph, r=a.phone_radius)
            if c is None:
                note += "  (no phone frame found, left uncropped)"
            else:
                c.save(png); im = c
        if a.check_overflow:
            r = _overflow(f, a.w, a.h, a.clip_ok)
            if r is None:
                note += "  (overflow probe failed)"
            else:
                n, clips = r
                bad = ([f"OVERFLOW +{n}px"] if n else []) + [
                    f"CLIPS {lab} +{v}px" for lab, v in clips]
                note += "  " + ("; ".join(bad) if bad else "fits")
                if bad:
                    over.append((f, "; ".join(bad)))
        print(png, im.size, note)
    if over:
        sys.exit(f"{len(over)} board(s) overflow the {a.h}px artboard or clip "
                 "their own content: "
                 + ", ".join(f"{os.path.basename(f)} {m}" for f, m in over))


def cmd_diff(a):
    """The compare half of every correction pass: one image to look at, and the
    numbers to back up what you think you saw."""
    mine, ref = _rgb(a.mine), _rgb(a.ref)
    if a.out:
        ims = [_flat(p) for p in (a.mine, a.ref)]
        ims = [i.resize((max(1, int(i.width * a.height / i.height)), a.height)) for i in ims]
        out = Image.new("RGB", (sum(i.width for i in ims) + a.gap, a.height), "white")
        x = 0
        for i in ims:
            out.paste(i, (x, 0)); x += i.width + a.gap
        out.save(a.out)
        print(f"{a.out}  {out.size}   left = mine, right = ref\n")

    k = _k(a)
    if a.regions:
        rows = (json.loads(a.regions) if a.regions.lstrip().startswith("{")
                else json.load(open(a.regions)))
        print(f"{'region':<22} {'mine':<9} {'ref':<9} {'Δmax':>5}")
        for name, box in rows.items():
            x0, y0, x1, y1 = [int(round(v * k)) for v in box]
            mh, _, _ = _fill(mine[y0:y1, x0:x1])
            rh, _, _ = _fill(ref[y0:y1, x0:x1])
            d = max(abs(int(mh[i:i+2], 16) - int(rh[i:i+2], 16)) for i in (1, 3, 5))
            flag = "" if d <= a.tol else "   <-- off"
            print(f"{name:<22} {mh:<9} {rh:<9} {d:5d}{flag}")
        return

    if mine.shape != ref.shape:
        sys.exit(f"shape mismatch {mine.shape} vs {ref.shape}. "
                 "Shoot with --crop-phone, or pass --regions")
    d = np.abs(mine.astype(int) - ref.astype(int)).mean(2)
    # A --crop-phone render carries the 52pt corners as alpha 0 over leftover
    # bezel; a bare capture has square corners full of real content. Comparing
    # the two wedges is comparing black to a screenshot, which quietly adds a
    # couple of levels to every number. Score only where both images have ink.
    keep = _opaque(a.mine) & _opaque(a.ref)
    if keep.shape != d.shape:
        keep = np.ones(d.shape, bool)
    if not keep.all():
        print(f"({(~keep).sum() / keep.size:.1%} of the frame is masked in one "
              "input and excluded)")
    n = keep.sum(1).clip(1)
    prof = (d * keep).sum(1) / n
    band = a.band
    scores = [(prof[i:i + band].mean(), i) for i in range(0, len(prof), band)]
    print(f"mean Δ {d[keep].mean():.2f}   worst {band}px bands (mine vs ref):")
    for sc, i in sorted(scores, reverse=True)[:a.top]:
        y = i + int(np.argmax(prof[i:i + band]))
        mh, _, _ = _fill(mine[y:y + 1, :])
        rh, _, _ = _fill(ref[y:y + 1, :])
        print(f"  y {i/k:7.1f} .. {(i+band)/k:7.1f}   Δ {sc:5.2f}"
              f"   worst row {y/k:7.1f}  {mh} vs {rh}")


def _opaque(path):
    """True where the image has ink. Everything is opaque unless a --crop-phone
    render punched its rounded corners out."""
    im = Image.open(path)
    if im.mode not in ("RGBA", "LA", "P"):
        return np.ones((im.height, im.width), bool)
    return np.asarray(im.convert("RGBA"))[..., 3] > 0


def cmd_blend(a):
    """Subtract one render from the other and look at what is left, the way you
    would with a difference layer in an image editor. Two screens that agree go
    grey; where they disagree the ink separates by source, red for the
    reference, cyan for yours. It answers the question a side-by-side cannot:
    is this element the wrong colour, or the right colour in the wrong place."""
    mine, ref = _rgb(a.mine), _rgb(a.ref)
    if mine.shape != ref.shape:
        sys.exit(f"shape mismatch {mine.shape} vs {ref.shape}. Shoot with --crop-phone")
    k = _k(a)
    y0, y1 = (int(round(v * k)) for v in (a.y0, a.y1 if a.y1 else mine.shape[0] / k))
    x0, x1 = (int(round(v * k)) for v in (a.x0, a.x1 if a.x1 else mine.shape[1] / k))
    # Every shift has to read the same rows out of both images, so the scored
    # window is inset by the probe distance at both ends.
    p = int(round(a.probe * k))
    y0, y1 = max(y0, p), min(y1, mine.shape[0] - p)
    m = mine[y0:y1, x0:x1].astype(int).mean(2)
    keep = (_opaque(a.mine) & _opaque(a.ref))[y0:y1, x0:x1]

    # A band that is uniformly "off" is usually not off in colour at all, it is
    # the same ink one or two points from where it belongs. Shifting one image
    # against the other says which, before you go looking for the wrong token.
    print(f"{'dy pt':>6} {'mean Δ':>7}")
    best = (None, 0.0)
    for sh in range(-p, p + 1):
        v = np.abs(m - ref[y0 + sh:y1 + sh, x0:x1].astype(int).mean(2))[keep].mean()
        mark = "   <-- best" if best[0] is None or v < best[0] else ""
        print(f"{sh / k:6.2f} {v:7.2f}{mark}")
        if best[0] is None or v < best[0]:
            best = (v, sh / k)
    if abs(best[1]) >= 1 / k:
        print(f"\nbest alignment is {best[1]:+.2f}pt, not 0: the band is displaced, "
              "not miscoloured")

    sh = int(round((a.dy if a.dy is not None else best[1]) * k))
    r = ref[y0 + sh:y1 + sh, x0:x1].astype(int).mean(2)
    out = np.dstack([m, r, r]).clip(0, 255).astype(np.uint8)
    out[~keep] = 128     # masked in one input; neutral, so it reads as "no answer"
    im = Image.fromarray(out)
    if a.zoom != 1:
        im = im.resize((int(im.width * a.zoom), int(im.height * a.zoom)), Image.NEAREST)
    im.save(a.out)
    print(f"\n{a.out}  {im.size}   red = reference only, cyan = yours only, "
          f"grey = agreed   (dy {sh / k:+.2f}pt)")


# --- batch probes ------------------------------------------------------------
# One probe per shell call spends seconds on the round trip and tens of ms
# re-decoding the same capture. batch feeds probe rows through the real parser
# and the real cmd_* functions, so there is no second implementation of any
# measurement to drift out of agreement with the single-shot commands.

def _probes(path, against):
    """probes.json rows, image paths resolved (cwd first, then beside the
    json), each probe's render counterpart resolved from --against."""
    base = os.path.dirname(os.path.abspath(path))
    rows = json.load(open(path))
    for p in rows:
        if not os.path.isabs(p["img"]) and not os.path.exists(p["img"]):
            p["img"] = os.path.join(base, p["img"])
        if against:
            m = p.get("mine", os.path.basename(p["img"]))
            p["mine"] = m if os.path.isabs(m) else os.path.join(against, m)
    return rows


def _probe_argv(p, img, pt):
    """A probe row -> the argv the real subcommand parses. `box` maps onto
    ink's centre+half window; a key starting with `_` is a comment, which is
    where a probe's sanity note lives; any other key rides through as a
    --flag."""
    cmd, argv = p["cmd"], [p["cmd"], img]
    if cmd == "scan":
        argv += [p["axis"], p["at"], p["range"][0], p["range"][1]]
    elif cmd == "ink" and "box" in p:
        x0, y0, x1, y1 = p["box"]
        argv += [(x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0) / 2]
    elif "box" in p:
        argv += p["box"]
    for key, v in p.items():
        if key.startswith("_") or key in ("id", "img", "mine", "cmd", "box",
                                          "axis", "at", "range"):
            continue
        argv.append("--" + key)
        if v is not True:
            argv.append(v)
    if pt and "pt" not in p:
        argv += ["--pt", pt]
    return [str(v) for v in argv]


def _run_probe(parser, argv):
    """-> (captured output, error or None). A probe that dies must not take
    the other forty with it."""
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
            a = parser.parse_args(argv)
            a.fn(a)
        return buf.getvalue().strip(), None
    except SystemExit as e:
        err = e.code if isinstance(e.code, str) else buf.getvalue().strip()
        err = err.splitlines()[-1] if err else f"exit {e.code}"
        return buf.getvalue().strip(), err
    except Exception as e:
        return buf.getvalue().strip(), repr(e)


_BOXRE = re.compile(r"x0 (-?[\d.]+)\s+y0 (-?[\d.]+)\s+x1 (-?[\d.]+)\s+y1 "
                    r"(-?[\d.]+)\s+w (-?[\d.]+)\s+h (-?[\d.]+)")


def _summ(cmd, out):
    """One comparable cell per probe -> (text, w, h, rgb, edge); w/h for
    anything box-shaped, rgb for anything colour-shaped, edge for a scan.
    A scan collapses to its largest colour step: comparing raw run lists
    flags every 1-level antialiasing wobble, which is noise, not layout."""
    m = _BOXRE.search(out)
    if m:
        x0, y0, _, _, w, h = map(float, m.groups())
        return f"{w:.1f}x{h:.1f} @{x0:.1f},{y0:.1f}", w, h, None, None
    if cmd == "scan":
        runs = [(float(s), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)))
                for s, c in re.findall(r"(-?[\d.]+)\s*\.\.\s*-?[\d.]+\s+(#\w{6})", out)]
        if len(runs) > 1:
            i = max(range(1, len(runs)),
                    key=lambda j: sum(abs(a - b) for a, b in zip(runs[j][1], runs[j - 1][1])))
            return (f"edge@{runs[i][0]:g} {_hex(runs[i-1][1])}>{_hex(runs[i][1])}",
                    None, None, None, runs[i][0])
        return " ".join(out.split())[:30] or "-", None, None, None, None
    m = re.search(r"#[0-9A-F]{6}", out)
    if m:
        return (m.group(0), None, None,
                tuple(int(m.group(0)[i:i + 2], 16) for i in (1, 3, 5)), None)
    return " ".join(out.split())[:30] or "-", None, None, None, None


def cmd_batch(a):
    rows, par, errs = _probes(a.probes, a.against), _parser(), []
    if not a.against:
        for p in rows:
            out, err = _run_probe(par, _probe_argv(p, p["img"], a.pt))
            print(f"-- {p['id']}  ({os.path.basename(p['img'])} {p['cmd']})")
            if out:
                print("   " + out.replace("\n", "\n   "))
            if err:
                errs.append(p["id"]); print(f"   ERROR: {err}")
    else:
        print(f"{'id':<20} {'ref':<30} {'mine':<30} {'Δ':>5} {'dw':>6} {'dh':>6} {'w*':>6} {'h*':>6}")
        dcs, dws, dhs = [], [], []
        for p in rows:
            ref, e1 = _run_probe(par, _probe_argv(p, p["img"], a.pt))
            my, e2 = _run_probe(par, _probe_argv(p, p["mine"], a.pt))
            if e1 or e2:
                errs.append(p["id"])
                print(f"{p['id']:<20} ERROR: "
                      + "; ".join(dict.fromkeys(filter(None, (e1, e2)))))
                continue
            rt, rw, rh, rc, re_ = _summ(p["cmd"], ref)
            mt, mw, mh, mc, me = _summ(p["cmd"], my)
            line = f"{p['id']:<20} {rt:<30} {mt:<30}"
            if rw is not None and mw is not None:
                dws.append(rw - mw); dhs.append(rh - mh)
                line += (f" {'':>5} {rw-mw:>+6.1f} {rh-mh:>+6.1f}"
                         + (f" {rw/mw:>6.3f}" if mw else f" {'inf':>6}")
                         + (f" {rh/mh:>6.3f}" if mh else f" {'inf':>6}"))
            elif rc and mc:
                d = max(abs(x - y) for x, y in zip(rc, mc))
                dcs.append(d); line += f" {d:>5d}"
            elif re_ is not None and me is not None:
                line += f" {me-re_:>+5.1f}"
            elif rt != mt:
                line += "  differs"
            print(line)
        if dcs:
            print(f"\ncolour probes: {len(dcs)}, mean Δmax {sum(dcs)/len(dcs):.1f}, "
                  f"worst {max(dcs)}")
        if dws:
            print(f"box probes: {len(dws)}, mean |dw| {sum(map(abs,dws))/len(dws):.2f}, "
                  f"mean |dh| {sum(map(abs,dhs))/len(dhs):.2f}")
    if errs:
        sys.exit(f"{len(errs)} probe(s) errored: " + ", ".join(errs))


def cmd_crops(a):
    """The delta table is good at size and blind to shape: one icon's numbers
    said 'one axis is off' while the paired crop showed an undersized body,
    undersized details and ~10 degrees of rotation at a glance."""
    rows, errs = _probes(a.probes, a.against), []
    os.makedirs(a.out, exist_ok=True)
    k = a.pt or 1.0
    for p in (r for r in rows if "box" in r):
        try:
            b = [int(round(v * k)) for v in p["box"]]
            # A whole-card box at icon zoom is a 14000px png; cap the pair at
            # ~2000px a side and keep --zoom for what it is for, icons.
            z = max(1, min(a.zoom, 2000 // max(1, b[2] - b[0], b[3] - b[1])))
            ims = [_flat(f).crop(b).resize(((b[2] - b[0]) * z, (b[3] - b[1]) * z),
                                           Image.NEAREST)
                   for f in (p["img"], p["mine"])]
        except Exception as e:
            errs.append(p["id"]); print(f"{p['id']}: ERROR: {e!r}")
            continue
        pad = 14
        out = Image.new("RGB", (ims[0].width + 2 + ims[1].width,
                                max(i.height for i in ims) + pad), "white")
        out.paste(ims[0], (0, pad))
        out.paste(ims[1], (ims[0].width + 2, pad))
        d = ImageDraw.Draw(out)
        d.rectangle([ims[0].width, 0, ims[0].width + 1, out.height], fill=(255, 0, 255))
        d.text((2, 1), f"{p['id']}  ref | mine", fill=(255, 0, 255))
        f = os.path.join(a.out, p["id"] + ".png")
        out.save(f)
        print(f, out.size)
    if errs:
        sys.exit(f"{len(errs)} crop(s) failed: " + ", ".join(errs))


def _key_alpha(px, ground, tol, hi):
    """Chroma key -> (alpha 0..1, per-pixel distance from the key).

    Distance is per-channel max, not Euclidean. Against a saturated key the
    two disagree exactly where it matters: `C = A*F + (1-A)*K` bounds
    `A >= |C_c - K_c| / 255` on every channel, so the max channel is the one
    carrying the coverage, and a Euclidean radius mixes it back into the two
    channels that carry none.

    Alpha then ramps over `tol .. hi` rather than over the full 0..255. The
    bound above is a LOWER bound: it is tight on an edge pixel, and too small
    on an opaque mid-tone interior, which a full-range ramp leaves 25%
    transparent. `hi` is the distance at which a pixel is certainly artwork.
    Measured on the duolingo campfire, the closest real art pixel to magenta
    sits at 115 and 99% of the art is past 162, so the default clears the
    interior with room and still leaves a two-pixel ramp on the edge.

    Keying on WHITE fails at a level no alpha rule fixes: white is not
    exclusive to the ground, so the eyes and the teeth key out with it."""
    d = np.abs(px.astype(float) - np.array(ground, float)).max(-1)
    return np.clip((d - tol) / max(hi - tol, 1e-6), 0, 1), d


def cmd_key(a):
    """Cut a generated asset off its ground. The unpremultiply is the point:
    a soft edge pixel is C = A*F + (1-A)*K, so keying alone leaves every edge
    tinted with the key colour. Solving back for F removes that spill in the
    same pass."""
    px = _rgb(a.image).astype(float)
    K = np.array([int(a.ground[i:i + 2], 16) for i in (0, 2, 4)], float)
    alpha, d = _key_alpha(px, K, a.tol, a.hi)

    b = a.border
    edge = np.concatenate([d[:b].ravel(), d[-b:].ravel(),
                           d[:, :b].ravel(), d[:, -b:].ravel()])
    print(f"ground #{a.ground.upper()}: border distance mean {edge.mean():.1f} "
          f"max {edge.max():.1f}   keyed {1 - alpha.mean():.1%} of the frame")
    if edge.mean() > a.tol:
        sys.exit(f"the border is {edge.mean():.0f} from the key colour, past "
                 f"--tol {a.tol}. The model did not paint the ground you asked "
                 "for; restate the hex and 'completely flat, no gradient, no "
                 "shadow' and generate again rather than raising --tol")

    A = alpha[..., None]
    with np.errstate(invalid="ignore", divide="ignore"):
        F = np.where(A > 0, (px - (1 - A) * K) / np.maximum(A, 1e-6), 0)
    out = np.concatenate([np.clip(F, 0, 255), alpha[..., None] * 255], -1)
    im = Image.fromarray(out.astype("uint8"), "RGBA")

    bbox = im.getchannel("A").point(lambda v: 255 * (v > 8)).getbbox()
    if not bbox:
        sys.exit("nothing survived the key: the whole frame is the ground")
    im = im.crop(bbox)
    print(f"ink box {bbox}  -> {im.size}")
    if a.box:
        w, h = (int(round(v * _k(a))) for v in a.box)
        im = im.resize((w, h), Image.LANCZOS)
        print(f"fitted to the measured box: {im.size}")
    im.save(a.out)
    print(a.out)


def _token_problems(folder):
    """The two invariants the skill states but nothing enforces: one :root
    block shared byte for byte, and no reference to a token that does not
    exist (in CSS, or in the evidence table)."""
    problems, blocks, defined = [], {}, set()
    files = sorted(glob.glob(os.path.join(folder, "*.html")))
    if not files:
        return [f"no .html files in {folder}"]
    for f in files:
        s = open(f, encoding="utf-8").read()
        m = re.search(r":root\s*\{(.*?)\}", s, re.S)
        if m:
            blocks.setdefault(m.group(1), []).append(os.path.basename(f))
            defined |= set(re.findall(r"(--[a-z0-9-]+)\s*:", m.group(1)))
    if not blocks:
        return [f"no :root block found in {folder}"]
    if len(blocks) > 1:
        ranked = sorted(blocks.values(), key=len, reverse=True)
        problems.append("the :root block is not shared: "
                        + " | ".join(f"{len(g)} file(s): {', '.join(g)}" for g in ranked))
    for f in files:
        s = open(f, encoding="utf-8").read()
        used = set(re.findall(r"var\(\s*(--[a-z0-9-]+)", s))
        cited = set(re.findall(r'<td class="t">\s*(--[a-z0-9-]+)\s*</td>', s))
        for name in sorted(used - defined):
            problems.append(f"{os.path.basename(f)}: var({name}) is not defined in :root")
        for name in sorted(cited - defined):
            problems.append(f"{os.path.basename(f)}: evidence row cites {name}, "
                            "which is not a token")
    return problems


def cmd_tokens(a):
    problems = _token_problems(a.folder)
    if not problems:
        print(f"{a.folder}: one shared :root, every var() and evidence row defined")
        return
    for p in problems:
        print(p)
    sys.exit(f"{len(problems)} problem(s)")


def cmd_montage(a):
    ims = [_flat(p) for g in a.images for p in sorted(glob.glob(g))]
    ims = [i.resize((max(1, int(i.width * a.height / i.height)), a.height)) for i in ims]
    out = Image.new("RGB", (sum(i.width for i in ims), a.height), "white")
    x = 0
    for i in ims:
        out.paste(i, (x, 0)); x += i.width
    out.save(a.out)
    print(a.out, out.size)


def _region_args(sub, pt=True):
    sub.add_argument("image")
    for n in ("x0", "y0", "x1", "y1"):
        sub.add_argument(n, type=float)
    if pt:
        sub.add_argument("--pt", type=float, default=None,
                         help="read/report coordinates in design pt: capture px per pt")
    return sub


def _version():
    """The installed plugin's version, or "dev" when run straight from a checkout.

    Skills are shipped inside a versioned plugin, so `refkit --version` is what
    settles "which release is actually on this machine" when a skill and the
    toolkit disagree.
    """
    try:
        from importlib.metadata import PackageNotFoundError, version
        return version("super-prototyping-tools")
    except (ImportError, PackageNotFoundError):
        return "dev (running from a source checkout)"


def _parser():
    p = argparse.ArgumentParser(prog="refkit", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", action="version", version=f"refkit {_version()}")
    s = p.add_subparsers(dest="cmd", required=True)

    g = s.add_parser("grid"); g.set_defaults(fn=cmd_grid)
    g.add_argument("image"); g.add_argument("-o", "--out", required=True)
    g.add_argument("--zoom", type=int, default=3)
    g.add_argument("--minor", type=int, default=10)
    g.add_argument("--major", type=int, default=50)

    v = _region_args(s.add_parser("sample")); v.set_defaults(fn=cmd_sample)
    v.add_argument("--top", type=int, default=6)
    v.add_argument("--ink", type=float, default=2.0, help="ink-core percentile")
    v.add_argument("--only", choices=("all", "ink", "flat"), default="all",
                   help="print one section only. `batch` reads the first colour "
                        "a probe prints, so an ink probe needs --only ink or it "
                        "silently compares the background instead")
    v.add_argument("--bright", action="store_true",
                   help="take the brightest percentile as the ink core, for a "
                        "dark UI where the text is lighter than its background")

    b = _region_args(s.add_parser("bands")); b.set_defaults(fn=cmd_bands)
    b.add_argument("--axis", choices=("rows", "cols"), default="rows")
    b.add_argument("--thr", type=float, default=200, help="ink luminance threshold")
    b.add_argument("--minfrac", type=float, default=.004)

    x = _region_args(s.add_parser("bbox")); x.set_defaults(fn=cmd_bbox)
    x.add_argument("--dark", type=float, default=140, help="luminance below this is ink")
    x.add_argument("--bright", type=float, default=None,
                   help="instead match pixels brighter than this (white on grey)")
    x.add_argument("--grow", action="store_true",
                   help="grow the box to the ink it touches instead of thresholding "
                        "it; finds the pale edges a luminance cut drops")
    x.add_argument("--pad", type=float, default=22.0,
                   help="--grow: how far outside the box to look, in the same "
                        "units as the box")
    x.add_argument("--tol", type=float, default=8.0,
                   help="--grow: per-channel distance from the ground that counts "
                        "as ink")

    i = s.add_parser("ink"); i.set_defaults(fn=cmd_ink)
    i.add_argument("image")
    for arg in ("cx", "cy", "half"):
        i.add_argument(arg, type=float)
    i.add_argument("--dark", action="store_true", help="dark ink on a light fill")
    i.add_argument("--minpx", type=int, default=15,
                   help="ignore components smaller than this, px")
    i.add_argument("--pt", type=float, default=None)

    c = s.add_parser("scan"); c.set_defaults(fn=cmd_scan)
    c.add_argument("image"); c.add_argument("axis", choices=("row", "col"))
    c.add_argument("at", type=float); c.add_argument("start", type=float)
    c.add_argument("end", type=float)
    c.add_argument("--tol", type=int, default=2)
    c.add_argument("--pt", type=float, default=None)

    h = _region_args(s.add_parser("hairline")); h.set_defaults(fn=cmd_hairline)
    h.add_argument("--bg", required=True, help="background hex, no #")
    h.add_argument("--scale", type=float, required=True, help="capture px per design pt")

    n = _region_args(s.add_parser("font")); n.set_defaults(fn=cmd_font)
    n.add_argument("word", help="the literal string inside that region")
    n.add_argument("--fonts", action="append", metavar="DIR",
                   help="directory of candidate .ttf/.otf/.ttc (repeatable); the "
                        "system UI faces are always in the set")
    n.add_argument("--top", type=int, default=5)
    n.add_argument("--margin", type=float, default=0.05,
                   help="top-two gap below which this is not a call")

    t = s.add_parser("shoot"); t.set_defaults(fn=cmd_shoot)
    t.add_argument("html", nargs="+"); t.add_argument("-o", "--out", required=True)
    t.add_argument("--w", type=int, default=478); t.add_argument("--h", type=int, default=980)
    t.add_argument("--scale", type=int, default=2)
    t.add_argument("--crop-phone", action="store_true",
                   help="cut the 393x852 screen out of the frame, corners masked "
                        "to the 52pt radius, ready to diff")
    t.add_argument("--phone-size", default="393x852", metavar="WxH",
                   help="what --crop-phone cuts out, in design pt, for a board "
                        "whose frame is not the 393x852 default")
    t.add_argument("--phone-radius", type=float, default=PHONE_RADIUS,
                   help="corner radius --crop-phone masks to, in design pt")
    t.add_argument("--check-overflow", action="store_true",
                   help="fail if a board's content runs past --h, or an "
                        "overflow:hidden element clips its own content")
    t.add_argument("--clip-ok", action="append", default=[], metavar="SEL",
                   help="selector allowed to clip (repeatable); [data-clip-ok], "
                        ".phone and .scroll always are")

    d = s.add_parser("diff"); d.set_defaults(fn=cmd_diff)
    d.add_argument("mine"); d.add_argument("ref")
    d.add_argument("-o", "--out", default="diff.png", help="side-by-side png ('' to skip)")
    d.add_argument("--regions", help='{"name": [x0,y0,x1,y1], ...} inline, or a .json path')
    d.add_argument("--pt", type=float, default=None)
    d.add_argument("--height", type=int, default=520)
    d.add_argument("--gap", type=int, default=8)
    d.add_argument("--tol", type=int, default=3, help="per-channel Δ that counts as a match")
    d.add_argument("--band", type=int, default=40)
    d.add_argument("--top", type=int, default=6)

    z = s.add_parser("blend"); z.set_defaults(fn=cmd_blend)
    z.add_argument("mine"); z.add_argument("ref")
    z.add_argument("--y0", type=float, default=0); z.add_argument("--y1", type=float, default=0)
    z.add_argument("--x0", type=float, default=0); z.add_argument("--x1", type=float, default=0)
    z.add_argument("--pt", type=float, default=None)
    z.add_argument("-o", "--out", default="blend.png")
    z.add_argument("--zoom", type=float, default=1)
    z.add_argument("--dy", type=float, default=None,
                   help="shift ref by this many pt (default: whichever shift scores best)")
    z.add_argument("--probe", type=float, default=3,
                   help="pt to search either side when looking for a displacement")

    k = s.add_parser("tokens"); k.set_defaults(fn=cmd_tokens)
    k.add_argument("folder")

    m = s.add_parser("montage"); m.set_defaults(fn=cmd_montage)
    m.add_argument("images", nargs="+"); m.add_argument("-o", "--out", required=True)
    m.add_argument("--height", type=int, default=520)

    q = s.add_parser("batch"); q.set_defaults(fn=cmd_batch)
    q.add_argument("probes",
                   help='probes.json: [{"id","img","cmd","box"|"axis"/"at"/"range",'
                        ' ...flags}]; paths resolve beside the json')
    q.add_argument("--against", metavar="DIR",
                   help='also run each probe on DIR/<probe "mine" or img '
                        "basename> and print the delta table")
    q.add_argument("--pt", type=float, default=None,
                   help="probe coordinates are design pt at this capture scale")

    r = s.add_parser("crops"); r.set_defaults(fn=cmd_crops)
    r.add_argument("probes"); r.add_argument("--against", required=True, metavar="DIR")
    r.add_argument("-o", "--out", required=True)
    r.add_argument("--zoom", type=int, default=6)
    r.add_argument("--pt", type=float, default=None)

    y = s.add_parser("key"); y.set_defaults(fn=cmd_key)
    y.add_argument("image"); y.add_argument("-o", "--out", required=True)
    y.add_argument("--ground", default="FF00FF",
                   help="the flat colour the asset was generated on (default "
                        "magenta). Must be a colour the artwork does not contain")
    y.add_argument("--tol", type=float, default=45.0,
                   help="noise floor: how far a pixel may sit from --ground "
                        "and still count as ground, per channel")
    y.add_argument("--border", type=int, default=30,
                   help="border band, in px, used to check the ground is flat")
    y.add_argument("--box", type=float, nargs=2, metavar=("W", "H"),
                   help="resize to the measured box, in design pt with --pt")
    y.add_argument("--hi", type=float, default=110.0,
                   help="distance at which a pixel is certainly artwork, so "
                        "alpha ramps over --tol .. --hi and interiors go opaque")
    y.add_argument("--pt", type=float, default=None)

    return p


def main():
    a = _parser().parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
