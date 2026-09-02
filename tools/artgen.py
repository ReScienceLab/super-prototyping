#!/usr/bin/env python3
"""Redraw measured crops at high resolution, a grid at a time, and score the result.

`gpt-image-2` asked to reproduce one asset returns a good drawing and a bad
measurement: the campfire character came back with a different head-to-body
ratio and scored 38.53 against its crop, 18.41 once it was generated on a key
colour and fitted back to the measured box.

What closes the rest of that gap is the input. Pack the assets into a grid where
each one already sits at the size, centre and rotation it must come back at, and
the model is upscaling in place rather than composing. Every cell then returns at
scale 1.00 with an offset of a pixel or less, so there is nothing left to
register, and the same six assets score 2.2 to 6.9.

    python3 tools/artgen.py --art mockups/canvases/<slug>/assets/art \
        --out gen 03-char 08-avatar 02-char 06-char 07-freeze 01-duo

Repeat --sheet to score several returns and keep, per asset, whichever grid drew
it best. A crop still scores 0 by construction, so this is for the assets a
capture does not contain, and for making the ones it does contain resolution
independent. See the clone-prototype skill's references/generating.md.
"""
import argparse
import json
import pathlib
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

REPO = pathlib.Path(__file__).resolve().parent.parent
GPT = pathlib.Path.home() / ".claude/skills/gpt-image/scripts/gptimage.py"
KEY = (255, 0, 255)
WHITE = (255, 255, 255)

PROMPT = """Redraw every element in this grid at high resolution.

This is an UPSCALE, not a reinterpretation. The input is a contact sheet of UI
artwork from a mobile app: flat vector illustrations and icons, each one alone
inside its own square cell, on a flat %(in)s ground.

THE ONE RULE: nothing moves. Each element stays in the cell it is already in, at
the same size, with the same centre, the same rotation and the same amount of
empty ground around it. Do not re-compose, do not re-arrange, do not re-order the
cells, do not resize anything to fill its cell, do not add or remove anything. If
an element is small in its cell, it stays small in its cell.

What to change: only the resolution. Every curve that is a stair-step of pixels
in the input is a clean curve in the output. Every edge that is a soft blur is a
crisp edge. Redraw each shape as the flat vector art it was before it was
downscaled: solid fills, no gradient that was not there, no gloss, no texture, no
outline that was not there, no shading, no drop shadow that was not there.

Keep every colour exactly as it appears, sampled shape by shape, including any
white inside the artwork such as the whites of eyes, highlights and cut-outs.
Pale grey ellipses under a figure are its ground shadow and are part of the
artwork: keep them exactly where they are.

%(out)s Flat magenta: no gradient, no vignette, no texture, no glow, no drop
shadow on the ground, and no grid lines, borders, frames, labels or numbers drawn
between or around the cells. No element may contain any magenta."""

GROUND_IN = {"key": "magenta", "white": "white"}
GROUND_OUT = {
    "key": "The background is already a COMPLETELY FLAT, uniform, pure magenta, "
           "hex #FF00FF. Return it as exactly that same flat magenta.",
    "white": "Return the whole sheet on a COMPLETELY FLAT, uniform, pure magenta "
             "background, hex #FF00FF, replacing the white ground of the input.",
}


def to_key(img, thresh=8):
    """Swap a crop's page white for the key colour, without eating the white *in* it.

    A global near-white match takes the character's eyes with it. Only the white
    the border can reach is ground, so flood fill from the corners instead. This
    leaves a one-pixel antialias halo, which is proportionally large on a small
    icon: below ~128 px, assemble on white and let the prompt ask for the key.
    """
    im = img.convert("RGB").copy()
    px = np.asarray(im).astype(int)
    w, h = im.size
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if np.abs(px[xy[1], xy[0]] - 254).max() <= 6:      # that corner really is page white
            ImageDraw.floodfill(im, xy, KEY, thresh=thresh)
    return im


