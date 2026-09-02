#!/usr/bin/env python3
"""motionkit, a reference-video-to-composition toolkit.

The moving-picture half of refkit. refkit answers "what colour, what size" off a
still; this answers "what moved, how fast, and when did it stop" off a clip, so
a motion asset's timings can be measured from its reference instead of eyeballed.

  probe    dimensions, fps, frame count, duration -- the four numbers that go
           straight into a motion asset's meta.json
  flow     per-frame global motion by phase correlation. The series that tells
           a continuous pan from a flick-and-coast, and reads friction off the
           decay. Prints px/frame and the running total, in source pixels
  sheet    labelled contact sheet, N frames evenly spaced. The frame numbers are
           the point: they turn "it settles about here" into "it settles at f76"
           `--from/--to` narrows it to one shot, which is how you go from "the
           gradient moves" to forty frames you can fit a curve to
  swatch   the colours off one frame, as hex. `--grid WxH` area-averages the
           whole frame into cells (the shape of a gradient), `--crop W:H:X:Y`
           censuses one region at full resolution (the exact hex of a chip)
  compare  reference and render side by side in one clip, same height, so the
           two can be scrubbed against each other rather than remembered

Every reported displacement is in SOURCE pixels, whatever `--width` the
measurement ran at, so numbers from two runs are comparable.

Needs: pillow, numpy, ffmpeg/ffprobe on PATH.
Self-check: python3 tools/motionkit.py selftest
"""
import argparse, json, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

