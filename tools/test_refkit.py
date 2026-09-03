#!/usr/bin/env python3
"""Self-check for refkit's measurement logic, the parts that would silently
return a plausible wrong number. Synthesises its own images; needs no captures.

    python3 tools/test_refkit.py
"""
import os, sys, tempfile
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import refkit as R

BG, INK = 0xF5, 0x0A


def img(a):
    return Image.fromarray(a.astype("uint8"))


def test_fill_reads_the_ground_not_the_text():
    a = np.full((40, 60, 3), BG, int)
    a[12:20, 8:52] = INK                      # a text-ish run over the fill
    assert R._fill(a)[0] == "#F5F5F5", R._fill(a)


def test_fill_falls_back_to_mode_when_nothing_is_flat():
    a = np.full((2, 2, 3), 0x2B, int)          # too small to have an interior
    assert R._flatsel(a) is None
    assert R._fill(a)[0] == "#2B2B2B"


def test_ink_core_of_antialiased_text():
    # The mode of this region is the background; the darkest 2% is the ink.
    a = np.full((40, 60, 3), BG, int)
    a[12:20, 8:52] = 0x80                      # antialiased halo
    a[14:18, 10:50] = INK                      # true ink core
    v = a.reshape(-1, 3)
    n = max(1, int(len(v) * 2.0 / 100))
    core = R._hex(v[v.mean(1).argsort()[:n]].mean(0))
    assert core == "#0A0A0A", core
    assert R._fill(a)[0] == "#F5F5F5"          # ... and the fill is still the ground


def test_hairline_solve_recovers_a_diluted_rule():
    # A 1pt rule at 0.5 px/pt lands as one row at 50% coverage.
    bg, rule, cov = 255.0, 55.0, 0.5      # blends to exactly 155, no rounding slop
    blended = bg - (bg - rule) * cov
    a = np.full((5, 20, 3), bg, int)
    a[2, :] = blended
    band = a[0:5, 0:20].astype(float).mean(axis=1)
    ink = (np.array([bg] * 3) - band).sum(axis=0) / cov
    assert R._hex(np.clip(bg - ink, 0, 255)) == "#373737", R._hex(np.clip(bg - ink, 0, 255))


def test_bands_finds_pitch_not_antialiasing():
    prof = np.zeros(200)
    for top in (10, 60, 110, 160):             # four rows on a 50px pitch
        prof[top:top + 12] = 1.0
    runs = R._runs(prof, .004)
    assert [s for s, _ in runs] == [10, 60, 110, 160], runs
    assert all(e - s == 12 for s, e in runs), runs


