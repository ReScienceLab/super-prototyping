#!/usr/bin/env python3
"""Corner-pin a board's rendered UI frames onto the green phone screen of a Seedance plate.

    uv run --with opencv-python-headless --with numpy composite.py \
        out/plate.mp4 out/ui out/scene.mp4 [--offset 0] [--lock] [--stabilize] [--debug]

The rescue route, for when the model will not hold the interface verbatim: let it
shoot the phone with a chroma-key green screen instead, and put the real pixels back
here. references/compositing.md is the how and the when.

Per frame: chroma-key the screen, take the convex hull of the key and pick the four
screen edges by orientation (two along the phone's long axis, two across it, so a
thumb biting a corner cannot steal an edge), intersect them into a quad, then refine
the homography with the white cross markers when at least five are visible. The UI is
shown only where the plate is green, so the thumb stays on top of it. The screen's own
brightness is multiplied back over the UI, so glass reflections and the thumb's shadow
survive. Audio is copied from the plate.

--lock is for a plate where the phone never moves: one median quad for the whole clip,
no per-frame tracking, and with --stabilize each frame is warped onto it, which kills
the residual shake a "static" generated shot always has.

The UI frames are `f0000.png …` at any resolution, as frames.mjs writes them, with
transparent corners; their aspect is the screen's.
"""
import argparse, subprocess, sys
from pathlib import Path
import cv2, numpy as np

def src_quad(ui_png):
    """The UI's own corners, in its own pixels: every homography maps this onto the screen."""
    h, w = cv2.imread(str(ui_png), cv2.IMREAD_UNCHANGED).shape[:2]
    return np.array([[0, 0], [w, 0], [w, h], [0, h]], np.float32)


def chroma(bgr):
    return cv2.inRange(cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV), (38, 90, 70), (85, 255, 255))


def biggest(mask):
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask)
    if n < 2: return None, 0
    i = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    return (lab == i).astype(np.uint8) * 255, int(st[i, cv2.CC_STAT_AREA])


def quad_from_mask(mask):
    if mask is None: return None                 # no green in the frame at all: the phone is away
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    approx = cv2.approxPolyDP(hull, 2.5, True).reshape(-1, 2).astype(float)
    pts = c.reshape(-1, 2).astype(np.float32)
    (cx, cy) = pts.mean(0)
    _, vecs = cv2.PCACompute(pts, mean=None)
    long_dir = vecs[0] / np.linalg.norm(vecs[0])
    n = len(approx); cands = {"L": [], "R": [], "T": [], "B": []}
    for i in range(n):
        p, q = approx[i], approx[(i + 1) % n]
        v = q - p; L = np.linalg.norm(v)
        if L < 4: continue
        v /= L
        along = abs(v @ long_dir)
        mid = (p + q) / 2 - (cx, cy)
        if along > 0.94:      # side edge
            side = "L" if mid[0] < 0 else "R"
            cands[side].append((L, p, q))
        elif along < 0.35:    # end edge
            cands["T" if mid[1] < 0 else "B"].append((L, p, q))
    lines = {}
    for k, v in cands.items():
        if not v: return None
        _, p, q = max(v, key=lambda e: e[0])
        lines[k] = np.cross([*p, 1], [*q, 1])
    def X(a, b):
        x = np.cross(lines[a], lines[b]); return x[:2] / x[2]
    return np.array([X("T", "L"), X("T", "R"), X("B", "R"), X("B", "L")], np.float32)


def markers_in(bgr, quad):
    m = np.zeros(bgr.shape[:2], np.uint8); cv2.fillConvexPoly(m, quad.astype(np.int32), 255)
    w = cv2.bitwise_and(cv2.inRange(cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV), (0, 0, 175), (180, 70, 255)), m)
    n, lab, st, cen = cv2.connectedComponentsWithStats(w)
    area = cv2.contourArea(quad)
    return np.array([cen[i] for i in range(1, n) if area * 0.0002 < st[i, cv2.CC_STAT_AREA] < area * 0.01], np.float32).reshape(-1, 2)