LABEL_FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def probe(path):
    """(width, height, fps, frames) from ffprobe, frames counted if not tagged."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_streams",
         "-of", "json", path],
        capture_output=True, text=True, check=True,
    ).stdout
    s = json.loads(out)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    fps = float(num) / float(den)
    frames = int(s.get("nb_frames") or 0)
    if not frames:
        # Some encoders omit nb_frames; counting packets is slower but exact.
        frames = int(subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-count_packets", "-show_entries", "stream=nb_read_packets",
             "-of", "csv=p=0", path],
            capture_output=True, text=True, check=True,
        ).stdout.strip())
    return s["width"], s["height"], fps, frames


def read_gray(path, width=None):
    """Every frame as a float32 luma array, decoded straight from ffmpeg.

    `width` downsamples: phase correlation only needs enough texture to lock on,
    and half resolution is roughly four times faster. Displacements are scaled
    back to source pixels by the caller.
    """
    w, h, _, _ = probe(path)
    scale = 1.0 if width is None else width / w
    dw, dh = max(2, round(w * scale)), max(2, round(h * scale))
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={dw}:{dh}",
         "-pix_fmt", "gray", "-f", "rawvideo", "-"],
        capture_output=True, check=True,
    ).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, dh, dw)
    return frames.astype(np.float32), 1.0 / scale


def shift(a, b):
    """Phase correlation: the (dx, dy) that maps frame `a` onto frame `b`.

    Windowed with a Hanning taper, because a frame is not periodic and the wrap
    at its edges otherwise correlates with itself and pins the peak at zero.
    Whitening (dividing by the magnitude) is what makes this read translation
    rather than brightness: it keeps only the phase, where the shift lives.
    """
    a = a - a.mean()
    b = b - b.mean()
    win = np.outer(np.hanning(a.shape[0]), np.hanning(a.shape[1]))
    r = np.fft.rfft2(a * win).conj() * np.fft.rfft2(b * win)
    r /= np.abs(r) + 1e-9
    c = np.fft.irfft2(r, s=a.shape)
    iy, ix = np.unravel_index(np.argmax(c), c.shape)
    # The peak wraps: a shift of -3 lands at height-3.
    if iy > a.shape[0] // 2:
        iy -= a.shape[0]
    if ix > a.shape[1] // 2:
        ix -= a.shape[1]
    return float(ix), float(iy)


def measure(path, width):
    """Per-frame (dx, dy) in source px, plus the running total."""
    frames, back = read_gray(path, width)
    rows, cx, cy = [], 0.0, 0.0
    for i in range(len(frames) - 1):
        dx, dy = shift(frames[i], frames[i + 1])
        dx *= back
        dy *= back
        cx += dx
        cy += dy
        rows.append((i, dx, dy, cx, cy))
    return rows


def cmd_probe(a):
    w, h, fps, n = probe(a.video)
    print(f"{w}x{h}  {fps:g} fps  {n} frames  {n / fps:.3f}s")
    print(json.dumps(
        {"fps": round(fps), "width": w, "height": h, "durationInFrames": n},
        indent=2,
    ))


def cmd_flow(a):
    rows = measure(a.video, a.width)
    print("frame     dx     dy       cum x    cum y")
    for i, dx, dy, cx, cy in rows:
        if i % a.every == 0:
            print(f"{i:5d} {dx:6.1f} {dy:6.1f}   {cx:8.1f} {cy:8.1f}")
    speed = [np.hypot(dx, dy) for _, dx, dy, _, _ in rows]
    peak = int(np.argmax(speed))
    # A constant dy/dx over the moving frames means one straight pan axis; the
    # angle is the number a composition needs, not the two components.
    moving = [(dx, dy) for _, dx, dy, _, _ in rows if np.hypot(dx, dy) > a.rest]
    print()
    print(f"peak       {speed[peak]:.1f} px/frame at f{peak}")
    print(f"total      {rows[-1][3]:.0f} x {rows[-1][4]:.0f} px")
    print(f"moving     {len(moving)}/{len(rows)} frames above {a.rest} px/frame")
    if moving:
        sx = sum(dx for dx, _ in moving)
        sy = sum(dy for _, dy in moving)
        if sx:
            print(f"axis       {np.degrees(np.arctan2(sy, sx)):.1f} deg from horizontal")
    if a.out:
        with open(a.out, "w") as fh:
            fh.write("frame\tdx\tdy\tcum_x\tcum_y\n")
            for i, dx, dy, cx, cy in rows:
                fh.write(f"{i}\t{dx:.1f}\t{dy:.1f}\t{cx:.1f}\t{cy:.1f}\n")
        print(f"wrote      {a.out}  ({len(rows)} rows)")


def cmd_sheet(a):
    w, h, _, n = probe(a.video)
    lo = max(0, a.start)
    hi = min(n - 1, a.end if a.end is not None else n - 1)
    if lo >= hi:
        sys.exit(f"motionkit: --from {a.start} is not before --to {hi}")
    indices = [round(lo + i * (hi - lo) / max(1, a.count - 1)) for i in range(a.count)]
    frames, _ = read_gray_rgb(a.video, a.width)
    tw = frames[0].width
    th = frames[0].height
    cols = a.cols
    rows = -(-len(indices) // cols)
    sheet = Image.new("RGB", (cols * tw, rows * (th + 18)), "#111")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype(LABEL_FONT, 14)
    except OSError:
        font = ImageFont.load_default()
    for slot, idx in enumerate(indices):
        x = (slot % cols) * tw
        y = (slot // cols) * (th + 18)
        sheet.paste(frames[idx], (x, y))
        draw.text((x + 4, y + th + 2), f"f{idx}", fill="#eee", font=font)
    sheet.save(a.out)
    print(f"{a.out}  {sheet.width}x{sheet.height}  frames {indices}")


def cmd_swatch(a):
    """Colours off one frame: a hex grid of the whole frame, or a crop's census.

    The grid answers "what is the gradient made of" -- an area-averaged NxM
    downsample is exactly the set of stops a CSS gradient needs. The crop
    answers "what colour is that button", where an average would just report
    the button blended with the page behind it, so it prints a census instead
    and the fill is whichever colour holds the most pixels.
    """
    vf = [f"select='eq(n,{a.frame})'"]
    if a.crop:
        vf.append(f"crop={a.crop}")
    if not a.crop:
        cols, rows = (int(v) for v in a.grid.split("x"))
        vf.append(f"scale={cols}:{rows}:flags=area")
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", a.video, "-vf", ",".join(vf),
         "-frames:v", "1", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
        capture_output=True, check=True,
    ).stdout
    if not raw:
        sys.exit(f"motionkit: no frame {a.frame} in {a.video}")
    if a.crop:
        px = np.frombuffer(raw, np.uint8).reshape(-1, 3)
        colours, counts = np.unique(px, axis=0, return_counts=True)
        print(f"f{a.frame} crop {a.crop}  {len(px)} px")
        for i in np.argsort(-counts)[: a.top]:
            print(f"  {hexof(colours[i])}  {100 * counts[i] / len(px):5.1f}%")
        return
    px = np.frombuffer(raw, np.uint8).reshape(rows, cols, 3)
    print(f"f{a.frame}  {cols}x{rows} area-average")
    for row in px:
        print("  " + " ".join(hexof(p) for p in row))


def hexof(rgb):
    return "#%02x%02x%02x" % tuple(int(v) for v in rgb)


def read_gray_rgb(path, width):
    """Frames as RGB PIL images, for the sheet. Same decode as read_gray."""
    w, h, _, _ = probe(path)
    scale = 1.0 if width is None else width / w
    dw, dh = max(2, round(w * scale)), max(2, round(h * scale))
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={dw}:{dh}",
         "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
        capture_output=True, check=True,
    ).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, dh, dw, 3)
    return [Image.fromarray(f) for f in arr], 1.0 / scale


def cmd_compare(a):
    _, h, _, _ = probe(a.reference)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", a.reference, "-i", a.render,
         "-filter_complex",
         f"[0:v]scale=-2:{h}[l];[1:v]scale=-2:{h}[r];[l][r]hstack=inputs=2",
         "-an", a.out],
        check=True,
    )
    w, oh, fps, n = probe(a.out)
    print(f"{a.out}  {w}x{oh}  {fps:g} fps  {n} frames   (reference left)")


def cmd_selftest(_):
    """A known translation must come back out of `shift` exactly."""
    rng = np.random.default_rng(0)
    base = rng.random((256, 256)).astype(np.float32) * 255
    for dx, dy in ((7, -3), (-11, 5), (0, 0)):
        moved = np.roll(np.roll(base, dy, axis=0), dx, axis=1)
        got = shift(base, moved)
        assert got == (dx, dy), f"shift said {got}, expected {(dx, dy)}"
    print("ok: phase correlation recovers known shifts")
    for rgb, want in (((0, 0, 0), "#000000"), ((255, 196, 161), "#ffc4a1")):
        assert hexof(np.array(rgb)) == want, f"hexof said {hexof(np.array(rgb))}"
    print("ok: swatch reports the hex a stylesheet would take")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True)

    q = s.add_parser("probe", help="dimensions, fps, frames, duration")
    q.set_defaults(fn=cmd_probe)
    q.add_argument("video")

    f = s.add_parser("flow", help="per-frame global motion")
    f.set_defaults(fn=cmd_flow)
    f.add_argument("video")
    f.add_argument("--width", type=int, default=540,
                   help="measure at this width; results scale back to source px")
    f.add_argument("--every", type=int, default=1, help="print every Nth frame")
    f.add_argument("--rest", type=float, default=1.0,
                   help="px/frame below which a frame counts as at rest")
    f.add_argument("--out", help="also write the full series to this TSV")

    h = s.add_parser("sheet", help="labelled contact sheet")
    h.set_defaults(fn=cmd_sheet)
    h.add_argument("video")
    h.add_argument("--out", default="sheet.png")
    h.add_argument("--count", type=int, default=10)
    h.add_argument("--cols", type=int, default=5)
    h.add_argument("--width", type=int, default=320, help="tile width")
    h.add_argument("--from", type=int, default=0, dest="start",
                   help="first frame of the range (default: the whole clip)")
    h.add_argument("--to", type=int, default=None, dest="end",
                   help="last frame of the range")

    v = s.add_parser("swatch", help="colours off one frame, as hex")
    v.set_defaults(fn=cmd_swatch)
    v.add_argument("video")
    v.add_argument("frame", type=int)
    v.add_argument("--grid", default="16x9",
                   help="area-average the whole frame to this many cells")
    v.add_argument("--crop", help="W:H:X:Y; census this region instead of the grid")
    v.add_argument("--top", type=int, default=6, help="census rows to print")

    c = s.add_parser("compare", help="reference | render, side by side")
    c.set_defaults(fn=cmd_compare)
    c.add_argument("reference")
    c.add_argument("render")
    c.add_argument("--out", default="compare.mp4")

    t = s.add_parser("selftest", help="assert the measurement still measures")
    t.set_defaults(fn=cmd_selftest)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