def build_sheet(art, ids, cols, cell, out, fill=0.86, ground=KEY):
    """Pack each asset into its own square cell at the size it must come back at."""
    rows = (len(ids) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * cell), ground)
    cells = {}
    for i, cid in enumerate(ids):
        a = Image.open(art / (cid + ".png")).convert("RGB")
        if ground == KEY:
            a = to_key(a)
        s = fill * cell / max(a.size)
        w, h = max(1, round(a.width * s)), max(1, round(a.height * s))
        cx, cy = (i % cols) * cell, (i // cols) * cell
        sheet.paste(a.resize((w, h), Image.LANCZOS),
                    (cx + (cell - w) // 2, cy + (cell - h) // 2))
        cells[cid] = [cx, cy, cx + cell, cy + cell]
    sheet.save(out)
    return cells, sheet.size


def ground_of(img, band=10):
    """The ground the model returned, which is not the one the prompt asked for.

    One run asked for #FF00FF and came back on #F308EC. Keying against the hex
    you asked for leaves a rim; keying against the modal border colour does not.
    """
    a = np.asarray(img.convert("RGB")).astype(int)
    edge = np.concatenate([a[:band].reshape(-1, 3), a[-band:].reshape(-1, 3),
                           a[:, :band].reshape(-1, 3), a[:, -band:].reshape(-1, 3)])
    u, c = np.unique(edge, axis=0, return_counts=True)
    return "%02X%02X%02X" % tuple(u[c.argmax()])


def ramp(ref, ground):
    """The alpha ramp for *this* asset, rather than one constant for every asset.

    `refkit key` ramps alpha over per-channel distances --tol .. --hi from the key.
    Its 110 was set below the closest-to-magenta pixel of one character; a lilac
    icon sits 73 from magenta, so 110 keys the icon itself to half alpha and the
    unpremultiply then returns garbage. One tab icon scored 48 that way and it was
    a colour inversion, not a drawing error. So read the distance off the crop
    being redrawn and stay under it, with headroom for the model saturating a
    colour a little on the way back.
    """
    g = np.array([int(ground[i:i + 2], 16) for i in (0, 2, 4)])
    a = np.asarray(ref.convert("RGB")).astype(int)
    ink = a.min(2) < 240                                   # art, not the crop's page white
    if ink.sum() < 16:
        return 45, 110
    near = np.abs(a[ink] - g).max(1).min()
    if near < 30:
        print("  ! art within %d of the key: pick another key colour" % near)
    hi = int(max(24, min(110, near * 0.8)))
    return max(8, int(hi * 0.35)), hi


def best_fit(keyed, ref_img, scales=np.arange(0.90, 1.11, 0.01), rad=10):
    """Solve scale and offset against the crop, separating drawing from registration.

    `refkit key` normalises the union ink box, so one element reaching further
    than it does on the capture rescales everything. Solving the transform says
    which of the two happened, and it is what the asset gets baked at.
    """
    ref = np.asarray(ref_img, float)
    H, W = ref.shape[:2]
    best = None
    for s in scales:
        w, h = max(1, round(W * s)), max(1, round(H * s))
        a = keyed.resize((w, h), Image.LANCZOS)
        canvas = Image.new("RGB", (W + 2 * rad, H + 2 * rad), (254, 254, 254))
        canvas.paste(a, (rad + (W - w) // 2, rad + (H - h) // 2), a)   # one paste, N slices
        big = np.asarray(canvas, float)
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                d = np.abs(big[rad + dy:rad + dy + H, rad + dx:rad + dx + W] - ref).mean()
                if best is None or d < best[0]:
                    best = (d, float(s), dx, dy)
    return best


def render(keyed, size, s, dx, dy, sup=1):
    """Bake the solved transform, at `sup` times the measured box.

    The offset is subtracted, not added: `best_fit` solves dx by sliding the
    *window* right across a padded canvas, which moves the artwork left. Adding
    it instead applies the shift twice in the wrong direction, and with typical
    offsets of a pixel that is a defect no number in the report would show.
    """
    W, H = size[0] * sup, size[1] * sup
    w, h = max(1, round(W * s)), max(1, round(H * s))
    a = keyed.resize((w, h), Image.LANCZOS)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(a, ((W - w) // 2 - dx * sup, (H - h) // 2 - dy * sup), a)
    return out


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("ids", nargs="*")
    p.add_argument("--art", help="the folder of measured crops to redraw")
    p.add_argument("--out")
    p.add_argument("--cols", type=int, default=3)
    p.add_argument("--cell", type=int, default=1024,
                   help="px per cell; keep it 3x the biggest asset's longest side")
    p.add_argument("--in-ground", default="key", choices=["key", "white"])
    p.add_argument("--prompt", help="override the built-in prompt with a file")
    p.add_argument("--quality", default="high", choices=["low", "medium", "high", "auto"])
    p.add_argument("--sup", type=int, default=3, help="write the asset at N x the measured box")
    p.add_argument("--max-delta", type=float, default=8.0)
    p.add_argument("--sheet", action="append",
                   help="skip the API call and score this return. Repeatable: with "
                        "more than one, each asset comes from whichever drew it best.")
    p.add_argument("--self-test", action="store_true")
    a = p.parse_args()
    if a.self_test:
        return self_test()
    if not (a.ids and a.art and a.out):
        sys.exit("need --art, --out and one or more asset ids")

    art = pathlib.Path(a.art)
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    cells, size = build_sheet(art, a.ids, a.cols, a.cell, out / "sheet-in.png",
                              ground=KEY if a.in_ground == "key" else WHITE)
    print("anchor  %d cells, %d x %d" % (len(cells), *size))

    sheets = [pathlib.Path(s) for s in (a.sheet or [])]
    if not sheets:
        text = (pathlib.Path(a.prompt).read_text() if a.prompt else
                PROMPT % {"in": GROUND_IN[a.in_ground], "out": GROUND_OUT[a.in_ground]})
        got = out / "sheet-out.png"
        r = subprocess.run(["python3", str(GPT), "-p", text, "-i", str(out / "sheet-in.png"),
                            "-o", str(got), "--size", "%dx%d" % size, "--quality", a.quality],
                           capture_output=True, text=True)
        if r.returncode or not got.exists():
            sys.exit("generate failed: " + (r.stderr.strip() or r.stdout.strip()))
        sheets = [got]

    loaded = [(s.stem, Image.open(s).convert("RGB").resize(size, Image.LANCZOS))
              for s in sheets]
    report = {}
    for cid, (x0, y0, x1, y1) in cells.items():
        ref = Image.open(art / (cid + ".png")).convert("RGB")
        best = None
        for name, sheet in loaded:
            cut = out / "_cell.png"
            sheet.crop((x0, y0, x1, y1)).save(cut)
            keyed = out / "_keyed.png"
            g = ground_of(Image.open(cut))
            tol, hi = ramp(ref, g)
            k = subprocess.run(["python3", str(REPO / "tools/refkit.py"), "key", str(cut),
                                "-o", str(keyed), "--ground", g, "--border", "12",
                                "--tol", str(tol), "--hi", str(hi)],
                               capture_output=True, text=True)
            if k.returncode:
                print("%-14s %-12s KEY FAILED  %s"
                      % (cid, name, (k.stdout + k.stderr).strip().splitlines()[-1]))
                continue
            im = Image.open(keyed).convert("RGBA").resize(ref.size, Image.LANCZOS)
            d, s, dx, dy = best_fit(im, ref)
            if best is None or d < best[0]:
                best = (d, s, dx, dy, name, im)
        if best is None:
            continue
        d, s, dx, dy, name, im = best
        render(im, ref.size, s, dx, dy, sup=a.sup).save(out / (cid + ".png"))
        report[cid] = dict(delta=round(d, 2), scale=s, dx=dx, dy=dy, sheet=name)
        print("%-14s d %5.2f   scale %.2f  offset %+d %+d   %-12s %s"
              % (cid, d, s, dx, dy, name,
                 "ok" if d <= a.max_delta else "OVER --max-delta"))
    for f in (out / "_cell.png", out / "_keyed.png"):
        f.unlink(missing_ok=True)
    (out / "report.json").write_text(json.dumps(report, indent=1) + "\n")
    over = [c for c, v in report.items() if v["delta"] > a.max_delta]
    print("%d assets, mean d %.2f, %d over --max-delta%s"
          % (len(report), np.mean([v["delta"] for v in report.values()]) if report else 0,
             len(over), (": " + " ".join(over)) if over else ""))


def self_test():
    """The two things that silently corrupt a run: eaten white, and a lost anchor."""
    art = Image.new("RGB", (60, 40), (255, 255, 255))
    d = ImageDraw.Draw(art)
    d.ellipse((10, 8, 50, 32), fill=(30, 160, 60))       # a body
    d.ellipse((22, 15, 30, 23), fill=(255, 255, 255))    # an eye, also page-white
    keyed = np.asarray(to_key(art)).astype(int)
    assert (keyed == KEY).all(2).sum() > 1200, "the ground did not go"
    assert not (keyed[16:22, 24:29] == KEY).all(2).any(), "the eye went with the ground"

    tmp = pathlib.Path(sys.argv[0]).parent / "_artgen_selftest"
    tmp.mkdir(exist_ok=True)
    for i in range(5):
        art.save(tmp / ("a%d.png" % i))
    cells, size = build_sheet(tmp, ["a%d" % i for i in range(5)], 3, 64,
                              tmp / "s.png", ground=WHITE)
    assert size == (192, 128), size                       # 3 cols x 2 rows of 64
    assert cells["a4"] == [64, 64, 128, 128], cells["a4"]  # index 4 -> row 1, col 1

    ref = Image.open(tmp / "a0.png").convert("RGB")
    shifted = Image.new("RGBA", (60, 40), (0, 0, 0, 0))
    shifted.paste(art.convert("RGBA"), (3, -2))
    d_, s_, dx, dy = best_fit(shifted, ref)
    assert (dx, dy) == (3, -2), "best_fit did not solve the offset: %+d %+d" % (dx, dy)
    assert d_ < 1.0, "a solved shift should score near zero, got %.2f" % d_
    baked = render(shifted, ref.size, s_, dx, dy)          # the sign render must undo
    flat = Image.new("RGB", ref.size, (254, 254, 254))
    flat.paste(baked, (0, 0), baked)
    assert np.abs(np.asarray(flat, float) - np.asarray(ref, float)).mean() < 1.0, \
        "render did not bake the transform best_fit solved"

    for f in tmp.iterdir():
        f.unlink()
    tmp.rmdir()
    print("ok: white in the art survives, the grid anchors, the fit solves the offset")


if __name__ == "__main__":
    main()