def flatten_corners(u):
    """Fill the transparent rounded corners of the UI frame with the nearest opaque colour of the row."""
    a = u[:, :, 3] > 0
    first = a.argmax(1); last = u.shape[1] - 1 - a[:, ::-1].argmax(1)
    rows = np.where(a.any(1))[0]
    out = u[:, :, :3].copy()
    cols = np.arange(u.shape[1])
    for r in rows:
        f, l = first[r], last[r]
        out[r, cols < f] = u[r, f, :3]; out[r, cols > l] = u[r, l, :3]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plate"); ap.add_argument("ui"); ap.add_argument("out")
    ap.add_argument("--offset", type=int, default=0, help="UI frame shown at plate frame 0")
    ap.add_argument("--ref", type=int, default=0)
    ap.add_argument("--debug", action="store_true")
    ap.add_argument("--lock", action="store_true", help="phone never moves: use one median quad for the whole clip, no per-frame tracking")
    ap.add_argument("--stabilize", action="store_true", help="with --lock: warp each plate frame so the screen quad sits exactly on the locked quad (kills residual shake)")
    a = ap.parse_args()
    ui = sorted(Path(a.ui).glob("f*.png"))
    if not ui:
        sys.exit("no f*.png frames in " + a.ui)
    SRC = src_quad(ui[0])
    cap = cv2.VideoCapture(a.plate)
    fps = cap.get(cv2.CAP_PROP_FPS); W = int(cap.get(3)); H = int(cap.get(4))
    frames = []
    while True:
        ok, f = cap.read()
        if not ok: break
        frames.append(f)
    for r in range(a.ref, len(frames)):          # first frame from --ref whose four edges are all visible
        ref = frames[r]
        screen, ref_area = biggest(chroma(ref))
        quad = quad_from_mask(screen)
        if quad is not None: break
    else:
        sys.exit("no frame from %d on shows four screen edges: check the key colour, or --ref" % a.ref)
    print("ref frame", r, file=sys.stderr)
    H0 = cv2.getPerspectiveTransform(SRC, quad)
    mk = markers_in(ref, quad)
    ref_uv = cv2.perspectiveTransform(mk.reshape(-1, 1, 2), np.linalg.inv(H0)).reshape(-1, 2) if len(mk) else mk
    print("ref quad", quad.round(1).tolist(), "markers", len(ref_uv), file=sys.stderr)
    tmp = Path(a.out).with_suffix(".raw.mp4")
    vw = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), fps, (W, H))
    prev_quad, refined, hidden = quad, 0, 0
    if a.lock:
        qs = [q for q in (quad_from_mask(biggest(chroma(f))[0]) for f in frames) if q is not None]
        locked = np.median(np.stack(qs), 0).astype(np.float32)
        ctr = locked.mean(0); locked = (locked + 3 * np.sign(locked - ctr)).astype(np.float32)   # 3 px outward
        print("locked quad from", len(qs), "frames:", locked.round(1).tolist(), file=sys.stderr)
        locked_markers = cv2.perspectiveTransform(ref_uv.reshape(-1, 1, 2), cv2.getPerspectiveTransform(SRC, locked)).reshape(-1, 2) if len(ref_uv) else ref_uv
    for i, f in enumerate(frames):
        if a.lock and a.stabilize:
            k0, _ = biggest(chroma(f)); q0 = quad_from_mask(k0)
            if q0 is not None:
                # sub-pixel similarity from whichever markers are visible plus the two top corners (never under the thumb)
                m0 = markers_in(f, q0)
                pairs = [(q0[0], locked[0]), (q0[1], locked[1])]
                if len(m0) and len(ref_uv):
                    pred = cv2.perspectiveTransform(ref_uv.reshape(-1, 1, 2), cv2.getPerspectiveTransform(SRC, q0)).reshape(-1, 2)
                    for j, p in enumerate(pred):
                        d = np.linalg.norm(m0 - p, axis=1); k = int(np.argmin(d))
                        if d[k] < 6: pairs.append((m0[k], locked_markers[j]))
                src_pts = np.array([p[0] for p in pairs], np.float32); dst_pts = np.array([p[1] for p in pairs], np.float32)
                M, _ = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.LMEDS)
                if M is not None:
                    f = cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        key, area = biggest(chroma(f))
        if a.lock:
            q = locked if area > ref_area * 0.15 else None
        else:
            q = quad_from_mask(key) if area > ref_area * 0.4 else None
        if q is None and area > ref_area * 0.15:
            # screen still there but blurred or tilted: use the min-area box, corners ordered to match the last quad
            box = cv2.boxPoints(cv2.minAreaRect(max(cv2.findContours(key, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)))
            orders = [np.roll(box, -k, 0) for k in range(4)] + [np.roll(box[::-1], -k, 0) for k in range(4)]
            q = min(orders, key=lambda o: np.abs(o - prev_quad).sum()).astype(np.float32)
        if q is None:
            vw.write(f); hidden += 1; continue
        if np.abs(q - prev_quad).max() < 3: q = 0.5 * q + 0.5 * prev_quad   # damp jitter while static
        prev_quad = q
        Hc = cv2.getPerspectiveTransform(SRC, q)
        det = markers_in(f, q) if not a.lock else []
        if len(det) and len(ref_uv) >= 5:
            pred = cv2.perspectiveTransform(ref_uv.reshape(-1, 1, 2), Hc).reshape(-1, 2)
            pairs = []
            for j, p in enumerate(pred):
                d = np.linalg.norm(det - p, axis=1); k = int(np.argmin(d))
                if d[k] < 6: pairs.append((ref_uv[j], det[k]))
            if len(pairs) >= 5:
                pts = np.vstack([np.array([p[0] for p in pairs]), SRC[:2]]); dst = np.vstack([np.array([p[1] for p in pairs]), q[:2]])
                Hn, _ = cv2.findHomography(pts, dst, 0)
                if Hn is not None: Hc = Hn; refined += 1
        # Clamped, not wrapped: a shift or a plate longer than the UI holds the first or last
        # frame, where wrapping would cut back to the start of the animation mid-shot.
        u = cv2.imread(str(ui[min(max(i + a.offset, 0), len(ui) - 1)]), cv2.IMREAD_UNCHANGED)
        warped = cv2.warpPerspective(flatten_corners(u), Hc, (W, H), flags=cv2.INTER_AREA)
        warped = (cv2.GaussianBlur(warped, (0, 0), 0.6) * 0.94).astype(np.uint8)   # match the plate's softness and exposure
        inside = np.zeros((H, W), np.uint8)
        cv2.fillConvexPoly(inside, cv2.perspectiveTransform(SRC.reshape(-1, 1, 2), Hc).reshape(-1, 2).astype(np.int32), 255)
        # occluders = big non-green blobs inside the quad (the thumb); the small crosses are not occluders and vanish under the UI
        occ = cv2.bitwise_and(cv2.bitwise_not(chroma(f)), cv2.erode(inside, np.ones((3, 3), np.uint8)))
        nn, lab, st, _ = cv2.connectedComponentsWithStats(occ)
        big = np.isin(lab, [j for j in range(1, nn) if st[j, cv2.CC_STAT_AREA] > 0.004 * inside.sum() / 255])
        # soft matte, like a colour-difference key in Nuke/After Effects: 1 on pure green, 0 on skin, in between on the fringe
        gdiff = f[..., 1].astype(np.float32) - np.maximum(f[..., 0], f[..., 2]).astype(np.float32)
        soft = np.clip((gdiff - 15) / 90, 0, 1)
        near_thumb = cv2.dilate(big.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        show = np.where(near_thumb, soft, 1.0).astype(np.float32) * (inside / 255.0)
        show = np.minimum(cv2.GaussianBlur(show, (3, 3), 0), inside / 255.0)[..., None]
        # light map = the plate's own screen brightness (glass reflections, thumb shadow) normalised to its median,
        # multiplied onto the UI like a Photoshop "multiply" layer; a normalised blur fills it in under the thumb
        luma = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
        valid = (show[..., 0] > 0.9) & (key > 0)
        med = float(np.median(luma[valid])) if valid.any() else 1.0
        wgt = valid.astype(np.float32)
        light = cv2.GaussianBlur(np.where(valid, luma / med, 0).astype(np.float32), (0, 0), 6) / np.maximum(cv2.GaussianBlur(wgt, (0, 0), 6), 1e-3)
        light = np.clip(np.where(cv2.GaussianBlur(wgt, (0, 0), 6) < 1e-3, 1.0, light), 0.7, 1.25)[..., None]
        plate = f.astype(np.float32)
        # colour-difference unmix on the fringe: a fringe pixel is thumb*(1-a) + green*a, so subtracting green*a leaves the thumb's own
        # share, and adding UI*a on top is a true "over" — no halo, no hard edge
        K = np.median(f[key > 0].reshape(-1, 3), 0).astype(np.float32) if (key > 0).any() else np.array([0, 255, 0], np.float32)
        band = near_thumb & (show[..., 0] > 0) & (show[..., 0] < 1)
        plate = np.where(band[..., None], np.clip(plate - 0.85 * K * show, 0, 255), plate)
        near = cv2.dilate(inside, np.ones((5, 5), np.uint8)) > 0          # despill the thumb edge and bezel
        g = plate[..., 1]; cap_g = np.maximum(plate[..., 0], plate[..., 2])
        lost = np.where(near, np.maximum(g - cap_g, 0), 0)                 # spill removed from G, given back as neutral light so the fringe is not a dark rim
        plate[..., 1] = g - lost
        plate += (0.6 * lost)[..., None]
        base = np.where(band[..., None], plate, plate * (1 - show))
        out = np.clip(base + np.clip(warped.astype(np.float32) * light, 0, 255) * show, 0, 255).astype(np.uint8)
        resid = cv2.bitwise_and(chroma(out), key)          # green the warp missed (blurred or clipped screen): soft light grey
        if resid.any():
            r = cv2.GaussianBlur(resid, (5, 5), 0).astype(np.float32)[..., None] / 255
            out = (out * (1 - r) + np.array([232, 232, 232], np.float32) * r).astype(np.uint8)
        if a.debug and i % 24 == 0:
            cv2.imwrite(str(Path(a.out).with_name("debug-%03d.png" % i)), out)
        vw.write(out)
    vw.release()
    print("marker-refined", refined, "hidden", hidden, "of", len(frames), file=sys.stderr)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-i", a.plate, "-map", "0:v", "-map", "1:a?",
                    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", a.out], check=True)
    tmp.unlink()
    print("wrote", a.out)


if __name__ == "__main__":
    main()
