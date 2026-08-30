#!/usr/bin/env python3
"""refkit, a reference-to-mockup toolkit.

  grid     overlay a labelled measuring grid ON a reference image, so colours
           and metrics can be read VISUALLY (element -> value), not blindly
  sample   colour census of a region: true fills, small-element modes, ink core
  bands    ink-fraction profile -> the bands an element occupies, and the pitch
           between them (row height, baselines, list rhythm)
  bbox     bounding box of the dark (or bright) pixels in a region
  scan     walk one row/column and collapse it into colour runs. Finds an
           edge (sheet top, card inset) to the pixel
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
Self-check: python3 tools/test_refkit.py
"""
import argparse, glob, json, os, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PHONE_FRAME = "1D191A"          # the shared artboard phone frame's bezel colour
PHONE_RADIUS = 52               # .phone border-radius, in design pt


def _flat(p):
    """Open as RGB. A cropped phone screen carries transparent 52pt corners;
    flatten them onto white rather than dropping the alpha and exposing the
    black bezel they were cut out of."""
    im = Image.open(p)
    if "A" not in im.getbands():
        return im.convert("RGB")
    im = im.convert("RGBA")
    bg = Image.new("RGB", im.size, "white")
    bg.paste(im, mask=im.getchannel("A"))
    return bg


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
    for label, sel in (("flat fills", flat), ("all pixels", px.reshape(-1, 3))):
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
    v = px.reshape(-1, 3)
    n = max(1, int(len(v) * a.ink / 100))
    print(f"ink core (darkest {a.ink}%): {_hex(v[v.mean(1).argsort()[:n]].mean(0))}")


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


def cmd_bbox(a):
    x0, y0, x1, y1 = _box(a)
    r = _rgb(a.image)[y0:y1, x0:x1].mean(2)
    m = (r > a.bright) if a.bright is not None else (r < a.dark)
    if not m.any():
        sys.exit("nothing matched. Check the threshold and the region")
    ys, xs = np.nonzero(m)
    k = _k(a)
    bx0, by0 = (x0 + xs.min()) / k, (y0 + ys.min()) / k
    bx1, by1 = (x0 + xs.max() + 1) / k, (y0 + ys.max() + 1) / k
    print(f"x0 {bx0:.1f}  y0 {by0:.1f}  x1 {bx1:.1f}  y1 {by1:.1f}"
          f"   w {bx1-bx0:.1f}  h {by1-by0:.1f}   n {m.sum()}")


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
    print(f"bg {_hex(bg)}  scale {a.scale}  band {band.shape[0]}px")
    print(f"solved rule colour: {_hex(np.clip(bg - ink, 0, 255))}")


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
    a = 255 - lum if lum.mean() > 127 else lum
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


def _crop_phone(im, scale, frame=PHONE_FRAME, tol=24, w=393, h=852):
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
    return _round_corners(im.crop((x, y, x + tw, y + th)), PHONE_RADIUS * scale)


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


def _overflow(html, w, h):
    """How far the board's content runs past the artboard, in CSS px, asked of
    the layout engine rather than guessed from pixels.

    The probe measures a copy of the board with a reporter script appended;
    the script is display:none so it cannot move what it reports, and the copy
    lives in a temp dir so a transient file never appears under mockups/. Do
    not do this with a pixel probe: a card's box-shadow tail paints ~60px below
    its own bottom edge and reads as overflow that is not there.
    """
    src = open(html, encoding="utf-8").read()
    probe = ('<script>document.title="RK:"+Math.max('
             'document.documentElement.scrollHeight,document.body.scrollHeight)</script>')
    fd, tmp = tempfile.mkstemp(suffix=".html")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(src + probe)
        out = subprocess.run([CHROME, "--headless", "--disable-gpu", "--dump-dom",
                              f"--window-size={w},{h}", "file://" + tmp],
                             capture_output=True, text=True).stdout
    finally:
        os.remove(tmp)
    m = re.search(r"RK:(\d+)", out)
    return max(0, int(m.group(1)) - h) if m else None


def cmd_shoot(a):
    os.makedirs(a.out, exist_ok=True)
    over = []
    for f in [p for g in a.html for p in sorted(glob.glob(g))]:
        png = os.path.join(a.out, os.path.splitext(os.path.basename(f))[0] + ".png")
        _render(f, png, a.scale, a.w, a.h)
        im, note = Image.open(png), ""
        if a.crop_phone:
            c = _crop_phone(im, a.scale)
            if c is None:
                note += "  (no phone frame found, left uncropped)"
            else:
                c.save(png); im = c
        if a.check_overflow:
            n = _overflow(f, a.w, a.h)
            note += "  (overflow probe failed)" if n is None else (
                f"  OVERFLOW +{n}px" if n else "  fits")
            if n:
                over.append((f, n))
        print(png, im.size, note)
    if over:
        sys.exit(f"{len(over)} board(s) run past the {a.h}px artboard: "
                 + ", ".join(f"{os.path.basename(f)} +{n}" for f, n in over))


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
    prof = d.mean(1)
    band = a.band
    scores = [(prof[i:i + band].mean(), i) for i in range(0, len(prof), band)]
    print(f"mean Δ {d.mean():.2f}   worst {band}px bands (mine vs ref):")
    for sc, i in sorted(scores, reverse=True)[:a.top]:
        y = i + int(np.argmax(prof[i:i + band]))
        mh, _, _ = _fill(mine[y:y + 1, :])
        rh, _, _ = _fill(ref[y:y + 1, :])
        print(f"  y {i/k:7.1f} .. {(i+band)/k:7.1f}   Δ {sc:5.2f}"
              f"   worst row {y/k:7.1f}  {mh} vs {rh}")


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


def main():
    p = argparse.ArgumentParser(prog="refkit", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True)

    g = s.add_parser("grid"); g.set_defaults(fn=cmd_grid)
    g.add_argument("image"); g.add_argument("-o", "--out", required=True)
    g.add_argument("--zoom", type=int, default=3)
    g.add_argument("--minor", type=int, default=10)
    g.add_argument("--major", type=int, default=50)

    v = _region_args(s.add_parser("sample")); v.set_defaults(fn=cmd_sample)
    v.add_argument("--top", type=int, default=6)
    v.add_argument("--ink", type=float, default=2.0, help="ink-core percentile")

    b = _region_args(s.add_parser("bands")); b.set_defaults(fn=cmd_bands)
    b.add_argument("--axis", choices=("rows", "cols"), default="rows")
    b.add_argument("--thr", type=float, default=200, help="ink luminance threshold")
    b.add_argument("--minfrac", type=float, default=.004)

    x = _region_args(s.add_parser("bbox")); x.set_defaults(fn=cmd_bbox)
    x.add_argument("--dark", type=float, default=140, help="luminance below this is ink")
    x.add_argument("--bright", type=float, default=None,
                   help="instead match pixels brighter than this (white on grey)")

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
    t.add_argument("--check-overflow", action="store_true",
                   help="fail if a board's content runs past --h")

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

    k = s.add_parser("tokens"); k.set_defaults(fn=cmd_tokens)
    k.add_argument("folder")

    m = s.add_parser("montage"); m.set_defaults(fn=cmd_montage)
    m.add_argument("images", nargs="+"); m.add_argument("-o", "--out", required=True)
    m.add_argument("--height", type=int, default=520)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