def test_crop_phone_cuts_the_screen_out_of_the_frame():
    scale, bez = 2, 12
    canvas = np.full((980 * scale, 478 * scale, 3), 0xF3, int)
    x0, y0 = 40 * scale, 60 * scale
    fw, fh = 393 * scale + 2 * bez * scale, 852 * scale + 2 * bez * scale
    canvas[y0:y0 + fh, x0:x0 + fw] = [0x1D, 0x19, 0x1A]
    canvas[y0 + bez * scale:y0 + bez * scale + 852 * scale,
           x0 + bez * scale:x0 + bez * scale + 393 * scale] = 0xEF
    out = R._crop_phone(img(canvas), scale)
    assert out.size == (393 * scale, 852 * scale), out.size
    a = np.asarray(out)
    assert out.mode == "RGBA", out.mode
    rgb, alpha = a[..., :3], a[..., 3]
    assert rgb[alpha == 255].min() == 0xEF and rgb[alpha == 255].max() == 0xEF   # no bezel leaked in
    assert alpha[0, 0] == 0 and alpha[-1, -1] == 0                   # 52pt corners punched out
    assert alpha[alpha.shape[0] // 2, 0] == 255                      # mid-height edge is screen


def test_flat_composites_rounded_corners_onto_white():
    im = Image.new("RGBA", (8, 8), (0x1D, 0x19, 0x1A, 0))
    im.putpixel((4, 4), (0xEF, 0xEF, 0xEF, 255))
    f = os.path.join(tempfile.mkdtemp(), "a.png")
    im.save(f)
    a = R._rgb(f)
    assert tuple(a[0, 0]) == (255, 255, 255), a[0, 0]      # bezel does not come back
    assert tuple(a[4, 4]) == (0xEF, 0xEF, 0xEF), a[4, 4]


def test_crop_phone_returns_none_without_a_frame():
    assert R._crop_phone(img(np.full((100, 100, 3), 0xF3, int)), 2) is None


def test_label_is_4_connected():
    m = np.array([[1, 0, 0],
                  [0, 1, 1],
                  [0, 1, 0]], bool)
    lab = R._label(m)
    assert lab[1, 1] == lab[1, 2] == lab[2, 1]       # orthogonal joins
    assert lab[0, 0] != lab[1, 1]                    # diagonal does not
    assert lab[0, 1] == 0                            # background stays 0


def test_probe_argv_maps_box_scan_and_flags():
    p = {"id": "e", "img": "x.png", "cmd": "scan", "axis": "col",
         "at": 196, "range": [95, 130]}
    assert R._probe_argv(p, "x.png", 3) == \
        ["scan", "x.png", "col", "196", "95", "130", "--pt", "3"]
    p = {"id": "g", "img": "x.png", "cmd": "ink", "box": [10, 10, 50, 40],
         "dark": True, "minpx": 9}
    argv = R._probe_argv(p, "x.png", None)
    # box -> centre + half of the long side; True -> a bare flag
    assert argv == ["ink", "x.png", "30.0", "25.0", "20.0", "--dark", "--minpx", "9"]


def test_ink_returns_the_centred_glyph_not_the_neighbour():
    a = np.full((60, 60, 3), 235, int)
    a[24:36, 20:28] = 20                   # glyph, two parts, centred
    a[24:36, 32:40] = 20
    a[10:13, 25:35] = 20                   # neighbour hugging the window top
    f = os.path.join(tempfile.mkdtemp(), "g.png")
    img(a).save(f)
    argv = R._probe_argv({"id": "g", "img": f, "cmd": "ink",
                          "box": [10, 10, 50, 50], "dark": True, "minpx": 10}, f, None)
    out, err = R._run_probe(R._parser(), argv)
    assert err is None, err
    # bbox over the same window would say w 20 h 26 (neighbour included)
    assert "w 20.0  h 12.0" in out and "comps 2" in out, out


def test_summ_reads_boxes_and_picks_the_real_edge():
    t, w, h, rgb, edge = R._summ("ink", "x0 5.0  y0 6.0  x1 21.0  y1 20.0   w 16.0  h 14.0   n 9")
    assert (w, h) == (16.0, 14.0), (w, h)
    # the 1-level antialiasing wobble at 63 must lose to the real edge at 75
    scan = "     60.0 ..  63.0   #848275\n     63.0 ..  75.0   #858275\n     75.0 ..  90.0   #F8F4E1"
    t, w, h, rgb, edge = R._summ("scan", scan)
    assert edge == 75.0 and t.startswith("edge@75"), (t, edge)


ROOT = ":root{--x-bg:#FFFFFF;--x-ink:#0A0A0A}"


def test_key_alpha_holds_the_interior_and_ramps_only_the_edge():
    # Magenta ground, an opaque MID-TONE body (the case a Euclidean full-range
    # key leaves ~25% transparent), and one column of half-covered edge.
    K = np.array([255, 0, 255], float)
    a = np.tile(K, (30, 30, 1))
    body = np.array([150, 100, 60], float)               # opaque brown
    a[8:22, 8:21] = body
    a[8:22, 21] = 0.5 * body + 0.5 * K                    # half-covered edge
    alpha, _ = R._key_alpha(a, K, tol=45, hi=110)
    assert alpha[0, 0] == 0, alpha[0, 0]                  # ground gone
    assert alpha[15, 10] == 1, alpha[15, 10]              # interior opaque
    assert 0 < alpha[15, 21] < 1, alpha[15, 21]           # edge partial
    A = alpha[..., None]
    F = np.clip(np.where(A > 0, (a - (1 - A) * K) / np.maximum(A, 1e-6), 0), 0, 255)
    assert abs(F[15, 10] - body).max() < 1e-6, F[15, 10]  # interior untouched
    assert F[15, 21][1] > a[15, 21][1], F[15, 21]         # spill pulled off the edge


def test_key_border_check_rejects_a_ground_that_is_not_the_key():
    a = np.full((30, 30, 3), 250, float)                 # the model's "white"
    _, d = R._key_alpha(a, np.array([255, 0, 255], float), tol=45, hi=110)
    b = np.concatenate([d[:5].ravel(), d[-5:].ravel(), d[:, :5].ravel(), d[:, -5:].ravel()])
    assert b.mean() > 45, b.mean()                       # cmd_key exits here


def _folder(files):
    d = tempfile.mkdtemp()
    for name, body in files.items():
        open(os.path.join(d, name), "w", encoding="utf-8").write(body)
    return d


def test_tokens_clean_folder():
    d = _folder({
        "00.html": f"<style>{ROOT}</style><td class=\"t\">--x-ink</td>",
        "01.html": f"<style>{ROOT}</style><p style='color:var(--x-ink)'>hi</p>",
    })
    assert R._token_problems(d) == [], R._token_problems(d)


def test_tokens_catches_a_drifted_root_block():
    d = _folder({
        "00.html": f"<style>{ROOT}</style>",
        "01.html": "<style>:root{--x-bg:#FFFFFF;--x-ink:#0B0B0B}</style>",
    })
    p = R._token_problems(d)
    assert any("not shared" in s for s in p), p


def test_tokens_catches_undefined_var_and_evidence_row():
    d = _folder({
        "00.html": f"<style>{ROOT}</style><td class=\"t\">--x-scrim-3</td>",
        "01.html": f"<style>{ROOT}</style><p style='color:var(--x-nope)'>hi</p>",
    })
    p = R._token_problems(d)
    assert any("--x-scrim-3" in s and "not a token" in s for s in p), p
    assert any("var(--x-nope) is not defined" in s for s in p), p


def test_ink_norm_inverts_dark_mode_and_crops_to_the_ink():
    for ground, ink in ((250.0, 10.0), (20.0, 240.0)):     # light, then dark mode
        a = np.full((80, 120), ground)
        a[30:50, 40:70] = ink
        n = R._ink_norm(a)
        assert n.shape == (R.FONT_H, round(30 * R.FONT_H / 20)), n.shape
        assert n.all()                          # cropped to the ink, so all of it


def test_shape_score_is_1_for_itself_and_punishes_a_condensed_twin():
    a = np.zeros((R.FONT_H, 40), bool)
    a[8:56, 4:12] = a[8:56, 28:36] = True       # two stems
    assert R._shape_score(a, a) == 1.0
    narrow = np.asarray(Image.fromarray(a.astype("uint8") * 255)
                        .resize((24, R.FONT_H))) > 127
    # Same letterform 40% narrower. Stretching to a common width alone would
    # score these identical, which is how every screenshot matches a condensed
    # face. The width discount has to bring it down.
    assert R._shape_score(a, narrow) < .7, R._shape_score(a, narrow)


def test_weight_axis_is_set_by_name_not_by_position():
    # SF Pro's axis order is Width, Optical Size, GRAD, Weight. Passing the
    # weight positionally sets *Width* to 900 -> clamped to its 150 maximum, so
    # every weight renders as the same maximally expanded face.
    f = "/System/Library/Fonts/SFNS.ttf"
    if not os.path.exists(f):
        print("     (skipped: no SF Pro on this machine)", end="")
        return
    light, bold = (R._render_word("nn", f, w, 0.0, 28) for w in (300, 900))
    assert bold.mean() > light.mean() * 1.15, (light.mean(), bold.mean())


def test_every_candidate_font_identifies_its_own_rendering():
    cands = R._font_candidates(None)
    if len(cands) < 2:
        print("     (skipped: no system fonts on this machine)", end="")
        return
    for path, name in cands.items():
        target = R._render_word("Subscription", path, None, 0.0, 28)
        ranked = sorted(
            ((n, max((R._shape_score(target, r)
                      for w in R.FONT_WEIGHTS for t in R.FONT_TRACKS
                      if (r := R._render_word("Subscription", q, w, t, 28)) is not None),
                     default=0.0)) for q, n in cands.items()), key=lambda x: -x[1])
        assert ranked[0][0] == name, f"{name} -> {ranked[:2]}"


def test_grow_box_keeps_the_pale_edge_and_drops_the_neighbour():
    """The 08-avatar bug: a threshold that finds the dark body stops at the
    pale ears, and a padded window that catches a neighbour must not annex it.
    """
    a = np.full((60, 60, 3), 255, float)
    a[20:40, 20:40] = (40, 40, 40)        # body: any threshold finds this
    a[26:34, 14:20] = (250, 246, 240)     # left ear: 9 levels off white
    a[26:34, 40:46] = (250, 246, 240)     # right ear
    a[5:12, 5:12] = (0, 0, 200)           # an unrelated neighbour in the window
    seed = (20, 20, 40, 40)
    box, ground, edge = R._grow_box(a.astype("uint8"), seed, tol=4)
    assert tuple(ground) == (255, 255, 255), ground
    assert box == (14, 20, 46, 40), box    # ears in, neighbour out
    assert edge == "", edge

    # a neighbour that actually touches gets annexed, and the box then runs
    # into the window edge, which is the report that says do not trust it
    a[0:21, 8:12] = (0, 0, 200)
    a[17:21, 8:22] = (0, 0, 200)
    box, _, edge = R._grow_box(a.astype("uint8"), seed, tol=4)
    assert box[:2] == (5, 0), box     # the whole neighbour came with it
    assert edge == "T", edge


def test_board_sizes_reads_only_the_overrides():
    """thumbs must be shot at the board's own size: the two wide boards in the
    repo declare w/h on their layout.json entry, every other entry is the
    478x980 artboard, and a folder without a layout has no overrides."""
    import json, os, tempfile
    with tempfile.TemporaryDirectory() as d:
        json.dump({"rows": [{"files": [{"file": "00-welcome", "w": 2153, "h": 819},
                                       "01-home", {"file": "02-chat", "label": "Chat"}]}]},
                  open(os.path.join(d, "layout.json"), "w"))
        assert R._board_sizes(d) == {"00-welcome": (2153, 819)}
        assert R._board_sizes(os.path.join(d, "nope")) == {}


if __name__ == "__main__":
    fns = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_")]
    for name, fn in fns:
        fn()
        print("ok  ", name)
    print(f"\n{len(fns)} checks passed")
